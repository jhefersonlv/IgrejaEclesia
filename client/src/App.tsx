import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import { MemberLayout } from "@/components/member-layout";
import { AdminLayout } from "@/components/admin-layout";
import MemberDashboard from "@/pages/member-dashboard";
import MemberCourses from "@/pages/member-courses";
import MemberMaterials from "@/pages/member-materials";
import MemberVideos from "@/pages/member-videos";
import MemberProfile from "@/pages/member-profile";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminMembers from "@/pages/admin-members";
import AdminCourses from "@/pages/admin-courses";
import AdminEvents from "@/pages/admin-events";
import AdminMaterials from "@/pages/admin-materials";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      
      {/* Member Routes */}
      <Route path="/membro">
        <MemberLayout>
          <MemberDashboard />
        </MemberLayout>
      </Route>
      <Route path="/membro/cursos">
        <MemberLayout>
          <MemberCourses />
        </MemberLayout>
      </Route>
      <Route path="/membro/apostilas">
        <MemberLayout>
          <MemberMaterials />
        </MemberLayout>
      </Route>
      <Route path="/membro/videos">
        <MemberLayout>
          <MemberVideos />
        </MemberLayout>
      </Route>
      <Route path="/membro/perfil">
        <MemberLayout>
          <MemberProfile />
        </MemberLayout>
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin">
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </Route>
      <Route path="/admin/members">
        <AdminLayout>
          <AdminMembers />
        </AdminLayout>
      </Route>
      <Route path="/admin/courses">
        <AdminLayout>
          <AdminCourses />
        </AdminLayout>
      </Route>
      <Route path="/admin/events">
        <AdminLayout>
          <AdminEvents />
        </AdminLayout>
      </Route>
      <Route path="/admin/materials">
        <AdminLayout>
          <AdminMaterials />
        </AdminLayout>
      </Route>
      
      {/* 404 Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
