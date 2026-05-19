# Prompt: Mobile-First UX/UI Redesign — Cuentas por Cobrar (Accounts Receivable)

## Tu Rol

Aplica el skill `/ux-design`. Eres un senior product design engineer con 25 años de experiencia construyendo herramientas de cobro y finanzas para PYMEs latinoamericanas. Has trabajado en Conekta, Kushki, Bind, Konfío y Wave Accounting. Sabes que el dueño de negocio venezolano que usa SmartKubik revisa sus cobros desde el teléfono, entre una reunión y la siguiente, con 45 segundos de atención. Tu trabajo es que en esos 45 segundos pueda: saber a quién cobrar, cobrar, y seguir con su día.

**Principio rector**: El módulo de cobros debe funcionar como la app de mensajes de un banco — clara, rápida, orientada a la acción, con cero ambigüedad sobre qué hacer a continuación.

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode (#0a0e1a). Mobile-first (375px base), progressive enhancement hasta desktop (≥1024px).

---

## Restricción Crítica: NO ROMPER FUNCIONALIDAD

El módulo tiene lógica de negocio consolidada en:
- `AccountsReceivableReport.jsx` + `ARSummaryCards.jsx` + `RecordReceivablePaymentDialog.jsx`
- `PaymentsManagementDashboard.jsx` (tabs hospitality + retail mezclados — tocar con cuidado)
- Backend: `GET /accounting/reports/accounts-receivable`, `POST /payments`, `POST /payment-requests`

El redesign AGREGA estructura mobile-first, jerarquía visual, y micro-interacciones. NO cambia lógica de negocio, endpoints, ni permisos existentes (`payment_requests_review`, `accounting_read`).

---

## Estado Actual — Auditoría Completa

### Arquitectura (Problema Sistémico)

El módulo existe en **dos rutas paralelas** que se solapan sin coordinación:

| Ruta | Componente | Qué hace | Problema |
|------|-----------|---------|---------|
| `/receivables?tab=pending` | `PaymentsManagementDashboard.jsx` | Tabs: Pendientes / Confirmados / Por cliente / Reportes | El "Reportes" tiene el aging real; "Pendientes" mezcla hospitality + retail |
| `/accounting/reports/accounts-receivable` | `AccountsReceivableReport.jsx` | Aging completo + filtros + acciones | Enterrado en menú de Contabilidad; el usuario que cobra no busca "reportes" |

**Consecuencia**: El usuario navega a "Cuentas por Cobrar" en el sidebar y aterriza en una pantalla que mezcla payment requests de clientes con cobros AR — son dos flujos distintos presentados como uno.

### Problemas Catalogados (12)

| # | Problema | Impacto | Capa |
|---|---------|---------|------|
| 1 | **Tabla de 6 columnas en mobile** requiere scroll horizontal — el peor patrón para touch | Crítico | STRUCTURE |
| 2 | **3 botones de igual peso visual** por fila (Cobrar / Solicitar comprobante / WhatsApp): el usuario no sabe qué hacer primero — viola Hick's Law | Crítico | STRUCTURE |
| 3 | **Sin banner de urgencia**: el usuario abre el módulo y no sabe si tiene cobros vencidos hasta scrollear | Alto | STRUCTURE |
| 4 | **Sistema de doble filtro redundante**: dropdown de estado + toggle de aging hacen lo mismo por caminos distintos — carga cognitiva gratuita | Alto | INTERACTION |
| 5 | **WhatsApp detrás de Popover**: extra click para enviar un recordatorio que el usuario ya decidió enviar | Medio | INTERACTION |
| 6 | **Sin ruta directa al historial de un cliente**: el usuario tiene que navegar a "Por cliente" y buscar manualmente | Alto | STRUCTURE |
| 7 | **Sin documento post-cobro**: después de registrar $500, no hay nada que mostrar, imprimir ni compartir | Alto | STRUCTURE |
| 8 | **"Link de pago" enterrado**: el `SolicitarComprobanteButton` es un tercer botón de igual peso — el usuario que quiere enviar un link no lo encuentra | Alto | STRUCTURE |
| 9 | **Sin CTA anclado en mobile**: el cobro más urgente puede estar después de mucho scroll; no hay superficie de acceso rápido | Alto | STRUCTURE |
| 10 | **"Reportes" como nombre de tab**: el usuario quiere actuar, no reportar — naming pasivo que desorienta | Medio | INTERACTION |
| 11 | **Recordatorios one-by-one**: con 10 clientes vencidos, el usuario repite el mismo flujo 10 veces — sin acción masiva | Medio | STRUCTURE |
| 12 | **Cobros pagados sin acceso a documentos**: requiere cambiar filtro manualmente; no hay vista clara del historial con documentos | Medio | STRUCTURE |

---

## Rediseño en Tres Capas

### CAPA 1: STRUCTURE (40%)

#### 1.1 Entrada unificada — 4 tabs con nombres de intención

Mantener la ruta `/receivables` como entry point principal. Renombrar los tabs del `PaymentsManagementDashboard.jsx` para que su nombre comunique la acción, no el estado:

```
[Por Cobrar] [Comprobantes] [Historial] [Por Cliente]
    ↑ default     ↑ payment       ↑ pagados    ↑ vista CRM
                   requests
```

- **Por Cobrar** (`tab=pending`): Vista AR aging, ordenada por urgencia. Acción primaria: cobrar.
- **Comprobantes** (`tab=comprobantes`): Payment requests enviados por clientes. Acción primaria: confirmar/rechazar.
- **Historial** (`tab=historial`): Cobros completados. Acciones: ver/descargar/compartir documento.
- **Por Cliente** (`tab=customers`): Vista CRM de clientes con saldo. Sin cambios funcionales.

Cambios en `navLinks.js`:
```js
children: [
  { name: 'Por Cobrar',    href: 'receivables?tab=pending',       icon: BanknoteArrowUp },
  { name: 'Comprobantes',  href: 'receivables?tab=comprobantes',  icon: FileCheck2 },
  { name: 'Historial',     href: 'receivables?tab=historial',     icon: History },
  { name: 'Por Cliente',   href: 'receivables?tab=customers',     icon: Users },
]
```

#### 1.2 Banner Hero de urgencia contextual — `ARHeroBanner.jsx`

Componente que aparece encima de los summary cards. Lee los datos del reporte y muestra un banner dinámico:

**Estado con vencidos** (fondo `bg-red-500/10 border border-red-500/30`):
```
┌────────────────────────────────────────────────────────┐
│ ⚠ 3 cobros vencidos · $1,400.00 pendientes            │
│   Actúa hoy para mantener tu flujo de caja            │
│                         [Ver vencidos →]              │
└────────────────────────────────────────────────────────┘
```

**Estado con pendientes sin vencer** (fondo `bg-blue-500/10 border border-blue-500/30`):
```
┌────────────────────────────────────────────────────────┐
│ Tienes $3,200.00 por cobrar esta semana               │
│                         [Ver esta semana →]           │
└────────────────────────────────────────────────────────┘
```

**Estado todo al día** (aparece 3s y desaparece con `AnimatePresence`):
```
┌────────────────────────────────────────────────────────┐
│ ✓ Sin vencimientos · Todo al día                      │
└────────────────────────────────────────────────────────┘
```

Props:
```jsx
<ARHeroBanner
  overdueCount={number}
  overdueTotal={number}
  dueSoonTotal={number}
  onFilterOverdue={() => setActiveFilter('overdue')}
  onFilterDueSoon={() => setActiveFilter('dueSoon')}
/>
```

Framer Motion: `initial={{ opacity: 0, y: -8 }}` → `animate={{ opacity: 1, y: 0 }}`, duración 0.3s.

---

#### 1.3 Pills de filtro unificadas — reemplaza dropdown + toggle

Eliminar: el `Select` de estado y el toggle de aging. Ambos quedan obsoletos.

Reemplazar con una fila de pills horizontales con scroll (`overflow-x: auto`, `scrollbar-none`):

```
[Todas] [Urgente 🔴 3] [Esta semana 🟡 7] [Al día 🟢 12] [Pagadas ✓ 8]
```

Cada pill:
```jsx
<FilterPill
  label="Urgente"
  count={3}
  color="red"          // red | amber | emerald | muted
  active={filter === 'overdue'}
  onClick={() => setFilter('overdue')}
/>
```

Lógica de filtrado que reemplaza a la actual:
- `Urgente` → `getUrgency(dueDate) === 'overdue'`
- `Esta semana` → `getUrgency(dueDate) === 'due-soon'`
- `Al día` → `getUrgency(dueDate) === 'current'`
- `Pagadas` → `status === 'paid'`
- `Todas` → sin filtro

El buscador de texto se mantiene encima de los pills.

---

#### 1.4 Layout mobile-first: Cards agrupadas por urgencia — `ARGroupedList.jsx`

En mobile (`< md`): reemplazar `<Table>` con cards agrupadas. En desktop (`≥ md`): mantener tabla, mejorar columnas.

**Layout mobile** (375px–767px):

```
VENCIDAS (3) ─────────────────────────── rojo
┌─────────────────────────────────────────┐
│ ACME Inc                     $500.00   │
│ Orden #2401 · Vencida hace 15 días     │
│                          [Cobrar →]    │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Beta Corp                    $1,200.00  │
│ Orden #2388 · Vencida hace 8 días      │
│                          [Cobrar →]    │
└─────────────────────────────────────────┘

ESTA SEMANA (7) ──────────────────── ámbar
┌─────────────────────────────────────────┐
│ Gamma LLC                    $350.00   │
│ Orden #2412 · Vence en 3 días          │
│                          [Cobrar →]    │
└─────────────────────────────────────────┘
...

AL DÍA (12) ──────────────────── esmeralda
...
```

Estructura del card — `ARReceivableCard.jsx`:

```jsx
<motion.div
  className={cn(
    "rounded-xl border p-4 flex items-center justify-between gap-3",
    urgency === 'overdue'   && "border-red-500/30 bg-red-500/5",
    urgency === 'due-soon'  && "border-amber-500/30 bg-amber-500/5",
    urgency === 'current'   && "border-border bg-card"
  )}
  variants={listItem}
>
  <div className="flex-1 min-w-0">
    {/* Línea 1: Cliente (tap → ARCustomerPanel) */}
    <button
      onClick={() => onOpenCustomer(item)}
      className="font-semibold text-sm text-foreground hover:text-primary truncate block"
    >
      {item.customerName}
    </button>

    {/* Línea 2: Orden + urgencia */}
    <p className="text-xs text-muted-foreground mt-0.5">
      Orden #{item.orderNumber}
      {daysLabel && (
        <span className={cn("ml-2", daysLabel.className)}>
          · {daysLabel.text}
        </span>
      )}
    </p>
  </div>

  <div className="flex items-center gap-2 shrink-0">
    {/* Monto */}
    <span className="font-bold text-sm text-foreground">
      {formatCurrency(item.balance)}
    </span>

    {/* CTA único */}
    {item.balance > 0 && (
      <Button
        size="sm"
        variant={urgency === 'overdue' ? 'destructive' : 'default'}
        onClick={() => onOpenActionSheet(item)}
        className="h-8 px-3 text-xs"
      >
        Cobrar
      </Button>
    )}
  </div>
</motion.div>
```

**Layout desktop** (≥ md): tabla con columnas reordenadas por importancia (eliminando columnas de menor valor):

| Columna | Desktop | Mobile |
|---------|---------|--------|
| Cliente | ✓ | ✓ (card) |
| Saldo | ✓ | ✓ (card) |
| Urgencia/Fecha | ✓ | ✓ (card) |
| Estado (badge) | ✓ | ✗ (implícito en color) |
| N° Pedido | ✓ | ✓ (secundario) |
| Acciones | 1 botón | 1 botón |

---

#### 1.5 Action Sheet dual-path — `ARActionSheet.jsx`

Reemplaza los 3 botones de igual peso visual por un único botón "Cobrar" que abre un bottom sheet (Shadcn `Sheet` con `side="bottom"`) con jerarquía de acciones clara:

```
┌─────────────────────────────────────────┐
│                  ────                   │
│ Cobrar a ACME Inc                      │
│ $500.00 · Orden #2401                  │
│ Vencida hace 15 días                   │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 💳  Registrar cobro ahora           │ │
│ │     Efectivo, transferencia, etc.   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔗  Enviar link de pago             │ │
│ │     El cliente paga desde su teléf. │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [💬 Recordatorio WhatsApp]  ← ghost    │
│                                         │
└─────────────────────────────────────────┘
```

Props:
```jsx
<ARActionSheet
  open={open}
  onClose={onClose}
  receivable={item}
  onRegisterPayment={() => { onClose(); openRecordDialog(item); }}
  onSendPaymentLink={() => { onClose(); openRequestModal(item); }}
  onWhatsApp={() => {
    const msg = buildReminderMessage(item);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    onClose();
  }}
/>
```

- "Registrar cobro ahora" → `Button variant="default"` (full-width, h-14)
- "Enviar link de pago" → `Button variant="outline"` (full-width, h-14)
- "Recordatorio WhatsApp" → `Button variant="ghost"` (text only, icono izq, texto esmeralda)

El "Enviar link de pago" llama a `RequestPaymentModal` existente — sin cambiar lógica de permisos. El gating de permiso `payment_requests_review` se mantiene; si el usuario no tiene permiso, el botón se oculta o muestra como disabled con tooltip.

---

#### 1.6 Panel lateral de cliente — `ARCustomerPanel.jsx`

Tap en el nombre del cliente en cualquier card o fila de tabla → Sheet lateral.

**Mobile** (< md): `Sheet side="bottom"` fullscreen.
**Desktop** (≥ md): `Sheet side="right"` con `className="w-[420px]"`.

Contenido:
```
← ACME Inc
──────────────────────────────────
Total pendiente: $500.00
3 órdenes | Cliente desde Oct 2024

COBROS PENDIENTES ────────────────
ORD-2401  $500.00  Vencida 15 días  [Cobrar →]

COBROS PAGADOS ───────────────────
ORD-2388  $200.00  Pagado 12/04     [Ver doc]
ORD-2299  $800.00  Pagado 03/03     [Ver doc]

[Exportar historial →]
──────────────────────────────────
```

El panel filtra los datos ya cargados en `reportData` por `customerName` (o `customerId` si disponible). No requiere endpoint nuevo.

URL deeplink: al abrir el panel, actualiza `?client=<customerName>` en los searchParams para permitir link compartible y navegación con "atrás".

---

#### 1.7 Modal de comprobante post-cobro — `ARPaymentReceiptModal.jsx`

Después de un cobro exitoso en `RecordReceivablePaymentDialog.jsx`, en lugar de solo un toast, mostrar un modal de confirmación compartible.

Flujo en `onPaymentSuccess`:
```js
// En RecordReceivablePaymentDialog.jsx — reemplazar solo el toast:
toast.success(`Cobro registrado — ${formatCurrency(amount)} de ${receivable.customerName}`, {
  action: {
    label: 'Ver comprobante',
    onClick: () => setReceiptData({ receivable, amount, method, reference, date }),
  },
  duration: 8000,
});
setReceiptData({ receivable, amount, method, reference, date }); // también abre el modal
```

Contenido del modal:
```
┌──────────────────────────────────────┐
│          ✓ Cobro Registrado          │
│                                      │
│  ACME Inc                           │
│  Orden #2401                        │
│  ─────────────────────────────────  │
│  Monto cobrado:     $500.00 USD     │
│  Método:            Transferencia   │
│  Referencia:        TXN-20240515    │
│  Fecha:             15/05/2024      │
│  ─────────────────────────────────  │
│  Nuevo saldo:       $0.00           │
│                                      │
│  [🖨 Imprimir]  [💬 Compartir]      │
│                  [Cerrar]            │
└──────────────────────────────────────┘
```

- **Imprimir**: `window.print()` con `<style media="print">` que muestra solo el contenido del modal.
- **Compartir**: genera mensaje WhatsApp:
  ```
  "Hola {customerName}, confirmamos recibo de ${amount} correspondiente a la orden #{orderNumber}
   (Ref: {reference} · {date}). ¡Gracias por su pago!"
  ```
  Abre `https://wa.me/{customerPhone}?text={msg}` si hay teléfono del cliente; `https://wa.me/?text={msg}` si no.

Props:
```jsx
<ARPaymentReceiptModal
  open={!!receiptData}
  onClose={() => setReceiptData(null)}
  data={receiptData} // { receivable, amount, method, reference, date }
/>
```

---

#### 1.8 Barra sticky de acción rápida — `ARStickyActionBar.jsx`

Componente fijo en el bottom del viewport en mobile. Solo se muestra cuando hay receivables con `urgency === 'overdue'`.

```
┌─────────────────────────────────────────────────────┐
│  💳  Cobrar el más urgente · $500.00 — ACME Inc   > │
└─────────────────────────────────────────────────────┘
```

Lógica: selecciona el receivable overdue con mayor `balance`.

```jsx
const mostUrgent = useMemo(() =>
  reportData
    .filter(r => getUrgency(r.dueDate) === 'overdue' && r.balance > 0)
    .sort((a, b) => b.balance - a.balance)[0]
, [reportData]);

// Renderiza solo en mobile (md:hidden) y solo si hay vencidos
{mostUrgent && (
  <div className="fixed bottom-0 left-0 right-0 z-50 p-3 md:hidden
                  bg-background/80 backdrop-blur border-t border-border">
    <Button
      className="w-full h-12 gap-2 font-semibold"
      variant="destructive"
      onClick={() => openActionSheet(mostUrgent)}
    >
      <CreditCard className="h-4 w-4" />
      Cobrar el más urgente · {formatCurrency(mostUrgent.balance)}
      <span className="text-xs font-normal opacity-80 truncate max-w-[120px]">
        — {mostUrgent.customerName}
      </span>
    </Button>
  </div>
)}
```

El componente también agrega `padding-bottom: 4rem` al contenedor scrolleable cuando está visible, para que el último item no quede detrás de la barra.

---

#### 1.9 Vista "Pagadas" con documentos — dentro de `AccountsReceivableReport.jsx`

Cuando el filtro activo es `Pagadas`, cambiar el render del listado:
- Cards/filas muestran: cliente, monto cobrado, fecha de cobro, método, referencia
- Cada item tiene botón `Ver comprobante` → abre `ARPaymentReceiptModal` con datos del cobro
- Header del listado muestra botón `Exportar Excel` (reutiliza `exportToXlsx` existente del proyecto)
- En mobile: botón `Compartir` en lugar de `Ver comprobante`

Los datos de fecha/método/referencia del cobro vienen del historial de pagos. Si el backend no los incluye en el reporte AR actual, usar `paidAt` y `lastPaymentMethod` si disponibles, o mostrar solo fecha y monto.

---

#### 1.10 Recordatorio masivo por bucket — `ARBulkReminderModal.jsx`

En `ARSummaryCards.jsx`, añadir en el card "Urgente" / "60+ días" un botón secundario:

```
┌──────────────────────────────┐
│ $1,400.00                   │
│ 3 cuentas vencidas          │
│ [Ver] [Recordar a todos →]  │
└──────────────────────────────┘
```

Al pulsar "Recordar a todos", abre un modal con:

```
┌─────────────────────────────────────────┐
│ Recordatorio a 3 clientes vencidos     │
│                                         │
│ ✓ ACME Inc (+584121234567)             │
│   "Hola ACME Inc, tiene $500.00..."    │
│                                         │
│ ✓ Beta Corp (+584129876543)            │
│   "Hola Beta Corp, tiene $1,200.00..." │
│                                         │
│ ✗ Gamma LLC (sin teléfono)             │
│   [Agregar teléfono]                   │
│                                         │
│ [Abrir WhatsApp (2 disponibles)]       │
│ [Copiar todos los mensajes]            │
└─────────────────────────────────────────┘
```

- "Abrir WhatsApp" abre múltiples `wa.me` links en tabs separados (con delay de 300ms entre cada uno para evitar bloqueo del navegador)
- "Copiar todos" copia al clipboard todos los mensajes concatenados para pegar manualmente
- Clientes sin teléfono se listan con CTA para agregar

Props:
```jsx
<ARBulkReminderModal
  open={open}
  onClose={onClose}
  receivables={overdueReceivables} // filtrado previamente
/>
```

---

### CAPA 2: INTERACTION (35%)

#### Micro-interacciones por feature

**Cards (mobile list):**
- Entrada: `variants={listItem}` con `STAGGER(0.04)` por card
- Hover (desktop): `whileHover={{ x: 2 }}` con `transition={{ type: 'spring', stiffness: 400 }}`
- Tap: `whileTap={{ scale: 0.98 }}`

**ARHeroBanner:**
- Entrada: `initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}`
- Exit: `AnimatePresence` con `exit={{ opacity: 0, y: -8 }}`
- El banner "Todo al día" auto-desaparece en 3s usando `useEffect(() => { timer = setTimeout(dismiss, 3000) })`

**FilterPills:**
- Cambio de pill activo: `layoutId="activePill"` compartido entre pills para sliding indicator
- Contador de items: `AnimatedNumber` en el badge de cada pill

**ARActionSheet:**
- Entrada: Sheet nativo de Shadcn (usa `Vaul` internamente) con spring animation
- Botones: `whileTap={{ scale: 0.97 }}`

**ARCustomerPanel:**
- Entrada de filas de historial: stagger `STAGGER(0.05)`
- Total pendiente: `AnimatedNumber`

**Post-cobro:**
1. La fila/card que fue cobrada hace `AnimatedNumber` del balance → $0
2. El badge de estado cambia: `motion` con `scale 0 → 1` en el nuevo badge "Pagado"
3. El summary card "Total por cobrar" anima su número hacia abajo (`AnimatedNumber`)
4. Si quedan 0 vencidos: los summary cards hacen un breve `pulse` en esmeralda

**ARStickyActionBar:**
- Entrada: `initial={{ y: 80 }} animate={{ y: 0 }}` cuando `mostUrgent` aparece
- Exit: `AnimatePresence exit={{ y: 80 }}`

---

### CAPA 3: CELEBRATION (25%)

#### Momentos de reconocimiento

**Cobro registrado (cualquier monto):**
- Row/card anima balance → $0 con `AnimatedNumber`
- Badge de estado transiciona de "Pendiente"/"Vencida" → "Pagado" con `scale` pop
- Toast con acción "Ver comprobante" (8 segundos de duración)
- `haptics.success()` si disponible en el contexto

**Cobro grande (> $1,000):**
- Modal de comprobante aparece automáticamente (sin necesidad de hacer click en el toast)
- Texto adicional en el modal: "Excelente cobro 💪"

**Todos los vencidos resueltos:**
- El banner hero cambia de rojo → esmeralda: "✓ Sin vencimientos · ¡Todo al día!"
- Los summary cards hacen `pulse` esmeralda simultáneo
- La barra sticky desaparece con `AnimatePresence`

**Todos los cobros del mes al día (0 pendientes):**
- Banner especial: "🎉 Todas las cuentas cobradas este mes"
- Duración: 5s, luego desaparece

**Primer link de pago enviado:**
- Después de crear un payment request exitosamente, toast: "Link enviado · el cliente puede pagar desde su teléfono"

---

## Especificaciones Técnicas

### Tokens de Motion (reutilizar de `src/lib/motion.js`)
```js
import { listItem, STAGGER, fadeUp, scaleIn, SPRING } from '@/lib/motion.js';
```

### Colores de urgencia (Tailwind v4)
```
overdue:  text-red-500     bg-red-500/5    border-red-500/30
due-soon: text-amber-500   bg-amber-500/5  border-amber-500/30
current:  text-emerald-500 bg-transparent  border-border
paid:     text-muted-foreground bg-transparent border-border
```

### Helpers reutilizables (NO reimplementar)
```js
// De src/lib/invoice-constants.js:
import { getUrgency, getDaysLabel, getARStatusInfo, AR_STATUS, URGENCY_STYLES } from '@/lib/invoice-constants.js';

// De src/lib/api.js:
import { fetchApi } from '@/lib/api.js';

// De los componentes existentes:
import { AnimatedNumber } from '@/components/ui/AnimatedNumber.jsx';
import { RecordReceivablePaymentDialog } from './RecordReceivablePaymentDialog.jsx';
import { SolicitarComprobanteButton } from '@/components/payment-requests/SolicitarComprobanteButton.jsx';
import { RequestPaymentModal } from '@/components/payment-requests/RequestPaymentModal.jsx';
```

### buildReminderMessage (mantener el existente)
```js
// Función ya existente en AccountsReceivableReport.jsx:
const msg = `Hola ${item.customerName}, le recordamos que tiene un saldo pendiente de ${formatCurrency(item.balance)} correspondiente al pedido N° ${item.orderNumber}. Agradecemos su pronto pago. Gracias.`;
```

---

## Archivos a Crear

```
food-inventory-admin/src/components/accounts-receivable/
├── ARHeroBanner.jsx           (P8 — banner hero contextual)
├── ARReceivableCard.jsx       (P2 — card mobile-first)
├── ARGroupedList.jsx          (P2 — lista agrupada por urgencia)
├── ARActionSheet.jsx          (P4 — bottom sheet dual-path)
├── ARCustomerPanel.jsx        (P5 — panel lateral de cliente)
├── ARPaymentReceiptModal.jsx  (P6+P7 — comprobante post-cobro)
├── ARStickyActionBar.jsx      (P9 — barra sticky mobile)
├── ARBulkReminderModal.jsx    (P10 — recordatorio masivo)
└── FilterPill.jsx             (P3 — pill de filtro reutilizable)
```

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/AccountsReceivableReport.jsx` | Integrar los 9 componentes nuevos; reemplazar FilterBar (dropdown+toggle) con FilterPills; reemplazar 3 botones por fila con 1 botón → ARActionSheet; añadir ARHeroBanner encima de ARSummaryCards; añadir ARStickyActionBar al footer del módulo; añadir ARCustomerPanel para tap en cliente; añadir estado `receiptData` para ARPaymentReceiptModal |
| `src/components/accounts-receivable/RecordReceivablePaymentDialog.jsx` | En `onPaymentSuccess`, después del toast: `setReceiptData({ receivable, amount, method, reference, date })` |
| `src/components/accounts-receivable/ARSummaryCards.jsx` | Añadir botón "Recordar a todos" en card de vencidos; conectar con ARBulkReminderModal |
| `src/config/navLinks.js` | Renombrar children de "Cuentas por Cobrar": Pendientes→"Por Cobrar", Confirmados→"Comprobantes", Reportes→"Historial" |
| `src/config/sidebarNavGroups.js` | Alinear con nueva nomenclatura de navLinks |

---

## Criterios de Aceptación

### Funcionales

- [ ] **Ruta única de entrada**: `/receivables?tab=pending` llega siempre al módulo AR unificado
- [ ] **Flujo Cobrar ≤ 3 taps**: tap en card → tap "Cobrar ahora" en sheet → confirmar en dialog → done
- [ ] **Flujo Link de pago ≤ 3 taps**: tap en card → tap "Enviar link" en sheet → confirmar en RequestPaymentModal → done
- [ ] **Recordatorio WhatsApp 1 tap**: tap en card → tap "Recordatorio" en sheet → WhatsApp abre (sin popover intermedio)
- [ ] **Cliente en panel**: tap en nombre del cliente abre ARCustomerPanel con historial filtrado
- [ ] **Post-cobro documentado**: modal ARPaymentReceiptModal aparece con "Imprimir" y "Compartir" funcionales
- [ ] **Vista Pagadas**: pill "Pagadas" muestra cobros completados con botón de comprobante por item
- [ ] **Banner hero correcto**: si hay vencidos muestra banner rojo; si no, azul o esmeralda según estado
- [ ] **Sticky bar visible**: en mobile con vencidos, barra bottom visible con el cobro de mayor balance

### Visuales

- [ ] **Mobile sin scroll horizontal**: en 375px, el módulo completo es navegable sin scroll lateral
- [ ] **Jerarquía de urgencia**: cards vencidas tienen borde rojo; esta semana, ámbar; al día, sin borde coloreado
- [ ] **Animaciones consistentes**: stagger en listas, AnimatedNumber en saldos, spring en sheets
- [ ] **Accesibilidad**: todos los botones con `aria-label`; pills con `role="tab"`; panel con `role="dialog"`

### Performance

- [ ] **Sin refetch en filtrado**: todos los filtros operan sobre `reportData` en cliente (sin calls al backend)
- [ ] **ARCustomerPanel**: filtra `reportData` en cliente, no hace fetch adicional
- [ ] **ARStickyActionBar**: `useMemo` para calcular `mostUrgent`, sin recalcular en cada render

---

## Secuencia de Implementación Recomendada

1. **FilterPill.jsx** — componente atómico, base de P3
2. **ARHeroBanner.jsx** — visible inmediatamente, alto impacto
3. **ARActionSheet.jsx** — refactor del flujo de cobro, resuelve P2+P4+P5 del whiteboard
4. **ARReceivableCard.jsx** + **ARGroupedList.jsx** — mobile layout, mayor impacto visual
5. **ARCustomerPanel.jsx** — panel de cliente deeplink
6. **ARPaymentReceiptModal.jsx** — post-cobro (modifica también RecordReceivablePaymentDialog)
7. **ARStickyActionBar.jsx** — barra mobile
8. **ARBulkReminderModal.jsx** — acción masiva (modifica ARSummaryCards)
9. **Modificar navLinks.js + sidebarNavGroups.js** — renombrar tabs
10. **Integrar todo en AccountsReceivableReport.jsx** — conectar componentes

---

## Verificación Final (smoke test manual)

**Desde mobile (375px en DevTools):**
1. Abrir `/receivables?tab=pending`
2. Verificar banner de urgencia visible sin scroll
3. Verificar cards agrupadas (sin tabla, sin scroll horizontal)
4. Verificar barra sticky si hay vencidos
5. Tap en card → ARActionSheet aparece → tap "Cobrar ahora" → RecordPaymentDialog → registrar → ARPaymentReceiptModal
6. Tap en nombre cliente → ARCustomerPanel fullscreen
7. Pills de filtro: tap "Pagadas" → lista de cobros con "Ver comprobante"

**Desde desktop (1280px):**
1. Tabla con columnas reordenadas (sin 3 botones de fila)
2. Botón "Cobrar" en columna de acciones → ARActionSheet centrado
3. Tap cliente → ARCustomerPanel side="right" 420px
4. Barra sticky NO visible
