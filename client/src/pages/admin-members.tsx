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
import { Users, Plus, Search, Download, Trash2, Shield, Pencil, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, InsertUser } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { apiRequest, queryClient, apiUpload } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import * as XLSX from "xlsx";

// Schema for editing (all fields optional except nome and email)
const editUserSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  senha: z.string().optional(),
  dataNascimento: z.string().optional(),
  profissao: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  isAdmin: z.boolean().optional(),
  ministerioLouvor: z.boolean().optional(),
  ministerioObreiro: z.boolean().optional(),
  isLider: z.boolean().optional(),
  fotoUrl: z.string().optional(),
});

type EditUserForm = z.infer<typeof editUserSchema>;

export default function AdminMembers() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBairro, setFilterBairro] = useState("");
  const [filterProfissao, setFilterProfissao] = useState("");
  
  // Estados para importação
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; mensagem: string } | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  
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
      ministerioLouvor: false,
      ministerioObreiro: false,
      fotoUrl: "",
    },
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
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
      ministerioLouvor: false,
      ministerioObreiro: false,
      isLider: false,
      fotoUrl: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return await apiUpload<{ url: string }>("/api/upload", formData);
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

  const importMembersMutation = useMutation({
    mutationFn: async (membros: InsertUser[]) => {
      const results = [];
      for (const membro of membros) {
        try {
          const result = await apiRequest<User>("POST", "/api/admin/members", membro);
          results.push({ success: true, data: result });
        } catch (error: any) {
          results.push({ success: false, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Importação concluída!",
        description: `${successCount} membro(s) importado(s) com sucesso${errorCount > 0 ? ` e ${errorCount} com erro` : ''}.`,
      });
      
      setIsImportOpen(false);
      limparImportacao();
    },
    onError: (error: any) => {
      toast({
        title: "Erro na importação",
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

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertUser> }) => {
      return await apiRequest<User>("PATCH", `/api/admin/members/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Membro atualizado!",
        description: "As informações do membro foram atualizadas.",
      });
      setIsEditOpen(false);
      setEditingMember(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar membro",
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

  // Funcionalidades de Importação
  const COLUNAS_ESPERADAS = ['Nome Completo', 'E-mail', 'Senha', 'Data de Nascimento', 'Profissão', 'Cidade', 'Bairro', 'Endereço'];

  const downloadTemplate = () => {
  const dados = [
    {
      'Nome Completo': 'João Silva',
      'E-mail': 'joao@example.com',
      'Senha': 'Senha123@',
      'Data de Nascimento': '1990-05-15',
      'Profissão': 'Engenheiro',
      'Cidade': 'São Paulo',
      'Bairro': 'Centro',
      'Endereço': 'Rua das Flores, 123'
    },
    {
      'Nome Completo': 'Maria Santos',
      'E-mail': 'maria@example.com',
      'Senha': 'Senha456@',
      'Data de Nascimento': '1988-08-22',
      'Profissão': 'Médica',
      'Cidade': 'São Paulo',
      'Bairro': 'Vila Mariana',
      'Endereço': 'Avenida Paulista, 456'
    },
    {
      'Nome Completo': 'Pedro Oliveira',
      'E-mail': 'pedro@example.com',
      'Senha': 'Senha789@',
      'Data de Nascimento': '1992-03-10',
      'Profissão': 'Professor',
      'Cidade': 'São Paulo',
      'Bairro': 'Pinheiros',
      'Endereço': 'Rua da Paz, 789'
    },
  ];

  const ws = XLSX.utils.json_to_sheet(dados);
  ws['!cols'] = [
    { wch: 20 },
    { wch: 25 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
    { wch: 25 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Membros');
  XLSX.writeFile(wb, 'Modelo_Membros.xlsx');
};

  const validarLinhaImportacao = (linha: any) => {
    const erros: string[] = [];

    if (!linha['Nome Completo'] || !linha['Nome Completo'].toString().trim()) {
      erros.push('Nome Completo é obrigatório');
    }

    if (!linha['E-mail'] || !linha['E-mail'].toString().trim()) {
      erros.push('E-mail é obrigatório');
    } else if (!linha['E-mail'].toString().includes('@')) {
      erros.push('E-mail inválido');
    }

    if (!linha['Senha'] || !linha['Senha'].toString().trim()) {
      erros.push('Senha é obrigatória');
    }

    return erros;
  };

  const processarArquivoImportacao = (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setIsImportLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const dados = e.target.result;
        const workbook = XLSX.read(dados, { type: 'binary' });
        const planilha = workbook.Sheets[workbook.SheetNames[0]];
        const linhas = XLSX.utils.sheet_to_json(planilha);

        if (linhas.length === 0) {
          setImportStatus({
            tipo: 'erro',
            mensagem: 'A planilha não contém dados'
          });
          setIsImportLoading(false);
          return;
        }

        const dadosComErros = linhas.map((linha: any, idx: number) => ({
          ...linha,
          _erros: validarLinhaImportacao(linha),
          _indice: idx + 2
        }));

        const temErros = dadosComErros.some(d => d._erros.length > 0);

        setImportPreview(dadosComErros);
        setImportFile(arquivo);
        setImportStatus(null);

        if (temErros) {
          setImportStatus({
            tipo: 'aviso',
            mensagem: `Existem ${dadosComErros.filter(d => d._erros.length > 0).length} linhas com erros.`
          });
        }
      } catch (erro: any) {
        setImportStatus({
          tipo: 'erro',
          mensagem: 'Erro ao processar arquivo: ' + erro.message
        });
        setImportPreview([]);
        setImportFile(null);
      }
      setIsImportLoading(false);
    };

    reader.readAsBinaryString(arquivo);
  };

  const importarDados = () => {
    const dadosValidos = importPreview.filter(d => d._erros.length === 0);

    if (dadosValidos.length === 0) {
      setImportStatus({
        tipo: 'erro',
        mensagem: 'Nenhuma linha válida para importar'
      });
      return;
    }

    const membrosParaImportar: InsertUser[] = dadosValidos.map(d => ({
      nome: d['Nome Completo'],
      email: d['E-mail'],
      senha: d['Senha'],
      profissao: d['Profissão'] || '',
      endereco: d['Endereço'] || '',
      bairro: d['Bairro'] || '',
      cidade: d['Cidade'] || '',
      dataNascimento: d['Data de Nascimento'] || undefined,
      isAdmin: false,
      ministerioLouvor: false,
      ministerioObreiro: false,
      fotoUrl: '',
    }));

    importMembersMutation.mutate(membrosParaImportar);
  };

  const limparImportacao = () => {
    setImportPreview([]);
    setImportFile(null);
    setImportStatus(null);
  };

  const handleEditMember = (member: User) => {
    setEditingMember(member);
    editForm.reset({
      nome: member.nome,
      email: member.email,
      senha: "",
      dataNascimento: member.dataNascimento || undefined,
      profissao: member.profissao || "",
      endereco: member.endereco || "",
      bairro: member.bairro || "",
      cidade: member.cidade || "",
      isAdmin: member.isAdmin,
      ministerioLouvor: member.ministerioLouvor || false,
      ministerioObreiro: member.ministerioObreiro || false,
      isLider: member.isLider || false,
      fotoUrl: member.fotoUrl || "",
    });
    setIsEditOpen(true);
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBairro = !filterBairro || filterBairro === "_all" || member.bairro === filterBairro;
    const matchesProfissao = !filterProfissao || filterProfissao === "_all" || member.profissao === filterProfissao;
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

  const onSubmit = async (data: InsertUser) => {
    const fileInput = document.getElementById('fotoUrl') as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      try {
        const uploadResult = await uploadMutation.mutateAsync(fileInput.files[0]);
        data.fotoUrl = uploadResult.url;
      } catch (error) {
        toast({
          title: "Erro no upload da foto",
          description: "Não foi possível fazer o upload da foto. Tente novamente.",
          variant: "destructive",
        });
        return;
      }
    }
    createMemberMutation.mutate(data);
  };

  const onEditSubmit = async (data: EditUserForm) => {
    if (!editingMember) return;

    const updateData: Partial<InsertUser> = { ...data };
    if (!updateData.senha || updateData.senha.trim() === "") {
      delete updateData.senha;
    }

    const fileInput = document.getElementById('edit-fotoUrl') as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      try {
        const uploadResult = await uploadMutation.mutateAsync(fileInput.files[0]);
        updateData.fotoUrl = uploadResult.url;
      } catch (error) {
        toast({
          title: "Erro no upload da foto",
          description: "Não foi possível fazer o upload da nova foto. Tente novamente.",
          variant: "destructive",
        });
        return;
      }
    }
    updateMemberMutation.mutate({ id: editingMember.id, data: updateData });
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
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToCSV} variant="outline" data-testid="button-export-csv">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>

          {/* Dialog de Importação */}
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-import-members">
                <Upload className="w-4 h-4 mr-2" />
                Importar Membros
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Importar Membros</DialogTitle>
                <DialogDescription>
                  Importe cadastros em lote usando uma planilha Excel
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Seção Download Template */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-600 text-white p-3 rounded-lg">
                      <Download className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Planilha de Exemplo</h3>
                      <p className="text-gray-700 mb-4">Baixe o modelo para garantir que seus dados estejam no formato correto.</p>
                      <Button
                        onClick={downloadTemplate}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar Modelo
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Seção Upload */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Selecione o arquivo</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={processarArquivoImportacao}
                      disabled={isImportLoading}
                      className="absolute opacity-0 w-0 h-0"
                      id="import-file-input"
                    />
                    <label htmlFor="import-file-input" className="cursor-pointer block">
                      <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-gray-700">
                        {importFile ? importFile.name : 'Clique ou arraste um arquivo Excel aqui'}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Formatos: XLSX, XLS, CSV</p>
                    </label>
                  </div>
                </div>

                {/* Status Messages */}
                {importStatus && (
                  <div className={`p-4 rounded-lg flex items-start gap-3 ${
                    importStatus.tipo === 'sucesso' ? 'bg-green-50 border border-green-200' :
                    importStatus.tipo === 'aviso' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-red-50 border border-red-200'
                  }`}>
                    {importStatus.tipo === 'sucesso' ? (
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                    ) : (
                      <AlertCircle className={`flex-shrink-0 mt-0.5 ${
                        importStatus.tipo === 'aviso' ? 'text-yellow-600' : 'text-red-600'
                      }`} size={20} />
                    )}
                    <p className={`${
                      importStatus.tipo === 'sucesso' ? 'text-green-800' :
                      importStatus.tipo === 'aviso' ? 'text-yellow-800' :
                      'text-red-800'
                    }`}>
                      {importStatus.mensagem}
                    </p>
                  </div>
                )}

                {/* Preview */}
                {importPreview.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Pré-visualização ({importPreview.length} registros)</h3>
                    <div className="overflow-x-auto border rounded-lg max-h-64">
                      <Table>
                        <TableHeader className="sticky top-0 bg-gray-100">
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            {COLUNAS_ESPERADAS.map(col => (
                              <TableHead key={col}>{col}</TableHead>
                            ))}
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.map((linha, idx) => (
                            <TableRow key={idx} className={linha._erros.length > 0 ? 'bg-red-50' : ''}>
                              <TableCell className="text-gray-600 text-sm">{linha._indice}</TableCell>
                              {COLUNAS_ESPERADAS.map(col => (
                                <TableCell key={col} className="text-sm truncate max-w-xs">
                                  {linha[col] || '-'}
                                </TableCell>
                              ))}
                              <TableCell className="text-sm">
                                {linha._erros.length > 0 ? (
                                  <span className="text-red-600 flex items-center gap-1">
                                    <AlertCircle size={14} />
                                    {linha._erros[0]}
                                  </span>
                                ) : (
                                  <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle size={14} />
                                    Válido
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Botões de Ação */}
                {importPreview.length > 0 && (
                  <div className="flex gap-3 justify-end pt-4 border-t">
                    <Button
                      onClick={limparImportacao}
                      variant="outline"
                      disabled={isImportLoading}
                    >
                      Limpar
                    </Button>
                    <Button
                      onClick={importarDados}
                      disabled={isImportLoading || importPreview.every(d => d._erros.length > 0)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isImportLoading ? 'Importando...' : `Importar ${importPreview.filter(d => d._erros.length === 0).length} membro(s)`}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

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
                    <Label htmlFor="fotoUrl">Foto do Perfil</Label>
                    <Input id="fotoUrl" type="file" data-testid="input-fotoUrl" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Ministérios</Label>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="ministerioLouvor"
                          {...form.register("ministerioLouvor")}
                          className="w-4 h-4 rounded border-input"
                          data-testid="checkbox-louvor"
                        />
                        <Label htmlFor="ministerioLouvor" className="font-normal cursor-pointer">
                          Louvor
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="ministerioObreiro"
                          {...form.register("ministerioObreiro")}
                          className="w-4 h-4 rounded border-input"
                          data-testid="checkbox-obreiro"
                        />
                        <Label htmlFor="ministerioObreiro" className="font-normal cursor-pointer">
                          Obreiro
                        </Label>
                      </div>
                    </div>
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

          {/* Edit Member Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Membro</DialogTitle>
                <DialogDescription>
                  Atualize as informações do membro
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-nome">Nome Completo *</Label>
                    <Input id="edit-nome" {...editForm.register("nome")} data-testid="input-edit-nome" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input id="edit-email" type="email" {...editForm.register("email")} data-testid="input-edit-email" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-senha">Nova Senha (deixe em branco para manter a atual)</Label>
                    <Input id="edit-senha" type="password" {...editForm.register("senha")} data-testid="input-edit-senha" placeholder="********" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-dataNascimento">Data de Nascimento</Label>
                    <Input id="edit-dataNascimento" type="date" {...editForm.register("dataNascimento")} data-testid="input-edit-birthdate" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-profissao">Profissão</Label>
                    <Input id="edit-profissao" {...editForm.register("profissao")} data-testid="input-edit-profession" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-cidade">Cidade</Label>
                    <Input id="edit-cidade" {...editForm.register("cidade")} data-testid="input-edit-city" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-bairro">Bairro</Label>
                    <Input id="edit-bairro" {...editForm.register("bairro")} data-testid="input-edit-neighborhood" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-endereco">Endereço</Label>
                    <Input id="edit-endereco" {...editForm.register("endereco")} data-testid="input-edit-address" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-fotoUrl">Foto do Perfil</Label>
                    <Input id="edit-fotoUrl" type="file" data-testid="input-edit-fotoUrl" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Ministérios</Label>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-ministerioLouvor"
                          {...editForm.register("ministerioLouvor")}
                          className="w-4 h-4 rounded border-input"
                          data-testid="checkbox-edit-louvor"
                        />
                        <Label htmlFor="edit-ministerioLouvor" className="font-normal cursor-pointer">
                          Louvor
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-ministerioObreiro"
                          {...editForm.register("ministerioObreiro")}
                          className="w-4 h-4 rounded border-input"
                          data-testid="checkbox-edit-obreiro"
                        />
                        <Label htmlFor="edit-ministerioObreiro" className="font-normal cursor-pointer">
                          Obreiro
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-isAdmin"
                          {...editForm.register("isAdmin")}
                          className="w-4 h-4 rounded border-input"
                          data-testid="checkbox-edit-admin"
                        />
                        <Label htmlFor="edit-isAdmin" className="font-normal cursor-pointer">
                          Administrador
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-isLider"
                          {...editForm.register("isLider")}
                          className="w-4 h-4 rounded border-input"
                          data-testid="checkbox-edit-leader"
                        />
                        <Label htmlFor="edit-isLider" className="font-normal cursor-pointer">
                          Líder
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateMemberMutation.isPending} data-testid="button-submit-edit">
                    {updateMemberMutation.isPending ? "Salvando..." : "Salvar Alterações"}
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
              <Select value={filterBairro || "_all"} onValueChange={setFilterBairro}>
                <SelectTrigger id="bairro" data-testid="select-neighborhood">
                  <SelectValue placeholder="Todos os bairros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos os bairros</SelectItem>
                  {uniqueBairros.map((bairro) => (
                    <SelectItem key={bairro} value={bairro}>{bairro}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profissao">Profissão</Label>
              <Select value={filterProfissao || "_all"} onValueChange={setFilterProfissao}>
                <SelectTrigger id="profissao" data-testid="select-profession">
                  <SelectValue placeholder="Todas as profissões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas as profissões</SelectItem>
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
                  <TableHead>Foto</TableHead>
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
                    <TableCell>
                      <img src={member.fotoUrl || "/logo_eclesia.png"} alt={member.nome} className="w-10 h-10 rounded-full" />
                    </TableCell>
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
                          onClick={() => handleEditMember(member)}
                          data-testid={`button-edit-${member.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
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