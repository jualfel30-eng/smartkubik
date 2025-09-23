import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import TenantEditForm from './TenantEditForm';
import { FileText } from 'lucide-react';
import GlobalMetricsDashboard from './GlobalMetricsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import PlanManagement from './super-admin/PlanManagement';

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

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchApi('/super-admin/tenants');
      setTenants(response || []); // API returns a raw array
    } catch (err) {
      setError(err.message);
      setTenants([]);
      toast.error('Error al cargar los tenants', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleTenantUpdate = (updatedTenant) => {
    setTenants(prevTenants => 
      prevTenants.map(t => t._id === updatedTenant._id ? updatedTenant : t)
    );
    setEditingTenant(null);
  };

  if (loading) {
    return <div>Cargando tenants...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <Tabs defaultValue="dashboard" className="space-y-4">
      <TabsList>
        <TabsTrigger value="dashboard">Gestión de Tenants</TabsTrigger>
        <TabsTrigger value="plans">Gestión de Planes</TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard" className="space-y-4">
        <GlobalMetricsDashboard />
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Panel de Super Administrador</CardTitle>
                <CardDescription>Gestión centralizada de todos los tenants del sistema.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/super-admin/audit-logs')}>
                <FileText className="h-4 w-4 mr-2" />
                Ver Logs de Auditoría
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Tenant</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Plan</TableHead>
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
                      {tenant.subscriptionExpiresAt ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <TenantStatusSelector tenant={tenant} onStatusChange={handleTenantUpdate} />
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingTenant(tenant)}>Editar</Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/super-admin/tenants/${tenant._id}/users`)}>Ver Usuarios</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
  );
}
