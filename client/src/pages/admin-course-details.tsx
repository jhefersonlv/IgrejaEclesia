import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Course, User } from "@shared/schema";
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

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    // This assumes you have an endpoint to get a single course by ID
    // If not, you might need to fetch all and filter, or add the endpoint
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

  const enrollMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("POST", `/api/admin/courses/${courseId}/enrollments`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "progress"] });
      toast({ title: "Usuário matriculado com sucesso!" });
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
    </div>
  );
}
