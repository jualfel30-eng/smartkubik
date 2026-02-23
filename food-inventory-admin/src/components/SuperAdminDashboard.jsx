import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi, syncTenantMemberships } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import TenantEditForm from './TenantEditForm';
import { FileText, Trash2, Search } from 'lucide-react';
import GlobalMetricsDashboard from './GlobalMetricsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import PlanManagement from './super-admin/PlanManagement';
import FunnelCard from './super-admin/FunnelCard';

function computeHealthScore(tenant) {
  let profile = 0;
  if (tenant.name) profile += 7;
  if (tenant.contactInfo?.phone) profile += 6;
  if (tenant.contactInfo?.email) profile += 6;
  if (tenant.isConfirmed) profile += 6;

  let adoption = 0;
  if (tenant.usage?.currentProducts > 0) adoption += 10;
  if (tenant.usage?.currentOrders > 0) adoption += 10;
  if (tenant.usage?.currentUsers > 1) adoption += 8;
  const enabledCount = tenant.enabledModules
    ? Object.values(tenant.enabledModules).filter(Boolean).length
    : 0;
  if (enabledCount > 5) adoption += 7;

  let activity = 0;
  if (tenant.usage?.currentOrders > 0) activity += 13;
  if (tenant.usage?.currentProducts > 10) activity += 12;

  let plan = 0;
  const planName = (tenant.subscriptionPlan || '').toLowerCase();
  if (planName === 'starter') plan = 5;
  else if (planName === 'fundamental') plan = 10;
  else if (planName === 'crecimiento') plan = 13;
  else if (['expansion', 'expansión'].includes(planName)) plan = 15;

  return profile + adoption + activity + plan;
}

function HealthBadge({ score }) {
  let color = 'bg-red-100 text-red-700';
  if (score >= 60) color = 'bg-green-100 text-green-700';
  else if (score >= 35) color = 'bg-yellow-100 text-yellow-700';
  else if (score >= 15) color = 'bg-orange-100 text-orange-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}
    </span>
  );
}

// ... (TenantDeleteDialog and TenantStatusSelector components remain the same)

const TenantDeleteDialog = ({ isOpen, onClose, tenant, onDeleted }) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmationText('');
      setIsDeleting(false);
    }
  }, [isOpen]);

  if (!tenant) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetchApi(`/super-admin/tenants/${tenant._id}`, { method: 'DELETE' });
      toast.success(`Tenant "${tenant.name}" eliminado exitosamente.`);
      if (onDeleted) {
        onDeleted();
      }
      onClose();
    } catch (error) {
      toast.error('Error al eliminar el tenant', { description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmationMatching = confirmationText === tenant.name;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar Tenant: {tenant.name}</DialogTitle>
          <DialogDescription>
            Esta acción es irreversible y eliminará permanentemente el tenant y todos sus datos asociados, incluyendo usuarios, productos, y órdenes. 
            Para confirmar, por favor escribe el nombre del tenant: <strong>{tenant.name}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input 
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Escribe el nombre del tenant"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>Cancelar</Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={!isConfirmationMatching || isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar permanentemente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TenantStatusSelector = ({ tenant, onStatusChange }) => {
  const [currentStatus, setCurrentStatus] = useState(tenant.status);
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus) return;
    setIsLoading(true);
    try {
      const response = await fetchApi(`/super-admin/tenants/${tenant._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response && response.data) {
        toast.success(`Estado de ${tenant.name} actualizado a "${newStatus}"`);
        setCurrentStatus(response.data.status);
        if (onStatusChange) {
          onStatusChange(response.data);
        }
      } else {
        throw new Error('No se recibió una respuesta válida del servidor.');
      }
    } catch (error) {
      toast.error(`Error al actualizar el tenant ${tenant.name}`, { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isLoading}>
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Activo</SelectItem>
        <SelectItem value="suspended">Suspendido</SelectItem>
        <SelectItem value="cancelled">Cancelado</SelectItem>
      </SelectContent>
    </Select>
  );
};

const TenantActions = ({ tenant, onEdit, onUsers, onConfig, onSynced, onDelete }) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncTenantMemberships(tenant._id);
      const { stats } = result || {};
      toast.success(`Membresías sincronizadas para ${tenant.name}`, {
        description: stats
          ? `Usuarios: ${stats.usersProcessed}, nuevas: ${stats.created}, actualizadas: ${stats.updated}`
          : undefined,
      });
      if (onSynced) {
        onSynced(result);
      }
    } catch (error) {
      toast.error(`Error al sincronizar membresías de ${tenant.name}`, {
        description: error.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
      <Button variant="outline" size="sm" onClick={onUsers}>Ver Usuarios</Button>
      <Button variant="outline" size="sm" onClick={onConfig}>Configurar</Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
      >
        {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
      </Button>
      <Button variant="destructive" size="sm" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [deletingTenant, setDeletingTenant] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPagination(p => ({ ...p, page: 1 })); // Reset to page 1 on new search
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearchTerm,
      });
      const response = await fetchApi(`/super-admin/tenants?${params.toString()}`);
      setTenants(response.tenants || []);
      setPagination(p => ({ ...p, total: response.total || 0 }));
    } catch (err) {
      setError(err.message);
      setTenants([]);
      toast.error('Error al cargar los tenants', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearchTerm]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleTenantUpdate = (updatedTenant) => {
    setTenants(prevTenants => 
      prevTenants.map(t => t._id === updatedTenant._id ? updatedTenant : t)
    );
    setEditingTenant(null);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <>
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Gestión de Tenants</TabsTrigger>
          <TabsTrigger value="plans">Gestión de Planes</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-4">
          <FunnelCard />
          <GlobalMetricsDashboard />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Panel de Super Administrador</CardTitle>
                  <CardDescription>Gestión centralizada de todos los tenants del sistema. Mostrando {tenants.length} de {pagination.total} tenants.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => navigate('/super-admin/audit-logs')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Logs de Auditoría
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por nombre, código o email..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select 
                  value={pagination.limit.toString()} 
                  onValueChange={(value) => setPagination(p => ({ ...p, limit: parseInt(value), page: 1 }))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Resultados por página" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 por página</SelectItem>
                    <SelectItem value="50">50 por página</SelectItem>
                    <SelectItem value="100">100 por página</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Cargando tenants...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre del Tenant</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Salud</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow key={tenant._id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>{tenant.code}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tenant.subscriptionPlan}</Badge>
                        </TableCell>
                        <TableCell>
                          <HealthBadge score={computeHealthScore(tenant)} />
                        </TableCell>
                        <TableCell>
                          {tenant.subscriptionExpiresAt ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <TenantStatusSelector tenant={tenant} onStatusChange={handleTenantUpdate} />
                        </TableCell>
                        <TableCell>
                          <TenantActions
                            tenant={tenant}
                            onEdit={() => setEditingTenant(tenant)}
                            onUsers={() => navigate(`/super-admin/tenants/${tenant._id}/users`)}
                            onConfig={() => navigate(`/super-admin/tenants/${tenant._id}/configuration`)}
                            onSynced={loadTenants}
                            onDelete={() => setDeletingTenant(tenant)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {pagination.page} de {totalPages}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) })); }}
                        disabled={pagination.page === 1}
                      />
                    </PaginationItem>
                    {/* Add page numbers if needed in the future */}
                    <PaginationItem>
                      <PaginationNext 
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPagination(p => ({ ...p, page: Math.min(totalPages, p.page + 1) })); }}
                        disabled={pagination.page === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
          {editingTenant && (
            <TenantEditForm
              tenant={editingTenant}
              onSave={handleTenantUpdate}
              onCancel={() => setEditingTenant(null)}
            />
          )}
        </TabsContent>
        <TabsContent value="plans">
          <PlanManagement />
        </TabsContent>
      </Tabs>
      <TenantDeleteDialog 
        isOpen={!!deletingTenant}
        onClose={() => setDeletingTenant(null)}
        tenant={deletingTenant}
        onDeleted={loadTenants}
      />
    </>
  );
}
