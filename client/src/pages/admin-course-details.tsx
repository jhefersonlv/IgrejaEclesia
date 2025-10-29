import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Course, User, Lesson } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, UserPlus, UserMinus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLessonSchema } from "@shared/schema";
import type { InsertLesson, Question } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserProgress = {
  userId: number;
  userName: string;
  progress: number;
  completedLessons: number;
};

export default function AdminCourseDetailsPage() {
  const { id } = useParams();
  const courseId = parseInt(id as string);
  const { toast } = useToast();
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    queryFn: async () => apiRequest("GET", `/api/courses/${courseId}`),
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
  });

  const { data: enrolledUsers = [], isLoading: enrolledLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/courses", courseId, "enrollments"],
  });

  const { data: progressData = [], isLoading: progressLoading } = useQuery<UserProgress[]>({
    queryKey: ["/api/admin/courses", courseId, "progress"],
  });

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", courseId, "lessons"],
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: number) => apiRequest("DELETE", `/api/admin/lessons/${lessonId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "lessons"] });
      toast({ title: "Aula removida com sucesso!" });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("POST", `/api/admin/courses/${courseId}/enrollments`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "progress"] });
      toast({ title: "Usuário matriculado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao matricular usuário",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("DELETE", `/api/admin/courses/${courseId}/enrollments/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "progress"] });
      toast({ title: "Matrícula removida com sucesso!" });
    },
  });

  const enrolledUserIds = new Set(enrolledUsers.map(u => u.id));
  const usersToEnroll = allUsers.filter(u => !enrolledUserIds.has(u.id));

  if (courseLoading || usersLoading || enrolledLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Button variant="outline" asChild>
          <Link to="/admin/courses">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar para Cursos
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{course?.nome}</CardTitle>
          <CardDescription>{course?.descricao}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Student Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Alunos Matriculados</CardTitle>
                <CardDescription>{enrolledUsers.length} alunos</CardDescription>
              </div>
              <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Matricular
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Matricular Alunos</DialogTitle>
                    <DialogDescription>
                      Selecione os alunos para adicionar a este curso.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {usersToEnroll.map(user => (
                      <div key={user.id} className="flex justify-between items-center">
                        <span>{user.nome}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => enrollMutation.mutate(user.id)}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {usersToEnroll.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        Todos os usuários já estão matriculados.
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {enrolledUsers.map(user => (
                <div key={user.id} className="flex justify-between items-center">
                  <span>{user.nome}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => unenrollMutation.mutate(user.id)}
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {enrolledUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum aluno matriculado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso dos Alunos</CardTitle>
            <CardDescription>Acompanhe a conclusão das aulas</CardDescription>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <p>Carregando progresso...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Aulas Concluídas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progressData.map(item => (
                    <TableRow key={item.userId}>
                      <TableCell>{item.userName}</TableCell>
                      <TableCell>
                        <Progress value={item.progress} />
                      </TableCell>
                      <TableCell>{item.completedLessons}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lesson Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Aulas do Curso</CardTitle>
              <CardDescription>{lessons.length} aulas cadastradas</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setSelectedLesson(null); setIsLessonDialogOpen(true); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Aula
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {lessons.map(lesson => (
              <div key={lesson.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                <span>{lesson.ordem}. {lesson.titulo}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedLesson(lesson); setIsLessonDialogOpen(true); }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Tem certeza que deseja remover esta aula?")) {
                        deleteLessonMutation.mutate(lesson.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {lessons.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma aula cadastrada.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedLesson ? "Editar Aula" : "Adicionar Nova Aula"}</DialogTitle>
            <DialogDescription>
              Preencha as informações da aula e as perguntas do quiz.
            </DialogDescription>
          </DialogHeader>
          <LessonForm
            courseId={courseId}
            lesson={selectedLesson}
            onFinished={() => setIsLessonDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LessonForm({ courseId, lesson, onFinished }: { courseId: number, lesson: Lesson | null, onFinished: () => void }) {
  const { toast } = useToast();

  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ["/api/lessons", lesson?.id, "questions"],
    enabled: !!lesson,
  });

  const lessonForm = useForm<InsertLesson & { questions: Question[] }>({
    resolver: zodResolver(insertLessonSchema),
    defaultValues: {
      cursoId: courseId,
      titulo: lesson?.titulo || "",
      descricao: lesson?.descricao || "",
      videoUrl: lesson?.videoUrl || "",
      ordem: lesson?.ordem || 1,
    },
  });

  useEffect(() => {
    const defaultQuestions = Array(3).fill(null).map((_, i) => ({
      pergunta: "",
      opcaoA: "",
      opcaoB: "",
      opcaoC: "",
      respostaCorreta: "A",
      ordem: i + 1,
    }));

    const existingQuestions = questions.length === 3 ? questions : defaultQuestions;

    lessonForm.reset({
      cursoId: courseId,
      titulo: lesson?.titulo || "",
      descricao: lesson?.descricao || "",
      videoUrl: lesson?.videoUrl || "",
      ordem: lesson?.ordem || 1,
      questions: existingQuestions,
    });
  }, [lesson, courseId, lessonForm, questions]);

  const createLessonMutation = useMutation({
    mutationFn: (data: InsertLesson) => apiRequest("POST", "/api/admin/lessons", data),
    onSuccess: (newLesson) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "lessons"] });
      toast({ title: "Aula criada com sucesso!" });

      const questionsToSave = lessonForm.getValues("questions");
      if (questionsToSave.some(q => q.pergunta)) {
        saveQuestionsMutation.mutate({ lessonId: newLesson.id, questions: questionsToSave });
      } else {
        onFinished();
      }
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: (data: InsertLesson) => apiRequest("PATCH", `/api/admin/lessons/${lesson!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "lessons"] });
      toast({ title: "Aula atualizada com sucesso!" });

      const questionsToSave = lessonForm.getValues("questions");
      saveQuestionsMutation.mutate({ lessonId: lesson!.id, questions: questionsToSave });
    },
  });

  const saveQuestionsMutation = useMutation({
    mutationFn: (data: { lessonId: number; questions: Question[] }) =>
      apiRequest("POST", `/api/admin/lessons/${data.lessonId}/questions`, { questions: data.questions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", lesson?.id, "questions"] });
      toast({ title: "Perguntas salvas com sucesso!" });
      onFinished();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao salvar perguntas", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertLesson) => {
    if (lesson) {
      updateLessonMutation.mutate(data);
    } else {
      createLessonMutation.mutate(data);
    }
  };

  return (
    <form onSubmit={lessonForm.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título da Aula *</Label>
        <Input id="titulo" {...lessonForm.register("titulo")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição *</Label>
        <Textarea id="descricao" {...lessonForm.register("descricao")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="videoUrl">URL do Vídeo (YouTube) *</Label>
        <Input id="videoUrl" {...lessonForm.register("videoUrl")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ordem">Ordem *</Label>
        <Input id="ordem" type="number" {...lessonForm.register("ordem", { valueAsNumber: true })} />
      </div>

      {/* Quiz Questions */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold">Quiz da Aula</h3>
        {Array(3).fill(null).map((_, index) => (
          <div key={index} className="space-y-3 p-4 border rounded-md">
            <Label>Pergunta {index + 1}</Label>
            <Input {...lessonForm.register(`questions.${index}.pergunta`)} placeholder="Digite a pergunta" />
            <div className="grid grid-cols-2 gap-2">
              <Input {...lessonForm.register(`questions.${index}.opcaoA`)} placeholder="Opção A" />
              <Input {...lessonForm.register(`questions.${index}.opcaoB`)} placeholder="Opção B" />
              <Input {...lessonForm.register(`questions.${index}.opcaoC`)} placeholder="Opção C" />
              <Select
                defaultValue={lessonForm.watch(`questions.${index}.respostaCorreta`)}
                onValueChange={(value) => lessonForm.setValue(`questions.${index}.respostaCorreta`, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Resposta Correta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Opção A</SelectItem>
                  <SelectItem value="B">Opção B</SelectItem>
                  <SelectItem value="C">Opção C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onFinished}>
          Cancelar
        </Button>
        <Button type="submit">
          Salvar
        </Button>
      </div>
    </form>
  );
}
