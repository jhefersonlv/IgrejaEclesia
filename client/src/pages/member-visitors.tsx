import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function MemberVisitorsPage() {
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    comoConheceu: '',
    culto: '',
    membrouSe: false,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Load visitors from API
  const { data: visitors = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/member/visitors'],
    queryFn: async () => apiRequest('GET', '/api/member/visitors'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      return await apiRequest('POST', '/api/member/visitors', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/member/visitors'] });
      setForm({ nome: '', whatsapp: '', comoConheceu: '', culto: '', membrouSe: false });
      toast({ title: 'Visitante cadastrado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao cadastrar visitante', description: error.message || 'Tente novamente.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number } & typeof form) => {
      const { id, ...payload } = data;
      return await apiRequest('PATCH', `/api/member/visitors/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/member/visitors'] });
      setEditingId(null);
      setForm({ nome: '', whatsapp: '', comoConheceu: '', culto: '', membrouSe: false });
      toast({ title: 'Visitante atualizado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar visitante', description: error.message || 'Tente novamente.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/member/visitors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/member/visitors'] });
      toast({ title: 'Visitante excluído.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir visitante', description: error.message || 'Tente novamente.', variant: 'destructive' });
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type, checked } = e.target as any;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }
  function handleSelect(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.whatsapp || !form.comoConheceu || !form.culto) {
      toast({ title: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }
  function handleEdit(visitor: any) {
    setForm({
      nome: visitor.nome || '',
      whatsapp: visitor.whatsapp || '',
      comoConheceu: visitor.comoConheceu || '',
      culto: visitor.culto || '',
      membrouSe: !!visitor.membrouSe,
    });
    setEditingId(visitor.id);
  }
  function handleDelete(id: number) {
    deleteMutation.mutate(id);
    if (editingId === id) setEditingId(null);
  }
  function handleToggleMembrou(id: number, current: boolean) {
    const v = visitors.find(v => v.id === id);
    if (!v) return;
    updateMutation.mutate({ id, nome: v.nome, whatsapp: v.whatsapp, comoConheceu: v.comoConheceu, culto: v.culto, membrouSe: !current });
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader><CardTitle>{editingId ? 'Editar Visitante' : 'Cadastrar Novo Visitante'}</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome completo*</Label>
                <Input name="nome" value={form.nome} onChange={handleChange} required />
              </div>
              <div className="space-y-1">
                <Label>Whatsapp*</Label>
                <Input name="whatsapp" value={form.whatsapp} onChange={handleChange} required />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Como conheceu a igreja*</Label>
                <Select value={form.comoConheceu} onValueChange={v => handleSelect('comoConheceu', v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma opção" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Amigo/familiar">Familiar ou amigo</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Passou em frente">Passou em frente à igreja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Culto em que esteve*</Label>
                <Select value={form.culto} onValueChange={v => handleSelect('culto', v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha o culto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quarta">Culto de Quarta</SelectItem>
                    <SelectItem value="Domingo Manhã">Domingo de manhã</SelectItem>
                    <SelectItem value="Domingo Noite">Domingo à noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Checkbox id="check-membrou" checked={form.membrouSe} onCheckedChange={checked => setForm(f => ({ ...f, membrouSe: !!checked }))} />
              <Label htmlFor="check-membrou" className="ml-2">Membrou-se</Label>
            </div>
            <div className="flex gap-2 justify-end">
              {editingId && (
                <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm({ nome: '', whatsapp: '', comoConheceu: '', culto: '', membrouSe: false }); }}>Cancelar</Button>
              )}
              <Button type="submit" disabled={createMutation.status==='pending' || updateMutation.status==='pending'}>{editingId ? 'Salvar alterações' : 'Cadastrar Visitante'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Visitantes Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Whatsapp</TableHead>
                  <TableHead>Como Conheceu</TableHead>
                  <TableHead>Culto</TableHead>
                  <TableHead>Membrou-se</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.nome}</TableCell>
                    <TableCell>{v.whatsapp}</TableCell>
                    <TableCell>{v.comoConheceu}</TableCell>
                    <TableCell>{v.culto}</TableCell>
                    <TableCell>
                      <Checkbox checked={!!v.membrouSe} onCheckedChange={() => handleToggleMembrou(v.id, !!v.membrouSe)} />
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(v)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(v.id)} disabled={deleteMutation.status==='pending'}>Excluir</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && visitors.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Nenhum visitante ainda cadastrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
