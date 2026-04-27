import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingDown, Clock, Users } from 'lucide-react';
import { fadeUp, STAGGER } from '@/lib/motion';

/**
 * InsightsWidget — shows 1-2 actionable insights based on appointment data.
 * Client-side heuristics, no backend call needed.
 */
export default function InsightsWidget({ appointments = [], resources = [] }) {
  const insights = useMemo(() => {
    if (appointments.length < 3) return [];
    const results = [];
    const today = new Date().toISOString().split('T')[0];

    // Insight 1: Pending confirmations per resource
    const pendingByResource = {};
    appointments.forEach((apt) => {
      if (apt.status === 'pending' && apt.resourceName) {
        pendingByResource[apt.resourceName] = (pendingByResource[apt.resourceName] || 0) + 1;
      }
    });
    const topPending = Object.entries(pendingByResource).sort((a, b) => b[1] - a[1])[0];
    if (topPending && topPending[1] >= 2) {
      results.push({
        icon: Clock,
        text: `${topPending[0]} tiene ${topPending[1]} citas pendientes de confirmación`,
        type: 'warning',
      });
    }

    // Insight 2: Peak hour detection (today's appointments)
    const todayApts = appointments.filter((a) => {
      const d = new Date(a.startTime).toISOString().split('T')[0];
      return d === today && a.status !== 'cancelled';
    });
    if (todayApts.length >= 3) {
      const hourCounts = {};
      todayApts.forEach((a) => {
        const h = new Date(a.startTime).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      });
      const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      if (peakHour && peakHour[1] >= 2) {
        results.push({
          icon: TrendingDown,
          text: `Hora pico hoy: ${peakHour[0]}:00 con ${peakHour[1]} citas`,
          type: 'info',
        });
      }
    }

    // Insight 3: Low occupancy today
    if (todayApts.length <= 2 && todayApts.length > 0) {
      results.push({
        icon: Users,
        text: `Solo ${todayApts.length} cita${todayApts.length > 1 ? 's' : ''} hoy — buen momento para campañas`,
        type: 'opportunity',
      });
    }

    return results.slice(0, 2);
  }, [appointments]);

  if (insights.length === 0) return null;

  return (
    <motion.div
      variants={STAGGER(0.06)}
      initial="initial"
      animate="animate"
      className="flex flex-wrap gap-2"
    >
      {insights.map((insight, idx) => (
        <motion.div
          key={idx}
          variants={fadeUp}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground"
        >
          <Lightbulb className="h-3 w-3 text-primary/50 shrink-0" />
          <span>{insight.text}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
