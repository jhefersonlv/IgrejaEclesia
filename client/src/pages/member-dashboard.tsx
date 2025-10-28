import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Video, GraduationCap, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Course, Material } from "@shared/schema";

export default function MemberDashboard() {
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const pdfs = materials.filter(m => m.tipo === "pdf");
  const videos = materials.filter(m => m.tipo === "video");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-lg text-muted-foreground">
          Bem-vindo de volta! Continue seu aprendizado.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="hover-elevate" data-testid="card-stat-courses">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cursos</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <GraduationCap className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-courses-count">{courses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Disponíveis para você
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-pdfs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Apostilas</CardTitle>
            <div className="p-2 rounded-lg bg-gold/20">
              <BookOpen className="w-4 h-4 text-gold" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-pdfs-count">{pdfs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Materiais de estudo
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-videos">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vídeos</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Video className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-videos-count">{videos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Conteúdo privado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Courses */}
      <div>
        <h2 className="font-sans text-2xl font-semibold mb-6" data-testid="text-recent-courses">
          Cursos Disponíveis
        </h2>
        {courses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((course) => (
              <Card key={course.id} className="hover-elevate" data-testid={`card-course-${course.id}`}>
                {course.imagem && (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={course.imagem}
                      alt={course.nome}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{course.nome}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.descricao}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg text-muted-foreground">Nenhum curso disponível no momento</p>
            </div>
          </Card>
        )}
      </div>

      {/* Recent Materials */}
      <div>
        <h2 className="font-sans text-2xl font-semibold mb-6" data-testid="text-recent-materials">
          Materiais Recentes
        </h2>
        {pdfs.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {pdfs.slice(0, 4).map((material) => (
              <Card key={material.id} className="hover-elevate" data-testid={`card-material-${material.id}`}>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{material.titulo}</CardTitle>
                    {material.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{material.descricao}</p>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg text-muted-foreground">Nenhuma apostila disponível no momento</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
