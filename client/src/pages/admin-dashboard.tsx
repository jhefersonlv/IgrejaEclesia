import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Calendar, BookOpen, TrendingUp, CheckCircle, BookMarked } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User, Course, Event, Material } from "@shared/schema";
import { Progress } from "@/components/ui/progress";

interface CourseAnalytics {
  totalCourses: number;
  totalLessons: number;
  totalCompletions: number;
  averageCompletionRate: number;
  courseStats: {
    courseId: number;
    courseName: string;
    totalLessons: number;
    totalCompletions: number;
    completionRate: number;
    studentsStarted: number;
    studentsCompleted: number;
  }[];
}

export default function AdminDashboard() {
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
  });

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: courseAnalytics, isLoading: analyticsLoading } = useQuery<CourseAnalytics>({
    queryKey: ["/api/admin/analytics/courses"],
  });

  const totalMembers = users.filter(u => !u.isAdmin).length;
  const totalAdmins = users.filter(u => u.isAdmin).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-admin-title">
          Dashboard Administrativo
        </h1>
        <p className="text-lg text-muted-foreground">
          Visão geral do sistema
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-elevate" data-testid="card-stat-members">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-members-count">{totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{totalAdmins} administradores
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-courses">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos Ativos</CardTitle>
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-courses-count">{courses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cursos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-events">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-events-count">{events.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Eventos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-materials">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materiais</CardTitle>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-materials-count">{materials.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              PDFs e vídeos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-sans text-2xl font-semibold mb-6">Ações Rápidas</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="hover-elevate cursor-pointer" onClick={() => window.location.href = '/admin/members'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gerenciar Membros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cadastrar, editar e visualizar membros
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" onClick={() => window.location.href = '/admin/courses'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Gerenciar Cursos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Criar e editar cursos e aulas
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" onClick={() => window.location.href = '/admin/events'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Gerenciar Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Criar e editar eventos da igreja
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Course Analytics */}
      <div>
        <h2 className="font-sans text-2xl font-semibold mb-6">Progresso dos Cursos</h2>
        
        {analyticsLoading ? (
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courseAnalytics ? (
          <>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card className="hover-elevate" data-testid="card-total-lessons">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Aulas</CardTitle>
                  <BookMarked className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="text-total-lessons">
                    {courseAnalytics.totalLessons}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aulas cadastradas
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-total-completions">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conclusões de Aulas</CardTitle>
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="text-total-completions">
                    {courseAnalytics.totalCompletions}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aulas completadas
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-completion-rate">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Conclusão Média</CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="text-completion-rate">
                    {courseAnalytics.averageCompletionRate}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cursos completos por aluno
                  </p>
                </CardContent>
              </Card>
            </div>

            {courseAnalytics.courseStats.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Estatísticas por Curso</h3>
                {courseAnalytics.courseStats.map((stat) => (
                  <Card key={stat.courseId} data-testid={`course-stat-${stat.courseId}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-base">{stat.courseName}</CardTitle>
                        <div className="text-sm font-medium text-muted-foreground">
                          {stat.completionRate}% conclusão
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Progress value={stat.completionRate} className="h-2" />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Aulas</p>
                          <p className="text-lg font-semibold">{stat.totalLessons}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Conclusões</p>
                          <p className="text-lg font-semibold">{stat.totalCompletions}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Alunos Iniciados</p>
                          <p className="text-lg font-semibold">{stat.studentsStarted}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Alunos Completos</p>
                          <p className="text-lg font-semibold">{stat.studentsCompleted}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <Card className="p-8">
            <div className="text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum dado de progresso disponível</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
