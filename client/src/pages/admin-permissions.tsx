import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, ShieldCheck, X, Info, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

interface Permissao { id: number; moduloId: number; cargoChave: string }
interface ModuloComPermissoes {
  id: number; chave: string; nome: string; descricao: string | null; ativo: boolean;
  permissoes: Permissao[];
}
interface Ministerio { id: number; nome: string }

// Cargos fixos do sistema
const CARGOS_FIXOS = [
  { chave: "admin",  label: "Administrador",    desc: "Usuários com isAdmin=true" },
  { chave: "lider",  label: "Líder",             desc: "Líderes de qualquer ministério" },
  { chave: "membro", label: "Membro (todos)",    desc: "Qualquer usuário autenticado" },
];

export default function AdminPermissions() {
  const { toast } = useToast();
  const [editingModulo, setEditingModulo] = useState<ModuloComPermissoes | null>(null);
  const [isModuloDialogOpen, setIsModuloDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ nome: string; chave: string; descricao: string }>({ nome: "", chave: "", descricao: "" });

  const novoForm = useForm({ defaultValues: { nome: "", chave: "", descricao: "" } });

  const { data: modulosData = [], isLoading } = useQuery<ModuloComPermissoes[]>({
    queryKey: ["/api/admin/modulos"],
  });

  const { data: ministerios = [] } = useQuery<Ministerio[]>({
    queryKey: ["/api/ministerios"],
  });

  // Cargos dinâmicos baseados nos ministérios
  const cargosMinisterio = ministerios.map(m => ({
    chave: `ministerio:${m.nome}`,
    label: `Ministério: ${m.nome}`,
    desc: `Membros do ${m.nome}`,
  }));

  const todosCargos = [...CARGOS_FIXOS, ...cargosMinisterio];

  const createModuloMutation = useMutation({
    mutationFn: (data: { nome: string; chave: string; descricao: string }) =>
      apiRequest("POST", "/api/admin/modulos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modulos"] });
      novoForm.reset();
      toast({ title: "Módulo criado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateModuloMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/admin/modulos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modulos"] });
      setIsModuloDialogOpen(false);
      toast({ title: "Módulo atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteModuloMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/modulos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modulos"] });
      toast({ title: "Módulo removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const addPermissaoMutation = useMutation({
    mutationFn: ({ moduloId, cargoChave }: { moduloId: number; cargoChave: string }) =>
      apiRequest("POST", `/api/admin/modulos/${moduloId}/permissoes`, { cargoChave }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/modulos"] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removePermissaoMutation = useMutation({
    mutationFn: ({ moduloId, cargoChave }: { moduloId: number; cargoChave: string }) =>
      apiRequest("DELETE", `/api/admin/modulos/${moduloId}/permissoes/${encodeURIComponent(cargoChave)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/modulos"] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleCargo = (modulo: ModuloComPermissoes, cargoChave: string) => {
    const temPermissao = modulo.permissoes.some(p => p.cargoChave === cargoChave);
    if (temPermissao) {
      removePermissaoMutation.mutate({ moduloId: modulo.id, cargoChave });
    } else {
      addPermissaoMutation.mutate({ moduloId: modulo.id, cargoChave });
    }
  };

  const cargoLabel = (chave: string) =>
    todosCargos.find(c => c.chave === chave)?.label ?? chave;

  const cargoColor = (chave: string) => {
    if (chave === "admin") return "bg-red-100 text-red-700 border-red-300";
    if (chave === "lider") return "bg-blue-100 text-blue-700 border-blue-300";
    if (chave === "membro") return "bg-green-100 text-green-700 border-green-300";
    return "bg-purple-100 text-purple-700 border-purple-300";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2">Permissões do Sistema</h1>
        <p className="text-lg text-muted-foreground">
          Gerencie quais cargos têm acesso a cada módulo. Cadastre um módulo novo e ele fica protegido automaticamente.
        </p>
      </div>

      {/* Legenda */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Como usar:</strong> Cadastre o módulo com a chave exata que você usa na sua rota (ex: <code className="bg-blue-100 px-1 rounded">visitantes</code>).</p>
              <p>Na rota da API, use <code className="bg-blue-100 px-1 rounded">app.locals.requireModulo("visitantes")</code> como middleware.</p>
              <p><strong>Cargos especiais:</strong> <code className="bg-blue-100 px-1 rounded">ministerio:NOME</code> libera acesso a todos do ministério com aquele nome.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Criar novo módulo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" />Novo Módulo</CardTitle>
          <CardDescription>Cadastre uma nova funcionalidade para controlar o acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={novoForm.handleSubmit(d => createModuloMutation.mutate(d))} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label>Chave * <span className="text-xs text-muted-foreground">(usada no middleware)</span></Label>
              <Input
                placeholder="ex: visitantes"
                className="w-48"
                {...novoForm.register("chave", { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label>Nome de exibição *</Label>
              <Input
                placeholder="ex: Módulo de Visitantes"
                className="w-56"
                {...novoForm.register("nome", { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                placeholder="Para que serve..."
                className="w-64"
                {...novoForm.register("descricao")}
              />
            </div>
            <Button type="submit" disabled={createModuloMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />Criar Módulo
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de módulos */}
      {isLoading && <p className="text-muted-foreground">Carregando módulos...</p>}

      {!isLoading && modulosData.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum módulo cadastrado ainda.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {modulosData.map(modulo => {
          const cargosDisponiveis = todosCargos.filter(
            c => !modulo.permissoes.some(p => p.cargoChave === c.chave)
          );

          return (
            <Card key={modulo.id} className={modulo.ativo ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      {modulo.nome}
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{modulo.chave}</code>
                      {!modulo.ativo && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                    </CardTitle>
                    {modulo.descricao && <CardDescription className="mt-1">{modulo.descricao}</CardDescription>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="icon" onClick={() => {
                      setEditingModulo(modulo);
                      setEditForm({ nome: modulo.nome, chave: modulo.chave, descricao: modulo.descricao ?? "" });
                      setIsModuloDialogOpen(true);
                    }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      updateModuloMutation.mutate({ id: modulo.id, data: { ativo: !modulo.ativo } });
                    }} title={modulo.ativo ? "Desativar" : "Ativar"}>
                      <span className="text-xs">{modulo.ativo ? "🟢" : "🔴"}</span>
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() =>
                      confirm(`Remover módulo "${modulo.nome}"?`) && deleteModuloMutation.mutate(modulo.id)
                    }>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Cargos com acesso */}
                <div>
                  <p className="text-sm font-medium mb-2">Cargos com acesso:</p>
                  {modulo.permissoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhum cargo tem acesso — módulo bloqueado para todos.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {modulo.permissoes.map(p => (
                        <span key={p.id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border ${cargoColor(p.cargoChave)}`}>
                          {cargoLabel(p.cargoChave)}
                          <button
                            onClick={() => removePermissaoMutation.mutate({ moduloId: modulo.id, cargoChave: p.cargoChave })}
                            className="ml-1 hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Adicionar cargo */}
                {cargosDisponiveis.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={v => toggleCargo(modulo, v)}
                      value=""
                    >
                      <SelectTrigger className="w-64 h-8 text-sm">
                        <SelectValue placeholder="+ Adicionar cargo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cargosDisponiveis.map(c => (
                          <SelectItem key={c.chave} value={c.chave}>
                            <div>
                              <span className="font-medium">{c.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">{c.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog editar módulo */}
      <Dialog open={isModuloDialogOpen} onOpenChange={setIsModuloDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Módulo</DialogTitle>
            <DialogDescription>Atualize os dados do módulo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Chave</Label>
              <Input value={editForm.chave} onChange={e => setEditForm(f => ({ ...f, chave: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={editForm.descricao} onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModuloDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => editingModulo && updateModuloMutation.mutate({ id: editingModulo.id, data: editForm })}
                disabled={updateModuloMutation.isPending}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
