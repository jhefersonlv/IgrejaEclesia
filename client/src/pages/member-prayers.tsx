import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertPrayerRequestSchema, type InsertPrayerRequest, type PrayerRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Heart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MemberPrayersPage() {
  const { toast } = useToast();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const form = useForm<InsertPrayerRequest>({
    resolver: zodResolver(insertPrayerRequestSchema),
    defaultValues: {
      nome: user?.nome || "",
      email: user?.email || "",
      pedido: "",
    },
  });

  const { data: publicPrayers = [], isLoading } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/prayers/public"],
  });

  const submitPrayerMutation = useMutation({
    mutationFn: async (data: InsertPrayerRequest) => {
      return await apiRequest<PrayerRequest>("POST", "/api/prayers", data);
    },
    onSuccess: () => {
      form.setValue("pedido", "");
      toast({
        title: "Pedido enviado!",
        description: "Seu pedido de oração foi recebido e será analisado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPrayerRequest) => {
    submitPrayerMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-prayers-title">
          Pedidos de Oração
        </h1>
        <p className="text-lg text-muted-foreground">
          Compartilhe seus pedidos de oração e acompanhe as orações da comunidade
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Prayer Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Enviar Pedido de Oração
            </CardTitle>
            <CardDescription>
              Preencha o formulário abaixo para enviar seu pedido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome*</Label>
                <Input
                  id="nome"
                  placeholder="Seu nome"
                  {...form.register("nome")}
                  data-testid="input-prayer-name"
                />
                {form.formState.errors.nome && (
                  <p className="text-sm text-destructive">{form.formState.errors.nome.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...form.register("email")}
                  data-testid="input-prayer-email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pedido">Pedido de Oração*</Label>
                <Textarea
                  id="pedido"
                  placeholder="Compartilhe seu pedido de oração..."
                  rows={6}
                  {...form.register("pedido")}
                  data-testid="input-prayer-request"
                />
                {form.formState.errors.pedido && (
                  <p className="text-sm text-destructive">{form.formState.errors.pedido.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitPrayerMutation.isPending}
                data-testid="button-submit-prayer"
              >
                {submitPrayerMutation.isPending ? "Enviando..." : "Enviar Pedido"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Public Prayers List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-accent" />
                Orações em Destaque
              </CardTitle>
              <CardDescription>
                Pedidos que a comunidade está acompanhando
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Carregando...</p>
              ) : publicPrayers.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {publicPrayers.map((prayer) => (
                    <Card key={prayer.id} className="bg-muted/50" data-testid={`prayer-card-${prayer.id}`}>
                      <CardHeader className="space-y-1 pb-2">
                        <CardTitle className="text-base">{prayer.nome}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(prayer.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{prayer.pedido}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum pedido público no momento
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
