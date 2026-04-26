/**
 * DailyStreak.jsx
 * Small flame badge showing consecutive days of inventory activity.
 * Only renders after 3+ consecutive days. Resets silently.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { scaleIn } from '@/lib/motion';

const STORAGE_KEY = 'smartkubik_daily_streak';

function getToday() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function loadStreak() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveStreak(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Call this on any inventory action to update the streak.
 */
export function recordActivity() {
  const today = getToday();
  const streak = loadStreak();

  if (streak.lastDate === today) return; // Already recorded today

  if (streak.lastDate === getYesterday()) {
    // Consecutive day
    streak.count = (streak.count || 1) + 1;
  } else {
    // Break or first time
    streak.count = 1;
  }
  streak.lastDate = today;
  saveStreak(streak);
}

export default function DailyStreak() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const streak = loadStreak();
    const today = getToday();
    const yesterday = getYesterday();

    // Streak is valid if last activity was today or yesterday
    if (streak.lastDate === today || streak.lastDate === yesterday) {
      setCount(streak.count || 0);
    } else {
      setCount(0);
    }
  }, []);

  if (count < 3) return null;

  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"
    >
      <Flame className="h-3.5 w-3.5 text-amber-500" />
      <span className="text-xs font-medium text-amber-400">
        {count} dias
      </span>
    </motion.div>
  );
}
