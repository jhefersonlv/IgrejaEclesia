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
} from "@/components/ui/sidebar";
import { BookOpen, Video, GraduationCap, User, LogOut, Church, CalendarDays } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  userNome?: string;
  isLider?: boolean;
}

export function AppSidebar({ userNome, isLider }: AppSidebarProps) {
  const [location, setLocation] = useLocation();

  const items = [
    {
      title: "Dashboard",
      url: "/membro",
      icon: Church,
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
      title: "Escalas",
      url: isLider ? "/lider/escalas" : "/membro/escalas",
      icon: CalendarDays,
    },
    {
      title: "Perfil",
      url: "/membro/perfil",
      icon: User,
    },
  ];

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
            <Church className="w-6 h-6 text-primary" />
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
