import { useState, useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { listItem, STAGGER } from '@/lib/motion';
import { toast } from 'sonner';
import { getTenantSettings, updateTenantSettings, uploadTenantLogo } from '@/lib/api';
import haptics from '@/lib/haptics';
import MobileSettingsLayout from './MobileSettingsLayout';
import MobileSettingsSkeleton from './MobileSettingsSkeleton';
import { useDirtyState } from '@/hooks/use-dirty-state';

const INITIAL = {
  name: '',
  phone: '',
  email: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  logo: '',
};

function extractBusinessData(tenant) {
  return {
    name: tenant?.name || '',
    phone: tenant?.contactInfo?.phone || '',
    email: tenant?.contactInfo?.email || '',
    street: tenant?.contactInfo?.address?.street || '',
    city: tenant?.contactInfo?.address?.city || '',
    state: tenant?.contactInfo?.address?.state || '',
    zipCode: tenant?.contactInfo?.address?.zipCode || '',
    logo: tenant?.logo || '',
  };
}

function InputField({ label, type = 'text', value, onChange, placeholder, ...rest }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[44px] bg-muted rounded-xl px-4 py-3 text-base text-foreground
                   border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                   outline-none transition-all placeholder:text-muted-foreground/50"
        {...rest}
      />
    </div>
  );
}

export default function MobileSettingsBusiness({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { data, setData, isDirty, resetDirty, initialize } = useDirtyState(INITIAL);
  const [logoPreview, setLogoPreview] = useState('');
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getTenantSettings();
      const tenantData = res?.data || res;
      const extracted = extractBusinessData(tenantData);
      initialize(extracted);
      setLogoPreview(extracted.logo || '');
    } catch (err) {
      toast.error('Error al cargar datos del negocio');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    // Mark form as dirty by updating a field
    setData(prev => ({ ...prev, logo: '__pending__' }));
  };

  const updateField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload logo first if changed
      if (pendingLogoFile) {
        const logoRes = await uploadTenantLogo(pendingLogoFile);
        const newLogo = logoRes?.data?.logo || logoRes?.logo;
        if (newLogo) {
          setData(prev => ({ ...prev, logo: newLogo }));
          setLogoPreview(newLogo);
        }
        setPendingLogoFile(null);
      }

      // Save business data
      const payload = {
        name: data.name,
        contactInfo: {
          phone: data.phone,
          email: data.email,
          address: {
            street: data.street,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
          },
        },
      };

      const res = await updateTenantSettings(payload);
      if (res?.error) {
        toast.error('Error al guardar', { description: res.error });
        return;
      }

      haptics.success();
      toast.success('Datos del negocio guardados');
      resetDirty();
    } catch (err) {
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileSettingsLayout title="Datos del negocio" onBack={onBack}>
        <MobileSettingsSkeleton />
      </MobileSettingsLayout>
    );
  }

  return (
    <MobileSettingsLayout
      title="Datos del negocio"
      onBack={onBack}
      isDirty={isDirty}
      isSaving={saving}
      onSave={handleSave}
    >
      <motion.div
        variants={STAGGER(0.06, 0.04)}
        initial="initial"
        animate="animate"
        className="space-y-5"
      >
        {/* Logo */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-6 flex flex-col items-center gap-4"
        >
          <div
            className="relative w-24 h-24 rounded-full bg-muted overflow-hidden border-2 border-border"
            onClick={() => fileRef.current?.click()}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Camera size={28} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-sm font-medium text-primary no-tap-highlight"
          >
            Cambiar logo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleLogoSelect}
            className="hidden"
          />
        </motion.div>

        {/* Business info */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 space-y-4"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Informacion general
          </p>
          <InputField
            label="Nombre del negocio"
            value={data.name}
            onChange={(v) => updateField('name', v)}
            placeholder="Mi Negocio"
          />
          <InputField
            label="Telefono"
            type="tel"
            value={data.phone}
            onChange={(v) => updateField('phone', v)}
            placeholder="+58 412 1234567"
          />
          <InputField
            label="Email"
            type="email"
            value={data.email}
            onChange={(v) => updateField('email', v)}
            placeholder="contacto@minegocio.com"
          />
        </motion.div>

        {/* Address */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 space-y-4"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Direccion
          </p>
          <InputField
            label="Calle / Direccion"
            value={data.street}
            onChange={(v) => updateField('street', v)}
            placeholder="Av. Principal, Local 5"
          />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Ciudad"
              value={data.city}
              onChange={(v) => updateField('city', v)}
              placeholder="Caracas"
            />
            <InputField
              label="Estado"
              value={data.state}
              onChange={(v) => updateField('state', v)}
              placeholder="Miranda"
            />
          </div>
          <InputField
            label="Codigo postal"
            value={data.zipCode}
            onChange={(v) => updateField('zipCode', v)}
            placeholder="1010"
          />
        </motion.div>
      </motion.div>
    </MobileSettingsLayout>
  );
}
