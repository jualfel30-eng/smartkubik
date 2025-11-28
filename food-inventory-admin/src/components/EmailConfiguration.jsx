import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Mail, Check, X, Send, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';

const EmailConfiguration = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  // Gmail/Outlook OAuth
  const [isConnecting, setIsConnecting] = useState(false);

  // Resend form
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('');
  const [isSavingResend, setIsSavingResend] = useState(false);

  // SMTP form
  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [smtpData, setSmtpData] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: '',
    replyTo: '',
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  useEffect(() => {
    fetchEmailConfig();

    // Check for OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const emailConnected = params.get('emailConnected');
    const success = params.get('success');
    const error = params.get('error');

    if (emailConnected) {
      if (success === 'true') {
        toast.success(`${emailConnected === 'gmail' ? 'Gmail' : 'Outlook'} conectado exitosamente`);
        fetchEmailConfig();
      } else {
        toast.error(`Error al conectar ${emailConnected}`, {
          description: error ? decodeURIComponent(error) : 'Error desconocido',
        });
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchEmailConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/email-config');
      if (response.success) {
        setConfig(response.data);
      }
    } catch (error) {
      toast.error('Error al cargar configuración de email', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      setIsConnecting(true);
      const response = await api.get('/email-config/gmail/auth-url');
      if (response.success) {
        // Open OAuth window
        window.location.href = response.authUrl;
      }
    } catch (error) {
      toast.error('Error al generar URL de Gmail', {
        description: error.message,
      });
      setIsConnecting(false);
    }
  };

  const handleConnectOutlook = async () => {
    try {
      setIsConnecting(true);
      const response = await api.get('/email-config/outlook/auth-url');
      if (response.success) {
        // Open OAuth window
        window.location.href = response.authUrl;
      }
    } catch (error) {
      toast.error('Error al generar URL de Outlook', {
        description: error.message,
      });
      setIsConnecting(false);
    }
  };

  const handleConnectResend = async () => {
    try {
      setIsSavingResend(true);
      const response = await api.post('/email-config/resend/connect', {
        apiKey: resendApiKey,
        fromEmail: resendFromEmail,
      });
      if (response.data.success) {
        toast.success('Resend conectado exitosamente');
        setShowResendForm(false);
        setResendApiKey('');
        setResendFromEmail('');
        fetchEmailConfig();
      }
    } catch (error) {
      toast.error('Error al conectar Resend', {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setIsSavingResend(false);
    }
  };

  const handleConnectSmtp = async () => {
    try {
      setIsSavingSmtp(true);
      const response = await api.post('/email-config/smtp/connect', smtpData);
      if (response.data.success) {
        toast.success('SMTP configurado exitosamente');
        setShowSmtpForm(false);
        setSmtpData({
          host: '',
          port: 587,
          secure: false,
          user: '',
          pass: '',
          from: '',
          replyTo: '',
        });
        fetchEmailConfig();
      }
    } catch (error) {
      toast.error('Error al configurar SMTP', {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.warning('Ingresa un email para enviar la prueba');
      return;
    }

    try {
      setIsTesting(true);
      const response = await api.post('/email-config/test', {
        testEmail,
      });
      if (response.data.success) {
        toast.success('Email de prueba enviado exitosamente');
        setTestEmail('');
      }
    } catch (error) {
      toast.error('Error al enviar email de prueba', {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('¿Estás seguro de desconectar el proveedor de email actual?')) {
      return;
    }

    try {
      const response = await api.post('/email-config/disconnect');
      if (response.data.success) {
        toast.success('Proveedor de email desconectado');
        fetchEmailConfig();
      }
    } catch (error) {
      toast.error('Error al desconectar proveedor', {
        description: error.response?.data?.message || error.message,
      });
    }
  };

  if (loading) {
    return <div className="p-4">Cargando configuración de email...</div>;
  }

  const getProviderName = (provider) => {
    const names = {
      gmail: 'Gmail',
      outlook: 'Outlook',
      resend: 'Resend',
      smtp: 'SMTP Manual',
      none: 'Sin configurar',
    };
    return names[provider] || provider;
  };

  const getProviderIcon = (provider) => {
    if (provider === 'none') return <X className="w-5 h-5 text-muted-foreground" />;
    return <Check className="w-5 h-5 text-green-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Current Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Estado de Configuración de Email
          </CardTitle>
          <CardDescription>
            Configura cómo tu negocio enviará emails automáticos a tus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getProviderIcon(config?.provider)}
                  <p className="font-semibold">
                    Proveedor: {getProviderName(config?.provider)}
                  </p>
                </div>
                {config?.enabled && config?.connectedEmail && (
                  <p className="text-sm text-muted-foreground">
                    Cuenta conectada: {config.connectedEmail}
                  </p>
                )}
                {config?.enabled && config?.fromEmail && (
                  <p className="text-sm text-muted-foreground">
                    Email desde: {config.fromEmail}
                  </p>
                )}
                {!config?.enabled && (
                  <p className="text-sm text-muted-foreground">
                    No hay ningún proveedor de email configurado
                  </p>
                )}
              </div>
              {config?.enabled && config?.provider !== 'none' && (
                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Options */}
      <Card>
        <CardHeader>
          <CardTitle>Conectar Proveedor de Email</CardTitle>
          <CardDescription>
            Elige cómo quieres enviar emails. Gmail y Outlook son las opciones más fáciles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gmail */}
          <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">Gmail</h3>
                <p className="text-sm text-muted-foreground">
                  Conecta tu cuenta de Gmail con un solo clic. Recomendado para la mayoría de usuarios.
                </p>
              </div>
              <Button onClick={handleConnectGmail} disabled={isConnecting}>
                {isConnecting ? 'Conectando...' : 'Conectar Gmail'}
              </Button>
            </div>
          </div>

          {/* Outlook */}
          <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">Outlook / Office 365</h3>
                <p className="text-sm text-muted-foreground">
                  Conecta tu cuenta de Outlook o Microsoft 365 con un solo clic.
                </p>
              </div>
              <Button onClick={handleConnectOutlook} disabled={isConnecting}>
                {isConnecting ? 'Conectando...' : 'Conectar Outlook'}
              </Button>
            </div>
          </div>

          {/* Resend */}
          <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">Resend</h3>
                <p className="text-sm text-muted-foreground">
                  Servicio profesional de envío de emails con API key. Ideal para alto volumen.
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowResendForm(true)}>
                Configurar Resend
              </Button>
            </div>
          </div>

          {/* SMTP Manual */}
          <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">SMTP Manual</h3>
                <p className="text-sm text-muted-foreground">
                  Configuración avanzada para usar tu propio servidor SMTP.
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowSmtpForm(true)}>
                Configurar SMTP
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Email */}
      {config?.enabled && config?.provider !== 'none' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Probar Configuración
            </CardTitle>
            <CardDescription>
              Envía un email de prueba para verificar que todo funciona correctamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleTestEmail} disabled={isTesting}>
                {isTesting ? 'Enviando...' : 'Enviar Prueba'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resend Dialog */}
      <Dialog open={showResendForm} onOpenChange={setShowResendForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Resend</DialogTitle>
            <DialogDescription>
              Ingresa tu API key de Resend y el email desde el cual se enviarán los mensajes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="re_xxxxxxxxxxxxx"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email remitente</Label>
              <Input
                type="email"
                placeholder="noreply@tudominio.com"
                value={resendFromEmail}
                onChange={(e) => setResendFromEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Debe ser un email verificado en tu cuenta de Resend
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResendForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConnectResend} disabled={isSavingResend}>
              {isSavingResend ? 'Guardando...' : 'Conectar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMTP Dialog */}
      <Dialog open={showSmtpForm} onOpenChange={setShowSmtpForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar SMTP Manual</DialogTitle>
            <DialogDescription>
              Configura tu servidor SMTP personalizado. Contacta a tu proveedor de hosting si no conoces estos datos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Servidor SMTP (Host)</Label>
                <Input
                  placeholder="smtp.example.com"
                  value={smtpData.host}
                  onChange={(e) => setSmtpData({ ...smtpData, host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Puerto</Label>
                <Input
                  type="number"
                  placeholder="587"
                  value={smtpData.port}
                  onChange={(e) => setSmtpData({ ...smtpData, port: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2 flex items-center justify-between pt-8">
                <Label>Conexión segura (SSL/TLS)</Label>
                <Switch
                  checked={smtpData.secure}
                  onCheckedChange={(checked) => setSmtpData({ ...smtpData, secure: checked })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Usuario SMTP</Label>
                <Input
                  type="email"
                  placeholder="usuario@example.com"
                  value={smtpData.user}
                  onChange={(e) => setSmtpData({ ...smtpData, user: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Contraseña SMTP</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={smtpData.pass}
                  onChange={(e) => setSmtpData({ ...smtpData, pass: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email remitente (From)</Label>
                <Input
                  type="email"
                  placeholder="noreply@example.com"
                  value={smtpData.from}
                  onChange={(e) => setSmtpData({ ...smtpData, from: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email de respuesta (Reply-To) - Opcional</Label>
                <Input
                  type="email"
                  placeholder="soporte@example.com"
                  value={smtpData.replyTo}
                  onChange={(e) => setSmtpData({ ...smtpData, replyTo: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSmtpForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConnectSmtp} disabled={isSavingSmtp}>
              {isSavingSmtp ? 'Guardando...' : 'Conectar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900">
              ¿Por qué configurar email?
            </p>
            <p className="text-sm text-blue-800">
              Una vez configurado, tu negocio podrá enviar automáticamente:
              facturas, confirmaciones de pedidos, recordatorios de citas,
              notificaciones de entrega y más. Todo bajo tu propia marca.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfiguration;
