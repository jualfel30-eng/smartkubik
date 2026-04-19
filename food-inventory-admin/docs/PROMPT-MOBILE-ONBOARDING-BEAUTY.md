# Prompt: Mobile-First Onboarding — SmartKubik Beauty Vertical

## Your Role

You are a senior UX engineer and growth designer with 25 years of experience building conversion-optimized onboarding flows at Duolingo, Headspace, Calm, and Spotify. You specialize in onboarding that doesn't feel like onboarding — every screen sells an outcome (not a feature), every question personalizes the experience, every transition builds anticipation, and the user hits their "aha moment" before they even finish signing up. You have shipped onboarding flows that converted 40%+ of free trial users to paid, and you understand the three-stage reward sequence: anticipation → reveal → celebration. You know that a barbershop owner downloading an app at 11pm after a 12-hour shift doesn't want to fill forms — they want to see their salon come alive on screen in under 90 seconds.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). The admin panel is built with React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a background). Mobile-first PWA. Target market: Venezuela and LATAM.

---

## Market Intelligence (Critical Context for Copy & Positioning)

### The 8 Pain Points That Trigger Purchase

| # | Pain Point | Impact |
|---|-----------|--------|
| 1 | **Citas por WhatsApp a las 11pm** — if you don't reply fast, the client goes elsewhere | 20-30% demand lost |
| 2 | **No-shows kill the day** — client doesn't show, slot wasted, stylist stood idle | $1,000+/month lost revenue |
| 3 | **Manual commissions = monthly war** — 12-16 hours with calculator, errors cause talent loss | $25,000/year risk when top barber quits over $18 error |
| 4 | **Don't know who generates most** — all charge the same, no visibility into per-stylist profitability | Invisible margins, blind decisions |
| 5 | **Clients disappear silently** — no way to know who hasn't visited in 2 months | 70% of new clients never return for 3rd visit |
| 6 | **Cash chaos at closing** — USD + VES + Zelle + Pago Movil + Binance, nothing balances | 30+ min daily reconciliation |
| 7 | **Stylist leaves and takes everything** — photos, formulas, contacts, clients | Catastrophic loss |
| 8 | **No SENIAT compliance** — no salon software does legal invoicing in Venezuela | Permanent legal risk |

### Positioning: Before/After Emotional

The onboarding must communicate the BEFORE (pain) and AFTER (outcome) — NOT feature lists.

- **Before**: "Son las 11pm. Suena el WhatsApp..."
- **After**: "...la clienta reservó sola. Tú te enteraste con el café en la mano."

### Competitive Reality

The real competitor is NOT Fresha or Booksy — it's the notebook + WhatsApp + phone calculator. No salon software in Venezuela processes payments, has SENIAT compliance, or handles multi-currency VES/USD. SmartKubik is the only one.

### Audience Profile

- Mobile-first (manages business from phone)
- WhatsApp-native (primary communication channel)
- Instagram-active (marketing lives there)
- Price sensitive but ROI-responsive ($20/month that saves $1,000/month sells itself)
- Not tech-savvy — wants peace of mind, not technology

---

## Current State

### What exists
- `OnboardingWizard.jsx` at `src/pages/OnboardingWizard.jsx` — 6 generic steps (Welcome, Customize logo/currency, Add products, Simulate sale, Enable modules, CTA). NOT beauty-specific, NOT mobile-optimized, NOT emotionally engaging.
- `Register.jsx` at `src/pages/Register.jsx` — 3-step registration (Business info + vertical, Admin info, Summary). Generic for all verticals.
- `ConfirmAccount.jsx` — 6-digit email confirmation code.
- `verticalProfiles.js` at `src/config/verticalProfiles.js` — niche config for `barbershop-salon` with module tour, product labels, etc.

### Problems with current onboarding
1. **Generic** — same flow for a barbershop and a hardware store. No emotional connection to beauty pain points.
2. **Feature-first** — "Enable modules" step lists technical features. Should sell outcomes.
3. **No personalization** — doesn't ask about the business's specific pain points, team size, or goals.
4. **No aha moment** — user adds sample products and simulates a sale. For beauty, the aha should be: seeing your booking page live, or seeing your first professional's schedule.
5. **No anticipation/ceremony** — flat screens with forms. No animations that make the business "come alive."
6. **Desktop-biased** — forms are not touch-optimized, no bottom sheet patterns, no mobile layout.
7. **No WhatsApp hook** — in a market where 50% of bookings come via WhatsApp, onboarding doesn't mention it.
8. **No ROI calculator** — doesn't show the user how much they're losing to no-shows/manual processes.

### Backend API (onboarding endpoints)
```
POST /onboarding/register     — create tenant + admin (atomic transaction)
POST /onboarding/confirm      — confirm with 6-digit code
PATCH /tenant/onboarding-progress  — track wizard step
POST /tenant/logo             — upload logo
PUT  /tenant/settings         — update currency, tax, modules
POST /beauty-services         — create beauty service
POST /professionals           — create professional
PUT  /professionals/:id       — update professional (schedule, services)
POST /beauty-bookings         — create booking (for simulation)
```

### Design system tokens
- Motion: `SPRING.drawer` (380,36), `SPRING.snappy` (500,40), `SPRING.soft` (260,30), `SPRING.bouncy` (420,22)
- Variants: `listItem`, `scaleIn`, `STAGGER`, `fadeUp`, `pulseGlow`
- Haptics: `haptics.tap()`, `haptics.select()`, `haptics.success()`
- Bottom sheet: `MobileActionSheet` with `footer`, portaled to `document.body`
- Existing: `AnimatedNumber`, `Sparkline`, confetti particle system (`confetti-burst`)
- Existing: `Lottie` or SVG path animations for illustrations

---

## Requirements

### Architecture

1. New `MobileOnboardingBeauty.jsx` at `src/pages/MobileOnboardingBeauty.jsx`
2. Detect beauty vertical during registration → route to this flow instead of generic `OnboardingWizard`
3. The entire flow runs BEFORE the user sees the dashboard — it IS the first-time experience
4. Progress saved server-side via `PATCH /tenant/onboarding-progress` at each step
5. User can exit and resume later (persisted step)
6. Flow creates real data (services, professionals, schedule) — NOT dummy/sample data

### Guiding Principles (from research)

1. **Sell the outcome, not the feature** — every screen shows what changes in their business, not what button exists in the app
2. **Personalize early** — ask about THEIR pain points, THEIR team, THEIR services. Then show what those answers unlocked.
3. **Hit the aha moment fast** — the user should SEE their booking page or their professional's schedule LIVE before the onboarding ends
4. **Long flows can feel short** — Duolingo has 60 screens before signup. The key is delight, animation, and progress.
5. **Gift, not receipt** — every result (your page is live, your first professional is set up) should be revealed with anticipation → ceremony → celebration
6. **Teach in context** — no front-loaded tutorials. Show tooltips and guidance when the user needs them, not all at once.

---

### The Flow: 12 Screens (but feels like 5)

**Screen 1: Pain Point Selection (Personalization)**

```
+------------------------------------------+
|                                          |
|  💇 Bienvenido a SmartKubik              |
|                                          |
|  ¿Cuál de estos problemas te            |
|  quita el sueño?                         |
|  (selecciona todos los que apliquen)     |
|                                          |
|  [😴 Citas por WhatsApp a las 11pm  ]   |
|  [👻 Clientes que no llegan (no-show)]   |
|  [🧮 Calcular comisiones a mano     ]   |
|  [💸 No sé cuánto gané realmente hoy]   |
|  [🏃 Clientes que desaparecen        ]   |
|  [📦 Producto que desaparece         ]   |
|                                          |
+------------------------------------------+
|  [ Siguiente ]                           |
+------------------------------------------+
```

- Multi-select (like Headspace — 10% increase in trial conversion when users pick multiple goals)
- Each option is a tappable card with emoji + short pain description
- Selected: primary border + check icon with `SPRING.bouncy`
- This data drives personalization in later screens and in the dashboard
- At least 1 required to continue
- `haptics.select()` on each tap

**Screen 2: Your Outcome (Personalized Promise)**

Based on selected pain points, show a personalized "after" screen:

```
+------------------------------------------+
|                                          |
|  Basado en lo que nos contaste,          |
|  SmartKubik te va a ayudar a:            |
|                                          |
|  ✅ Capturar citas 24/7 sin contestar   |  ← shown if pain 1 selected
|     WhatsApp a las 11pm                  |
|                                          |
|  ✅ Eliminar no-shows con señas          |  ← shown if pain 2 selected
|     automáticas en Zelle/Pago Móvil      |
|                                          |
|  ✅ Calcular comisiones en 0 segundos    |  ← shown if pain 3 selected
|     (no más calculadora)                 |
|                                          |
|  Estimado de recuperación:               |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  ~ $750/mes                      │    |  ← AnimatedNumber count-up
|  │  que hoy estás perdiendo         │    |
|  └──────────────────────────────────┘    |
|                                          |
+------------------------------------------+
|  [ Vamos a configurar tu salón → ]       |
+------------------------------------------+
```

- Dynamic based on pain point selections
- Only show outcomes for selected pains (3-6 items)
- Recovery estimate calculated from selected pains (rough ROI: no-shows = $500, commission errors = $150, lost clients = $100)
- `AnimatedNumber` on the dollar amount — count-up from $0 to estimated amount
- This is the "personalized outcome" pattern (like Endo, BitePal, Speak)
- CTA button: "Vamos a configurar tu salón" (not "Siguiente" — outcome-oriented)

**Screen 3: Your Salon Identity (Business Setup)**

```
+------------------------------------------+
|                                          |
|  ¿Cómo se llama tu negocio?              |
|                                          |
|  [ Barbería El Pulpo             ]       |
|                                          |
|  Tu logo (opcional)                      |
|  ┌──────────┐                            |
|  │  📷      │  [Subir desde galería]     |
|  │  tap     │                            |
|  └──────────┘                            |
|                                          |
|  Moneda principal                        |
|  [💵 USD]  [🇻🇪 VES]                     |
|                                          |
|  Número de WhatsApp del negocio          |
|  [ +58 414 123 4567             ]        |
|                                          |
+------------------------------------------+
|  [ Siguiente → ]                         |
+------------------------------------------+
```

- Business name: pre-filled from registration if available
- Logo: tap to upload from camera/gallery. Thumbnail preview with scale-in animation.
- Currency: 2 large pill chips (USD default for Venezuela)
- WhatsApp number: tel input — this is CRITICAL because it's used for the storefront booking page
- Minimal fields — everything else can be configured later in Settings

**Screen 4: Your Team (Add Professionals)**

```
+------------------------------------------+
|                                          |
|  ¿Quién trabaja en tu salón?             |
|                                          |
|  Agrega a tus profesionales              |
|  (puedes agregar más después)            |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  👤 Nombre: [ Carlos Ramírez  ]  │    |
|  │  🎨 Color:  [🔴🔵🟢🟡🟣⚫]     │    |  ← color dot selector
|  └──────────────────────────────────┘    |
|                                          |
|  [+ Agregar otro profesional]            |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  ☝️ Yo trabajo solo/a            │    |  ← shortcut: skip team
|  └──────────────────────────────────┘    |
|                                          |
+------------------------------------------+
|  [ Siguiente → ]                         |
+------------------------------------------+
```

- Add 1-5 professionals with just name + color (minimal friction)
- Color selector: 6-8 preset color circles, tap to select
- "Yo trabajo solo/a" shortcut: creates one professional with the owner's name
- Each professional added shows as a small avatar chip above the input area
- `haptics.success()` when professional is added
- Creates real `POST /professionals` records

**Screen 5: Your Services (Add Services)**

```
+------------------------------------------+
|                                          |
|  ¿Qué servicios ofreces?                |
|                                          |
|  Selecciona y personaliza                |
|                                          |
|  POPULARES                               |
|  [✂️ Corte Clásico    $10  30min  ✓]    |  ← pre-filled suggestions
|  [🪒 Barba Completa    $8  20min  ✓]    |
|  [✂️+🪒 Corte + Barba $15  45min  ✓]   |
|  [🎨 Tinte de Cabello $25  60min   ]    |
|  [💆 Masaje Capilar    $12  15min   ]    |
|  [🧴 Cejas             $5  10min   ]    |
|                                          |
|  Precios y duración son editables        |
|  Tap para ajustar ✏️                     |
|                                          |
|  [+ Agregar servicio personalizado]      |
|                                          |
+------------------------------------------+
|  [ Siguiente → ]                         |
+------------------------------------------+
```

- Pre-filled service suggestions specific to barbershop/salon (NOT generic "products")
- Each row: emoji + name + price + duration + checkbox
- User can tap to edit price/duration inline (bottom sheet with numpad)
- Pre-selected: top 3 most common (Corte, Barba, Corte+Barba)
- "+ Agregar servicio personalizado" opens empty row
- Creates real `POST /beauty-services` records
- At least 1 service required

**Screen 6: Your Schedule (Set Hours)**

```
+------------------------------------------+
|                                          |
|  ¿Cuál es tu horario?                    |
|                                          |
|  Lun-Vie    [08:00] — [19:00]  ✓         |
|  Sábado     [09:00] — [15:00]  ✓         |
|  Domingo    Cerrado              ✗        |
|                                          |
|  (puedes ajustar por día después)        |
|                                          |
+------------------------------------------+
|  [ Siguiente → ]                         |
+------------------------------------------+
```

- Simplified schedule: weekday block + Saturday + Sunday
- Toggle open/closed per block
- Time pickers with scroll wheels or preset chips
- Saves to tenant settings + professional schedules
- One-screen simplicity — detailed per-day editing is in Settings

**Screen 7: Anticipation Screen (Building Your Salon)**

```
+------------------------------------------+
|                                          |
|                                          |
|         ⏳ Preparando tu salón...        |
|                                          |
|         [████████░░░░░░] 65%             |
|                                          |
|  ✓ Creando tu página de reservas         |
|  ✓ Configurando horarios                 |
|  ● Activando recordatorios WhatsApp...   |
|  ○ Generando tu link de reservas         |
|                                          |
|                                          |
+------------------------------------------+
```

- This is the ANTICIPATION stage of the gift framework
- Animated progress bar with `SPRING.soft`
- Checklist items check off one by one with stagger (150ms between each)
- Each checkmark: green check icon scales in with `SPRING.bouncy`
- Active item has pulsing dot
- The system IS actually creating everything (storefront config, schedule, etc.)
- Duration: 3-4 seconds (real processing + artificial ceremony)
- `haptics.success()` when progress hits 100%

**Screen 8: The Reveal — Your Booking Page is Live**

```
+------------------------------------------+
|                                          |
|  🎉 ¡Tu página de reservas está lista!   |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │                                  │    |
|  │  [Mini preview of storefront]    │    |  ← scaled-down live preview
|  │  Barbería El Pulpo               │    |
|  │  [Logo] Reservar cita →          │    |
|  │  Corte Clásico · $10             │    |
|  │                                  │    |
|  └──────────────────────────────────┘    |
|                                          |
|  Tus clientes pueden reservar 24/7       |
|  desde este link:                        |
|                                          |
|  elpulpo.smartkubik.com                  |
|                                          |
|  [📋 Copiar enlace]                      |
|  [📲 Compartir por WhatsApp]             |
|                                          |
+------------------------------------------+
|  [ Ver mi salón en SmartKubik → ]        |
+------------------------------------------+
```

- This is the REVEAL — the aha moment. The user sees their actual booking page with THEIR name, THEIR logo, THEIR services.
- Mini preview: styled card mimicking the storefront (not an iframe — a visual representation)
- Shareable link prominently displayed
- "Copiar enlace": copies to clipboard, `haptics.success()`, "¡Copiado!" tooltip
- "Compartir por WhatsApp": `navigator.share()` or direct `wa.me` link with pre-filled message: "¡Ya puedes reservar tu cita conmigo! [link]"
- Confetti burst animation on screen entry (`confetti-burst` component)
- This is the screen that converts trial to habit — if they share their link, they're committed

**Screen 9: The Celebration — Your Numbers**

```
+------------------------------------------+
|                                          |
|  Tu salón en SmartKubik                  |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  👤 2 profesionales              │    |
|  │  ✂️ 4 servicios configurados     │    |
|  │  📅 Horario de Lun a Sáb        │    |
|  │  🌐 Página de reservas activa    │    |
|  │  💬 WhatsApp conectado           │    |
|  └──────────────────────────────────┘    |
|                                          |
|  Próximos pasos recomendados:            |
|                                          |
|  □ Agregar fotos de tu trabajo           |
|  □ Invitar a tu equipo                   |
|  □ Configurar señas/depósitos            |
|  □ Activar programa de lealtad           |
|                                          |
+------------------------------------------+
|  [ Ir a mi dashboard → ]                 |
+------------------------------------------+
```

- This is the CELEBRATION + AFTERGLOW
- Summary of everything configured (animated count-up for numbers)
- Checklist of next steps (persisted — shows in dashboard too, like Mural's 6-step checklist that drove 10% retention increase)
- Each checklist item links to the relevant module
- "Ir a mi dashboard" takes to TodayDashboard with a first-time welcome state

### Post-Onboarding: Dashboard Checklist

After onboarding, the `TodayDashboard` shows a progress checklist card (until all items completed):

```
+------------------------------------------+
|  Configura tu salón (3/7 completados)    |
|  [████████░░░░░░] 43%                    |
|                                          |
|  ✓ Crear página de reservas              |
|  ✓ Agregar profesionales                 |
|  ✓ Configurar servicios                  |
|  □ Agregar fotos de tu trabajo           |
|  □ Configurar señas/depósitos            |
|  □ Invitar a tu equipo                   |
|  □ Crear tu primera cita                 |
+------------------------------------------+
```

- Each incomplete item is tappable → navigates to relevant module
- Progress persisted server-side
- Card dismissable after 7/7 complete
- Drives feature discovery and activation without tooltips/popups

---

### Mobile UX Patterns (MANDATORY)

- **Full-screen screens**: Each step is a full-screen mobile view, not a modal/dialog
- **Progress indicator**: Thin progress bar at very top of screen (not numbered steps — makes it feel shorter)
- **Transitions**: Horizontal slide between steps (`slideVariants` with `SPRING.soft`)
- **Back navigation**: Subtle back arrow, doesn't reset data
- **Inputs**: Full-width, `min-h-[48px]`, `bg-muted rounded-xl px-4 py-3 text-base`
- **Chips/toggles**: Large touch targets (48px+), `haptics.select()` on tap, `SPRING.snappy` scale animation
- **Illustrations**: Simple emoji-based or SVG, not stock photos
- **Copy tone**: Conversational, tuteo (tú), direct. "¿Cuánto cobras por un corte?" not "Ingrese el precio del servicio."

### Micro-interactions (Critical for Delight)

| Screen | Interaction | Spec |
|--------|------------|------|
| Pain points | Chip selection | Scale 0.95→1.05→1 with `SPRING.bouncy`, check icon fade-in, `haptics.select()` |
| Outcome | Dollar amount | `AnimatedNumber` count-up from $0 to estimated, 800ms, ease-out |
| Logo upload | Photo appears | Scale 0→1 with `SPRING.bouncy`, border glow pulse |
| Team | Professional added | Avatar chip slides in from right with `SPRING.soft`, subtle confetti |
| Services | Checkbox toggle | Check scales in with `SPRING.bouncy`, row background flashes primary/5 |
| Building | Progress bar | `SPRING.soft` width animation, checklist items stagger 150ms |
| Reveal | Storefront preview | Scale 0.9→1 with `SPRING.bouncy`, confetti burst, `haptics.success()` |
| Share link | Copy button | Button morphs to "¡Copiado!" for 2s, green flash |
| Celebration | Summary numbers | `AnimatedNumber` count-up, stagger 200ms between items |
| Checklist | Item complete | Check icon with `SPRING.bouncy`, progress bar fills |

### Technical Constraints

- All data created during onboarding must be REAL (not sample/demo data)
- API: `fetchApi()`, auth tokens available after registration
- Progress: `PATCH /tenant/onboarding-progress` with step index + completed flags
- Storefront: `PUT /restaurant-storefront/config` to create the booking page
- Navigation: React Router, final screen redirects to `/dashboard`
- Build: `npx vite build` — JSX only
- Test: 375px (iPhone SE) and 430px (iPhone 15 Pro Max)
- Offline resilience: if connection drops mid-flow, save state locally and retry

### What NOT to Build

- Desktop onboarding (this is mobile-only for beauty vertical)
- Payment/subscription during onboarding (trial starts automatically)
- SENIAT configuration (too complex for first-run — belongs in Settings)
- Inventory setup (not the aha moment for beauty — services and booking are)
- Full schedule editor (simplified version during onboarding, detailed in Settings)

---

## Deliverables

1. `MobileOnboardingBeauty.jsx` — main flow controller (step management, transitions, progress tracking)
2. `OnboardingPainPoints.jsx` — pain point multi-select (Screen 1)
3. `OnboardingOutcome.jsx` — personalized outcome with ROI estimate (Screen 2)
4. `OnboardingSalonIdentity.jsx` — business name, logo, currency, WhatsApp (Screen 3)
5. `OnboardingTeam.jsx` — add professionals (Screen 4)
6. `OnboardingServices.jsx` — select/customize services (Screen 5)
7. `OnboardingSchedule.jsx` — set hours (Screen 6)
8. `OnboardingBuilding.jsx` — anticipation/loading screen (Screen 7)
9. `OnboardingReveal.jsx` — booking page reveal with share (Screen 8)
10. `OnboardingCelebration.jsx` — summary + checklist (Screen 9)
11. `OnboardingChecklist.jsx` — persistent dashboard checklist widget (post-onboarding)
12. Route detection: if `tenant.verticalProfile.key === 'barbershop-salon'` → route to this flow

The onboarding must feel like the salon is being built in front of the owner's eyes. By the end, they should have a live booking page they can share on WhatsApp tonight. That's the moment they stop being a "trial user" and become a customer.
