export const UNASSIGNED_FLOOR_KEY = '__UNASSIGNED__';
export const UNASSIGNED_ZONE_LABEL = 'Sin zona';

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
