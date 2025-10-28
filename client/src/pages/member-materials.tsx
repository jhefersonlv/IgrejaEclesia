import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Material } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MemberMaterials() {
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const pdfs = materials.filter(m => m.tipo === "pdf");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-materials-title">
          Apostilas
        </h1>
        <p className="text-lg text-muted-foreground">
          Acesse os materiais de estudo disponíveis
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="h-24 bg-muted animate-pulse rounded" />
            </Card>
          ))}
        </div>
      ) : pdfs.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {pdfs.map((material) => (
            <Card key={material.id} className="hover-elevate" data-testid={`card-material-${material.id}`}>
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{material.titulo}</CardTitle>
                  {material.descricao && (
                    <p className="text-sm text-muted-foreground">{material.descricao}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => window.open(material.arquivoUrl, '_blank')}
                  data-testid={`button-open-${material.id}`}
                >
                  Abrir PDF
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-16">
          <div className="text-center">
            <BookOpen className="w-20 h-20 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma apostila disponível</h3>
            <p className="text-muted-foreground">
              Novos materiais serão adicionados em breve
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
