import React, { useState } from 'react';
import { useActivities } from '../hooks/use-activities';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  CheckSquare,
  FileText,
  Loader2,
  Plus,
  Check,
  X,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

const ACTIVITY_ICONS = {
  email: Mail,
  call: Phone,
  meeting: Calendar,
  whatsapp: MessageSquare,
  task: CheckSquare,
  note: FileText,
  calendar_event: Calendar,
};

const ACTIVITY_COLORS = {
  email: 'bg-blue-500',
  call: 'bg-green-500',
  meeting: 'bg-purple-500',
  whatsapp: 'bg-emerald-500',
  task: 'bg-orange-500',
  note: 'bg-gray-500',
  calendar_event: 'bg-indigo-500',
};

const ACTIVITY_TYPE_LABELS = {
  email: 'Email',
  call: 'Llamada',
  meeting: 'Reunión',
  whatsapp: 'WhatsApp',
  task: 'Tarea',
  note: 'Nota',
  calendar_event: 'Evento de Calendario',
};

export function ActivityTimeline({ opportunityId }) {
  const { activities, loading, createActivity, markAsCompleted } = useActivities(opportunityId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'note',
    subject: '',
    body: '',
    direction: 'outbound',
  });

  const handleAddActivity = async () => {
    await createActivity({
      ...newActivity,
      opportunityId,
    });
    setNewActivity({
      type: 'note',
      subject: '',
      body: '',
      direction: 'outbound',
    });
    setShowAddForm(false);
  };

  const handleMarkCompleted = async (activityId) => {
    await markAsCompleted(activityId);
  };

  const groupByThread = (activities) => {
    const threads = {};
    const standalone = [];

    activities.forEach((activity) => {
      if (activity.threadId) {
        if (!threads[activity.threadId]) {
          threads[activity.threadId] = [];
        }
        threads[activity.threadId].push(activity);
      } else {
        standalone.push(activity);
      }
    });

    return { threads, standalone };
  };

  const { threads, standalone } = groupByThread(activities);

  const renderActivityItem = (activity, isInThread = false) => {
    const Icon = ACTIVITY_ICONS[activity.type] || FileText;
    const color = ACTIVITY_COLORS[activity.type] || 'bg-gray-500';
    const isCompleted = activity.status === 'completed';

    return (
      <div
        key={activity._id}
        className={`flex gap-4 ${isInThread ? 'ml-8' : ''}`}
      >
        <div className="flex flex-col items-center">
          <div
            className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white`}
          >
            <Icon className="w-5 h-5" />
          </div>
          {!isInThread && <div className="w-0.5 flex-1 bg-border mt-2" />}
        </div>

        <div className="flex-1 pb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{activity.subject || 'Sin asunto'}</p>
                {activity.direction && (
                  <Badge variant="outline" className="text-xs">
                    {activity.direction === 'inbound' ? '↓ Entrante' : '↑ Saliente'}
                  </Badge>
                )}
                {isCompleted && (
                  <Badge className="bg-green-500 text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    Completada
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(activity.createdAt).toLocaleString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {activity.type === 'task' && !isCompleted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkCompleted(activity._id)}
              >
                <Check className="w-4 h-4 mr-2" />
                Completar
              </Button>
            )}
          </div>

          {activity.body && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {activity.body}
            </p>
          )}

          {activity.type === 'task' && activity.taskDueDate && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                Vence: {new Date(activity.taskDueDate).toLocaleDateString('es-ES')}
              </Badge>
            </div>
          )}

          {activity.type === 'meeting' && activity.meetingStartTime && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {new Date(activity.meetingStartTime).toLocaleString('es-ES')} -{' '}
                {new Date(activity.meetingEndTime).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Badge>
              {activity.meetingLocation && (
                <Badge variant="outline" className="text-xs">
                  📍 {activity.meetingLocation}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Actividades</CardTitle>
            <CardDescription>
              Historial de interacciones y tareas
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
            {showAddForm ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showAddForm && (
          <Card className="mb-6 bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="activityType">Tipo de actividad</Label>
                    <Select
                      value={newActivity.type}
                      onValueChange={(value) =>
                        setNewActivity((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger id="activityType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="activityDirection">Dirección</Label>
                    <Select
                      value={newActivity.direction}
                      onValueChange={(value) =>
                        setNewActivity((prev) => ({ ...prev, direction: value }))
                      }
                    >
                      <SelectTrigger id="activityDirection">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">Entrante</SelectItem>
                        <SelectItem value="outbound">Saliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="activitySubject">Asunto</Label>
                  <Input
                    id="activitySubject"
                    value={newActivity.subject}
                    onChange={(e) =>
                      setNewActivity((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Ej: Llamada de seguimiento"
                  />
                </div>

                <div>
                  <Label htmlFor="activityBody">Detalles</Label>
                  <Textarea
                    id="activityBody"
                    value={newActivity.body}
                    onChange={(e) =>
                      setNewActivity((prev) => ({ ...prev, body: e.target.value }))
                    }
                    placeholder="Describe la actividad..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddActivity}
                    disabled={!newActivity.subject || !newActivity.body}
                  >
                    Guardar Actividad
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay actividades registradas</p>
            <p className="text-sm mt-2">
              Agrega tu primera actividad para comenzar el seguimiento
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Render threaded conversations */}
            {Object.entries(threads).map(([threadId, threadActivities]) => (
              <Collapsible key={threadId} defaultOpen={true}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-5 h-5 text-muted-foreground" />
                          <div className="text-left">
                            <CardTitle className="text-base">
                              Conversación: {threadActivities[0]?.subject || 'Sin asunto'}
                            </CardTitle>
                            <CardDescription>
                              {threadActivities.length} mensaje(s)
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {new Date(
                            threadActivities[threadActivities.length - 1]?.createdAt,
                          ).toLocaleDateString('es-ES')}
                        </Badge>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      {threadActivities
                        .sort(
                          (a, b) =>
                            new Date(a.createdAt) - new Date(b.createdAt),
                        )
                        .map((activity) => renderActivityItem(activity, true))}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}

            {/* Render standalone activities */}
            {standalone
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((activity) => renderActivityItem(activity, false))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
