import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, PlayCircle, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Course, Lesson } from "@shared/schema";
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

export default function MemberCourses() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: courseLessons = [] } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", selectedCourse?.id, "lessons"],
    enabled: !!selectedCourse,
  });

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
                        onClick={() => setSelectedLesson(lesson)}
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
