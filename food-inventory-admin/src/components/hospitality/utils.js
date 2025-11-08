export const UNASSIGNED_FLOOR_KEY = '__UNASSIGNED__';
export const UNASSIGNED_ZONE_LABEL = 'Sin zona';
export const ROOM_STATUS_LABELS = {
  available: 'Disponible',
  occupied: 'Ocupada',
  upcoming: 'Próxima',
  housekeeping: 'Housekeeping',
  maintenance: 'Mantenimiento',
};

export const ROOM_STATUS_VARIANTS = {
  available: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  occupied: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  upcoming: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  housekeeping: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  maintenance: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

export const getRoomStatusLabel = (status) =>
  ROOM_STATUS_LABELS[status] || ROOM_STATUS_LABELS.available;

export function getCountdownInfo(dateInput) {
  if (!dateInput) {
    return null;
  }
  const target = new Date(dateInput);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const now = Date.now();
  const diffMs = target.getTime() - now;
  const absMinutes = Math.round(Math.abs(diffMs) / (1000 * 60));
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const prefix = diffMs >= 0 ? 'En' : 'Hace';
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours === 0) {
    parts.push(`${minutes}m`);
  }
  const label = `${prefix} ${parts.join(' ')}`.trim();
  let status = 'future';
  if (diffMs < 0) {
    status = 'overdue';
  } else if (diffMs <= 60 * 60 * 1000) {
    status = 'soon';
  }
  return { label, status, diffMs, target };
}

export function getCountdownBadgeClass(countdown) {
  if (!countdown) {
    return 'bg-muted text-muted-foreground';
  }
  switch (countdown.status) {
    case 'soon':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-300';
    case 'overdue':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

const STATUS_NORMALIZATION = {
  available: 'available',
  vacant: 'available',
  libre: 'available',
  active: 'available',
  idle: 'available',

  occupied: 'occupied',
  busy: 'occupied',
  taken: 'occupied',

  housekeeping: 'housekeeping',
  cleaning: 'housekeeping',
  limpieza: 'housekeeping',

  maintenance: 'maintenance',
  maintenance_due: 'maintenance',
  blocked: 'maintenance',
  inactive: 'maintenance',
  on_vacation: 'maintenance',
  disabled: 'maintenance',

  upcoming: 'upcoming',
  reserved: 'upcoming',
  pending: 'upcoming',
  hold: 'upcoming',
};

const NORMALIZED_STATUSES = new Set([
  'available',
  'occupied',
  'housekeeping',
  'maintenance',
  'upcoming',
]);

export const getFloorKey = (floor) => {
  const value = (floor || '').toString().trim();
  return value || UNASSIGNED_FLOOR_KEY;
};

export const getFloorLabel = (floorKey) =>
  floorKey === UNASSIGNED_FLOOR_KEY ? 'Sin piso asignado' : floorKey;

const EVENT_STORAGE_KEY = 'hospitalityFloorplanLogs';

const safeSerialize = (value) => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn('[HospitalityLogs] No se pudo serializar el evento', error);
    return null;
  }
};

const safeParse = (value) => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[HospitalityLogs] No se pudo parsear el historial de eventos', error);
    return [];
  }
};

export function logHospitalityEvent(eventType, metadata = {}) {
  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('hospitality-floorplan-event', {
          detail: event,
        }),
      );
    } catch (error) {
      console.warn('[HospitalityLogs] No se pudo emitir el evento', error);
    }

    try {
      const storage = window?.sessionStorage;
      if (storage) {
        const history = safeParse(storage.getItem(EVENT_STORAGE_KEY));
        history.push(event);
        if (history.length > 200) {
          history.splice(0, history.length - 200);
        }
        const serialized = safeSerialize(history);
        if (serialized) {
          storage.setItem(EVENT_STORAGE_KEY, serialized);
        }
      }
    } catch (error) {
      console.info('[HospitalityLogs] (fallback)', event);
    }
  } else {
    console.info('[HospitalityLogs]', event);
  }
}

export function readHospitalityEventLog() {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storage = window?.sessionStorage;
    if (!storage) {
      return [];
    }
    return safeParse(storage.getItem(EVENT_STORAGE_KEY));
  } catch (error) {
    console.warn('[HospitalityLogs] No se pudo leer el historial', error);
    return [];
  }
}

export function normalizeHospitalityResource(resource) {
  if (!resource) {
    return null;
  }

  const id = resource._id || resource.id || resource.resourceId;
  if (!id) {
    return null;
  }

  const metadata = resource.metadata || {};
  const rawStatus =
    resource.roomStatus ||
    resource.status ||
    metadata.roomStatus ||
    metadata.status ||
    'available';
  const loweredStatus = String(rawStatus || 'available').toLowerCase();
  let status = STATUS_NORMALIZATION[loweredStatus] || 'available';

  const housekeepingPending =
    resource.hasHousekeepingTask === true ||
    resource.housekeepingStatus === 'pending' ||
    metadata.housekeepingStatus === 'pending' ||
    metadata.requiresHousekeeping === true;

  if (housekeepingPending && status !== 'occupied') {
    status = 'housekeeping';
  }

  const sortIndexRaw =
    resource.sortIndex ?? metadata.sortIndex ?? resource.order ?? 0;
  const sortIndex = Number.isFinite(Number(sortIndexRaw))
    ? Number(sortIndexRaw)
    : 0;

  const locationTagsRaw =
    resource.locationTags ?? metadata.locationTags ?? resource.tags ?? [];
  const locationTags = Array.isArray(locationTagsRaw)
    ? locationTagsRaw.map((tag) => String(tag))
    : String(locationTagsRaw || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

  const floor =
    (resource.floor ?? metadata.floor ?? '')
      ?.toString()
      .trim() || '';
  const zone =
    (resource.zone ?? metadata.zone ?? '')
      ?.toString()
      .trim() || '';

  const currentGuest =
    resource.currentGuest ||
    metadata.currentGuestName ||
    metadata.currentGuest ||
    null;

  const nextCheckIn =
    resource.nextCheckIn ||
    metadata.nextCheckIn ||
    metadata.upcomingCheckIn ||
    null;

  if (status === 'available' && nextCheckIn) {
    status = 'upcoming';
  }

  if (!NORMALIZED_STATUSES.has(status)) {
    status = 'available';
  }

  return {
    id: String(id),
    name:
      resource.name ||
      resource.displayName ||
      metadata.displayName ||
      `Habitación ${id}`,
    status,
    floor,
    zone,
    sortIndex,
    locationTags,
    currentGuest: currentGuest ? String(currentGuest) : null,
    nextCheckIn,
    hasHousekeepingTask: housekeepingPending,
    baseRate: resource.baseRate || null,
  };
}

export function compareRooms(a, b) {
  const floorKeyA = getFloorKey(a.floor);
  const floorKeyB = getFloorKey(b.floor);

  if (floorKeyA !== floorKeyB) {
    if (floorKeyA === UNASSIGNED_FLOOR_KEY) return 1;
    if (floorKeyB === UNASSIGNED_FLOOR_KEY) return -1;
    return floorKeyA.localeCompare(floorKeyB, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  const zoneA = (a.zone || '').toString().trim().toLowerCase();
  const zoneB = (b.zone || '').toString().trim().toLowerCase();

  if (zoneA !== zoneB) {
    if (!zoneA) return 1;
    if (!zoneB) return -1;
    return zoneA.localeCompare(zoneB, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  const sortA = Number.isFinite(Number(a.sortIndex))
    ? Number(a.sortIndex)
    : 0;
  const sortB = Number.isFinite(Number(b.sortIndex))
    ? Number(b.sortIndex)
    : 0;

  if (sortA !== sortB) {
    return sortA - sortB;
  }

  return (a.name || '').localeCompare(b.name || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}
