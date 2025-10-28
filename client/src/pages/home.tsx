import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Mail, Phone, Church, BookOpen, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Event } from "@shared/schema";
import heroImage from "@assets/generated_images/Church_exterior_hero_image_d5bc8630.png";
import worshipImage from "@assets/generated_images/Worship_community_scene_64e8950f.png";
import bibleStudyImage from "@assets/generated_images/Bible_study_group_689038a0.png";
import fellowshipImage from "@assets/generated_images/Community_fellowship_event_1583deef.png";

export default function Home() {
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/public"],
  });

  const upcomingEvents = events.slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Church className="w-8 h-8 text-primary" />
            <div>
              <h1 className="font-sans text-xl font-semibold text-foreground">Comunidade Eclesia</h1>
              <p className="text-xs text-muted-foreground">Uma casa para todos</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#sobre" className="text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors" data-testid="link-sobre">
              Sobre
            </a>
            <a href="#cultos" className="text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors" data-testid="link-cultos">
              Cultos
            </a>
            <a href="#eventos" className="text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors" data-testid="link-eventos">
              Eventos
            </a>
            <a href="#contato" className="text-sm font-medium hover-elevate px-3 py-2 rounded-lg transition-colors" data-testid="link-contato">
              Contato
            </a>
          </nav>
          <Link href="/login">
            <Button data-testid="button-member-area">Área do Membro</Button>
          </Link>
        </div>
      </header>
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <h2 className="font-sans text-5xl md:text-6xl font-bold text-white mb-6" data-testid="text-hero-title">Bem-vindo à
           comunidade Eclesia</h2>
          <p className="text-xl md:text-2xl text-white/90 mb-8" data-testid="text-hero-subtitle">
            Um lugar de fé, esperança e amor para toda a família
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="backdrop-blur-md bg-primary/90 hover:bg-primary border border-primary-border" data-testid="button-hero-visit">
                Área do Membro
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="backdrop-blur-md bg-background/10 hover:bg-background/20 text-white border-white/30" data-testid="button-hero-contact">
              <a href="#contato">Entre em Contato</a>
            </Button>
          </div>
        </div>
      </section>
      {/* About Section */}
      <section id="sobre" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="font-sans text-4xl font-semibold mb-6 text-foreground" data-testid="text-about-title">
                Sobre Nós
              </h3>
              <p className="text-lg text-foreground/80 mb-4">
                Somos uma comunidade cristã comprometida com o ensino da Palavra de Deus e o cuidado com as pessoas. Nossa missão é criar um ambiente acolhedor onde cada pessoa possa crescer em sua fé e desenvolver relacionamentos significativos.
              </p>
              <p className="text-lg text-foreground/80 mb-6">
                Há mais de 20 anos servindo a comunidade com amor, dedicação e excelência no ministério. Oferecemos cultos, estudos bíblicos, grupos de comunhão e diversos ministérios para todas as idades.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-primary">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Comunidade Ativa</span>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <BookOpen className="w-5 h-5" />
                  <span className="font-medium">Ensino Bíblico</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src={worshipImage} alt="Culto de adoração" className="rounded-lg shadow-lg w-full h-48 object-cover" />
              <img src={bibleStudyImage} alt="Estudo bíblico" className="rounded-lg shadow-lg w-full h-48 object-cover mt-8" />
              <img src={fellowshipImage} alt="Comunhão" className="rounded-lg shadow-lg w-full h-48 object-cover col-span-2" />
            </div>
          </div>
        </div>
      </section>
      {/* Worship Schedule */}
      <section id="cultos" className="py-20 px-6 bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="font-sans text-4xl font-semibold mb-4 text-foreground" data-testid="text-schedule-title">
              Dias de Culto
            </h3>
            <p className="text-lg text-muted-foreground">Venha nos visitar e fazer parte da nossa família</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="hover-elevate" data-testid="card-schedule-wednesday">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Quarta-feira</CardTitle>
                </div>
                <CardDescription className="text-lg">Culto de Ensino</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>19:30 - 21:00</span>
                </div>
                <p className="mt-3 text-foreground/70">
                  Uma noite dedicada ao estudo aprofundado da Palavra de Deus.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-schedule-sunday">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-lg bg-gold/20">
                    <Calendar className="w-6 h-6 text-gold" />
                  </div>
                  <CardTitle className="text-2xl">Domingo</CardTitle>
                </div>
                <CardDescription className="text-lg">Culto da Família</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>10:00 - 12:00 e 18:00 - 20:00</span>
                </div>
                <p className="mt-3 text-foreground/70">
                  Celebração com toda a família em adoração e comunhão.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Events Section */}
      <section id="eventos" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="font-sans text-4xl font-semibold mb-4 text-foreground" data-testid="text-events-title">
              Próximos Eventos
            </h3>
            <p className="text-lg text-muted-foreground">Confira as atividades que estamos preparando</p>
          </div>
          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-48 bg-muted animate-pulse" />
                  <CardHeader>
                    <div className="h-6 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden hover-elevate" data-testid={`card-event-${event.id}`}>
                  {event.imagem && (
                    <div className="h-48 overflow-hidden">
                      <img src={event.imagem} alt={event.titulo} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{event.titulo}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(event.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{event.local}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/70">{event.descricao}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg text-muted-foreground">Nenhum evento programado no momento</p>
            </div>
          )}
        </div>
      </section>
      {/* Contact Section */}
      <section id="contato" className="py-20 px-6 bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="font-sans text-4xl font-semibold mb-4 text-foreground" data-testid="text-contact-title">
              Entre em Contato
            </h3>
            <p className="text-lg text-muted-foreground">Estamos aqui para você</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Endereço</h4>
                  <p className="text-foreground/70">Rua da Fé, 123 - Centro<br />São Paulo, SP - CEP 01234-567</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Telefone</h4>
                  <p className="text-foreground/70">(11) 1234-5678</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Email</h4>
                  <p className="text-foreground/70">contato@igrejacomunidade.com.br</p>
                </div>
              </div>
            </div>
            <div className="h-96 rounded-lg overflow-hidden border">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.1975988974395!2d-46.65450892464942!3d-23.561414278795984!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce59c8da0aa315%3A0xd59f9431f2c9776a!2sSão%20Paulo%2C%20SP!5e0!3m2!1spt-BR!2sbr!4v1234567890123!5m2!1spt-BR!2sbr"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-foreground/5 border-t py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Church className="w-6 h-6 text-primary" />
            <span className="font-sans font-semibold text-lg">Igreja Comunidade</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Igreja Comunidade. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
