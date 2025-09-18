import React, { useState, useEffect, useCallback } from 'react';
import { fetchChartOfAccounts, createChartOfAccount } from '@/lib/api';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartOfAccountForm } from './ChartOfAccountForm';
import { toast } from "sonner";

const ChartOfAccountsView = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchChartOfAccounts();
      setAccounts(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleCreateAccount = async (accountData) => {
    try {
      await createChartOfAccount(accountData);
      setIsFormOpen(false);
      await loadAccounts(); // Recargar la lista
      toast.success("La cuenta contable ha sido creada.");
    } catch (error) {
      console.error("Failed to create account:", error);
      toast.error(`No se pudo crear la cuenta: ${error.message}`);
    }
  };

  if (loading && accounts.length === 0) return <div>Cargando Plan de Cuentas...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Plan de Cuentas</CardTitle>
          <Button onClick={() => setIsFormOpen(true)}>Crear Nueva Cuenta</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <TableRow key={account._id}>
                    <TableCell className="font-medium">{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.type}</TableCell>
                    <TableCell>{account.description}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="4" className="text-center">
                    No se encontraron cuentas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ChartOfAccountForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateAccount}
      />
    </>
  );
};

export default ChartOfAccountsView;
