import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { AnimatedTableBody, AnimatedTableRow } from '@/components/ui/animated-table-body.jsx';
import { ContentTransition } from '@/components/ui/content-transition.jsx';
import { PageLoading } from '@/components/ui/page-loading.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Edit, Trash2, MessageCircle, MoreHorizontal, Users } from 'lucide-react';
import WhatsAppComposer from '@/components/shared/WhatsAppComposer.jsx';
import { getContactTypeBadge } from './badges.jsx';
import { CRMEmptyState } from './CRMEmptyState.jsx';

/**
 * Compute human-readable "last activity" from customer data.
 * Returns { text, daysAgo, urgency } where urgency is 'ok' | 'warning' | 'danger'
 */
function getLastActivity(customer) {
  const lastDate = customer.metrics?.lastOrderDate || customer.lastVisit;
  if (!lastDate) {
    const days = customer.metrics?.daysSinceLastOrder;
    if (days != null) {
      return {
        text: `hace ${days}d`,
        daysAgo: days,
        urgency: days >= 60 ? 'danger' : days >= 30 ? 'warning' : 'ok',
      };
    }
    return { text: 'Sin actividad', daysAgo: null, urgency: 'ok' };
  }
  const diff = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: 'Hoy', daysAgo: 0, urgency: 'ok' };
  if (diff === 0) return { text: 'Hoy', daysAgo: 0, urgency: 'ok' };
  if (diff === 1) return { text: 'Ayer', daysAgo: 1, urgency: 'ok' };
  if (diff < 7) return { text: `hace ${diff}d`, daysAgo: diff, urgency: 'ok' };
  if (diff < 30) return { text: `hace ${diff}d`, daysAgo: diff, urgency: 'ok' };
  if (diff < 60) return { text: `hace ${diff}d`, daysAgo: diff, urgency: 'warning' };
  return { text: `hace ${diff}d`, daysAgo: diff, urgency: 'danger' };
}

const urgencyStyles = {
  ok: '',
  warning: 'border-l-4 border-l-warning',
  danger: 'border-l-4 border-l-destructive',
};

const urgencyDotStyles = {
  ok: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
};

export function ContactsTable({
  filteredData,
  loading,
  selectedCustomerId,
  onViewDetail,
  onEdit,
  onDelete,
  justCreatedId,
  totalCustomers,
  currentPage,
  totalPages,
  onPageChange,
}) {
  return (
    <>
      <ContentTransition loading={loading && filteredData.length === 0} skeleton={<PageLoading variant="table" />}>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Contacto</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold">Última actividad</TableHead>
                <TableHead className="font-semibold text-right">Gasto total</TableHead>
                <TableHead className="font-semibold text-center">Estado</TableHead>
                <TableHead className="font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <AnimatedTableBody>
              {filteredData.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <CRMEmptyState
                      icon={Users}
                      title="Sin contactos"
                      description="Agrega tu primer contacto para comenzar a gestionar relaciones con tus clientes."
                      actionLabel="Agregar contacto"
                    />
                  </TableCell>
                </TableRow>
              )}
              {filteredData.map((customer) => {
                const activity = getLastActivity(customer);
                const phone = customer.contacts?.find(c => c.type === 'phone')?.value
                  || customer.contacts?.find(c => c.isPrimary && c.type !== 'email')?.value;
                const isSelected = customer._id === selectedCustomerId;
                const whatsappLink = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}` : null;

                return (
                  <AnimatedTableRow
                    key={customer._id}
                    className={`cursor-pointer transition-all ${urgencyStyles[activity.urgency]} ${
                      isSelected
                        ? 'bg-primary/5 dark:bg-primary/10'
                        : ''
                    } ${customer._id === justCreatedId ? 'animate-[glow-pulse_1.5s_ease-in-out]' : ''}`}
                    onClick={() => onViewDetail(customer)}
                  >
                    {/* Contacto — Name + company */}
                    <TableCell className="py-3">
                      <div className="font-medium text-foreground">{customer.name}</div>
                      {customer.companyName && (
                        <div className="text-xs text-muted-foreground mt-0.5">{customer.companyName}</div>
                      )}
                    </TableCell>

                    {/* Tipo */}
                    <TableCell>
                      {getContactTypeBadge(customer.customerType)}
                    </TableCell>

                    {/* Última actividad — date + relative + urgency dot */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${urgencyDotStyles[activity.urgency]}`} />
                        <span className={`text-sm ${
                          activity.urgency === 'danger' ? 'text-destructive font-medium' :
                          activity.urgency === 'warning' ? 'text-warning font-medium' :
                          'text-muted-foreground'
                        }`}>
                          {activity.text}
                        </span>
                      </div>
                    </TableCell>

                    {/* Gasto total */}
                    <TableCell className="text-right">
                      <span className="font-semibold text-foreground">
                        ${customer.metrics?.totalSpent?.toFixed(2) || '0.00'}
                      </span>
                    </TableCell>

                    {/* Estado — tier as colored dot */}
                    <TableCell className="text-center">
                      {customer.tier ? (
                        <Badge className={`text-[11px] ${
                          customer.tier === 'diamante' ? 'bg-info/10 text-info border-info/20' :
                          customer.tier === 'oro' ? 'bg-warning/10 text-warning border-warning/20' :
                          customer.tier === 'plata' ? 'bg-muted text-muted-foreground border-border' :
                          'bg-muted text-muted-foreground border-border'
                        } border`}>
                          {customer.tier === 'diamante' ? '💎' :
                           customer.tier === 'oro' ? '🥇' :
                           customer.tier === 'plata' ? '🥈' : '🥉'}{' '}
                          {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Acciones — ALWAYS visible, 2-3 icon buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {phone && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                onClick={(e) => e.stopPropagation()}
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="end" onClick={(e) => e.stopPropagation()}>
                              <WhatsAppComposer
                                contact={{ name: customer.name || customer.companyName, phone, _id: customer._id }}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
                          title="Editar contacto"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => onDelete(customer._id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar contacto
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </AnimatedTableRow>
                );
              })}
            </AnimatedTableBody>
          </Table>
        </div>
      </ContentTransition>

      {/* Pagination */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            {totalCustomers} contactos total
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <span className="text-muted-foreground px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
