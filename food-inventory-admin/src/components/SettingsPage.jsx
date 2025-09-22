import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getTenantSettings, updateTenantSettings, uploadTenantLogo } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RolesManagement from './RolesManagement';
import UserManagement from './UserManagement'; // Importar UserManagement
import ChangePasswordForm from './ChangePasswordForm'; // Importar ChangePasswordForm
import UsageAndBilling from './UsageAndBilling'; // Importar UsageAndBilling
import { useAuth } from '@/hooks/use-auth.jsx'; // Importar useAuth

const initialSettings = {
  name: '',
  website: '',
  logo: '',
  contactInfo: {
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
  },
  taxInfo: {
    rif: '',
    businessName: '',
  },
  settings: {
    currency: {
        primary: 'VES',
    },
    inventory: {
        fefoEnabled: true,
    },
    documentTemplates: {
      invoice: {
        primaryColor: '#000000',
        accentColor: '#FFFFFF',
        footerText: '',
      },
      quote: {
        primaryColor: '#000000',
        accentColor: '#FFFFFF',
        footerText: '',
      }
    }
  }
};

const SettingsPage = () => {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);
  const { hasPermission } = useAuth(); // Obtener hasPermission

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const { data, error } = await getTenantSettings();
        if (error) {
          toast.error('Error al cargar la configuración', { description: error });
        } else {
          const settingsData = data.data || {};
          // Deep merge fetched settings with initial settings to avoid undefined errors
          setSettings(prev => {
            const newSettings = {
              ...initialSettings,
              ...settingsData,
              contactInfo: { ...initialSettings.contactInfo, ...(settingsData.contactInfo || {}) },
              taxInfo: { ...initialSettings.taxInfo, ...(settingsData.taxInfo || {}) },
              settings: {
                ...initialSettings.settings,
                ...(settingsData.settings || {}),
                currency: {
                  ...initialSettings.settings.currency,
                  ...(settingsData.settings?.currency || {}),
                },
                inventory: {
                  ...initialSettings.settings.inventory,
                  ...(settingsData.settings?.inventory || {}),
                },
                documentTemplates: {
                  ...initialSettings.settings.documentTemplates,
                  ...(settingsData.settings?.documentTemplates || {}),
                  invoice: {
                    ...initialSettings.settings.documentTemplates.invoice,
                    ...(settingsData.settings?.documentTemplates?.invoice || {}),
                  },
                  quote: {
                    ...initialSettings.settings.documentTemplates.quote,
                    ...(settingsData.settings?.documentTemplates?.quote || {}),
                  },
                },
              },
            };
            return newSettings;
          });
          if (settingsData.logo) {
            setLogoPreviewUrl(settingsData.logo);
          }
        }
      } catch (error) {
        toast.error('Error de red', { description: 'No se pudo conectar con el servidor.' });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split('.');
    
    if (keys.length > 1) {
        setSettings(prev => {
            const newState = JSON.parse(JSON.stringify(prev)); // Deep copy
            let current = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    } else {
        setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (name, checked) => {
    const keys = name.split('.');
    setSettings(prev => {
        const newState = JSON.parse(JSON.stringify(prev)); // Deep copy
        let current = newState;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = checked;
        return newState;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setLogoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadLogo = async () => {
    if (!selectedFile) {
      toast.warning('No se ha seleccionado ningún archivo');
      return;
    }
    setIsUploadingLogo(true);
    try {
      const { data, error } = await uploadTenantLogo(selectedFile);
      if (error) {
        toast.error('Error al subir el logo', { description: error });
      } else {
        toast.success('Logo actualizado correctamente');
        setSettings(prev => ({ ...prev, logo: data.logo }));
        setLogoPreviewUrl(data.logo);
        setSelectedFile(null);
      }
    } catch (error) {
      toast.error('Error de red', { description: `No se pudo subir el logo: ${error.message}` });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await updateTenantSettings(settings);
      if (error) {
        toast.error('Error al guardar la configuración', { description: error });
      } else {
        toast.success('Configuración guardada correctamente');
      }
    } catch (error) {
      toast.error('Error de red', { description: `No se pudo guardar: ${error.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div>Cargando configuración...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Configuración</h1>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          {hasPermission('users_read') && <TabsTrigger value="users">Usuarios</TabsTrigger>}
          {hasPermission('roles_read') && <TabsTrigger value="roles">Roles y Permisos</TabsTrigger>}
          {hasPermission('billing_read') && <TabsTrigger value="billing">Uso y Facturación</TabsTrigger>}
        </TabsList>
        <TabsContent value="general">
          <div className="grid gap-6 lg:grid-cols-3 mt-4">
            {/* General Info & Logo Column */}
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Logo del Negocio</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex flex-col items-center">
                        <div className="w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                        {logoPreviewUrl ? (
                            <img src={logoPreviewUrl} alt="Vista previa del logo" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-muted-foreground text-sm">Vista Previa</span>
                        )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        <div className="flex gap-2">
                        <Button variant="outline" onClick={() => fileInputRef.current.click()}>
                            Seleccionar
                        </Button>
                        <Button onClick={handleUploadLogo} disabled={!selectedFile || isUploadingLogo}>
                            {isUploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                        </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Settings Column */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Información General y de Contacto</CardTitle>
                        <CardDescription>Datos principales de tu empresa.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Nombre del Negocio</Label><Input name="name" value={settings.name} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label>Sitio Web</Label><Input name="website" value={settings.website} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label>Email de Contacto</Label><Input name="contactInfo.email" value={settings.contactInfo.email} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label>Teléfono</Label><Input name="contactInfo.phone" value={settings.contactInfo.phone} onChange={handleInputChange} /></div>
                        <div className="space-y-2 md:col-span-2"><Label>Dirección</Label><Input name="contactInfo.address.street" value={settings.contactInfo.address.street} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label>Ciudad</Label><Input name="contactInfo.address.city" value={settings.contactInfo.address.city} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label>Estado/Provincia</Label><Input name="contactInfo.address.state" value={settings.contactInfo.address.state} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label>Código Postal</Label><Input name="contactInfo.address.zipCode" value={settings.contactInfo.address.zipCode} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label>País</Label><Input name="contactInfo.address.country" value={settings.contactInfo.address.country} onChange={handleInputChange} /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Información Fiscal</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>RIF</Label><Input name="taxInfo.rif" value={settings.taxInfo.rif} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label>Razón Social</Label><Input name="taxInfo.businessName" value={settings.taxInfo.businessName} onChange={handleInputChange} /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Configuraciones Varias</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label>Moneda Principal</Label><Input name="settings.currency.primary" value={settings.settings.currency.primary} onChange={handleInputChange} /></div>
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <Label>Habilitar Inventario FEFO (First-Expires, First-Out)</Label>
                            <Switch name="settings.inventory.fefoEnabled" checked={settings.settings.inventory.fefoEnabled} onCheckedChange={(c) => handleSwitchChange('settings.inventory.fefoEnabled', c)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Personalización de Documentos</CardTitle>
                        <CardDescription>Adapta la apariencia de tus facturas y presupuestos.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Label className="font-semibold">Facturas</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="space-y-2">
                                <Label>Color Primario</Label>
                                <Input 
                                    type="color" 
                                    name="settings.documentTemplates.invoice.primaryColor" 
                                    value={settings.settings.documentTemplates?.invoice?.primaryColor || '#000000'} 
                                    onChange={handleInputChange} 
                                    className="p-1 h-10 w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Color de Acento</Label>
                                <Input 
                                    type="color" 
                                    name="settings.documentTemplates.invoice.accentColor" 
                                    value={settings.settings.documentTemplates?.invoice?.accentColor || '#FFFFFF'} 
                                    onChange={handleInputChange}
                                    className="p-1 h-10 w-full"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Texto de Pie de Página (Factura)</Label>
                            <Input 
                                name="settings.documentTemplates.invoice.footerText" 
                                value={settings.settings.documentTemplates?.invoice?.footerText || ''} 
                                onChange={handleInputChange} 
                                placeholder="Ej: Gracias por su compra."
                            />
                        </div>

                        <div className="border-t border-border my-4"></div>

                        <Label className="font-semibold">Presupuestos</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="space-y-2">
                                <Label>Color Primario</Label>
                                <Input 
                                    type="color" 
                                    name="settings.documentTemplates.quote.primaryColor" 
                                    value={settings.settings.documentTemplates?.quote?.primaryColor || '#000000'} 
                                    onChange={handleInputChange} 
                                    className="p-1 h-10 w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Color de Acento</Label>
                                <Input 
                                    type="color" 
                                    name="settings.documentTemplates.quote.accentColor" 
                                    value={settings.settings.documentTemplates?.quote?.accentColor || '#FFFFFF'} 
                                    onChange={handleInputChange}
                                    className="p-1 h-10 w-full"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Texto de Pie de Página (Presupuesto)</Label>
                            <Input 
                                name="settings.documentTemplates.quote.footerText" 
                                value={settings.settings.documentTemplates?.quote?.footerText || ''} 
                                onChange={handleInputChange} 
                                placeholder="Ej: Presupuesto válido por 15 días."
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="security">
          <div className="grid gap-6 mt-4">
            <div className="lg:col-span-2">
              <ChangePasswordForm />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="users">
            <UserManagement />
        </TabsContent>
        <TabsContent value="roles">
            <RolesManagement />
        </TabsContent>
        <TabsContent value="billing">
            <UsageAndBilling />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
