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

// --- INITIAL STATES --- //
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

// --- RECURRING PAYABLE DIALOG --- //
const CreateRecurringPayableDialog = ({ isOpen, onOpenChange, accounts, suppliers, onSuccess }) => {
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
      setNewTemplate(prev => ({ ...prev, payeeName: '', supplierId: null, isNewSupplier: false }));
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

  const getSupplierValue = () => {
    if (newTemplate.supplierId && newTemplate.payeeName) {
      return { value: newTemplate.supplierId, label: newTemplate.payeeName };
    }
    return null;
  }

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
                  value={getSupplierValue()}
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
          {/* Rest of the form... */}
        </form>
      </DialogContent>
    </Dialog>
  );
};

// --- MONTHLY PAYABLES COMPONENT --- //
const MonthlyPayables = ({ suppliers, accounts, fetchPayables, payables, fetchSuppliers }) => {
  const [newPayable, setNewPayable] = useState(initialPayableState);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [supplierSearchInput, setSupplierSearchInput] = useState('');

  const supplierOptions = useMemo(() => 
    suppliers.map(s => ({ 
      value: s._id, 
      label: `${s.companyName || s.name} - ${s.taxInfo?.rif || 'N/A'}`,
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

  const handleSupplierInputChange = (value) => {
    setSupplierSearchInput(value);
    setNewPayable(prev => ({ ...prev, isNewSupplier: true, supplierId: null, supplierName: value }));
  };

  const handleSupplierSelection = (selectedOption) => {
    setSupplierSearchInput('');
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
        supplierName: supplier.companyName || supplier.name, 
        supplierRif: supplier.taxInfo?.rif || '' 
      }));
    }
  };

  const getSupplierValue = () => {
    if (newPayable.supplierId && newPayable.supplierName) {
      return { value: newPayable.supplierId, label: newPayable.supplierName };
    }
    return null;
  }

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
          companyName: newPayable.supplierName, // Assuming company name is the same
          rif: newPayable.supplierRif,
          contacts: [{
            name: newPayable.supplierContactName,
            email: newPayable.supplierContactEmail,
            phone: newPayable.supplierContactPhone,
          }]
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
      setSupplierSearchInput('');

    } catch (error) {
      toast.error('Error en el proceso de guardado.', { description: error.message });
    }
  };

  const getTotalAmount = (lines) => lines.reduce((acc, line) => acc + Number(line.amount || 0), 0);

  return (
    <>
      <Card>
        <CardHeader className="flex">
            <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => { setIsCreateDialogOpen(isOpen); if (!isOpen) setSupplierSearchInput(''); }}>
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
                          inputValue={supplierSearchInput}
                          onInputChange={handleSupplierInputChange}
                          value={getSupplierValue()}
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
                {/* Rest of the form... */}
                </form>
            </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
          {/* Table content... */}
        </CardContent>
      </Card>
      <PaymentDialog isOpen={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} payable={selectedPayable} onPaymentSuccess={handlePaymentSuccess} />
    </>
  );
};

// --- MAIN COMPONENT --- //
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
      const response = await fetchApi('/customers?customerType=supplier');
      setSuppliers(response.data || []);
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