import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SearchableSelect } from '../orders/v2/custom/SearchableSelect';
import { getRecurringPayables, createRecurringPayable, generatePayableFromTemplate } from '@/lib/api';
import { toast } from 'sonner';
import { PlusCircle, Repeat } from 'lucide-react';
import { AnimatedTableBody, AnimatedTableRow } from '../ui/animated-table-body';
import { EmptyState } from '../ui/empty-state';

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
      toast.success("Plantilla de pago recurrente creada con ��xito.");
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

export default function RecurringPayables({ accounts, suppliers }) {
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
          {templates.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="Sin plantillas recurrentes"
              description="Crea una plantilla para automatizar pagos que se repiten"
              actionLabel="+ Nueva plantilla"
              onAction={() => setIsCreateTemplateOpen(true)}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatedTableBody>
                {templates.map((template) => (
                  <AnimatedTableRow key={template._id}>
                    <TableCell>{template.templateName}</TableCell>
                    <TableCell>{template.payeeName || 'N/A'}</TableCell>
                    <TableCell>${Number(template.lines.reduce((acc, l) => acc + l.amount, 0) || 0).toFixed(2)}</TableCell>
                    <TableCell>{template.frequency}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleGeneratePayable(template._id)}>
                        <Repeat className="mr-2 h-4 w-4" />Generar Pago
                      </Button>
                    </TableCell>
                  </AnimatedTableRow>
                ))}
              </AnimatedTableBody>
            </Table>
          )}
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
}
