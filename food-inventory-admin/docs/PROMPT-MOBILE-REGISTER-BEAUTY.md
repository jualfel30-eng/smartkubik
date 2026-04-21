# Prompt: Mobile-First Registration — SmartKubik Beauty Vertical

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 25 years of experience at Duolingo, Calm, Headspace, and Spotify. You specialize in conversion-optimized signup flows where every screen reduces cognitive load, every transition builds momentum, and the user feels they're already using the product before they've finished registering. You understand that registration is NOT a form — it's the first chapter of the user's story with your product. Dollar Shave Club increased subscriptions 5% by making their quiz copy conversational. House increased conversions 15% by splitting their signup into multiple screens. You know that the friction you ADD in one place removes friction in another.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a). Mobile-first PWA. Target: Venezuela and LATAM.

---

## Context: The Landing → Register → Onboarding Pipeline

```
/skubik (SkubikBeautyLanding.jsx)
  └→ CTA "Prueba gratis" or "Crear mi salon"
      └→ /register/beauty (NEW — MobileRegisterBeauty.jsx)
          └→ POST /onboarding/register
              └→ /confirm-account (6-digit code)
                  └→ /onboarding (MobileOnboardingBeauty — already built, 9 steps)
                      └→ /dashboard (TodayDashboard)
```

The registration flow is the BRIDGE between the landing page's emotional promise ("Tu salon, abierto siempre") and the onboarding's aha moment (booking page goes live). If registration feels like a tax form, the user abandons. If it feels like the salon is already being built, they complete it.

---

## Current State

### What exists
- `Register.jsx` at `src/pages/Register.jsx` — generic 3-step form for ALL verticals:
  - Step 1: Business name + vertical dropdown (6 options) + category dropdown + number of users
  - Step 2: Name + email + phone + password + confirm password
  - Step 3: Summary review + submit
- NOT mobile-optimized — uses desktop Card/CardHeader layout, desktop Select components
- NOT beauty-specific — same flow for a restaurant, a hardware store, and a barbershop
- NO emotional connection — flat form fields with generic labels
- NO personalization — doesn't reflect the pain points from `/skubik` landing page
- The CTA on `/skubik` currently goes to WhatsApp, NOT to a register page

### What exists (landing page)
- `SkubikBeautyLanding.jsx` at `src/pages/SkubikBeautyLanding.jsx` — beauty-specific landing with:
  - Hero: "Tu salon, abierto siempre. Aunque tu estes dormida"
  - 7 pain points with solutions
  - Stats: 24/7 booking, -38% no-shows, +2h saved/day
  - Benefits: agenda 24/7, senas automaticas, data ownership
  - Growth stages timeline
  - WhatsApp CTA (primary), no direct register CTA

### Backend API
```
POST /onboarding/register
Body: {
  businessName: string,
  numberOfUsers: number,
  vertical: 'SERVICES',
  specificCategory: string (e.g., 'Barbería / Peluquería'),
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  password: string,
  businessType: string,
  subscriptionPlan: 'trial'
}
Response: {
  user, tenant, memberships, accessToken, refreshToken
}
```

The backend already handles everything — the registration endpoint creates tenant, admin user, role, billing sequences, and welcome email atomically. No backend changes needed.

### Design system
- All tokens from `/ux-design` skill apply
- Motion: `SPRING.drawer`, `SPRING.snappy`, `SPRING.soft`, `SPRING.bouncy`
- Haptics: `haptics.tap()`, `haptics.select()`, `haptics.success()`
- Dark mode: `#0a0e1a` background, `bg-card`, `border-border`

---

## Requirements

### Architecture
1. New `MobileRegisterBeauty.jsx` at `src/pages/MobileRegisterBeauty.jsx`
2. New route `/register/beauty` in `App.jsx` (public, no auth required)
3. Update `SkubikBeautyLanding.jsx` to add a "Prueba gratis 14 dias" CTA button that links to `/register/beauty`
4. The flow is 5 screens (not 3 form steps) — each screen asks ONE question category
5. Pre-fill `vertical: 'SERVICES'` and detect `specificCategory` from context (landing page can pass it via query param or state)
6. After registration, auto-login and redirect to `/onboarding` where `OnboardingGate` routes to `MobileOnboardingBeauty`
7. The ENTIRE registration must be completable in under 60 seconds on mobile

### Guiding Principles (from /ux-design skill)

1. **Sell the outcome, not the form field** — "¿Como se llama tu salon?" not "Nombre del negocio"
2. **Three-stage reward sequence** — the completion of registration IS a gift moment (anticipation during form → reveal of "Tu cuenta esta lista" → celebration with confetti + auto-redirect to onboarding)
3. **Long flows feel short** — 5 screens with 1-2 inputs each feels faster than 3 screens with 5 inputs each (House +15% conversions by splitting signup into multiple screens)
4. **Conversational copy in tuteo** — "¿Cuantas sillas tienes?" not "Ingrese el numero de usuarios"
5. **Continuity from landing page** — the register flow must feel like a CONTINUATION of the `/skubik` page, not a redirect to a corporate form. Same dark theme, same emotional tone, same brand.

---

### The Flow: 5 Screens

**Screen 1: Your Salon Name**

```
+------------------------------------------+
|  [← Volver]                              |
|                                          |
|  💇 SmartKubik                           |
|                                          |
|  ¿Como se llama tu salon?                |
|                                          |
|  [ Barbería El Pulpo             ]       |
|                                          |
|  ¿Que tipo de negocio es?                |
|  [💇 Barbería] [💅 Nail Studio]          |
|  [💆 Spa]      [✨ Salón]                |
|                                          |
|                                          |
|  14 días gratis · Sin tarjeta            |
|                                          |
+------------------------------------------+
|  [ Siguiente → ]                         |
+------------------------------------------+
```

- Business name: single large input, auto-focused, placeholder "Ej: Barbería El Pulpo"
- Category: 4 large tappable cards (not a dropdown) — pre-mapped to `specificCategory`:
  - 💇 Barbería / Peluquería → `barbershop-salon`
  - 💅 Nail Studio → `nail-salon`
  - 💆 Spa / Centro Estético → `spa-wellness`
  - ✨ Salón de Belleza → `beauty-salon`
- `vertical` is always pre-set to `'SERVICES'` (never shown to user)
- Trial badge at bottom: "14 dias gratis · Sin tarjeta" (social proof / urgency reduction)
- Back arrow returns to `/skubik` landing page
- `haptics.select()` on category selection

**Screen 2: Team Size**

```
+------------------------------------------+
|  [←]                                     |
|                                          |
|  ¿Cuantas sillas tienes?                |
|                                          |
|         [ - ]    3    [ + ]              |  ← Large stepper
|                                          |
|  (incluye la tuya si también             |
|   atiendes clientes)                     |
|                                          |
|                                          |
+------------------------------------------+
|  [ Siguiente → ]                         |
+------------------------------------------+
```

- Large stepper (not a dropdown or text input) — `min: 1, max: 20`
- Default: 1 (solo operator)
- Haptic on each +/- tap, number scales briefly
- Helper text: conversational, explains what "sillas" means
- This maps to `numberOfUsers` in the API payload
- ONE question per screen = feels fast (even though there are more screens total)

**Screen 3: Your Info**

```
+------------------------------------------+
|  [←]                                     |
|                                          |
|  ¿Como te llamas?                        |
|                                          |
|  [ Tu nombre              ]             |
|  [ Tu apellido            ]             |
|                                          |
|  ¿Tu WhatsApp?                           |
|  [ +58 | 0414 123 4567    ]             |
|                                          |
|                                          |
+------------------------------------------+
|  [ Siguiente → ]                         |
+------------------------------------------+
```

- First name + last name: two inputs, clean layout
- Phone: `inputMode="tel"`, country code pre-set to +58 (Venezuela), with country selector
- NO email on this screen (reduces friction — split across screens)
- WhatsApp framing instead of "telefono" — in Venezuela everyone has WhatsApp, so this feels natural and signals value ("we'll WhatsApp you, not spam you")

**Screen 4: Your Account**

```
+------------------------------------------+
|  [←]                                     |
|                                          |
|  ¿Con que correo quieres entrar?         |
|                                          |
|  [ tu@email.com                ]         |
|                                          |
|  Crea tu contraseña                      |
|  [ ••••••••              👁 ]           |
|                                          |
|  ✓ 8+ caracteres                         |  ← Real-time checklist
|  ✓ Al menos una letra                    |
|  ○ Al menos un número                    |
|                                          |
+------------------------------------------+
|  [ Crear mi salon → ]                    |
+------------------------------------------+
```

- Email: `inputMode="email"`, auto-lowercase
- Password: single field (NO confirm password — reduces friction 50%), with visibility toggle
- Real-time password checklist (checks off as user types, like Cake Equity pattern — "removes a reason to get stuck")
- NO confirm password field — if they mistype, they use "Forgot password" to reset. This is standard in 2026 (Stripe, Linear, Notion all do single password)
- CTA changes to "Crear mi salon" (outcome-oriented, not "Registrar")

**Screen 5: Building Your Salon (Anticipation → Reveal → Celebration)**

```
+------------------------------------------+
|                                          |
|                                          |
|  💇 Barbería El Pulpo                    |
|                                          |
|         ⏳ Creando tu salon...            |
|         [████████░░░░░░] 72%             |
|                                          |
|  ✓ Cuenta creada                         |
|  ✓ Configurando tu perfil                |
|  ● Preparando tu espacio de trabajo...   |
|  ○ Activando 14 días de prueba           |
|                                          |
|                                          |
+------------------------------------------+
```

Then transitions to:

```
+------------------------------------------+
|                                          |
|            🎉                            |
|                                          |
|     ¡Tu salon esta listo!                |
|                                          |
|  Barbería El Pulpo                       |
|  Plan: Prueba gratuita (14 días)         |
|  Venció: [fecha]                         |
|                                          |
|  Te enviamos un codigo de                |
|  confirmación a tu@email.com             |
|                                          |
+------------------------------------------+
|  [ Confirmar mi cuenta → ]               |
+------------------------------------------+
```

- **Stage 1 — Anticipation**: Progress bar + checklist. Each item checks off with stagger (200ms). The system IS actually calling `POST /onboarding/register` during this screen. Real processing + artificial ceremony (minimum 2.5 seconds even if API responds faster).
- **Stage 2 — Reveal**: "Tu salon esta listo!" with salon name prominently displayed. Confetti burst. `haptics.success()`.
- **Stage 3 — Celebration**: Show what was created (account, trial dates). Then prompt to confirm email.
- CTA "Confirmar mi cuenta" → navigates to `/confirm-account` with email pre-filled
- After confirmation → auto-redirect to `/onboarding` → `OnboardingGate` → `MobileOnboardingBeauty`

### Continuity: Landing Page → Register

The `/skubik` landing page needs a new CTA that leads to `/register/beauty`:

```jsx
// In SkubikBeautyLanding.jsx hero section, ADD alongside WhatsApp button:
<Link to="/register/beauty" className="...">
  Prueba gratis 14 dias →
</Link>
```

Also add the CTA in:
- The sticky mobile header/footer of the landing page
- After the pain points section ("¿Listo para resolverlos?")
- At the bottom before the WhatsApp section

The register page should maintain visual continuity:
- Same dark background (#0a0e1a)
- Same brand mark (SmartKubik + scissors emoji)
- Same copy tone (tuteo, conversational)
- Thin progress bar at top (like the onboarding)

### Pre-filled Context from Landing Page

When user clicks CTA from `/skubik`, pass context via query params or React Router state:

```jsx
// From landing page:
navigate('/register/beauty', { state: { source: 'skubik-landing', category: 'barbershop-salon' } });

// In register page:
const location = useLocation();
const prefilledCategory = location.state?.category || null;
```

If `prefilledCategory` is set, auto-select the category card on Screen 1 (one less tap).

### Mobile UX Patterns (MANDATORY)

- **Full-screen steps**: Each screen is a full mobile viewport, not a card inside a page
- **Progress bar**: Thin bar at very top (`h-1 bg-primary/20` with fill `bg-primary`), 5 segments
- **Transitions**: Horizontal slide between steps (`SPRING.soft`, direction-aware)
- **Inputs**: `min-h-[48px]`, `bg-muted rounded-xl px-4 py-3 text-base`, `focus:ring-2 focus:ring-primary/30`
- **Category cards**: Large (80px+ height), emoji + label, border highlight on select with `SPRING.bouncy`
- **Stepper**: 48px circle buttons, center number `text-3xl font-bold tabular-nums`, `haptics.tap()` per press
- **CTA button**: Full-width, `bg-primary text-primary-foreground py-4 text-base font-semibold rounded-xl`
- **Back navigation**: subtle `ChevronLeft` icon, doesn't lose data
- **Keyboard handling**: auto-focus on primary input per screen, `inputMode` for numeric/tel/email

### Micro-interactions

| Screen | Interaction | Spec |
|--------|------------|------|
| 1 | Category card select | Border scales in with `SPRING.bouncy`, emoji bounces, `haptics.select()` |
| 1 | Business name input focus | Subtle glow ring animation |
| 2 | Stepper +/- | Number scales `1→1.15→1` (100ms), `haptics.tap()` per press |
| 3 | Phone country select | Bottom sheet with country list |
| 4 | Password checklist | Each requirement fades to green with checkmark when met |
| 4 | "Crear mi salon" tap | Button shows loading spinner, transitions to Screen 5 |
| 5 | Progress bar | `SPRING.soft` width animation, checklist items stagger 200ms |
| 5 | Completion | Confetti burst, `haptics.success()`, text fade-up stagger |
| All | Step transition | Slide left/right with `SPRING.soft` direction-aware |
| All | Back button | Slide in reverse direction, data persisted |

### Validation

| Field | Rule | Error Display |
|-------|------|---------------|
| Business name | Required, 2+ chars | Inline below input, `text-xs text-destructive` |
| Category | Required (one selected) | Cards shake briefly if none selected on "Siguiente" |
| Team size | 1-20 | Stepper buttons disable at limits |
| First name | Required | Inline |
| Phone | Required, valid format | Inline |
| Email | Required, valid email, not already registered | Inline + toast for duplicate |
| Password | 8+ chars, letter + number | Real-time checklist (not error — progressive disclosure) |

### Error Handling

- **Network error during registration**: Toast "Sin conexion. Intenta de nuevo." + keep form data + re-enable button
- **Email already registered**: Toast "Este correo ya tiene cuenta. ¿Quieres iniciar sesion?" with link to `/login`
- **Rate limit**: Toast "Demasiados intentos. Espera un momento."
- **Server error**: Toast "Algo salio mal. Intenta de nuevo." + retry button

### Analytics Events

```
trackEvent('register_beauty_started', { source: 'skubik-landing' })
trackEvent('register_beauty_step', { step: 1, field: 'business_name' })
trackEvent('register_beauty_step', { step: 2, field: 'team_size', value: 3 })
trackEvent('register_beauty_completed', { category: 'barbershop-salon', teamSize: 3 })
trackEvent('register_beauty_abandoned', { lastStep: 3 })
```

### Technical Constraints

- Public route (no auth required)
- `fetchApi()` for API calls (uses base URL from env)
- `useAuth().loginWithTokens(response)` after successful registration
- React Router v7 (`useNavigate`, `useLocation`)
- Build: `npx vite build` — JSX only
- Test: 375px (iPhone SE) and 430px (iPhone 15 Pro Max)
- Form state persisted in React state (not localStorage) — if user refreshes, they restart (acceptable for 60-second flow)

### What NOT to Build

- Generic vertical registration — this is ONLY for beauty (barbershop-salon, beauty-salon, spa-wellness, nail-salon)
- Google OAuth during register (keep it simple — email/password only, Google is on login page)
- Organization selector (first-time user always has exactly 1 org)
- Email confirmation inline (handled by existing `/confirm-account` page)
- Desktop version (mobile-only — desktop users use the generic `/register`)

---

## Deliverables

1. `MobileRegisterBeauty.jsx` — 5-screen registration flow with animations, stepper, category cards, progress bar, anticipation/reveal/celebration
2. `App.jsx` — add route `/register/beauty`
3. `SkubikBeautyLanding.jsx` — add "Prueba gratis" CTA linking to `/register/beauty`
4. Analytics tracking for funnel measurement

The registration must feel like the salon is already being built. By the time the user hits "Crear mi salon," they should feel like they've already invested in SmartKubik — because they told it their salon's name, their team size, and their category. That's the IKEA effect: people assign 63% more value to things they helped create. The user isn't filling a form — they're building their salon.
