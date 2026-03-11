import { useBusinessLocation } from '@/context/BusinessLocationContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { MapPin, Loader2 } from 'lucide-react';

export default function BusinessLocationSelector() {
  const { locations, activeLocationId, switchLocation, isLoading } = useBusinessLocation();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  // If only one location, show it as a badge (no selector needed)
  if (locations.length <= 1) {
    if (locations.length === 0) return null;
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded-md border bg-muted/50">
        <MapPin className="h-3 w-3" />
        <span className="max-w-[120px] truncate">{locations[0].name}</span>
      </div>
    );
  }

  return (
    <Select value={activeLocationId || ''} onValueChange={switchLocation}>
      <SelectTrigger className="w-[180px] h-8 text-xs">
        <MapPin className="h-3 w-3 mr-1.5 shrink-0" />
        <SelectValue placeholder="Seleccionar sede" />
      </SelectTrigger>
      <SelectContent>
        {locations.map((loc) => {
          const id = loc._id || loc.id;
          return (
            <SelectItem key={id} value={id}>
              <div className="flex items-center gap-2">
                <span>{loc.name}</span>
                <span className="text-muted-foreground text-[10px]">{loc.code}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
