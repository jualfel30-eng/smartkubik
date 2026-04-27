import { Badge } from '@/components/ui/badge.jsx';

/**
 * CRM Badge system — Dark-mode safe using semantic design tokens.
 * All colors use oklch-based CSS vars that adapt to light/dark themes.
 */

// Tier badges — RFM customer tiers with emoji + semantic colors
const tierConfig = {
  diamante: {
    label: 'Diamante',
    icon: '💎',
    className: 'bg-info/10 text-info border-info/30 dark:bg-info-muted dark:text-info dark:border-info/20',
  },
  oro: {
    label: 'Oro',
    icon: '🥇',
    className: 'bg-warning-muted text-warning-foreground border-warning/30 dark:bg-warning-muted dark:text-warning dark:border-warning/20',
  },
  plata: {
    label: 'Plata',
    icon: '🥈',
    className: 'bg-muted text-muted-foreground border-border',
  },
  bronce: {
    label: 'Bronce',
    icon: '🥉',
    className: 'bg-warning-muted/50 text-warning-foreground border-warning/20 dark:bg-warning-muted/30 dark:text-warning dark:border-warning/15',
  },
};

// Contact type badges — semantic color by role
const contactTypeConfig = {
  admin: { label: 'Admin', className: 'bg-primary/10 text-primary border-primary/20' },
  business: { label: 'Cliente', className: 'bg-info/10 text-info border-info/20 dark:bg-info-muted dark:text-info' },
  individual: { label: 'Cliente', className: 'bg-info/10 text-info border-info/20 dark:bg-info-muted dark:text-info' },
  supplier: { label: 'Proveedor', className: 'bg-success/10 text-success border-success/20 dark:bg-success-muted dark:text-success' },
  employee: { label: 'Empleado', className: 'bg-warning/10 text-warning border-warning/20 dark:bg-warning-muted dark:text-warning' },
  manager: { label: 'Gestor', className: 'bg-muted text-muted-foreground border-border' },
};

// Employee status badges
const employeeStatusConfig = {
  active: {
    label: 'Activo',
    className: 'bg-success/10 text-success border-success/20 dark:bg-success-muted dark:text-success',
  },
  onboarding: {
    label: 'Onboarding',
    className: 'bg-info/10 text-info border-info/20 dark:bg-info-muted dark:text-info',
  },
  suspended: {
    label: 'Suspendido',
    className: 'bg-warning/10 text-warning border-warning/20 dark:bg-warning-muted dark:text-warning',
  },
  terminated: {
    label: 'Terminado',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  draft: {
    label: 'Borrador',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

// Pipeline stage color mapping — for color-coded kanban columns and badges
export const stageColors = {
  'Prospecto': { border: 'border-t-info', bg: '', text: 'text-info', badge: 'bg-info/10 text-info border-info/20' },
  'Contactado': { border: 'border-t-info', bg: '', text: 'text-info', badge: 'bg-info/10 text-info border-info/20' },
  'Calificado': { border: 'border-t-warning', bg: '', text: 'text-warning', badge: 'bg-warning/10 text-warning border-warning/20' },
  'Demo/Discovery': { border: 'border-t-warning', bg: '', text: 'text-warning', badge: 'bg-warning/10 text-warning border-warning/20' },
  'Propuesta': { border: 'border-t-primary', bg: '', text: 'text-primary', badge: 'bg-primary/10 text-primary border-primary/20' },
  'Negociación': { border: 'border-t-primary', bg: '', text: 'text-primary', badge: 'bg-primary/10 text-primary border-primary/20' },
  'Cierre ganado': { border: 'border-t-success', bg: 'bg-success/5', text: 'text-success', badge: 'bg-success/10 text-success border-success/20' },
  'Cierre perdido': { border: 'border-t-destructive', bg: 'bg-destructive/5', text: 'text-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function getStageColor(stage) {
  return stageColors[stage] || { border: 'border-t-muted-foreground', bg: '', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground border-border' };
}

export function getTierBadge(tier) {
  const config = tierConfig[tier?.toLowerCase()] || {
    label: tier || 'Sin tier',
    icon: '',
    className: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge className={`${config.className} border text-xs`}>
      {config.icon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}

export function getContactTypeBadge(type) {
  const config = contactTypeConfig[type] || { label: type, className: 'bg-muted text-muted-foreground border-border' };
  return <Badge className={`${config.className} border text-xs`}>{config.label}</Badge>;
}

export function renderEmployeeStatusBadge(status = 'draft') {
  const config = employeeStatusConfig[status] || employeeStatusConfig.draft;
  return <Badge className={`${config.className} border text-xs`}>{config.label}</Badge>;
}

export function getStageBadge(stage) {
  const color = getStageColor(stage);
  return <Badge className={`${color.badge} border text-xs`}>{stage}</Badge>;
}
