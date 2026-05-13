import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Schedule, ScheduleAssignment, User } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Music, Users, ChevronLeft, ChevronRight, Music2, Archive, Building2 } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Ministerio {
  id: number;
  nome: string;
  tipo: string;
  isLider: boolean;
}

interface ScheduleWithAssignments extends Schedule {
  assignments: (ScheduleAssignment & { user: User | null })[];
}

interface Louvor {
  nome: string;
  tonalidade: string;
}

const POSICOES_LABELS: Record<string, string> = {
  teclado: "Teclado", guitarra: "Guitarra", som: "Som", violao: "Violão",
  baixo: "Baixo", bateria: "Bateria", ministro: "Ministro", backing: "Backing Vocal",
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type TabType = "proximas" | "anteriores";

export default function MemberSchedulesPage() {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const [selectedMinisterioId, setSelectedMinisterioId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("proximas");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Ministérios do usuário
  const { data: meusMinisterios = [], isLoading: loadingMin } = useQuery<Ministerio[]>({
    queryKey: ["/api/ministerios/meus"],
  });

  // Auto-seleciona o primeiro quando carrega
  const ministerioSelecionado = selectedMinisterioId
    ? meusMinisterios.find(m => m.id === selectedMinisterioId) ?? meusMinisterios[0] ?? null
    : meusMinisterios[0] ?? null;

  // Escalas do período (mês atual + próximos 2)
  const { data: allSchedules = [], isLoading: loadingSchedules } = useQuery<ScheduleWithAssignments[]>({
    queryKey: ["member-schedules", selectedYear, selectedMonth],
    queryFn: async () => {
      const result: ScheduleWithAssignments[] = [];
      for (let i = -1; i <= 2; i++) {
        const d = new Date(selectedYear, selectedMonth - 1 + i, 1);
        const r = await apiRequest<ScheduleWithAssignments[]>(
          "GET", `/api/schedules?month=${d.getMonth() + 1}&year=${d.getFullYear()}`
        );
        result.push(...r);
      }
      return result;
    },
    enabled: meusMinisterios.length > 0,
  });

  // Filtra pelo ministério selecionado
  const schedulesDoMinisterio = useMemo(() =>
    ministerioSelecionado
      ? allSchedules.filter(s => s.ministerioId === ministerioSelecionado.id)
      : [],
    [allSchedules, ministerioSelecionado]
  );

  const { proximas, anteriores } = useMemo(() => {
    const thirtyDaysAgo = addDays(now, -30);
    const proximas: ScheduleWithAssignments[] = [];
    const anteriores: ScheduleWithAssignments[] = [];
    schedulesDoMinisterio.forEach(s => {
      try {
        const d = parseISO(s.data); d.setHours(0, 0, 0, 0);
        if (d >= now) proximas.push(s);
        else if (d > thirtyDaysAgo) anteriores.push(s);
      } catch {}
    });
    proximas.sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime());
    anteriores.sort((a, b) => parseISO(b.data).getTime() - parseISO(a.data).getTime());
    return { proximas, anteriores };
  }, [schedulesDoMinisterio]);

  const navMonth = (dir: number) => {
    const d = new Date(selectedYear, selectedMonth - 1 + dir, 1);
    setSelectedMonth(d.getMonth() + 1);
    setSelectedYear(d.getFullYear());
  };

  const renderLouvores = (s: ScheduleWithAssignments) => {
    try {
      const data = s.louvores ? JSON.parse(s.louvores) : [];
      if (!Array.isArray(data) || data.length === 0) return null;
      return (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Music2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold">Louvores</span>
          </div>
          <div className="space-y-1">
            {data.map((l: Louvor, i: number) => (
              <div key={i} className="flex justify-between items-center bg-muted/40 px-2 py-1 rounded text-xs">
                <span>{i + 1}. {l.nome}</span>
                <Badge variant="secondary" className="text-xs">{l.tonalidade}</Badge>
              </div>
            ))}
          </div>
        </div>
      );
    } catch { return null; }
  };

  const renderCards = (schedules: ScheduleWithAssignments[]) => {
    if (schedules.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma escala nesta categoria.</p>
        </div>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schedules.map(s => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-primary" />
                {format(new Date(s.data + "T12:00:00"), "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              {s.observacoes && <CardDescription>{s.observacoes}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-1.5">
              {(s.assignments ?? []).map(a => (
                <div key={a.id} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {s.tipo === "louvor"
                      ? (POSICOES_LABELS[a.posicao] ?? a.posicao)
                      : a.posicao.startsWith("obreiro-")
                        ? `Obreiro ${parseInt(a.posicao.split("-")[1]) + 1}`
                        : a.posicao}
                  </span>
                  <Badge variant={a.user ? "default" : "outline"} className="text-xs">
                    {a.user ? a.user.nome : "Vazio"}
                  </Badge>
                </div>
              ))}
              {s.tipo === "louvor" && renderLouvores(s)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Estado: sem ministérios
  if (!loadingMin && meusMinisterios.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2">Minhas Escalas</h1>
          <p className="text-lg text-muted-foreground">Escalas dos ministérios que você participa</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="font-medium mb-1">Você não faz parte de nenhum ministério</p>
            <p className="text-sm text-muted-foreground">Quando for adicionado a um ministério, as escalas aparecerão aqui.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2">Minhas Escalas</h1>
        <p className="text-lg text-muted-foreground">Escalas dos ministérios que você participa</p>
      </div>

      {/* Seletor de ministério — aparece só se tiver mais de um */}
      {meusMinisterios.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {meusMinisterios.map(m => (
            <Button
              key={m.id}
              variant={ministerioSelecionado?.id === m.id ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedMinisterioId(m.id); setActiveTab("proximas"); }}
              className="flex items-center gap-2"
            >
              {m.tipo === "louvor" ? <Music className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              {m.nome}
            </Button>
          ))}
        </div>
      )}

      {/* Cabeçalho do ministério */}
      {ministerioSelecionado && (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            {ministerioSelecionado.tipo === "louvor"
              ? <Music className="w-4 h-4 text-primary" />
              : <Users className="w-4 h-4 text-primary" />}
          </div>
          <h2 className="font-semibold text-xl">{ministerioSelecionado.nome}</h2>
        </div>
      )}

      {/* Navegação de mês */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navMonth(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium min-w-[140px] text-center">
          {MESES[selectedMonth - 1]} {selectedYear}
        </span>
        <Button variant="outline" size="icon" onClick={() => navMonth(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Abas */}
      <div className="flex gap-2">
        {(["proximas", "anteriores"] as TabType[]).map(tab => {
          const count = tab === "proximas" ? proximas.length : anteriores.length;
          const label = tab === "proximas" ? "Próximas" : "Anteriores";
          const Icon = tab === "proximas" ? ChevronRight : Archive;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Icon className="w-4 h-4" />{label} ({count})
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {loadingSchedules
        ? <p className="text-muted-foreground text-sm">Carregando escalas...</p>
        : renderCards(activeTab === "proximas" ? proximas : anteriores)}
    </div>
  );
}
