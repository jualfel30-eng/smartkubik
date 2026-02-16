import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getTenantSettings, updateTenantSettings, uploadTenantLogo } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RolesManagement from './RolesManagement';
import UserManagement from './UserManagement'; // Importar UserManagement
import ChangePasswordForm from './ChangePasswordForm'; // Importar ChangePasswordForm
import UsageAndBilling from './UsageAndBilling'; // Importar UsageAndBilling
import { DeliverySettings } from './DeliverySettings'; // Importar DeliverySettings
import { NotificationSettings } from './NotificationSettings';
import WhatsAppConnection from './WhatsAppConnection'; // Importar WhatsAppConnection
import { useAuth } from '@/hooks/use-auth.jsx'; // Importar useAuth
import TenantKnowledgeBaseManager from './TenantKnowledgeBaseManager';
import EmailConfiguration from './EmailConfiguration'; // Importar EmailConfiguration
import { BillingSettings } from './BillingSettings'; // Importar BillingSettings
import { PaymentMethodsSettings } from './PaymentMethodsSettings'; // Importar PaymentMethodsSettings
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_VERTICAL_KEY, getVerticalProfile, listVerticalProfiles } from '@/config/verticalProfiles.js';
import { getAvailableCountries } from '@/country-plugins/registry';

const initialSettings = {
  name: '',
  website: '',
  logo: '',
  countryCode: 'VE',
  verticalProfile: {
    key: DEFAULT_VERTICAL_KEY,
    overrides: {},
  },
  aiAssistant: {
    autoReplyEnabled: false,
    knowledgeBaseTenantId: '',
    model: 'gpt-4o-mini',
    capabilities: {
      knowledgeBaseEnabled: true,
      inventoryLookup: false,
      schedulingLookup: false,
      orderLookup: false,
    },
  },
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
    invoiceFormat: 'standard',
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
    },
    hospitalityPolicies: {
      depositRequired: true,
      depositPercentage: 30,
      cancellationWindowHours: 24,
      noShowPenaltyType: 'percentage',
      noShowPenaltyValue: 100,
      manualNotes: '',
    },
    billingPreferences: {
      defaultDeliveryMethod: 'none',
      autoPrintCopies: 1,
      enabledMethods: ['print', 'email', 'whatsapp'],
      printers: { receiptPrinterIp: '' }
    },
    billing: { // New billing settings structure
      invoicePrefix: '',
      nextInvoiceNumber: 1,
      taxRate: 0,
      taxName: 'IVA',
      legalNotes: '',
    },
  }
};

const BASE_VERTICAL_LABELS = {
  FOOD_SERVICE: 'Alimentación',
  RETAIL: 'Retail',
  SERVICES: 'Servicios',
  LOGISTICS: 'Logística',
};

const SettingsPage = () => {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);
  const { hasPermission, tenant, updateTenantContext } = useAuth(); // Obtener hasPermission y tenant
  const tenantVerticalKey = tenant?.verticalProfile?.key || DEFAULT_VERTICAL_KEY;
  const verticalOptions = useMemo(() => listVerticalProfiles(), []);
  const availableCountries = useMemo(() => getAvailableCountries(), []);
  const selectedVerticalProfile = useMemo(
    () => getVerticalProfile(settings.verticalProfile?.key, settings.verticalProfile?.overrides),
    [settings.verticalProfile?.key, settings.verticalProfile?.overrides],
  );
  const isVerticalDirty = settings.verticalProfile?.key !== tenantVerticalKey;

  const applySettingsData = (settingsData = {}) => {
    const mergedSettings = {
      ...initialSettings,
      ...settingsData,
      countryCode: settingsData.countryCode || initialSettings.countryCode,
      verticalProfile: {
        key: settingsData.verticalProfile?.key || initialSettings.verticalProfile.key,
        overrides: { ...(settingsData.verticalProfile?.overrides || {}) },
      },
      aiAssistant: {
        ...initialSettings.aiAssistant,
        ...(settingsData.aiAssistant || {}),
        capabilities: {
          ...initialSettings.aiAssistant.capabilities,
          ...(settingsData.aiAssistant?.capabilities || {}),
        },
      },
      contactInfo: {
        ...initialSettings.contactInfo,
        ...(settingsData.contactInfo || {}),
        address: {
          ...initialSettings.contactInfo.address,
          ...(settingsData.contactInfo?.address || {}),
        },
      },
      taxInfo: {
        ...initialSettings.taxInfo,
        ...(settingsData.taxInfo || {}),
      },
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
        hospitalityPolicies: {
          ...initialSettings.settings.hospitalityPolicies,
          ...(settingsData.settings?.hospitalityPolicies || {}),
        },
        billingPreferences: {
          ...initialSettings.settings.billingPreferences,
          ...(settingsData.settings?.billingPreferences || {}),
        },
        billing: { // Merge new billing settings
          ...initialSettings.settings.billing,
          ...(settingsData.settings?.billing || {}),
        },
      },
    };
    setSettings(mergedSettings);

    setLogoPreviewUrl(mergedSettings.logo || '');
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await getTenantSettings();
        if (response?.error) {
          toast.error('Error al cargar la configuración', { description: response.error });
        } else if (response?.data) {
          applySettingsData(response.data);
        }
      } catch (error) {
        console.error('Error fetching tenant settings:', error);
        toast.error('Error de red', { description: 'No se pudo conectar con el servidor.' });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const setNestedValue = (path, value) => {
    const keys = path.split('.');
    setSettings(prev => {
      const newState = JSON.parse(JSON.stringify(prev)); // Deep copy
      let current = newState;
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newState;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split('.');

    if (keys.length > 1) {
      setNestedValue(name, value);
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (name, checked) => {
    setNestedValue(name, checked);
  };

  const handleSelectChange = (name) => (value) => {
    setNestedValue(name, value);
  };

  const handleVerticalChange = (value) => {
    if (!value || value === settings.verticalProfile?.key) {
      return;
    }

    const selectedOption = verticalOptions.find((option) => option.key === value);
    const confirmationMessage = selectedOption
      ? `¿Confirmas que deseas cambiar el perfil vertical a "${selectedOption.label}"?`
      : '¿Confirmas que deseas cambiar el perfil vertical?';

    if (!window.confirm(`${confirmationMessage} Esto puede afectar los formularios y validaciones del sistema.`)) {
      return;
    }

    setSettings((prev) => ({
      ...prev,
      verticalProfile: {
        key: value,
        overrides: {},
      },
    }));
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
      const response = await updateTenantSettings(settings);
      if (response?.error) {
        toast.error('Error al guardar la configuración', { description: response.error });
      } else {
        toast.success('Configuración guardada correctamente');
        if (response?.data) {
          applySettingsData(response.data);
          updateTenantContext?.({
            name: response.data.name,
            contactInfo: response.data.contactInfo,
            taxInfo: response.data.taxInfo,
            verticalProfile: {
              key: response.data.verticalProfile?.key || settings.verticalProfile.key,
              overrides: { ...(response.data.verticalProfile?.overrides || {}) },
            },
            aiAssistant: {
              autoReplyEnabled: Boolean(response.data.aiAssistant?.autoReplyEnabled),
              knowledgeBaseTenantId: response.data.aiAssistant?.knowledgeBaseTenantId || '',
              model: response.data.aiAssistant?.model || initialSettings.aiAssistant.model,
              capabilities: {
                ...initialSettings.aiAssistant.capabilities,
                ...(response.data.aiAssistant?.capabilities || {}),
              },
            },
          });
        }
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
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger> {/* New Tab */}
          {tenant?.enabledModules?.chat && hasPermission('chat_read') && <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>}
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          {hasPermission('users_read') && <TabsTrigger value="users">Usuarios</TabsTrigger>}
          {hasPermission('roles_read') && <TabsTrigger value="roles">Roles y Permisos</TabsTrigger>}
          {hasPermission('billing_read') && <TabsTrigger value="billing">Suscripción</TabsTrigger>}
          {hasPermission('billing_read') && <TabsTrigger value="billing-config">Facturación</TabsTrigger>}
        </TabsList>
        <TabsContent value="payments" className="mt-10">
          <PaymentMethodsSettings />
        </TabsContent>
        <TabsContent value="general" className="mt-10">
          <div className="grid gap-6 lg:grid-cols-3">
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
                  <CardTitle>Perfil Vertical</CardTitle>
                  <CardDescription>
                    Adapta los módulos de productos, inventario y órdenes según tu tipo de negocio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Vertical activa</Label>
                    <Select value={settings.verticalProfile?.key} onValueChange={handleVerticalChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {verticalOptions.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isVerticalDirty && (
                      <p className="text-sm text-amber-600">
                        Cambios pendientes por guardar.
                      </p>
                    )}
                  </div>
                  <div className="rounded-md border border-dashed p-4">
                    <p className="text-sm text-muted-foreground">
                      Base: <span className="font-medium text-foreground">
                        {BASE_VERTICAL_LABELS[selectedVerticalProfile.baseVertical] || selectedVerticalProfile.baseVertical}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Unidades sugeridas:{' '}
                      {Array.isArray(selectedVerticalProfile.defaultUnits) && selectedVerticalProfile.defaultUnits.length > 0
                        ? selectedVerticalProfile.defaultUnits.join(', ')
                        : '—'}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc pl-4">
                      <li>
                        {selectedVerticalProfile.supportsVariants ? 'Variantes habilitadas' : 'Variantes deshabilitadas'}
                      </li>
                      <li>
                        {selectedVerticalProfile.hasSizeMatrix
                          ? 'Inventario por matriz de atributos'
                          : 'Inventario lineal'}
                      </li>
                      <li>
                        {selectedVerticalProfile.inventory?.requiresSerialTracking
                          ? 'Seguimiento de seriales obligatorio'
                          : 'Seriales opcionales'}
                      </li>
                      <li>
                        {selectedVerticalProfile.allowsWeight
                          ? 'Permite productos por peso'
                          : 'Productos por unidad'}
                      </li>
                    </ul>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Guarda la configuración para aplicar cambios en los formularios y validaciones.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>País / Región</CardTitle>
                  <CardDescription>
                    Define el país de operación del negocio. Esto determina la moneda, impuestos y métodos de pago disponibles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Label>País de operación</Label>
                  <Select value={settings.countryCode} onValueChange={(value) => setSettings(prev => ({ ...prev, countryCode: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un país" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCountries.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    El cambio de país aplica al guardar. Recarga la página para que el sistema actualice moneda e impuestos.
                  </p>
                </CardContent>
              </Card>

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
                  <CardTitle>Políticas de Depósitos y Cancelación (Hospitality)</CardTitle>
                  <CardDescription>
                    Ajusta el porcentaje de depósito, la ventana de cancelación y la penalización por no-show para tus reservas hoteleras.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between rounded-md border p-4">
                    <div>
                      <p className="font-semibold">Requerir depósito</p>
                      <p className="text-sm text-muted-foreground">Solicita un abono inicial para que la reserva quede confirmada.</p>
                    </div>
                    <Switch
                      checked={Boolean(settings.settings.hospitalityPolicies?.depositRequired)}
                      onCheckedChange={(checked) => handleSwitchChange('settings.hospitalityPolicies.depositRequired', checked)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Porcentaje de depósito (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        name="settings.hospitalityPolicies.depositPercentage"
                        value={settings.settings.hospitalityPolicies?.depositPercentage ?? ''}
                        onChange={handleInputChange}
                      />
                      <p className="text-xs text-muted-foreground">Se muestra en el portal público y en los mensajes automáticos.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Cancelación sin penalización (horas)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        name="settings.hospitalityPolicies.cancellationWindowHours"
                        value={settings.settings.hospitalityPolicies?.cancellationWindowHours ?? ''}
                        onChange={handleInputChange}
                      />
                      <p className="text-xs text-muted-foreground">Tiempo mínimo antes de la cita para permitir cancelaciones gratuitas.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Penalización por no-show</Label>
                      <Select
                        value={settings.settings.hospitalityPolicies?.noShowPenaltyType || 'percentage'}
                        onValueChange={(value) => setNestedValue('settings.hospitalityPolicies.noShowPenaltyType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Porcentaje del servicio</SelectItem>
                          <SelectItem value="fixed">Monto fijo (moneda primaria)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor de la penalización</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        name="settings.hospitalityPolicies.noShowPenaltyValue"
                        value={settings.settings.hospitalityPolicies?.noShowPenaltyValue ?? ''}
                        onChange={handleInputChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        Si el tipo es porcentaje, ingresa un valor entre 0 y 100. Para monto fijo, usa la moneda principal.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notas operativas</Label>
                    <Textarea
                      rows={3}
                      name="settings.hospitalityPolicies.manualNotes"
                      value={settings.settings.hospitalityPolicies?.manualNotes || ''}
                      onChange={handleInputChange}
                      placeholder="Instrucciones internas: horarios de validación, bancos preferidos, procedimientos especiales, etc."
                    />
                    <p className="text-xs text-muted-foreground">Se mostrará como guía rápida para el equipo de reservas.</p>
                  </div>
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

                  <div className="border-t border-border my-4"></div>

                  <Label className="font-semibold">Configuración General de Facturas</Label>
                  <div className="space-y-2">
                    <Label>Formato de Factura</Label>
                    <Select
                      value={settings.settings.invoiceFormat || 'standard'}
                      onValueChange={(value) => {
                        setSettings(prev => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            invoiceFormat: value
                          }
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar formato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Estándar (A4)</SelectItem>
                        <SelectItem value="thermal">Impresora Térmica (80mm)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Estándar para facturas normales, Térmica para tickets de caja. Los montos se mostrarán en USD y Bs usando el tipo de cambio del BCV.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Asistente Inteligente</CardTitle>
                  <CardDescription>Controla cómo responde el asistente dentro de tu organización.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-muted/40 p-3">
                    <div>
                      <Label className="font-medium">Auto-respuesta en WhatsApp</Label>
                      <p className="text-sm text-muted-foreground">
                        Permite que el asistente responda mensajes entrantes usando tu base de conocimiento.
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(settings.aiAssistant?.autoReplyEnabled)}
                      onCheckedChange={(checked) =>
                        handleSwitchChange('aiAssistant.autoReplyEnabled', checked)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Modelo preferido</Label>
                    <Select
                      value={settings.aiAssistant?.model || initialSettings.aiAssistant.model}
                      onValueChange={handleSelectChange('aiAssistant.model')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o-mini">GPT-4o mini (recomendado)</SelectItem>
                        <SelectItem value="gpt-4.1-mini">GPT-4.1 mini</SelectItem>
                        <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Usa <span className="font-semibold">GPT-4o mini</span> para un equilibrio entre precisión y costos.
                      Cambia a modelos más potentes solo si necesitas razonamiento extendido.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="font-medium">Capacidades habilitadas</Label>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-muted/30 p-3">
                        <div>
                          <Label>Usar base de conocimiento personalizada</Label>
                          <p className="text-xs text-muted-foreground">
                            Permite que el asistente cite documentos cargados por tu equipo para respuestas más precisas.
                          </p>
                        </div>
                        <Switch
                          checked={Boolean(settings.aiAssistant?.capabilities?.knowledgeBaseEnabled)}
                          onCheckedChange={(checked) =>
                            handleSwitchChange('aiAssistant.capabilities.knowledgeBaseEnabled', checked)
                          }
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-muted/30 p-3">
                        <div>
                          <Label>Verificar inventario en tiempo real</Label>
                          <p className="text-xs text-muted-foreground">
                            Autoriza que la IA consulte stock, costos y alertas directamente en el sistema.
                          </p>
                        </div>
                        <Switch
                          checked={Boolean(settings.aiAssistant?.capabilities?.inventoryLookup)}
                          onCheckedChange={(checked) =>
                            handleSwitchChange('aiAssistant.capabilities.inventoryLookup', checked)
                          }
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-muted/30 p-3">
                        <div>
                          <Label>Verificar disponibilidad de servicios</Label>
                          <p className="text-xs text-muted-foreground">
                            Permite que la IA consulte horarios y recursos antes de ofrecer citas.
                          </p>
                        </div>
                        <Switch
                          checked={Boolean(settings.aiAssistant?.capabilities?.schedulingLookup)}
                          onCheckedChange={(checked) =>
                            handleSwitchChange('aiAssistant.capabilities.schedulingLookup', checked)
                          }
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-muted/20 p-3 opacity-60">
                        <div>
                          <Label>Consultar estados de pedidos</Label>
                          <p className="text-xs text-muted-foreground">
                            Próximamente: seguimiento de órdenes y cuentas por cobrar desde el asistente.
                          </p>
                        </div>
                        <Switch disabled checked={Boolean(settings.aiAssistant?.capabilities?.orderLookup)} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
                    <p>
                      El asistente siempre tendrá acceso a la documentación global de SmartKubik{' '}
                      <span className="font-semibold">(smartkubik_docs)</span>. Los documentos del tenant se usan cuando
                      las capacidades correspondientes están activas.
                    </p>
                    <p>
                      Todas las respuestas verifican la información antes de confirmar precios o disponibilidad.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <TenantKnowledgeBaseManager />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="delivery" className="mt-10">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estrategia de Entrega Global</CardTitle>
                <CardDescription>Define cómo se procesan las órdenes al completarse el pago.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Estrategia de Entrega</Label>
                  <Select
                    value={settings.settings.fulfillmentStrategy || 'logistics'}
                    onValueChange={(value) => setNestedValue('settings.fulfillmentStrategy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una estrategia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="logistics">Logística (Estándar)</SelectItem>
                      <SelectItem value="counter">Mostrador / Pickup</SelectItem>
                      <SelectItem value="immediate">Inmediata (Retail)</SelectItem>
                      <SelectItem value="hybrid">Híbrido (Auto-detectar)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {settings.settings.fulfillmentStrategy === 'immediate' && "Ideal para supermercados: La orden se marca como entregada inmediatamente al pagar."}
                    {settings.settings.fulfillmentStrategy === 'counter' && "Ideal para comida rápida: La orden pasa directo a 'Picking' para preparación inmediata."}
                    {settings.settings.fulfillmentStrategy === 'hybrid' && "Automático: La orden se comporta según el método de envío (Pickup -> Picking, Delivery -> Logística, POS -> Inmediato)."}
                    {(settings.settings.fulfillmentStrategy === 'logistics' || !settings.settings.fulfillmentStrategy) && "Flujo completo para e-commerce: Pendiente -> Picking -> Empacado -> En Camino -> Entregado."}
                  </p>
                </div>
              </CardContent>
            </Card>
            <DeliverySettings />
          </div>
        </TabsContent>
        <TabsContent value="notifications" className="mt-10">
          <NotificationSettings
            settings={settings.settings}
            onSettingChange={(newPrefs) => setNestedValue('settings.notifications', newPrefs)}
          />
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="email" className="mt-10">
          <EmailConfiguration />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-10">
          <WhatsAppConnection />
        </TabsContent>
        <TabsContent value="security" className="mt-10">
          <div className="grid gap-6">
            <div className="lg:col-span-2">
              <ChangePasswordForm />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="users" className="mt-10">
          <UserManagement />
        </TabsContent>
        <TabsContent value="roles" className="mt-10">
          <RolesManagement />
        </TabsContent>
        <TabsContent value="billing" className="mt-10">
          <UsageAndBilling />
        </TabsContent>
        <TabsContent value="billing-config" className="mt-10">
          <BillingSettings
            settings={settings.settings}
            onSettingChange={(newPrefs) => setNestedValue('settings.billingPreferences', newPrefs)}
          />
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
