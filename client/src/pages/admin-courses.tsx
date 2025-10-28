import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GraduationCap, Plus, Trash2, Edit, PlayCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Course, InsertCourse, Lesson, InsertLesson } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCourseSchema, insertLessonSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminCourses() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: courseLessons = [] } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", selectedCourse?.id, "lessons"],
    enabled: !!selectedCourse,
  });

  const courseForm = useForm<InsertCourse>({
    resolver: zodResolver(insertCourseSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      imagem: "",
    },
  });

  const lessonForm = useForm<InsertLesson>({
    resolver: zodResolver(insertLessonSchema),
    defaultValues: {
      cursoId: 0,
      titulo: "",
      descricao: "",
      videoUrl: "",
      ordem: 0,
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: InsertCourse) => {
      return await apiRequest<Course>("POST", "/api/admin/courses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Curso criado com sucesso!",
        description: "O novo curso foi adicionado ao sistema.",
      });
      setIsCreateOpen(false);
      courseForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar curso",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/courses/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Curso removido",
        description: "O curso e suas aulas foram removidos do sistema.",
      });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: InsertLesson) => {
      return await apiRequest<Lesson>("POST", "/api/admin/lessons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", selectedCourse?.id, "lessons"] });
      toast({
        title: "Aula criada com sucesso!",
        description: "A nova aula foi adicionada ao curso.",
      });
      setIsLessonDialogOpen(false);
      lessonForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar aula",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/lessons/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", selectedCourse?.id, "lessons"] });
      toast({
        title: "Aula removida",
        description: "A aula foi removida do curso.",
      });
    },
  });

  const onCreateCourse = (data: InsertCourse) => {
    createCourseMutation.mutate(data);
  };

  const onCreateLesson = (data: InsertLesson) => {
    if (selectedCourse) {
      createLessonMutation.mutate({
        ...data,
        cursoId: selectedCourse.id,
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-courses-title">
            Gerenciar Cursos
          </h1>
          <p className="text-lg text-muted-foreground">
            {courses.length} cursos cadastrados
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-course">
              <Plus className="w-4 h-4 mr-2" />
              Novo Curso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Curso</DialogTitle>
              <DialogDescription>
                Preencha as informações do curso
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={courseForm.handleSubmit(onCreateCourse)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Curso *</Label>
                <Input id="nome" {...courseForm.register("nome")} data-testid="input-course-name" />
                {courseForm.formState.errors.nome && (
                  <p className="text-sm text-destructive">{courseForm.formState.errors.nome.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  rows={4}
                  {...courseForm.register("descricao")}
                  data-testid="textarea-course-description"
                />
                {courseForm.formState.errors.descricao && (
                  <p className="text-sm text-destructive">{courseForm.formState.errors.descricao.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagem">URL da Imagem</Label>
                <Input
                  id="imagem"
                  placeholder="https://example.com/image.jpg"
                  {...courseForm.register("imagem")}
                  data-testid="input-course-image"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCourseMutation.isPending} data-testid="button-submit-course">
                  {createCourseMutation.isPending ? "Criando..." : "Criar Curso"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-muted animate-pulse" />
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden hover-elevate" data-testid={`card-course-${course.id}`}>
              {course.imagem ? (
                <div className="h-48 overflow-hidden">
                  <img
                    src={course.imagem}
                    alt={course.nome}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-primary/20 to-gold/20 flex items-center justify-center">
                  <GraduationCap className="w-16 h-16 text-primary/50" />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{course.nome}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-foreground/70 line-clamp-2">{course.descricao}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedCourse(course)}
                    data-testid={`button-manage-lessons-${course.id}`}
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Aulas
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja remover ${course.nome}?`)) {
                        deleteCourseMutation.mutate(course.id);
                      }
                    }}
                    data-testid={`button-delete-course-${course.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-16">
          <div className="text-center">
            <GraduationCap className="w-20 h-20 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum curso cadastrado</h3>
            <p className="text-muted-foreground mb-6">
              Comece criando seu primeiro curso
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Curso
            </Button>
          </div>
        </Card>
      )}

      {/* Course Lessons Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedCourse?.nome}</DialogTitle>
            <DialogDescription>
              Gerencie as aulas deste curso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={() => setIsLessonDialogOpen(true)} data-testid="button-add-lesson">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Aula
            </Button>

            {courseLessons.length > 0 ? (
              <div className="space-y-2">
                {courseLessons
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((lesson, index) => (
                    <Card key={lesson.id} data-testid={`card-lesson-${lesson.id}`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{lesson.titulo}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {lesson.descricao}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja remover esta aula?`)) {
                              deleteLessonMutation.mutate(lesson.id);
                            }
                          }}
                          data-testid={`button-delete-lesson-${lesson.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <PlayCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhuma aula cadastrada ainda</p>
                </div>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Lesson Dialog */}
      <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Aula</DialogTitle>
            <DialogDescription>
              Preencha as informações da aula
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={lessonForm.handleSubmit(onCreateLesson)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título da Aula *</Label>
              <Input id="titulo" {...lessonForm.register("titulo")} data-testid="input-lesson-title" />
              {lessonForm.formState.errors.titulo && (
                <p className="text-sm text-destructive">{lessonForm.formState.errors.titulo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao-lesson">Descrição *</Label>
              <Textarea
                id="descricao-lesson"
                rows={3}
                {...lessonForm.register("descricao")}
                data-testid="textarea-lesson-description"
              />
              {lessonForm.formState.errors.descricao && (
                <p className="text-sm text-destructive">{lessonForm.formState.errors.descricao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">URL do Vídeo do YouTube *</Label>
              <Input
                id="videoUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                {...lessonForm.register("videoUrl")}
                data-testid="input-lesson-video"
              />
              {lessonForm.formState.errors.videoUrl && (
                <p className="text-sm text-destructive">{lessonForm.formState.errors.videoUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordem">Ordem</Label>
              <Input
                id="ordem"
                type="number"
                {...lessonForm.register("ordem", { valueAsNumber: true })}
                data-testid="input-lesson-order"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsLessonDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createLessonMutation.isPending} data-testid="button-submit-lesson">
                {createLessonMutation.isPending ? "Criando..." : "Criar Aula"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
