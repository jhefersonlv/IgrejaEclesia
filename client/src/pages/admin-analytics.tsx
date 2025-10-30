import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Analytics {
  totalMembers: number;
  membersByAge: { ageGroup: string; count: number }[];
  membersByNeighborhood: { neighborhood: string; count: number }[];
  membersByProfession: { profession: string; count: number }[];
  recentMembersCount: number;
}

const COLORS = ["#1E40AF", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE", "#EFF6FF", "#1E293B"];

interface VisitorAnalytics {
  totalVisitors: number;
  visitorsByCulto: { culto: string; count: number }[];
  visitorsByOrigem: { origem: string; count: number }[];
  visitorsMembrouSe: number;
  recentVisitorsCount: number;
}

interface GeneralAnalytics {
  totalPeople: number;
  totalMembers: number;
  totalVisitors: number;
  visitorsMembrouSe: number;
}

export default function AdminAnalyticsPage() {
  const { data: analytics, isLoading, isError } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics/members"],
    queryFn: async () => apiRequest("GET", "/api/admin/analytics/members"),
  });
  const { data: visitors, isLoading: visitorsLoading, isError: visitorsError } = useQuery<VisitorAnalytics>({
    queryKey: ["/api/admin/analytics/visitors"],
    queryFn: async () => apiRequest("GET", "/api/admin/analytics/visitors"),
  });
  const { data: general, isLoading: generalLoading, isError: generalError } = useQuery<GeneralAnalytics>({
    queryKey: ["/api/admin/analytics/general"],
    queryFn: async () => apiRequest("GET", "/api/admin/analytics/general"),
  });

  const visitorsData: VisitorAnalytics = visitors ?? {
    totalVisitors: 0,
    visitorsByCulto: [],
    visitorsByOrigem: [],
    visitorsMembrouSe: 0,
    recentVisitorsCount: 0,
  };

  const generalData: GeneralAnalytics = general ?? {
    totalPeople: 0,
    totalMembers: analytics?.totalMembers ?? 0,
    totalVisitors: 0,
    visitorsMembrouSe: 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando analytics...</p>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Não foi possível carregar os dados de membros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* ===== Seção Membros ===== */}
      <div className="space-y-8">
        <div>
          <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-analytics-title">
            Analytics
          </h1>
          <p className="text-lg text-muted-foreground">
            Visão geral dos membros da igreja
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Membros
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-members">
                {analytics.totalMembers}
              </div>
              <p className="text-xs text-muted-foreground">
                Membros cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Novos Membros
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-recent-members">
                {analytics.recentMembersCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Crescimento
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.totalMembers > 0 
                  ? ((analytics.recentMembersCount / analytics.totalMembers) * 100).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Taxa de novos membros
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Age Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Idade</CardTitle>
              <CardDescription>
                Membros por faixa etária
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.membersByAge}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageGroup" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1E40AF" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Neighborhood Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Top Bairros</CardTitle>
              <CardDescription>
                Membros por bairro (Top 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.membersByNeighborhood}
                    dataKey="count"
                    nameKey="neighborhood"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.neighborhood}: ${entry.count}`}
                  >
                    {analytics.membersByNeighborhood.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profession Distribution */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Top Profissões</CardTitle>
              <CardDescription>
                Membros por profissão (Top 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.membersByProfession} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="profession" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== Seção Visitantes ===== */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">Visitantes</h2>
          <p className="text-muted-foreground">Visão dos visitantes (últimos cadastros e origem)</p>
        </div>

        {visitorsLoading ? (
          <p className="text-muted-foreground">Carregando visitantes...</p>
        ) : (
          <>
            {visitorsError && (
              <p className="text-amber-600">Não foi possível carregar dados atualizados. Exibindo valores padrão.</p>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total de Visitantes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{visitorsData.totalVisitors}</div>
                  <p className="text-xs text-muted-foreground">Visitantes cadastrados</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Membrou-se</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{visitorsData.visitorsMembrouSe}</div>
                  <p className="text-xs text-muted-foreground">Visitantes que se tornaram membros</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Novos Visitantes (30 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{visitorsData.recentVisitorsCount}</div>
                  <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Por Culto</CardTitle>
                  <CardDescription>Distribuição por culto</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={visitorsData.visitorsByCulto}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="culto" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1E40AF" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Como Conheceu</CardTitle>
                  <CardDescription>Origem dos visitantes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={visitorsData.visitorsByOrigem}
                        dataKey="count"
                        nameKey="origem"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.origem}: ${entry.count}`}
                      >
                        {visitorsData.visitorsByOrigem.map((entry, index) => (
                          <Cell key={`cell-origem-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* ===== Seção Geral ===== */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">Geral</h2>
          <p className="text-muted-foreground">Membros + Visitantes</p>
        </div>

        {generalLoading ? (
          <p className="text-muted-foreground">Carregando geral...</p>
        ) : (
          <>
            {generalError && (
              <p className="text-amber-600">Não foi possível carregar dados atualizados. Exibindo valores padrão.</p>
            )}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Total Pessoas</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{generalData.totalPeople}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Membros</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{generalData.totalMembers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Visitantes</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{generalData.totalVisitors}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Visitantes que Membrou-se</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{generalData.visitorsMembrouSe}</div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
