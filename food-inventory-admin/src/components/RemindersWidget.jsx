import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Bell, Mail, MessageSquare, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';

const REMINDER_TYPE_LABELS = {
  next_step_due: 'Próximo paso vence',
  aging_alert: 'Oportunidad estancada',
  mql_response: 'MQL sin respuesta',
  calendar_event: 'Evento de calendario',
  custom: 'Personalizado',
};

const REMINDER_ICONS = {
  next_step_due: Clock,
  aging_alert: AlertTriangle,
  mql_response: Mail,
  calendar_event: Bell,
  custom: Bell,
};

const CHANNEL_ICONS = {
  email: Mail,
  whatsapp: MessageSquare,
  in_app: Bell,
};

export function RemindersWidget() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | pending | sent

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/reminders');
      setReminders(response.data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast.error('Error al cargar recordatorios');
    } finally {
      setLoading(false);
    }
  };

  const markAsSent = async (id) => {
    try {
      await fetchApi(`/reminders/${id}/mark-sent`, { method: 'POST' });
      toast.success('Recordatorio marcado como enviado');
      await fetchReminders();
    } catch (error) {
      console.error('Error marking reminder as sent:', error);
      toast.error('Error al marcar recordatorio');
    }
  };

  const filteredReminders = reminders.filter((reminder) => {
    if (filter === 'pending') return reminder.status === 'pending';
    if (filter === 'sent') return reminder.status === 'sent';
    return true;
  });

  const pendingCount = reminders.filter((r) => r.status === 'pending').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Recordatorios
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Notificaciones programadas</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos ({reminders.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pendientes ({pendingCount})
          </Button>
          <Button
            variant={filter === 'sent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('sent')}
          >
            Enviados ({reminders.filter((r) => r.status === 'sent').length})
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Cargando...</p>
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay recordatorios {filter !== 'all' ? filter + 's' : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReminders
              .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
              .map((reminder) => {
                const Icon = REMINDER_ICONS[reminder.type] || Bell;
                const isPending = reminder.status === 'pending';
                const isOverdue =
                  isPending && new Date(reminder.scheduledFor) < new Date();

                return (
                  <div
                    key={reminder._id}
                    className={`p-4 border rounded-lg ${
                      isOverdue ? 'border-destructive bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon
                          className={`w-5 h-5 mt-0.5 ${
                            isOverdue ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">
                              {REMINDER_TYPE_LABELS[reminder.type] || reminder.type}
                            </p>
                            {isPending ? (
                              <Badge
                                variant={isOverdue ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {isOverdue ? 'Vencido' : 'Pendiente'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Enviado
                              </Badge>
                            )}
                          </div>

                          {reminder.message && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {reminder.message}
                            </p>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(reminder.scheduledFor).toLocaleString('es-ES', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Badge>

                            {reminder.channels?.map((channel) => {
                              const ChannelIcon = CHANNEL_ICONS[channel] || Bell;
                              return (
                                <Badge key={channel} variant="outline" className="text-xs">
                                  <ChannelIcon className="w-3 h-3 mr-1" />
                                  {channel}
                                </Badge>
                              );
                            })}

                            {reminder.opportunity && (
                              <Badge variant="outline" className="text-xs">
                                {reminder.opportunity.company || 'Oportunidad'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {isPending && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsSent(reminder._id)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
