import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Check, ChevronDown, MapPin, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

/**
 * Selector rápido de sede/organización en el header.
 * Muestra la membresía activa y permite cambiar en un solo click.
 * Reutiliza selectTenant() de useAuth (mismo flujo que TenantPickerDialog),
 * seguido de window.location.reload() para refrescar el contexto del tenant.
 */
export function SedeSwitcher() {
  const {
    memberships,
    activeMembershipId,
    tenant,
    isMultiTenantEnabled,
    isSwitchingTenant,
    selectTenant,
  } = useAuth();
  const navigate = useNavigate();

  // Sin valor para un tenant con una sola membresía: no añadir ruido al header.
  if (!isMultiTenantEnabled || !Array.isArray(memberships) || memberships.length <= 1) {
    return null;
  }

  const isActiveMembership = (membership) =>
    membership.id === activeMembershipId ||
    membership.tenant?.id === tenant?.id ||
    membership.tenant?._id === tenant?.id;

  const handleSwitch = async (membershipId) => {
    try {
      await selectTenant(membershipId, { rememberAsDefault: false });
      window.location.reload();
    } catch (err) {
      console.error('Sede switch failed:', err);
      toast.error(err?.message || 'No se pudo cambiar de sede.');
    }
  };

  const TriggerIcon = tenant?.isSubsidiary ? MapPin : Building2;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 px-3 text-sidebar-foreground/65 hover:text-sidebar-foreground/80"
          title="Cambiar sede u organización"
        >
          <TriggerIcon size={14} />
          <span className="max-w-[140px] truncate text-xs">
            {tenant?.name || 'Seleccionar sede'}
          </span>
          <ChevronDown size={12} className="text-sidebar-foreground/65" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Cambiar sede u organización
        </DropdownMenuLabel>
        {memberships.map((membership) => {
          const isSubsidiary = membership.tenant?.isSubsidiary;
          const ItemIcon = isSubsidiary ? MapPin : Building2;
          const active = isActiveMembership(membership);
          return (
            <DropdownMenuItem
              key={membership.id}
              disabled={active || isSwitchingTenant}
              onClick={() => handleSwitch(membership.id)}
              className="gap-2"
            >
              <ItemIcon size={14} className="shrink-0" />
              <span className="flex-1 truncate">
                {membership.tenant?.name || 'Sin nombre'}
              </span>
              <span className="inline-flex shrink-0 items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-300/20">
                {isSubsidiary ? 'Sede' : 'Organización'}
              </span>
              {active && <Check size={16} className="shrink-0 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/organizations')} className="gap-2">
          <Settings size={14} className="shrink-0" />
          Administrar organizaciones
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SedeSwitcher;
