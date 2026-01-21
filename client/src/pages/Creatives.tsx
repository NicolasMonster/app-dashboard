import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useDateRange } from "@/contexts/DateRangeContext";
import { AlertCircle, ArrowRight, Calendar, Image as ImageIcon, Loader2, Search, Video, X } from "lucide-react";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Link } from "wouter";

export default function Creatives() {
  const { user } = useAuth();
  const { dateRange, setDateRange, dateError } = useDateRange();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAdForModal, setSelectedAdForModal] = useState<any>(null);

  const { data: credentials } = trpc.metaAds.getCredentials.useQuery();

  const { data: insights, isLoading: loadingInsights } = trpc.metaAds.getInsights.useQuery(
    { timeRange: dateRange, level: "ad" },
    { enabled: !!credentials }
  );

  const { data: creative, isLoading: loadingCreative } = trpc.metaAds.getAdCreative.useQuery(
    { adId: selectedAdId! },
    { enabled: !!selectedAdId }
  );

  // Filter ads by search query
  const filteredAds = insights?.filter((ad: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ad.ad_name?.toLowerCase().includes(query) ||
      ad.campaign_name?.toLowerCase().includes(query) ||
      ad.ad_id?.includes(query)
    );
  });

  const openDetailsModal = (ad: any) => {
    setSelectedAdForModal(ad);
    setDetailsModalOpen(true);
  };

  // Calculate video retention metrics
  const getVideoRetentionMetrics = (ad: any) => {
    // Extract video metrics from the API response
    const videoPlays = ad.video_play_actions?.[0]?.value ? parseInt(ad.video_play_actions[0].value, 10) : 0;
    const thruplays = ad.video_thruplay_watched_actions?.[0]?.value ? parseInt(ad.video_thruplay_watched_actions[0].value, 10) : 0;
    const avgTimeWatched = ad.video_avg_time_watched_actions?.[0]?.value ? parseFloat(ad.video_avg_time_watched_actions[0].value) : 0;
    const p50 = ad.video_p50_watched_actions?.[0]?.value ? parseInt(ad.video_p50_watched_actions[0].value, 10) : 0;
    const p100 = ad.video_p100_watched_actions?.[0]?.value ? parseInt(ad.video_p100_watched_actions[0].value, 10) : 0;

    return {
      videoPlays,
      thruplays,
      avgTimeWatched,
      p50,
      p100,
      hasVideoData: videoPlays > 0 || thruplays > 0 || p50 > 0 || p100 > 0,
    };
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para acceder a esta página</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!credentials) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <CardTitle className="text-yellow-500">Configuración Requerida</CardTitle>
            </div>
            <CardDescription>
              Necesitas configurar tus credenciales de Meta Ads API para ver los creativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings">
              <Button className="w-full">
                Ir a Configuración
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Creativos de Anuncios</h1>
            <p className="text-muted-foreground mt-1">Visualiza el contenido de tus anuncios</p>
          </div>

          {/* Date Range Selector with Calendar */}
          <Card className="md:w-auto">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm text-muted-foreground">Desde:</label>
                  <input
                    type="date"
                    value={dateRange.since}
                    onChange={(e) => setDateRange({ ...dateRange, since: e.target.value })}
                    className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Hasta:</label>
                  <input
                    type="date"
                    value={dateRange.until}
                    onChange={(e) => setDateRange({ ...dateRange, until: e.target.value })}
                    className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de anuncio, campaña o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ads Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ads List */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Anuncios</CardTitle>
              <CardDescription>
                {filteredAds?.length || 0} anuncios encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInsights ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAds && filteredAds.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredAds.map((ad: any) => (
                    <button
                      key={ad.ad_id}
                      onClick={() => setSelectedAdId(ad.ad_id)}
                      className={`w-full text-left p-4 rounded-lg border transition-colors ${
                        selectedAdId === ad.ad_id
                          ? "bg-primary/10 border-primary"
                          : "bg-card border-border hover:bg-accent"
                      }`}
                    >
                      <div className="font-medium text-foreground">
                        {ad.ad_name || "Sin nombre"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Campaña: {ad.campaign_name || "Sin campaña"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        ID: {ad.ad_id}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Impresiones: {parseInt(ad.impressions || "0", 10).toLocaleString()}</span>
                        <span>Clics: {parseInt(ad.clicks || "0", 10).toLocaleString()}</span>
                        <span>CTR: {parseFloat(ad.ctr || "0").toFixed(2)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No se encontraron anuncios
                </div>
              )}
            </CardContent>
          </Card>

          {/* Creative Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Creativo</CardTitle>
              <CardDescription>
                {selectedAdId ? "Contenido del anuncio seleccionado" : "Selecciona un anuncio para ver su creativo"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedAdId ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
                  <p>Selecciona un anuncio de la lista para ver su contenido</p>
                </div>
              ) : loadingCreative ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : creative ? (
                <div className="space-y-4">
                  {/* Creative Name */}
                  {creative.name && (
                    <div>
                      <Label className="text-muted-foreground">Nombre</Label>
                      <p className="text-foreground font-medium">{creative.name}</p>
                    </div>
                  )}

                  {/* Title */}
                  {creative.title && (
                    <div>
                      <Label className="text-muted-foreground">Título</Label>
                      <p className="text-foreground font-medium">{creative.title}</p>
                    </div>
                  )}

                  {/* Body Text */}
                  {creative.body && (
                    <div>
                      <Label className="text-muted-foreground">Texto del Anuncio</Label>
                      <p className="text-foreground">{creative.body}</p>
                    </div>
                  )}

                  {/* Image */}
                  {creative.image_url && (
                    <div>
                      <Label className="text-muted-foreground mb-2 block">Imagen</Label>
                      <img
                        src={creative.image_url}
                        alt="Ad creative"
                        className="w-full rounded-lg border border-border"
                      />
                    </div>
                  )}



                  {/* Video Thumbnail */}
                  {creative.thumbnail_url && (
                    <div>
                      <Label className="text-muted-foreground mb-2 block">Video (Miniatura)</Label>
                      <div className="relative">
                        <img
                          src={creative.thumbnail_url}
                          alt="Video thumbnail"
                          className="w-full rounded-lg border border-border"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/50 rounded-full p-4">
                            <Video className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      </div>
                      {creative.video_id && (
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          Video ID: {creative.video_id}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Video Retention Metrics */}
                  {selectedAdId && insights && (() => {
                    const ad = insights.find((a: any) => a.ad_id === selectedAdId);
                    if (!ad) return null;
                    const metrics = getVideoRetentionMetrics(ad);
                    if (!metrics.hasVideoData) return null;

                    const formatTime = (seconds: number) => {
                      if (seconds < 60) return `${seconds.toFixed(1)}s`;
                      const mins = Math.floor(seconds / 60);
                      const secs = Math.round(seconds % 60);
                      return `${mins}m ${secs}s`;
                    };

                    return (
                      <div className="space-y-4 p-4 bg-accent/20 rounded-lg border border-border">
                        <h3 className="font-semibold text-foreground">📊 Métricas de Retención de Video</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          {metrics.videoPlays > 0 && (
                            <div className="bg-background p-3 rounded border border-border">
                              <Label className="text-xs text-muted-foreground">Vistas 3s (Hook / Scroll-Stop)</Label>
                              <p className="text-lg font-bold text-foreground mt-1">{metrics.videoPlays.toLocaleString()}</p>
                            </div>
                          )}
                          {metrics.thruplays > 0 && (
                            <div className="bg-background p-3 rounded border border-border">
                              <Label className="text-xs text-muted-foreground">ThruPlays (Retención mínima 15s)</Label>
                              <p className="text-lg font-bold text-foreground mt-1">{metrics.thruplays.toLocaleString()}</p>
                            </div>
                          )}
                          {metrics.avgTimeWatched > 0 && (
                            <div className="bg-background p-3 rounded border border-border">
                              <Label className="text-xs text-muted-foreground">Tiempo promedio visto (Calidad real)</Label>
                              <p className="text-lg font-bold text-foreground mt-1">{formatTime(metrics.avgTimeWatched)}</p>
                            </div>
                          )}
                          {metrics.p50 > 0 && (
                            <div className="bg-background p-3 rounded border border-border">
                              <Label className="text-xs text-muted-foreground">Retención 50% (Interés real)</Label>
                              <p className="text-lg font-bold text-foreground mt-1">{metrics.p50.toLocaleString()}</p>
                            </div>
                          )}
                          {metrics.p100 > 0 && (
                            <div className="bg-background p-3 rounded border border-border">
                              <Label className="text-xs text-muted-foreground">Retención 100% (Finalización)</Label>
                              <p className="text-lg font-bold text-foreground mt-1">{metrics.p100.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        {(metrics.videoPlays > 0 || metrics.thruplays > 0 || metrics.p50 > 0 || metrics.p100 > 0) && (
                          <div className="mt-4">
                            <Label className="text-xs text-muted-foreground mb-2 block">Embudo de Retención</Label>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={[
                                ...(metrics.videoPlays > 0 ? [{ name: "Vistas 3s", value: metrics.videoPlays }] : []),
                                ...(metrics.thruplays > 0 ? [{ name: "ThruPlays", value: metrics.thruplays }] : []),
                                ...(metrics.p50 > 0 ? [{ name: "50%", value: metrics.p50 }] : []),
                                ...(metrics.p100 > 0 ? [{ name: "100%", value: metrics.p100 }] : []),
                              ]}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#3b82f6" name="Reproducciones" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Object Story Spec */}
                  {creative.object_story_spec?.link_data && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Datos del Enlace</Label>
                      {creative.object_story_spec.link_data.message && (
                        <p className="text-sm text-foreground">
                          {creative.object_story_spec.link_data.message}
                        </p>
                      )}
                      {creative.object_story_spec.link_data.link && (
                        <a
                          href={creative.object_story_spec.link_data.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline block"
                        >
                          {creative.object_story_spec.link_data.link}
                        </a>
                      )}
                    </div>
                  )}

                  {/* View Details Button */}
                  {selectedAdId && insights && (() => {
                    const ad = insights.find((a: any) => a.ad_id === selectedAdId);
                    return ad ? (
                      <Button 
                        onClick={() => openDetailsModal(ad)}
                        className="w-full"
                      >
                        Ver Detalles Completos
                      </Button>
                    ) : null;
                  })()}

                  {/* No creative data */}
                  {!creative.name &&
                    !creative.title &&
                    !creative.body &&
                    !creative.image_url &&
                    !creative.thumbnail_url && (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No se pudo cargar el contenido del creativo</p>
                        <p className="text-xs mt-2">
                          Es posible que el anuncio no tenga permisos de acceso o haya sido eliminado
                        </p>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No se pudo cargar el creativo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAdForModal?.ad_name || "Detalles del Anuncio"}</DialogTitle>
            <DialogDescription>
              Información completa del anuncio y sus métricas
            </DialogDescription>
          </DialogHeader>

          {selectedAdForModal && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Información Básica</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">ID del Anuncio</Label>
                    <p className="text-foreground font-mono">{selectedAdForModal.ad_id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Campaña</Label>
                    <p className="text-foreground">{selectedAdForModal.campaign_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ad Set</Label>
                    <p className="text-foreground">{selectedAdForModal.adset_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cuenta</Label>
                    <p className="text-foreground">{selectedAdForModal.account_name}</p>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Métricas de Rendimiento</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Gasto</Label>
                    <p className="text-foreground font-semibold">${parseFloat(selectedAdForModal.spend || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Impresiones</Label>
                    <p className="text-foreground font-semibold">{parseInt(selectedAdForModal.impressions || "0", 10).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Clics</Label>
                    <p className="text-foreground font-semibold">{parseInt(selectedAdForModal.clicks || "0", 10).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CTR</Label>
                    <p className="text-foreground font-semibold">{parseFloat(selectedAdForModal.ctr || "0").toFixed(2)}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CPC</Label>
                    <p className="text-foreground font-semibold">${parseFloat(selectedAdForModal.cpc || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CPM</Label>
                    <p className="text-foreground font-semibold">${parseFloat(selectedAdForModal.cpm || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Alcance</Label>
                    <p className="text-foreground font-semibold">{parseInt(selectedAdForModal.reach || "0", 10).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Frecuencia</Label>
                    <p className="text-foreground font-semibold">{parseFloat(selectedAdForModal.frequency || "0").toFixed(2)}</p>
                  </div>
                </div>
              </div>



              {/* Creative Preview */}
              {creative && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Creativo</h3>
                  
                  {creative.thumbnail_url && (
                    <div>
                      <img
                        src={creative.thumbnail_url}
                        alt="Video thumbnail"
                        className="w-full rounded-lg border border-border max-h-64 object-cover"
                      />
                    </div>
                  )}

                  {creative.image_url && (
                    <div>
                      <img
                        src={creative.image_url}
                        alt="Ad creative"
                        className="w-full rounded-lg border border-border max-h-64 object-cover"
                      />
                    </div>
                  )}

                  {creative.title && (
                    <div>
                      <Label className="text-muted-foreground">Título</Label>
                      <p className="text-foreground">{creative.title}</p>
                    </div>
                  )}

                  {creative.body && (
                    <div>
                      <Label className="text-muted-foreground">Texto</Label>
                      <p className="text-foreground">{creative.body}</p>
                    </div>
                  )}

                  {creative.object_story_spec?.link_data?.link && (
                    <div>
                      <Label className="text-muted-foreground">URL del Vídeo/Enlace</Label>
                      <a
                        href={creative.object_story_spec.link_data.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all text-sm"
                      >
                        {creative.object_story_spec.link_data.link}
                      </a>
                    </div>
                  )}

                  {creative.video_id && (
                    <div>
                      <Label className="text-muted-foreground">Video ID</Label>
                      <p className="text-foreground font-mono text-sm">{creative.video_id}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Date Range */}
              <div className="text-xs text-muted-foreground">
                Período: {selectedAdForModal.date_start} a {selectedAdForModal.date_stop}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
