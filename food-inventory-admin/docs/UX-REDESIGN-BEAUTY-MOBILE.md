# Rediseno UX/UI Mobile-First — SmartKubik Beauty/Barberia

> Target: 375px-430px | Dark mode #0a0e1a | React + Tailwind + Framer Motion
> Fecha: 2026-04-16

---

## PROBLEMA 1 — Bottom Sheet de Nueva Cita se Desborda

### Estado Actual (Diagnostico)

El componente `MobileQuickCreateAppointment.jsx` usa `MobileActionSheet` con `className="max-h-[92vh] overflow-y-auto"`. El problema es que el `overflow-y-auto` esta en el panel externo del sheet, no en un contenedor interno con altura restringida. Ademas, el boton "Guardar" usa `position: absolute` con `bottom: 0` pero el scroll del sheet puede ocultar el handle superior.

Archivos afectados:
- `src/components/mobile/MobileActionSheet.jsx` (contenedor)
- `src/components/mobile/appointments/MobileQuickCreateAppointment.jsx` (formulario)

### Wireframe Propuesto

```
+------------------------------------------+
|         ====  (drag handle)  ====        |  <- sticky top, siempre visible
|  Nueva cita                         [X]  |
+------------------------------------------+
|                                          |
|  [Cliente]  Maria Lopez  ☎ 0412...  [x]  |  <- seccion siempre visible
|                                          |
|  [Servicios]  chips seleccionables       |  <- seccion siempre visible
|  Corte + Barba · 45min · $15.00         |
|                                          |
|  [Hora]  [Ahora] [11:00] [12:00] [13:00]|  <- seccion siempre visible
|  datetime picker                         |
|                                          |
|  [Profesional]  chips                    |  <- seccion siempre visible
|                                          |
|  v Notas (opcional)          [chevron]   |  <- COLAPSABLE, cerrado por defecto
|  v Repetir esta cita         [toggle]    |  <- COLAPSABLE, cerrado por defecto
|                                          |
|  (scroll termina aqui, pb-20 para CTA)  |
+------------------------------------------+
|  [ ====== Guardar cita ====== ]          |  <- sticky bottom, siempre visible
|  (safe-bottom padding)                   |
+------------------------------------------+
```

**Altura maxima**: `max-h-[85vh]` (no 92vh — deja espacio para ver el fondo oscurecido)

### Layout Tecnico

```
MobileActionSheet (fixed inset-0)
  backdrop (absolute inset-0, bg-black/50)
  sheet-panel (absolute bottom-0, max-h-[85vh], flex flex-col)
    drag-handle (sticky top, shrink-0, h-10)
    header (shrink-0, px-4 pb-2)
    scroll-container (flex-1, overflow-y-auto, overscroll-contain, px-4)
      secciones del formulario...
      spacer (h-20, para que el ultimo campo no quede tapado por el CTA)
    sticky-footer (shrink-0, border-t, px-4 py-3, safe-bottom)
      boton Guardar
```

**Cambio clave**: El sheet panel pasa de tener `overflow-y-auto` en si mismo a ser un `flex flex-col` con el scroll SOLO en el contenedor central. Header y footer son `shrink-0`.

### Secciones Colapsables

Las secciones "Notas" y "Repetir cita" se colapsan por defecto para reducir la altura inicial:

```jsx
// Componente CollapsibleSection
function CollapsibleSection({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => { haptics.tap(); setOpen(o => !o); }}
        className="w-full flex items-center justify-between py-2 tap-target no-tap-highlight"
      >
        <span className="text-sm font-medium flex items-center gap-2">
          {icon} {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={SPRING.snappy}
        >
          <ChevronDown size={16} className="text-muted-foreground" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="pb-3 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Micro-interacciones

| Trigger | Animacion | Especificacion |
|---------|-----------|----------------|
| Sheet abre | Slide up desde bottom | `initial={{ y: '100%' }}` `animate={{ y: 0 }}` `transition={SPRING.drawer}` (stiffness: 380, damping: 36) |
| Scroll interno | Fade gradient en top/bottom | Pseudo-elemento con `mask-image: linear-gradient(transparent, black 16px, black calc(100%-16px), transparent)` |
| Seccion expande | Height auto + fade in | `height: 0 -> auto`, `opacity: 0 -> 1`, `duration: DUR.base (250ms)` |
| Seccion colapsa | Height 0 + fade out | Inverso, `duration: DUR.fast (150ms)` |
| Chevron rota | Rotacion 180deg | `SPRING.snappy` (stiffness: 500, damping: 40) |
| Boton Guardar | Scale press | `whileTap={{ scale: 0.97 }}` |
| Guardar exitoso | Haptic success + toast | `haptics.success()` + toast con accion WhatsApp |
| Drag handle | Sheet sigue el dedo | Drag constraints con `dragElastic: 0.1`, snap a 85vh o close |

### Cambios en MobileActionSheet.jsx

```jsx
// ANTES (linea 102):
<div className="px-4 pb-4 pt-2">{children}</div>

// DESPUES — estructura flex con scroll interno:
<div className="flex flex-col min-h-0 flex-1">
  {children}
</div>
```

Y en `MobileQuickCreateAppointment.jsx`, el JSX se reestructura:

```jsx
<MobileActionSheet
  open
  onClose={() => onClose?.(false)}
  title="Nueva cita"
  className="max-h-[85vh] flex flex-col"
>
  {/* Scroll container — el UNICO elemento que scrollea */}
  <div className="flex-1 overflow-y-auto overscroll-contain mobile-scroll px-4">
    <div className="space-y-4 pb-20">
      {/* Cliente */}
      {/* Servicios */}
      {/* Hora */}
      {/* Profesional */}

      {/* Secciones colapsables */}
      <CollapsibleSection title="Notas" icon={<FileText size={14} />}>
        <textarea ... />
      </CollapsibleSection>

      <CollapsibleSection title="Repetir esta cita" icon={<Repeat size={14} />}>
        {/* Frecuencia + contador */}
      </CollapsibleSection>
    </div>
  </div>

  {/* Sticky footer — FUERA del scroll */}
  <div className="shrink-0 border-t border-border px-4 pt-3 pb-4 bg-card safe-bottom">
    {conflictWarning && <ConflictBanner ... />}
    <button ... >Guardar cita</button>
  </div>
</MobileActionSheet>
```

### Edge Cases

| Caso | Comportamiento |
|------|----------------|
| Teclado virtual abierto (campo de notas) | `visualViewport` resize: el sheet se ajusta con `max-h-[85dvh]` (dynamic viewport) |
| Contenido cabe sin scroll | El contenedor no muestra scrollbar, footer sigue sticky |
| Drag down en el handle | Si `y > 30%` del sheet height, cierra. Si no, snap back |
| Orientacion landscape | `max-h-[85dvh]` se adapta automaticamente |
| `prefers-reduced-motion` | Sin spring, transiciones con `duration: 0` |

---

## PROBLEMA 2 — Flujo Walk-in (Wizard de 2-3 Pasos)

### Estado Actual (Diagnostico)

El boton "Walk-in" en el FAB (`MobileFAB.jsx` linea 14) navega a `/appointments?walkin=1`, que abre el mismo formulario generico `MobileQuickCreateAppointment`. No muestra el floor view ni filtra servicios por profesional. El `MobileFloorView.jsx` ya tiene botones "Walk-in" por profesional pero navegan con `?walkin=1&professionalId=X` — esta logica existe parcialmente.

### Wireframe — Wizard de 3 Pasos

**PASO 1: Seleccionar Profesional (Floor View Compacto)**

```
+------------------------------------------+
|  ====  (handle)  ====                    |
|  Walk-in            Paso 1 de 3     [X]  |
+------------------------------------------+
|                                          |
|  Selecciona un profesional               |
|                                          |
|  +------+  +------+  +------+            |
|  | (foto)|  | (foto)|  | (foto)|         |  <- Grid 3 columnas
|  | Carlos|  | Maria |  | Pedro |         |
|  | LIBRE |  | EN    |  | LIBRE |         |
|  |  ●    |  | SERV. |  |  ●    |         |
|  |       |  | ~15m  |  |       |         |
|  +------+  +------+  +------+            |
|                                          |
|  +------+  +------+                      |
|  | Ana  |  | Luis  |                     |
|  |BLOQ. |  | NO    |                     |
|  | Alm. |  | DISP. |                     |
|  +------+  +------+                      |
|                                          |
+------------------------------------------+
|  ⓘ 2 libres · 1 en servicio (~15m)      |
+------------------------------------------+
```

**PASO 2: Seleccionar Servicio(s)**

```
+------------------------------------------+
|  ====                                    |
|  Walk-in            Paso 2 de 3     [X]  |
+------------------------------------------+
|  Carlos → ...                            |  <- Mini-summary breadcrumb
|                                          |
|  Servicios de Carlos                     |
|                                          |
|  [ Corte Clasico        30min   $8.00 ]  |  <- Tarjeta seleccionable
|  [ Corte + Barba        45min  $12.00 ]  |  <- Seleccionada = borde primary
|  [ Barba                20min   $5.00 ]  |
|  [ Cejas                10min   $3.00 ]  |
|                                          |
+------------------------------------------+
|  1 servicio · 45min · $12.00            |
|  [ ← Atras ]            [ Siguiente → ] |
+------------------------------------------+
```

**PASO 3: Cliente + Confirmar**

```
+------------------------------------------+
|  ====                                    |
|  Walk-in            Paso 3 de 3     [X]  |
+------------------------------------------+
|  Carlos → Corte+Barba · 45min · $12     |  <- Summary completo
|                                          |
|  Cliente                                 |
|  +--------------------------------------+|
|  | 🔍 Buscar o escribir nombre...       ||
|  +--------------------------------------+|
|                                          |
|  Recientes hoy:                          |
|  [Jose P.] [Maria L.] [Carlos G.]       |
|                                          |
|  Hora de inicio                          |
|  [● Ahora (11:45)]  [ 12:00 ] [ 12:15 ] |
|                                          |
+------------------------------------------+
|  [ ← Atras ]   [ ✓ Confirmar walk-in ]  |
+------------------------------------------+
```

### Arquitectura del Componente

```jsx
// Nuevo: src/components/mobile/appointments/MobileWalkInWizard.jsx

export default function MobileWalkInWizard({ onClose }) {
  const [step, setStep] = useState(1); // 1, 2, 3
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startAt, setStartAt] = useState(new Date());
  // ... (submitting, etc.)

  return (
    <MobileActionSheet
      open
      onClose={() => onClose?.(false)}
      title="Walk-in"
      className="max-h-[85vh] flex flex-col"
    >
      {/* Step indicator */}
      <StepIndicator current={step} total={3} />

      {/* Progressive summary */}
      {step > 1 && <WalkInSummary professional={selectedProfessional} services={...} />}

      {/* Step content with slide transition */}
      <div className="flex-1 overflow-y-auto overscroll-contain mobile-scroll px-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={SPRING.soft}
          >
            {step === 1 && <StepProfessional ... />}
            {step === 2 && <StepServices ... />}
            {step === 3 && <StepClientConfirm ... />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      <WizardFooter step={step} onBack={...} onNext={...} onConfirm={...} />
    </MobileActionSheet>
  );
}
```

### Transiciones entre Pasos

```jsx
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

// direction: 1 = forward, -1 = back
// transition: SPRING.soft (stiffness: 260, damping: 30)
```

### Step Indicator (Breadcrumb Progresivo)

```jsx
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 shrink-0">
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <motion.div
            className={cn(
              'h-1.5 rounded-full flex-1',
              i < current ? 'bg-primary' : 'bg-muted',
            )}
            animate={{ scaleX: i < current ? 1 : 0.9 }}
            transition={SPRING.snappy}
          />
        </React.Fragment>
      ))}
      <span className="text-xs text-muted-foreground shrink-0 ml-1">
        {current}/{total}
      </span>
    </div>
  );
}
```

### Summary Progresivo

```jsx
function WalkInSummary({ professional, services, startAt }) {
  const parts = [];
  if (professional) parts.push(professional.name);
  if (services.length > 0) {
    const names = services.map(s => s.name).join(' + ');
    const dur = services.reduce((s, svc) => s + (svc.duration || 60), 0);
    const price = services.reduce((s, svc) => s + (Number(svc.price?.amount ?? svc.price) || 0), 0);
    parts.push(`${names} · ${dur}min · $${price.toFixed(2)}`);
  }

  return (
    <motion.div
      layout
      className="mx-4 mb-2 px-3 py-2 rounded-[var(--mobile-radius-md)] bg-primary/5 border border-primary/20"
    >
      <p className="text-xs text-primary font-medium truncate">
        {parts.join(' → ')}
      </p>
    </motion.div>
  );
}
```

### Paso 1: Seleccionar Profesional

```jsx
function StepProfessional({ profStatuses, onSelect }) {
  const free = profStatuses.filter(p => p.status === 'free');
  const inService = profStatuses.filter(p => p.status === 'in_service');
  const unavailable = profStatuses.filter(p => p.status === 'blocked' || p.status === 'unavailable');

  return (
    <div className="space-y-4 pb-4">
      {/* Libres primero — destacados */}
      {free.length > 0 && (
        <section>
          <p className="text-xs font-medium text-emerald-500 mb-2">
            Disponibles ahora ({free.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {free.map(prof => (
              <ProfessionalChip
                key={prof._id}
                prof={prof}
                onSelect={() => { haptics.select(); onSelect(prof); }}
                highlight
              />
            ))}
          </div>
        </section>
      )}

      {/* En servicio — con estimado de espera */}
      {inService.length > 0 && (
        <section>
          <p className="text-xs font-medium text-amber-500 mb-2">
            En servicio ({inService.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {inService.map(prof => (
              <ProfessionalChip
                key={prof._id}
                prof={prof}
                onSelect={() => { haptics.select(); onSelect(prof); }}
                subtitle={`~${formatMinutes(prof.remainingMinutes)}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* No disponibles — grayed out */}
      {unavailable.length > 0 && (
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2">No disponibles</p>
          <div className="grid grid-cols-3 gap-2">
            {unavailable.map(prof => (
              <ProfessionalChip key={prof._id} prof={prof} disabled />
            ))}
          </div>
        </section>
      )}

      {/* Sin profesionales libres */}
      {free.length === 0 && inService.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[var(--mobile-radius-md)] p-3">
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            Todos ocupados
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Proximo disponible: ~{formatMinutes(Math.min(...inService.map(p => p.remainingMinutes)))}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecciona uno para agregar a la cola de espera
          </p>
        </div>
      )}
    </div>
  );
}
```

### ProfessionalChip (componente de seleccion)

```jsx
function ProfessionalChip({ prof, onSelect, highlight, subtitle, disabled }) {
  const color = prof.color || '#6366f1';
  const photo = prof.images?.[0] || prof.profileImage;

  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onSelect}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-[var(--mobile-radius-lg)] border no-tap-highlight',
        'min-h-[100px] transition-colors',
        highlight && 'border-emerald-500/40 bg-emerald-500/5',
        disabled && 'opacity-40 pointer-events-none',
        !highlight && !disabled && 'border-border bg-card',
      )}
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden"
        style={{ background: photo ? 'transparent' : color }}
      >
        {photo
          ? <img src={photo} alt="" className="w-full h-full object-cover" />
          : getInitials(prof.name)
        }
      </div>
      <span className="text-xs font-medium text-center leading-tight truncate w-full">
        {prof.name?.split(' ')[0]}
      </span>
      {subtitle && (
        <span className="text-[10px] text-amber-500 font-medium">~{subtitle}</span>
      )}
      {/* Status dot */}
      <span className={cn(
        'w-2 h-2 rounded-full',
        prof.status === 'free' && 'bg-emerald-500',
        prof.status === 'in_service' && 'bg-amber-500 animate-pulse',
        prof.status === 'blocked' && 'bg-gray-400',
        prof.status === 'unavailable' && 'bg-red-400',
      )} />
    </motion.button>
  );
}
```

### Paso 2: Servicios del Profesional

```jsx
function StepServices({ professional, services, selectedIds, onToggle }) {
  // Filtrar servicios por allowedServiceIds del profesional
  const profServices = professional.allowedServiceIds?.length > 0
    ? services.filter(s => professional.allowedServiceIds.includes(String(s._id || s.id)))
    : services;

  const selected = profServices.filter(s => selectedIds.includes(String(s._id || s.id)));
  const totalDur = selected.reduce((sum, s) => sum + (s.duration || s.durationMinutes || 60), 0);
  const totalPrice = selected.reduce((sum, s) => sum + (Number(s.price?.amount ?? s.price) || 0), 0);

  return (
    <div className="space-y-2 pb-4">
      <p className="text-xs text-muted-foreground mb-2">
        Servicios de {professional.name?.split(' ')[0]}
      </p>
      <motion.div className="space-y-2" variants={STAGGER(0.04)} initial="initial" animate="animate">
        {profServices.map(svc => {
          const id = String(svc._id || svc.id);
          const active = selectedIds.includes(id);
          return (
            <motion.button
              key={id}
              type="button"
              variants={listItem}
              onClick={() => { haptics.select(); onToggle(id); }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full text-left flex items-center justify-between px-4 py-3 rounded-[var(--mobile-radius-lg)] border no-tap-highlight transition-colors',
                active ? 'bg-primary/10 border-primary' : 'bg-card border-border',
              )}
            >
              <div>
                <p className={cn('text-sm font-medium', active && 'text-primary')}>{svc.name}</p>
                <p className="text-xs text-muted-foreground">{svc.duration || svc.durationMinutes || 60} min</p>
              </div>
              <div className="text-right">
                <p className={cn('text-sm font-bold tabular-nums', active && 'text-primary')}>
                  ${(Number(svc.price?.amount ?? svc.price) || 0).toFixed(2)}
                </p>
                {active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={SPRING.bouncy}
                  >
                    <Check size={14} className="text-primary ml-auto" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
```

### Si No Hay Profesionales Libres

Cuando `free.length === 0`:

1. Se muestra un banner amarillo con el **tiempo estimado de espera** (el `remainingMinutes` mas bajo de los profesionales en servicio)
2. El usuario **puede seleccionar** un profesional ocupado — el wizard continua normalmente
3. En el Paso 3, el boton cambia de "Confirmar walk-in" a **"Agregar a cola de espera"**
4. Al confirmar, se llama a `addToWaitlist()` (ya existe en `api.js`) en vez de crear booking directo
5. Toast de confirmacion: "Agregado a la cola — se notificara cuando haya disponibilidad"

### Flujo Optimo (<10 segundos)

```
Tap "Walk-in" (FAB)     →  0.3s (sheet abre)
Tap profesional libre    →  0.3s (slide a paso 2)
Tap servicio conocido    →  0.2s (seleccion)
Tap "Siguiente"          →  0.3s (slide a paso 3)
Tap cliente recurrente   →  0.2s (chip seleccionado)
Tap "Confirmar"          →  0.5s (submit + toast)
                         ─────────
Total:                   ~  1.8s de interaccion activa + animaciones
```

### Edge Cases

| Caso | Comportamiento |
|------|----------------|
| 0 profesionales configurados | Empty state con CTA "Configurar profesionales" |
| Profesional seleccionado no tiene servicios | Mensaje: "Este profesional no tiene servicios asignados" + CTA ir a config |
| Walk-in con profesional pre-seleccionado (desde floor view) | `initialProfessionalId` prop: salta al paso 2 directamente |
| Cliente no encontrado | Texto "Crear [query] como nuevo" aparece (ya existe en quick-create) |
| Error de red en submit | Toast error + mantener wizard abierto con datos intactos |
| Cancelar a mitad | Confirm dialog "Descartar walk-in?" si hay datos seleccionados |

---

## PROBLEMA 3 — Boton "Cobrar" Lleva al Lugar Equivocado

### Estado Actual (Diagnostico)

En `MobileFAB.jsx` linea 16: `{ id: 'charge', label: 'Cobrar', icon: Receipt, to: '/cash-register' }`. Esto lleva al modulo de Cierre de Caja, no al flujo de cobro por cita. Ya existe `MobilePOS.jsx` con un POS completo (numpad, metodos de pago, propinas, split payment), pero no esta conectado al FAB.

### Recomendacion: Opcion A+B Hibrida

**Destino del boton "Cobrar"**: Abre una lista filtrada de citas cobrable hoy (citas `completed` o `in_progress` sin cobro), con un tap directo al POS simplificado por cada cita.

**Razon**: Un barbero NO quiere navegar a un POS generico vacio. Quiere ver "que citas puedo cobrar ahora" y tocar una para cobrarla. Es el flujo mental natural: completar servicio → cobrar → siguiente cliente.

### Wireframe — Flujo Completo

**Pantalla 1: Lista de Citas Cobrables**

```
+------------------------------------------+
|  ====                                    |
|  Cobrar                             [X]  |
+------------------------------------------+
|                                          |
|  Por cobrar hoy (3)                      |
|                                          |
|  +-----------------------------------------+
|  | 11:30  Maria Lopez                     |
|  | Corte + Barba · Carlos                 |
|  | $12.00                    [ Cobrar → ] |
|  +-----------------------------------------+
|                                          |
|  +-----------------------------------------+
|  | 10:45  Jose Perez                      |
|  | Corte Clasico · Pedro                  |
|  | $8.00                     [ Cobrar → ] |
|  +-----------------------------------------+
|                                          |
|  En curso (1)                            |
|                                          |
|  +-----------------------------------------+
|  | 11:45  Ana Ruiz        ● En servicio  |
|  | Tinte + Secado · Maria                |
|  | $35.00                    [ Cobrar → ] |
|  +-----------------------------------------+
|                                          |
|  ─────── Cobrados hoy ───────            |
|  $55.00 en 4 citas ✓                    |
|                                          |
+------------------------------------------+
```

**Pantalla 2: POS por Cita (slide desde derecha)**

```
+------------------------------------------+
|  [←]  Cobrar · Maria Lopez          [X]  |
+------------------------------------------+
|                                          |
|  Corte + Barba           $12.00          |
|  Carlos · 45min                          |
|                                          |
|  ── Propina ──                           |
|  [Sin] [10%] [15%] [20%]  ← chips       |
|                                          |
|  ── Descuento ──                         |
|  [Sin] [5%] [10%] [Monto]               |
|                                          |
|  ── Metodo de pago ──                    |
|  [$ Efectivo USD]  ← pre-seleccionado   |
|  [↗ Transferencia]                       |
|  [📱 Pago movil]                         |
|  [💳 POS]                                |
|  [+ Dividir pago]                        |
|                                          |
|  ─────────────────────                   |
|  Subtotal        $12.00                  |
|  Propina (15%)    $1.80                  |
|  Total           $13.80                  |
|                                          |
+------------------------------------------+
|  [ ====== Confirmar $13.80 ====== ]      |
+------------------------------------------+
```

**Pantalla 3: Confirmacion de Pago (overlay)**

```
+------------------------------------------+
|                                          |
|              ✓                            |  <- Animated checkmark
|         Pago exitoso                     |  <- Scale in
|                                          |
|     Maria Lopez · $13.80                |
|     Efectivo USD                         |
|                                          |
|  [Enviar recibo WhatsApp]                |
|  [Ver recibo]                            |
|  [Cerrar]                                |
|                                          |
+------------------------------------------+
```

### Arquitectura del Componente

```
MobileChargeFlow.jsx (nuevo)
  ├── ChargeableList (lista de citas cobrables)
  ├── ChargeDetail (POS por cita — reutiliza logica de MobilePOS.jsx)
  └── ChargeSuccess (overlay animado)
```

### Flujo de Interaccion Detallado

1. **Tap "Cobrar" en FAB** → Abre `MobileChargeFlow` como bottom sheet (85vh)
2. **Ve lista de citas cobrables** → Separadas en "Por cobrar" (completed, sin pago) y "En curso" (in_progress)
3. **Tap en una cita** → Slide horizontal (x: 100% → 0) al POS de esa cita
4. **Servicios pre-llenados** — no necesita seleccionar nada, el total viene de la cita
5. **Selecciona propina** (opcional) — chips 0/10/15/20%, default: sin propina
6. **Selecciona descuento** (opcional) — chips 0/5/10/monto custom
7. **Selecciona metodo de pago** — tap en uno. Para split: tap "+ Dividir pago"
8. **Tap "Confirmar $X.XX"** → Submit + animacion
9. **Animacion de exito**:
   - Backdrop se oscurece
   - Circulo verde scale-in (0 → 1) con `SPRING.bouncy`
   - Checkmark dibujado con `pathLength: 0 → 1` (300ms)
   - Texto fade-up stagger
   - `haptics.success()`
   - Sonido opcional (si configurado en settings)
10. **Post-exito**: Opciones de WhatsApp recibo / ver recibo / cerrar

### Manejo de Cobro Parcial / Depositos

```jsx
// En ChargeDetail, seccion adicional para depositos:
{appointment.depositRequired && (
  <section>
    <p className="text-xs text-amber-500 font-medium mb-2">
      Este cliente requiere deposito previo
    </p>
    <div className="flex gap-2">
      <button
        className={cn('flex-1 ...', isPartial ? 'bg-primary ...' : 'border-border ...')}
        onClick={() => setIsPartial(true)}
      >
        Deposito parcial
      </button>
      <button
        className={cn('flex-1 ...', !isPartial ? 'bg-primary ...' : 'border-border ...')}
        onClick={() => setIsPartial(false)}
      >
        Pago completo
      </button>
    </div>
    {isPartial && (
      <div className="mt-2">
        <NumPad value={partialAmount} onChange={setPartialAmount} />
      </div>
    )}
  </section>
)}
```

### Split Payment (Multiples Metodos)

Al tocar "+ Dividir pago", aparece una seccion donde el usuario agrega lineas de pago:

```jsx
// Cada linea: metodo + monto
// Ej: Efectivo $8.00 + Transferencia $5.80 = $13.80
// El remanente se calcula automaticamente
```

Esto ya existe en `MobilePOS.jsx` (linea 98: `PaymentLine` component). Se reutiliza directamente.

### Cambio en MobileFAB.jsx

```jsx
// ANTES:
{ id: 'charge', label: 'Cobrar', icon: Receipt, to: '/cash-register' },

// DESPUES:
{ id: 'charge', label: 'Cobrar', icon: Receipt, action: 'open-charge-flow' },
```

En vez de navegar, abre el `MobileChargeFlow` como sheet. El FAB necesita soportar acciones que abren sheets ademas de navegacion.

### Micro-interacciones

| Trigger | Animacion | Spec |
|---------|-----------|------|
| Sheet abre | Slide up | `SPRING.drawer` |
| Tap en cita | Slide right | `x: 100% → 0`, `SPRING.soft` (260, 30) |
| Back desde POS | Slide left | `x: -100% → 0`, `SPRING.soft` |
| Seleccion propina | Chip scale + color | `whileTap={{ scale: 0.95 }}`, bg transition 150ms |
| Seleccion metodo pago | Check icon scale-in | `initial={{ scale: 0 }}` `animate={{ scale: 1 }}` `SPRING.bouncy` |
| Boton "Confirmar" | Press scale + loading | `whileTap={{ scale: 0.97 }}`, spinner si demora >300ms |
| Pago exitoso | Checkmark draw + bounce | `pathLength: 0→1` (300ms) + circle `SPRING.bouncy` |
| Haptic en exito | Patron success | `haptics.success()` — doble tap haptico |
| Badge update | Bounce en tab "Hoy" | `emitBadgeUpdate()` → badge count -1 con bounce |

### Edge Cases

| Caso | Comportamiento |
|------|----------------|
| 0 citas cobrables | Empty state: "No hay citas por cobrar. Buen dia!" con ilustracion |
| Error de red en cobro | Toast error, mantener POS abierto con datos intactos, boton "Reintentar" |
| Caja no abierta | Alert card arriba de la lista: "Abre la caja antes de cobrar" con CTA |
| Cobro parcial + restante | Registra pago parcial, cita queda con `paymentStatus: 'partial'`, vuelve a aparecer en lista |
| Propina + descuento simultaneo | Ambos aplican sobre el subtotal: total = (subtotal - descuento) + propina |

---

## PROBLEMA 4 — Boton "Nuevo Cliente" Redundante

### Analisis de Acciones Rapidas

Las 4 acciones mas frecuentes para un barbero/estilista durante el dia son:

| # | Accion | Frecuencia | Razon |
|---|--------|------------|-------|
| 1 | **Nueva cita** | Muy alta | Agendamiento constante, tanto presencial como por telefono |
| 2 | **Walk-in** | Alta | Clientes sin reserva son ~40-60% del trafico en barberias |
| 3 | **Cobrar** | Alta | Despues de cada servicio completado |
| 4 | **Siguiente cita** | Media-alta | Saber que viene despues para preparar estacion |

"Nuevo Cliente" es redundante porque:
- Ya existe el tab "Clientes" en el bottom nav
- El flujo de walk-in y nueva cita permiten crear clientes inline
- En la practica, crear un cliente "suelto" sin cita asociada es muy raro en barberia

### Reemplazo Propuesto: "Siguiente"

El boton "Nuevo Cliente" se reemplaza por **"Siguiente"** — un shortcut a la proxima cita pendiente del profesional activo (o del local en general).

**Comportamiento**:
- **Tap**: Abre un mini-detail de la proxima cita pendiente/confirmada
- **Si no hay proxima cita**: Muestra "Sin citas pendientes — relax!" con icono
- **Badge**: Muestra minutos restantes hasta la proxima cita (ej: "15m")

### Cambio en MobileFAB.jsx

```jsx
const ACTIONS_BY_VERTICAL = {
  beauty: [
    { id: 'new-appointment', label: 'Nueva cita', icon: CalendarPlus, to: '/appointments?new=1' },
    { id: 'walk-in', label: 'Walk-in', icon: UserPlus, action: 'open-walkin-wizard' },
    { id: 'charge', label: 'Cobrar', icon: Receipt, action: 'open-charge-flow' },
    { id: 'next-apt', label: 'Siguiente', icon: Clock, action: 'open-next-appointment' },
  ],
  // ...
};
```

### Layout de Acciones Rapidas (Grid 2x2)

```
+-------------------+-------------------+
|  📅               |  🚶               |
|  Nueva cita       |  Walk-in          |
|  (primary blue)   |  (emerald green)  |
+-------------------+-------------------+
|  💰               |  ⏭                |
|  Cobrar           |  Siguiente        |
|  (amber/yellow)   |  (slate/neutral)  |
+-------------------+-------------------+
```

**Colores diferenciadores** por accion:

| Accion | Icono color | Borde activo |
|--------|-------------|-------------|
| Nueva cita | `text-primary` (azul) | `border-primary` |
| Walk-in | `text-emerald-500` | `border-emerald-500` |
| Cobrar | `text-amber-500` | `border-amber-500` |
| Siguiente | `text-muted-foreground` | `border-border` |

### Micro-interacciones del Grid FAB

```jsx
// Stagger de entrada cuando el sheet de acciones se abre:
<motion.div
  className="grid grid-cols-2 gap-3"
  variants={STAGGER(0.06, 0.05)}
  initial="initial"
  animate="animate"
>
  {actions.map((action, i) => (
    <motion.button
      key={action.id}
      variants={scaleIn}           // scale 0.96→1 + opacity 0→1
      whileTap={tapScale}          // scale 0.96
      onClick={() => handlePick(action)}
      className="..."
    >
      ...
    </motion.button>
  ))}
</motion.div>
```

**Badge con contador en tiempo real** (solo para "Siguiente"):

```jsx
// En el grid de acciones, el boton "Siguiente" muestra un mini-badge
// con los minutos hasta la proxima cita
{action.id === 'next-apt' && nextMinutes !== null && (
  <motion.span
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={SPRING.bouncy}
    className="absolute -top-1 -right-1 bg-primary text-primary-foreground
               text-[10px] font-bold rounded-full min-w-[20px] h-5
               flex items-center justify-center px-1"
  >
    {nextMinutes}m
  </motion.span>
)}
```

**Long-press preview** (en cualquier boton de accion):

```jsx
// Long-press (500ms) en una accion muestra un tooltip/preview
// sin ejecutar la accion. Ej: long-press en "Siguiente" muestra
// "Proxima: Maria Lopez, Corte, 12:30"
// Release ejecuta la accion; release fuera del boton cancela.
```

### Edge Cases

| Caso | Comportamiento |
|------|----------------|
| No hay proxima cita | Boton "Siguiente" muestra "Sin pendientes" y abre empty state friendly |
| Proxima cita es en >2 horas | Badge muestra "2h+" en vez de minutos |
| Multiples profesionales | Muestra la proxima cita del LOCAL, no de un profesional especifico |

---

## PROBLEMA 5 — FAB "+" en Profesionales Mal Posicionado

### Estado Actual (Diagnostico)

En `MobileProfessionalsPage.jsx` linea 347-352:
```jsx
<button
  onClick={handleCreate}
  className="fixed bottom-24 right-4 w-14 h-14 bg-primary ... z-20"
>
  <Plus className="h-6 w-6" />
</button>
```

Problemas:
1. `fixed bottom-24` se solapa con la ultima tarjeta cuando la lista es corta
2. `handleCreate` hace `window.location.href = '/resources?create=1'` — full page reload, no SPA navigation
3. Compite visualmente con el FAB central del bottom nav (dos FABs en pantalla)
4. No sigue el patron de otras paginas como Servicios (que usa boton en header)

### Solucion: Eliminar FAB, Agregar Boton en Header

```
+------------------------------------------+
|  Profesionales              [+Nuevo]     |  <- Boton en header
|  5 activos · 1 inactivo    [▦][≡] [↻]  |
+------------------------------------------+
|  [ 🔍 Buscar profesional... ]            |
|  [Todos] [Activos] [Inactivos]           |
+------------------------------------------+
|  (lista de tarjetas/filas)               |
|  ...                                     |
|  (sin FAB flotante)                      |
+------------------------------------------+
```

### Cambios en MobileProfessionalsPage.jsx

```jsx
// ELIMINAR: lineas 347-352 (el FAB completo)

// MODIFICAR: header section (linea 238-266)
<div className="flex items-center justify-between mb-3">
  <div>
    <h1 className="text-xl font-bold">Profesionales</h1>
    <p className="text-xs text-muted-foreground">
      {activeCount} activo{activeCount !== 1 ? 's' : ''}
      {inactiveCount > 0 ? ` · ${inactiveCount} inactivo${inactiveCount !== 1 ? 's' : ''}` : ''}
    </p>
  </div>
  <div className="flex items-center gap-2">
    {/* NUEVO: Boton "+ Nuevo" */}
    <motion.button
      onClick={handleCreate}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DUR.base, ease: EASE.out, delay: 0.1 }}
      className="flex items-center gap-1 px-3 py-2 text-xs font-semibold
                 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground
                 no-tap-highlight"
    >
      <Plus size={14} />
      Nuevo
    </motion.button>

    {/* View toggle (existente) */}
    <div className="flex rounded-lg border overflow-hidden">
      ...
    </div>

    {/* Refresh (existente) */}
    <button onClick={load} className="p-2 ...">
      <RefreshCw ... />
    </button>
  </div>
</div>
```

### Estilo del Boton

**Tipo: Filled (primary)**
- `bg-primary text-primary-foreground` — alta visibilidad sin competir con el contenido
- Tamano compacto: `px-3 py-2` con `text-xs` — no es un CTA de pagina completa
- Icono `Plus` a 14px + texto "Nuevo"
- Rounded: `var(--mobile-radius-md)` — consistente con los toggles de vista

### Accion al Tocar

**Propuesta**: Abre un bottom sheet con formulario simplificado de creacion (en vez de full page reload).

```jsx
const handleCreate = () => {
  // ANTES: window.location.href = '/resources?create=1';
  // DESPUES: usar navigate para SPA routing
  navigate('/resources?create=1');
  // FUTURO: cuando exista MobileCreateProfessionalSheet, abrir sheet aqui
};
```

Fase inmediata: SPA navigation en vez de `window.location.href`.
Fase futura: Bottom sheet nativo con formulario de creacion mobile-optimized.

### Micro-interacciones

| Trigger | Animacion | Spec |
|---------|-----------|------|
| Boton entra en pantalla | Scale + fade | `initial={{ opacity: 0, scale: 0.9 }}` `animate={{ opacity: 1, scale: 1 }}` `delay: 0.1` `DUR.base` |
| Tap en boton | Scale press | `whileTap={{ scale: 0.95 }}` |
| Haptic en tap | Tap ligero | `haptics.tap()` |
| Navegacion | Page transition | Reutiliza PageTransition existente |

### Edge Cases

| Caso | Comportamiento |
|------|----------------|
| No hay permisos de creacion | Boton oculto (`hasAccess('create')` check) |
| Pantalla muy angosta (<350px) | Solo icono `+` sin texto "Nuevo" (responsive via `hidden` class) |
| Formulario de creacion abierto | Sheet con formulario basico: nombre, email, color, especialidades |

---

## PROBLEMA 6 — Inventario y Configuracion No Adaptados a Movil

### 6A: Modulo de Inventario

#### Estado Actual

Accesible via "Mas" menu → "Inventario". Carga el componente desktop `InventoryManagement` (~2,398 lineas) con tablas anchas, filtros horizontales, y tabs desktop. No hay componente mobile dedicado.

#### Wireframe — Navegacion por Tabs

```
+------------------------------------------+
|  Inventario                    [🔍] [↻] |
+------------------------------------------+
|  [ Stock ] [ Movimientos ] [ Alertas ]   |  <- Horizontal scroll tabs con snap
+==========================================+
```

**Implementacion tabs mobile**:

```jsx
function MobileInventoryTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
    { id: 'alerts', label: 'Alertas', icon: AlertTriangle, badge: lowStockCount },
  ];

  return (
    <div className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide border-b border-border"
         style={{ scrollSnapType: 'x mandatory' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap no-tap-highlight',
            'scroll-snap-align-start transition-colors',
            activeTab === tab.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <tab.icon size={14} />
          {tab.label}
          {tab.badge > 0 && (
            <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
```

#### Tab "Stock" — Lista de Tarjetas

```
+------------------------------------------+
|  🔍 Buscar producto...                   |  <- Sticky search
+------------------------------------------+
|  [Filtrar]  ← abre bottom sheet filtros  |
+------------------------------------------+
|                                          |
|  +--------------------------------------+|
|  |  Cera para cabello         SKU-001   ||
|  |  📦 Stock: 24 uds                    ||
|  |  📍 Almacen principal                ||
|  |  [████████░░] 24/30                  ||  <- Barra de stock visual
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  |  Shampoo Anticaspa         SKU-002   ||
|  |  📦 Stock: 3 uds    ⚠ BAJO          ||  <- Badge rojo si bajo
|  |  📍 Almacen principal                ||
|  |  [██░░░░░░░░] 3/20                  ||
|  +--------------------------------------+|
|                                          |
|  (tap para expandir detalles)            |
+------------------------------------------+
```

**Tarjeta de producto con expansion**:

```jsx
function InventoryCard({ product, onAdjust }) {
  const [expanded, setExpanded] = useState(false);
  const isLow = product.currentStock <= (product.minStock || 5);
  const pct = Math.min(100, (product.currentStock / (product.maxStock || product.minStock * 3 || 30)) * 100);

  return (
    <motion.div
      layout
      className="bg-card border border-border rounded-[var(--mobile-radius-lg)] overflow-hidden"
    >
      {/* Compact view — siempre visible */}
      <button
        type="button"
        onClick={() => { haptics.tap(); setExpanded(e => !e); }}
        className="w-full text-left p-4 no-tap-highlight"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{product.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{product.sku}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'text-sm font-bold tabular-nums',
              isLow ? 'text-destructive' : 'text-foreground',
            )}>
              {product.currentStock}
            </span>
            {isLow && (
              <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium">
                BAJO
              </span>
            )}
          </div>
        </div>

        {/* Stock bar */}
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', isLow ? 'bg-destructive' : 'bg-emerald-500')}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: DUR.slow, ease: EASE.out }}
          />
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
              {/* Ubicacion */}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ubicacion</span>
                <span>{product.warehouseName || 'Principal'}</span>
              </div>
              {/* Ultimo movimiento */}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ultimo mov.</span>
                <span>{product.lastMovementDate || '—'}</span>
              </div>
              {/* Lote (si aplica) */}
              {product.lotNumber && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Lote</span>
                  <span>{product.lotNumber}</span>
                </div>
              )}
              {/* Acciones */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onAdjust(product, 'add'); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium
                             rounded-[var(--mobile-radius-md)] bg-emerald-500/10 text-emerald-600
                             border border-emerald-500/20 no-tap-highlight"
                >
                  <Plus size={14} /> Agregar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onAdjust(product, 'remove'); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium
                             rounded-[var(--mobile-radius-md)] bg-destructive/10 text-destructive
                             border border-destructive/20 no-tap-highlight"
                >
                  <Minus size={14} /> Retirar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); /* ver historial */ }}
                  className="flex items-center justify-center py-2.5 px-3 text-xs font-medium
                             rounded-[var(--mobile-radius-md)] border border-border no-tap-highlight"
                >
                  <History size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

#### Swipe-to-Action (alternativa a expansion)

```jsx
// En modo lista, swipe derecha revela "Agregar stock"
// Swipe izquierda revela "Ver historial"
// Usa MobileSwipeCard existente como base

<MobileSwipeCard
  leftAction={{ label: 'Historial', icon: History, color: 'bg-blue-500' }}
  rightAction={{ label: 'Ajustar', icon: PlusCircle, color: 'bg-emerald-500' }}
  onLeftAction={() => openHistory(product)}
  onRightAction={() => openAdjust(product)}
>
  <InventoryCardCompact product={product} />
</MobileSwipeCard>
```

#### Bottom Sheet de Filtros

```
+------------------------------------------+
|  ====                                    |
|  Filtros                            [X]  |
+------------------------------------------+
|                                          |
|  Estado de stock                         |
|  [Todos] [Stock bajo] [Sin stock]        |
|                                          |
|  Ubicacion/Almacen                       |
|  [ Almacen principal          ▼ ]        |
|                                          |
|  Categoria                               |
|  [ Todas las categorias       ▼ ]        |
|                                          |
|  Ordenar por                             |
|  [Nombre] [Stock ↑] [Stock ↓] [SKU]     |
|                                          |
+------------------------------------------+
|  [Limpiar]          [Aplicar filtros]    |
+------------------------------------------+
```

#### Bottom Sheet de Ajuste de Stock

```
+------------------------------------------+
|  ====                                    |
|  Ajustar stock                      [X]  |
+------------------------------------------+
|                                          |
|  Cera para cabello                       |
|  Stock actual: 24                        |
|                                          |
|           [ - ]   24   [ + ]             |  <- Stepper grande
|                                          |
|  Cantidad a agregar/retirar:             |
|  ← ─────────●──────────── →             |  <- Slider o numpad
|              5                           |
|                                          |
|  Nuevo stock: 29                         |
|                                          |
|  Razon del ajuste                        |
|  [Compra] [Merma] [Correccion] [Otro]    |
|                                          |
|  Nota (opcional)                         |
|  [ _________________________________ ]   |
|                                          |
+------------------------------------------+
|  [ ====== Confirmar ajuste ====== ]      |
+------------------------------------------+
```

#### Busqueda Sticky

```jsx
// Search bar siempre visible al top del tab de Stock
<div className="sticky top-0 z-10 bg-background px-4 py-2 border-b border-border">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <input
      type="text"
      placeholder="Buscar por nombre o SKU..."
      className="w-full bg-muted rounded-xl pl-9 pr-4 py-2.5 text-sm
                 focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  </div>
</div>
```

---

### 6B: Modulo de Configuracion

#### Estado Actual

Accesible via "Mas" → "Ajustes". Carga `SettingsPage` desktop con tabs horizontales que desbordan en movil.

#### Wireframe — Estilo Settings iOS

```
+------------------------------------------+
|  [← Mas]  Configuracion                 |
+------------------------------------------+
|                                          |
|  GENERAL                                 |
|  +--------------------------------------+|
|  |  🏪  Datos del negocio          [>] ||
|  |──────────────────────────────────────||
|  |  🕐  Horarios de atencion       [>] ||
|  |──────────────────────────────────────||
|  |  💰  Monedas y metodos de pago  [>] ||
|  +--------------------------------------+|
|                                          |
|  SERVICIOS                               |
|  +--------------------------------------+|
|  |  ✂️  Servicios y precios         [>] ||
|  |──────────────────────────────────────||
|  |  📦  Paquetes de servicios       [>] ||
|  +--------------------------------------+|
|                                          |
|  NOTIFICACIONES                          |
|  +--------------------------------------+|
|  |  🔔  Push y recordatorios       [>] ||
|  |──────────────────────────────────────||
|  |  📱  WhatsApp automatico        [>] ||
|  +--------------------------------------+|
|                                          |
|  AVANZADO                                |
|  +--------------------------------------+|
|  |  🔗  Integraciones              [>] ||
|  |──────────────────────────────────────||
|  |  👥  Usuarios y permisos        [>] ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
```

#### Implementacion — Lista de Secciones

```jsx
function MobileSettingsPage() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'General',
      items: [
        { id: 'business', label: 'Datos del negocio', icon: Store, to: '/settings/business' },
        { id: 'hours', label: 'Horarios de atencion', icon: Clock, to: '/settings/hours' },
        { id: 'payments', label: 'Monedas y metodos de pago', icon: DollarSign, to: '/settings/payments' },
      ],
    },
    {
      title: 'Servicios',
      items: [
        { id: 'services', label: 'Servicios y precios', icon: Scissors, to: '/services' },
        { id: 'packages', label: 'Paquetes de servicios', icon: Package, to: '/service-packages' },
      ],
    },
    {
      title: 'Notificaciones',
      items: [
        { id: 'push', label: 'Push y recordatorios', icon: Bell, to: '/settings/notifications' },
        { id: 'whatsapp', label: 'WhatsApp automatico', icon: MessageCircle, to: '/settings/whatsapp' },
      ],
    },
    {
      title: 'Avanzado',
      items: [
        { id: 'integrations', label: 'Integraciones', icon: Link, to: '/settings/integrations' },
        { id: 'users', label: 'Usuarios y permisos', icon: Users, to: '/settings/users' },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold">Configuracion</h1>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto mobile-scroll px-4 py-4 space-y-6">
        {sections.map(section => (
          <motion.section
            key={section.title}
            variants={listItem}
            initial="initial"
            animate="animate"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>
            <div className="bg-card rounded-[var(--mobile-radius-lg)] border border-border overflow-hidden divide-y divide-border">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { haptics.tap(); navigate(item.to); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left no-tap-highlight
                               active:bg-muted transition-colors"
                  >
                    <Icon size={18} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
```

#### Sub-pagina con Back Navigation

Cada seccion abre como sub-pagina con header + back button:

```jsx
function MobileSettingsSubPage({ title, children }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="tap-target no-tap-highlight text-muted-foreground"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
      <div className="flex-1 overflow-y-auto mobile-scroll">
        {children}
      </div>
    </div>
  );
}
```

#### Formularios Mobile-Friendly

```jsx
// Inputs full-width con labels sobre el campo
<div className="px-4 py-4 space-y-4">
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
      Nombre del negocio
    </label>
    <input
      type="text"
      value={name}
      onChange={e => setName(e.target.value)}
      className="w-full bg-muted rounded-[var(--mobile-radius-md)] px-4 py-3 text-base
                 focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  </div>

  {/* Toggle nativo */}
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm font-medium">Permitir walk-ins</p>
      <p className="text-xs text-muted-foreground">Clientes sin reserva previa</p>
    </div>
    <button
      type="button"
      onClick={() => setAllowWalkIns(v => !v)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors',
        allowWalkIns ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
        animate={{ x: allowWalkIns ? 20 : 0 }}
        transition={SPRING.snappy}
      />
    </button>
  </div>
</div>
```

#### Horarios — Timeline Vertical Editable

```
+------------------------------------------+
|  [←]  Horarios de atencion              |
+------------------------------------------+
|                                          |
|  Lun    09:00 ──────── 19:00    [✏️]    |
|  Mar    09:00 ──────── 19:00    [✏️]    |
|  Mie    09:00 ──────── 19:00    [✏️]    |
|  Jue    09:00 ──────── 19:00    [✏️]    |
|  Vie    09:00 ──────── 20:00    [✏️]    |
|  Sab    10:00 ──── 15:00        [✏️]    |
|  Dom    CERRADO                  [✏️]    |
|                                          |
+------------------------------------------+
```

Tap en [editar] abre un bottom sheet con time pickers:

```
+------------------------------------------+
|  ====                                    |
|  Lunes                              [X]  |
+------------------------------------------+
|                                          |
|  Abierto    [toggle ON]                  |
|                                          |
|  Apertura     [  09 : 00  ]             |
|  Cierre       [  19 : 00  ]             |
|                                          |
|  Descanso (opcional)                     |
|  [+ Agregar pausa]                       |
|                                          |
+------------------------------------------+
|  [ ====== Guardar ====== ]               |
+------------------------------------------+
```

```jsx
function ScheduleTimeline({ schedule, onEdit }) {
  const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="px-4 py-4 space-y-1">
      {days.map((day, i) => {
        const slot = schedule?.[dayKeys[i]];
        const isOpen = slot && slot.available !== false;

        return (
          <motion.button
            key={dayKeys[i]}
            type="button"
            onClick={() => onEdit(dayKeys[i], slot)}
            variants={listItem}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 py-3 px-3 rounded-[var(--mobile-radius-md)]
                       no-tap-highlight active:bg-muted transition-colors"
          >
            <span className="w-8 text-xs font-bold text-muted-foreground">{day}</span>
            {isOpen ? (
              <>
                <span className="text-sm font-medium tabular-nums">{slot.start}</span>
                <div className="flex-1 h-1.5 bg-primary/20 rounded-full mx-1 relative">
                  <div
                    className="absolute inset-y-0 bg-primary rounded-full"
                    style={{
                      left: `${timeToPercent(slot.start)}%`,
                      right: `${100 - timeToPercent(slot.end)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium tabular-nums">{slot.end}</span>
              </>
            ) : (
              <span className="flex-1 text-sm text-muted-foreground">Cerrado</span>
            )}
            <Edit2 size={14} className="text-muted-foreground shrink-0" />
          </motion.button>
        );
      })}
    </div>
  );
}

function timeToPercent(time) {
  const [h, m] = time.split(':').map(Number);
  return ((h * 60 + m) / (24 * 60)) * 100;
}
```

### Micro-interacciones Generales (Problemas 6A y 6B)

| Trigger | Animacion | Spec |
|---------|-----------|------|
| Tab switch (inventario) | Underline pill slide | `layoutId="inventory-tab"` + `SPRING.soft` |
| Card expand | Height auto + border highlight | `layout` + `height: 0→auto` + `DUR.base` |
| Card collapse | Height 0 | `height: auto→0` + `DUR.fast` |
| Stock bar llena | Width animada | `width: 0→N%` + `DUR.slow` + `EASE.out` |
| Stock bajo | Badge pulse | `animate={{ scale: [1, 1.1, 1] }}` infinite, 2s |
| Settings item tap | Background flash | `active:bg-muted` CSS transition |
| Sub-page enter | Slide from right | `x: 100%→0` + `SPRING.soft` |
| Sub-page exit (back) | Slide to right | `x: 0→100%` + `SPRING.soft` |
| Schedule bar | Color fill | `width: start%→end%` animated |
| Filter apply | Sheet close + list refresh | Close sheet + skeleton → content transition |
| Pull to refresh | Spinner + reload | Standard pull-to-refresh pattern |
| Empty state | Icon zoom + text fade | `scaleIn` icon + `fadeUp` text stagger |

### Edge Cases (Inventario)

| Caso | Comportamiento |
|------|----------------|
| 0 productos | Empty state: "Sin productos en inventario" + CTA "Agregar primer producto" |
| Error de red | ErrorState con "Reintentar" button |
| Muchos productos (>100) | Paginacion infinita con scroll (load more on scroll bottom) |
| Ajuste negativo (stock < 0) | Prevent: boton "-" deshabilitado cuando llega a 0 |
| Filtros activos | Chip visible debajo de search: "Stock bajo × " con X para limpiar |

### Edge Cases (Configuracion)

| Caso | Comportamiento |
|------|----------------|
| Cambios sin guardar | Banner sticky bottom: "Tienes cambios sin guardar" + [Guardar] [Descartar] |
| Error al guardar | Toast error + mantener formulario con datos |
| Seccion sin permisos | Item grayed out con candado: "Requiere permisos de admin" |
| Conexion perdida | Banner top: "Sin conexion — los cambios se guardaran al reconectar" |

---

## DIRECTRICES GENERALES — Resumen de Especificaciones

### Tokens de Diseno

| Token | Valor |
|-------|-------|
| Fondo | `#0a0e1a` (bg-background) |
| Tarjeta | `bg-card` con `border-border` |
| Texto primario | `text-foreground` |
| Texto secundario | `text-muted-foreground` |
| Acento primario | `bg-primary` / `text-primary` |
| Exito | `text-emerald-500` / `bg-emerald-500` |
| Warning | `text-amber-500` / `bg-amber-500` |
| Error | `text-destructive` / `bg-destructive` |
| Radius tarjeta | `var(--mobile-radius-lg)` |
| Radius input | `var(--mobile-radius-md)` |
| Radius pill/chip | `rounded-full` |

### Espaciado

| Elemento | Valor |
|----------|-------|
| Padding lateral pagina | `px-4` (16px) |
| Gap entre tarjetas | `gap-3` (12px) |
| Padding interno tarjeta | `p-4` (16px) |
| Safe area bottom (tab bar) | `pb-20` (~80px) o `safe-bottom` |
| Separacion de secciones | `space-y-4` (16px) |

### Tipografia

| Uso | Clase |
|-----|-------|
| Titulo de pagina | `text-xl font-bold` (20px) |
| Titulo de seccion | `text-sm font-semibold` (14px) |
| Texto base | `text-sm` (14px) |
| Label | `text-xs font-medium text-muted-foreground` (12px) |
| Caption | `text-[11px] text-muted-foreground` |
| Numero grande | `text-3xl font-bold tabular-nums` (30px) |

### Animaciones (resumen rapido)

| Spring | Uso | Valores |
|--------|-----|---------|
| `SPRING.drawer` | Bottom sheets | stiffness: 380, damping: 36 |
| `SPRING.soft` | Transiciones de contenido | stiffness: 260, damping: 30 |
| `SPRING.snappy` | Botones, toggles | stiffness: 500, damping: 40 |
| `SPRING.bouncy` | Celebraciones, badges | stiffness: 420, damping: 22 |

| Duration | Uso | Valor |
|----------|-----|-------|
| `DUR.fast` | Hover, press, exit | 150ms |
| `DUR.base` | Transiciones estandar | 250ms |
| `DUR.slow` | Modales, reveals | 350ms |
| `DUR.hero` | Sparklines, onboarding | 600ms |

### Patrones Tactiles

| Patron | Implementacion |
|--------|----------------|
| Touch target minimo | 44x44px (`tap-target` class) |
| Feedback en tap | `whileTap={{ scale: 0.97 }}` + `no-tap-highlight` |
| Long press | 500ms timer → preview/menu alternativo |
| Swipe horizontal | Drag con `dragConstraints` + snap + elastic |
| Pull to refresh | Drag vertical en top del scroll container |
| Haptics | `haptics.tap()` seleccion, `haptics.success()` confirmacion |

### Accesibilidad

| Requisito | Implementacion |
|-----------|----------------|
| Contraste minimo | 4.5:1 (WCAG AA) — verificar con tokens OKLCH |
| Focus visible | `focus-visible:ring-2 focus-visible:ring-primary/50` |
| Labels en inputs | `<label>` explicito + `aria-label` en botones icon-only |
| Reduced motion | `useReducedMotionSafe()` hook — desactiva springs, usa durations |
| Screen reader | `aria-modal`, `aria-expanded`, `aria-label` en sheets/dialogs |
| Keyboard nav | `Escape` cierra sheets, `Tab` navega entre campos |

---

## Orden de Implementacion Sugerido

```
Sprint 1 (Criticos)                Sprint 2 (Flujos)              Sprint 3 (Modulos)
──────────────────                 ────────────────               ────────────────
P1: Fix bottom sheet scroll        P2: Walk-in wizard             P6A: Inventario mobile
P5: Fix FAB profesionales          P3: Flujo cobrar               P6B: Configuracion mobile
P4: Reemplazar "Nuevo Cliente"
```

**P1 y P5 son los mas rapidos** — son fixes puntuales en archivos existentes.
**P4 es un cambio de configuracion** en `MobileFAB.jsx`.
**P2 y P3 son componentes nuevos** pero reutilizan mucho codigo existente (floor view data, POS).
**P6 es el mas grande** — requiere componentes mobile nuevos para dos modulos completos.
