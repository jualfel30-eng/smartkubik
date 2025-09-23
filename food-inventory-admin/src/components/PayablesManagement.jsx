import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  createPayment
} from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PlusCircle, Repeat, Eye, CreditCard } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PaymentDialog } from './PaymentDialog';
import { SearchableSelect } from './orders/v2/custom/SearchableSelect';

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

  const supplierOptions = useMemo(() => 
    suppliers.map(s => ({ 
      value: s._id, 
      label: `${s.name} - ${s.taxInfo?.rif || 'N/A'}`,
      supplier: s 
    })), [suppliers]);

  const handleSupplierSelection = (selectedOption) => {
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
        payeeName: supplier.name, 
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
  const [newPayable, setNewPayable] = useState(initialPayableState);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);

  const supplierOptions = useMemo(() => 
    suppliers.map(s => ({ 
      value: s._id, 
      label: `${s.name} - ${s.taxInfo?.rif || 'N/A'}`,
      supplier: s 
    })), [suppliers]);

  const handleOpenPaymentDialog = (payable) => {
    setSelectedPayable(payable);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    fetchPayables();
  };

  const handleSupplierSelection = (selectedOption) => {
    if (!selectedOption) {
      setNewPayable({ ...initialPayableState, lines: newPayable.lines });
      return;
    }
    if (selectedOption.__isNew__) {
      setNewPayable(prev => ({ ...prev, isNewSupplier: true, supplierId: null, supplierName: selectedOption.label, supplierRif: '' }));
    } else {
      const { supplier } = selectedOption;
      setNewPayable(prev => ({ 
        ...prev, 
        isNewSupplier: false, 
        supplierId: supplier._id, 
        supplierName: supplier.name, 
        supplierRif: supplier.taxInfo?.rif || '' 
      }));
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
          rif: newPayable.supplierRif,
          contactName: newPayable.supplierContactName,
          contactEmail: newPayable.supplierContactEmail,
          contactPhone: newPayable.supplierContactPhone,
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

  return (
    <>
      <Card>
        <CardHeader className="flex">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild><Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white"><PlusCircle className="mr-2 h-5 w-5" />Registrar Cuenta por Pagar</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader><DialogTitle>Registrar Nueva Cuenta por Pagar</DialogTitle></DialogHeader>
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
                        value={newPayable.supplierName ? { value: newPayable.supplierId || newPayable.supplierName, label: newPayable.supplierName } : null}
                        placeholder="Buscar o crear proveedor..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>RIF</Label>
                        <Input name="supplierRif" value={newPayable.supplierRif} onChange={handleInputChange} placeholder="J-12345678-9" disabled={!newPayable.isNewSupplier && newPayable.supplierId} />
                    </div>
                    </div>
                    {newPayable.isNewSupplier && (
                    <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="space-y-2">
                        <Label>Nombre del Contacto</Label>
                        <Input name="supplierContactName" value={newPayable.supplierContactName} onChange={handleInputChange} placeholder="Persona de contacto" />
                        </div>
                        <div className="space-y-2">
                        <Label>Email del Contacto</Label>
                        <Input name="supplierContactEmail" type="email" value={newPayable.supplierContactEmail} onChange={handleInputChange} placeholder="ejemplo@dominio.com" />
                        </div>
                        <div className="space-y-2">
                        <Label>Teléfono del Contacto</Label>
                        <Input name="supplierContactPhone" value={newPayable.supplierContactPhone} onChange={handleInputChange} placeholder="0414-1234567" />
                        </div>
                    </div>
                    )}
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
                                <Input name="description" placeholder="Descripción" value={line.description} onChange={(e) => handleLineChange(index, e)} className="flex-grow"/>
                                <Input name="amount" type="number" placeholder="Monto" value={line.amount} onChange={(e) => handleLineChange(index, e)} className="w-28"/>
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
            <TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead>Fecha</TableHead><TableHead>Monto Total</TableHead><TableHead>Monto Pagado</TableHead><TableHead>Estado</TableHead><TableHead className="text-center">Ver</TableHead><TableHead className="text-center">Pagar</TableHead></TableRow></TableHeader>
            <TableBody>
              {payables.map((payable) => (
                <TableRow key={payable._id}>
                  <TableCell>{payable.payeeName || 'N/A'}</TableCell>
                  <TableCell>{new Date(payable.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell>${getTotalAmount(payable.lines).toFixed(2)}</TableCell>
                  <TableCell>${(payable.paidAmount || 0).toFixed(2)}</TableCell>
                  <TableCell>{payable.status}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => toast.info('La vista de detalles se implementará pronto.')}>
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

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPayments();
      setPayments(response || []);
    } catch (error) {
      toast.error('Error al cargar el historial de pagos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filteredPayments = payments.filter(payment => {
    const searchTermLower = searchTerm.toLowerCase();
    const description = payment.payableId?.description?.toLowerCase() || '';
    const payeeName = payment.payableId?.payeeName?.toLowerCase() || '';
    const paymentMethod = payment.paymentMethod?.toLowerCase() || '';
    const referenceNumber = payment.referenceNumber?.toLowerCase() || '';

    return (
      description.includes(searchTermLower) ||
      payeeName.includes(searchTermLower) ||
      paymentMethod.includes(searchTermLower) ||
      referenceNumber.includes(searchTermLower)
    );
  });

  return (
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
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Monto Pagado</TableHead><TableHead>Método</TableHead><TableHead>Referencia</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? (<TableRow><TableCell colSpan="5" className="text-center">Cargando...</TableCell></TableRow>) : (filteredPayments.map((payment) => (<TableRow key={payment._id}><TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell><TableCell>{payment.payableId?.description || 'N/A'}</TableCell><TableCell>${Number(payment.amount).toFixed(2)}</TableCell><TableCell>{payment.paymentMethod}</TableCell><TableCell>{payment.referenceNumber || '-'}</TableCell></TableRow>)))}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const PayablesManagement = () => {
  const [payables, setPayables] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayables = useCallback(async () => {
    try {
      const data = await getPayables();
      setPayables(data.data || []);
    } catch (error) {
      toast.error('Error al cargar las cuentas por pagar.');
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await fetchApi('/suppliers');
      setSuppliers(response || []);
    } catch (error) {
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
      toast.error('Error al cargar datos iniciales.');
    } finally {
      setLoading(false);
    }
  }, [fetchSuppliers, fetchPayables]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (loading) return <p>Cargando datos del módulo de pagos...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Módulo de Pagos</CardTitle>
        <CardDescription>
          Gestiona tus cuentas por pagar, pagos recurrentes y consulta el historial de pagos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Cuentas por Pagar</TabsTrigger>
            <TabsTrigger value="recurring">Pagos Recurrentes</TabsTrigger>
          </TabsList>
          <TabsContent value="monthly">
            <MonthlyPayables payables={payables} fetchPayables={fetchPayables} suppliers={suppliers} accounts={accounts} fetchSuppliers={fetchSuppliers} />
          </TabsContent>
          <TabsContent value="recurring">
            <RecurringPayables suppliers={suppliers} accounts={accounts} />
          </TabsContent>
        </Tabs>
        <div className="mt-6">
          <PaymentHistory />
        </div>
      </CardContent>
    </Card>
  );
};

export default PayablesManagement;