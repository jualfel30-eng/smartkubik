import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFloorViewData } from '../hooks/useFloorViewData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LayoutGrid, RefreshCw, Clock, User, CheckCircle, Plus } from 'lucide-react';
import { fetchApi } from '@/lib/api';

const STATUS_CONFIG = {
  in_service: {
    label: 'EN SERVICIO',
    dotColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500',
    headerBg: 'bg-emerald-50 dark:bg-emerald-950',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  free: {
    label: 'LIBRE',
    dotColor: 'bg-blue-500',
    borderColor: 'border-blue-400',
    headerBg: 'bg-blue-50 dark:bg-blue-950',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  blocked: {
    label: 'BLOQUEADO',
    dotColor: 'bg-gray-400',
    borderColor: 'border-gray-300',
    headerBg: 'bg-gray-50 dark:bg-gray-900',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  unavailable: {
    label: 'NO DISPONIBLE',
    dotColor: 'bg-red-400',
    borderColor: 'border-red-200',
    headerBg: 'bg-red-50 dark:bg-red-950',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
};

function formatMinutes(mins) {
  if (mins === null || mins === undefined) return '—';
  const abs = Math.abs(Math.round(mins));
  if (abs < 60) return `${abs} min`;
  return `${Math.floor(abs / 60)}h ${abs % 60}min`;
}

function FloorViewCard({ prof, onComplete, onWalkIn, completing }) {
  const cfg = STATUS_CONFIG[prof.status] || STATUS_CONFIG.free;

  return (
    <Card
      className={`relative overflow-hidden border-2 ${cfg.borderColor} transition-all duration-300 flex flex-col`}
    >
      {/* Header */}
      <div className={`${cfg.headerBg} px-4 py-3 border-b border-border`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor} ${prof.status === 'in_service' ? 'animate-pulse' : ''}`}
            />
            <span className={`text-xs font-bold tracking-wide ${cfg.badgeClass} px-2 py-0.5 rounded-full`}>
              {cfg.label}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">
              {prof.name || `${prof.firstName || ''} ${prof.lastName || ''}`.trim() || 'Sin nombre'}
            </p>
            {prof.speciality && (
              <p className="text-xs text-muted-foreground truncate">{prof.speciality}</p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 space-y-3">
        {prof.status === 'in_service' && prof.booking && (
          <>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</p>
              <p className="font-medium">{prof.booking.client?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Servicio</p>
              <p className="text-sm truncate">
                {prof.booking.services?.map(s => s.name || s).join(', ') || '—'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {prof.booking.startTime}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {prof.isOvertime ? 'Excedido' : 'Restante'}
                </p>
                <p
                  className={`text-sm font-bold ${
                    prof.isOvertime ? 'text-red-500' : 'text-emerald-600'
                  }`}
                >
                  {prof.isOvertime
                    ? `+${formatMinutes(prof.remainingMinutes)}`
                    : formatMinutes(prof.remainingMinutes)}
                </p>
              </div>
            </div>
          </>
        )}

        {prof.status === 'free' && (
          <>
            {prof.nextBooking ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Próximo cliente
                  </p>
                  <p className="font-medium">{prof.nextBooking.client?.name || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {prof.nextBooking.startTime} · en {formatMinutes(prof.nextInMinutes)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Servicio</p>
                  <p className="text-sm truncate">
                    {prof.nextBooking.services?.map(s => s.name || s).join(', ') || '—'}
                  </p>
                </div>
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">Sin citas pendientes</p>
                <p className="text-xs text-muted-foreground mt-1">Disponible para walk-in</p>
              </div>
            )}
          </>
        )}

        {prof.status === 'blocked' && prof.block && (
          <>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Razón</p>
              <p className="font-medium">{prof.block.reason || 'Bloqueado'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Horario</p>
              <p className="text-sm">
                {prof.block.startTime} – {prof.block.endTime}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vuelve en</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {formatMinutes(prof.returnsInMinutes)}
              </p>
            </div>
          </>
        )}

        {prof.status === 'unavailable' && (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No disponible hoy</p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {(prof.status === 'in_service' || prof.status === 'free') && (
        <div className="px-4 pb-4">
          {prof.status === 'in_service' && (
            <Button
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onComplete(prof.booking)}
              disabled={completing === prof.booking?._id}
            >
              {completing === prof.booking?._id ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Completar
            </Button>
          )}
          {prof.status === 'free' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
              onClick={() => onWalkIn(prof)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Walk-in
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default function FloorView() {
  const { profStatuses, loading, error, lastUpdated, summary, refresh } = useFloorViewData();
  const [completing, setCompleting] = useState(null);
  const navigate = useNavigate();

  const handleComplete = async (booking) => {
    if (!booking?._id) return;
    setCompleting(booking._id);
    try {
      // PATCH /beauty-bookings/{id}/status — same pattern as AppointmentsManagement
      await fetchApi(`/beauty-bookings/${booking._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      await refresh();
    } catch (err) {
      console.error('Complete booking error:', err);
    } finally {
      setCompleting(null);
    }
  };

  const handleWalkIn = (professional) => {
    navigate(`/appointments?walkin=1&professionalId=${professional._id}`);
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const secs = Math.round((new Date() - lastUpdated) / 1000);
    if (secs < 60) return `hace ${secs}s`;
    return `hace ${Math.round(secs / 60)} min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <p className="font-medium">Error cargando datos</p>
        <p className="text-sm mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            Tablero de Piso
          </h1>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Actualizado {formatLastUpdated()} · Auto-refresh cada 30s
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Actualizar
        </Button>
      </div>

      {/* Professional grid */}
      {profStatuses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Sin profesionales configurados</p>
          <p className="text-sm">Agrega profesionales en el módulo de Recursos</p>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {profStatuses.map(prof => (
            <FloorViewCard
              key={prof._id}
              prof={prof}
              onComplete={handleComplete}
              onWalkIn={handleWalkIn}
              completing={completing}
            />
          ))}
        </div>
      )}

      {/* Summary bar */}
      {profStatuses.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border flex-wrap">
          <span>
            <span className="font-semibold text-emerald-600">{summary.inService}</span> en servicio
          </span>
          <span>·</span>
          <span>
            <span className="font-semibold text-blue-600">{summary.free}</span> libres
          </span>
          <span>·</span>
          <span>
            <span className="font-semibold text-gray-500">{summary.blocked}</span> bloqueados
          </span>
          <span>·</span>
          <span>
            <span className="font-semibold">{summary.pendingToday}</span> citas pendientes hoy
          </span>
        </div>
      )}
    </div>
  );
}
