import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getTenantSettings, updateTenantSettings } from "../lib/api";
import { toast } from "sonner";

const SettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await getTenantSettings();
        if (response.success) {
          setSettings(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch settings');
        }
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split('.');
    
    setSettings(prevSettings => {
      if (keys.length === 1) {
        return { ...prevSettings, [name]: value };
      }
      
      const newSettings = { ...prevSettings };
      let current = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] = { ...current[keys[i]] };
      }
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const promise = () => new Promise(async (resolve, reject) => {
      try {
        const response = await updateTenantSettings(settings);
        if (response.success) {
          setSettings(response.data);
          resolve(response.data);
        } else {
          throw new Error(response.message || 'Failed to update settings');
        }
      } catch (err) {
        reject(err);
      }
    });

    toast.promise(promise, {
      loading: 'Guardando cambios...',
      success: '¡Configuración guardada exitosamente!',
      error: (err) => `Error: ${err.message}`,
    });
  };

  if (isLoading) {
    return <div>Cargando configuración...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Configuración del Negocio</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Negocio</Label>
            <Input id="name" name="name" value={settings?.name || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Sitio Web</Label>
            <Input id="website" name="website" value={settings?.website || ''} onChange={handleChange} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información Fiscal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="taxInfo.businessName">Razón Social</Label>
            <Input id="taxInfo.businessName" name="taxInfo.businessName" value={settings?.taxInfo?.businessName || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxInfo.rif">RIF</Label>
            <Input id="taxInfo.rif" name="taxInfo.rif" value={settings?.taxInfo?.rif || ''} onChange={handleChange} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="contactInfo.email">Email de Contacto</Label>
            <Input id="contactInfo.email" name="contactInfo.email" type="email" value={settings?.contactInfo?.email || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactInfo.phone">Teléfono de Contacto</Label>
            <Input id="contactInfo.phone" name="contactInfo.phone" value={settings?.contactInfo?.phone || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactInfo.address.street">Dirección</Label>
            <Input id="contactInfo.address.street" name="contactInfo.address.street" value={settings?.contactInfo?.address?.street || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactInfo.address.city">Ciudad</Label>
            <Input id="contactInfo.address.city" name="contactInfo.address.city" value={settings?.contactInfo?.address?.city || ''} onChange={handleChange} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración Operativa y Financiera</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="settings.currency.primary">Moneda Principal</Label>
            <Input id="settings.currency.primary" name="settings.currency.primary" value={settings?.settings?.currency?.primary || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Zona Horaria</Label>
            <Input id="timezone" name="timezone" value={settings?.timezone || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings.inventory.lowStockAlertThreshold">Umbral de Alerta de Inventario</Label>
            <Input id="settings.inventory.lowStockAlertThreshold" name="settings.inventory.lowStockAlertThreshold" type="number" value={settings?.settings?.inventory?.lowStockAlertThreshold || 0} onChange={handleChange} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">Guardar Cambios</Button>
      </div>
    </form>
  );
};

export default SettingsPage;
