import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { AlertCircle, ArrowRight, Calendar, Eye, Loader2, TrendingDown, TrendingUp, Video } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

type SortBy = "ctr" | "cpc" | "conversions" | "roas";

export default function Rankings() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    since: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    until: format(new Date(), "yyyy-MM-dd"),
  });
  const [sortBy, setSortBy] = useState<SortBy>("ctr");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAdForModal, setSelectedAdForModal] = useState<any>(null);

  const { data: credentials } = trpc.metaAds.getCredentials.useQuery();

  const { data: rankings, isLoading } = trpc.metaAds.getRankings.useQuery(
    { timeRange: dateRange, sortBy, limit: 20 },
    { enabled: !!credentials }
  );

  const { data: creative, isLoading: loadingCreative } = trpc.metaAds.getAdCreative.useQuery(
    { adId: selectedAdForModal?.ad_id! },
    { enabled: !!selectedAdForModal }
  );

  const openDetailsModal = (ad: any) => {
    setSelectedAdForModal(ad);
    setDetailsModalOpen(true);
  };

  // Video metrics are not available from Meta Ads API Insights endpoint

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
              Necesitas configurar tus credenciales de Meta Ads API para ver los rankings
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
            <h1 className="text-3xl font-bold text-foreground">Rankings de Anuncios</h1>
            <p className="text-muted-foreground mt-1">Anuncios con mejor rendimiento</p>
          </div>

          {/* Date Range Selector */}
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

        {/* Rankings Tabs */}
        <Tabs defaultValue="ctr" onValueChange={(value) => setSortBy(value as SortBy)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ctr">Mejor CTR</TabsTrigger>
            <TabsTrigger value="cpc">Menor CPC</TabsTrigger>
            <TabsTrigger value="conversions">Más Conversiones</TabsTrigger>
            <TabsTrigger value="roas">Mejor ROAS</TabsTrigger>
          </TabsList>

          <TabsContent value={sortBy} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {sortBy === "ctr" && "Anuncios con Mejor CTR"}
                  {sortBy === "cpc" && "Anuncios con Menor CPC"}
                  {sortBy === "conversions" && "Anuncios con Más Conversiones"}
                  {sortBy === "roas" && "Anuncios con Mejor ROAS"}
                </CardTitle>
                <CardDescription>Top 20 anuncios ordenados por rendimiento</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : rankings && rankings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Nombre del Anuncio</TableHead>
                          <TableHead>Campaña</TableHead>
                          <TableHead className="text-right">Impresiones</TableHead>
                          <TableHead className="text-right">Clics</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                          <TableHead className="text-right">CPC</TableHead>
                          <TableHead className="text-right">Gasto</TableHead>
                          {sortBy === "conversions" && (
                            <TableHead className="text-right">Conversiones</TableHead>
                          )}
                          {sortBy === "roas" && <TableHead className="text-right">ROAS</TableHead>}
                          <TableHead className="text-center">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankings.map((ad: any, index: number) => (
                          <TableRow key={ad.ad_id || index}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {ad.ad_name || "Sin nombre"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ad.campaign_name || "Sin campaña"}
                            </TableCell>
                            <TableCell className="text-right">
                              {parseInt(ad.impressions || "0", 10).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {parseInt(ad.clicks || "0", 10).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {parseFloat(ad.ctr || "0") > 2 ? (
                                  <TrendingUp className="h-3 w-3 text-green-500" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-yellow-500" />
                                )}
                                {parseFloat(ad.ctr || "0").toFixed(2)}%
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ${parseFloat(ad.cpc || "0").toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${parseFloat(ad.spend || "0").toFixed(2)}
                            </TableCell>
                            {sortBy === "conversions" && (
                              <TableCell className="text-right font-bold text-green-500">
                                {ad.conversions || 0}
                              </TableCell>
                            )}
                            {sortBy === "roas" && (
                              <TableCell className="text-right font-bold text-green-500">
                                {ad.roas ? ad.roas.toFixed(2) : "0.00"}x
                              </TableCell>
                            )}
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetailsModal(ad)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No hay datos disponibles para el rango de fechas seleccionado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
              {loadingCreative ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : creative ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Creativo</h3>
                  
                  {creative.thumbnail_url && (
                    <div>
                      <div className="relative">
                        <img
                          src={creative.thumbnail_url}
                          alt="Video thumbnail"
                          className="w-full rounded-lg border border-border max-h-64 object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                          <div className="bg-black/50 rounded-full p-3">
                            <Video className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
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
              ) : null}

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
