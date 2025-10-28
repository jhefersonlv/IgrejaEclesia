import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, PlayCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Material } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MemberVideos() {
  const [selectedVideo, setSelectedVideo] = useState<Material | null>(null);

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const videos = materials.filter(m => m.tipo === "video");

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-4xl font-semibold mb-2" data-testid="text-videos-title">
          Vídeos Privados
        </h1>
        <p className="text-lg text-muted-foreground">
          Acesse conteúdo exclusivo em vídeo
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-muted animate-pulse" />
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : videos.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="overflow-hidden hover-elevate cursor-pointer"
              onClick={() => setSelectedVideo(video)}
              data-testid={`card-video-${video.id}`}
            >
              <div className="h-48 bg-gradient-to-br from-primary/20 to-gold/20 flex items-center justify-center relative">
                <PlayCircle className="w-16 h-16 text-white drop-shadow-lg" />
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{video.titulo}</CardTitle>
                {video.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{video.descricao}</p>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-16">
          <div className="text-center">
            <Video className="w-20 h-20 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum vídeo disponível</h3>
            <p className="text-muted-foreground">
              Novos vídeos serão adicionados em breve
            </p>
          </div>
        </Card>
      )}

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedVideo?.titulo}</DialogTitle>
            {selectedVideo?.descricao && (
              <DialogDescription className="text-base">
                {selectedVideo.descricao}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedVideo && (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={getYouTubeEmbedUrl(selectedVideo.arquivoUrl)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                data-testid="video-player"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
