import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PrayerRequest } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, Eye, EyeOff, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminPrayersPage() {
  const { toast } = useToast();

  const { data: prayers = [], isLoading } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/admin/prayers"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, isPublic }: { id: number; status: string; isPublic: boolean }) => {
      return await apiRequest<PrayerRequest>("PATCH", `/api/admin/prayers/${id}`, { status, isPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prayers"] });
      toast({
        title: "Status atualizado",
        description: "O pedido foi atualizado com sucesso.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/prayers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prayers"] });
      toast({
        title: "Pedido removido",
        description: "O pedido foi removido do sistema.",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      approved: { label: "Aprovado", variant: "default" },
      archived: { label: "Arquivado", variant: "outline" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-prayers-title">
          Gerenciar Pedidos de Oração
        </h1>
        <p className="text-lg text-muted-foreground">
          {prayers.length} pedidos cadastrados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Carregando pedidos...</p>
            </div>
          ) : prayers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prayers.map((prayer) => (
                  <TableRow key={prayer.id} data-testid={`prayer-row-${prayer.id}`}>
                    <TableCell className="font-medium">{prayer.nome}</TableCell>
                    <TableCell>{prayer.email || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{prayer.pedido}</TableCell>
                    <TableCell>
                      {format(new Date(prayer.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(prayer.status)}</TableCell>
                    <TableCell>
                      {prayer.isPublic ? (
                        <Badge variant="default"><Eye className="w-3 h-3" /></Badge>
                      ) : (
                        <Badge variant="outline"><EyeOff className="w-3 h-3" /></Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {prayer.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateStatusMutation.mutate({
                                id: prayer.id,
                                status: "approved",
                                isPublic: true,
                              })}
                              data-testid={`button-approve-${prayer.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatusMutation.mutate({
                                id: prayer.id,
                                status: "approved",
                                isPublic: false,
                              })}
                              data-testid={`button-approve-private-${prayer.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Privado
                            </Button>
                          </>
                        )}
                        {prayer.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({
                              id: prayer.id,
                              status: "archived",
                              isPublic: false,
                            })}
                            data-testid={`button-archive-${prayer.id}`}
                          >
                            Arquivar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(prayer.id)}
                          data-testid={`button-delete-${prayer.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum pedido de oração cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
