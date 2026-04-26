import { Badge } from '@/components/ui/badge.jsx';

export const tierMap = {
  diamante: { label: 'Diamante', icon: '💎', className: 'bg-info/10 text-blue-800 border-blue-300' },
  oro: { label: 'Oro', icon: '🥇', className: 'bg-warning/10 text-yellow-800 border-yellow-300' },
  plata: { label: 'Plata', icon: '🥈', className: 'bg-gray-100 text-gray-800 border-gray-300' },
  bronce: { label: 'Bronce', icon: '🥉', className: 'bg-amber-100 text-amber-800 border-amber-300' },
};

export const contactTypeMap = {
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-800' },
  business: { label: 'Cliente', className: 'bg-info/10 text-blue-800' },
  individual: { label: 'Cliente', className: 'bg-info/10 text-blue-800' },
  supplier: { label: 'Proveedor', className: 'bg-success/10 text-green-800' },
  employee: { label: 'Empleado', className: 'bg-warning/10 text-orange-800' },
  manager: { label: 'Gestor', className: 'bg-gray-100 text-gray-800' },
};

export const employeeStatusStyles = {
  active: 'bg-emerald-100 text-emerald-800',
  onboarding: 'bg-info/10 text-blue-800',
  suspended: 'bg-warning/10 text-yellow-800',
  terminated: 'bg-destructive/10 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
};

const employeeStatusLabels = {
  active: 'Activo',
  onboarding: 'Onboarding',
  suspended: 'Suspendido',
  terminated: 'Terminado',
  draft: 'Borrador',
};

export function getTierBadge(tier) {
  const tierInfo = tierMap[tier] || { label: tier || 'Sin tier', icon: '', className: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <Badge className={`${tierInfo.className} border`}>
      {tierInfo.icon && <span className="mr-1">{tierInfo.icon}</span>}
      {tierInfo.label}
    </Badge>
  );
}

export function getContactTypeBadge(type) {
  const typeInfo = contactTypeMap[type] || { label: type, className: 'bg-gray-200' };
  return <Badge className={typeInfo.className}>{typeInfo.label}</Badge>;
}

export function renderEmployeeStatusBadge(status = 'draft') {
  const className = employeeStatusStyles[status] || employeeStatusStyles.draft;
  return <Badge className={className}>{employeeStatusLabels[status] || status}</Badge>;
}
