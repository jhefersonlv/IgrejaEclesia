import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Course, User, Lesson, Question, InsertQuestion } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

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
  // --- ESTADOS ---
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedCourse, setEditedCourse] = useState<Course | null>(null);
  // Estado para a lição selecionada para edição
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLessonEditOpen, setIsLessonEditOpen] = useState(false);
  // Estado para edição de quiz/perguntas
  const [isQuizEditOpen, setIsQuizEditOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  // Estados para controlador do Dialog de nova aula
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  const lessonFormSchema = z.object({
    titulo: z.string().min(2, "Título obrigatório"),
    descricao: z.string().min(2, "Descrição obrigatória"),
    videoUrl: z.string().url("URL do vídeo inválida"),
  });

  const lessonForm = useForm<z.infer<typeof lessonFormSchema>>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      videoUrl: '',
    },
  });

  const questionFormSchema = z.object({
    pergunta: z.string().min(10, "Pergunta deve ter no mínimo 10 caracteres"),
    opcaoA: z.string().min(1, "Opção A é obrigatória"),
    opcaoB: z.string().min(1, "Opção B é obrigatória"),
    opcaoC: z.string().min(1, "Opção C é obrigatória"),
    respostaCorreta: z.enum(["A", "B", "C"], { message: "Resposta correta deve ser A, B ou C" }),
  });

  type QuestionFormData = z.infer<typeof questionFormSchema>;

  const questionForm = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: { pergunta: "", opcaoA: "", opcaoB: "", opcaoC: "", respostaCorreta: "A" },
  });

  // Estados para o array de 3 perguntas editáveis
  const [quizDraft, setQuizDraft] = useState<QuestionFormData[]>([{}, {}, {}] as QuestionFormData[]);

  // --- QUERIES ---
  const { data: lessonQuestions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["/api/lessons", selectedLesson?.id, "questions"],
    enabled: !!selectedLesson && isQuizEditOpen,
  });
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
    enabled: !!courseId,
  });
  // --- VARIÁVEIS DERIVADAS ---
  const enrolledUserIds = new Set(enrolledUsers.map(u => u.id));
  const usersToEnroll = allUsers.filter(u => !enrolledUserIds.has(u.id));

  // Sincronizar com caso de edição/abertura
  useEffect(() => {
    if (lessonQuestions && lessonQuestions.length > 0) {
      setQuizDraft(lessonQuestions.slice(0, 3).map(q => ({
        pergunta: q.pergunta,
        opcaoA: q.opcaoA,
        opcaoB: q.opcaoB,
        opcaoC: q.opcaoC,
        respostaCorreta: q.respostaCorreta as "A" | "B" | "C"
      })));
    } else {
      setQuizDraft([
        { pergunta: "", opcaoA: "", opcaoB: "", opcaoC: "", respostaCorreta: "A" },
        { pergunta: "", opcaoA: "", opcaoB: "", opcaoC: "", respostaCorreta: "A" },
        { pergunta: "", opcaoA: "", opcaoB: "", opcaoC: "", respostaCorreta: "A" }
      ]);
    }
  }, [lessonQuestions, isQuizEditOpen]);

  function handleQuizDraftChange(index: number, field: keyof QuestionFormData, value: string) {
    setQuizDraft(old => {
      const novo = [...old];
      novo[index] = { ...novo[index], [field]: value };
      return novo;
    });
  }

  function isQuizDraftValid() {
    return quizDraft.every(q =>
      q.pergunta && q.opcaoA && q.opcaoB && q.opcaoC && q.respostaCorreta
    );
  }

  function handleSaveQuiz() {
    if (!selectedLesson) return;
    if (!isQuizDraftValid()) {
      toast({ title: "Preencha as 3 perguntas completas." });
      return;
    }
    saveQuestionsMutation.mutate(quizDraft as any);
  }

  // Sincronizar dados ao abrir
  useEffect(() => {
    if (selectedLesson) {
      lessonForm.reset({
        titulo: selectedLesson.titulo,
        descricao: selectedLesson.descricao,
        videoUrl: selectedLesson.videoUrl,
      });
    }
  }, [selectedLesson, lessonForm]);

  const updateLessonMutation = useMutation({
    mutationFn: async (data: { id: number; titulo: string; descricao: string; videoUrl: string }) => {
      return await apiRequest<Lesson>(
        'PATCH',
        `/api/lessons/${data.id}`,
        { titulo: data.titulo, descricao: data.descricao, videoUrl: data.videoUrl }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "lessons"] });
      setIsLessonEditOpen(false);
      setSelectedLesson(null);
      toast({ title: "Aula atualizada com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao atualizar aula", description: err.message || "Tente novamente.", variant: "destructive" });
    }
  });

  const handleLessonEdit = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsLessonEditOpen(true);
  };

  const onSubmitLessonEdit = (data: any) => {
    if (selectedLesson)
      updateLessonMutation.mutate({ ...data, id: selectedLesson.id });
  };

  // Refatorar as mutações abaixo:

  function saveAllQuestions(lessonId: number, questions: Omit<Question, "id" | "createdAt">[] & { id?: number, createdAt?: Date }[]) {
    // Remove campos extras e ajusta ordem
    const ajuste = questions.map((q, idx) => ({
      lessonId,
      ordem: idx + 1,
      pergunta: q.pergunta,
      opcaoA: q.opcaoA,
      opcaoB: q.opcaoB,
      opcaoC: q.opcaoC,
      respostaCorreta: q.respostaCorreta as "A" | "B" | "C"
    }));
    return apiRequest<Question[]>(
      "POST",
      `/api/admin/lessons/${lessonId}/questions`,
      { questions: ajuste }
    );
  }

  const saveQuestionsMutation = useMutation({
    mutationFn: async (questions: Omit<Question, "id" | "createdAt">[]) => {
      // selectedLesson não deve ser nulo neste contexto
      if (!selectedLesson) throw new Error("Aula não encontrada");
      return await saveAllQuestions(selectedLesson.id, questions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", selectedLesson?.id, "questions"] });
      toast({ title: "Quiz salvo!" });
      setSelectedQuestion(null);
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar quiz", description: err.message || "Tente novamente.", variant: "destructive" });
    }
  });

  // Adicionar/Editar pergunta
  const onSubmitQuestion = (data: QuestionFormData) => {
    if (!selectedLesson) return;
    let updated: any = lessonQuestions ? [...lessonQuestions] : [];

    if (selectedQuestion) {
      // edita
      updated = updated.map((q: Question) =>
        q.id === selectedQuestion.id ? { ...q, ...data } : q
      );
    } else {
      updated.push({ ...data });
    }
      // Garante que só envie 3
    updated = updated.slice(0,3);
    saveQuestionsMutation.mutate(updated);
  };

  // Excluir pergunta
  const handleDeleteQuestion = (id: number) => {
    const updated = (lessonQuestions || []).filter(q => q.id !== id);
    saveQuestionsMutation.mutate(updated);
  };

  const handleOpenQuizEditor = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsQuizEditOpen(true);
    setSelectedQuestion(null);
  };

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

  const createLessonMutation = useMutation({
    mutationFn: async (data: { titulo: string; descricao: string; videoUrl: string }) => {
      return await apiRequest<Lesson>('POST', `/api/admin/lessons`, { cursoId: courseId, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "lessons"] });
      setIsCreateLessonOpen(false);
      toast({ title: 'Aula criada com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao criar aula", description: err.message || "Tente novamente.", variant: "destructive" });
    }
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/lessons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "lessons"] });
      toast({ title: 'Aula removida.' });
    }
  });

  // Caso esteja faltando handleSave para o botão de edição de curso:
  function handleSave() {
    setEditMode(false);
    toast({ title: "Curso atualizado (simulação)!" });
  }

  // --- EFEITOS ---
  useEffect(() => {
    if (course) setEditedCourse(course);
  }, [course]);

  useEffect(() => {
    if (selectedQuestion) {
      questionForm.reset({
        pergunta: selectedQuestion.pergunta,
        opcaoA: selectedQuestion.opcaoA,
        opcaoB: selectedQuestion.opcaoB,
        opcaoC: selectedQuestion.opcaoC,
        respostaCorreta: selectedQuestion.respostaCorreta as "A" | "B" | "C",
      });
    } else {
      questionForm.reset({ pergunta: "", opcaoA: "", opcaoB: "", opcaoC: "", respostaCorreta: "A" });
    }
  }, [selectedQuestion, questionForm]);

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
          {editMode ? (
            <div className="space-y-3">
              <Input
                value={editedCourse?.nome || ""}
                onChange={e => setEditedCourse(c => ({...c!, nome: e.target.value}))}
                placeholder="Nome"
              />
              <Textarea
                value={editedCourse?.descricao || ""}
                onChange={e => setEditedCourse(c => ({...c!, descricao: e.target.value}))}
                placeholder="Descrição"
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditMode(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar</Button>
              </div>
            </div>
          ) : (
            <>
              <CardTitle className="text-3xl flex items-center justify-between">
                <span>{course?.nome}</span>
                <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}>Editar</Button>
              </CardTitle>
              <CardDescription>{course?.descricao}</CardDescription>
            </>
          )}
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

      <div className="space-y-10">
        {/* Botão Nova Aula e Lista de Aulas */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-semibold">Aulas do Curso</h2>
          <Button onClick={() => setIsCreateLessonOpen(true)}>Nova Aula</Button>
        </div>
        {lessonsLoading ? (
          <p>Carregando aulas...</p>
        ) : lessons.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma aula cadastrada.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {lessons.sort((a, b) => a.ordem - b.ordem).map((lesson) => (
              <Card key={lesson.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{lesson.titulo}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleLessonEdit(lesson)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenQuizEditor(lesson)}>Editar Quiz</Button>
                      <Button variant="destructive" size="sm" onClick={() => setLessonToDelete(lesson)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{lesson.descricao}</CardDescription>
                </CardHeader>
                <CardContent>
                  {lesson.videoUrl && (
                    <div className="aspect-video rounded overflow-hidden bg-black">
                      <iframe
                        src={getYouTubeEmbedUrl(lesson.videoUrl)}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Dialog de edição de lição */}
      <Dialog open={isLessonEditOpen} onOpenChange={setIsLessonEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aula</DialogTitle>
            <DialogDescription>Preencha os campos abaixo para alterar os dados da aula.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={lessonForm.handleSubmit(onSubmitLessonEdit)}
            autoComplete="off"
          >
            <Input {...lessonForm.register('titulo')} placeholder="Título" />
            {lessonForm.formState.errors.titulo && (
              <p className="text-sm text-destructive">{lessonForm.formState.errors.titulo.message}</p>
            )}
            <Textarea {...lessonForm.register('descricao')} placeholder="Descrição" />
            {lessonForm.formState.errors.descricao && (
              <p className="text-sm text-destructive">{lessonForm.formState.errors.descricao.message}</p>
            )}
            <Input {...lessonForm.register('videoUrl')} placeholder="URL do vídeo (YouTube)" />
            {lessonForm.formState.errors.videoUrl && (
              <p className="text-sm text-destructive">{lessonForm.formState.errors.videoUrl.message}</p>
            )}
            <div className="flex gap-2 justify-end pt-3">
              <Button type="button" variant="secondary" onClick={() => setIsLessonEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateLessonMutation.status === 'pending'}>Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Dialog de edição do Quiz (Perguntas) */}
      <Dialog open={isQuizEditOpen} onOpenChange={setIsQuizEditOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Quiz da Aula{selectedLesson ? `: ${selectedLesson.titulo}` : ''}</DialogTitle>
            <DialogDescription>Adicione, edite ou exclua perguntas para o quiz desta aula.</DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Perguntas</h3>
              {questionsLoading ? (
                <p>Carregando perguntas...</p>
              ) : (lessonQuestions?.length || 0) === 0 ? (
                <p className="text-muted-foreground">Nenhuma pergunta cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {lessonQuestions!.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map(q => (
                    <Card key={q.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{q.pergunta}</CardTitle>
                            <CardDescription>
                              A) {q.opcaoA} • B) {q.opcaoB} • C) {q.opcaoC} — Resp: {q.respostaCorreta}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedQuestion(q)}>Editar</Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteQuestion(q.id)}>Excluir</Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Quiz desta aula (preencha as 3 perguntas)</h3>
              {[0,1,2].map((idx) => (
                <Card key={idx} className="mb-5">
                  <CardHeader>
                    <CardTitle>Pergunta {idx + 1}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label>Pergunta</Label>
                        <Textarea rows={2} value={quizDraft[idx]?.pergunta} onChange={e => handleQuizDraftChange(idx, 'pergunta', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Opção A</Label>
                          <Input value={quizDraft[idx]?.opcaoA} onChange={e => handleQuizDraftChange(idx, 'opcaoA', e.target.value)} />
                        </div>
                        <div>
                          <Label>Opção B</Label>
                          <Input value={quizDraft[idx]?.opcaoB} onChange={e => handleQuizDraftChange(idx, 'opcaoB', e.target.value)} />
                        </div>
                        <div>
                          <Label>Opção C</Label>
                          <Input value={quizDraft[idx]?.opcaoC} onChange={e => handleQuizDraftChange(idx, 'opcaoC', e.target.value)} />
                        </div>
                      </div>
                      <div className="max-w-xs">
                        <Label>Resposta Correta</Label>
                        <Select value={quizDraft[idx]?.respostaCorreta} onValueChange={v => handleQuizDraftChange(idx, 'respostaCorreta', v as "A" | "B" | "C")}> 
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end gap-2 mt-2">
                <Button variant="secondary" type="button" onClick={()=>setIsQuizEditOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleSaveQuiz} disabled={saveQuestionsMutation.status==='pending'}>Salvar Quiz</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog: Criar Nova Aula */}
      <Dialog open={isCreateLessonOpen} onOpenChange={setIsCreateLessonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Aula</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={lessonForm.handleSubmit((data) => createLessonMutation.mutate(data))}
            autoComplete="off"
          >
            <Input {...lessonForm.register('titulo')} placeholder="Título" />
            {lessonForm.formState.errors.titulo && (
              <p className="text-sm text-destructive">{lessonForm.formState.errors.titulo.message}</p>
            )}
            <Textarea {...lessonForm.register('descricao')} placeholder="Descrição" />
            {lessonForm.formState.errors.descricao && (
              <p className="text-sm text-destructive">{lessonForm.formState.errors.descricao.message}</p>
            )}
            <Input {...lessonForm.register('videoUrl')} placeholder="URL do vídeo (YouTube)" />
            {lessonForm.formState.errors.videoUrl && (
              <p className="text-sm text-destructive">{lessonForm.formState.errors.videoUrl.message}</p>
            )}
            <div className="flex gap-2 justify-end pt-3">
              <Button type="button" variant="secondary" onClick={() => setIsCreateLessonOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createLessonMutation.status === 'pending'}>Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para deleção da aula */}
      <Dialog open={!!lessonToDelete} onOpenChange={() => setLessonToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Aula</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a aula <b>{lessonToDelete?.titulo}</b>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLessonToDelete(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteLessonMutation.status==='pending'}
              onClick={() => {
                if (lessonToDelete) deleteLessonMutation.mutate(lessonToDelete.id);
                setLessonToDelete(null);
              }}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Função utilitária YouTube (antes do return, igual em outras páginas)
function getYouTubeEmbedUrl(url: string) {
  const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}