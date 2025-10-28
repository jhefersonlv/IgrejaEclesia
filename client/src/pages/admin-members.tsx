import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Users, Plus, Search, Download, Trash2, Shield } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, InsertUser } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function AdminMembers() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBairro, setFilterBairro] = useState("");
  const [filterProfissao, setFilterProfissao] = useState("");
  const { toast } = useToast();

  const { data: members = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
  });

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      nome: "",
      email: "",
      senha: "",
      dataNascimento: undefined,
      profissao: "",
      endereco: "",
      bairro: "",
      cidade: "",
      isAdmin: false,
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      return await apiRequest<User>("POST", "/api/admin/members", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Membro criado com sucesso!",
        description: "O novo membro foi cadastrado no sistema.",
      });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar membro",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/members/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Membro removido",
        description: "O membro foi removido do sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: number; isAdmin: boolean }) => {
      return await apiRequest<User>("PATCH", `/api/admin/members/${id}/toggle-admin`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Permissões atualizadas",
        description: "As permissões do membro foram alteradas.",
      });
    },
  });

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBairro = !filterBairro || member.bairro === filterBairro;
    const matchesProfissao = !filterProfissao || member.profissao === filterProfissao;
    return matchesSearch && matchesBairro && matchesProfissao;
  });

  const uniqueBairros = Array.from(new Set(members.map(m => m.bairro).filter(Boolean))) as string[];
  const uniqueProfissoes = Array.from(new Set(members.map(m => m.profissao).filter(Boolean))) as string[];

  const exportToCSV = () => {
    const headers = ["Nome", "Email", "Data Nascimento", "Profissão", "Cidade", "Bairro", "Admin"];
    const rows = filteredMembers.map(m => [
      m.nome,
      m.email,
      m.dataNascimento || "",
      m.profissao || "",
      m.cidade || "",
      m.bairro || "",
      m.isAdmin ? "Sim" : "Não"
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "membros.csv";
    a.click();
    
    toast({
      title: "CSV exportado",
      description: `${filteredMembers.length} membros exportados com sucesso.`,
    });
  };

  const onSubmit = (data: InsertUser) => {
    createMemberMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-members-title">
            Gerenciar Membros
          </h1>
          <p className="text-lg text-muted-foreground">
            {filteredMembers.length} membros cadastrados
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" data-testid="button-export-csv">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-member">
                <Plus className="w-4 h-4 mr-2" />
                Novo Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Membro</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo membro
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input id="nome" {...form.register("nome")} data-testid="input-nome" />
                    {form.formState.errors.nome && (
                      <p className="text-sm text-destructive">{form.formState.errors.nome.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" {...form.register("email")} data-testid="input-email" />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha *</Label>
                    <Input id="senha" type="password" {...form.register("senha")} data-testid="input-senha" />
                    {form.formState.errors.senha && (
                      <p className="text-sm text-destructive">{form.formState.errors.senha.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input id="dataNascimento" type="date" {...form.register("dataNascimento")} data-testid="input-birthdate" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profissao">Profissão</Label>
                    <Input id="profissao" {...form.register("profissao")} data-testid="input-profession" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" {...form.register("cidade")} data-testid="input-city" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" {...form.register("bairro")} data-testid="input-neighborhood" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input id="endereco" {...form.register("endereco")} data-testid="input-address" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isAdmin"
                        {...form.register("isAdmin")}
                        className="w-4 h-4 rounded border-input"
                        data-testid="checkbox-admin"
                      />
                      <Label htmlFor="isAdmin" className="font-normal cursor-pointer">
                        Conceder permissões de administrador
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMemberMutation.isPending} data-testid="button-submit-member">
                    {createMemberMutation.isPending ? "Cadastrando..." : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Select value={filterBairro} onValueChange={setFilterBairro}>
                <SelectTrigger id="bairro" data-testid="select-neighborhood">
                  <SelectValue placeholder="Todos os bairros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os bairros</SelectItem>
                  {uniqueBairros.map((bairro) => (
                    <SelectItem key={bairro} value={bairro}>{bairro}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profissao">Profissão</Label>
              <Select value={filterProfissao} onValueChange={setFilterProfissao}>
                <SelectTrigger id="profissao" data-testid="select-profession">
                  <SelectValue placeholder="Todas as profissões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as profissões</SelectItem>
                  {uniqueProfissoes.map((profissao) => (
                    <SelectItem key={profissao} value={profissao}>{profissao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Carregando membros...</p>
            </div>
          ) : filteredMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Profissão</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                    <TableCell className="font-medium">{member.nome}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.cidade || "-"}</TableCell>
                    <TableCell>{member.bairro || "-"}</TableCell>
                    <TableCell>{member.profissao || "-"}</TableCell>
                    <TableCell>
                      {member.isAdmin ? (
                        <Badge variant="default" data-testid={`badge-admin-${member.id}`}>
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-member-${member.id}`}>Membro</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAdminMutation.mutate({ id: member.id, isAdmin: !member.isAdmin })}
                          data-testid={`button-toggle-admin-${member.id}`}
                        >
                          <Shield className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja remover ${member.nome}?`)) {
                              deleteMemberMutation.mutate(member.id);
                            }
                          }}
                          data-testid={`button-delete-${member.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg text-muted-foreground">Nenhum membro encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
