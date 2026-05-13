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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Trash2, Save, Pencil, Music, Users as UsersIcon, ChevronRight, X, Music2, Archive, Building2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Ministerio {
  id: number;
  nome: string;
  tipo: string;
  descricao?: string | null;
}

interface ScheduleWithAssignments extends Schedule {
  assignments: (ScheduleAssignment & { user: User | null })[];
}

interface Louvor {
  nome: string;
  tonalidade: string;
}

const POSICOES_LOUVOR = ["teclado", "guitarra", "som", "violao", "baixo", "bateria", "ministro", "backing"];
const POSICOES_LABELS: Record<string, string> = {
  teclado: "Teclado", guitarra: "Guitarra", som: "Som", violao: "Violão",
  baixo: "Baixo", bateria: "Bateria", ministro: "Ministro", backing: "Backing Vocal",
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const TONALIDADES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B","Cm","C#m","Dm","D#m","Em","Fm","F#m","Gm","G#m","Am","A#m","Bm"];

const scheduleFormSchema = z.object({
  ministerioId: z.number({ required_error: "Selecione um ministério" }),
  data: z.string().min(1, "A data é obrigatória"),
  observacoes: z.string().optional(),
});
type ScheduleFormData = z.infer<typeof scheduleFormSchema>;
type TabType = "proximas" | "atuais" | "anteriores";

function getPosicoesByTipo(tipo: string): string[] {
  if (tipo === "louvor") return POSICOES_LOUVOR;
  if (tipo === "obreiros") return Array.from({ length: 4 }, (_, i) => `obreiro-${i}`);
  return ["responsavel"];
}

export default function LeaderSchedulesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithAssignments | null>(null);
  const [assignments, setAssignments] = useState<Record<string, number | null>>({});
  const [louvores, setLouvores] = useState<Louvor[]>([]);
  const [novoLouvorNome, setNovoLouvorNome] = useState("");
  const [novoLouvorTom, setNovoLouvorTom] = useState("C");
  const [activeTab, setActiveTab] = useState<TabType>("proximas");
  const [viewAll, setViewAll] = useState(false);
  const [selectedMinisterioId, setSelectedMinisterioId] = useState<number | null>(null);

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: { ministerioId: undefined as any, data: "", observacoes: "" },
  });

  // Ministérios que o usuário lidera
  const { data: meusMinisterios = [] } = useQuery<Ministerio[]>({
    queryKey: ["/api/ministerios/meus-liderancas"],
  });

  // Auto-seleciona o primeiro ministério quando carrega
  useEffect(() => {
    if (meusMinisterios.length > 0 && selectedMinisterioId === null) {
      setSelectedMinisterioId(meusMinisterios[0].id);
    }
  }, [meusMinisterios, selectedMinisterioId]);

  const selectedMinisterio = meusMinisterios.find(m => m.id === selectedMinisterioId) ?? null;

  // Escalas do período
  const { data: allSchedules = [], isLoading } = useQuery<ScheduleWithAssignments[]>({
    queryKey: ["schedules", "all", selectedYear],
    queryFn: async () => {
      const schedules: ScheduleWithAssignments[] = [];
      for (let i = -1; i <= 3; i++) {
        const date = new Date(selectedYear, selectedMonth - 1 + i, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const response = await apiRequest<ScheduleWithAssignments[]>("GET", `/api/schedules?month=${month}&year=${year}`);
        schedules.push(...response);
      }
      return schedules;
    },
  });

  // Membros do ministério selecionado
  const { data: membrosMinisterio = [] } = useQuery<User[]>({
    queryKey: ["/api/ministerios", selectedMinisterioId, "membros"],
    queryFn: () => apiRequest<User[]>("GET", `/api/ministerios/${selectedMinisterioId}/membros`),
    enabled: !!selectedMinisterioId,
  });

  // Filtra escalas pelo ministério selecionado
  const schedulesDoMinisterio = useMemo(() =>
    allSchedules.filter(s => s.ministerioId === selectedMinisterioId),
    [allSchedules, selectedMinisterioId]
  );

  const { proximas, atuais, anteriores } = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = addDays(now, -30);
    const proximas: ScheduleWithAssignments[] = [];
    const atuais: ScheduleWithAssignments[] = [];
    const anteriores: ScheduleWithAssignments[] = [];

    schedulesDoMinisterio.forEach(schedule => {
      try {
        const d = parseISO(schedule.data); d.setHours(0, 0, 0, 0);
        if (d >= addDays(now, 1)) proximas.push(schedule);
        else if (d.getTime() === now.getTime()) atuais.push(schedule);
        else if (d > thirtyDaysAgo && d < now) anteriores.push(schedule);
      } catch {}
    });

    proximas.sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime());
    atuais.sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime());
    anteriores.sort((a, b) => parseISO(b.data).getTime() - parseISO(a.data).getTime());
    return { proximas, atuais, anteriores };
  }, [schedulesDoMinisterio]);

  useEffect(() => {
    if (editingSchedule) {
      form.reset({
        ministerioId: editingSchedule.ministerioId ?? selectedMinisterioId ?? undefined as any,
        data: editingSchedule.data.split('T')[0],
        observacoes: editingSchedule.observacoes ?? "",
      });
      const initial = editingSchedule.assignments.reduce((acc, a) => {
        acc[a.posicao] = a.userId;
        return acc;
      }, {} as Record<string, number | null>);
      setAssignments(initial);
      try {
        const ld = editingSchedule.louvores ? JSON.parse(editingSchedule.louvores) : [];
        setLouvores(Array.isArray(ld) ? ld : []);
      } catch { setLouvores([]); }
    } else {
      form.reset({ ministerioId: selectedMinisterioId ?? undefined as any, data: "", observacoes: "" });
      setAssignments({});
      setLouvores([]);
    }
  }, [editingSchedule, selectedMinisterioId]);

  const adicionarLouvor = () => {
    if (!novoLouvorNome.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    setLouvores([...louvores, { nome: novoLouvorNome.trim(), tonalidade: novoLouvorTom }]);
    setNovoLouvorNome(""); setNovoLouvorTom("C");
  };

  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const scheduleData = { ...data, louvores: louvores.length > 0 ? JSON.stringify(louvores) : null };
      const schedule = await apiRequest<Schedule>("POST", "/api/schedules", scheduleData);
      const ministerio = meusMinisterios.find(m => m.id === data.ministerioId);
      const posicoes = getPosicoesByTipo(ministerio?.tipo ?? "outro");
      for (const posicao of posicoes) {
        const userId = assignments[posicao];
        const body: Record<string, any> = { scheduleId: schedule.id, posicao };
        if (userId != null) body.userId = userId;
        await apiRequest("POST", "/api/assignments", body);
      }
      return schedule;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schedules", "all"] });
      setIsDialogOpen(false); setAssignments({}); setLouvores([]); form.reset();
      toast({ title: "Escala criada!" });
    },
    onError: (error: any) => toast({ title: "Erro ao criar escala", description: error.message, variant: "destructive" }),
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      if (!editingSchedule) return;
      const scheduleData = { ...data, louvores: louvores.length > 0 ? JSON.stringify(louvores) : null };
      const schedule = await apiRequest<Schedule>("PATCH", `/api/schedules/${editingSchedule.id}`, scheduleData);
      const ministerio = meusMinisterios.find(m => m.id === data.ministerioId);
      const posicoes = getPosicoesByTipo(ministerio?.tipo ?? editingSchedule.tipo ?? "outro");
      for (const posicao of posicoes) {
        const existing = editingSchedule.assignments.find(a => a.posicao === posicao);
        const newUserId = assignments[posicao];
        if (existing) {
          if (existing.userId !== newUserId) await apiRequest("PATCH", `/api/assignments/${existing.id}`, { userId: newUserId });
        } else if (newUserId) {
          await apiRequest("POST", "/api/assignments", { scheduleId: editingSchedule.id, userId: newUserId, posicao });
        }
      }
      return schedule;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schedules", "all"] });
      setIsDialogOpen(false); setEditingSchedule(null); setAssignments({}); setLouvores([]); form.reset();
      toast({ title: "Escala atualizada!" });
    },
    onError: (error: any) => toast({ title: "Erro ao atualizar escala", description: error.message, variant: "destructive" }),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/schedules/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schedules", "all"] });
      toast({ title: "Escala removida" });
    },
    onError: (error: any) => toast({ title: "Erro ao remover escala", description: error.message, variant: "destructive" }),
  });

  const onSubmit = (data: ScheduleFormData) => {
    if (editingSchedule) updateScheduleMutation.mutate(data);
    else createScheduleMutation.mutate(data);
  };

  const watchedMinisterioId = form.watch("ministerioId");
  const formMinisterio = meusMinisterios.find(m => m.id === watchedMinisterioId) ?? null;

  const renderLouvores = (schedule: ScheduleWithAssignments) => {
    try {
      const data = schedule.louvores ? JSON.parse(schedule.louvores) : [];
      if (!Array.isArray(data) || data.length === 0) return null;
      return (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-3"><Music2 className="w-4 h-4 text-primary" /><span className="text-sm font-semibold">Louvores:</span></div>
          <div className="space-y-2">
            {data.map((louvor: Louvor, i: number) => (
              <div key={i} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                <span className="text-sm">{i + 1}. {louvor.nome}</span>
                <Badge variant="secondary">{louvor.tonalidade}</Badge>
              </div>
            ))}
          </div>
        </div>
      );
    } catch { return null; }
  };

  const renderScheduleCards = (schedules: ScheduleWithAssignments[], limit: number = 3) => {
    if (schedules.length === 0) {
      return <p className="text-muted-foreground text-center py-8">Nenhuma escala encontrada nesta categoria.</p>;
    }
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schedules.slice(0, limit).map(schedule => (
          <Card key={schedule.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(schedule.data + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => { setEditingSchedule(schedule); setIsDialogOpen(true); }}>
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
              {(schedule.assignments || []).map(assign => (
                <div key={assign.id} className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {schedule.tipo === "louvor"
                      ? (POSICOES_LABELS[assign.posicao] || assign.posicao)
                      : assign.posicao.startsWith("obreiro-")
                        ? `Obreiro ${parseInt(assign.posicao.split('-')[1]) + 1}`
                        : assign.posicao}:
                  </span>
                  <Badge variant={assign.user ? "default" : "outline"}>
                    {assign.user ? assign.user.nome : "Vazio"}
                  </Badge>
                </div>
              ))}
              {schedule.tipo === "louvor" && renderLouvores(schedule)}
            </CardContent>
          </Card>
        ))}
        {schedules.length > limit && (
          <div className="col-span-full text-center py-4">
            <p className="text-sm text-muted-foreground">+{schedules.length - limit} escala(s) adicional(is)</p>
          </div>
        )}
      </div>
    );
  };

  const activeSchedules = activeTab === "proximas" ? proximas : activeTab === "atuais" ? atuais : anteriores;

  if (meusMinisterios.length === 0 && !isLoading) {
    return (
      <div className="space-y-8">
        <h1 className="font-sans text-4xl font-semibold">Gerenciar Escalas</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Você não é líder de nenhum ministério.</p>
            <p className="text-sm text-muted-foreground mt-1">Peça ao administrador para te adicionar como líder de um ministério.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2">Gerenciar Escalas</h1>
          <p className="text-lg text-muted-foreground">Gerencie as escalas dos ministérios que você lidera.</p>
        </div>
        <Button onClick={() => { setEditingSchedule(null); setIsDialogOpen(true); }} className="flex items-center gap-2" disabled={!selectedMinisterioId}>
          <Plus className="w-5 h-5" />
          Nova Escala
        </Button>
      </div>

      {/* Seletor de ministério */}
      {meusMinisterios.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {meusMinisterios.map(m => (
            <Button
              key={m.id}
              variant={selectedMinisterioId === m.id ? "default" : "outline"}
              onClick={() => { setSelectedMinisterioId(m.id); setActiveTab("proximas"); setViewAll(false); }}
              className="flex items-center gap-2"
            >
              {m.tipo === "louvor" ? <Music className="w-4 h-4" /> : <UsersIcon className="w-4 h-4" />}
              {m.nome}
            </Button>
          ))}
        </div>
      )}

      {/* Cabeçalho do ministério selecionado */}
      {selectedMinisterio && (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            {selectedMinisterio.tipo === "louvor" ? <Music className="w-5 h-5 text-primary" /> : <UsersIcon className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <h2 className="font-semibold text-xl">{selectedMinisterio.nome}</h2>
            <p className="text-sm text-muted-foreground">{membrosMinisterio.length} membro(s) vinculados</p>
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-2 items-center flex-wrap">
        {[
          { tab: "proximas" as TabType, label: "Próximas", icon: ChevronRight, count: proximas.length },
          { tab: "atuais" as TabType, label: "Hoje", icon: Calendar, count: atuais.length },
          { tab: "anteriores" as TabType, label: "Anteriores", icon: Archive, count: anteriores.length },
        ].filter(t => t.count > 0 || t.tab === "proximas").map(({ tab, label, icon: Icon, count }) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setViewAll(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Icon className="w-4 h-4" />{label} ({count})
          </button>
        ))}
        {activeTab === "proximas" && (
          <Button variant={viewAll ? "default" : "outline"} size="sm" onClick={() => setViewAll(!viewAll)} className="ml-auto">
            {viewAll ? "Ver Menos" : "Ver Todas"}
          </Button>
        )}
      </div>

      {/* Cards de escalas */}
      {isLoading ? <p>Carregando...</p> : renderScheduleCards(activeSchedules, viewAll ? 999 : 3)}

      {/* Dialog criar/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Editar Escala" : "Criar Nova Escala"}</DialogTitle>
            <DialogDescription>
              {editingSchedule ? "Atualize os detalhes da escala." : "Preencha os detalhes para criar uma nova escala."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data">Data</Label>
                <Input id="data" type="date" {...form.register("data")} />
              </div>
              <div>
                <Label>Ministério</Label>
                <Select
                  value={watchedMinisterioId?.toString() ?? ""}
                  onValueChange={v => form.setValue("ministerioId", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {meusMinisterios.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" {...form.register("observacoes")} />
            </div>

            {formMinisterio && (
              <div className="space-y-4">
                <h3 className="font-semibold">Atribuir Membros</h3>
                {getPosicoesByTipo(formMinisterio.tipo).map((posicao, index) => (
                  <div key={posicao} className="grid grid-cols-2 items-center gap-2">
                    <Label>
                      {formMinisterio.tipo === "louvor"
                        ? (POSICOES_LABELS[posicao] || posicao)
                        : formMinisterio.tipo === "obreiros"
                          ? `Obreiro ${index + 1}`
                          : `Responsável ${index + 1}`}
                    </Label>
                    <Select
                      value={assignments[posicao]?.toString() ?? "null"}
                      onValueChange={v => setAssignments(prev => ({ ...prev, [posicao]: v === "null" ? null : Number(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um membro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Vazio</SelectItem>
                        {membrosMinisterio.map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>{user.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            {formMinisterio?.tipo === "louvor" && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold flex items-center gap-2"><Music2 className="w-5 h-5" />Louvores e Tonalidades</h3>
                {louvores.length > 0 && (
                  <div className="space-y-2">
                    {louvores.map((louvor, i) => (
                      <div key={i} className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg">
                        <span className="flex-1">
                          <span className="font-medium">{i + 1}. {louvor.nome}</span>
                          <Badge variant="secondary" className="ml-2">{louvor.tonalidade}</Badge>
                        </span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setLouvores(louvores.filter((_, idx) => idx !== i))}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input className="flex-1" placeholder="Nome do louvor" value={novoLouvorNome} onChange={e => setNovoLouvorNome(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), adicionarLouvor())} />
                  <Select value={novoLouvorTom} onValueChange={setNovoLouvorTom}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{TONALIDADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" onClick={adicionarLouvor} size="icon"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
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
