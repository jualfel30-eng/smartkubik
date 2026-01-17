import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchApi,
  getPayables,
  createPayable,
  createSupplier,
  getRecurringPayables,
  createRecurringPayable,
  generatePayableFromTemplate,
  fetchChartOfAccounts,
  getPayments,
  deletePayable
} from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { PlusCircle, Repeat, Eye, CreditCard, Trash2, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PaymentDialog } from './PaymentDialog';
import { SearchableSelect } from './orders/v2/custom/SearchableSelect';
import PayablesSummaryCards from './PayablesSummaryCards';
import { cn } from '@/lib/utils';

const initialPayableState = {
  supplierId: null,
  isNewSupplier: false,
  supplierName: '',
  supplierRif: '',
  supplierContactName: '',
  supplierContactEmail: '',
  supplierContactPhone: '',
  date: new Date().toISOString().split('T')[0],
  dueDate: '',
  lines: [{ description: '', amount: '', accountId: '' }],
  notes: '',
  type: 'other',
};

const CreateRecurringPayableDialog = ({ isOpen, onOpenChange, accounts, suppliers, onSuccess }) => {
  const initialTemplateState = {
    templateName: '',
    payeeName: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    type: 'service_payment',
    description: '',
    lines: [{ description: '', amount: '', accountId: '' }],
    supplierId: null,
    isNewSupplier: false,
    supplierRif: '',
    supplierContactName: '',
    supplierContactPhone: '',
  };

  const [newTemplate, setNewTemplate] = useState(initialTemplateState);
  const [supplierSearchInput, setSupplierSearchInput] = useState('');

  const supplierOptions = useMemo(() =>
    suppliers.map(s => ({
      value: s._id,
      label: `${s.companyName || s.name} - ${s.taxInfo?.rif || 'N/A'}`,
      supplier: s
    })), [suppliers]);

  const handleSupplierInputChange = (value) => {
    setSupplierSearchInput(value);
    setNewTemplate(prev => ({ ...prev, isNewSupplier: true, supplierId: null, payeeName: value }));
  };

  const handleSupplierSelection = (selectedOption) => {
    setSupplierSearchInput('');
    if (!selectedOption) {
      setNewTemplate(prev => ({ ...prev, ...initialTemplateState, lines: prev.lines }));
      return;
    }
    if (selectedOption.__isNew__) {
      setNewTemplate(prev => ({ ...prev, isNewSupplier: true, supplierId: null, payeeName: selectedOption.label, supplierRif: '' }));
    } else {
      const { supplier } = selectedOption;
      setNewTemplate(prev => ({
        ...prev,
        isNewSupplier: false,
        supplierId: supplier._id,
        payeeName: supplier.companyName || supplier.name,
        supplierRif: supplier.taxInfo?.rif || ''
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTemplate(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setNewTemplate(prev => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, e) => {
    const { name, value } = e.target;
    const lines = [...newTemplate.lines];
    lines[index][name] = value;
    setNewTemplate(prev => ({ ...prev, lines }));
  };

  const handleAccountChange = (index, accountId) => {
    const lines = [...newTemplate.lines];
    lines[index].accountId = accountId;
    setNewTemplate(prev => ({ ...prev, lines }));
  };

  const addLine = () => {
    setNewTemplate(prev => ({ ...prev, lines: [...prev.lines, { description: '', amount: '', accountId: '' }] }));
  };

  const removeLine = (index) => {
    const lines = [...newTemplate.lines];
    lines.splice(index, 1);
    setNewTemplate(prev => ({ ...prev, lines }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newTemplate,
        payeeType: 'supplier',
        lines: newTemplate.lines.map(l => ({ ...l, amount: Number(l.amount) })).filter(l => l.amount > 0),
      };

      if (payload.isNewSupplier) {
        payload.newSupplierName = payload.payeeName;
        payload.newSupplierRif = payload.supplierRif;
        payload.newSupplierContactName = payload.supplierContactName;
        payload.newSupplierContactPhone = payload.supplierContactPhone;
      }

      if (!payload.templateName || !payload.payeeName || payload.lines.length === 0) {
        toast.error("Nombre de plantilla, beneficiario y al menos una línea son requeridos.");
        return;
      }
      await createRecurringPayable(payload);
      toast.success("Plantilla de pago recurrente creada con éxito.");
      setNewTemplate(initialTemplateState);
      setSupplierSearchInput('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Error al crear la plantilla.", { description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Plantilla de Pago Recurrente</DialogTitle>
          <DialogDescription>Define una plantilla para gastos que se repiten, como alquileres o servicios.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre de la Plantilla</Label>
            <Input name="templateName" value={newTemplate.templateName} onChange={handleInputChange} placeholder="Ej: Alquiler Oficina" />
          </div>

          <div className="p-4 border rounded-lg space-y-4">
            <Label className="text-base font-semibold">Datos del Beneficiario (Proveedor)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del Proveedor</Label>
                <SearchableSelect
                  isCreatable
                  options={supplierOptions}
                  onSelection={handleSupplierSelection}
                  inputValue={supplierSearchInput}
                  onInputChange={handleSupplierInputChange}
                  value={newTemplate.payeeName ? { value: newTemplate.supplierId || newTemplate.payeeName, label: newTemplate.payeeName } : null}
                  placeholder="Buscar o crear proveedor..."
                />
              </div>
              <div className="space-y-2">
                <Label>RIF</Label>
                <Input name="supplierRif" value={newTemplate.supplierRif} onChange={handleInputChange} placeholder="J-12345678-9" disabled={!newTemplate.isNewSupplier && newTemplate.supplierId} />
              </div>
            </div>
            {newTemplate.isNewSupplier && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Nombre del Contacto</Label>
                  <Input name="supplierContactName" value={newTemplate.supplierContactName} onChange={handleInputChange} placeholder="Persona de contacto" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono del Contacto</Label>
                  <Input name="supplierContactPhone" value={newTemplate.supplierContactPhone} onChange={handleInputChange} placeholder="0414-1234567" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select name="frequency" value={newTemplate.frequency} onValueChange={(value) => handleSelectChange('frequency', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Inicio</Label>
              <Input type="date" name="startDate" value={newTemplate.startDate} onChange={handleInputChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Gasto</Label>
            <Select name="type" value={newTemplate.type} onValueChange={(value) => handleSelectChange('type', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="service_payment">Pago de Servicio</SelectItem>
                <SelectItem value="utility_bill">Servicio Público</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descripción General (Opcional)</Label>
            <Input name="description" value={newTemplate.description} onChange={handleInputChange} placeholder="Ej: Gasto de servicios básicos" />
          </div>
          <div className="space-y-2">
            <Label>Líneas del Gasto</Label>
            {newTemplate.lines.map((line, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input name="description" placeholder="Descripción de la línea" value={line.description} onChange={(e) => handleLineChange(index, e)} className="flex-grow" />
                <Input name="amount" type="number" placeholder="Monto" value={line.amount} onChange={(e) => handleLineChange(index, e)} className="w-28" />
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Guardar Plantilla</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const MonthlyPayables = ({ suppliers, accounts, fetchPayables, payables, fetchSuppliers }) => {
  console.log('🔴🔴🔴 MonthlyPayables LOADED - CODE IS UPDATED 🔴🔴🔴');
  console.log('Payables received:', payables);

  const [newPayable, setNewPayable] = useState(initialPayableState);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);

  const supplierOptions = useMemo(() =>
    suppliers.map(supplier => ({
      value: supplier._id,
      label: `${supplier.companyName || supplier.name} - ${supplier.taxInfo?.taxId || 'N/A'}`,
    })),
    [suppliers]);

  const pendingPayables = useMemo(() => {
    return payables.filter(payable => !['paid', 'void'].includes(payable.status));
  }, [payables]);

  const handleOpenPaymentDialog = (payable) => {
    setSelectedPayable(payable);
    setIsPaymentDialogOpen(true);
  };

  const handleOpenViewDialog = (payable) => {
    setSelectedPayable(payable);
    setIsViewDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    fetchPayables();
  };

  const handleSupplierSelection = (selectedOption) => {
    if (!selectedOption) {
      setNewPayable(initialPayableState);
      return;
    }

    if (selectedOption.__isNew__) {
      setNewPayable(() => ({
        ...initialPayableState,
        isNewSupplier: true,
        supplierName: selectedOption.label,
      }));
    } else {
      const supplier = suppliers.find(s => s._id === selectedOption.value);
      if (supplier) {
        setNewPayable({
          ...initialPayableState,
          isNewSupplier: false,
          supplierId: supplier._id,
          supplierName: supplier.companyName || supplier.name,
          supplierRif: supplier.taxInfo?.taxId || supplier.taxInfo?.rif || '',
          supplierContactName: supplier.contacts?.[0]?.name || supplier.name || '',
          supplierContactEmail: supplier.contacts?.find(c => c.type === 'email')?.value || '',
          supplierContactPhone: supplier.contacts?.find(c => c.type === 'phone')?.value || '',
        });
      }
    }
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

  const addLine = () => setNewPayable(prev => ({ ...prev, lines: [...prev.lines, { description: '', amount: '', accountId: '' }] }));
  const removeLine = (index) => {
    const lines = [...newPayable.lines];
    lines.splice(index, 1);
    setNewPayable({ ...newPayable, lines });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let currentSupplierId = newPayable.supplierId;

    try {
      if (newPayable.isNewSupplier) {
        if (!newPayable.supplierName || !newPayable.supplierRif || !newPayable.supplierContactName) {
          toast.error("Para un nuevo proveedor, debe rellenar Nombre, RIF y Nombre de Contacto.");
          return;
        }
        const newSupplierPayload = {
          name: newPayable.supplierName,
          companyName: newPayable.supplierName,
          customerType: 'supplier',
          taxInfo: {
            taxId: newPayable.supplierRif,
            taxType: 'J' // Defaulting to 'J' for legal entity
          },
          contacts: [
            { type: 'email', value: newPayable.supplierContactEmail, isPrimary: true, name: newPayable.supplierContactName },
            { type: 'phone', value: newPayable.supplierContactPhone, isPrimary: false, name: newPayable.supplierContactName }
          ].filter(c => c.value)
        };
        const createdSupplier = await createSupplier(newSupplierPayload);
        currentSupplierId = createdSupplier._id;
        fetchSuppliers();
        toast.success(`Proveedor "${createdSupplier.name}" creado con éxito.`);
      }

      if (!currentSupplierId) {
        toast.error("Debe seleccionar o crear un proveedor.");
        return;
      }

      const payablePayload = {
        type: newPayable.type,
        payeeType: 'supplier',
        payeeId: currentSupplierId,
        payeeName: newPayable.supplierName,
        issueDate: newPayable.date,
        dueDate: newPayable.dueDate || undefined,
        lines: newPayable.lines.map(l => ({ ...l, amount: Number(l.amount) })).filter(l => l.amount > 0),
        notes: newPayable.notes,
      };

      if (payablePayload.lines.length === 0) {
        toast.error("Debe añadir al menos una línea con un monto mayor a cero.");
        return;
      }

      await createPayable(payablePayload);
      toast.success('Cuenta por pagar creada con éxito.');
      fetchPayables();
      setIsCreateDialogOpen(false);
      setNewPayable(initialPayableState);

    } catch (error) {
      toast.error('Error en el proceso de guardado.', { description: error.message });
    }
  };

  const getTotalAmount = (lines) => lines.reduce((acc, line) => acc + Number(line.amount || 0), 0);

  const getSupplierSelectValue = () => {
    if (newPayable.isNewSupplier && newPayable.supplierName) {
      return {
        value: newPayable.supplierName, // Use name as value for new creatable option
        label: newPayable.supplierName,
      };
    } else if (newPayable.supplierId && newPayable.supplierName) {
      return {
        value: newPayable.supplierId,
        label: `${newPayable.supplierName} - ${newPayable.supplierRif || 'N/A'}`
      };
    }
    return null;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex">
          <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => { setIsCreateDialogOpen(isOpen); if (!isOpen) setNewPayable(initialPayableState); }}>
            <DialogTrigger asChild><Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white"><PlusCircle className="mr-2 h-5 w-5" />Registrar Cuenta por Pagar</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>Registrar Nueva Cuenta por Pagar</DialogTitle>
                <DialogDescription>Rellena los datos para registrar un nuevo gasto o factura pendiente de pago.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 border rounded-lg space-y-4">
                  <Label className="text-base font-semibold">Datos del Proveedor</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre del Proveedor</Label>
                      <SearchableSelect
                        isCreatable
                        options={supplierOptions}
                        onSelection={handleSupplierSelection}
                        value={getSupplierSelectValue()}
                        placeholder="Buscar o crear proveedor..."
                      />

                    </div>
                    <div className="space-y-2">
                      <Label>RIF</Label>
                      <Input name="supplierRif" value={newPayable.supplierRif} onChange={handleInputChange} placeholder="J-12345678-9" disabled={!newPayable.isNewSupplier} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>Nombre del Contacto</Label>
                      <Input name="supplierContactName" value={newPayable.supplierContactName} onChange={handleInputChange} placeholder="Persona de contacto" disabled={!newPayable.isNewSupplier} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email del Contacto</Label>
                      <Input name="supplierContactEmail" type="email" value={newPayable.supplierContactEmail} onChange={handleInputChange} placeholder="ejemplo@dominio.com" disabled={!newPayable.isNewSupplier} />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono del Contacto</Label>
                      <Input name="supplierContactPhone" value={newPayable.supplierContactPhone} onChange={handleInputChange} placeholder="0414-1234567" disabled={!newPayable.isNewSupplier} />
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                  <Label className="text-base font-semibold">Detalles del Gasto</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Gasto</Label>
                      <Select name="type" onValueChange={(value) => setNewPayable({ ...newPayable, type: value })} value={newPayable.type}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="purchase_order">Factura de Compra</SelectItem>
                          <SelectItem value="service_payment">Pago de Servicio</SelectItem>
                          <SelectItem value="utility_bill">Servicio Público</SelectItem>
                          <SelectItem value="payroll">Nómina</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de Emisión</Label>
                      <Input type="date" name="date" value={newPayable.date} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de Vencimiento (Opcional)</Label>
                      <Input type="date" name="dueDate" value={newPayable.dueDate} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Líneas del Gasto</Label>
                    {newPayable.lines.map((line, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input name="description" placeholder="Descripción" value={line.description} onChange={(e) => handleLineChange(index, e)} className="flex-grow" />
                        <Input name="amount" type="number" placeholder="Monto" value={line.amount} onChange={(e) => handleLineChange(index, e)} className="w-28" />
                        <Select onValueChange={(value) => handleAccountChange(index, value)}><SelectTrigger className="w-48"><SelectValue placeholder="Cuenta de Gasto" /></SelectTrigger><SelectContent>{accounts.map(acc => <SelectItem key={acc._id} value={acc._id}>{acc.name}</SelectItem>)}</SelectContent></Select>
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeLine(index)}>X</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>Añadir Línea</Button>
                  </div>
                </div>
                <div className="flex justify-end space-x-2"><Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead>Monto Pagado</TableHead>
                <TableHead>Forma de Pago</TableHead>
                <TableHead className="text-center">Crédito</TableHead>
                <TableHead>Fecha Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Ver</TableHead>
                <TableHead className="text-center">Pagar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingPayables.map((payable) => (
                <TableRow key={payable._id}>
                  <TableCell>{payable.payeeName || 'N/A'}</TableCell>
                  <TableCell>{new Date(payable.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell>${getTotalAmount(payable.lines).toFixed(2)}</TableCell>
                  <TableCell>${(payable.paidAmount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    {payable.expectedPaymentMethods?.length > 0
                      ? payable.expectedPaymentMethods.join(', ')
                      : <span className="text-gray-400 italic">No def.</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {payable.isCredit
                      ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sí</Badge>
                      : <span className="text-gray-400">No</span>}
                  </TableCell>
                  <TableCell>
                    {payable.dueDate
                      ? new Date(payable.dueDate).toLocaleDateString()
                      : <span className="text-gray-400 italic">N/A</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      payable.status === 'paid' ? 'bg-green-100 text-green-800' :
                        payable.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                    )}>
                      {payable.status === 'paid' ? 'Pagado' :
                        payable.status === 'partial' ? 'Parcial' :
                          payable.status === 'draft' ? 'Borrador' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenViewDialog(payable)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenPaymentDialog(payable)} disabled={payable.status === 'paid'}>
                      <CreditCard className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalles de Cuenta por Pagar</DialogTitle>
            <DialogDescription>
              Información completa del registro
            </DialogDescription>
          </DialogHeader>
          {selectedPayable && (
            <div className="space-y-4">
              {/* Información del Proveedor */}
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Información del Proveedor</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nombre:</span>
                    <p className="font-medium">{selectedPayable.payeeName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium capitalize">{selectedPayable.payeeType || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Información del Pago */}
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Detalles del Pago</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo de Gasto:</span>
                    <p className="font-medium capitalize">{selectedPayable.type?.replace(/_/g, ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado:</span>
                    <p className="font-medium capitalize">{selectedPayable.status || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de Emisión:</span>
                    <p className="font-medium">{new Date(selectedPayable.issueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de Vencimiento:</span>
                    <p className="font-medium">{selectedPayable.dueDate ? new Date(selectedPayable.dueDate).toLocaleDateString() : 'No definida'}</p>
                  </div>
                </div>
              </div>

              {/* Líneas del Gasto */}
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Líneas del Gasto</h3>
                <div className="space-y-2">
                  {selectedPayable.lines?.map((line, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{line.description || 'Sin descripción'}</p>
                        {line.accountId && (
                          <p className="text-xs text-muted-foreground">
                            Cuenta: {accounts.find(a => a._id === line.accountId)?.name || line.accountId}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold">${Number(line.amount || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen de Montos */}
              <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
                <h3 className="font-semibold text-base">Resumen</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto Total:</span>
                    <span className="font-semibold">${getTotalAmount(selectedPayable.lines).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto Pagado:</span>
                    <span className="font-semibold text-green-600">${(selectedPayable.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Saldo Pendiente:</span>
                    <span className="font-bold text-lg text-orange-600">
                      ${(getTotalAmount(selectedPayable.lines) - (selectedPayable.paidAmount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {selectedPayable.notes && (
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-base">Notas</h3>
                  <p className="text-sm text-muted-foreground">{selectedPayable.notes}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
            {selectedPayable && selectedPayable.status !== 'paid' && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                handleOpenPaymentDialog(selectedPayable);
              }}>
                <CreditCard className="mr-2 h-4 w-4" />
                Registrar Pago
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PaymentDialog isOpen={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} payable={selectedPayable} onPaymentSuccess={handlePaymentSuccess} />
    </>
  );
};

const RecurringPayables = ({ accounts, suppliers }) => {
  const [templates, setTemplates] = useState([]);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await getRecurringPayables();
      setTemplates(response || []);
    } catch (error) {
      console.error('Error al cargar las plantillas:', error);
      toast.error('Error al cargar las plantillas.');
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleGeneratePayable = async (templateId) => {
    try {
      await generatePayableFromTemplate(templateId);
      toast.success('Pago generado con éxito.', { description: 'Aparecerá en la pestaña "Cuentas por Pagar".' });
    } catch (error) {
      toast.error('Error al generar el pago.', { description: error.message });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex">
          <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white" onClick={() => setIsCreateTemplateOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" />Nuevo Pago Recurrente
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Beneficiario</TableHead><TableHead>Monto</TableHead><TableHead>Frecuencia</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>{templates.map((template) => (<TableRow key={template._id}><TableCell>{template.templateName}</TableCell><TableCell>{template.payeeName || 'N/A'}</TableCell><TableCell>${Number(template.lines.reduce((acc, l) => acc + l.amount, 0) || 0).toFixed(2)}</TableCell><TableCell>{template.frequency}</TableCell><TableCell className="text-right"><Button size="sm" onClick={() => handleGeneratePayable(template._id)}><Repeat className="mr-2 h-4 w-4" />Generar Pago</Button></TableCell></TableRow>))}</TableBody>
          </Table>
        </CardContent>
      </Card>
      <CreateRecurringPayableDialog
        isOpen={isCreateTemplateOpen}
        onOpenChange={setIsCreateTemplateOpen}
        accounts={accounts}
        suppliers={suppliers}
        onSuccess={fetchTemplates}
      />
    </>
  );
};

// ViewPayableDialog Component for PayablesHistory
const ViewPayableDialog = ({ isOpen, onOpenChange, payable }) => {
  const getTotalAmount = (lines) => {
    return (lines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0);
  };

  const getCurrencyLabel = (currency) => {
    const labels = {
      USD: 'USD ($)',
      VES: 'Bolívares (Bs)',
      EUR: 'Euros (€)',
      USD_BCV: '$ BCV',
      EUR_BCV: '€ BCV',
    };
    return labels[currency] || currency || 'USD';
  };

  if (!payable) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalles de Cuenta por Pagar</DialogTitle>
          <DialogDescription>
            {payable.payableNumber || 'Sin número'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Información del Proveedor */}
          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-base">Información del Proveedor</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <p className="font-medium">{payable.payeeName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium capitalize">{payable.payeeType || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Información del Pago */}
          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-base">Detalles del Pago</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo de Gasto:</span>
                <p className="font-medium capitalize">{payable.type?.replace(/_/g, ' ') || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant={payable.status === 'paid' ? 'default' : payable.status === 'partially_paid' ? 'secondary' : 'outline'}>
                  {payable.status === 'paid' ? 'Pagado' : payable.status === 'partially_paid' ? 'Parcial' : payable.status === 'void' ? 'Anulado' : payable.status === 'open' ? 'Abierto' : payable.status}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha de Emisión:</span>
                <p className="font-medium">{new Date(payable.issueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha de Vencimiento:</span>
                <p className="font-medium">{payable.dueDate ? new Date(payable.dueDate).toLocaleDateString() : 'No definida'}</p>
              </div>
              {payable.expectedCurrency && (
                <div>
                  <span className="text-muted-foreground">Moneda Esperada:</span>
                  <p className="font-medium">{getCurrencyLabel(payable.expectedCurrency)}</p>
                </div>
              )}
              {payable.expectedPaymentMethods && payable.expectedPaymentMethods.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Métodos de Pago:</span>
                  <p className="font-medium">{payable.expectedPaymentMethods.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Líneas del Gasto */}
          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-base">Líneas del Gasto</h3>
            <div className="space-y-2">
              {(payable.lines || []).map((line, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{line.description || 'Sin descripción'}</p>
                  </div>
                  <p className="font-semibold">${Number(line.amount || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de Montos */}
          <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
            <h3 className="font-semibold text-base">Resumen</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto Total:</span>
                <span className="font-semibold">${getTotalAmount(payable.lines).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto Pagado:</span>
                <span className="font-semibold text-green-600">${(payable.paidAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Saldo Pendiente:</span>
                <span className="font-bold text-lg text-orange-600">
                  ${(getTotalAmount(payable.lines) - (payable.paidAmount || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {payable.notes && (
            <div className="p-4 border rounded-lg space-y-2">
              <h3 className="font-semibold text-base">Notas</h3>
              <p className="text-sm text-muted-foreground">{payable.notes}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PayablesHistory = ({ payables, fetchPayables }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleOpenViewDialog = (payable) => {
    setSelectedPayable(payable);
    setIsViewDialogOpen(true);
  };

  const handleDeletePayable = async (payableId) => {
    if (!window.confirm('¿Estás seguro de eliminar este payable?')) return;

    try {
      await deletePayable(payableId);
      toast.success('Payable eliminado exitosamente');
      fetchPayables();
    } catch (error) {
      console.error('Error al eliminar el payable', error);
      toast.error('Error al eliminar el payable', { description: error.message });
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partially_paid': return 'secondary';
      case 'open': return 'outline';
      case 'void': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      paid: 'Pagado',
      partially_paid: 'Parcial',
      open: 'Abierto',
      void: 'Anulado',
      draft: 'Borrador',
    };
    return labels[status] || status;
  };

  const filteredPayables = useMemo(() => {
    if (!searchTerm.trim()) return payables;

    const searchLower = searchTerm.toLowerCase();
    return payables.filter(payable =>
      payable.payeeName?.toLowerCase().includes(searchLower) ||
      payable.description?.toLowerCase().includes(searchLower) ||
      payable.payableNumber?.toLowerCase().includes(searchLower)
    );
  }, [payables, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPayables.length / itemsPerPage);
  const paginatedPayables = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPayables.slice(startIndex, endIndex);
  }, [filteredPayables, currentPage, itemsPerPage]);

  const getTotalAmount = (lines) => {
    return lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Historial Completo de Payables</CardTitle>
            <div className="w-1/3">
              <Input
                placeholder="Buscar por proveedor, descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredPayables.length} de {payables.length} payables totales
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead>Monto Pagado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Ver</TableHead>
                <TableHead className="text-center">Eliminar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="7" className="text-center">No hay payables registrados</TableCell>
                </TableRow>
              ) : (
                paginatedPayables.map((payable) => (
                  <TableRow key={payable._id}>
                    <TableCell>{payable.payeeName || 'N/A'}</TableCell>
                    <TableCell>{new Date(payable.issueDate).toLocaleDateString()}</TableCell>
                    <TableCell>${getTotalAmount(payable.lines).toFixed(2)}</TableCell>
                    <TableCell>${(payable.paidAmount || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(payable.status)}>
                        {getStatusLabel(payable.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenViewDialog(payable)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePayable(payable._id)}
                        disabled={payable.status === 'paid' || payable.status === 'partially_paid'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({filteredPayables.length} registros)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPayable && (
        <ViewPayableDialog
          isOpen={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          payable={selectedPayable}
        />
      )}
    </>
  );
};

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const itemsPerPage = 10;

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPayments();
      setPayments(response.data || []);
    } catch (error) {
      console.error('Error al cargar el historial de pagos:', error);
      toast.error('Error al cargar el historial de pagos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    const searchTermLower = searchTerm.toLowerCase();

    const concept = payment.paymentType === 'sale'
      ? `pago de orden #${payment.orderId?.orderNumber}`
      : payment.payableId?.description
        ? `${payment.payableId.description} - ${payment.payableId.payeeName || ''}`
        : payment.payableId?.payeeName || '';

    const method = payment.method?.toLowerCase() || '';
    const reference = payment.reference?.toLowerCase() || '';

    return (
      concept.toLowerCase().includes(searchTermLower) ||
      method.includes(searchTermLower) ||
      reference.includes(searchTermLower)
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPayments.slice(startIndex, endIndex);
  }, [filteredPayments, currentPage, itemsPerPage]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Pagos</CardTitle>
            <div className="w-1/3">
              <Input
                placeholder="Buscar en pagos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Monto Pagado</TableHead><TableHead>Método</TableHead><TableHead>Referencia</TableHead><TableHead>Ver</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan="6" className="text-center">Cargando...</TableCell></TableRow>
              ) : (
                paginatedPayments.map((payment) => {
                  const isSale = payment.paymentType === 'sale';
                  const concept = isSale
                    ? `Pago de Orden #${payment.orderId?.orderNumber || 'N/A'}`
                    : payment.payableId?.description
                      ? `${payment.payableId.description} - ${payment.payableId.payeeName || ''}`
                      : payment.payableId?.payeeName || 'N/A';

                  return (
                    <TableRow key={payment._id}>
                      <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                      <TableCell>{concept}</TableCell>
                      <TableCell>${Number(payment.amount).toFixed(2)}</TableCell>
                      <TableCell>{payment.method || payment.paymentMethod || '-'}</TableCell>
                      <TableCell>{payment.reference || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({filteredPayments.length} registros)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Payment Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Resumen de Transacción</DialogTitle>
            <DialogDescription>
              Detalles completos del pago realizado
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              {/* Información General */}
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Información General</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fecha:</span>
                    <p className="font-medium">{new Date(selectedPayment.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo de Pago:</span>
                    <p className="font-medium capitalize">
                      {selectedPayment.paymentType === 'sale' ? 'Pago de Orden' : 'Pago de Cuenta por Pagar'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Concepto */}
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-semibold text-base">Concepto</h3>
                <p className="text-sm">
                  {selectedPayment.paymentType === 'sale'
                    ? `Pago de Orden #${selectedPayment.orderId?.orderNumber || 'N/A'}`
                    : selectedPayment.payableId?.description
                      ? `${selectedPayment.payableId.description} - ${selectedPayment.payableId.payeeName || ''}`
                      : selectedPayment.payableId?.payeeName || 'N/A'}
                </p>
              </div>

              {/* Detalles del Pago */}
              <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
                <h3 className="font-semibold text-base">Detalles del Pago</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto Pagado:</span>
                    <span className="font-semibold text-green-600">${Number(selectedPayment.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método de Pago:</span>
                    <span className="font-medium">{selectedPayment.method || selectedPayment.paymentMethod || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referencia:</span>
                    <span className="font-medium">{selectedPayment.reference || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Información Adicional de la Orden (si es pago de orden) */}
              {selectedPayment.paymentType === 'sale' && selectedPayment.orderId && (
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-base">Información de la Orden</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedPayment.orderId.customerName && (
                      <div>
                        <span className="text-muted-foreground">Cliente:</span>
                        <p className="font-medium">{selectedPayment.orderId.customerName}</p>
                      </div>
                    )}
                    {selectedPayment.orderId.total && (
                      <div>
                        <span className="text-muted-foreground">Total de la Orden:</span>
                        <p className="font-medium">${Number(selectedPayment.orderId.total).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Información Adicional del Payable (si es pago de cuenta por pagar) */}
              {selectedPayment.paymentType === 'payable' && selectedPayment.payableId && (
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-base">Información del Proveedor</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedPayment.payableId.payeeName && (
                      <div>
                        <span className="text-muted-foreground">Proveedor:</span>
                        <p className="font-medium">{selectedPayment.payableId.payeeName}</p>
                      </div>
                    )}
                    {selectedPayment.payableId.totalAmount && (
                      <div>
                        <span className="text-muted-foreground">Monto Total de la Cuenta:</span>
                        <p className="font-medium">${Number(selectedPayment.payableId.totalAmount).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notas adicionales si existen */}
              {selectedPayment.notes && (
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold text-base">Notas</h3>
                  <p className="text-sm text-muted-foreground">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};



const PayablesManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'monthly');
  const [payables, setPayables] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);

  // Sincronizar activeTab con searchParams cuando cambia la URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  // Manejador para cambiar tabs (actualiza estado y URL)
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  // Manejador para filtros desde las tarjetas de resumen
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    // Si hay un filtro activo, cambiar a la pestaña de cuentas por pagar
    if (filter !== null) {
      setActiveTab('monthly');
      setSearchParams({ tab: 'monthly' }, { replace: true });
    }
  };

  // Limpiar filtro
  const clearFilter = () => {
    setActiveFilter(null);
  };

  const fetchPayables = useCallback(async (filters = null) => {
    try {
      const data = await getPayables(filters || {});
      setPayables(data.data || []);
      setSummaryRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error al cargar las cuentas por pagar:', error);
      toast.error('Error al cargar las cuentas por pagar.');
    }
  }, []);

  // Efecto para recargar payables cuando cambia el filtro
  useEffect(() => {
    if (activeFilter) {
      fetchPayables(activeFilter);
    } else {
      fetchPayables();
    }
  }, [activeFilter, fetchPayables]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await fetchApi('/customers?customerType=supplier');
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Error al cargar los proveedores:', error);
      toast.error('Error al cargar los proveedores.');
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const accountsData = await fetchChartOfAccounts();
      setAccounts(accountsData.data.filter(acc => acc.type === 'Gasto') || []);
      await fetchSuppliers();
      await fetchPayables();
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      toast.error('Error al cargar datos iniciales.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Obtener etiqueta del filtro activo para mostrar
  const getFilterLabel = () => {
    if (!activeFilter) return null;

    if (activeFilter.expectedCurrency) {
      const currencyLabels = {
        USD: 'USD ($)',
        VES: 'Bolívares (Bs)',
        EUR: 'Euros',
        USD_BCV: '$ BCV',
        EUR_BCV: '€ BCV',
      };
      return currencyLabels[activeFilter.expectedCurrency] || activeFilter.expectedCurrency;
    }

    if (activeFilter.aging) {
      const agingLabels = {
        current: 'Al día',
        days30: '1-30 días vencidas',
        days60: '31-60 días vencidas',
        days90plus: '+90 días vencidas',
      };
      return agingLabels[activeFilter.aging] || activeFilter.aging;
    }

    if (activeFilter.overdue) {
      return 'Todas las vencidas';
    }

    return 'Filtro activo';
  };

  if (loading) return <p>Cargando datos del módulo de pagos...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cuentas por Pagar</h1>
      </div>
      {/* Tarjetas de Resumen con KPIs */}
      <PayablesSummaryCards
        key={summaryRefreshKey}
        onFilterChange={handleFilterChange}
        activeFilter={activeFilter}
      />

      {/* Indicador de filtro activo */}
      {activeFilter && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30 dark:border-blue-900/50">
          <span className="text-sm text-blue-700 dark:text-blue-400">
            Filtro activo: <strong>{getFilterLabel()}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilter}
            className="h-6 px-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/40"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cuentas por Pagar (AP)</CardTitle>
          <CardDescription>
            Gestiona facturas de proveedores, pagos recurrentes y consulta el historial de cuentas por pagar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="monthly">Cuentas por Pagar</TabsTrigger>
              <TabsTrigger value="recurring">Pagos Recurrentes</TabsTrigger>
              <TabsTrigger value="history">Historial de Pagos Pendientes</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly">
              <MonthlyPayables payables={payables} fetchPayables={() => fetchPayables(activeFilter)} suppliers={suppliers} accounts={accounts} fetchSuppliers={fetchSuppliers} />
            </TabsContent>
            <TabsContent value="recurring">
              <RecurringPayables suppliers={suppliers} accounts={accounts} />
            </TabsContent>
            <TabsContent value="history">
              <PayablesHistory payables={payables} fetchPayables={() => fetchPayables(activeFilter)} />
            </TabsContent>
          </Tabs>
          <div className="mt-6">
            <PaymentHistory />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayablesManagement;
