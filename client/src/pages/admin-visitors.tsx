import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

/** Mocked visitors for now */
const initialVisitors = [
  {
    id: 1,
    nome: 'João da Silva',
    whatsapp: '(11) 91234-5678',
    comoConheceu: 'Amigo/familiar',
    culto: 'Domingo Manhã',
    membrouSe: false,
  },
  {
    id: 2,
    nome: 'Maria Souza',
    whatsapp: '(11) 92345-8888',
    comoConheceu: 'Instagram',
    culto: 'Quarta',
    membrouSe: true,
  },
];

export default function AdminVisitorsPage() {
  const [visitors, setVisitors] = useState(initialVisitors);
  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    comoConheceu: '',
    culto: '',
    membrouSe: false,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type, checked } = e.target as any;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }
  function handleSelect(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.whatsapp || !form.comoConheceu || !form.culto) return;
    if (editingId) {
      setVisitors(list => list.map(v => v.id === editingId ? { ...form, id: editingId } : v));
      setEditingId(null);
    } else {
      setVisitors(list => [...list, { ...form, id: Math.max(0, ...list.map(v => v.id)) + 1 }]);
    }
    setForm({ nome: '', whatsapp: '', comoConheceu: '', culto: '', membrouSe: false });
  }
  function handleEdit(visitor: any) {
    setForm(visitor);
    setEditingId(visitor.id);
  }
  function handleDelete(id: number) {
    setVisitors(list => list.filter(v => v.id !== id));
    if (editingId === id) setEditingId(null);
  }
  function handleToggleMembrou(id: number) {
    setVisitors(list => list.map(v => v.id === id ? { ...v, membrouSe: !v.membrouSe } : v));
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
              <Button type="submit">{editingId ? 'Salvar alterações' : 'Cadastrar Visitante'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Visitantes Cadastrados</CardTitle></CardHeader>
        <CardContent>
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
                    <Checkbox checked={v.membrouSe} onCheckedChange={() => handleToggleMembrou(v.id)} />
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(v)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(v.id)}>Excluir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {visitors.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Nenhum visitante ainda cadastrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
