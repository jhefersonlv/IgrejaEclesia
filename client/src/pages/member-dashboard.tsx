import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Video, GraduationCap, Cake, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Course, Material, User as UserType } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Aniversariante {
  id: number;
  nome: string;
  fotoPerfil?: string;
  dataNascimento: string;
  dia: number;
  mes: number;
}

// Componente de Aniversariantes
function AniversariantesDoMes() {
  const currentDate = new Date();
  const mesAtual = currentDate.getMonth() + 1;
  const mesNome = format(currentDate, "MMMM", { locale: ptBR });

  const { data: aniversariantes = [], isLoading } = useQuery<Aniversariante[]>({
    queryKey: ["aniversariantes", mesAtual],
    queryFn: async () => {
      const response = await fetch(`/api/members/birthdays?month=${mesAtual}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar aniversariantes');
      return response.json();
    },
  });

  const aniversariantesOrdenados = [...aniversariantes].sort((a, b) => a.dia - b.dia);
  const hoje = currentDate.getDate();
  const aniversariantesHoje = aniversariantesOrdenados.filter(a => a.dia === hoje);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="w-5 h-5 text-primary" />
          Aniversariantes de {mesNome}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : aniversariantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aniversariante este mês
          </p>
        ) : (
          <div className="space-y-3">
            {aniversariantesHoje.length > 0 && (
              <div className="mb-4 p-3 bg-primary/10 border-1 border-primary rounded-lg">
                <p className="text-xs text-primary mb-2">
                    O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti, e tenha misericórdia de ti; o Senhor levante sobre ti o seu rosto, e te dê a paz. - Parabéns! 🎉 
                </p>
                {aniversariantesHoje.map((pessoa) => (
                  <div key={pessoa.id} className="flex items-center gap-3 py-2">
                    <div className="relative">
                      {pessoa.fotoPerfil ? (
                        <img
                          src={pessoa.fotoPerfil}
                          alt={pessoa.nome}
                          className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1  text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        🎂
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{pessoa.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {pessoa.dia} de {mesNome}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {aniversariantesOrdenados.map((pessoa) => {
                const ehHoje = pessoa.dia === hoje;
                if (ehHoje) return null;
                
                return (
                  <div
                    key={pessoa.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      {pessoa.fotoPerfil ? (
                        <img
                          src={pessoa.fotoPerfil}
                          alt={pessoa.nome}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{pessoa.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {pessoa.dia} de {mesNome}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {pessoa.dia}/{pessoa.mes}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

      {/* Aniversariantes do Mês */}
      <div>
        <AniversariantesDoMes />
      </div>

      {/* Cursos Disponíveis */}
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