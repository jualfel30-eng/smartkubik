import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ActivityTimeline } from './ActivityTimeline';
import {
  Building,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  User,
  MapPin,
  FileText,
  Briefcase,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';

const OpportunityInfoItem = ({ icon: Icon, label, value }) => {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
};

export function OpportunityDetailDialog({ open, onOpenChange, opportunity: initialOpportunity, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [opportunity, setOpportunity] = useState(initialOpportunity);

  useEffect(() => {
    if (open && initialOpportunity?._id) {
      // Set initial first to avoid flicker if we have some data
      setOpportunity(initialOpportunity);

      // Then fetch fresh populated data
      fetchApi(`/opportunities/${initialOpportunity._id}`)
        .then(res => setOpportunity(res.data || res))
        .catch(err => console.error("Error fetching opportunity details:", err));
    }
  }, [open, initialOpportunity]);

  if (!opportunity) return null;

  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {opportunity.company || 'Sin nombre'}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-2">
                <Badge variant={opportunity.stage === 'Cierre ganado' ? 'default' : 'secondary'}>
                  {opportunity.stage}
                </Badge>
                {opportunity.pipeline && (
                  <Badge variant="outline">{opportunity.pipeline}</Badge>
                )}
              </DialogDescription>
            </div>
            {opportunity.amount && (
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatCurrency(opportunity.amount, opportunity.currency)}
                </p>
                <p className="text-sm text-muted-foreground">Valor estimado</p>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="activities">Actividades</TabsTrigger>
            <TabsTrigger value="finance">Finanzas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <OpportunityInfoItem
                  icon={Building}
                  label="Empresa"
                  value={opportunity.company}
                />
                <OpportunityInfoItem
                  icon={User}
                  label="Contacto"
                  value={opportunity.contactName}
                />
                <OpportunityInfoItem
                  icon={Mail}
                  label="Email"
                  value={opportunity.email}
                />
                <OpportunityInfoItem
                  icon={Phone}
                  label="Teléfono"
                  value={opportunity.phone}
                />
                <OpportunityInfoItem
                  icon={Tag}
                  label="Fuente"
                  value={opportunity.source}
                />
                <OpportunityInfoItem
                  icon={User}
                  label="Responsable"
                  value={opportunity.ownerId?.name || 'No asignado'}
                />
              </CardContent>
            </Card>

            {opportunity.nextStepDue && (
              <Card className={new Date(opportunity.nextStepDue) < new Date() ? 'border-destructive' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className={`w-5 h-5 ${new Date(opportunity.nextStepDue) < new Date() ? 'text-destructive' : ''}`} />
                    Próximo Paso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{opportunity.nextStep}</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Vence: {formatDate(opportunity.nextStepDue)}
                      </p>
                      {new Date(opportunity.nextStepDue) < new Date() && (
                        <Badge variant="destructive">Vencido</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {opportunity.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{opportunity.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Información de Calificación</CardTitle>
                <CardDescription>Datos BANT y de descubrimiento</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <OpportunityInfoItem
                  icon={AlertCircle}
                  label="Dolor/Necesidad"
                  value={opportunity.painNeed}
                />
                <OpportunityInfoItem
                  icon={DollarSign}
                  label="Budget Fit"
                  value={opportunity.budgetFit}
                />
                <OpportunityInfoItem
                  icon={User}
                  label="Decision Maker"
                  value={opportunity.decisionMaker}
                />
                <OpportunityInfoItem
                  icon={Calendar}
                  label="Timeline"
                  value={opportunity.timeline}
                />
                <OpportunityInfoItem
                  icon={Calendar}
                  label="Fecha de Cierre Estimada"
                  value={formatDate(opportunity.expectedCloseDate)}
                />
                <OpportunityInfoItem
                  icon={MapPin}
                  label="Ubicación"
                  value={opportunity.location}
                />
              </CardContent>
            </Card>

            {(opportunity.stakeholders?.length > 0 ||
              opportunity.useCases?.length > 0 ||
              opportunity.risks?.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Descubrimiento Técnico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {opportunity.stakeholders?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Stakeholders
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {opportunity.stakeholders.map((stakeholder, i) => (
                            <Badge key={i} variant="outline">
                              {stakeholder}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {opportunity.useCases?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Casos de Uso
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {opportunity.useCases.map((useCase, i) => (
                            <Badge key={i} variant="outline">
                              {useCase}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {opportunity.risks?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Riesgos
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {opportunity.risks.map((risk, i) => (
                            <Badge key={i} variant="destructive">
                              {risk}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            {opportunity.stage === 'Cierre perdido' && opportunity.reasonLost && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Razón de Pérdida</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{opportunity.reasonLost}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            <ActivityTimeline opportunityId={opportunity._id} />
          </TabsContent>

          <TabsContent value="finance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentos Financieros</CardTitle>
                <CardDescription>Cotizaciones y facturas asociadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={loading}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await fetchApi(`/opportunities/${opportunity._id}/quote`, { method: 'POST' });
                        toast.success('Cotización generada exitosamente');
                        if (onRefresh) onRefresh();
                      } catch (error) {
                        toast.error(error.message || 'Error generando cotización');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {loading ? 'Generando...' : 'Generar Cotización'}
                  </Button>
                  <Button
                    variant="default"
                    className="w-full sm:w-auto"
                    disabled={loading || (opportunity.stage !== 'Cierre ganado' && opportunity.stage !== 'Propuesta' && opportunity.stage !== 'Negociación')}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await fetchApi(`/opportunities/${opportunity._id}/invoice`, { method: 'POST' });
                        toast.success('Factura generada exitosamente');
                        if (onRefresh) onRefresh();
                      } catch (error) {
                        toast.error(error.message || 'Error generando factura');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    {loading ? 'Generando...' : 'Generar Factura'}
                  </Button>
                </div>

                {/* List of generated documents */}
                {(!opportunity.quoteIds?.length && !opportunity.invoiceIds?.length) ? (
                  <div className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                    No hay documentos generados aún.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {opportunity.quoteIds?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Cotizaciones</h4>
                        <div className="space-y-2">
                          {opportunity.quoteIds.map((doc) => (
                            <div key={doc._id || doc} className="flex items-center justify-between p-2 border rounded-md text-sm">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span>{typeof doc === 'object' ? `Cotización ${doc.series}-${doc.number}` : 'Cargando...'}</span>
                              </div>
                              {typeof doc === 'object' && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {doc.total} {doc.currency}
                                  </span>
                                  <Badge variant="outline">{doc.status}</Badge>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {opportunity.invoiceIds?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Facturas</h4>
                        <div className="space-y-2">
                          {opportunity.invoiceIds.map((doc) => (
                            <div key={doc._id || doc} className="flex items-center justify-between p-2 border rounded-md text-sm">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                <span>{typeof doc === 'object' ? `Factura ${doc.controlNumber || '#'}` : 'Cargando...'}</span>
                              </div>
                              {typeof doc === 'object' && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {doc.total} {doc.currency}
                                  </span>
                                  <Badge variant="outline">{doc.status}</Badge>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
