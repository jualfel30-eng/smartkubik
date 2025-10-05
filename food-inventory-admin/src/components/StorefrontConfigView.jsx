import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { 
  Palette, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Instagram, 
  MessageCircle,
  Eye,
  Save,
  AlertCircle,
  Upload,
  Code,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';

function StorefrontConfigView() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  // Estado inicial del formulario
  const [formData, setFormData] = useState({
    domain: '',
    isActive: false,
    templateType: 'ecommerce',
    theme: {
      primaryColor: '#FB923C',
      secondaryColor: '#F97316',
      logo: '',
      favicon: ''
    },
    seo: {
      title: '',
      description: '',
      keywords: []
    },
    socialMedia: {
      facebook: '',
      instagram: '',
      whatsapp: ''
    },
    contactInfo: {
      email: '',
      phone: '',
      address: ''
    },
    customCSS: ''
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/storefront/config');
      setConfig(data);
      setFormData({
        domain: data.domain || '',
        isActive: data.isActive || false,
        templateType: data.templateType || 'ecommerce',
        theme: {
          primaryColor: data.theme?.primaryColor || '#FB923C',
          secondaryColor: data.theme?.secondaryColor || '#F97316',
          logo: data.theme?.logo || '',
          favicon: data.theme?.favicon || ''
        },
        seo: {
          title: data.seo?.title || '',
          description: data.seo?.description || '',
          keywords: data.seo?.keywords || []
        },
        socialMedia: {
          facebook: data.socialMedia?.facebook || '',
          instagram: data.socialMedia?.instagram || '',
          whatsapp: data.socialMedia?.whatsapp || ''
        },
        contactInfo: {
          email: data.contactInfo?.email || '',
          phone: data.contactInfo?.phone || '',
          address: data.contactInfo?.address || ''
        },
        customCSS: data.customCSS || ''
      });
    } catch (err) {
      if (err.message.includes('No se encontró')) {
        // No hay configuración aún, usar valores por defecto
        toast.info('No hay configuración previa', { 
          description: 'Crea tu primera configuración del storefront' 
        });
      } else {
        toast.error('Error al cargar configuración', { description: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validaciones básicas
      if (!formData.domain) {
        toast.error('El dominio es requerido');
        return;
      }

      if (!formData.seo.title) {
        toast.error('El título SEO es requerido');
        return;
      }

      await fetchApi('/storefront/config', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      toast.success('Configuración guardada exitosamente', {
        description: 'Los cambios se han aplicado correctamente'
      });

      // Recargar configuración
      await loadConfig();
    } catch (err) {
      toast.error('Error al guardar', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (isActive) => {
    try {
      await fetchApi('/storefront/toggle', {
        method: 'PUT',
        body: JSON.stringify({ isActive })
      });

      setFormData(prev => ({ ...prev, isActive }));
      toast.success(isActive ? 'Storefront activado' : 'Storefront desactivado');
    } catch (err) {
      toast.error('Error al cambiar estado', { description: err.message });
    }
  };

  const checkDomainAvailability = async () => {
    if (!formData.domain) {
      toast.error('Ingresa un dominio primero');
      return;
    }

    try {
      setDomainChecking(true);
      const response = await fetchApi(`/storefront/check-domain?domain=${encodeURIComponent(formData.domain)}`);
      setDomainAvailable(response.isAvailable);
      
      if (response.isAvailable) {
        toast.success('Dominio disponible', { description: 'Puedes usar este dominio' });
      } else {
        toast.error('Dominio no disponible', { description: 'Este dominio ya está en uso' });
      }
    } catch (err) {
      toast.error('Error al verificar dominio', { description: err.message });
    } finally {
      setDomainChecking(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo es muy grande', { description: 'Máximo 2MB' });
      return;
    }

    try {
      setUploadingLogo(true);
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetchApi('/storefront/upload-logo', {
        method: 'POST',
        body: formDataUpload
      });

      setFormData(prev => ({
        ...prev,
        theme: { ...prev.theme, logo: response.theme.logo }
      }));

      toast.success('Logo subido exitosamente');
    } catch (err) {
      toast.error('Error al subir logo', { description: err.message });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (max 500KB)
    if (file.size > 500 * 1024) {
      toast.error('El archivo es muy grande', { description: 'Máximo 500KB' });
      return;
    }

    try {
      setUploadingFavicon(true);
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetchApi('/storefront/upload-favicon', {
        method: 'POST',
        body: formDataUpload
      });

      setFormData(prev => ({
        ...prev,
        theme: { ...prev.theme, favicon: response.theme.favicon }
      }));

      toast.success('Favicon subido exitosamente');
    } catch (err) {
      toast.error('Error al subir favicon', { description: err.message });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleKeywordsChange = (value) => {
    const keywords = value.split(',').map(k => k.trim()).filter(k => k);
    setFormData(prev => ({
      ...prev,
      seo: { ...prev.seo, keywords }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  const previewUrl = formData.domain 
    ? `http://localhost:3001/preview/${formData.domain}` 
    : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración del Storefront</h1>
          <p className="text-muted-foreground mt-1">
            Personaliza la apariencia y configuración de tu tienda online
          </p>
        </div>
        <div className="flex items-center gap-3">
          {previewUrl && (
            <Button 
              variant="outline" 
              onClick={() => window.open(previewUrl, '_blank')}
            >
              <Eye className="mr-2 h-4 w-4" />
              Vista Previa
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* Estado del Storefront */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estado del Storefront</CardTitle>
              <CardDescription>
                {formData.isActive 
                  ? 'Tu storefront está activo y visible públicamente' 
                  : 'Tu storefront está desactivado'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {formData.isActive ? 'Activo' : 'Inactivo'}
              </span>
              <Switch
                checked={formData.isActive}
                onCheckedChange={handleToggleActive}
              />
            </div>
          </div>
        </CardHeader>
        {formData.domain && (
          <CardContent>
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                <strong>Dominio:</strong> {formData.domain}
                {previewUrl && (
                  <>
                    {' • '}
                    <a 
                      href={previewUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Ver sitio público
                    </a>
                  </>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Formulario Principal */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="theme">Tema</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="social">Redes Sociales</TabsTrigger>
              <TabsTrigger value="advanced">Avanzado</TabsTrigger>
            </TabsList>

            {/* Tab: General */}
            <TabsContent value="general" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="domain">Dominio *</Label>
                <div className="flex gap-2">
                  <Input
                    id="domain"
                    placeholder="mi-tienda.smartkubik.com"
                    value={formData.domain}
                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  />
                  <Button 
                    variant="outline" 
                    onClick={checkDomainAvailability}
                    disabled={domainChecking}
                  >
                    {domainChecking ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {domainAvailable !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    {domainAvailable ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Dominio disponible</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">Dominio no disponible</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateType">Tipo de Template</Label>
                <Select
                  value={formData.templateType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, templateType: value }))}
                >
                  <SelectTrigger id="templateType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecommerce">E-commerce (Tienda Online)</SelectItem>
                    <SelectItem value="services">Servicios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Tab: Tema */}
            <TabsContent value="theme" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Color Primario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.theme.primaryColor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        theme: { ...prev.theme, primaryColor: e.target.value }
                      }))}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.theme.primaryColor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        theme: { ...prev.theme, primaryColor: e.target.value }
                      }))}
                      placeholder="#FB923C"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Color Secundario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={formData.theme.secondaryColor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        theme: { ...prev.theme, secondaryColor: e.target.value }
                      }))}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.theme.secondaryColor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        theme: { ...prev.theme, secondaryColor: e.target.value }
                      }))}
                      placeholder="#F97316"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <div className="flex items-center gap-4">
                  {formData.theme.logo && (
                    <img 
                      src={formData.theme.logo} 
                      alt="Logo" 
                      className="h-16 w-auto object-contain border rounded"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload').click()}
                      disabled={uploadingLogo}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recomendado: PNG o SVG, máximo 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="favicon">Favicon</Label>
                <div className="flex items-center gap-4">
                  {formData.theme.favicon && (
                    <img 
                      src={formData.theme.favicon} 
                      alt="Favicon" 
                      className="h-8 w-8 object-contain border rounded"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      id="favicon-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('favicon-upload').click()}
                      disabled={uploadingFavicon}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingFavicon ? 'Subiendo...' : 'Subir Favicon'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recomendado: ICO o PNG 32x32, máximo 500KB
                    </p>
                  </div>
                </div>
              </div>

              {/* Vista Previa del Tema */}
              <div className="border rounded-lg p-6 space-y-4">
                <h3 className="font-semibold">Vista Previa del Tema</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className="p-4 rounded-lg text-white"
                    style={{ backgroundColor: formData.theme.primaryColor }}
                  >
                    <p className="font-semibold">Color Primario</p>
                    <p className="text-sm opacity-90">Botones y elementos principales</p>
                  </div>
                  <div 
                    className="p-4 rounded-lg text-white"
                    style={{ backgroundColor: formData.theme.secondaryColor }}
                  >
                    <p className="font-semibold">Color Secundario</p>
                    <p className="text-sm opacity-90">Acentos y hover states</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: SEO */}
            <TabsContent value="seo" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">Título SEO *</Label>
                <Input
                  id="seoTitle"
                  placeholder="Mi Tienda Online - Los Mejores Productos"
                  value={formData.seo.title}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    seo: { ...prev.seo, title: e.target.value }
                  }))}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.seo.title.length}/60 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoDescription">Descripción SEO</Label>
                <Textarea
                  id="seoDescription"
                  placeholder="Descripción breve de tu tienda para motores de búsqueda"
                  value={formData.seo.description}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    seo: { ...prev.seo, description: e.target.value }
                  }))}
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.seo.description.length}/160 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoKeywords">Palabras Clave (separadas por comas)</Label>
                <Input
                  id="seoKeywords"
                  placeholder="tienda, productos, compras, online"
                  value={formData.seo.keywords.join(', ')}
                  onChange={(e) => handleKeywordsChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.seo.keywords.length} palabras clave
                </p>
              </div>
            </TabsContent>

            {/* Tab: Redes Sociales */}
            <TabsContent value="social" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="facebook">
                  <Facebook className="inline h-4 w-4 mr-2" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  placeholder="https://facebook.com/mitienda"
                  value={formData.socialMedia.facebook}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    socialMedia: { ...prev.socialMedia, facebook: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">
                  <Instagram className="inline h-4 w-4 mr-2" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  placeholder="@mitienda"
                  value={formData.socialMedia.instagram}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">
                  <MessageCircle className="inline h-4 w-4 mr-2" />
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  placeholder="+584121234567"
                  value={formData.socialMedia.whatsapp}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    socialMedia: { ...prev.socialMedia, whatsapp: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email de Contacto
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contacto@mitienda.com"
                  value={formData.contactInfo.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, email: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="inline h-4 w-4 mr-2" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  placeholder="+584121234567"
                  value={formData.contactInfo.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, phone: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  <MapPin className="inline h-4 w-4 mr-2" />
                  Dirección
                </Label>
                <Textarea
                  id="address"
                  placeholder="Av. Principal, Caracas, Venezuela"
                  value={formData.contactInfo.address}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, address: e.target.value }
                  }))}
                  rows={2}
                />
              </div>
            </TabsContent>

            {/* Tab: Avanzado */}
            <TabsContent value="advanced" className="space-y-4 mt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Advertencia:</strong> El CSS personalizado puede afectar la apariencia 
                  de tu storefront. Usa con precaución.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="customCSS">
                  <Code className="inline h-4 w-4 mr-2" />
                  CSS Personalizado
                </Label>
                <Textarea
                  id="customCSS"
                  placeholder=".custom-button { background: red; }"
                  value={formData.customCSS}
                  onChange={(e) => setFormData(prev => ({ ...prev, customCSS: e.target.value }))}
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Este CSS se aplicará globalmente en tu storefront
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={loadConfig}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}

export default StorefrontConfigView;
