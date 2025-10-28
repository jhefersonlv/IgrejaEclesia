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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Plus, Trash2, Video, FileText } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Material, InsertMaterial } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMaterialSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminMaterials() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [materialType, setMaterialType] = useState<"pdf" | "video">("pdf");
  const { toast } = useToast();

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const form = useForm<InsertMaterial>({
    resolver: zodResolver(insertMaterialSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      arquivoUrl: "",
      tipo: "pdf",
    },
  });

  const createMaterialMutation = useMutation({
    mutationFn: async (data: InsertMaterial) => {
      return await apiRequest<Material>("POST", "/api/admin/materials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Material criado com sucesso!",
        description: "O novo material foi adicionado ao sistema.",
      });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar material",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/materials/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Material removido",
        description: "O material foi removido do sistema.",
      });
    },
  });

  const onSubmit = (data: InsertMaterial) => {
    createMaterialMutation.mutate({
      ...data,
      tipo: materialType,
    });
  };

  const pdfs = materials.filter(m => m.tipo === "pdf");
  const videos = materials.filter(m => m.tipo === "video");

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-materials-title">
            Gerenciar Materiais
          </h1>
          <p className="text-lg text-muted-foreground">
            {materials.length} materiais cadastrados
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-material">
              <Plus className="w-4 h-4 mr-2" />
              Novo Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Material</DialogTitle>
              <DialogDescription>
                Preencha as informações do material
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Material *</Label>
                <Select value={materialType} onValueChange={(v) => setMaterialType(v as "pdf" | "video")}>
                  <SelectTrigger id="tipo" data-testid="select-material-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF / Apostila</SelectItem>
                    <SelectItem value="video">Vídeo do YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input id="titulo" {...form.register("titulo")} data-testid="input-material-title" />
                {form.formState.errors.titulo && (
                  <p className="text-sm text-destructive">{form.formState.errors.titulo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  rows={3}
                  {...form.register("descricao")}
                  data-testid="textarea-material-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arquivoUrl">
                  {materialType === "pdf" ? "URL do PDF *" : "URL do Vídeo do YouTube *"}
                </Label>
                <Input
                  id="arquivoUrl"
                  placeholder={materialType === "pdf" ? "https://example.com/file.pdf" : "https://www.youtube.com/watch?v=..."}
                  {...form.register("arquivoUrl")}
                  data-testid="input-material-url"
                />
                {form.formState.errors.arquivoUrl && (
                  <p className="text-sm text-destructive">{form.formState.errors.arquivoUrl.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMaterialMutation.isPending} data-testid="button-submit-material">
                  {createMaterialMutation.isPending ? "Criando..." : "Criar Material"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pdf" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pdf" data-testid="tab-pdfs">
            <FileText className="w-4 h-4 mr-2" />
            PDFs ({pdfs.length})
          </TabsTrigger>
          <TabsTrigger value="video" data-testid="tab-videos">
            <Video className="w-4 h-4 mr-2" />
            Vídeos ({videos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="mt-6">
          {pdfs.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {pdfs.map((material) => (
                <Card key={material.id} className="hover-elevate" data-testid={`card-pdf-${material.id}`}>
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{material.titulo}</CardTitle>
                      {material.descricao && (
                        <p className="text-sm text-muted-foreground">{material.descricao}</p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja remover ${material.titulo}?`)) {
                          deleteMaterialMutation.mutate(material.id);
                        }
                      }}
                      data-testid={`button-delete-pdf-${material.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg text-muted-foreground">Nenhum PDF cadastrado</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="video" className="mt-6">
          {videos.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((material) => (
                <Card key={material.id} className="overflow-hidden hover-elevate" data-testid={`card-video-${material.id}`}>
                  <div className="h-40 bg-gradient-to-br from-primary/20 to-gold/20 flex items-center justify-center">
                    <Video className="w-12 h-12 text-primary/50" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{material.titulo}</CardTitle>
                    {material.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{material.descricao}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja remover ${material.titulo}?`)) {
                          deleteMaterialMutation.mutate(material.id);
                        }
                      }}
                      data-testid={`button-delete-video-${material.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center">
                <Video className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg text-muted-foreground">Nenhum vídeo cadastrado</p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
