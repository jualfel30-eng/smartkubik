import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { SearchableSelect } from '../orders/v2/custom/SearchableSelect';
import { createPayable, createSupplier } from '@/lib/api';
import { toast } from 'sonner';
import { PlusCircle, ChevronDown } from 'lucide-react';
import { fadeUp } from '@/lib/motion';

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

export { initialPayableState };

export default function CreatePayableDialog({ isOpen, onOpenChange, suppliers, accounts, fetchPayables, fetchSuppliers }) {
  const [newPayable, setNewPayable] = useState(initialPayableState);

  const supplierOptions = useMemo(() =>
    suppliers.map(supplier => ({
      value: supplier._id,
      label: `${supplier.companyName || supplier.name} - ${supplier.taxInfo?.taxId || 'N/A'}`,
    })),
    [suppliers]);

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
          taxInfo: { taxId: newPayable.supplierRif, taxType: 'J' },
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
      onOpenChange(false);
      setNewPayable(initialPayableState);
    } catch (error) {
      toast.error('Error en el proceso de guardado.', { description: error.message });
    }
  };

  const getSupplierSelectValue = () => {
    if (newPayable.isNewSupplier && newPayable.supplierName) {
      return { value: newPayable.supplierName, label: newPayable.supplierName };
    } else if (newPayable.supplierId && newPayable.supplierName) {
      return { value: newPayable.supplierId, label: `${newPayable.supplierName} - ${newPayable.supplierRif || 'N/A'}` };
    }
    return null;
  };

  const hasSupplier = newPayable.supplierId || newPayable.isNewSupplier;

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) setNewPayable(initialPayableState); }}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Cuenta por Pagar</DialogTitle>
          <DialogDescription>Rellena los datos para registrar un nuevo gasto o factura pendiente de pago.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Proveedor — always visible */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="p-4 border rounded-lg space-y-4">
            <Label className="text-base font-semibold">1. Proveedor</Label>
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
          </motion.div>

          {/* Section 2: Monto y Fechas — fades in once supplier is selected */}
          <AnimatePresence>
            {hasSupplier && (
              <motion.div variants={fadeUp} initial="initial" animate="animate" exit="exit" className="p-4 border rounded-lg space-y-4">
                <Label className="text-base font-semibold">2. Monto y Fechas</Label>
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
                      <Select onValueChange={(value) => handleAccountChange(index, value)}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="Cuenta de Gasto" /></SelectTrigger>
                        <SelectContent>{accounts.map(acc => <SelectItem key={acc._id} value={acc._id}>{acc.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeLine(index)}>X</Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>Añadir Línea</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section 3: Detalles adicionales — collapsible */}
          <AnimatePresence>
            {hasSupplier && (
              <motion.div variants={fadeUp} initial="initial" animate="animate" exit="exit">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" className="w-full justify-between text-muted-foreground">
                      3. Detalles adicionales (Opcional)
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 border rounded-lg space-y-4 mt-2">
                      <div className="space-y-2">
                        <Label>Notas</Label>
                        <Input name="notes" value={newPayable.notes} onChange={handleInputChange} placeholder="Notas adicionales..." />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!hasSupplier}>Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
