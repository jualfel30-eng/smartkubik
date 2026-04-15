import { WifiOff } from 'lucide-react';

/**
 * Slim banner that appears at the top of mobile screens when offline.
 * Shows nothing when online.
 */
export default function OfflineIndicator({ isOnline }) {
  if (isOnline) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 text-white text-xs font-semibold py-1.5 px-4 w-full">
      <WifiOff size={13} />
      Sin conexión — mostrando datos en caché
    </div>
  );
}
