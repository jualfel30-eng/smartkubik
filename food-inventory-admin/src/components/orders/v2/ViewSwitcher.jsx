import { Search, Grid3x3, List } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ViewSwitcher = ({ currentView, onViewChange, availableViews = ['search', 'grid', 'list'] }) => {
  const viewConfig = {
    search: {
      icon: Search,
      label: 'Búsqueda',
      tooltip: 'Vista de búsqueda - Ideal para inventarios grandes'
    },
    grid: {
      icon: Grid3x3,
      label: 'Grid',
      tooltip: 'Vista de tarjetas - Ideal para catálogos visuales y pantallas táctiles'
    },
    list: {
      icon: List,
      label: 'Lista',
      tooltip: 'Vista de lista - Compacta y eficiente'
    }
  };

  return (
    <div className="flex items-center gap-3 justify-end mb-3">
      <Label className="text-sm">Vistas</Label>
      <ToggleGroup
        type="single"
        value={currentView}
        onValueChange={(value) => {
          if (value) onViewChange(value);
        }}
      >
        {availableViews.map(view => {
          const Icon = viewConfig[view].icon;
          const isActive = currentView === view;
          return (
            <Tooltip key={view}>
              <TooltipTrigger asChild>
                <div>
                  <ToggleGroupItem
                    value={view}
                    aria-label={viewConfig[view].label}
                    className={isActive ? 'bg-accent text-accent-foreground border-2 border-primary' : 'bg-background hover:bg-accent/50'}
                  >
                    <Icon className="h-4 w-4" />
                  </ToggleGroupItem>
                </div>
              </TooltipTrigger>
              <TooltipContent sideOffset={5}>
                <p>{viewConfig[view].tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </div>
  );
};

export default ViewSwitcher;
