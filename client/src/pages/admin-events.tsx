import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Trash2, MapPin, Pencil, Globe, Lock, Building2, Upload } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Event } from "@shared/schema";
import { LOCAIS_LABELS } from "@shared/schema";
import { useForm, Controller } from "react-hook-form";
import { apiRequest, apiUpload, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Ministerio { id: number; nome: string }

interface EventFormData {
  titulo: string;
  descricao: string;
  data: string;
  local: "eclesia" | "missoes-vidas" | "externo";
  ministerioId: number | null;
  isPublico: boolean;
}

export default function AdminEvents() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: events = [], isLoading } = useQuery<Event[]>({ queryKey: ["/api/admin/events"] });
  const { data: ministerios = [] } = useQuery<Ministerio[]>({ queryKey: ["/api/ministerios"] });

  const defaultValues: EventFormData = {
    titulo: "", descricao: "", data: "", local: "eclesia", ministerioId: null, isPublico: true,
  };

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<EventFormData>({ defaultValues });
  const isPublico = watch("isPublico");
  const ministerioId = watch("ministerioId");

  const openCreate = () => {
    reset(defaultValues);
    setImageFile(null);
    setImagePreview(null);
    setEditingEvent(null);
    setIsCreateOpen(true);
  };

  const openEdit = (ev: Event) => {
    reset({
      titulo: ev.titulo,
      descricao: ev.descricao,
      data: ev.data,
      local: ev.local as any,
      ministerioId: ev.ministerioId ?? null,
      isPublico: ev.isPublico,
    });
    setImagePreview(ev.imagem ?? null);
    setImageFile(null);
    setEditingEvent(ev);
    setIsCreateOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      let imagemUrl: string | null = editingEvent?.imagem ?? null;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const result = await apiUpload<{ url: string }>("/api/upload", formData);
        imagemUrl = result.url;
      }
      const payload = { ...data, imagem: imagemUrl ?? undefined, ministerioId: data.ministerioId ?? undefined };
      if (editingEvent) {
        return apiRequest("PATCH", `/api/admin/events/${editingEvent.id}`, payload);
      }
      return apiRequest("POST", "/api/admin/events", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agenda"] });
      toast({ title: editingEvent ? "Evento atualizado!" : "Evento criado!" });
      setIsCreateOpen(false);
      reset(defaultValues);
      setImageFile(null);
      setImagePreview(null);
      setEditingEvent(null);
    },
    onError: (error: any) => toast({ title: "Erro ao salvar evento", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agenda"] });
      toast({ title: "Evento removido" });
    },
    onError: (error: any) => toast({ title: "Erro ao remover", description: error.message, variant: "destructive" }),
  });

  const EventForm = () => (
    <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
      <div className="space-y-2">
        <Label>Título *</Label>
        <Input {...register("titulo", { required: "Obrigatório" })} />
        {errors.titulo && <p className="text-sm text-destructive">{errors.titulo.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Descrição *</Label>
        <Textarea rows={3} {...register("descricao", { required: "Obrigatório" })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data *</Label>
          <Input type="date" {...register("data", { required: "Obrigatório" })} />
        </div>
        <div className="space-y-2">
          <Label>Local *</Label>
          <Controller
            name="local"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eclesia">Eclesia</SelectItem>
                  <SelectItem value="missoes-vidas">Missões e Vidas</SelectItem>
                  <SelectItem value="externo">Evento Externo</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Imagem */}
      <div className="space-y-2">
        <Label>Imagem do Evento</Label>
        {imagePreview && (
          <div className="relative w-full h-32 rounded-lg overflow-hidden border">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button type="button" onClick={() => { setImagePreview(null); setImageFile(null); }} className="absolute top-2 right-2 bg-black/50 text-white rounded p-1 text-xs">✕</button>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-3 hover:bg-muted/50 transition">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{imageFile ? imageFile.name : "Clique para selecionar uma imagem"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>
      </div>

      {/* Ministério */}
      <div className="space-y-2">
        <Label>Ministério (opcional)</Label>
        <Controller
          name="ministerioId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value?.toString() ?? "none"}
              onValueChange={v => field.onChange(v === "none" ? null : parseInt(v))}
            >
              <SelectTrigger><SelectValue placeholder="Nenhum (evento geral)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (evento geral)</SelectItem>
                {ministerios.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">Se vinculado a um ministério, use a opção abaixo para definir a visibilidade.</p>
      </div>

      {/* Visibilidade */}
      <div className="flex items-start gap-3 p-3 border rounded-lg">
        <Controller
          name="isPublico"
          control={control}
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${field.value ? "bg-primary" : "bg-input"}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${field.value ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          )}
        />
        <div>
          <div className="flex items-center gap-2">
            {isPublico ? <Globe className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-orange-500" />}
            <span className="font-medium text-sm">{isPublico ? "Evento público" : "Evento restrito"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPublico
              ? "Visível para todos os membros na agenda"
              : ministerioId
                ? "Visível apenas para o ministério vinculado, admins e líderes"
                : "Marque como restrito somente se tiver um ministério vinculado"}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Salvando..." : editingEvent ? "Salvar Alterações" : "Criar Evento"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2">Gerenciar Eventos</h1>
          <p className="text-lg text-muted-foreground">{events.length} eventos cadastrados</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Evento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Editar Evento" : "Criar Novo Evento"}</DialogTitle>
              <DialogDescription>Preencha as informações do evento</DialogDescription>
            </DialogHeader>
            <EventForm />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Card key={i} className="overflow-hidden"><div className="h-48 bg-muted animate-pulse" /></Card>)}
        </div>
      ) : events.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <Card key={event.id} className="overflow-hidden">
              {event.imagem ? (
                <div className="h-48 overflow-hidden">
                  <img src={event.imagem} alt={event.titulo} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-primary/20 to-blue-200 flex items-center justify-center">
                  <Calendar className="w-16 h-16 text-primary/40" />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-start justify-between gap-2">
                  <span>{event.titulo}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {event.isPublico
                      ? <Globe className="w-4 h-4 text-green-600" title="Público" />
                      : <Lock className="w-4 h-4 text-orange-500" title="Restrito" />}
                  </div>
                </CardTitle>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(event.data + "T12:00:00"), "dd 'de' MMMM yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{LOCAIS_LABELS[event.local] ?? event.local}</span>
                  </div>
                  {event.ministerioId && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>{ministerios.find(m => m.id === event.ministerioId)?.nome}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{event.descricao}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(event)}>
                    <Pencil className="w-3 h-3 mr-1" />Editar
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1"
                    onClick={() => confirm(`Remover "${event.titulo}"?`) && deleteMutation.mutate(event.id)}>
                    <Trash2 className="w-3 h-3 mr-1" />Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-20 h-20 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum evento cadastrado</h3>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Criar Primeiro Evento</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
