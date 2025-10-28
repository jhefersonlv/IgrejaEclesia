import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Church, Users, GraduationCap, Calendar, BookOpen, LogOut, Home, Heart, BarChart3 } from "lucide-react";
import type { User } from "@shared/schema";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (!parsedUser.isAdmin) {
      setLocation("/membro");
      return;
    }
    
    setUser(parsedUser);
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLocation("/");
  };

  if (!user) {
    return null;
  }

  const navItems = [
    { path: "/admin", icon: Home, label: "Dashboard" },
    { path: "/admin/members", icon: Users, label: "Membros" },
    { path: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/admin/courses", icon: GraduationCap, label: "Cursos" },
    { path: "/admin/events", icon: Calendar, label: "Eventos" },
    { path: "/admin/materials", icon: BookOpen, label: "Materiais" },
    { path: "/admin/prayers", icon: Heart, label: "Orações" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Church className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-sans font-semibold text-lg">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Olá, {user.nome}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
        <nav className="flex gap-1 px-6 overflow-x-auto">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant={location === item.path ? "secondary" : "ghost"}
                className="gap-2 whitespace-nowrap"
                data-testid={`link-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
