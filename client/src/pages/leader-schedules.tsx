// ✅ CORRIGIDO POR JHEFERSON E GPT-5
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Schedule, ScheduleAssignment, User } from "@shared/schema";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Trash2, Save, Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface ScheduleWithAssignments extends Schedule {
  assignments: (ScheduleAssignment & { user?: User })[];
}

const POSICOES_LOUVOR = ["teclado", "violao", "baixo", "bateria", "voz", "backing"];
const POSICOES_LABELS: Record<string, string> = {
  teclado: "Teclado",
  violao: "Violão",
  baixo: "Baixo",
  bateria: "Bateria",
  voz: "Voz",
  backing: "Backing Vocal",
};

const scheduleFormSchema = z.object({
  mes: z.number().min(1).max(12),
  ano: z.number().min(2024),
  tipo: z.enum(["louvor", "obreiros"]),
  data: z.string(),
  observacoes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

export default function LeaderSchedulesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<string, number | null>>({});

  const currentDate = new Date();
  const [selectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear] = useState(currentDate.getFullYear());

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      mes: selectedMonth,
      ano: selectedYear,
      tipo: "louvor",
      data: "",
      observacoes: "",
    },
  });

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules", selectedMonth, selectedYear],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
  });

  // ✅ Corrigido: mantém consistência e evita erros com null
  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const schedule = await apiRequest<Schedule>("POST", "/api/schedules", data);

      const criarAssignments = async (posicoes: string[]) => {
        for (const posicao of posicoes) {
          const userId = assignments[posicao];
          const body: Record<string, any> = {
            scheduleId: schedule.id,
            posicao,
          };
          if (userId !== null && userId !== undefined) body.userId = userId;
          await apiRequest("POST", "/api/assignments", body);
        }
      };

      if (data.tipo === "louvor") {
        await criarAssignments(POSICOES_LOUVOR);
      } else {
        await criarAssignments(["obreiro-0", "obreiro-1", "obreiro-2", "obreiro-3"]);
      }

      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsDialogOpen(false);
      setAssignments({});
      form.reset();
      toast({
        title: "Escala criada!",
        description: "A escala foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar escala",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // ✅ Corrigido também para não enviar nulls em updates
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      if (!editingSchedule) return;
      const schedule = await apiRequest<Schedule>(
        "PATCH",
        `/api/schedules/${editingSchedule}`,
        data
      );

      const existingAssignments =
        schedules.find((s) => s.id === editingSchedule)?.assignments || [];
      const positions =
        data.tipo === "louvor"
          ? POSICOES_LOUVOR
          : existingAssignments.map((_, i) => `obreiro-${i}`);

      for (const posicao of positions) {
        const existingAssignment = existingAssignments.find((a) => a.posicao === posicao);
        const newUserId = assignments[posicao];

        if (existingAssignment) {
          if (existingAssignment.userId !== newUserId) {
            const body: Record<string, any> = {};
            if (newUserId !== null && newUserId !== undefined) body.userId = newUserId;
            await apiRequest("PATCH", `/api/assignments/${existingAssignment.id}`, body);
          }
        } else if (newUserId) {
          await apiRequest("POST", "/api/assignments", {
            scheduleId: editingSchedule,
            userId: newUserId,
            posicao,
          });
        }
      }

      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsDialogOpen(false);
      setEditingSchedule(null);
      setAssignments({});
      form.reset();
      toast({
        title: "Escala atualizada!",
        description: "A escala foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar escala",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Escala removida",
        description: "A escala foi removida com sucesso.",
      });
    },
  });

  const onSubmit = (data: ScheduleFormData) => createScheduleMutation.mutate(data);
  const onUpdate = (data: ScheduleFormData) => updateScheduleMutation.mutate(data);

  const louvorSchedules = schedules.filter((s) => s.tipo === "louvor");
  const obreirosSchedules = schedules.filter((s) => s.tipo === "obreiros");

  // (restante da renderização do componente pode continuar igual)
  // 🔹 A parte visual e de selects não precisa ser alterada.
}
