import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User as UserIcon, Mail, Calendar, Briefcase, MapPin, Home } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@shared/schema";

export default function MemberProfile() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-profile-title">
          Meu Perfil
        </h1>
        <p className="text-lg text-muted-foreground">
          Suas informações de cadastro
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <UserIcon className="w-12 h-12 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl" data-testid="text-profile-name">{user.nome}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {user.isAdmin ? "Administrador" : "Membro"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium" data-testid="text-profile-email">{user.email}</p>
              </div>
            </div>

            {user.dataNascimento && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                  <p className="font-medium" data-testid="text-profile-birthdate">
                    {new Date(user.dataNascimento).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )}

            {user.profissao && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profissão</p>
                  <p className="font-medium" data-testid="text-profile-profession">{user.profissao}</p>
                </div>
              </div>
            )}

            {user.cidade && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cidade</p>
                  <p className="font-medium" data-testid="text-profile-city">
                    {user.cidade}{user.bairro && ` - ${user.bairro}`}
                  </p>
                </div>
              </div>
            )}

            {user.endereco && (
              <div className="flex items-start gap-3 md:col-span-2">
                <div className="p-2 rounded-lg bg-muted">
                  <Home className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="font-medium" data-testid="text-profile-address">{user.endereco}</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Para atualizar suas informações, entre em contato com a secretaria da igreja.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
