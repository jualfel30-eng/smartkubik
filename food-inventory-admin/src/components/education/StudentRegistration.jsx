import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEduStudents } from '@/hooks/use-edu-students';
import { useEduClassrooms } from '@/hooks/use-edu-classrooms';
import { fadeUp } from '@/lib/motion';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { useEffect } from 'react';

const STEPS = ['Datos personales', 'Datos académicos', 'Datos del tutor'];
const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [`${CURRENT_YEAR - 1}-${CURRENT_YEAR}`, `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`];

function Field({ label, children, required }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold text-muted-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      className="w-full px-3 py-2.5 rounded-xl border border-border bg-transparent text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      {...props}
    />
  );
}

export default function StudentRegistration() {
  const navigate = useNavigate();
  const { create } = useEduStudents();
  const { classrooms, load: loadClassrooms } = useEduClassrooms();
  const { v: rv } = useReducedMotionSafe();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', birthDate: '',
    academicYear: ACADEMIC_YEARS[1], classroomId: '', enrollmentDate: '', scholarshipType: '',
    guardianName: '', guardianPhone: '', guardianWhatsapp: '', guardianEmail: '',
  });

  useEffect(() => { loadClassrooms(); }, [loadClassrooms]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const isStep0Valid = form.firstName && form.lastName && form.email && form.password;
  const isStep1Valid = form.academicYear && form.enrollmentDate;
  const canNext = [isStep0Valid, isStep1Valid, true][step];

  const handleNext = () => {
    if (!canNext) { toast.error('Completa los campos requeridos'); return; }
    haptics.tap();
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await create({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        birthDate: form.birthDate || undefined,
        academicYear: form.academicYear,
        classroomId: form.classroomId || undefined,
        enrollmentDate: form.enrollmentDate,
        scholarshipType: form.scholarshipType || undefined,
        guardian: {
          name: form.guardianName,
          phone: form.guardianPhone || undefined,
          whatsapp: form.guardianWhatsapp || undefined,
          email: form.guardianEmail || undefined,
        },
      });
      toast.success('Alumno matriculado exitosamente');
      setDone(true);
      haptics.tap();
    } catch (e) {
      toast.error(e?.message || 'Error al matricular alumno');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="p-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-96 space-y-5 text-center">
        <motion.div {...rv(fadeUp)} className="space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'rgb(16 185 129 / 0.1)' }}>
            <CheckCircle2 size={32} strokeWidth={1.5} className="text-emerald-500" />
          </div>
          <h2 className="text-[22px] font-bold">Alumno matriculado</h2>
          <p className="text-[14px] text-muted-foreground/70">
            {form.firstName} {form.lastName} ha sido registrado exitosamente.
          </p>
          <button type="button" onClick={() => navigate('/education/classrooms')}
            className="w-full py-3 text-[13px] font-semibold text-primary-foreground"
            style={{ borderRadius: 'var(--mobile-radius-full)', background: 'var(--gradient-primary)' }}>
            Ver salones
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/education/classrooms')}
          className="p-2 rounded-lg no-tap-highlight hover:bg-muted transition-colors">
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--glass-subtle)' }}>
            <UserPlus size={20} strokeWidth={1.5} className="text-primary" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold">Matrícula de Alumno</h1>
            <p className="text-[12px] text-muted-foreground/60">{STEPS[step]}</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{
                background: i < step ? '#10b981' : i === step ? 'var(--gradient-primary)' : 'var(--glass-subtle)',
                color: i <= step ? 'white' : 'var(--muted-foreground)',
              }}
            >
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-0.5 flex-1 rounded-full" style={{ background: i < step ? '#10b981' : 'var(--border)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div key={step} {...rv(fadeUp)} className="space-y-4">
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" required>
                  <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="María" />
                </Field>
                <Field label="Apellido" required>
                  <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="García" />
                </Field>
              </div>
              <Field label="Email" required>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="alumno@colegio.com" />
              </Field>
              <Field label="Contraseña inicial" required>
                <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Contraseña temporal" />
              </Field>
              <Field label="Fecha de nacimiento">
                <Input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Año académico" required>
                <select value={form.academicYear} onChange={e => set('academicYear', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-[13px]">
                  {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Salón">
                <select value={form.classroomId} onChange={e => set('classroomId', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-[13px]">
                  <option value="">Sin asignar</option>
                  {classrooms.map(c => (
                    <option key={c._id} value={c._id}>{c.grade} {c.section} — {c.academicYear}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha de matrícula" required>
                <Input type="date" value={form.enrollmentDate} onChange={e => set('enrollmentDate', e.target.value)} />
              </Field>
              <Field label="Tipo de beca">
                <select value={form.scholarshipType} onChange={e => set('scholarshipType', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-[13px]">
                  <option value="">Sin beca</option>
                  <option value="partial">Parcial</option>
                  <option value="full">Completa</option>
                </select>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Nombre del tutor">
                <Input value={form.guardianName} onChange={e => set('guardianName', e.target.value)} placeholder="Pedro García" />
              </Field>
              <Field label="Teléfono">
                <Input type="tel" value={form.guardianPhone} onChange={e => set('guardianPhone', e.target.value)} placeholder="+58 412 000 0000" />
              </Field>
              <Field label="WhatsApp">
                <Input type="tel" value={form.guardianWhatsapp} onChange={e => set('guardianWhatsapp', e.target.value)} placeholder="+58 412 000 0000" />
              </Field>
              <Field label="Email del tutor">
                <Input type="email" value={form.guardianEmail} onChange={e => set('guardianEmail', e.target.value)} placeholder="tutor@email.com" />
              </Field>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3 text-[13px] font-semibold border border-border rounded-full">
            Atrás
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={handleNext} disabled={!canNext}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
            style={{ borderRadius: 'var(--mobile-radius-full)', background: 'var(--gradient-primary)' }}>
            Siguiente
            <ArrowRight size={14} strokeWidth={2} />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
            style={{ borderRadius: 'var(--mobile-radius-full)', background: 'var(--gradient-primary)' }}>
            {saving ? 'Matriculando...' : 'Matricular alumno'}
          </button>
        )}
      </div>
    </div>
  );
}
