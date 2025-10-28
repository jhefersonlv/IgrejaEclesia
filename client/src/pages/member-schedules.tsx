import { useQuery, useQueries } from "@tanstack/react-query";
import type { Schedule, ScheduleAssignment, User } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Music, Users as UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ScheduleWithAssignments extends Schedule {
  assignments: (ScheduleAssignment & { user?: User })[];
}

const POSICOES_LOUVOR = [
  { key: "teclado", label: "Teclado" },
  { key: "violao", label: "Violão" },
  { key: "baixo", label: "Baixo" },
  { key: "bateria", label: "Bateria" },
  { key: "voz", label: "Voz" },
  { key: "backing", label: "Backing Vocal" },
];

export default function MemberSchedulesPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", selectedMonth, selectedYear],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
  });

  // Fetch assignments for each schedule using useQueries
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

  const louvorSchedules = schedulesWithAssignments.filter(s => s.tipo === "louvor");
  const obreirosSchedules = schedulesWithAssignments.filter(s => s.tipo === "obreiros");

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-schedules-title">
            Escalas
          </h1>
          <p className="text-lg text-muted-foreground">
            Visualize as escalas de louvor e obreiros
          </p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-md"
            data-testid="select-month"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-md"
            data-testid="select-year"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando escalas...</p>
      ) : (
        <div className="space-y-8">
          {/* Escala de Louvor */}
          <div>
            <h2 className="font-sans text-2xl font-semibold mb-4 flex items-center gap-2">
              <Music className="w-6 h-6 text-primary" />
              Escala de Louvor
            </h2>
            {louvorSchedules.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {louvorSchedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(schedule.data), "dd 'de' MMMM", { locale: ptBR })}
                      </CardTitle>
                      {schedule.observacoes && (
                        <CardDescription>{schedule.observacoes}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {POSICOES_LOUVOR.map(posicao => {
                          const assignment = schedule.assignments.find(a => a.posicao === posicao.key);
                          return (
                            <div key={posicao.key} className="flex justify-between items-center">
                              <span className="text-sm font-medium">{posicao.label}:</span>
                              {assignment?.user ? (
                                <Badge variant="default">{assignment.user.nome}</Badge>
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
                  Nenhuma escala de louvor cadastrada para este mês
                </CardContent>
              </Card>
            )}
          </div>

          {/* Escala de Obreiros */}
          <div>
            <h2 className="font-sans text-2xl font-semibold mb-4 flex items-center gap-2">
              <UsersIcon className="w-6 h-6 text-primary" />
              Escala de Obreiros
            </h2>
            {obreirosSchedules.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {obreirosSchedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(schedule.data), "dd 'de' MMMM", { locale: ptBR })}
                      </CardTitle>
                      {schedule.observacoes && (
                        <CardDescription>{schedule.observacoes}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {schedule.assignments.map((assignment, idx) => (
                          <div key={assignment.id} className="flex items-center gap-2">
                            <span className="text-sm">Obreiro {idx + 1}:</span>
                            {assignment.user ? (
                              <Badge variant="default">{assignment.user.nome}</Badge>
                            ) : (
                              <Badge variant="outline">Não atribuído</Badge>
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
                  Nenhuma escala de obreiros cadastrada para este mês
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
