import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Event, ScheduleAssignment, User } from "@shared/schema";
import { LOCAIS_LABELS } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Music, Users, Building2, Globe, Lock, Calendar, RepeatIcon } from "lucide-react";
import { format, parseISO, getDay, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Schedule {
  id: number;
  data: string;
  tipo: string;
  ministerioId: number | null;
  observacoes: string | null;
  assignments: (ScheduleAssignment & { user: User | null })[];
}

interface CultoRecorrente {
  id: number;
  titulo: string;
  descricao: string | null;
  local: string;
  diaSemana: number;
  dataInicio: string;
  dataFim: string | null;
  isPublico: boolean;
}

interface CultoOcorrencia extends CultoRecorrente {
  dataCulto: string;
  pendingRequests: any[];
}

interface AgendaData {
  events: Event[];
  schedules: Schedule[];
  cultosRecorrentes: CultoOcorrencia[];
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const LOCAIS_EVENTO = ["eclesia", "missoes-vidas", "externo"] as const;

interface DayIndicator {
  type: "evento" | "escala" | "culto" | "pendente";
  label: string;
}

interface DayData {
  events: Event[];
  schedules: Schedule[];
  cultos: CultoOcorrencia[];
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────
function DayDetail({ date, data, ministerios }: {
  date: string;
  data: DayData;
  ministerios: { id: number; nome: string }[];
}) {
  const dateObj = parseISO(date + "T12:00:00");
  const ministerioNome = (id: number | null | undefined) =>
    ministerios.find(m => m.id === id)?.nome ?? null;

  const hasAny = data.events.length > 0 || data.schedules.length > 0 || data.cultos.length > 0;

  if (!hasAny) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhum item neste dia</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-1">
      {data.cultos.map(culto => (
        <div key={`culto-${culto.id}-${culto.dataCulto}`} className="border-l-4 border-l-yellow-500 bg-yellow-50 rounded-r-lg p-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-yellow-700 border-yellow-400 bg-yellow-50 text-xs"><RepeatIcon className="w-3 h-3 mr-1" />Culto</Badge>
            <span className="font-semibold text-sm">{culto.titulo}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3 h-3" />{LOCAIS_LABELS[culto.local] ?? culto.local}
          </div>
          {culto.pendingRequests.length > 0 && (
            <Badge variant="destructive" className="text-xs mt-1">{culto.pendingRequests.length} escala(s) pendente(s)</Badge>
          )}
        </div>
      ))}

      {data.events.map(ev => (
        <div key={`ev-${ev.id}`} className="border-l-4 border-l-blue-500 bg-blue-50 rounded-r-lg p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 text-xs"><Calendar className="w-3 h-3 mr-1" />Evento</Badge>
              <span className="font-semibold text-sm">{ev.titulo}</span>
            </div>
            {ev.isPublico ? <Globe className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <Lock className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
          </div>
          {ev.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.descricao}</p>}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3 h-3" />{LOCAIS_LABELS[ev.local] ?? ev.local}
          </div>
          {ev.ministerioId && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />{ministerioNome(ev.ministerioId)}
            </div>
          )}
        </div>
      ))}

      {data.schedules.map(sc => (
        <div key={`sc-${sc.id}`} className="border-l-4 border-l-purple-500 bg-purple-50 rounded-r-lg p-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50 text-xs">
              {sc.tipo === "louvor" ? <Music className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
              Escala
            </Badge>
            <span className="font-semibold text-sm">{ministerioNome(sc.ministerioId) ?? (sc.tipo === "louvor" ? "Louvor" : "Obreiros")}</span>
          </div>
          {sc.observacoes && <p className="text-xs text-muted-foreground mt-1">{sc.observacoes}</p>}
          {sc.assignments.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {sc.assignments.filter(a => a.user).map(a => (
                <Badge key={a.id} variant="outline" className="text-xs">{a.user!.nome}</Badge>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AgendaPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: agenda, isLoading } = useQuery<AgendaData>({
    queryKey: ["/api/agenda", selectedMonth, selectedYear],
    queryFn: () => apiRequest("GET", `/api/agenda?month=${selectedMonth}&year=${selectedYear}`),
  });

  const { data: ministerios = [] } = useQuery<{ id: number; nome: string }[]>({
    queryKey: ["/api/ministerios"],
  });

  const navMonth = (dir: number) => {
    const d = new Date(selectedYear, selectedMonth - 1 + dir, 1);
    setSelectedMonth(d.getMonth() + 1);
    setSelectedYear(d.getFullYear());
    setSelectedDay(null);
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const totalDays = getDaysInMonth(firstDay);
    const startDow = getDay(firstDay); // 0=Sun ... 6=Sat

    const days: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < startDow; i++) {
      days.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, dateStr });
    }
    // Pad to complete last row
    while (days.length % 7 !== 0) {
      days.push({ day: null, dateStr: null });
    }
    return days;
  }, [selectedMonth, selectedYear]);

  // Map date -> data
  const dataByDate = useMemo(() => {
    const map: Record<string, DayData> = {};
    const ensure = (d: string) => { if (!map[d]) map[d] = { events: [], schedules: [], cultos: [] }; };

    for (const ev of agenda?.events ?? []) {
      ensure(ev.data);
      map[ev.data].events.push(ev);
    }
    for (const sc of agenda?.schedules ?? []) {
      const dateKey = sc.data.split("T")[0];
      ensure(dateKey);
      map[dateKey].schedules.push(sc);
    }
    for (const culto of agenda?.cultosRecorrentes ?? []) {
      ensure(culto.dataCulto);
      map[culto.dataCulto].cultos.push(culto);
    }
    return map;
  }, [agenda]);

  const todayStr = format(now, "yyyy-MM-dd");
  const selectedDayData = selectedDay ? (dataByDate[selectedDay] ?? { events: [], schedules: [], cultos: [] }) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2">Agenda da Igreja</h1>
        <p className="text-lg text-muted-foreground">Calendário de escalas e eventos</p>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navMonth(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-semibold min-w-[180px] text-center">
          {MESES[selectedMonth - 1]} {selectedYear}
        </h2>
        <Button variant="outline" size="icon" onClick={() => navMonth(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />Evento</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />Escala</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />Culto recorrente</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />Escala pendente</div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-muted-foreground">Carregando calendário...</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              {/* Day of week headers */}
              <div className="grid grid-cols-7 bg-muted">
                {DIAS_SEMANA.map(d => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((cell, idx) => {
                  if (!cell.day || !cell.dateStr) {
                    return <div key={idx} className="min-h-[80px] border-t border-r p-1 bg-muted/30" />;
                  }

                  const dayData = dataByDate[cell.dateStr];
                  const isToday = cell.dateStr === todayStr;
                  const isSelected = cell.dateStr === selectedDay;
                  const hasEvent = dayData?.events.length > 0;
                  const hasSchedule = dayData?.schedules.length > 0;
                  const hasCulto = dayData?.cultos.length > 0;
                  const hasPending = dayData?.cultos.some(c => c.pendingRequests.length > 0);

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => setSelectedDay(isSelected ? null : cell.dateStr)}
                      className={`min-h-[80px] border-t border-r p-1 cursor-pointer transition-colors hover:bg-muted/50 ${
                        isSelected ? "bg-primary/10 ring-2 ring-inset ring-primary" : ""
                      } ${isToday ? "bg-primary/5" : ""}`}
                    >
                      <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                      }`}>
                        {cell.day}
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {hasEvent && <span className="w-2.5 h-2.5 rounded-full bg-blue-500" title="Evento" />}
                        {hasSchedule && <span className="w-2.5 h-2.5 rounded-full bg-purple-500" title="Escala" />}
                        {hasCulto && !hasPending && <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" title="Culto recorrente" />}
                        {hasPending && <span className="w-2.5 h-2.5 rounded-full bg-red-500" title="Escala pendente" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:w-80">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedDay
                  ? format(parseISO(selectedDay + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })
                  : "Selecione um dia"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDay ? (
                <p className="text-sm text-muted-foreground">Clique em um dia no calendário para ver os detalhes.</p>
              ) : (
                <DayDetail
                  date={selectedDay}
                  data={selectedDayData!}
                  ministerios={ministerios}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
