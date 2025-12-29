import { Search, Grid3x3, List } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
    <div className="flex justify-end mb-3">
      <ToggleGroup
        type="single"
        value={currentView}
        onValueChange={(value) => {
          if (value) onViewChange(value);
        }}
      >
        {availableViews.map(view => {
          const Icon = viewConfig[view].icon;
          return (
            <ToggleGroupItem
              key={view}
              value={view}
              aria-label={viewConfig[view].label}
              title={viewConfig[view].tooltip}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{viewConfig[view].label}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
};

export default ViewSwitcher;
