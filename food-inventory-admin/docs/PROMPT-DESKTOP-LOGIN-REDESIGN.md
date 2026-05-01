# Prompt: Desktop UX/UI 80% Redesign — Login Page

## Your Role

Apply the `/ux-design` skill. You are a product designer with 25 years of experience at Notion, Linear, Stripe, and Spotify — the last 10 years exclusively focused on **addictive entry experiences**. You specialize in login pages where every returning visit feels like coming home — recognized, anticipated, rewarded. You understand that login is NOT a security gate. It's the **first peak of the daily ritual**. The user opens their laptop, types your URL, and the entire emotional arc of their workday begins right here. If login feels generic, the rest of the session never recovers. If login feels like recognition + anticipation + tiny celebration, the user is hooked before they've even seen the dashboard.

You are grounded in the latest findings in: **Berridge's incentive salience theory** (dopamine fires on anticipation of reward, not the reward itself — login is anticipation, dashboard is reward), **the peak-end rule** (Kahneman — users judge an experience by its peak and its end; login IS the start, and the start is a peak), **endowment effect** (Thaler — users value what they've already invested in; login screen should subtly remind them of their investment), **hyperbolic discounting** (Laibson — users prefer immediate rewards over future ones; login should give immediate micro-rewards before they even hit "Entrar"), **the welcome-back effect** (Norton — being recognized increases loyalty by 38%), and **variable ratio reinforcement** (Skinner — unpredictable micro-rewards on each visit create the strongest habits).

Your UX philosophy: a login page is a **threshold ritual**. Like a coffee shop owner who looks up and smiles when their regular walks in. Like Spotify's Wrapped that anticipates a year of music memories. The business owner opens SmartKubik 5-15 times a day. **Login should be the moment they FEEL their business is alive and waiting for them.** Every keystroke is anticipation. Every "Entrar" tap is the moment dopamine fires.

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode (#0a0e1a). Desktop only (≥1024px). Motion tokens in `src/lib/motion.js`. Both light and dark mode supported.

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

The login page handles authentication for the entire app (multi-tenant + super admin + standard auth + Google OAuth). It must continue working with: `useAuth().login()`, multi-tenant detection, organization selector redirect, super admin redirect, error states, and Google OAuth flow.

---

## Current State

**File:** `src/pages/LoginV2.jsx` (247 lines)

**What exists:**
- 2-column layout: hero left (50%) + login card right (50%)
- Animated `<Boxes />` background (CSS grid animation)
- Hero text: "Todo tu negocio, un solo lugar" + generic subtitle for ALL verticals
- Hero buttons: "Registrar ahora" + "Habla con ventas" (opens SalesContactModal)
- Login card: Email + Password + optional Tenant Code + Google OAuth + "¿Olvidaste tu contraseña?" + "Regístrate"
- Google OAuth URL hardcoded to `http://localhost:3000` (broken in production)
- ZERO Framer Motion
- No personalization, no greeting, no anticipation
- After login: redirects to `/super-admin` (super admins) or `/organizations` (multi-tenant)

### 14 Problems (Ranked by Addiction Impact)

| # | Problem | Layer |
|---|---------|-------|
| 1 | **No "welcome back" recognition** — returning user (most users) sees the same generic hero every time. No "Hola de nuevo, Juan" greeting. No memory of who they are. The most powerful retention trigger (recognition) is unused. | STRUCTURE |
| 2 | **Hero takes 50% of screen for marketing** — but this is the LOGIN page. Users who reach `/login` are mostly returning customers who don't need a sales pitch. The marketing real estate is wasted on people who already bought. | STRUCTURE |
| 3 | **No anticipation building** — login button says "Ingresar." Boring. Should hint at what's waiting on the other side: "Ver mi día →" or "Ir a mi salón →". | STRUCTURE |
| 4 | **Generic hero copy** — "Todo tu negocio, un solo lugar" is the same for a barber and a restaurant owner. No vertical personalization. | STRUCTURE |
| 5 | **ZERO Framer Motion** — every interaction is static. No micro-animations on focus, no transition on submit, no welcome-back greeting reveal. | INTERACTION |
| 6 | **Boxes background is visual noise** — animated CSS grid that doesn't serve the user. Distracting. Heavy on GPU. Makes the page feel busy when it should feel calm. | INTERACTION |
| 7 | **No social proof** — login page doesn't show "10,000 negocios confían en SmartKubik" or testimonials. Returning users don't need it, but undecided users (who reach login by mistake) might convert. | STRUCTURE |
| 8 | **Tenant code field is buried logic** — shows only when `!isMultiTenantEnabled`. The user has no idea why or when this field appears. | INTERACTION |
| 9 | **Google OAuth hardcoded to localhost** — breaks in production. Must use environment variable. | TECHNICAL |
| 10 | **No "remember me" or persistent session indication** — user has no control over session duration. No "Mantenerme conectado" toggle. | INTERACTION |
| 11 | **Login button feedback is just a spinner** — "Ingresando..." text + loading. No celebration on success. The peak moment of "you're in!" is invisible. | CELEBRATION |
| 12 | **Errors are red text below form** — generic. No animation, no helpful action, no "olvidaste tu contraseña?" suggestion when password is wrong. | INTERACTION |
| 13 | **No daily greeting based on time** — "Buenos días, Juan" if morning, "Buenas tardes" if afternoon. Feels personal. Costs nothing. Currently absent. | STRUCTURE |
| 14 | **No "what's waiting for you" preview** — Stripe Dashboard shows "3 new payments" on login. SmartKubik could show "Tienes 8 citas hoy" before the user even logs in (if they have a session cookie hint). Builds anticipation. | CELEBRATION |

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE — "You're Recognized" (40%)

#### 1.1 Returning User vs First-Time User (Two Modes)

The login page should detect if the user has logged in before (via `localStorage.smartkubik_last_user` cookie/key) and show DIFFERENT layouts:

**RETURNING USER MODE (most common):**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│         [Logo]                                               │
│                                                              │
│         Buenos días, Juan 👋                                 │
│         Tu salón te está esperando                           │
│                                                              │
│         ┌────────────────────────────────────────┐          │
│         │ Correo                                 │          │
│         │ [juan@elpulpo.com               👤]    │ ← Pre-filled, faded │
│         └────────────────────────────────────────┘          │
│         ┌────────────────────────────────────────┐          │
│         │ Contraseña                          👁  │          │
│         │ [••••••••                            ]  │          │
│         └────────────────────────────────────────┘          │
│                                                              │
│         [ ─────── Entrar a Barbería El Pulpo ─────── ]      │
│                                                              │
│         ¿Olvidaste tu contraseña?                            │
│         [ G  Continuar con Google ]                          │
│                                                              │
│         ───── ¿No es tu cuenta? Cambiar ─────               │
│                                                              │
│ [Footer with subtle tenant brand from last session]          │
└──────────────────────────────────────────────────────────────┘
```

- Email pre-filled (faded gray), faster than re-typing
- Greeting by first name (from last session)
- Tenant name in CTA: "Entrar a Barbería El Pulpo" (not generic "Ingresar")
- Time-based greeting: Buenos días/tardes/noches
- Subtle "this isn't me" link to clear and start over
- Centered single-column layout — no marketing pitch needed

**FIRST-TIME USER MODE (visitors who haven't logged in before):**

```
┌──────────────────────────────────────────────────────────────┐
│ HERO LEFT (40%)                  │ LOGIN RIGHT (60%)        │
│                                  │                          │
│ [Logo]                           │ Inicia sesión             │
│                                  │                          │
│ Tu salón, abierto siempre.       │ Correo                    │
│ Aunque tú estés dormida.         │ [                    ]    │
│                                  │                          │
│ 1,200+ negocios en LATAM         │ Contraseña                │
│ confían en SmartKubik            │ [                    ]    │
│                                  │                          │
│ ⭐⭐⭐⭐⭐ 4.9/5                    │ [ Ingresar → ]           │
│                                  │                          │
│ [Crear cuenta gratis]            │ ─── o ───                 │
│                                  │ [G Google]                │
│                                  │                          │
│                                  │ ¿No tienes cuenta?        │
│                                  │ Crear cuenta gratis →    │
└──────────────────────────────────────────────────────────────┘
```

- 2-column layout retained for first-time users (they NEED context)
- Hero is reduced to 40% (not 50%) — login form is the primary action
- Hero copy is vertical-aware: barbers see beauty messaging, restaurants see food messaging
- Social proof: rating + count of businesses
- Single primary CTA in hero ("Crear cuenta gratis") — not 2 buttons competing

#### 1.2 Anticipation Building in CTA

The login button copy should hint at WHAT'S WAITING:

| Time | CTA copy |
|------|---------|
| Morning (5am-11am) | "Empezar el día →" |
| Day (11am-5pm) | "Ver mi salón →" or "Ir a mi día →" |
| Evening (5pm-10pm) | "Cerrar el día →" |
| Night (10pm-5am) | "Revisar el día →" |

If the user has unread WhatsApp messages or pending appointments (cached from last session), button could say:
- "Ir a mi día (3 mensajes nuevos)"
- "Ver mis 8 citas de hoy →"

This is the **welcome-back effect + variable reward**. Each login could reveal a tiny piece of news.

#### 1.3 Background: Subtle, Not Animated

Replace `<Boxes />` (animated CSS grid) with a **static, subtle gradient mesh** or solid dark color. Reasons:
- Login should feel CALM, not busy
- Animations should be on the FORM elements (anticipation), not the background
- Saves GPU on slow machines
- Makes the form pop visually

```jsx
// BEFORE:
<div className="absolute inset-0">
  <Boxes />
</div>

// AFTER:
<div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
```

#### 1.4 Smart Field Behavior

- **Email field**: Auto-focus on mount (keyboard appears immediately)
- **Pre-fill from last session**: If `localStorage.smartkubik_last_email` exists, pre-fill (greyed out as placeholder, user can override)
- **Password field**: Focus moves here on Tab or after Email is valid
- **Caps Lock detection**: Show subtle "Mayúsculas activadas" warning when Caps Lock is on
- **Show/hide password**: Eye icon (already exists in pattern, ensure it works)

#### 1.5 Footer Trust Signals

Below the form, subtle but visible:

```
┌──────────────────────────────────────────┐
│ 🛡️ Cumplimiento SENIAT                  │
│ 🔒 Encriptación SSL                      │
│ 💬 Soporte WhatsApp 24/7                 │
└──────────────────────────────────────────┘
```

- Reduces anxiety for new users
- Reassures returning users that everything is intact
- Small icons + text, doesn't compete with form

---

### LAYER 2: INTERACTION — "Every Keystroke is Anticipation" (35%)

#### 2.1 Page Mount Animation

When the login page loads:

```jsx
// Logo: scaleIn from 0.9 to 1
<motion.img
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: DUR.base, ease: EASE.out }}
/>

// Greeting: fadeUp with 100ms delay after logo
<motion.h1
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: DUR.base, ease: EASE.out, delay: 0.1 }}
>

// Form fields: stagger children (Email, Password, Button)
<motion.form
  initial="initial"
  animate="animate"
  variants={STAGGER(0.06, 0.2)}
>
  <motion.div variants={fadeUp}>...email...</motion.div>
  <motion.div variants={fadeUp}>...password...</motion.div>
  <motion.button variants={fadeUp}>Entrar</motion.button>
</motion.form>
```

- 700ms total entrance choreography
- Builds anticipation: logo → greeting → form revealed sequentially
- Feels like the page is "waking up" to greet you

#### 2.2 Field Focus Animation

When user clicks email/password:

```jsx
<motion.div
  animate={{
    borderColor: focused ? 'var(--primary)' : 'var(--border)',
    boxShadow: focused ? '0 0 0 3px var(--primary-glow)' : 'none',
  }}
  transition={{ duration: 0.15 }}
>
```

- Border color transitions from muted to primary
- Subtle glow ring appears on focus
- 150ms — fast, responsive, no lag

#### 2.3 Login Button States

```
DEFAULT:   [ ─ Entrar a Barbería El Pulpo ─ ]
HOVER:     [ ─ Entrar a Barbería El Pulpo → ─ ]   (arrow appears, slight elevation)
TAP:       [ Entrar... ]                         (whileTap scale 0.98)
LOADING:   [ ⟳ Entrando... ]                      (spinner)
SUCCESS:   [ ✓ ¡Listo! ]                         (green flash, 200ms)
ERROR:     [ Entrar ]                            (shake animation on error)
```

- Hover: arrow slides in from right (`x: 0 → 4`), elevation increases
- Loading: spinner replaces text smoothly with crossfade
- Success: green flash (`bg-emerald-500` for 200ms) then fade-out as page transitions
- Error: shake animation (`x: [0, -8, 8, -4, 4, 0]` over 400ms)

#### 2.4 Smart Error Handling

Replace generic "Credenciales incorrectas" with helpful errors:

| Error | Message | Action |
|-------|---------|--------|
| Wrong password | "Esa contraseña no es correcta" | Show "¿La olvidaste?" link inline |
| Email not found | "No encontramos esa cuenta" | Show "Crear cuenta nueva" link |
| Account not confirmed | "Tu cuenta no está confirmada aún" | Show "Reenviar código" button |
| Account suspended | "Tu cuenta está suspendida" | Show WhatsApp support link |
| Network error | "Sin conexión a internet" | Show "Reintentar" button |
| Rate limited | "Demasiados intentos. Espera 30 segundos." | Disable button with countdown |

Errors animate in with fadeUp from below the password field. They DISMISS as soon as the user starts typing again (no manual close).

#### 2.5 "Pick Up Where You Left Off" Hint

If `localStorage` has a `lastVisitedRoute`, show a subtle message:

```
┌──────────────────────────────────────────┐
│ Última visita: Agenda de hoy             │
│ [Continuar →]                             │
└──────────────────────────────────────────┘
```

After login, redirect directly to that route instead of `/dashboard`. Builds anticipation: "I know exactly where you were."

#### 2.6 Subtle Sound (Optional)

For users who enable it (via system sound preferences, not a toggle in our app):
- A barely-audible "tick" on successful login (like Apple's keyboard click)
- Nothing on error (silence is the cue)

This is OPTIONAL and gated behind `prefers-reduced-motion: no-preference`.

---

### LAYER 3: CELEBRATION — "You're In" (25%)

#### 3.1 Login Success Transition

After successful login, BEFORE redirecting:

```jsx
// 300ms total ceremony
1. Button morphs from "Entrar..." to "✓"  (50ms)
2. Green flash sweeps across the form     (150ms)
3. Form scales up slightly (1 → 1.02)     (200ms)
4. Page fades out as next page fades in   (300ms)
```

- The user FEELS the "you're in" moment, not just sees it
- Smooth transition to dashboard/organizations
- No jarring page reload

#### 3.2 Streak Recognition (For Returning Users)

If the user has logged in for 7+ consecutive days, show a subtle streak indicator:

```
🔥 12 días consecutivos
```

- Below the greeting, small text
- Pulses gently
- Builds **variable ratio reinforcement** — they don't know what milestone unlocks next streak (10? 30? 100?)
- This is the **intelligence trap** for the user — leaving means breaking the streak

#### 3.3 Welcome Back Stats Preview

Above the form, for returning users with a recent session:

```
Última vez:
🕐 Ayer a las 6:30pm
💰 $450 en ventas el día anterior
✂️ 12 servicios completados
```

- Pulled from cached session data
- Tiny text, subtle — doesn't compete with login form
- Creates a sense of continuity: "Yes, your business is here, right where you left it"
- Reinforces the **endowment effect** — they've already invested

#### 3.4 First-Time User Welcome

If a user logs in for the FIRST time (after registration):

```
🎉 ¡Bienvenido a SmartKubik, Juan!
Tu prueba de 14 días empieza ahora.
```

- Brief overlay (1.5s) before showing dashboard
- Sets expectations: trial period, who they are, what comes next

---

## Micro-interactions Table

| Element | Trigger | Animation | Spec |
|---------|---------|-----------|------|
| Logo | Page mount | scaleIn 0.9→1 | `DUR.base` |
| Greeting | Page mount | fadeUp 100ms delay | `DUR.base` |
| Form fields | Page mount | Stagger fadeUp | `STAGGER(0.06)`, 200ms delay |
| Email focus | Click | Border + glow | 150ms |
| Password show/hide | Click eye | Icon morph | 100ms |
| Caps Lock | Detected | Warning fadeUp below | `DUR.fast` |
| Pre-filled email | Mount | Fade-in placeholder | 200ms after greeting |
| Login button hover | Mouse over | Arrow slide + elevation | 150ms |
| Login button tap | Click | Scale 0.98 | `whileTap` |
| Login loading | Submit | Spinner crossfade | 200ms |
| Login success | API success | Green flash + scale | 300ms |
| Login error | API error | Shake | 400ms |
| Error message | Display | fadeUp from password field | `DUR.fast` |
| Error dismiss | Type any key | Fade-out | 200ms |
| "Last visit" | Mount | fadeUp with delay | `DUR.base`, 400ms delay |
| Streak indicator | Mount | Pulse | 2s infinite, subtle |
| Welcome back stats | Mount | Stagger fadeUp | `STAGGER(0.05)`, 500ms delay |
| Page transition out | Login success | Fade + slight scale | 300ms |
| Tenant CTA in button | Mount | Text replaces "Ingresar" | Crossfade 100ms |

---

## Implementation Order

```
LAYER 1 — STRUCTURE (do first):
  1. Detect returning vs first-time user (localStorage)
  2. Build returning user single-column layout
  3. Update first-time user 2-column layout (hero 40%, form 60%)
  4. Add time-based greeting + tenant name in CTA
  5. Replace Boxes background with subtle gradient
  6. Pre-fill email from last session
  7. Add Caps Lock detection
  8. Footer trust signals
  9. Fix Google OAuth URL (env variable)

LAYER 2 — INTERACTION:
  10. Page mount stagger animation (logo → greeting → form)
  11. Field focus glow animation
  12. Login button hover + tap states
  13. Smart error messages with action links
  14. Error shake animation + auto-dismiss
  15. "Last visited" hint for returning users
  16. Loading state crossfade

LAYER 3 — CELEBRATION:
  17. Login success ceremony (green flash + transition)
  18. Streak recognition for returning users (7+ days)
  19. Welcome back stats preview (last session)
  20. First-time user welcome overlay
```

**After EACH item:** `npx vite build` and verify in browser.

---

## Verification Criteria

| Criterion | Metric |
|-----------|--------|
| Returning user feels recognized | Greeting by first name + tenant name in CTA |
| First-time user understands value | Hero with social proof + clear "Crear cuenta" |
| Login feels fast | Auto-focus email, pre-filled if returning, no unnecessary fields |
| Errors are helpful | Specific message + action link (not generic "credenciales incorrectas") |
| Page feels alive | Stagger animation on mount, focus glows, hover states |
| Success is celebrated | Green flash + smooth transition (300ms) |
| Streak builds habit | Streak indicator shown after 7 days |
| Continuity preserved | "Last visited" hint + redirect to last route |
| Background is calm | No animated boxes, subtle gradient only |
| Build passes | Zero errors |

---

## Technical Constraints

- Use `useAuth().login()` for authentication (no changes to auth flow)
- Multi-tenant routing logic stays the same (organizations, super-admin)
- Google OAuth URL: use `import.meta.env.VITE_API_URL` instead of hardcoded localhost
- localStorage keys: `smartkubik_last_user` (name + email), `smartkubik_last_route`, `smartkubik_login_streak`
- Cache stats from last session (TTL 24h) for "Welcome back stats"
- Build: `npx vite build`
- Test: 1280px, 1440px, 1920px viewports
- Light AND dark mode supported
- Keep `SalesContactModal` accessible (footer link or first-time mode)

### What NOT to Change

- `useAuth` hook
- Auth API endpoints
- Multi-tenant detection logic
- Organization selector flow
- Super admin redirect
- Forgot password flow (separate page)
- Register page (separate page)

---

## Deliverables

1. `LoginV2.jsx` — refactored to detect returning vs first-time user
2. `LoginReturning.jsx` (NEW or inline) — single-column personalized layout for returning users
3. `LoginFirstTime.jsx` (NEW or inline) — 2-column layout with hero + form for new visitors
4. `LoginGreeting.jsx` (NEW) — time-based greeting + tenant name component
5. `LoginButton.jsx` (NEW or refactored) — multi-state button with hover, loading, success, error animations
6. `LoginError.jsx` (NEW) — smart error messages with action links
7. `WelcomeBackStats.jsx` (NEW) — cached stats preview
8. `StreakIndicator.jsx` (NEW) — daily login streak counter
9. localStorage utilities for caching last user, last route, streak
10. Build passing, all auth flows verified working
11. Both light and dark mode tested
12. ALL existing functionality verified working

The login page is the daily threshold of SmartKubik. Every business owner crosses it 5-15 times a day. If it feels like a security checkpoint, the entire app feels like work. If it feels like coming home — recognized, anticipated, celebrated — the entire app becomes a place the user WANTS to be. Make every login a tiny dopamine hit. Make every greeting feel like a friend remembering your name. Make every "Entrar" press the moment the day truly begins.
