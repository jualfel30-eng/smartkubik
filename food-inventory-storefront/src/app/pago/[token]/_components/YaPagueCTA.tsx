'use client';

import { CheckCircle2 } from 'lucide-react';

interface YaPagueCTAProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Sticky CTA pinned to the bottom of the viewport on mobile. Touch target
 * is well over 48px and the safe-area padding handles iOS home-indicator
 * notches. Visually anchors the whole "before you pay" view — every other
 * interaction (tap-to-copy) leads here.
 */
export default function YaPagueCTA({ onClick, disabled }: YaPagueCTAProps) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-2 border-t border-white/5 bg-slate-950/85 px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur-md">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-xl bg-[var(--pp-primary,#10b981)] px-4 py-3.5 text-base font-semibold text-[var(--pp-primary-fg,#0a0e1a)] shadow-lg shadow-emerald-500/20 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        Ya pagué
      </button>
    </div>
  );
}
