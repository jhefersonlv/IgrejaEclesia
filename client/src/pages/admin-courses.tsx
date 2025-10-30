import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Plus, Trash2, Edit, PlayCircle, FileQuestion, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Course, InsertCourse, Lesson, InsertLesson, Question } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCourseSchema, insertLessonSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminCourses() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const { toast } = useToast();

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const courseForm = useForm<InsertCourse>({
    resolver: zodResolver(insertCourseSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      imagem: "",
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

  const onCreateCourse = (data: InsertCourse) => {
    createCourseMutation.mutate(data);
  };

  const onUpdateCourse = (data: InsertCourse) => {
    if (!selectedCourse) return;
    updateCourseMutation.mutate({ id: selectedCourse.id, ...data });
  };

  const handleEditClick = (course: Course) => {
    setSelectedCourse(course);
    courseForm.reset(course);
    setIsEditOpen(true);
  };

  const updateCourseMutation = useMutation({
    mutationFn: async (data: { id: number } & InsertCourse) => {
      return await apiRequest<Course>("PATCH", `/api/admin/courses/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Curso atualizado com sucesso!",
        description: "As informações do curso foram atualizadas.",
      });
      setIsEditOpen(false);
      setSelectedCourse(null);
      courseForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar curso",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

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
                  <Link href={`/admin/course-details/${course.id}`} className="w-full">
  <Button
    variant="default" // ALTERADO: Destaca o botão de navegação
    className="w-full"
    data-testid={`button-manage-course-${course.id}`}
  >
    Gerenciar Curso
    <ChevronRight className="w-4 h-4 ml-2" />
  </Button>
</Link>
                  
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
            <DialogDescription>
              Atualize as informações do curso
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={courseForm.handleSubmit(onUpdateCourse)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome-edit">Nome do Curso *</Label>
              <Input id="nome-edit" {...courseForm.register("nome")} />
              {courseForm.formState.errors.nome && (
                <p className="text-sm text-destructive">{courseForm.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao-edit">Descrição *</Label>
              <Textarea
                id="descricao-edit"
                rows={4}
                {...courseForm.register("descricao")}
              />
              {courseForm.formState.errors.descricao && (
                <p className="text-sm text-destructive">{courseForm.formState.errors.descricao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagem-edit">URL da Imagem</Label>
              <Input
                id="imagem-edit"
                placeholder="https://example.com/image.jpg"
                {...courseForm.register("imagem")}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateCourseMutation.isPending}>
                {updateCourseMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
