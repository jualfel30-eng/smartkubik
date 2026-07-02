import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SPRING } from '@/lib/motion';
import { Button } from '@/components/ui/button.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import {
  X, Phone, Mail, MapPin, Building, DollarSign,
  Calendar, ShoppingCart, TrendingUp, MessageCircle,
  Edit, ExternalLink, AlertTriangle,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import WhatsAppComposer from '@/components/shared/WhatsAppComposer.jsx';
import { getContactTypeBadge } from './badges.jsx';
import { computeInactiveDays } from './AtRiskBadge.jsx';
import { CustomerStoreCreditChip } from '@/components/orders/CustomerStoreCreditChip';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '$0.00';
  return `$${Number(value).toFixed(2)}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function ContactDetailPanel({ customer, onClose, onEdit, onViewFull }) {
  const [stats, setStats] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!customer?._id) return;
    setLoading(true);
    try {
      const [statsRes, txRes] = await Promise.all([
        fetchApi(`/customers/${customer._id}/transaction-stats`).catch(() => null),
        fetchApi(`/customers/${customer._id}/transactions?limit=5`).catch(() => null),
      ]);
      setStats(statsRes?.data || statsRes || null);
      const txData = txRes?.data || txRes || [];
      setRecentTransactions(Array.isArray(txData) ? txData.slice(0, 5) : []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [customer?._id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!customer) return null;

  const email = customer.contacts?.find(c => c.type === 'email')?.value;
  const phone = customer.contacts?.find(c => c.type === 'phone')?.value
    || customer.contacts?.find(c => c.isPrimary)?.value;
  const address = customer.addresses?.find(a => a.isDefault) || customer.addresses?.[0];
  const inactiveDays = computeInactiveDays(customer);
  const whatsappLink = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}` : null;

  const metrics = [
    {
      icon: DollarSign,
      label: 'Gasto total',
      value: formatCurrency(customer.metrics?.totalSpent),
      iconBg: 'bg-success/10 dark:bg-success-muted',
      iconColor: 'text-success',
    },
    {
      icon: ShoppingCart,
      label: 'Pedidos',
      value: customer.metrics?.totalOrders || 0,
      iconBg: 'bg-info/10 dark:bg-info-muted',
      iconColor: 'text-info',
    },
    {
      icon: Calendar,
      label: 'Última visita',
      value: formatDate(customer.metrics?.lastOrderDate || customer.lastVisit),
      iconBg: inactiveDays >= 30 ? 'bg-warning/10 dark:bg-warning-muted' : 'bg-muted',
      iconColor: inactiveDays >= 30 ? 'text-warning' : 'text-muted-foreground',
    },
    {
      icon: TrendingUp,
      label: 'Engagement',
      value: `${customer.metrics?.engagementScore || 0}/100`,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={SPRING.soft}
      className="h-full border-l border-border"
    >
      <ScrollArea className="h-full">
        <div className="p-6">

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Avatar with initials */}
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{getInitials(customer.name)}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground leading-tight">{customer.name}</h2>
                {customer.companyName && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <Building className="h-3.5 w-3.5" />
                    {customer.companyName}
                  </div>
                )}
                <div className="flex items-center flex-wrap gap-2 mt-2">
                  {getContactTypeBadge(customer.customerType)}
                  {customer.taxInfo?.taxId && (
                    <span className="text-xs text-muted-foreground">{customer.taxInfo.taxId}</span>
                  )}
                  {customer._id && (
                    <CustomerStoreCreditChip customerId={customer._id} />
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Quick Actions ── */}
          <div className="flex gap-2 pb-6 border-b border-border">
            {phone && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <WhatsAppComposer contact={{ name: customer.name || customer.companyName, phone, _id: customer._id }} />
                </PopoverContent>
              </Popover>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => onEdit(customer)}>
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => onViewFull(customer)}>
              <ExternalLink className="h-4 w-4" />
              Historial completo
            </Button>
          </div>

          {/* ── At-Risk Reactivation CTA ── */}
          {inactiveDays !== null && inactiveDays >= 30 && (
            <div className="mt-6 rounded-lg p-4 bg-warning/5 border border-warning/20 dark:bg-warning-muted/20">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-warning/10 dark:bg-warning-muted flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {inactiveDays} días sin actividad
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Este contacto podría necesitar un seguimiento. Envía un mensaje de reactivación.
                  </p>
                  {phone && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-3 gap-2 border-warning/30 text-warning hover:bg-warning/10">
                          <MessageCircle className="h-3.5 w-3.5" />
                          Enviar mensaje
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <WhatsAppComposer contact={{ name: customer.name || customer.companyName, phone, _id: customer._id }} />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Contact Info ── */}
          <div className="mt-6 pb-6 border-b border-border space-y-3">
            {phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{phone}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate">{email}</span>
              </div>
            )}
            {address?.street && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">
                  {address.street}{address.city ? `, ${address.city}` : ''}
                </span>
              </div>
            )}
            {!phone && !email && !address?.street && (
              <p className="text-sm text-muted-foreground italic">Sin datos de contacto</p>
            )}
          </div>

          {/* ── Metrics Grid ── */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="glass-card-subtle rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-6 w-6 rounded-md ${m.iconBg} flex items-center justify-center`}>
                    <m.icon className={`h-3.5 w-3.5 ${m.iconColor}`} />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{m.label}</span>
                </div>
                <div className="text-lg font-bold text-foreground">{m.value}</div>
              </div>
            ))}
          </div>

          {/* ── Recent Transactions ── */}
          {recentTransactions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Transacciones recientes
              </h3>
              <div className="space-y-1">
                {recentTransactions.map((tx, i) => (
                  <div key={tx._id || i} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-foreground">{tx.type || 'Pedido'}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(tx.createdAt || tx.date)}</div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(tx.total || tx.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          {customer.notes && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notas</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{customer.notes}</p>
            </div>
          )}

        </div>
      </ScrollArea>
    </motion.div>
  );
}
