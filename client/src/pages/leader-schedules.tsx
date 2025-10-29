import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Schedule, ScheduleAssignment, User } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Trash2, Save, Pencil, Music, Users as UsersIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface atualizada para corresponder ao novo retorno da API
interface ScheduleWithAssignments extends Schedule {
  assignments: (ScheduleAssignment & { user: User | null })[];
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
  tipo: z.enum(["louvor", "obreiros"]),
  data: z.string().min(1, "A data é obrigatória"),
  observacoes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

export default function LeaderSchedulesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithAssignments | null>(null);
  const [assignments, setAssignments] = useState<Record<string, number | null>>({});

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      tipo: "louvor",
      data: "",
      observacoes: "",
    },
  });

  // Hook para buscar todas as escalas com suas atribuições
  const { data: schedules = [], isLoading } = useQuery<ScheduleWithAssignments[]>({
    queryKey: [`/api/schedules?month=${selectedMonth}&year=${selectedYear}`],
    // A função da query agora é gerenciada pelo queryClient, então não precisamos defini-la aqui
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
  });

  // Efeito para resetar o formulário ao editar uma escala
  useEffect(() => {
    if (editingSchedule) {
      form.reset({
        ...editingSchedule,
        data: format(new Date(editingSchedule.data), "yyyy-MM-dd"),
      });
      const initialAssignments = editingSchedule.assignments.reduce((acc, assign) => {
        acc[assign.posicao] = assign.userId;
        return acc;
      }, {} as Record<string, number | null>);
      setAssignments(initialAssignments);
    } else {
      form.reset({
        tipo: "louvor",
        data: "",
        observacoes: "",
      });
      setAssignments({});
    }
  }, [editingSchedule, form, selectedMonth, selectedYear]);

  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const schedule = await apiRequest<Schedule>("POST", "/api/schedules", data);

      const criarAssignments = async (posicoes: string[]) => {
        for (const posicao of posicoes) {
          const userId = assignments[posicao];
          const body: Record<string, any> = {
            scheduleId: schedule.id,
            posicao,
          };
          if (userId !== null && userId !== undefined) body.userId = userId;
          await apiRequest("POST", "/api/assignments", body);
        }
      };

      if (data.tipo === "louvor") {
        await criarAssignments(POSICOES_LOUVOR);
      } else {
        await criarAssignments(["obreiro-0", "obreiro-1", "obreiro-2", "obreiro-3"]);
      }

      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules?month=${selectedMonth}&year=${selectedYear}`] });
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
      const schedule = await apiRequest<Schedule>(
        "PATCH",
        `/api/schedules/${editingSchedule.id}`,
        data
      );

      const positions = data.tipo === "louvor"
        ? POSICOES_LOUVOR
        : Array.from({ length: 4 }, (_, i) => `obreiro-${i}`);

      for (const posicao of positions) {
        const existingAssignment = editingSchedule.assignments.find((a) => a.posicao === posicao);
        const newUserId = assignments[posicao];

        if (existingAssignment) {
          if (existingAssignment.userId !== newUserId) {
            await apiRequest("PATCH", `/api/assignments/${existingAssignment.id}`, { userId: newUserId });
          }
        } else if (newUserId) {
          await apiRequest("POST", "/api/assignments", {
            scheduleId: editingSchedule.id,
            userId: newUserId,
            posicao,
          });
        }
      }

      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules?month=${selectedMonth}&year=${selectedYear}`] });
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
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules?month=${selectedMonth}&year=${selectedYear}`] });
      toast({
        title: "Escala removida",
        description: "A escala foi removida com sucesso.",
      });
    },
  });

  const onSubmit = (data: ScheduleFormData) => {
    if (editingSchedule) {
      updateScheduleMutation.mutate(data);
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const handleEdit = (schedule: ScheduleWithAssignments) => {
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingSchedule(null);
    setIsDialogOpen(true);
  };

  const louvorSchedules = schedules.filter((s) => s.tipo === "louvor");
  const obreirosSchedules = schedules.filter((s) => s.tipo === "obreiros");

  // Renderiza o componente
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2">Gerenciar Escalas</h1>
          <p className="text-lg text-muted-foreground">Crie, edite e visualize as escalas de louvor e obreiros.</p>
        </div>
        <Button onClick={handleNew} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nova Escala
        </Button>
      </div>

      {/* Seção de Escalas de Louvor */}
      <div>
        <h2 className="font-sans text-2xl font-semibold mb-4 flex items-center gap-2">
          <Music className="w-6 h-6 text-primary" />
          Escalas de Louvor
        </h2>
        {isLoading ? (
          <p>Carregando...</p>
        ) : louvorSchedules.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {louvorSchedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(schedule.data), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(schedule)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => deleteScheduleMutation.mutate(schedule.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  {schedule.observacoes && <CardDescription>{schedule.observacoes}</CardDescription>}
                </CardHeader>
               <CardContent className="space-y-2">
  {(schedule.assignments || []).map((assign) => (
    <div key={assign.id} className="flex justify-between items-center">
      <span className="text-sm font-medium">{POSICOES_LABELS[assign.posicao] || assign.posicao}:</span>
      <Badge variant={assign.user ? "default" : "outline"}>
        {assign.user ? assign.user.nome : "Vazio"}
      </Badge>
    </div>
  ))}
</CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhuma escala de louvor encontrada.</p>
        )}
      </div>

      {/* Seção de Escalas de Obreiros */}
      <div>
        <h2 className="font-sans text-2xl font-semibold mb-4 flex items-center gap-2">
          <UsersIcon className="w-6 h-6 text-primary" />
          Escalas de Obreiros
        </h2>
        {isLoading ? (
          <p>Carregando...</p>
        ) : obreirosSchedules.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {obreirosSchedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(schedule.data), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(schedule)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => deleteScheduleMutation.mutate(schedule.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  {schedule.observacoes && <CardDescription>{schedule.observacoes}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-2">
  {(schedule.assignments || []).map((assign, index) => (
    <div key={assign.id} className="flex justify-between items-center">
      <span className="text-sm font-medium">Obreiro {index + 1}:</span>
      <Badge variant={assign.user ? "default" : "outline"}>
        {assign.user ? assign.user.nome : "Vazio"}
      </Badge>
    </div>
  ))}
</CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhuma escala de obreiros encontrada.</p>
        )}
      </div>

      {/* Diálogo para Criar/Editar Escala */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Editar Escala" : "Criar Nova Escala"}</DialogTitle>
            <DialogDescription>
              {editingSchedule ? "Atualize os detalhes da escala." : "Preencha os detalhes para criar uma nova escala."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Campos do formulário (data, tipo, etc.) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data">Data</Label>
                <Input id="data" type="date" {...form.register("data")} />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de Escala</Label>
                <Select
                  value={form.watch("tipo")}
                  onValueChange={(value) => form.setValue("tipo", value as "louvor" | "obreiros")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="louvor">Louvor</SelectItem>
                    <SelectItem value="obreiros">Obreiros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" {...form.register("observacoes")} />
            </div>

            {/* Atribuições dinâmicas baseadas no tipo */}
            <div className="space-y-4">
              <h3 className="font-semibold">Atribuir Membros</h3>
              {form.watch("tipo") === "louvor"
                ? POSICOES_LOUVOR.map((posicao) => (
                    <div key={posicao} className="grid grid-cols-2 items-center gap-2">
                      <Label>{POSICOES_LABELS[posicao]}</Label>
                      <Select
                        value={assignments[posicao]?.toString() ?? "null"}
                        onValueChange={(value) =>
                          setAssignments((prev) => ({
                            ...prev,
                            [posicao]: value === "null" ? null : Number(value),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um membro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">Vazio</SelectItem>
                          {allUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                : Array.from({ length: 4 }, (_, i) => `obreiro-${i}`).map((posicao, index) => (
                    <div key={posicao} className="grid grid-cols-2 items-center gap-2">
                      <Label>Obreiro {index + 1}</Label>
                      <Select
                        value={assignments[posicao]?.toString() ?? "null"}
                        onValueChange={(value) =>
                          setAssignments((prev) => ({
                            ...prev,
                            [posicao]: value === "null" ? null : Number(value),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um membro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">Vazio</SelectItem>
                          {allUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {editingSchedule ? "Salvar Alterações" : "Criar Escala"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
