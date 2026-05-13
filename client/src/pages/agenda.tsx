import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Event, ScheduleAssignment, User } from "@shared/schema";
import { LOCAIS_LABELS } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Music, Users, Building2, Globe, Lock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Schedule {
  id: number;
  data: string;
  tipo: string;
  ministerioId: number | null;
  observacoes: string | null;
  assignments: (ScheduleAssignment & { user: User | null })[];
}

interface AgendaItem {
  date: string;
  type: "evento" | "escala";
  id: number;
  titulo: string;
  subtitulo?: string;
  local?: string;
  ministerioId?: number | null;
  isPublico?: boolean;
  imagem?: string | null;
  assignments?: (ScheduleAssignment & { user: User | null })[];
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function AgendaPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: agenda, isLoading } = useQuery<{ events: Event[]; schedules: Schedule[] }>({
    queryKey: ["/api/agenda", selectedMonth, selectedYear],
    queryFn: () => apiRequest("GET", `/api/agenda?month=${selectedMonth}&year=${selectedYear}`),
  });

  const { data: ministerios = [] } = useQuery<{ id: number; nome: string }[]>({
    queryKey: ["/api/ministerios"],
  });

  const ministerioNome = (id: number | null | undefined) =>
    ministerios.find(m => m.id === id)?.nome ?? null;

  const items = useMemo((): AgendaItem[] => {
    const result: AgendaItem[] = [];

    for (const ev of agenda?.events ?? []) {
      result.push({
        date: ev.data,
        type: "evento",
        id: ev.id,
        titulo: ev.titulo,
        subtitulo: ev.descricao,
        local: ev.local,
        ministerioId: ev.ministerioId,
        isPublico: ev.isPublico,
        imagem: ev.imagem,
      });
    }

    for (const sc of agenda?.schedules ?? []) {
      const nome = ministerioNome(sc.ministerioId) ?? (sc.tipo === "louvor" ? "Louvor" : "Obreiros");
      result.push({
        date: sc.data,
        type: "escala",
        id: sc.id,
        titulo: `Escala — ${nome}`,
        subtitulo: sc.observacoes ?? undefined,
        ministerioId: sc.ministerioId,
        assignments: sc.assignments,
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [agenda, ministerios]);

  // Agrupa por data
  const grouped = useMemo(() => {
    const map: Record<string, AgendaItem[]> = {};
    for (const item of items) {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const navMonth = (dir: number) => {
    const d = new Date(selectedYear, selectedMonth - 1 + dir, 1);
    setSelectedMonth(d.getMonth() + 1);
    setSelectedYear(d.getFullYear());
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2">Agenda da Igreja</h1>
          <p className="text-lg text-muted-foreground">Escalas e eventos do mês</p>
        </div>
      </div>

      {/* Navegação de mês */}
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

      {isLoading && <p className="text-muted-foreground">Carregando agenda...</p>}

      {!isLoading && grouped.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum evento ou escala este mês.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {grouped.map(([date, dayItems]) => {
          const dateObj = parseISO(date + "T12:00:00");
          const isToday = date === format(now, "yyyy-MM-dd");
          return (
            <div key={date}>
              <div className={`flex items-center gap-3 mb-3 pb-2 border-b ${isToday ? "border-primary" : ""}`}>
                <div className={`text-center min-w-[48px] p-2 rounded-lg ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <div className="text-xs font-medium">{format(dateObj, "EEE", { locale: ptBR }).toUpperCase()}</div>
                  <div className="text-2xl font-bold leading-none">{format(dateObj, "dd")}</div>
                </div>
                <span className="text-sm text-muted-foreground capitalize">
                  {format(dateObj, "MMMM yyyy", { locale: ptBR })}
                </span>
              </div>

              <div className="space-y-3 pl-[60px]">
                {dayItems.map(item => (
                  <Card key={`${item.type}-${item.id}`} className={`border-l-4 ${item.type === "evento" ? "border-l-blue-500" : "border-l-purple-500"}`}>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.type === "evento" ? (
                            <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                              <Calendar className="w-3 h-3 mr-1" />Evento
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">
                              {item.titulo.includes("Louvor") ? <Music className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                              Escala
                            </Badge>
                          )}
                          <span className="font-semibold">{item.titulo}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.type === "evento" && (
                            item.isPublico
                              ? <Globe className="w-3.5 h-3.5 text-green-600" title="Público" />
                              : <Lock className="w-3.5 h-3.5 text-orange-500" title="Restrito ao ministério" />
                          )}
                          {item.ministerioId && (
                            <Badge variant="secondary" className="text-xs">
                              <Building2 className="w-3 h-3 mr-1" />
                              {ministerioNome(item.ministerioId)}
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-1">
                      {item.subtitulo && <p className="text-sm text-muted-foreground line-clamp-2">{item.subtitulo}</p>}
                      {item.local && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{LOCAIS_LABELS[item.local] ?? item.local}</span>
                        </div>
                      )}
                      {item.type === "escala" && item.assignments && item.assignments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.assignments.filter(a => a.user).map(a => (
                            <Badge key={a.id} variant="outline" className="text-xs">{a.user!.nome}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
