import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useAuth } from '../hooks/use-auth';

export default function TenantUserList() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [impersonationTarget, setImpersonationTarget] = useState(null);
  const [impersonationReason, setImpersonationReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchApi(`/super-admin/tenants/${tenantId}/users`);
      setUsers(response || []);
    } catch (err) {
      setError(err.message);
      setUsers([]);
      toast.error('Error al cargar los usuarios', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openImpersonationDialog = (user) => {
    setImpersonationTarget(user);
    setImpersonationReason('');
  };

  const closeImpersonationDialog = () => {
    setImpersonationTarget(null);
    setImpersonationReason('');
    setSubmitting(false);
  };

  const handleImpersonate = async () => {
    if (!impersonationTarget) {
      return;
    }

    const trimmedReason = impersonationReason.trim();
    if (!trimmedReason) {
      toast.error('Debes indicar un motivo para impersonar.');
      return;
    }

    setSubmitting(true);
    try {
      const tokenData = await fetchApi(
        `/super-admin/tenants/${tenantId}/users/${impersonationTarget._id}/impersonate`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: trimmedReason }),
        },
      );

      if (tokenData && tokenData.accessToken) {
        toast.success('Impersonando al usuario...');
        await loginWithTokens(tokenData);
        navigate('/organizations');
        closeImpersonationDialog();
      } else {
        throw new Error("No se recibió una respuesta válida para la impersonación.");
      }
    } catch (error) {
      toast.error('Error al impersonar al usuario', { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Cargando usuarios...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Usuarios del Tenant</CardTitle>
            <CardDescription>Lista de usuarios para el tenant seleccionado.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate('/super-admin/tenants')}>
            Volver a Gestión de Tenants
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.firstName} {user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role?.name || 'N/A'}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => openImpersonationDialog(user)}>
                    Impersonar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog
        open={Boolean(impersonationTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeImpersonationDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar impersonación</DialogTitle>
            <DialogDescription>
              Ingresa el motivo por el cual necesitas impersonar a {impersonationTarget?.firstName}{' '}
              {impersonationTarget?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="impersonation-reason">Motivo</Label>
            <Textarea
              id="impersonation-reason"
              value={impersonationReason}
              onChange={(event) => setImpersonationReason(event.target.value)}
              placeholder="Describe el motivo de la impersonación"
              rows={4}
              disabled={submitting}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeImpersonationDialog}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleImpersonate} disabled={submitting}>
              {submitting ? 'Impersonando…' : 'Confirmar impersonación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
