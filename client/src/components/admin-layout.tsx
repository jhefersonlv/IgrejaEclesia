import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Church, Users, GraduationCap, Calendar, BookOpen, LogOut, Home, Heart, BarChart3, ShieldCheck, CalendarDays } from "lucide-react";
import type { User } from "@shared/schema";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Mapa: chave do módulo → item de nav
const NAV_MODULOS = [
  { chave: "membros",    path: "/admin/members",     icon: Users,        label: "Membros" },
  { chave: "visitantes", path: "/admin/visitors",    icon: Users,        label: "Visitantes" },
  { chave: "analytics",  path: "/admin/analytics",   icon: BarChart3,    label: "Analytics" },
  { chave: "cursos",     path: "/admin/courses",     icon: GraduationCap,label: "Cursos" },
  { chave: "eventos",    path: "/admin/events",      icon: Calendar,     label: "Eventos" },
  { chave: "escalas",   path: "/admin/escalas",     icon: CalendarDays, label: "Escalas" },
  { chave: "materiais",  path: "/admin/materials",   icon: BookOpen,     label: "Materiais" },
  { chave: "oracoes",    path: "/admin/prayers",     icon: Heart,        label: "Orações" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) { setLocation("/login"); return; }
    setUser(JSON.parse(userData));
  }, [setLocation]);

  // Verifica cargos frescos do servidor (não depende do localStorage)
  const { data: cargosData, isLoading: cargosLoading } = useQuery<{ cargos: string[] }>({
    queryKey: ["/api/meus-cargos"],
    enabled: !!user,
  });

  const { data: modulosData } = useQuery<{ modulos: string[] }>({
    queryKey: ["/api/meus-modulos"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || cargosLoading || !cargosData) return;
    const cargos = cargosData.cargos;
    if (!cargos.includes("admin") && !cargos.includes("lider")) {
      setLocation("/membro");
      return;
    }
    setChecked(true);
  }, [user, cargosData, cargosLoading, setLocation]);

  const meusModulos = modulosData?.modulos ?? [];
  const isAdmin = (cargosData?.cargos ?? []).includes("admin");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLocation("/");
  };

  if (!user || !checked) return null;

  // Admin vê tudo; líderes veem apenas os módulos liberados
  const navItems = isAdmin
    ? [
        { path: "/admin",             icon: Home,        label: "Dashboard" },
        ...NAV_MODULOS,
        { path: "/admin/permissions", icon: ShieldCheck, label: "Permissões" },
        { path: "/membro",            icon: Church,      label: "Área de Membros" },
      ]
    : [
        { path: "/admin",   icon: Home,   label: "Dashboard" },
        ...NAV_MODULOS.filter(item => meusModulos.includes(item.chave)),
        { path: "/membro",  icon: Church, label: "Área de Membros" },
      ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Church className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-sans font-semibold text-lg">
                {isAdmin ? "Painel Administrativo" : "Painel do Líder"}
              </h1>
              <p className="text-sm text-muted-foreground">Olá, {user.nome}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
        <nav className="flex gap-1 px-6 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant={location === item.path ? "secondary" : "ghost"}
                className="gap-2 whitespace-nowrap"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </header>
      <main className="p-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
