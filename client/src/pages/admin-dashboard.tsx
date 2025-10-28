import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Calendar, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User, Course, Event, Material } from "@shared/schema";

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
    </div>
  );
}
