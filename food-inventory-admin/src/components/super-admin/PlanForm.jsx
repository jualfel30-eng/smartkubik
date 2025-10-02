import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PlanForm = ({ plan, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0, // Price in cents
    limits: {
      maxUsers: 0,
      maxProducts: 0,
      maxOrders: 0,
      maxStorage: 0,
    },
  });
  const [priceInDollars, setPriceInDollars] = useState('0.00');

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price: plan.price || 0,
        limits: {
          maxUsers: plan.limits?.maxUsers ?? 0,
          maxProducts: plan.limits?.maxProducts ?? 0,
          maxOrders: plan.limits?.maxOrders ?? 0,
          maxStorage: plan.limits?.maxStorage ?? 0,
        },
      });
      setPriceInDollars((plan.price / 100).toFixed(2));
    } else {
      // Reset form for new plan
      setFormData({
        name: '',
        description: '',
        price: 0,
        limits: { maxUsers: 0, maxProducts: 0, maxOrders: 0, maxStorage: 0 },
      });
      setPriceInDollars('0.00');
    }
  }, [plan]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = e.target.type === 'number' ? parseInt(value, 10) || 0 : value;

    if (name.startsWith('limits.')) {
      const limitKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        limits: { ...prev.limits, [limitKey]: parsedValue },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: parsedValue }));
    }
  };

  const handlePriceChange = (e) => {
    const dollarValue = e.target.value;
    setPriceInDollars(dollarValue);
    // Update the underlying cents value in the main form data, rounding to avoid floating point issues
    setFormData(prev => ({ ...prev, price: Math.round(parseFloat(dollarValue) * 100) || 0 }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // The formData already has the price in cents, so we can just save it.
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Plan</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" name="description" value={formData.description} onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Precio (en Dólares)</Label>
        <Input id="price" name="price" type="number" value={priceInDollars} onChange={handlePriceChange} required step="0.01" min="0" />
      </div>

      <Card>
        <CardHeader><CardTitle>Límites</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="limits.maxUsers">Max. Usuarios</Label>
            <Input id="limits.maxUsers" name="limits.maxUsers" type="number" value={formData.limits.maxUsers} onChange={handleChange} min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="limits.maxProducts">Max. Productos</Label>
            <Input id="limits.maxProducts" name="limits.maxProducts" type="number" value={formData.limits.maxProducts} onChange={handleChange} min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="limits.maxOrders">Max. Órdenes/Mes</Label>
            <Input id="limits.maxOrders" name="limits.maxOrders" type="number" value={formData.limits.maxOrders} onChange={handleChange} min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="limits.maxStorage">Max. Almacenamiento (MB)</Label>
            <Input id="limits.maxStorage" name="limits.maxStorage" type="number" value={formData.limits.maxStorage} onChange={handleChange} min="0" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Guardar Plan</Button>
      </div>
    </form>
  );
};

export default PlanForm;
