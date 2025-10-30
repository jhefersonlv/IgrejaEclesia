import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, Mail, Calendar, Briefcase, MapPin, Home, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import type { User, InsertUser } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, apiUpload, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const editProfileSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().optional(),
  dataNascimento: z.string().optional(),
  profissao: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  fotoUrl: z.string().optional(),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

export default function MemberProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      nome: user?.nome || "",
      email: user?.email || "",
      senha: "",
      dataNascimento: user?.dataNascimento || "",
      profissao: user?.profissao || "",
      endereco: user?.endereco || "",
      bairro: user?.bairro || "",
      cidade: user?.cidade || "",
      fotoUrl: user?.fotoUrl || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        nome: user.nome,
        email: user.email,
        dataNascimento: user.dataNascimento ? new Date(user.dataNascimento).toISOString().split('T')[0] : "",
        profissao: user.profissao || "",
        endereco: user.endereco || "",
        bairro: user.bairro || "",
        cidade: user.cidade || "",
        fotoUrl: user.fotoUrl || "",
      });
    }
  }, [user, form]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return await apiUpload<{ url: string }>("/api/upload", formData);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<InsertUser>) => {
      if (!user) throw new Error("Usuário não encontrado");
      return await apiRequest<User>("PATCH", `/api/profile`, data);
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/admin/members/${user?.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: EditProfileForm) => {
    const updateData: Partial<InsertUser> = { ...data };
    if (!updateData.senha || updateData.senha.trim() === "") {
      delete updateData.senha;
    }

    const fileInput = document.getElementById('fotoUrl') as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      try {
        const uploadResult = await uploadMutation.mutateAsync(fileInput.files[0]);
        updateData.fotoUrl = uploadResult.url;
      } catch (error) {
        toast({
          title: "Erro no upload",
          description: "Não foi possível enviar sua foto.",
          variant: "destructive",
        });
        return;
      }
    }
    updateProfileMutation.mutate(updateData);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-profile-title">
            Meu Perfil
          </h1>
          <p className="text-lg text-muted-foreground">
            Suas informações de cadastro
          </p>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Pencil className="w-4 h-4 mr-2" />
              Editar Perfil
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input id="nome" {...form.register("nome")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="senha">Nova Senha (deixe em branco para manter)</Label>
                  <Input id="senha" type="password" {...form.register("senha")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input id="dataNascimento" type="date" {...form.register("dataNascimento")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profissao">Profissão</Label>
                  <Input id="profissao" {...form.register("profissao")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" {...form.register("cidade")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" {...form.register("bairro")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" {...form.register("endereco")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fotoUrl">Foto de Perfil</Label>
                  <Input id="fotoUrl" type="file" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="max-w-3xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <img src={user.fotoUrl || "/logo_eclesia.png"} alt={user.nome} className="w-20 h-20 rounded-full object-cover" />
            <div>
              <CardTitle className="text-2xl" data-testid="text-profile-name">{user.nome}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {user.isAdmin ? "Administrador" : "Membro"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium" data-testid="text-profile-email">{user.email}</p>
              </div>
            </div>

            {user.dataNascimento && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                  <p className="font-medium" data-testid="text-profile-birthdate">
                    {new Date(user.dataNascimento).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )}

            {user.profissao && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profissão</p>
                  <p className="font-medium" data-testid="text-profile-profession">{user.profissao}</p>
                </div>
              </div>
            )}

            {user.cidade && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cidade</p>
                  <p className="font-medium" data-testid="text-profile-city">
                    {user.cidade}{user.bairro && ` - ${user.bairro}`}
                  </p>
                </div>
              </div>
            )}

            {user.endereco && (
              <div className="flex items-start gap-3 md:col-span-2">
                <div className="p-2 rounded-lg bg-muted">
                  <Home className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="font-medium" data-testid="text-profile-address">{user.endereco}</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Para atualizar suas informações, entre em contato com a secretaria da igreja.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
