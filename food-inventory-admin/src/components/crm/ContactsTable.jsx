import { Button } from '@/components/ui/button.jsx';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { AnimatedTableBody, AnimatedTableRow } from '@/components/ui/animated-table-body.jsx';
import { ContentTransition } from '@/components/ui/content-transition.jsx';
import { PageLoading } from '@/components/ui/page-loading.jsx';
import { Eye, Edit, Trash2, Mail, Phone } from 'lucide-react';
import { getTierBadge, getContactTypeBadge } from './badges.jsx';
import { AtRiskBadge } from './AtRiskBadge.jsx';
import { CRMEmptyState } from './CRMEmptyState.jsx';
import { Users } from 'lucide-react';

export function ContactsTable({
  filteredData,
  loading,
  onViewDetail,
  onEdit,
  onDelete,
  justCreatedId,
  // Pagination
  totalCustomers,
  currentPage,
  totalPages,
  onPageChange,
}) {
  return (
    <>
      <ContentTransition loading={loading && filteredData.length === 0} skeleton={<PageLoading variant="table" />}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contacto</TableHead>
                <TableHead>Tier RFM</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Contacto Principal</TableHead>
                <TableHead>Gastos Totales</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <AnimatedTableBody>
              {filteredData.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <CRMEmptyState
                      icon={Users}
                      title="Sin contactos"
                      description="Agrega tu primer contacto para comenzar a gestionar tu CRM."
                    />
                  </TableCell>
                </TableRow>
              )}
              {filteredData.map((customer) => {
                const primaryContact = customer.contacts?.find(c => c.isPrimary) || customer.contacts?.[0];
                return (
                  <AnimatedTableRow
                    key={customer._id}
                    className={`group/row cursor-pointer ${customer._id === justCreatedId ? 'animate-[glow-pulse_1.5s_ease-in-out]' : ''}`}
                    onClick={() => onViewDetail(customer)}
                  >
                    <TableCell>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">{customer.companyName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getTierBadge(customer.tier)}
                        <AtRiskBadge customer={customer} />
                      </div>
                    </TableCell>
                    <TableCell>{getContactTypeBadge(customer.customerType)}</TableCell>
                    <TableCell>
                      <div className="text-sm max-w-[200px] truncate" title={customer.addresses?.find(a => a.isDefault)?.street || customer.addresses?.[0]?.street || ''}>
                        {customer.addresses?.find(a => a.isDefault)?.street || customer.addresses?.[0]?.street || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-2">
                        {customer.contacts?.find(c => c.type === 'email')?.value ? (
                          <>
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]" title={customer.contacts.find(c => c.type === 'email').value}>
                              {customer.contacts.find(c => c.type === 'email').value}
                            </span>
                          </>
                        ) : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {primaryContact?.value && primaryContact.type !== 'email' ? (
                        <div className="text-sm flex items-center gap-2"><Phone className="h-3 w-3" /> {primaryContact.value}</div>
                      ) : '-'}
                    </TableCell>
                    <TableCell><div className="font-medium">${customer.metrics?.totalSpent?.toFixed(2) || '0.00'}</div></TableCell>
                    <TableCell>
                      <div className="flex space-x-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(customer);
                          }}
                          title="Ver detalles y historial"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(customer); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(customer._id); }} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </AnimatedTableRow>
                );
              })}
            </AnimatedTableBody>
          </Table>
        </div>
      </ContentTransition>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
        <div>
          Mostrando <span className="font-semibold">{filteredData.length}</span> de{' '}
          <span className="font-semibold">{totalCustomers}</span> contactos
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <div className="text-sm text-muted-foreground">
            Página <span className="font-semibold">{currentPage}</span> de{' '}
            <span className="font-semibold">{totalPages}</span>
          </div>
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
    </>
  );
}
