import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import RubikLoader from './RubikLoader';

export default function AuditLogView() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchApi('/super-admin/audit-logs');
    setLoading(false);

    if (error) {
      setError(error);
      toast.error('Error al cargar los logs de auditoría', { description: error });
      return;
    }
    setLogs(data || []);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  if (loading) {
    return <RubikLoader message="Cargando logs de auditoría..." />;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Logs de Auditoría</CardTitle>
            <CardDescription>Registro de acciones importantes realizadas por el Super Administrador.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => navigate('/super-admin')}>
            Volver al Panel de Control
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Realizado por</TableHead>
              <TableHead>Detalles</TableHead>
              <TableHead>Tenant Afectado</TableHead>
              <TableHead>ID de Destino</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log._id}>
                <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                <TableCell><Badge variant="secondary">{log.action}</Badge></TableCell>
                <TableCell>{log.performedBy?.email || 'N/A'}</TableCell>
                <TableCell>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </TableCell>
                <TableCell>{log.tenantId || 'N/A'}</TableCell>
                <TableCell>{log.targetId || 'N/A'}</TableCell>
                <TableCell>{log.ipAddress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
