import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { STAGGER, listItem } from '@/lib/motion';

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function elapsedHours(startIso) {
  if (!startIso) return '';
  const diff = (Date.now() - new Date(startIso).getTime()) / 3600000;
  return `${diff.toFixed(1)}h`;
}

export default function ActiveNowStrip({ shifts = [], maxVisible = 6 }) {
  if (!shifts.length) return null;

  const visible = shifts.slice(0, maxVisible);
  const overflow = shifts.length - maxVisible;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Activos ahora
      </p>
      <motion.div
        className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
        variants={STAGGER(0.04)}
        initial="initial"
        animate="animate"
      >
        {visible.map((shift) => (
          <motion.div
            key={shift._id}
            variants={listItem}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-xs bg-green-100 text-green-800">
                  {initials(shift.employeeName || shift.employee?.name || '?')}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <span className="text-xs text-muted-foreground max-w-[56px] truncate text-center">
              {(shift.employeeName || shift.employee?.name || '').split(' ')[0]}
            </span>
            {shift.actualStart && (
              <span className="text-[10px] text-green-600 font-medium">
                {elapsedHours(shift.actualStart)}
              </span>
            )}
          </motion.div>
        ))}
        {overflow > 0 && (
          <motion.div variants={listItem} className="flex flex-col items-center gap-1 shrink-0">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
              +{overflow}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
