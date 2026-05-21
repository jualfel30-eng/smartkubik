import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Plus, Trash2, ArrowRight, User, Users, Sparkles } from 'lucide-react';
import { fetchApi, inviteUser, getRoles } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAY_FREQUENCIES = [
  { value: 'monthly', label: 'Mensual', desc: 'Un pago al mes' },
  { value: 'biweekly', label: 'Quincenal', desc: 'Los días 15 y último de cada mes' },
  { value: 'weekly', label: 'Semanal', desc: 'Cada semana' },
  { value: 'custom', label: 'Por proyecto', desc: 'Pago variable según acuerdo' },
];

const POSITIONS_BY_VERTICAL = {
  'food-service': ['Gerente', 'Cocinero/a', 'Mesero/a', 'Bartender', 'Cajero/a', 'Repartidor/a', 'Limpieza', 'Administrador/a', 'Otro'],
  restaurant: ['Gerente', 'Chef', 'Cocinero/a', 'Mesero/a', 'Bartender', 'Cajero/a', 'Repartidor/a', 'Limpieza', 'Administrador/a', 'Otro'],
  beauty: ['Gerente', 'Estilista', 'Manicurista', 'Esteticista', 'Maquillador/a', 'Recepcionista', 'Administrador/a', 'Otro'],
  default: ['Gerente', 'Supervisor/a', 'Administrativo/a', 'Operativo/a', 'Ventas', 'Contador/a', 'Almacenero/a', 'Otro'],
};

const QUICK_SIZES = [1, 2, 3, 5, 10];

function makeEmptyEmployee() {
  return { name: '', email: '', phone: '', taxId: '', position: '' };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function StepDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            background: i <= current ? 'var(--primary)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Pay Frequency ────────────────────────────────────────────────────
function PayFrequencyStep({ value, onChange, onNext }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">¿Cómo paga tu empresa a su equipo?</h2>
        <p className="text-sm text-muted-foreground mt-1">Se aplicará por defecto a todos los empleados que registres</p>
      </div>
      <div className="grid gap-3">
        {PAY_FREQUENCIES.map((f) => (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className="flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all"
            style={{
              borderColor: value === f.value ? 'var(--primary)' : 'var(--border)',
              background: value === f.value ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent',
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ borderColor: value === f.value ? 'var(--primary)' : 'var(--border)' }}
            >
              {value === f.value && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />}
            </div>
            <div>
              <p className="font-semibold text-sm">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <Button className="w-full mt-4" disabled={!value} onClick={onNext}>
        Continuar <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  );
}

// ─── Step 2: Team Size ────────────────────────────────────────────────────────
function TeamSizeStep({ value, onChange, onNext, onBack }) {
  const [custom, setCustom] = useState('');
  const handleQuick = (n) => { onChange(n); setCustom(''); };
  const handleCustom = (v) => {
    const n = parseInt(v, 10);
    setCustom(v);
    if (n > 0 && n <= 100) onChange(n);
    else onChange(null);
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">¿Cuántas personas tiene tu equipo?</h2>
        <p className="text-sm text-muted-foreground mt-1">Prepararemos una fila por cada empleado</p>
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {QUICK_SIZES.map((n) => (
          <button
            key={n}
            onClick={() => handleQuick(n)}
            className="w-14 h-14 rounded-xl font-bold text-lg border-2 transition-all"
            style={{
              borderColor: value === n && !custom ? 'var(--primary)' : 'var(--border)',
              background: value === n && !custom ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
              color: value === n && !custom ? 'var(--primary)' : undefined,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">o escribe el número exacto</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <Input
        type="number"
        min={1}
        max={100}
        placeholder="Ej: 8"
        value={custom}
        onChange={(e) => handleCustom(e.target.value)}
        className="text-center text-lg font-bold"
      />
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>Atrás</Button>
        <Button className="flex-1" disabled={!value} onClick={onNext}>
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Step 3: Team Grid ────────────────────────────────────────────────────────
function TeamGridStep({ employees, onChange, onNext, onBack, payFrequencyLabel, positions }) {
  const update = (i, field, val) => {
    const next = [...employees];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const remove = (i) => {
    if (employees.length <= 1) return;
    onChange(employees.filter((_, idx) => idx !== i));
  };
  const add = () => onChange([...employees, makeEmptyEmployee()]);

  const canContinue = employees.some((e) => e.name.trim());

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Agrega a tu equipo</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Todos con pago <span className="font-semibold text-foreground">{payFrequencyLabel}</span> · Solo el nombre es obligatorio
        </p>
      </div>

      <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
        {employees.map((emp, i) => (
          <div key={i} className="rounded-xl border p-3 space-y-2 bg-card">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                {i + 1}
              </div>
              <Input
                placeholder="Nombre completo *"
                value={emp.name}
                onChange={(e) => update(i, 'name', e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              {employees.length > 1 && (
                <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Correo electrónico"
                type="email"
                value={emp.email}
                onChange={(e) => update(i, 'email', e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Teléfono"
                value={emp.phone}
                onChange={(e) => update(i, 'phone', e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Cédula / ID"
                value={emp.taxId}
                onChange={(e) => update(i, 'taxId', e.target.value)}
                className="h-8 text-sm"
              />
              <Select value={emp.position} onValueChange={(v) => update(i, 'position', v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={add}
        className="flex items-center gap-2 text-sm text-primary hover:underline mx-auto"
      >
        <Plus size={14} /> Agregar otra persona
      </button>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>Atrás</Button>
        <Button className="flex-1" disabled={!canContinue} onClick={onNext}>
          Registrar equipo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Step 4: Building ─────────────────────────────────────────────────────────
function BuildingStep({ employees, payFrequency, onDone }) {
  const [statuses, setStatuses] = useState(() => employees.map(() => 'pending'));
  const didRun = useRef(false);

  const setStatus = useCallback((i, s) => {
    setStatuses((prev) => { const n = [...prev]; n[i] = s; return n; });
  }, []);

  const run = useCallback(async () => {
    if (didRun.current) return;
    didRun.current = true;

    const profiles = [];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      if (!emp.name.trim()) { setStatus(i, 'skipped'); continue; }
      setStatus(i, 'loading');
      try {
        const contacts = [];
        if (emp.email) contacts.push({ type: 'email', value: emp.email, isPrimary: true });
        if (emp.phone) contacts.push({ type: 'phone', value: emp.phone, isPrimary: !emp.email });

        const customer = await fetchApi('/customers', {
          method: 'POST',
          body: JSON.stringify({
            name: emp.name.trim(),
            customerType: 'employee',
            contacts: contacts.length ? contacts : undefined,
            taxInfo: emp.taxId ? { taxId: emp.taxId, taxType: 'V' } : undefined,
          }),
        });

        const customerId = (customer.data || customer)?._id?.toString?.() || (customer.data || customer)?._id;

        // Give the backend a moment to auto-create the EmployeeProfile
        await delay(900);

        const allProfiles = await fetchApi('/payroll/employees?limit=200');
        const profileList = Array.isArray(allProfiles?.data) ? allProfiles.data : [];
        const profile = profileList.find((p) => {
          const pCustId = p.customerId?.toString?.() || p.customerId;
          const pNestedId = p.customer?.id?.toString?.() || p.customer?.id || p.customer?._id?.toString?.();
          return pCustId === customerId || pNestedId === customerId;
        });

        if (profile?._id) {
          const patch = {};
          if (emp.position && emp.position !== 'Otro') patch.position = emp.position;
          if (Object.keys(patch).length) {
            await fetchApi(`/payroll/employees/${profile._id}`, {
              method: 'PATCH',
              body: JSON.stringify(patch),
            });
          }

          if (payFrequency) {
            await fetchApi(`/payroll/employees/${profile._id}/contracts`, {
              method: 'POST',
              body: JSON.stringify({
                payFrequency,
                compensationType: 'salary',
                status: 'active',
                startDate: new Date().toISOString().split('T')[0],
              }),
            }).catch(() => {});
          }

          profiles.push({ ...emp, profileId: profile._id });
        } else {
          profiles.push({ ...emp, profileId: null });
        }

        setStatus(i, 'success');
      } catch (err) {
        console.error('Error creating employee:', err);
        setStatus(i, 'error');
        profiles.push({ ...emp, profileId: null });
      }
    }

    setCreatedProfiles(profiles);
    await delay(800);
    onDone(profiles);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger on mount
  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const icons = { pending: null, loading: 'spin', success: 'check', error: 'error', skipped: 'skip' };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold">Registrando tu equipo...</h2>
        <p className="text-sm text-muted-foreground mt-1">Esto toma unos segundos</p>
      </div>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {employees.map((emp, i) => {
          const s = statuses[i];
          const isDone = s === 'success' || s === 'skipped';
          const isLoading = s === 'loading';
          const isError = s === 'error';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl border transition-all"
              style={{
                background: isDone ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : isError ? 'color-mix(in srgb, var(--destructive) 6%, transparent)' : 'transparent',
                borderColor: isDone ? 'color-mix(in srgb, var(--primary) 25%, transparent)' : isError ? 'color-mix(in srgb, var(--destructive) 25%, transparent)' : 'var(--border)',
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: isDone ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : isError ? 'color-mix(in srgb, var(--destructive) 15%, transparent)' : 'var(--muted)' }}
              >
                {isLoading && <Loader2 size={14} className="animate-spin text-primary" />}
                {isDone && <Check size={14} style={{ color: 'var(--primary)' }} />}
                {isError && <span className="text-destructive text-xs font-bold">!</span>}
                {s === 'pending' && <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{emp.name || `Empleado ${i + 1}`}</p>
                {emp.position && <p className="text-xs text-muted-foreground">{emp.position}</p>}
              </div>
              {isDone && <Check size={13} style={{ color: 'var(--primary)' }} />}
              {isError && <span className="text-xs text-destructive font-medium">Error</span>}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Step 5: Invite Users ─────────────────────────────────────────────────────
function InviteStep({ profiles, onNext, onSkip }) {
  const eligibleProfiles = profiles.filter((p) => p.email);
  const [selected, setSelected] = useState(() => new Set(eligibleProfiles.map((_, i) => i)));
  const [loading, setLoading] = useState(false);

  const toggle = (i) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleInvite = async () => {
    if (selected.size === 0) { onSkip(); return; }
    setLoading(true);
    let ok = 0;
    try {
      for (const i of selected) {
        const p = eligibleProfiles[i];
        const nameParts = p.name.trim().split(' ');
        const first = nameParts[0] || p.name;
        const last = nameParts.slice(1).join(' ') || '';
        const isManager = ['Gerente', 'Administrador/a', 'Supervisor/a'].includes(p.position);
        try {
          let roles = [];
          try { const r = await getRoles(); roles = Array.isArray(r) ? r : r?.data || []; } catch {}
          const managerRole = roles.find((r) => r.name?.toLowerCase().includes('manager') || r.name?.toLowerCase().includes('gerente'));
          const employeeRole = roles.find((r) => r.name?.toLowerCase().includes('employee') || r.name?.toLowerCase().includes('empleado'));
          const defaultRole = roles[0];
          const roleId = (isManager ? managerRole?._id : employeeRole?._id) || defaultRole?._id;

          await inviteUser({ firstName: first, lastName: last, email: p.email, role: roleId || '', phone: p.phone || '' });
          ok++;
        } catch {}
      }
      if (ok > 0) toast.success(`${ok} invitación${ok > 1 ? 'es' : ''} enviada${ok > 1 ? 's' : ''}`);
    } finally {
      setLoading(false);
      onNext();
    }
  };

  if (eligibleProfiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="text-center space-y-4">
        <h2 className="text-xl font-bold">¡Equipo registrado!</h2>
        <p className="text-sm text-muted-foreground">Ningún empleado tiene correo — puedes invitarlos más adelante desde Configuración.</p>
        <Button className="w-full" onClick={onSkip}>Finalizar</Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">¿Invitarlos al sistema?</h2>
        <p className="text-sm text-muted-foreground mt-1">Recibirán un correo para crear su acceso. Puedes hacerlo más tarde desde Configuración.</p>
      </div>
      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
        {eligibleProfiles.map((p, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className="flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all hover:bg-muted/50"
            style={{
              borderColor: selected.has(i) ? 'var(--primary)' : 'var(--border)',
              background: selected.has(i) ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'transparent',
            }}
          >
            <div
              className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ borderColor: selected.has(i) ? 'var(--primary)' : 'var(--border)', background: selected.has(i) ? 'var(--primary)' : 'transparent' }}
            >
              {selected.has(i) && <Check size={11} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.email}</p>
            </div>
            {p.position && (
              <span className="text-xs text-muted-foreground shrink-0">{p.position}</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onSkip} disabled={loading}>
          Ahora no
        </Button>
        <Button className="flex-1" onClick={handleInvite} disabled={loading || selected.size === 0}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enviar {selected.size > 0 ? `${selected.size} invitación${selected.size > 1 ? 'es' : ''}` : ''}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Step 6: Done ─────────────────────────────────────────────────────────────
function DoneStep({ count, onFinish }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
      >
        <Sparkles size={40} style={{ color: 'var(--primary)' }} />
      </motion.div>
      <h2 className="text-2xl font-bold">¡Tu equipo está listo!</h2>
      <p className="text-muted-foreground text-sm">
        {count > 1 ? `${count} empleados registrados.` : '1 empleado registrado.'} Ya puedes gestionar turnos, ausencias y nóminas.
      </p>
      <Button className="w-full mt-4" size="lg" onClick={onFinish}>
        Ir al módulo de RRHH <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
const TOTAL_STEPS = 6; // payFreq, teamSize, grid, building, invite, done

export default function HRTeamOnboardingWizard({ open, onOpenChange, onComplete, bulkOnly = false }) {
  const { tenant } = useAuth();
  const vertical = tenant?.verticalProfile?.key || tenant?.vertical || 'default';
  const positions = POSITIONS_BY_VERTICAL[vertical] || POSITIONS_BY_VERTICAL.default;

  const [step, setStep] = useState(bulkOnly ? 1 : 0);
  const [payFrequency, setPayFrequency] = useState('monthly');
  const [teamSize, setTeamSize] = useState(null);
  const [employees, setEmployees] = useState([makeEmptyEmployee()]);
  const [createdProfiles, setCreatedProfiles] = useState([]);

  const payFreqLabel = PAY_FREQUENCIES.find((f) => f.value === payFrequency)?.label || 'Mensual';

  const handleSizeNext = () => {
    const size = teamSize || 1;
    setEmployees(Array.from({ length: size }, makeEmptyEmployee));
    setStep(2);
  };

  const handleBuildingDone = (profiles) => {
    setCreatedProfiles(profiles);
    setStep(4);
  };

  const handleFinish = () => {
    onComplete?.();
    onOpenChange(false);
  };

  const stepContent = () => {
    switch (step) {
      case 0:
        return (
          <PayFrequencyStep
            value={payFrequency}
            onChange={setPayFrequency}
            onNext={() => setStep(1)}
          />
        );
      case 1:
        return (
          <TeamSizeStep
            value={teamSize}
            onChange={setTeamSize}
            onNext={handleSizeNext}
            onBack={() => !bulkOnly && setStep(0)}
          />
        );
      case 2:
        return (
          <TeamGridStep
            employees={employees}
            onChange={setEmployees}
            payFrequencyLabel={payFreqLabel}
            positions={positions}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        );
      case 3:
        return (
          <BuildingStep
            employees={employees}
            payFrequency={payFrequency}
            onDone={handleBuildingDone}
          />
        );
      case 4:
        return (
          <InviteStep
            profiles={createdProfiles}
            onNext={() => setStep(5)}
            onSkip={() => setStep(5)}
          />
        );
      case 5:
        return (
          <DoneStep
            count={createdProfiles.filter((p) => p.name).length}
            onFinish={handleFinish}
          />
        );
      default:
        return null;
    }
  };

  const currentDotStep = Math.min(step, TOTAL_STEPS - 1);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (step < 3) onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Configurar equipo</DialogTitle>
        </DialogHeader>
        <StepDots current={currentDotStep} total={TOTAL_STEPS} />
        <AnimatePresence mode="wait">
          <div key={step}>{stepContent()}</div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
