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
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Church className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-sans font-semibold text-base md:text-lg">
                {isAdmin ? "Painel Admin" : "Painel do Líder"}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Olá, {user.nome}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Sair</span>
          </Button>
        </div>
        <nav className="flex gap-1 px-3 md:px-6 overflow-x-auto pb-1 scrollbar-hide">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant={location === item.path ? "secondary" : "ghost"}
                className="gap-2 whitespace-nowrap px-2 md:px-3"
                size="sm"
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>
      </header>
      <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
