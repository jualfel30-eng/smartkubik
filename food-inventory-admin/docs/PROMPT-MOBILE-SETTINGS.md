# Prompt: Mobile-First Settings Module — SmartKubik Beauty Vertical

## Your Role

You are a senior UX engineer with 25 years of experience building mobile-first applications at Apple, Google, and Stripe. You specialize in crafting settings interfaces that feel native — every toggle snaps, every transition breathes, every form input is effortless on a 375px screen with a thumb. You have shipped settings UIs used by hundreds of millions of users and you know that a settings page is not a dumping ground for form fields — it is architecture that makes complexity invisible.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). The admin panel is built with React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a background). Mobile-first PWA.

---

## Current State

### What exists (mobile)
- `MobileSettingsPage.jsx` at `src/components/mobile/settings/MobileSettingsPage.jsx` — an iOS-style grouped navigation list with 4 sections (General, Servicios, Notificaciones, Avanzado). Each item has an icon, label, and chevron. Tapping an item navigates to the desktop SettingsPage with a `?section=` param, which renders the full desktop form on mobile — unusable.
- `SettingsRouteGate.jsx` at `src/components/mobile/settings/SettingsRouteGate.jsx` — detects mobile via `matchMedia(max-width: 767.98px)`. Shows `MobileSettingsPage` on mobile when no `?section=` param, falls through to desktop `SettingsPage` when `?section=` is present.

### What exists (desktop)
- `SettingsPage.jsx` at `src/components/SettingsPage.jsx` — single-page with horizontal tab bar: General, Delivery, Notificaciones, Email, Pagos, WhatsApp, Seguridad, Usuarios, Roles y Permisos. Each tab renders its own form section inline. Forms use Shadcn/Radix inputs, selects, toggles. Data fetched via `fetchApi('/settings')` and saved via `PUT /settings`.

### Backend API
- `GET /settings` — returns tenant settings object
- `PUT /settings` — updates tenant settings (partial merge)
- `GET /professionals` — list professionals (for schedule management)
- `PUT /professionals/:id` — update professional (schedule, services, etc.)
- `GET /payment-methods` — list configured payment methods
- `PUT /payment-methods` — update payment methods configuration
- `GET /users` — list tenant users
- Settings object structure (key fields for Beauty vertical):
  ```
  {
    businessName, businessPhone, businessEmail, logo,
    timezone, currency, language,
    schedule: { monday: { available, start, end }, ... },
    appointments: { slotDuration, bufferTime, maxAdvanceDays, allowWalkIns, requireDeposit },
    notifications: { emailReminders, smsReminders, pushEnabled, reminderHoursBefore },
    whatsapp: { enabled, confirmationTemplate, reminderTemplate },
    payments: { methods: [...], defaultMethod, acceptTips, tipPercentages },
    deposits: { required, amount, percentage },
  }
  ```

### Design system tokens (already in use across all mobile components)
- Motion: `SPRING.drawer` (stiffness:380, damping:36), `SPRING.snappy` (500,40), `SPRING.soft` (260,30)
- Variants: `listItem` (fadeUp), `scaleIn`, `STAGGER(delay)`
- Haptics: `haptics.tap()`, `haptics.select()`, `haptics.success()`
- Bottom sheet: `MobileActionSheet` with `footer` prop, renders via `createPortal` to escape PageTransition transform
- Touch: 44px min targets, `whileTap={{ scale: 0.97 }}`, `no-tap-highlight` class
- Colors: `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary`
- Radius: `var(--mobile-radius-lg)`, `var(--mobile-radius-md)`, or `rounded-full` for pills

---

## Requirements

### Architecture
1. Each settings section must be a **dedicated mobile sub-page component** (NOT the desktop SettingsPage rendered on mobile). These are real mobile-optimized forms.
2. Navigation: `MobileSettingsPage` (hub) → tap item → `navigate('/settings/business')` → `MobileSettingsBusiness.jsx` renders. Back button returns to hub.
3. Route registration: add nested routes under `/settings/*` in `App.jsx` or handle via query params in `SettingsRouteGate.jsx` — whichever is simpler without breaking desktop.
4. Each sub-page loads its own data from the API and saves independently.
5. All sub-pages share a common layout: sticky header with back button + title, scrollable content, sticky save button at bottom (if the section has editable fields).

### Sections to build (Beauty vertical priority)

**1. Datos del Negocio** (`/settings/business`)
- Business name (text input, full-width)
- Phone (tel input)
- Email (email input)  
- Logo upload (preview thumbnail + "Cambiar" button → file picker)
- Address (textarea or structured fields)
- All inputs: label above, full-width, 44px+ height, `bg-muted` background, `rounded-xl`, focus ring

**2. Horarios de Atencion** (`/settings/hours`)
- 7-day schedule (Mon-Sun)
- Each day: toggle (open/closed) + start time + end time
- Visual timeline representation: horizontal bar showing open hours for each day
- Tap on a day → inline expand or bottom sheet with time pickers
- "Copiar a todos" button (copy one day's schedule to all days)
- Break/pause support: optional mid-day break per day (e.g., 12:00-13:00 lunch)

**3. Monedas y Metodos de Pago** (`/settings/payments`)
- Active currency display (USD/VES)
- Exchange rate input (if dual currency)
- Payment methods: list of toggleable methods (Efectivo USD, Efectivo VES, Transferencia, Pago Movil, Zelle, POS, Tarjeta)
- Each method: toggle on/off + optional label customization
- Tips configuration: toggle + percentage chips (10%, 15%, 20%, custom)
- Deposit settings: toggle required + amount/percentage input

**4. Servicios y Precios** (`/settings/services`)  
- This should navigate to `/services` which already has `ServicesRouteGate` → `MobileServicesPage`. Just make the link work correctly. No new component needed.

**5. Push y Recordatorios** (`/settings/notifications`)
- Push notifications: toggle enabled/disabled
- Email reminders: toggle + hours-before selector (chips: 1h, 2h, 4h, 24h)
- SMS reminders: toggle + hours-before
- No-show alerts: toggle

**6. WhatsApp Automatico** (`/settings/whatsapp`)
- WhatsApp integration: toggle enabled
- Confirmation message template: textarea with variable chips ({clientName}, {serviceName}, {date}, {time})
- Reminder message template: textarea with variable chips
- Preview button: shows how the message would look

**7. Usuarios y Permisos** (`/settings/users`)
- User list: cards with avatar, name, email, role badge
- Tap user → detail sheet with role selector, permissions toggles
- Invite user: bottom sheet with email + role selector + send button

### Mobile UX patterns (MANDATORY)

- **Inputs**: Full-width, `min-h-[44px]`, `bg-muted rounded-xl px-4 py-3 text-base`. Label above in `text-xs font-medium text-muted-foreground mb-1.5`. Focus: `focus:ring-2 focus:ring-primary/30`.
- **Toggles**: Animated spring toggle (not HTML checkbox). `w-11 h-6 rounded-full`. Thumb animates with `SPRING.snappy`. Background transitions from `bg-muted-foreground/30` to `bg-primary`.
- **Sections**: Grouped in cards with `bg-card rounded-[var(--mobile-radius-lg)] border border-border`. Section title in `text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2`.
- **Save**: Sticky footer with "Guardar cambios" button. Only visible when there are unsaved changes (track dirty state). Success: `haptics.success()` + toast.
- **Loading**: Skeleton shimmer while fetching settings.
- **Errors**: Inline error text below field in `text-xs text-destructive`. Toast for save errors.
- **Back navigation**: `<ChevronLeft>` button in header. `navigate(-1)` or `navigate('/settings')`.

### Micro-interactions
- Toggle flip: `SPRING.snappy` thumb translate
- Section card entrance: `listItem` variant with `STAGGER(0.04)`
- Save button: `whileTap={{ scale: 0.97 }}`, loading spinner when saving, green flash on success
- Time picker: bottom sheet with scroll wheels or button grid
- Schedule bar: animated width fill showing open hours
- Field focus: subtle border glow transition

### Technical constraints
- All sheets must use `MobileActionSheet` (which portals to `document.body`)
- Navigation must work with React Router v7 (`useNavigate`, `useSearchParams`)
- Data fetching with `fetchApi()` from `@/lib/api`
- Toasts with `toast.success()` / `toast.error()` from `@/lib/toast`
- Analytics with `trackEvent()` from `@/lib/analytics`
- Must build successfully with `npx vite build` — no TypeScript, all JSX
- Test on 375px viewport (iPhone SE) and 430px (iPhone 15 Pro Max)

---

## Deliverables

1. `MobileSettingsPage.jsx` — updated hub with correct navigation targets
2. `MobileSettingsBusiness.jsx` — business info form
3. `MobileSettingsHours.jsx` — schedule editor with visual timeline
4. `MobileSettingsPayments.jsx` — payment methods + tips + deposits
5. `MobileSettingsNotifications.jsx` — push/email/SMS toggles
6. `MobileSettingsWhatsApp.jsx` — templates editor
7. `MobileSettingsUsers.jsx` — user management
8. `SettingsRouteGate.jsx` — updated to route to correct sub-pages
9. `App.jsx` — route registration for settings sub-pages (if needed)

Each component must be fully functional end-to-end: load data, render mobile-optimized form, validate, save, show feedback. Not a facade — a real mobile settings experience.
