import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Schedule, ScheduleAssignment, User } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Music, ChevronRight, Archive, Music2 } from "lucide-react";
import { useMemo, useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScheduleWithAssignments extends Schedule {
  assignments: (ScheduleAssignment & { user: User | null })[];
}

interface Louvor {
  nome: string;
  tonalidade: string;
}

const POSICOES_LABELS: Record<string, string> = {
  teclado: "Teclado",
  violao: "Violão",
  baixo: "Baixo",
  bateria: "Bateria",
  voz: "Voz",
  backing: "Backing Vocal",
};

type TabType = "proximas" | "atuais" | "anteriores";

export default function MemberLouvorSchedulesPage() {
  const [louvorTab, setLouvorTab] = useState<TabType>("proximas");
 
  const [showAllLouvor, setShowAllLouvor] = useState(false);

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        const user = await apiRequest<User>("GET", "/api/users/me");
        console.log("✅ Usuário obtido de /api/users/me:", user);
        return user;
      } catch (error) {
        console.error("❌ Erro ao buscar /api/users/me:", error);
        try {
          const user = await apiRequest<User>("GET", "/api/auth/me");
          console.log("✅ Usuário obtido de /api/auth/me:", user);
          return user;
        } catch (error2) {
          console.error("❌ Erro ao buscar /api/auth/me:", error2);
          throw error;
        }
      }
    },
    retry: 2,
  });

  // Fetch schedules for current and nearby months
  const { data: allSchedules = [], isLoading } = useQuery<ScheduleWithAssignments[]>({
    queryKey: ["member-schedules-louvor", "all", selectedYear],
    queryFn: async () => {
      const schedules: ScheduleWithAssignments[] = [];
      for (let i = -1; i <= 3; i++) {
        const date = new Date(selectedYear, selectedMonth - 1 + i, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        
        const response = await apiRequest<ScheduleWithAssignments[]>(
          "GET",
          `/api/schedules?month=${month}&year=${year}`
        );
        // Filtrar apenas escalas de louvor
        const louvorSchedules = response.filter(s => s.tipo === "louvor");
        schedules.push(...louvorSchedules);
      }
      return schedules;
    },
  });

  // Classificar escalas por categoria
  const { proximas, atuais, anteriores } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = addDays(now, -30);

    const proximas: ScheduleWithAssignments[] = [];
    const atuais: ScheduleWithAssignments[] = [];
    const anteriores: ScheduleWithAssignments[] = [];

    allSchedules.forEach((schedule) => {
      try {
        const scheduleDate = parseISO(schedule.data);
        scheduleDate.setHours(0, 0, 0, 0);

        if (scheduleDate >= addDays(now, 1)) {
          proximas.push(schedule);
        } else if (scheduleDate.getTime() === now.getTime()) {
          atuais.push(schedule);
        } else if (scheduleDate > thirtyDaysAgo && scheduleDate < now) {
          anteriores.push(schedule);
        }
      } catch (error) {
        console.error("❌ Erro ao processar escala:", schedule, error);
      }
    });

    proximas.sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime());
    atuais.sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime());
    anteriores.sort((a, b) => parseISO(b.data).getTime() - parseISO(a.data).getTime());

    return { proximas, atuais, anteriores };
  }, [allSchedules]);
  

  const renderLouvores = (schedule: ScheduleWithAssignments) => {
    try {
      const louvorData = schedule.louvores ? JSON.parse(schedule.louvores) : [];
      if (!Array.isArray(louvorData) || louvorData.length === 0) return null;
      
      return (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Music2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Louvores:</span>
          </div>
          <div className="space-y-2">
            {louvorData.map((louvor: Louvor, index: number) => (
              <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                <span className="text-sm">{index + 1}. {louvor.nome}</span>
                <Badge variant="secondary">{louvor.tonalidade}</Badge>
              </div>
            ))}
          </div>
        </div>
      );
    } catch {
      return null;
    }
  };

  const TabButton = ({ tab, label, icon: Icon, count }: { tab: TabType; label: string; icon: any; count: number }) => {
    const isActive = louvorTab === tab;
    
    return (
      <button
        onClick={() => setLouvorTab(tab)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        <Icon className="w-4 h-4" />
        {label} ({count})
      </button>
    );
  };

  const renderScheduleCards = (schedules: ScheduleWithAssignments[], displayLimit: number = 3) => {
    if (schedules.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-8">
          Nenhuma escala encontrada nesta categoria.
        </p>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schedules.slice(0, displayLimit).map((schedule) => (
          <Card key={schedule.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(schedule.data + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              {schedule.observacoes && <CardDescription>{schedule.observacoes}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-2">
              {(schedule.assignments || []).map((assign) => {
                const isCurrentUser = assign.user && currentUser && assign.user.id === currentUser.id;
                
                return (
                  <div key={assign.id} className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {POSICOES_LABELS[assign.posicao] || assign.posicao}:
                    </span>
                    <Badge variant={isCurrentUser ? "default" : assign.user ? "secondary" : "outline"}>
                      {assign.user ? assign.user.nome : "Vazio"}
                    </Badge>
                  </div>
                );
              })}
              {renderLouvores(schedule)}
            </CardContent>
          </Card>
        ))}
        {schedules.length > displayLimit && (
          <div className="col-span-full text-center py-4">
            <p className="text-sm text-muted-foreground">
              +{schedules.length - displayLimit} escala(s) adicional(is)
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2 flex items-center gap-2">
          <Music className="w-8 h-8 text-primary" />
          Escalas de Louvor
        </h1>
        <p className="text-lg text-muted-foreground">Visualize as escalas de louvor que você faz parte.</p>
      </div>

      <div className="flex gap-2 mb-6 items-center flex-wrap">
        <TabButton tab="proximas" label="Próximas" icon={ChevronRight} count={proximas.length} />
        {atuais.length > 0 && (
          <TabButton tab="atuais" label="Hoje" icon={Calendar} count={atuais.length} />
        )}
        {anteriores.length > 0 && (
          <TabButton tab="anteriores" label="Anteriores" icon={Archive} count={anteriores.length} />
        )}
        
        {louvorTab === "proximas" && proximas.length > 3 && (
          <button
            onClick={() => setShowAllLouvor(!showAllLouvor)}
            className="ml-auto text-sm font-medium text-primary hover:underline"
          >
            {showAllLouvor ? "Ver Menos" : "Ver Todas"}
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : louvorTab === "proximas" ? (
        renderScheduleCards(proximas, showAllLouvor ? 999 : 3)
      ) : louvorTab === "atuais" ? (
        renderScheduleCards(atuais, 999)
      ) : (
        renderScheduleCards(anteriores, 999)
      )}
    </div>
  );
}