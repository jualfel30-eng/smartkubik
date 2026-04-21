import { Settings, LogOut, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

function UserAvatar({ name, className }) {
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0',
        className,
      )}
    >
      {initials}
    </div>
  );
}

export default function SidebarFooterContent({ user, tenant, handleLogout, onNavigate }) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  if (isCollapsed) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={`${user?.firstName || 'Usuario'} — ${tenant?.name || 'SmartKubik'}`}
            className="justify-center"
          >
            <UserAvatar name={user?.firstName} className="w-7 h-7" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* User info */}
      <div className="flex items-center gap-2.5 px-2 py-1">
        <UserAvatar name={user?.firstName} className="w-8 h-8" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {user?.firstName || 'Usuario'}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {tenant?.name || 'SmartKubik'}
          </p>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center gap-1 px-1">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onNavigate('/settings')}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs"
              >
                <Settings size={14} strokeWidth={1.5} />
                <span>Ajustes</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Configuración</TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-xs"
              >
                <LogOut size={14} strokeWidth={1.5} />
                <span>Salir</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Cerrar Sesión</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <PanelLeft size={12} />
        <span>Colapsar</span>
      </button>
    </div>
  );
}
