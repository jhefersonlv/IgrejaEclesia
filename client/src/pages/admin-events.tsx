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
import { Calendar, Plus, Trash2, MapPin } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Event, InsertEvent } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminEvents() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
  });

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      data: "",
      local: "",
      imagem: "",
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      return await apiRequest<Event>("POST", "/api/admin/events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/public"] });
      toast({
        title: "Evento criado com sucesso!",
        description: "O novo evento foi adicionado ao calendário.",
      });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar evento",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/events/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/public"] });
      toast({
        title: "Evento removido",
        description: "O evento foi removido do calendário.",
      });
    },
  });

  const onSubmit = (data: InsertEvent) => {
    createEventMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-events-title">
            Gerenciar Eventos
          </h1>
          <p className="text-lg text-muted-foreground">
            {events.length} eventos cadastrados
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-event">
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Evento</DialogTitle>
              <DialogDescription>
                Preencha as informações do evento
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título do Evento *</Label>
                <Input id="titulo" {...form.register("titulo")} data-testid="input-event-title" />
                {form.formState.errors.titulo && (
                  <p className="text-sm text-destructive">{form.formState.errors.titulo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  rows={4}
                  {...form.register("descricao")}
                  data-testid="textarea-event-description"
                />
                {form.formState.errors.descricao && (
                  <p className="text-sm text-destructive">{form.formState.errors.descricao.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">Data do Evento *</Label>
                  <Input id="data" type="date" {...form.register("data")} data-testid="input-event-date" />
                  {form.formState.errors.data && (
                    <p className="text-sm text-destructive">{form.formState.errors.data.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local">Local *</Label>
                  <Input id="local" {...form.register("local")} data-testid="input-event-location" />
                  {form.formState.errors.local && (
                    <p className="text-sm text-destructive">{form.formState.errors.local.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagem">URL da Imagem</Label>
                <Input
                  id="imagem"
                  placeholder="https://example.com/image.jpg"
                  {...form.register("imagem")}
                  data-testid="input-event-image"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createEventMutation.isPending} data-testid="button-submit-event">
                  {createEventMutation.isPending ? "Criando..." : "Criar Evento"}
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
      ) : events.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden hover-elevate" data-testid={`card-event-${event.id}`}>
              {event.imagem ? (
                <div className="h-48 overflow-hidden">
                  <img
                    src={event.imagem}
                    alt={event.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-primary/20 to-gold/20 flex items-center justify-center">
                  <Calendar className="w-16 h-16 text-primary/50" />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{event.titulo}</CardTitle>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(event.data).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{event.local}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-foreground/70 line-clamp-2">{event.descricao}</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (confirm(`Tem certeza que deseja remover ${event.titulo}?`)) {
                      deleteEventMutation.mutate(event.id);
                    }
                  }}
                  data-testid={`button-delete-event-${event.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-16">
          <div className="text-center">
            <Calendar className="w-20 h-20 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum evento cadastrado</h3>
            <p className="text-muted-foreground mb-6">
              Comece criando seu primeiro evento
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Evento
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
