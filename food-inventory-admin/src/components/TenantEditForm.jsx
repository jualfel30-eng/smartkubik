
import React, { useMemo, useState } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function TenantEditForm({ tenant, onSave, onCancel }) {
  const normalizedTenant = useMemo(() => {
    return {
      ...tenant,
      contactInfo: tenant.contactInfo || { email: '', phone: '', address: {} },
      taxInfo: tenant.taxInfo || { rif: '', businessName: '' },
      enabledModules: {
        ecommerce: false,
        inventory: false,
        orders: false,
        customers: false,
        suppliers: false,
        reports: false,
        accounting: true,
        ...(tenant.enabledModules || {}),
      },
    };
  }, [tenant]);

  const [formData, setFormData] = useState(normalizedTenant);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (group, e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [group]: { ...prev[group], [name]: value },
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        address: { ...prev.contactInfo.address, [name]: value },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updatedTenant = await fetchApi(`/super-admin/tenants/${tenant._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(formData),
        },
      );
      if (updatedTenant) {
        toast.success(`Tenant ${tenant.name} actualizado correctamente`);
        onSave(updatedTenant);
      } else {
        throw new Error("No se recibió una respuesta válida del servidor.");
      }
    } catch (error) {
      toast.error(`Error al actualizar el tenant ${tenant.name}`, { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar Tenant: {tenant.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-4">
          <Card>
            <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Tenant</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="suspended">Suspendido</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Tipo de Negocio</Label>
                  <Input id="businessType" name="businessType" value={formData.businessType} onChange={handleChange} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Suscripción</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subscriptionPlan">Plan de Suscripción</Label>
                  <Select value={formData.subscriptionPlan} onValueChange={(value) => setFormData(prev => ({ ...prev, subscriptionPlan: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscriptionExpiresAt">Fecha de Expiración</Label>
                  <Input id="subscriptionExpiresAt" name="subscriptionExpiresAt" type="date" value={formData.subscriptionExpiresAt ? new Date(formData.subscriptionExpiresAt).toISOString().split('T')[0] : ''} onChange={handleChange} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Información de Contacto</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={formData.contactInfo?.email} onChange={(e) => handleNestedChange('contactInfo', e)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" name="phone" value={formData.contactInfo?.phone} onChange={(e) => handleNestedChange('contactInfo', e)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <div className="grid grid-cols-2 gap-4 p-2 border rounded-md">
                  <Input placeholder="Calle" name="street" value={formData.contactInfo?.address?.street} onChange={handleAddressChange} />
                  <Input placeholder="Ciudad" name="city" value={formData.contactInfo?.address?.city} onChange={handleAddressChange} />
                  <Input placeholder="Estado" name="state" value={formData.contactInfo?.address?.state} onChange={handleAddressChange} />
                  <Input placeholder="Código Postal" name="zipCode" value={formData.contactInfo?.address?.zipCode} onChange={handleAddressChange} />
                  <Input placeholder="País" name="country" value={formData.contactInfo?.address?.country} onChange={handleAddressChange} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Información Fiscal</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rif">RIF</Label>
                  <Input id="rif" name="rif" value={formData.taxInfo?.rif} onChange={(e) => handleNestedChange('taxInfo', e)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Razón Social</Label>
                  <Input id="businessName" name="businessName" value={formData.taxInfo?.businessName} onChange={(e) => handleNestedChange('taxInfo', e)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
