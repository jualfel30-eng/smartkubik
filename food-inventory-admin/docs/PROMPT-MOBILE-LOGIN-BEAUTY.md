# Prompt: Mobile-First Login — SmartKubik Beauty Vertical

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 25 years of experience at Linear, Notion, Stripe, and Spotify. You specialize in authentication flows that feel instant, secure, and frictionless — the user should go from "I want to check my salon" to "I'm looking at my dashboard" in under 8 seconds. You understand that login is not a security gate — it's a welcome back moment. The returning user is your MOST VALUABLE user. Every second of friction on login is a second they might decide to just check WhatsApp instead. The login page is the most visited page in any SaaS — and the least designed.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a). Mobile-first PWA. Target: Venezuela and LATAM.

---

## Context: Why This Matters for Beauty

A barbershop owner opens SmartKubik 5-15 times per day — to check appointments, charge clients, see who's next. If login takes more than 5 seconds, they stop opening the app. The PWA stays installed on their home screen but becomes a ghost icon.

The current login page is a desktop-first 2-column layout with a hero section, background animation (Boxes), a Card component, Google OAuth pointing to localhost, and a "Habla con ventas" button. On a 375px phone screen, this is unusable — the hero takes half the screen, the form is tiny, and the experience says "this was built for a laptop."

---

## Current State

### What exists
- `LoginV2.jsx` at `src/pages/LoginV2.jsx` — desktop-first login page:
  - 2-column layout: hero (left) + login card (right)
  - Background: `<Boxes />` component (animated CSS grid)
  - Hero: "Todo tu negocio, un solo lugar" + "Registrar ahora" + "Habla con ventas" buttons
  - Login card: Email + Password + optional Tenant Code + Google OAuth button
  - Google OAuth URL hardcoded to `http://localhost:3000` (broken in production)
  - Forgot password link → `/forgot-password`
  - Register link → `/register`
  - Uses desktop Card/CardContent/Label components (not mobile-optimized)
  - Error display: inline `text-red-500` paragraph
  - No haptics, no animations, no mobile considerations

### Auth flow
```
/login → POST /api/v1/auth/login { email, password, tenantCode? }
  → Response: { user, tenant, memberships, accessToken, refreshToken }
    → If super_admin → /super-admin
    → If multi-tenant with memberships → /organizations
    → If single org → /dashboard (via organization auto-select)
```

### Related pages
- `ForgotPassword.jsx` at `src/pages/ForgotPassword.jsx` — email input → sends reset link
- `ResetPassword.jsx` at `src/pages/ResetPassword.jsx` — new password form with token from URL
- `ConfirmAccount.jsx` at `src/pages/ConfirmAccount.jsx` — 6-digit code verification

### Auth hook
```javascript
const { login, isMultiTenantEnabled, logout } = useAuth();
// login(email, password, tenantCode?) → returns { user, tenant, memberships, accessToken, refreshToken }
// loginWithTokens(data) → stores tokens + user + tenant + memberships
```

### Design system
- All tokens from `/ux-design` skill apply
- Motion: `SPRING.drawer`, `SPRING.snappy`, `SPRING.soft`, `SPRING.bouncy`
- Haptics: `haptics.tap()`, `haptics.select()`, `haptics.success()`
- Dark mode: `#0a0e1a` background

---

## Requirements

### Architecture
1. New `MobileLoginBeauty.jsx` at `src/pages/MobileLoginBeauty.jsx`
2. Update the existing `/login` route to detect mobile and render the mobile version (LoginRouteGate pattern), OR create `/login/beauty` and link from `/skubik`
3. The login experience must be completable in under 8 seconds (email + password + tap login)
4. Must handle: standard login, multi-tenant organization selection, Google OAuth, forgot password, link to register

### Guiding Principles (from /ux-design skill)

1. **The login IS the welcome back** — the returning user should feel recognized, not interrogated
2. **Speed over ceremony** — unlike registration (where ceremony builds investment), login rewards SPEED. Zero unnecessary screens.
3. **One screen, zero scrolling** — everything fits in one viewport on 375px: logo, email, password, login button, forgot password, register link
4. **Continuity with the app** — the login page should feel like the first screen of SmartKubik, not a corporate gatekeeper. Same dark theme, same brand, same motion language.
5. **Error states that help** — "Credenciales incorrectas" is useless. "El correo no esta registrado — ¿quieres crear una cuenta?" is helpful.

---

### The Screen: Single-View Login

```
+------------------------------------------+
|                                          |
|         [SmartKubik Logo]                |
|         💇 Belleza                       |
|                                          |
|  Bienvenido de vuelta                    |
|                                          |
|  Correo electrónico                      |
|  [ tu@email.com                 ]        |
|                                          |
|  Contraseña                              |
|  [ ••••••••                  👁 ]        |
|                                          |
|  ¿Olvidaste tu contraseña?               |
|                                          |
|  [ ====== Entrar ====== ]                |
|                                          |
|  ──────── o ────────                     |
|                                          |
|  [ G  Continuar con Google ]             |
|                                          |
|  ¿No tienes cuenta?                      |
|  Prueba gratis 14 días →                 |
|                                          |
+------------------------------------------+
```

### Component Breakdown

**Header (top section):**
- SmartKubik logo (dark version: `logo-smartkubik.png`), centered, `h-8`
- Vertical badge: "💇 Belleza" in small muted text below logo
- Spacing: `pt-12 pb-6` (enough room for status bar + breathing room, no wasted space)

**Welcome text:**
- "Bienvenido de vuelta" — `text-xl font-bold text-foreground`
- Simple, warm, not "Iniciar Sesion" (that's a system label, not a human greeting)

**Email input:**
- Label: "Correo electronico" in `text-xs font-medium text-muted-foreground mb-1.5`
- Input: `min-h-[48px] bg-muted rounded-xl px-4 py-3 text-base`
- `inputMode="email"`, `autoComplete="email"`, `autoCapitalize="none"`
- Auto-focused on mount (keyboard appears immediately — user wants to type, not read)

**Password input:**
- Label: "Contrasena" with visibility toggle (eye icon)
- Input: `min-h-[48px] bg-muted rounded-xl px-4 py-3 text-base`
- `autoComplete="current-password"`
- Visibility toggle: tap eye icon to show/hide, `haptics.tap()` on toggle

**Forgot password:**
- `text-xs text-primary font-medium` link, right-aligned below password
- Navigates to `/forgot-password`
- Not a button — just a subtle text link (doesn't compete with login CTA)

**Login button:**
- Full-width, `bg-primary text-primary-foreground py-4 text-base font-semibold rounded-xl`
- `whileTap={{ scale: 0.97 }}`
- Loading state: spinner + "Entrando..." text
- Success state: brief green flash + `haptics.success()` before redirect
- Disabled when email or password empty

**Divider:**
- `"──── o ────"` separator with `text-xs text-muted-foreground uppercase`

**Google OAuth:**
- Full-width outline button: `border border-border bg-card rounded-xl py-3.5`
- Google logo (16px) + "Continuar con Google" text
- Fix the URL: use `${API_BASE_URL}/api/v1/auth/google` instead of hardcoded localhost
- `whileTap={{ scale: 0.97 }}`

**Register link:**
- Bottom section: "¿No tienes cuenta?" in `text-sm text-muted-foreground`
- "Prueba gratis 14 dias →" as `text-sm text-primary font-semibold` link
- Links to `/register/beauty` (the new beauty-specific registration)

### Error Handling (Smart, Not Generic)

Instead of showing "Credenciales incorrectas" for everything:

| Error | Message | Action |
|-------|---------|--------|
| Wrong password | "Contrasena incorrecta" | Show "¿La olvidaste?" link inline |
| Email not found | "No encontramos una cuenta con ese correo" | Show "¿Quieres crear una?" link inline → `/register/beauty` |
| Account not confirmed | "Tu cuenta aun no esta confirmada" | Show "Reenviar codigo" button → `/confirm-account` |
| Account suspended | "Tu cuenta esta suspendida. Contacta soporte." | Show WhatsApp support link |
| Network error | "Sin conexion a internet" | Show retry button |
| Rate limited | "Demasiados intentos. Espera 30 segundos." | Disable button with countdown timer |
| Server error | "Algo salio mal. Intenta de nuevo." | Retry button |

Error display: animated slide-in below the password field, `bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive`, with icon. Dismisses on next input change.

### Multi-Tenant Handling

If `isMultiTenantEnabled` is true, the login response may include multiple memberships:

- **1 active membership**: auto-select and redirect to `/dashboard` (zero extra screens)
- **2+ active memberships**: redirect to `/organizations` (existing organization selector)
- **0 active memberships**: show error "No tienes organizaciones activas"
- **super_admin**: redirect to `/super-admin`

The tenant code field (currently shown when `!isMultiTenantEnabled`) should be hidden by default and only shown via a "Ingresar con codigo de negocio" expandable link at the very bottom (advanced use case, not primary flow).

### Biometric / Saved Credentials

On mobile, the browser's credential manager will offer to auto-fill email + password. The login form must support this seamlessly:
- `autoComplete="email"` on email field
- `autoComplete="current-password"` on password field
- The form submits correctly when browser auto-fills both fields
- If the PWA is installed, Face ID / fingerprint auto-fill works natively via the browser

### Responsive Behavior

| Viewport | Behavior |
|----------|----------|
| < 768px (mobile) | Single-column, full-screen, inputs take full width, no hero/side panel |
| >= 768px (desktop) | Either redirect to existing LoginV2, or show a centered card (max-w-sm) with the same mobile layout |

For simplicity: use a `LoginRouteGate` that shows `MobileLoginBeauty` on mobile and `LoginV2` on desktop. Same pattern as all other route gates.

### Mobile UX Patterns (MANDATORY)

- **Single viewport**: Entire login fits in one screen without scrolling on 375px (667px viewport height)
- **Auto-focus email**: Keyboard appears immediately on mount
- **Input heights**: 48px minimum touch targets
- **Password visibility**: Eye icon toggle with `haptics.tap()`
- **Loading state**: Button shows spinner, inputs become readonly
- **Success transition**: Brief green flash on button → `haptics.success()` → fade-out → redirect (300ms total, fast but not jarring)
- **Keyboard handling**: When keyboard is open, the form should remain visible (inputs not pushed off screen). Use `visual-viewport` awareness or just ensure the form starts high enough on screen.

### Micro-interactions

| Element | Interaction | Spec |
|---------|------------|------|
| Logo | Mount animation | Fade-in + slight scale (`0.95→1`, `DUR.base`) |
| Email input | Auto-focus | Keyboard appears, subtle glow ring |
| Password toggle | Eye icon tap | Icon morphs `Eye → EyeOff`, `haptics.tap()` |
| Login button | Tap | `whileTap={{ scale: 0.97 }}`, loading spinner appears |
| Login success | Brief celebration | Button bg flashes green (200ms), `haptics.success()`, screen fades out |
| Error | Slide-in | Error banner slides down from password field, `DUR.base`, `EASE.out` |
| Error dismiss | Auto | Fades out when user starts typing again |
| Google OAuth | Tap | `whileTap={{ scale: 0.97 }}`, redirect to OAuth URL |
| Register link | Tap | `haptics.tap()`, navigate to `/register/beauty` |

### Visual Design

```
Background: #0a0e1a (solid, NO Boxes animation on mobile — saves battery + performance)
Logo: centered, white version
Welcome text: text-foreground, bold
Inputs: bg-muted, rounded-xl, no borders (clean, minimal)
Button: bg-primary, full-width, rounded-xl
Divider: border-border, muted text
Google button: bg-card, border-border, outline style
Links: text-primary, font-medium
Error: bg-destructive/10, text-destructive
```

No background animations on mobile. Solid dark background is cleaner, faster, and more professional. The Boxes component is a desktop flex — on mobile it's wasted GPU.

### Technical Constraints

- Public route (no auth required)
- `useAuth().login(email, password, tenantCode?)` for authentication
- Google OAuth: `window.location.href = '${API_BASE_URL}/api/v1/auth/google'` (fix the localhost hardcode)
- React Router v7 (`useNavigate`, `Link`)
- Build: `npx vite build` — JSX only
- Test: 375px (iPhone SE) and 430px (iPhone 15 Pro Max)
- PWA: must work when launched from home screen (standalone mode)
- Credential manager: `autoComplete` attributes on all fields for browser auto-fill / biometric

### What NOT to Build

- Multi-step login (email first, then password on separate screen) — too slow for a salon owner checking their app between clients
- Magic link / passwordless login — nice to have but not for v1
- SMS OTP login — future feature
- Remember me toggle — the browser/PWA handles session persistence via refresh tokens
- Dark/light theme toggle on login — the app is dark mode, period

---

## Deliverables

1. `MobileLoginBeauty.jsx` — single-screen mobile login with smart error handling, Google OAuth, and register link
2. `LoginRouteGate.jsx` — mobile/desktop gate (mobile → MobileLoginBeauty, desktop → LoginV2)
3. `App.jsx` — update `/login` route to use LoginRouteGate
4. Fix Google OAuth URL (replace localhost with env-based API URL)

The login page is the front door of SmartKubik. A barbershop owner opens it 10 times a day. It must say "welcome back" in under 3 seconds and get out of the way. No hero sections, no sales pitches, no background animations. Just: logo, email, password, enter. Fast, warm, done.
