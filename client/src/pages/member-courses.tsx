import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap, PlayCircle, ChevronRight, CheckCircle, XCircle, Trophy } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Course, Lesson, Question } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MemberCourses() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [answers, setAnswers] = useState<(string | null)[]>([null, null, null]);
  const [showResult, setShowResult] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; completed: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: courseLessons = [] } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", selectedCourse?.id, "lessons"],
    enabled: !!selectedCourse,
  });

  const { data: lessonQuestions = [] } = useQuery<Question[]>({
    queryKey: ["/api/lessons", selectedLesson?.id, "questions"],
    enabled: !!selectedLesson,
  });

  const { data: lessonCompletion } = useQuery<{ completed: boolean; score: number }>({
    queryKey: ["/api/lessons", selectedLesson?.id, "completion"],
    enabled: !!selectedLesson,
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (data: { lessonId: number; respostas: string[] }) => {
      return await apiRequest<{ score: number; completed: boolean; message: string }>(
        "POST",
        `/api/lessons/${data.lessonId}/complete`,
        { respostas: data.respostas }
      );
    },
    onSuccess: (data) => {
      setQuizResult(data);
      setShowResult(true);
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", selectedLesson?.id, "completion"] });
      
      if (data.completed) {
        toast({
          title: "Parabéns!",
          description: data.message,
        });
      } else {
        toast({
          title: "Tente novamente",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar respostas",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitQuiz = () => {
    if (!selectedLesson) return;

    // Validate all answers are filled
    if (answers.some(a => a === null)) {
      toast({
        title: "Complete todas as perguntas",
        description: "Responda todas as 3 perguntas antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    submitQuizMutation.mutate({
      lessonId: selectedLesson.id,
      respostas: answers as string[],
    });
  };

  const resetQuizState = () => {
    setAnswers([null, null, null]);
    setShowResult(false);
    setQuizResult(null);
  };

  const handleLessonChange = (lesson: Lesson) => {
    resetQuizState();
    setSelectedLesson(lesson);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-courses-title">
          Cursos
        </h1>
        <p className="text-lg text-muted-foreground">
          Explore os cursos disponíveis e continue seu aprendizado
        </p>
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
            <Card
              key={course.id}
              className="overflow-hidden hover-elevate cursor-pointer"
              onClick={() => setSelectedCourse(course)}
              data-testid={`card-course-${course.id}`}
            >
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
              <CardContent>
                <p className="text-foreground/70 line-clamp-3 mb-4">{course.descricao}</p>
                <Button className="w-full" data-testid={`button-view-course-${course.id}`}>
                  Ver Aulas
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-16">
          <div className="text-center">
            <GraduationCap className="w-20 h-20 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum curso disponível</h3>
            <p className="text-muted-foreground">
              Novos cursos serão adicionados em breve
            </p>
          </div>
        </Card>
      )}

      {/* Course Details Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedCourse?.nome}</DialogTitle>
            <DialogDescription className="text-base">
              {selectedCourse?.descricao}
            </DialogDescription>
          </DialogHeader>

          {selectedLesson ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => setSelectedLesson(null)}
                data-testid="button-back-to-lessons"
              >
                ← Voltar para aulas
              </Button>
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={getYouTubeEmbedUrl(selectedLesson.videoUrl)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  data-testid="video-player"
                />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{selectedLesson.titulo}</h3>
                <p className="text-foreground/70">{selectedLesson.descricao}</p>
              </div>

              {/* Quiz Section */}
              {lessonCompletion?.completed ? (
                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" data-testid="quiz-completed">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900">
                        <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                          Lição Concluída!
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Você acertou {lessonCompletion.score}/3 perguntas e completou esta lição.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : lessonQuestions.length === 3 ? (
                <Card data-testid="quiz-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      Quiz de Validação
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Responda as 3 perguntas para completar esta lição
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {lessonQuestions.map((question, index) => (
                      <div key={question.id} className="space-y-3" data-testid={`quiz-question-${index + 1}`}>
                        <Label className="text-base font-medium">
                          {index + 1}. {question.pergunta}
                        </Label>
                        <RadioGroup
                          value={answers[index] || ""}
                          onValueChange={(value) => {
                            const newAnswers = [...answers];
                            newAnswers[index] = value;
                            setAnswers(newAnswers);
                          }}
                          disabled={showResult}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="A" id={`q${index}-A`} data-testid={`radio-q${index + 1}-a`} />
                            <Label htmlFor={`q${index}-A`} className="cursor-pointer font-normal">
                              A) {question.opcaoA}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="B" id={`q${index}-B`} data-testid={`radio-q${index + 1}-b`} />
                            <Label htmlFor={`q${index}-B`} className="cursor-pointer font-normal">
                              B) {question.opcaoB}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="C" id={`q${index}-C`} data-testid={`radio-q${index + 1}-c`} />
                            <Label htmlFor={`q${index}-C`} className="cursor-pointer font-normal">
                              C) {question.opcaoC}
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    ))}

                    {showResult && quizResult && (
                      <Card className={quizResult.completed ? "bg-green-50 dark:bg-green-950" : "bg-amber-50 dark:bg-amber-950"} data-testid="quiz-result">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            {quizResult.completed ? (
                              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
                            ) : (
                              <XCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-1" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">{quizResult.message}</h4>
                              <p className="text-sm text-muted-foreground">
                                Você acertou {quizResult.score} de 3 perguntas.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                      {showResult && !quizResult?.completed && (
                        <Button
                          variant="outline"
                          onClick={resetQuizState}
                          data-testid="button-try-again"
                        >
                          Tentar Novamente
                        </Button>
                      )}
                      {!showResult && (
                        <Button
                          onClick={handleSubmitQuiz}
                          disabled={submitQuizMutation.isPending}
                          data-testid="button-submit-quiz"
                        >
                          {submitQuizMutation.isPending ? "Enviando..." : "Enviar Respostas"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" data-testid="quiz-not-configured">
                  <CardContent className="pt-6">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      O quiz desta lição ainda não foi configurado pelo administrador.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Aulas do Curso</h3>
              {courseLessons.length > 0 ? (
                <div className="space-y-2">
                  {courseLessons
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((lesson, index) => (
                      <Card
                        key={lesson.id}
                        className="hover-elevate cursor-pointer"
                        onClick={() => handleLessonChange(lesson)}
                        data-testid={`card-lesson-${lesson.id}`}
                      >
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{lesson.titulo}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {lesson.descricao}
                            </p>
                          </div>
                          <PlayCircle className="w-6 h-6 text-primary" />
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
