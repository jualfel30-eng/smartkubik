import { useState, useEffect } from 'react';

const CELEBRATION_EVENT = 'smartkubik:celebrate';

export function triggerCelebration() {
  window.dispatchEvent(new CustomEvent(CELEBRATION_EVENT));
}

export function useCelebration() {
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const handler = () => setCelebrating(true);
    window.addEventListener(CELEBRATION_EVENT, handler);
    return () => window.removeEventListener(CELEBRATION_EVENT, handler);
  }, []);

  return { celebrating, stop: () => setCelebrating(false) };
}
