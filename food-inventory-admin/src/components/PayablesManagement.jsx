import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchApi,
  getPayables,
  createPayable,
  getRecurringPayables,
  createRecurringPayable,
  generatePayableFromTemplate,
  fetchChartOfAccounts,
  getPayments,
  createPayment
} from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PlusCircle, MoreHorizontal, Repeat, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PaymentDialog } from './PaymentDialog';

const initialPayableState = {
  supplier: '',
  date: new Date().toISOString().split('T')[0],
  dueDate: '',
  lines: [{ description: '', amount: '', accountId: '' }],
  notes: '',
};

// --- Componente para Cuentas por Pagar ---
const MonthlyPayables = ({ suppliers, accounts, fetchPayables, payables }) => {
  const [newPayable, setNewPayable] = useState(initialPayableState);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);

  const handleOpenPaymentDialog = (payable) => {
    setSelectedPayable(payable);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    fetchPayables();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPayable({ ...newPayable, [name]: value });
  };

  const handleLineChange = (index, e) => {
    const { name, value } = e.target;
    const lines = [...newPayable.lines];
    lines[index][name] = value;
    setNewPayable({ ...newPayable, lines });
  };
  
  const handleAccountChange = (index, accountId) => {
    const lines = [...newPayable.lines];
    lines[index].accountId = accountId;
    setNewPayable({ ...newPayable, lines });
  };

  const addLine = () => {
    setNewPayable({
      ...newPayable,
      lines: [...newPayable.lines, { description: '', amount: '', accountId: '' }],
    });
  };

  const removeLine = (index) => {
    const lines = [...newPayable.lines];
    lines.splice(index, 1);
    setNewPayable({ ...newPayable, lines });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPayable.lines.some(line => !line.accountId)) {
      toast.error('Debe seleccionar una cuenta de gastos para cada línea.');
      return;
    }
    try {
      await createPayable(newPayable);
      toast.success('Cuenta por pagar creada con éxito.');
      fetchPayables();
      setIsCreateDialogOpen(false);
      setNewPayable(initialPayableState);
    } catch (error) {
      toast.error('Error al crear la cuenta por pagar.', { description: error.message });
    }
  };

  const getTotalAmount = (lines) => lines.reduce((acc, line) => acc + Number(line.amount || 0), 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cuentas por Pagar</CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><PlusCircle className="mr-2 h-4 w-4" />Registrar Cuenta por Pagar</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader><DialogTitle>Registrar Nueva Cuenta por Pagar</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                 {/* Form fields */}
                 <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label>Proveedor</label>
                     <Select onValueChange={(value) => setNewPayable({ ...newPayable, supplier: value })}>
                        <SelectTrigger><SelectValue placeholder="Seleccione un proveedor" /></SelectTrigger>
                        <SelectContent>{suppliers.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label>Fecha</label>
                    <Input type="date" name="date" value={newPayable.date} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="space-y-2">
                    <label>Líneas</label>
                    {newPayable.lines.map((line, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input name="description" placeholder="Descripción" value={line.description} onChange={(e) => handleLineChange(index, e)} className="flex-grow"/>
                            <Input name="amount" type="number" placeholder="Monto" value={line.amount} onChange={(e) => handleLineChange(index, e)} className="w-28"/>
                            <Select onValueChange={(value) => handleAccountChange(index, value)}>
                                <SelectTrigger className="w-48"><SelectValue placeholder="Cuenta de Gasto" /></SelectTrigger>
                                <SelectContent>{accounts.map(acc => <SelectItem key={acc._id} value={acc._id}>{acc.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeLine(index)}>X</Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>Añadir Línea</Button>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Guardar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead>Fecha</TableHead><TableHead>Monto Total</TableHead><TableHead>Monto Pagado</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {payables.map((payable) => (
                <TableRow key={payable._id}>
                  <TableCell>{payable.supplier?.name || 'N/A'}</TableCell>
                  <TableCell>{new Date(payable.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell>${getTotalAmount(payable.lines).toFixed(2)}</TableCell>
                  <TableCell>${(payable.paidAmount || 0).toFixed(2)}</TableCell>
                  <TableCell>{payable.status}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenPaymentDialog(payable)} disabled={payable.status === 'paid'}><DollarSign className="mr-2 h-4 w-4" />Registrar Pago</DropdownMenuItem>
                        <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PaymentDialog isOpen={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} payable={selectedPayable} onPaymentSuccess={handlePaymentSuccess} />
    </>
  );
};

// --- Componente para Pagos Recurrentes ---
const RecurringPayables = ({ suppliers, accounts }) => {
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState({ description: '', supplier: '', accountId: '', amount: '', frequency: 'Monthly' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await getRecurringPayables();
      setTemplates(response.data || []);
    } catch (error) {
      toast.error('Error al cargar las plantillas.');
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTemplate({ ...newTemplate, [name]: value });
  };

  const handleSelectChange = (name, value) => {
    setNewTemplate({ ...newTemplate, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTemplate.description || !newTemplate.accountId || !newTemplate.amount) {
        toast.error('Descripción, Cuenta y Monto son requeridos.');
        return;
    }
    try {
      await createRecurringPayable(newTemplate);
      toast.success('Plantilla creada con éxito.');
      fetchTemplates();
      setIsDialogOpen(false);
      setNewTemplate({ description: '', supplier: '', accountId: '', amount: '', frequency: 'Monthly' });
    } catch (error) {
      toast.error('Error al crear la plantilla.', { description: error.message });
    }
  };

  const handleGeneratePayable = async (templateId) => {
    try {
      await generatePayableFromTemplate(templateId);
      toast.success('Pago generado con éxito.', { description: 'Aparecerá en la pestaña "Cuentas por Pagar".' });
    } catch (error) {
      toast.error('Error al generar el pago.', { description: error.message });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Plantillas de Pagos Recurrentes</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" />Crear Plantilla</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Nueva Plantilla de Pago Recurrente</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><label>Descripción</label><Input name="description" value={newTemplate.description} onChange={handleInputChange} placeholder="Ej: Alquiler de Oficina" /></div>
              <div className="space-y-2"><label>Proveedor (Opcional)</label><Select onValueChange={(value) => handleSelectChange('supplier', value)}><SelectTrigger><SelectValue placeholder="Seleccione un proveedor" /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><label>Cuenta de Gasto</label><Select onValueChange={(value) => handleSelectChange('accountId', value)}><SelectTrigger><SelectValue placeholder="Seleccione una cuenta" /></SelectTrigger><SelectContent>{accounts.map(acc => <SelectItem key={acc._id} value={acc._id}>{acc.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><label>Monto</label><Input name="amount" type="number" value={newTemplate.amount} onChange={handleInputChange} placeholder="1500.00" /></div>
              <div className="space-y-2"><label>Frecuencia</label><Select name="frequency" value={newTemplate.frequency} onValueChange={(value) => handleSelectChange('frequency', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Monthly">Mensual</SelectItem><SelectItem value="Quarterly">Trimestral</SelectItem></SelectContent></Select></div>
              <div className="flex justify-end space-x-2"><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">Guardar Plantilla</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Descripción</TableHead><TableHead>Proveedor</TableHead><TableHead>Monto</TableHead><TableHead>Frecuencia</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>{templates.map((template) => (<TableRow key={template._id}><TableCell>{template.description}</TableCell><TableCell>{template.supplier?.name || 'N/A'}</TableCell><TableCell>${Number(template.amount).toFixed(2)}</TableCell><TableCell>{template.frequency}</TableCell><TableCell className="text-right"><Button size="sm" onClick={() => handleGeneratePayable(template._id)}><Repeat className="mr-2 h-4 w-4" />Generar Pago</Button></TableCell></TableRow>))}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// --- Componente para Historial de Pagos ---
const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPayments();
      setPayments(response.data || []);
    } catch (error) {
      toast.error('Error al cargar el historial de pagos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  return (
    <Card>
      <CardHeader><CardTitle>Historial de Pagos</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Monto Pagado</TableHead><TableHead>Método</TableHead><TableHead>Referencia</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? (<TableRow><TableCell colSpan="5" className="text-center">Cargando...</TableCell></TableRow>) : (payments.map((payment) => (<TableRow key={payment._id}><TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell><TableCell>{payment.payableId?.description || 'N/A'}</TableCell><TableCell>${Number(payment.amount).toFixed(2)}</TableCell><TableCell>{payment.paymentMethod}</TableCell><TableCell>{payment.referenceNumber || '-'}</TableCell></TableRow>)))}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// --- Componente Principal con Pestañas ---
const PayablesManagement = () => {
  const [payables, setPayables] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayables = useCallback(async () => {
    try {
      const response = await getPayables();
      setPayables(response.data || []);
    } catch (error) {
      toast.error('Error al cargar las cuentas por pagar.');
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsResponse, suppliersResponse] = await Promise.all([
        fetchChartOfAccounts(),
        fetchApi('/suppliers'),
      ]);
      setAccounts(accountsResponse.data.filter(acc => acc.type === 'Gasto') || []);
      setSuppliers(suppliersResponse.data || []);
    } catch (error) {
      toast.error('Error al cargar datos iniciales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayables();
    fetchInitialData();
  }, [fetchPayables, fetchInitialData]);

  if (loading) return <p>Cargando datos del módulo de pagos...</p>;

  return (
    <div className="p-4 md:p-6">
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">Cuentas por Pagar</TabsTrigger>
          <TabsTrigger value="recurring">Pagos Recurrentes</TabsTrigger>
          <TabsTrigger value="history">Historial de Pagos</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly">
          <MonthlyPayables payables={payables} fetchPayables={fetchPayables} suppliers={suppliers} accounts={accounts} />
        </TabsContent>
        <TabsContent value="recurring">
          <RecurringPayables suppliers={suppliers} accounts={accounts} />
        </TabsContent>
        <TabsContent value="history">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PayablesManagement;
