'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  alt?: string;
}

export default function BeforeAfterSlider({ beforeImage, afterImage, alt }: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hintPlayed = useRef(false);

  // Hint animation on mount: slide left then right then center
  useEffect(() => {
    if (hintPlayed.current) return;
    hintPlayed.current = true;

    const timeline = [
      { pos: 50, delay: 600 },
      { pos: 30, delay: 900 },
      { pos: 70, delay: 1400 },
      { pos: 50, delay: 1900 },
    ];

    timeline.forEach(({ pos, delay }) => {
      setTimeout(() => {
        setPosition(pos);
      }, delay);
    });
  }, []);

  const getPositionFromEvent = useCallback((clientX: number): number => {
    if (!containerRef.current) return 50;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.min(100, Math.max(0, (x / rect.width) * 100));
  }, []);

  // Pointer events — unified for mouse and touch
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setPosition(getPositionFromEvent(e.clientX));
  }, [getPositionFromEvent]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition(getPositionFromEvent(e.clientX));
  }, [isDragging, getPositionFromEvent]);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Also allow clicking anywhere in the container to jump to position
  const onContainerClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    setPosition(getPositionFromEvent(e.clientX));
  }, [isDragging, getPositionFromEvent]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square overflow-hidden rounded-xl select-none cursor-col-resize"
      onClick={onContainerClick}
      style={{ touchAction: 'pan-y' }}
    >
      {/* After image — full size, fixed, always behind */}
      <img
        src={afterImage}
        alt={alt ? `${alt} — después` : 'Después'}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Before image — full size, fixed, revealed left of the divider via clip-path mask.
          clip-path: inset(0 X% 0 0) trims X% from the right, keeping the image pixel-perfect. */}
      <img
        src={beforeImage}
        alt={alt ? `${alt} — antes` : 'Antes'}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)]"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      />

      {/* Handle */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center gap-1 transition-transform ${
          isDragging ? 'scale-110' : 'scale-100'
        }`}
        style={{
          left: `${position}%`,
          touchAction: 'none',
          cursor: 'col-resize',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Left arrow */}
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
          <path d="M7 1L1 7L7 13" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* Right arrow */}
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
          <path d="M1 1L7 7L1 13" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Labels */}
      <div
        className="absolute bottom-3 left-3 text-xs font-semibold text-white bg-black/50 px-2 py-0.5 rounded pointer-events-none transition-opacity duration-200"
        style={{ opacity: position > 15 ? 1 : 0 }}
      >
        ANTES
      </div>
      <div
        className="absolute bottom-3 right-3 text-xs font-semibold text-white bg-black/50 px-2 py-0.5 rounded pointer-events-none transition-opacity duration-200"
        style={{ opacity: position < 85 ? 1 : 0 }}
      >
        DESPUÉS
      </div>
    </div>
  );
}
