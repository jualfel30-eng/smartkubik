import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi } from '@/lib/api';

const REFRESH_INTERVAL = 30000; // 30 seconds

function timeStrToMinutes(timeStr) {
  // "13:45" → 825 (minutes since midnight)
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function currentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isTimeInRange(nowMinutes, startTime, endTime) {
  const start = timeStrToMinutes(startTime);
  const end = timeStrToMinutes(endTime);
  return nowMinutes >= start && nowMinutes < end;
}

function getProfessionalStatus(professional, todayBookings, todayBlocks) {
  const nowMin = currentTimeMinutes();
  const profId = String(professional._id);

  const myBookings = todayBookings.filter(b => {
    const bProfId = b.professionalId?._id
      ? String(b.professionalId._id)
      : String(b.professionalId || '');
    return bProfId === profId;
  });

  const myBlocks = todayBlocks.filter(b => {
    const bProfId = b.professionalId?._id
      ? String(b.professionalId._id)
      : String(b.professionalId || b.resourceId || '');
    return bProfId === profId;
  });

  // 1. In service (in_progress booking)
  const inProgress = myBookings.find(b => b.status === 'in_progress');
  if (inProgress) {
    const startMin = timeStrToMinutes(inProgress.startTime);
    const duration = inProgress.totalDuration || 30;
    const endMin = startMin + duration;
    const remaining = endMin - nowMin;
    return {
      status: 'in_service',
      booking: inProgress,
      remainingMinutes: remaining,
      isOvertime: remaining < 0,
    };
  }

  // 2. Blocked (active ResourceBlock)
  const activeBlock = myBlocks.find(b => isTimeInRange(nowMin, b.startTime, b.endTime));
  if (activeBlock) {
    const endMin = timeStrToMinutes(activeBlock.endTime);
    return {
      status: 'blocked',
      block: activeBlock,
      returnsInMinutes: endMin - nowMin,
    };
  }

  // 3. Check if works today (schedule)
  const today = new Date().getDay(); // 0=Sunday...6=Saturday
  const daySchedule = professional.schedule?.find(
    s => s.day === today || s.dayOfWeek === today
  );
  if (daySchedule && daySchedule.isWorking === false) {
    return { status: 'unavailable' };
  }
  if (!professional.isActive) {
    return { status: 'unavailable' };
  }

  // 4. Free — find next booking
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const nextBooking = myBookings
    .filter(b => ['pending', 'confirmed'].includes(b.status) && b.startTime > currentTimeStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  const nextInMinutes = nextBooking
    ? timeStrToMinutes(nextBooking.startTime) - nowMin
    : null;

  return { status: 'free', nextBooking, nextInMinutes };
}

export function useFloorViewData() {
  const [professionals, setProfessionals] = useState([]);
  const [profStatuses, setProfStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Store bookings/blocks in refs to avoid recalculating on timer ticks
  const bookingsRef = useRef([]);
  const blocksRef = useRef([]);
  const profsRef = useRef([]);

  const recalculateStatuses = useCallback(() => {
    const statuses = profsRef.current.map(prof => ({
      ...prof,
      ...getProfessionalStatus(prof, bookingsRef.current, blocksRef.current),
    }));
    setProfStatuses(statuses);
  }, []);

  const fetchDynamicData = useCallback(async () => {
    // Only fetch bookings + blocks (professionals don't change often)
    try {
      const today = new Date().toISOString().split('T')[0];
      const [bookingsRes, blocksRes] = await Promise.all([
        fetchApi(`/beauty-bookings?startDate=${today}&endDate=${today}`),
        fetchApi(`/resource-blocks?date=${today}`),
      ]);
      bookingsRef.current = bookingsRes?.data || (Array.isArray(bookingsRes) ? bookingsRes : []);
      blocksRef.current = blocksRes?.data || (Array.isArray(blocksRes) ? blocksRes : []);
      setLastUpdated(new Date());
      recalculateStatuses();
    } catch (err) {
      console.error('FloorView dynamic fetch error:', err);
    }
  }, [recalculateStatuses]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [profsRes, bookingsRes, blocksRes] = await Promise.all([
        fetchApi('/professionals?isActive=true&limit=100'),
        fetchApi(`/beauty-bookings?startDate=${today}&endDate=${today}`),
        fetchApi(`/resource-blocks?date=${today}`),
      ]);

      profsRef.current = profsRes?.data || (Array.isArray(profsRes) ? profsRes : []);
      bookingsRef.current = bookingsRes?.data || (Array.isArray(bookingsRes) ? bookingsRes : []);
      blocksRef.current = blocksRes?.data || (Array.isArray(blocksRes) ? blocksRes : []);

      setProfessionals(profsRef.current);
      setLastUpdated(new Date());
      recalculateStatuses();
    } catch (err) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [recalculateStatuses]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh every 30s (bookings + blocks only)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDynamicData();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchDynamicData]);

  // Local countdown tick every minute (just recalculate from in-memory data)
  useEffect(() => {
    const tick = setInterval(recalculateStatuses, 60000);
    return () => clearInterval(tick);
  }, [recalculateStatuses]);

  // Summary stats
  const summary = {
    inService: profStatuses.filter(p => p.status === 'in_service').length,
    free: profStatuses.filter(p => p.status === 'free').length,
    blocked: profStatuses.filter(p => p.status === 'blocked').length,
    unavailable: profStatuses.filter(p => p.status === 'unavailable').length,
    pendingToday: bookingsRef.current.filter(b =>
      ['pending', 'confirmed'].includes(b.status)
    ).length,
  };

  return { profStatuses, professionals, loading, error, lastUpdated, summary, refresh: fetchAll };
}
