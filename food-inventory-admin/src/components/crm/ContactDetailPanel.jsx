import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SPRING } from '@/lib/motion';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import {
  X, Phone, Mail, MapPin, Building, DollarSign,
  Calendar, ShoppingCart, MessageCircle, Edit, ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { getTierBadge, getContactTypeBadge } from './badges.jsx';
import { AtRiskBadge, computeInactiveDays } from './AtRiskBadge.jsx';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '$0.00';
  return `$${Number(value).toFixed(2)}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

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
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [customer?._id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!customer) return null;

  const email = customer.contacts?.find(c => c.type === 'email')?.value;
  const phone = customer.contacts?.find(c => c.type === 'phone')?.value
    || customer.contacts?.find(c => c.isPrimary)?.value;
  const address = customer.addresses?.find(a => a.isDefault) || customer.addresses?.[0];
  const inactiveDays = computeInactiveDays(customer);

  const whatsappLink = phone
    ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={SPRING.soft}
      className="h-full"
    >
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
              {customer.companyName && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  {customer.companyName}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                {getTierBadge(customer.tier)}
                {getContactTypeBadge(customer.customerType)}
                <AtRiskBadge customer={customer} />
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
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
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {whatsappLink && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(whatsappLink, '_blank')}
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                WhatsApp
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => onEdit(customer)}>
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => onViewFull(customer)}>
              <ExternalLink className="h-4 w-4" />
              Ver completo
            </Button>
          </div>

          {/* At-risk reactivation CTA */}
          {inactiveDays !== null && inactiveDays >= 30 && whatsappLink && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-400">
                    {inactiveDays} días sin actividad
                  </p>
                  <p className="text-amber-700 dark:text-amber-500 text-xs">
                    Envía un mensaje de reactivación
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-amber-300 text-amber-800 dark:text-amber-400"
                  onClick={() => window.open(whatsappLink, '_blank')}
                >
                  Reactivar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-none bg-muted/40 shadow-none">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Gasto Total</div>
                <div className="text-lg font-bold text-foreground mt-1">
                  {formatCurrency(customer.metrics?.totalSpent)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-none bg-muted/40 shadow-none">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Pedidos</div>
                <div className="text-lg font-bold text-foreground mt-1">
                  {customer.metrics?.totalOrders || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="border-none bg-muted/40 shadow-none">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Última visita</div>
                <div className="text-sm font-medium text-foreground mt-1">
                  {formatDate(customer.metrics?.lastOrderDate || customer.lastVisit)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-none bg-muted/40 shadow-none">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Engagement</div>
                <div className="text-lg font-bold text-foreground mt-1">
                  {customer.metrics?.engagementScore || 0}
                  <span className="text-xs text-muted-foreground font-normal">/100</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Transacciones recientes</h3>
              <div className="space-y-2">
                {recentTransactions.map((tx, i) => (
                  <div key={tx._id || i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <div className="text-sm font-medium">{tx.type || 'Pedido'}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(tx.createdAt || tx.date)}</div>
                    </div>
                    <div className="text-sm font-semibold">{formatCurrency(tx.total || tx.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tax Info */}
          {customer.taxInfo?.taxId && (
            <div className="text-sm text-muted-foreground">
              RIF: <span className="font-medium text-foreground">{customer.taxInfo.taxId}</span>
            </div>
          )}

          {/* Notes */}
          {customer.notes && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Notas</h3>
              <p className="text-sm text-muted-foreground">{customer.notes}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
