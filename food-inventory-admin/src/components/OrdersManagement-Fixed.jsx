import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MoreHorizontal, PlusCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchApi } from '@/lib/api';
import { useCrmContext } from '@/context/CrmContext';
import { NewOrderForm } from './NewOrderForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function DataTable({ columns, data }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id || column.accessorKey}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row._id}>
            {columns.map((column) => (
              <TableCell key={column.id || column.accessorKey}>
                {column.cell ? column.cell({ row }) : row[column.accessorKey]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function OrdersManagementFixed() {
  const [orders, setOrders] = useState([]);
  const { crmData: customers, loading: contextLoading, error: contextError } = useCrmContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Payment Dialog
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  
  // Logic and state for Payment Dialog
  const [paymentMode, setPaymentMode] = useState('single');
  const { paymentMethods } = useCrmContext();
  const [activeMethod, setActiveMethod] = useState('');
  const [singlePayment, setSinglePayment] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], reference: '' });
  const [mixedPayments, setMixedPayments] = useState([]);
  const [remainingAmount, setRemainingAmount] = useState(0);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/orders');
      setOrders(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleConfirmOrder = async (orderId) => {
    try {
      await fetchApi(`/orders/${orderId}/confirm`, { method: 'PATCH' });
      fetchOrders();
    } catch (error) {
      console.error("Error confirming order:", error);
      alert("Failed to confirm order.");
    }
  };

  const handleOpenPaymentDialog = (order) => {
    setSelectedOrderForPayment(order);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    setSelectedOrderForPayment(null);
    fetchOrders();
  };

  useEffect(() => {
    if (selectedOrderForPayment && paymentMethods.length > 0) {
      const remaining = (selectedOrderForPayment.totalAmount || 0) - (selectedOrderForPayment.paidAmount || 0);
      const defaultAmount = remaining > 0 ? remaining : 0;
      const defaultMethod = paymentMethods[0]?.id || '';
      
      setRemainingAmount(remaining);
      setPaymentMode('single');
      setActiveMethod(defaultMethod);
      
      setSinglePayment({ amount: defaultAmount, date: new Date().toISOString().split('T')[0], reference: '' });
      setMixedPayments([]);
    }
  }, [selectedOrderForPayment, paymentMethods]);

  const handlePaymentModeChange = (value) => {
    setActiveMethod(value);
    if (value === 'pago_mixto') {
      setPaymentMode('mixed');
    } else {
      setPaymentMode('single');
    }
  };

  const handleSinglePaymentChange = (field, value) => {
    setSinglePayment(p => ({ ...p, [field]: value }));
  };

  const addPaymentLine = () => {
    const newId = Date.now().toString();
    const firstMethod = paymentMethods.find(m => m.id !== 'pago_mixto')?.id || '';
    setMixedPayments(prev => [...prev, { id: newId, amount: '', method: firstMethod, reference: '' }]);
  };

  const updatePaymentLine = (id, field, value) => {
    setMixedPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePaymentLine = (id) => {
    setMixedPayments(prev => prev.filter(p => p.id !== id));
  };

  const handlePaymentSubmit = async () => {
    if (!selectedOrderForPayment) return;
    let paymentsPayload = [];
    const paymentDate = new Date().toISOString();

    if (paymentMode === 'single') {
      paymentsPayload.push({ amount: Number(singlePayment.amount), method: activeMethod, date: new Date(singlePayment.date).toISOString(), reference: singlePayment.reference });
    } else {
      paymentsPayload = mixedPayments.map(p => ({ amount: Number(p.amount), method: p.method, date: paymentDate, reference: p.reference || '' }));
    }

    try {
      await fetchApi(`/payments/order/${selectedOrderForPayment._id}`, { method: 'POST', body: JSON.stringify({ payments: paymentsPayload }) });
      handlePaymentSuccess();
    } catch (error) {
      console.error("Error submitting payment:", error);
      alert(`Error al registrar el pago: ${error.message}`);
    }
  };

  const mixedTotal = useMemo(() => mixedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0), [mixedPayments]);

  const columns = [
    { accessorKey: "customerName", header: "Cliente" },
    { accessorKey: "totalAmount", header: "Monto Total", cell: ({ row }) => `$${(row.totalAmount || 0).toFixed(2)}` },
    { accessorKey: "paidAmount", header: "Monto Pagado", cell: ({ row }) => `$${(row.paidAmount || 0).toFixed(2)}` },
    { accessorKey: "balance", header: "Balance", cell: ({ row }) => {
        const balance = (row.totalAmount || 0) - (row.paidAmount || 0);
        return <span className={balance > 0 ? 'text-red-500' : 'text-green-500'}>{`$${balance.toFixed(2)}`}</span>;
    }},
    { accessorKey: "status", header: "Estado" },
    { id: "actions", cell: ({ row }) => {
        const order = row;
        const balance = (order.totalAmount || 0) - (order.paidAmount || 0);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              {balance > 0 && <DropdownMenuItem onClick={() => handleOpenPaymentDialog(order)}>Registrar Pago</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => console.log("View order details", order._id)}>Ver Detalles</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
    }},
  ];

  if (contextLoading) return <div>Cargando datos maestros...</div>;
  if (contextError) return <div>Error cargando datos: {contextError}</div>;

  return (
    <main className="grid flex-1 items-start gap-8 p-4 sm:px-6 sm:py-0 md:gap-8">
      <NewOrderForm onOrderCreated={fetchOrders} />
      
      <Card>
        <CardHeader>
          <CardTitle>Historial de Órdenes</CardTitle>
          <CardDescription>Consulta y maneja las órdenes pasadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <div>Cargando órdenes...</div> : error ? <div>Error: {error}</div> : <DataTable columns={columns} data={orders} />}
        </CardContent>
      </Card>

      {/* Payment Dialog remains here */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Orden: {selectedOrderForPayment?._id} <br />
              Balance Pendiente: ${remainingAmount.toFixed(2)}
            </p>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMode" className="text-right">Tipo de Pago</Label>
              <Select value={activeMethod} onValueChange={handlePaymentModeChange}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione un método" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago_mixto">Pago Mixto</SelectItem>
                  <optgroup label="Métodos de Pago">
                    {paymentMethods.map(method => <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>)}
                  </optgroup>
                </SelectContent>
              </Select>
            </div>
            {paymentMode === 'single' ? (
              <div className="space-y-4 py-4 border-t mt-4">
                 <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="amount" className="text-right">Monto</Label><Input id="amount" type="number" value={singlePayment.amount} onChange={(e) => handleSinglePaymentChange('amount', e.target.value)} className="col-span-3" /></div>
                 <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="date" className="text-right">Fecha</Label><Input id="date" type="date" value={singlePayment.date} onChange={(e) => handleSinglePaymentChange('date', e.target.value)} className="col-span-3" /></div>
                 <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="reference" className="text-right">Referencia</Label><Input id="reference" value={singlePayment.reference} onChange={(e) => handleSinglePaymentChange('reference', e.target.value)} className="col-span-3" /></div>
              </div>
            ) : (
              <div className="space-y-4 py-4 border-t mt-4">
                <Label>Desglose de Pagos</Label>
                {mixedPayments.map((paymentLine) => (
                  <div key={paymentLine.id} className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="flex-1"><Select value={paymentLine.method} onValueChange={(v) => updatePaymentLine(paymentLine.id, 'method', v)}><SelectTrigger><SelectValue placeholder="Método" /></SelectTrigger><SelectContent>{paymentMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="flex-1"><Input type="number" placeholder="Monto" value={paymentLine.amount} onChange={(e) => updatePaymentLine(paymentLine.id, 'amount', e.target.value)} /></div>
                    <div className="flex-1"><Input placeholder="Referencia" value={paymentLine.reference} onChange={(e) => updatePaymentLine(paymentLine.id, 'reference', e.target.value)} /></div>
                    <Button variant="ghost" size="icon" onClick={() => removePaymentLine(paymentLine.id)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addPaymentLine}>Añadir Línea de Pago</Button>
                <div className="text-right font-semibold">Total Desglosado: ${mixedTotal.toFixed(2)}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
            <Button type="button" onClick={handlePaymentSubmit}>Registrar Pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
