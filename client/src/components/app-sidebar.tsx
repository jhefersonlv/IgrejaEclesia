import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { BookOpen, Video, GraduationCap, User, LogOut, CalendarDays, Heart, Shield, Home, Users } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  userNome?: string;
  isLider?: boolean;
  isAdmin?: boolean;
  isObreiro?: boolean;
  isLouvor?: boolean;
  fotoUrl?: string;
}

export function AppSidebar({ userNome, isLider, isAdmin, isObreiro, isLouvor, fotoUrl }: AppSidebarProps) {
  const [location, setLocation] = useLocation();

  const items = [
    {
      title: "Dashboard",
      url: "/membro",
      icon: Home,
    },
    {
      title: "Cursos",
      url: "/membro/cursos",
      icon: GraduationCap,
    },
    {
      title: "Apostilas",
      url: "/membro/apostilas",
      icon: BookOpen,
    },
    {
      title: "Vídeos",
      url: "/membro/videos",
      icon: Video,
    },
    {
      title: "Pedidos de Oração",
      url: "/membro/oracoes",
      icon: Heart,
    },
    {
      title: "Perfil",
      url: "/membro/perfil",
      icon: User,
    },
  ];

  // Adicionar Visitantes se for obreiro
  if (isObreiro) {
    items.push({
      title: "Visitantes",
      url: "/membro/visitantes",
      icon: Users,
    });
  }

  // Adicionar Escalas se for obreiro OU louvor
  if (isObreiro || isLouvor) {
    items.push({
      title: "Escalas",
      url: isLider ? "/lider/escalas" : "/membro/escalas",
      icon: CalendarDays,
    });
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLocation("/");
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <img src={fotoUrl || "/logo_eclesia.png"} alt="Foto de Perfil" className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-sans font-semibold text-lg">Área do Membro</h2>
            {userNome && (
              <p className="text-sm text-muted-foreground">Olá, {userNome}</p>
            )}
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => setLocation(item.url)}
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase()}`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administração</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setLocation("/admin")}
                      isActive={location.startsWith("/admin")}
                      data-testid="link-admin"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Painel Admin</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}