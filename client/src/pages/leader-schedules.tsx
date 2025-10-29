import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Schedule, ScheduleAssignment, User, InsertSchedule } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Trash2, Save, Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface ScheduleWithAssignments extends Schedule {
  assignments: (ScheduleAssignment & { user?: User })[];
}

const POSICOES_LOUVOR = ["teclado", "violao", "baixo", "bateria", "voz", "backing"];
const POSICOES_LABELS: Record<string, string> = {
  teclado: "Teclado",
  violao: "Violão",
  baixo: "Baixo",
  bateria: "Bateria",
  voz: "Voz",
  backing: "Backing Vocal",
};

const scheduleFormSchema = z.object({
  mes: z.number().min(1).max(12),
  ano: z.number().min(2024),
  tipo: z.enum(["louvor", "obreiros"]),
  data: z.string(),
  observacoes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

export default function LeaderSchedulesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<string, number | null>>({});

  const currentDate = new Date();
  const [selectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear] = useState(currentDate.getFullYear());

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      mes: selectedMonth,
      ano: selectedYear,
      tipo: "louvor",
      data: "",
      observacoes: "",
    },
  });

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", selectedMonth, selectedYear],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
  });

  const { data: louvorMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/ministry/Louvor"],
    enabled: allUsers.length > 0,
  });

  const { data: obreirosMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/ministry/Obreiros"],
    enabled: allUsers.length > 0,
  });

  // Fetch assignments for each schedule
  const scheduleDetailsQueries = useQueries({
    queries: schedules.map(schedule => ({
      queryKey: ["/api/schedules/details", schedule.id],
      queryFn: async () => {
        const response = await fetch(`/api/schedules/details/${schedule.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch schedule details");
        return response.json();
      },
      enabled: schedules.length > 0,
    })),
  });

  const schedulesWithAssignments: ScheduleWithAssignments[] = schedules.map((schedule, index) => {
    const details = scheduleDetailsQueries[index]?.data as any;
    const assignments = details?.assignments || [];
    
    const assignmentsWithUsers = assignments.map((assignment: ScheduleAssignment) => ({
      ...assignment,
      user: allUsers.find(u => u.id === assignment.userId),
    }));

    return {
      ...schedule,
      assignments: assignmentsWithUsers,
    };
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const schedule = await apiRequest<Schedule>("POST", "/api/schedules", data);
      
      // Create assignments for louvor positions
      if (data.tipo === "louvor") {
        for (const posicao of POSICOES_LOUVOR) {
          await apiRequest("POST", "/api/assignments", {
            scheduleId: schedule.id,
            userId: assignments[posicao] || null,
            posicao,
          });
        }
      } else {
        // For obreiros, create 4 positions
        for (let i = 0; i < 4; i++) {
          await apiRequest("POST", "/api/assignments", {
            scheduleId: schedule.id,
            userId: assignments[`obreiro-${i}`] || null,
            posicao: "obreiro",
          });
        }
      }
      
      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsDialogOpen(false);
      setAssignments({});
      form.reset();
      toast({
        title: "Escala criada!",
        description: "A escala foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar escala",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      if (!editingSchedule) return;
      const schedule = await apiRequest<Schedule>("PATCH", `/api/schedules/${editingSchedule}`, data);

      // Update assignments
      const existingAssignments = schedulesWithAssignments.find(s => s.id === editingSchedule)?.assignments || [];
      const positions = data.tipo === "louvor" ? POSICOES_LOUVOR : existingAssignments.map((_, i) => `obreiro-${i}`);

      for (const posicao of positions) {
        const existingAssignment = existingAssignments.find(a => a.posicao === posicao);
        const newUserId = assignments[posicao];

        if (existingAssignment) {
          if (existingAssignment.userId !== newUserId) {
            await apiRequest("PATCH", `/api/assignments/${existingAssignment.id}`, { userId: newUserId });
          }
        } else if (newUserId) {
          await apiRequest("POST", "/api/assignments", {
            scheduleId: editingSchedule,
            userId: newUserId,
            posicao,
          });
        }
      }

      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsDialogOpen(false);
      setEditingSchedule(null);
      setAssignments({});
      form.reset();
      toast({
        title: "Escala atualizada!",
        description: "A escala foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar escala",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Escala removida",
        description: "A escala foi removida com sucesso.",
      });
    },
  });

  const onSubmit = (data: ScheduleFormData) => {
    createScheduleMutation.mutate(data);
  };

  const onUpdate = (data: ScheduleFormData) => {
    updateScheduleMutation.mutate(data);
  };

  const louvorSchedules = schedulesWithAssignments.filter(s => s.tipo === "louvor");
  const obreirosSchedules = schedulesWithAssignments.filter(s => s.tipo === "obreiros");

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2">Gerenciar Escalas</h1>
          <p className="text-lg text-muted-foreground">
            Crie e gerencie escalas de louvor e obreiros
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-schedule">
              <Plus className="w-4 h-4 mr-2" />
              Nova Escala
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? "Editar Escala" : "Criar Nova Escala"}</DialogTitle>
              <DialogDescription>
                {editingSchedule ? "Atualize os dados da escala." : "Preencha os dados da escala e atribua membros às posições"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(editingSchedule ? onUpdate : onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Escala</Label>
                  <Select
                    value={form.watch("tipo")}
                    onValueChange={(value) => form.setValue("tipo", value as "louvor" | "obreiros")}
                  >
                    <SelectTrigger data-testid="select-schedule-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="louvor">Louvor</SelectItem>
                      <SelectItem value="obreiros">Obreiros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data">Data do Culto</Label>
                  <Input
                    type="date"
                    {...form.register("data")}
                    data-testid="input-schedule-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Textarea
                  {...form.register("observacoes")}
                  placeholder="Ex: Culto de celebração"
                  data-testid="input-schedule-notes"
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Atribuir Membros</h3>
                {form.watch("tipo") === "louvor" ? (
                  <div className="grid gap-3">
                    {POSICOES_LOUVOR.map(posicao => (
                      <div key={posicao} className="grid grid-cols-3 gap-2 items-center">
                        <Label>{POSICOES_LABELS[posicao]}</Label>
                        <div className="col-span-2">
                          <Select
                            value={assignments[posicao]?.toString() || "vazio"}
                            onValueChange={(value) => setAssignments({
                              ...assignments,
                              [posicao]: value === "vazio" ? null : parseInt(value),
                            })}
                          >
                            <SelectTrigger data-testid={`select-${posicao}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vazio">Vazio</SelectItem>
                              {allUsers.filter(u => u.ministerioLouvor).map(user => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {[0, 1, 2, 3].map(idx => (
                      <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                        <Label>Obreiro {idx + 1}</Label>
                        <div className="col-span-2">
                          <Select
                            value={assignments[`obreiro-${idx}`]?.toString() || "vazio"}
                            onValueChange={(value) => setAssignments({
                              ...assignments,
                              [`obreiro-${idx}`]: value === "vazio" ? null : parseInt(value),
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vazio">Vazio</SelectItem>
                              {allUsers.filter(u => u.ministerioObreiro).map(user => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createScheduleMutation.isPending}
                  data-testid="button-save-schedule"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createScheduleMutation.isPending ? "Salvando..." : "Salvar Escala"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando escalas...</p>
      ) : (
        <div className="space-y-8">
          {/* Escalas de Louvor */}
          <div>
            <h2 className="font-sans text-2xl font-semibold mb-4">Escalas de Louvor</h2>
            {louvorSchedules.length > 0 ? (
              <div className="grid gap-4">
                {louvorSchedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(schedule.data).toLocaleDateString('pt-BR')}
                          </CardTitle>
                          {schedule.observacoes && (
                            <CardDescription>{schedule.observacoes}</CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingSchedule(schedule.id);
                              form.reset({
                                mes: schedule.mes,
                                ano: schedule.ano,
                                tipo: schedule.tipo as "louvor" | "obreiros",
                                data: schedule.data.split('T')[0],
                                observacoes: schedule.observacoes || "",
                              });
                              setAssignments(schedule.assignments.reduce((acc, a) => ({ ...acc, [a.posicao]: a.userId }), {}));
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                            data-testid={`button-delete-${schedule.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {POSICOES_LOUVOR.map(posicao => {
                          const assignment = schedule.assignments.find(a => a.posicao === posicao);
                          return (
                            <div key={posicao} className="flex justify-between items-center">
                              <span className="text-sm font-medium">{POSICOES_LABELS[posicao]}:</span>
                              {assignment?.user ? (
                                <Badge variant="default" data-testid={`badge-${posicao}-${assignment.user.id}`}>
                                  {assignment.user.nome}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Vazio</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma escala de louvor cadastrada
                </CardContent>
              </Card>
            )}
          </div>

          {/* Escalas de Obreiros */}
          <div>
            <h2 className="font-sans text-2xl font-semibold mb-4">Escalas de Obreiros</h2>
            {obreirosSchedules.length > 0 ? (
              <div className="grid gap-4">
                {obreirosSchedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(schedule.data).toLocaleDateString('pt-BR')}
                          </CardTitle>
                          {schedule.observacoes && (
                            <CardDescription>{schedule.observacoes}</CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingSchedule(schedule.id);
                              form.reset({
                                mes: schedule.mes,
                                ano: schedule.ano,
                                tipo: schedule.tipo as "louvor" | "obreiros",
                                data: schedule.data.split('T')[0],
                                observacoes: schedule.observacoes || "",
                              });
                              setAssignments(schedule.assignments.reduce((acc, a, i) => ({ ...acc, [`obreiro-${i}`]: a.userId }), {}));
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                            data-testid={`button-delete-${schedule.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {schedule.assignments.map((assignment, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-sm font-medium">Obreiro {idx + 1}:</span>
                            {assignment?.user ? (
                              <Badge variant="default" data-testid={`badge-obreiro-${idx}-${assignment.user.id}`}>
                                {assignment.user.nome}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Vazio</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma escala de obreiros cadastrada
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
