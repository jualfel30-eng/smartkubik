export interface Tuition {
  _id: string;
  period: string;
  type: string;
  status: 'overdue' | 'pending' | 'paid';
  amount: number;
  dueDate?: string;
  paidDate?: string;
  daysOverdue?: number;
}

interface TuitionStatusCardProps {
  tuition: Tuition;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
}

export default function TuitionStatusCard({ tuition: t }: TuitionStatusCardProps) {
  const borderColor = t.status === 'overdue'
    ? 'var(--edu-danger)'
    : t.status === 'pending' ? 'var(--edu-warning)' : 'var(--edu-success)';

  const bgColor = t.status === 'overdue'
    ? 'var(--edu-danger-bg)'
    : t.status === 'pending' ? 'var(--edu-warning-bg)' : 'transparent';

  const statusLabel = t.status === 'overdue' ? 'Vencida' : t.status === 'pending' ? 'Pendiente' : 'Pagada';

  const subtitle = t.status === 'overdue'
    ? `Vencida hace ${t.daysOverdue ?? '?'} días`
    : t.status === 'pending'
    ? `Vence el ${formatDate(t.dueDate)}`
    : `Pagada el ${formatDate(t.paidDate)}`;

  return (
    <div style={{
      borderLeft: `3px solid ${borderColor}`,
      background: bgColor,
      padding: '20px 20px 20px 24px',
      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    }}>
      <div>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          color: 'var(--edu-gray-900)',
          margin: 0,
          fontSize: 'var(--text-base)',
        }}>
          {t.period} — {t.type}
        </p>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--edu-gray-500)',
          margin: '4px 0 0',
        }}>
          {subtitle}
        </p>
      </div>

      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: '20px',
          color: 'var(--edu-gray-900)',
        }}>
          {formatCurrency(t.amount)}
        </span>
        <span style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: borderColor,
          marginTop: '4px',
        }}>
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
