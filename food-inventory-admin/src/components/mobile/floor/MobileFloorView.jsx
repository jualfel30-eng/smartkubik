import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFloorViewData } from '../../../hooks/useFloorViewData';
import { fetchApi } from '@/lib/api';
import { RefreshCw, User, CheckCircle, Plus } from 'lucide-react';

const STATUS_CONFIG = {
  in_service: {
    label: 'EN SERVICIO',
    dotColor: 'bg-emerald-500',
    borderColor: '#10b981',
    badgeClass: 'text-emerald-700 dark:text-emerald-300',
  },
  free: {
    label: 'LIBRE',
    dotColor: 'bg-blue-500',
    borderColor: '#60a5fa',
    badgeClass: 'text-blue-700 dark:text-blue-300',
  },
  blocked: {
    label: 'BLOQUEADO',
    dotColor: 'bg-gray-400',
    borderColor: '#9ca3af',
    badgeClass: 'text-gray-600 dark:text-gray-400',
  },
  unavailable: {
    label: 'NO DISPONIBLE',
    dotColor: 'bg-red-400',
    borderColor: '#f87171',
    badgeClass: 'text-red-600 dark:text-red-400',
  },
};

function formatMinutes(mins) {
  if (mins === null || mins === undefined) return '—';
  const abs = Math.abs(Math.round(mins));
  if (abs < 60) return `${abs}m`;
  return `${Math.floor(abs / 60)}h${abs % 60}m`;
}

function MobileFloorCard({ prof, onComplete, onWalkIn }) {
  const cfg = STATUS_CONFIG[prof.status] || STATUS_CONFIG.free;

  return (
    <div
      className="flex-none w-44 rounded-xl border-2 p-3 flex flex-col gap-2 bg-card"
      style={{ borderColor: cfg.borderColor, scrollSnapAlign: 'start' }}
    >
      {/* Status badge */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${cfg.dotColor} ${
            prof.status === 'in_service' ? 'animate-pulse' : ''
          }`}
        />
        <span className={`text-xs font-bold tracking-wide ${cfg.badgeClass}`}>
          {cfg.label}
        </span>
      </div>

      {/* Professional name */}
      <p className="font-semibold text-sm truncate">
        {prof.name || `${prof.firstName || ''} ${prof.lastName || ''}`.trim() || 'Sin nombre'}
      </p>

      {/* Status-specific info */}
      {prof.status === 'in_service' && (
        <>
          <div className="flex-1 min-h-0">
            <p className="text-xs text-muted-foreground truncate">
              {prof.booking?.client?.name || '—'}
            </p>
            <p className="text-xs truncate text-foreground/70">
              {prof.booking?.services?.map(s => s.name || s).join(', ') || '—'}
            </p>
          </div>
          <div
            className={`text-sm font-bold ${
              prof.isOvertime ? 'text-red-500' : 'text-emerald-600'
            }`}
          >
            {'\u23F1'} {prof.isOvertime ? '+' : ''}
            {formatMinutes(prof.remainingMinutes)}
          </div>
          <button
            onClick={() => onComplete(prof.booking)}
            className="w-full bg-emerald-600 text-white text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
          >
            <CheckCircle className="h-3 w-3" />
            Completar
          </button>
        </>
      )}

      {prof.status === 'free' && (
        <>
          <div className="flex-1 min-h-0">
            {prof.nextBooking ? (
              <>
                <p className="text-xs text-muted-foreground">Próx:</p>
                <p className="text-xs font-medium truncate">
                  {prof.nextBooking.client?.name || '—'}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  en {formatMinutes(prof.nextInMinutes)}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Sin citas</p>
            )}
          </div>
          <button
            onClick={() => onWalkIn(prof)}
            className="w-full border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
          >
            <Plus className="h-3 w-3" />
            Walk-in
          </button>
        </>
      )}

      {prof.status === 'blocked' && (
        <div className="flex-1">
          <p className="text-xs font-medium truncate">{prof.block?.reason || 'Bloqueado'}</p>
          <p className="text-xs text-muted-foreground">
            {prof.block?.startTime}–{prof.block?.endTime}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Vuelve en {formatMinutes(prof.returnsInMinutes)}
          </p>
        </div>
      )}

      {prof.status === 'unavailable' && (
        <p className="text-xs text-muted-foreground flex-1">No disponible hoy</p>
      )}
    </div>
  );
}

export default function MobileFloorView() {
  const { profStatuses, loading, error, summary, refresh } = useFloorViewData();
  const navigate = useNavigate();

  const handleComplete = async (booking) => {
    if (!booking?._id) return;
    try {
      await fetchApi(`/beauty-bookings/${booking._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      await refresh();
    } catch (err) {
      console.error('Complete booking error:', err);
    }
  };

  const handleWalkIn = (prof) => {
    navigate(`/appointments?walkin=1&professionalId=${prof._id}`);
  };

  return (
    <div className="flex flex-col h-full bg-background mobile-content-pad">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h1 className="font-bold text-lg">Tablero de Piso</h1>
        <button
          onClick={refresh}
          className="p-2 rounded-full hover:bg-accent active:scale-95 transition-transform"
          aria-label="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="p-4 text-red-600 text-sm">
          <p className="font-medium">Error cargando datos</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-xs underline"
          >
            Reintentar
          </button>
        </div>
      ) : profStatuses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 p-6">
          <User className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Sin profesionales configurados</p>
          <p className="text-xs text-center">Agrega profesionales en el módulo de Recursos</p>
        </div>
      ) : (
        <>
          {/* Horizontal scroll row */}
          <div
            className="flex gap-3 px-4 py-4 overflow-x-auto"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {profStatuses.map(prof => (
              <MobileFloorCard
                key={prof._id}
                prof={prof}
                onComplete={handleComplete}
                onWalkIn={handleWalkIn}
              />
            ))}
          </div>

          {/* Summary */}
          <div className="px-4 pb-4 text-xs text-muted-foreground flex gap-3 flex-wrap">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {summary.inService} en servicio
            </span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {summary.free} libres
            </span>
            <span className="text-gray-500">{summary.blocked} bloqueados</span>
            <span>{summary.pendingToday} pendientes</span>
          </div>
        </>
      )}
    </div>
  );
}
