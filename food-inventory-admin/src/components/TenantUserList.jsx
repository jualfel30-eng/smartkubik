import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { useAuth } from '../hooks/use-auth';

export default function TenantUserList() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleImpersonate = async (userId) => {
    try {
      const tokenData = await fetchApi(`/super-admin/tenants/${tenantId}/users/${userId}/impersonate`, {
        method: 'POST',
      });

      if (tokenData && tokenData.accessToken) {
        toast.success('Impersonando al usuario...');
        await loginWithTokens(tokenData.accessToken, tokenData.refreshToken);
        navigate('/');
      } else {
        throw new Error("No se recibió una respuesta válida para la impersonación.");
      }
    } catch (error) {
      toast.error('Error al impersonar al usuario', { description: error.message });
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
                  <Button variant="outline" size="sm" onClick={() => handleImpersonate(user._id)}>Impersonar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}