# Prompt: Desktop UX/UI Audit + 80% Redesign — Storefront Settings Module

## Your Role

Apply the `/ux-design` skill. You are a product designer with 25 years of experience at Squarespace, Shopify Admin, Wix, and Webflow — the last 10 years exclusively focused on making non-technical business owners feel like designers through emotionally rewarding configuration experiences. You specialize in website builder admin panels where every setting change shows an INSTANT preview, every toggle has a visible before/after, and the entire configuration feels like decorating a room — not filling out a government form.

You are grounded in the latest findings in **behavioral neuroscience** (Berridge — dopamine fires on anticipation of a change, not on the change itself), **the endowed progress effect** (Nunes & Dreze — people given a head start are 2x more likely to complete a task), **operant conditioning through visual feedback** (seeing the result of your action immediately reinforces the behavior), **the peak-end rule** (Kahneman — users judge an experience by its peak moment and its end, not its average), and **the intelligence trap** (every image uploaded, every color chosen, every payment method configured is stored value that makes leaving painful).

Your UX philosophy: a storefront settings page is NOT a form — it's a **stage where the business owner watches their online presence come alive**. Every color change should reflect instantly in a live preview. Every image upload should feel like hanging a painting. Every "Guardar" should feel like pressing "Publish" at a newspaper — the thrill of going live.

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode (#0a0e1a). Desktop only (≥1024px). Motion tokens in `src/lib/motion.js`. **StorefrontSettings components are TypeScript (.tsx).**

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

The module is 3,738 lines across 13 TypeScript components + 1 JSX page with image uploads, payment method CRUD, gallery management, domain checking, WhatsApp integration, Google Business linking, and real-time order management. ALL must continue working.

---

## Current State

### Architecture
```
TWO ENTRY POINTS:

1. StorefrontSettings/index.tsx (217 lines — advanced config hub)
   ├── ThemeEditor.tsx (355 lines) — colors, logo, banner, video
   ├── SEOEditor.tsx (135 lines) — title, description, keywords
   ├── DomainSettings.tsx (221 lines) — domain, template type, activation
   ├── SocialMediaEditor.tsx (110 lines) — Facebook, Instagram, etc.
   ├── ContactInfoEditor.tsx (146 lines) — email, phone, address
   ├── WhatsAppIntegrationEditor.tsx (194 lines) — WhatsApp config
   ├── PaymentMethodsEditor.tsx (447 lines) — Zelle, PagoMovil, etc.
   ├── GalleryEditor.tsx (693 lines) — images, before/after, categories
   ├── GoogleBusinessEditor.tsx (165 lines) — Place ID, maps, reviews
   └── PreviewModal.tsx (55 lines) — iframe preview

2. RestaurantStorefrontPage.jsx (575 lines — restaurant config + orders)
   ├── ConfigTab — name, logo, WhatsApp, payments, accent color, toggle
   └── OrdersTab — real-time order management with status pipeline
```

### 16 Problems (Ranked by Impact)

| # | Problem | Layer |
|---|---------|-------|
| 1 | **No live preview as you configure** — user changes accent color from blue to red. Nothing visual changes. They have to click "Previsualizar" → open iframe modal → wait for load → see the change. The feedback loop is broken. | STRUCTURE |
| 2 | **Two disconnected entry points** — RestaurantStorefrontPage (simple, for restaurants) and StorefrontSettings (complex, 9 tabs). Beauty users see one or the other depending on routing. No unified experience. | STRUCTURE |
| 3 | **9 tabs is overwhelming** — Theme, SEO, Domain, Social, Contact, WhatsApp, Payments, Gallery, Google. A barbershop owner setting up their first storefront doesn't know where to start. No guided setup. | STRUCTURE |
| 4 | **No progress indicator** — user has no idea "how done" their storefront is. 3/9 sections completed? 70% ready? No visual feedback on completeness. | STRUCTURE |
| 5 | **No endowed progress** — when the user first arrives, everything is empty. They should arrive with SOME things pre-filled (name from registration, phone from profile, colors from theme). The progress bar should START at 30%, not 0%. | INTERACTION |
| 6 | **ZERO Framer Motion** — every tab switch is instant, every save is a toast, every upload has a spinner. No spring animations, no scale-in, no stagger. | INTERACTION |
| 7 | **Image uploads feel mechanical** — drop file → spinner → thumbnail appears. No scale-in animation, no "photo hanging on wall" feeling. No before/after slider feedback. | INTERACTION |
| 8 | **Color selection is primitive** — hex input + a few preset circles. No live preview of how the color looks on the actual storefront. Squarespace shows your color choice reflected on a mini-site instantly. | INTERACTION |
| 9 | **Payment methods are a data table** — adding Zelle, Pago Movil, Bank Transfer feels like filling tax forms. Should feel like adding payment options to your shop — visual, card-based, with icons. | STRUCTURE |
| 10 | **Gallery management is powerful but clinical** — 693 lines of functionality (before/after, categories, tagging, professional attribution) presented as a flat grid. No "curation" feeling. | INTERACTION |
| 11 | **Save is per-tab, not global** — user configures Theme, switches to SEO, forgets to save Theme first. No dirty-state indicator, no "unsaved changes" warning. | INTERACTION |
| 12 | **Domain setup is buried** — the most important setting (your unique URL) is in a tab alongside 8 others. Should be the FIRST thing you set up, with ceremony. | STRUCTURE |
| 13 | **Preview modal is an iframe** — opens localhost:3001 in a dialog. Slow to load, doesn't reflect unsaved changes, breaks if storefront app isn't running. | INTERACTION |
| 14 | **No "going live" celebration** — toggling `isActive` from off to on should be the biggest moment in the storefront setup. Currently: a switch flips and a toast says "Configuración guardada." | CELEBRATION |
| 15 | **No share prompt after activation** — user activates their storefront but isn't prompted to share it on WhatsApp/Instagram. The highest-intent moment for organic distribution is wasted. | CELEBRATION |
| 16 | **Orders tab (restaurant) has no animation** — order cards appear/disappear without stagger. Status transitions are instant badge swaps. No ceremony on order completion. | INTERACTION |

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE (40%)

#### 1.1 Unified Storefront Settings (Merge Both Entry Points)

Create a single `StorefrontHub` that adapts to the vertical:

```
┌──────────────────────────────────────────────────────────────────┐
│ Mi Sitio Web                                    [Previsualizar] │
│                                                                  │
│ ┌─ SETUP PROGRESS ──────────────────────────────────────────┐   │
│ │ ████████████████████████░░░░░░░░░░░░ 65% listo            │   │
│ │ ✓ Identidad  ✓ Contacto  ✓ Pagos  ○ Galería  ○ SEO      │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─ LIVE MINI-PREVIEW (30%) ─┐  ┌─ SETTINGS (70%) ──────────┐  │
│ │                            │  │                            │  │
│ │  [Mini storefront         │  │  IDENTIDAD                 │  │
│ │   renders here in         │  │  ┌────────────────────────┐│  │
│ │   real-time as user       │  │  │ Nombre: [El Pulpo    ] ││  │
│ │   changes settings]       │  │  │ Tagline: [Barbería... ]││  │
│ │                            │  │  │ Logo: [📷 Subir]      ││  │
│ │  Shows YOUR colors,       │  │  └────────────────────────┘│  │
│ │  YOUR logo, YOUR name     │  │                            │  │
│ │  updating LIVE             │  │  COLOR                     │  │
│ │                            │  │  [● ● ● ● ● ●] [#hex]   │  │
│ │                            │  │                            │  │
│ └────────────────────────────┘  │  CONTACTO Y WHATSAPP      │  │
│                                  │  [...]                     │  │
│                                  │                            │  │
│                                  │  [Guardar cambios]         │  │
│                                  └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Key changes:**
- **Persistent mini-preview** on the left (30% width) that updates in real-time as the user changes settings — NOT an iframe, but a STYLED COMPONENT that mimics the storefront layout using the same colors/logo/name
- **Settings panel** on the right (70% width) with scrollable sections — NOT tabs. All settings in a single scrollable page with section anchors
- **Progress bar** at the top showing completion percentage with checklist of sections
- **Endowed progress**: pre-fill name from tenant, phone from user profile, colors from theme → progress starts at 30-40%, not 0%

#### 1.2 Replace 9 Tabs with Scrollable Sections

Instead of 9 tab clicks to see everything, use a single scrollable page with section headers:

```
SECTIONS (scroll order, priority-based):

1. IDENTIDAD (Name, Tagline, Logo)          — Required, high impact
2. DISEÑO (Colors, Banner, Video)            — Required, visual impact
3. CONTACTO (Phone, Email, WhatsApp, Address)— Required, functional
4. MÉTODOS DE PAGO (Zelle, PagoMovil, etc.) — Required, functional
5. GALERÍA (Images, Before/After)            — Optional, high impact for beauty
6. REDES SOCIALES (Instagram, Facebook, etc.)— Optional
7. SEO (Title, Description, Keywords)        — Optional, advanced
8. GOOGLE BUSINESS (Place ID, Maps)          — Optional, advanced
9. DOMINIO Y ACTIVACIÓN (Domain, Toggle)     — Last, because it's the "publish" moment
```

**Navigation:** Sticky sidebar anchor links (like Notion settings) that scroll to each section. Active section highlighted based on scroll position.

**Why scrollable, not tabs:** Squarespace, Notion, and Linear all use scrollable settings pages. Tabs hide information. Scrollable pages let the user scan everything at once and complete sections in any order.

#### 1.3 Progress Bar with Endowed Progress

```
┌──────────────────────────────────────────────────────────────┐
│ Tu sitio web está 65% listo                                  │
│ ████████████████████████░░░░░░░░░░░░                        │
│ ✓ Identidad  ✓ Contacto  ✓ Pagos  ○ Galería  ○ SEO         │
└──────────────────────────────────────────────────────────────┘
```

- Each section completed = checkmark + progress increment
- "Completed" = all required fields filled
- Progress starts at ~35% if tenant name + phone pre-filled (endowed progress effect: 2x completion rate)
- AnimatedNumber on the percentage
- Progress bar fills with `SPRING.soft`
- At 100%: "Tu sitio está listo para publicar" with green badge

#### 1.4 Activation as "Going Live" Ceremony

The domain + activation toggle is the LAST section, positioned as a climactic moment:

```
┌──────────────────────────────────────────────────────────────┐
│ 🚀 PUBLICAR TU SITIO WEB                                    │
│                                                              │
│ Tu dirección: elpulpo.smartkubik.com                         │
│ [📋 Copiar]  [Cambiar dominio]                               │
│                                                              │
│ Estado: [  ○ OFF  ●──── ON  ]   ← Large, prominent toggle  │
│                                                              │
│ Tu sitio es visible para todos cuando está activado.         │
└──────────────────────────────────────────────────────────────┘
```

When toggled ON (the moment they go live):

**Three-stage reward sequence:**

1. **ANTICIPATION** (500ms): Toggle animates. "Publicando tu sitio..." text appears with progress dots.

2. **REVEAL** (800ms): 
   ```
   🎉 ¡Tu sitio web está en vivo!
   
   elpulpo.smartkubik.com
   
   Cualquier persona con este enlace puede
   ver tus servicios y reservar una cita.
   ```
   Confetti burst. The mini-preview on the left gets a "LIVE" badge with green pulse.

3. **CELEBRATION + SHARE** (persistent until dismissed):
   ```
   Comparte tu nuevo sitio:
   
   [📲 Compartir por WhatsApp]
   [📋 Copiar enlace]
   [📸 Compartir en Instagram]
   [📧 Enviar por email]
   ```
   Pre-filled messages for each channel. WhatsApp: "¡Ya puedes reservar tu cita conmigo! {url}". This is the highest-intent organic distribution moment.

#### 1.5 Payment Methods as Visual Cards (Not Data Table)

Replace the tabular payment method interface with visual cards:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 💲 Zelle    │  │ 📱 PagoMóvil│  │ 🏦 Transf.  │
│ activo ✓    │  │ activo ✓    │  │ inactivo     │
│ email@...   │  │ 0414-...    │  │ [Configurar] │
│ [Editar]    │  │ [Editar]    │  │              │
└─────────────┘  └─────────────┘  └─────────────┘
                 [+ Agregar método de pago]
```

- Each method is a card with icon, status badge, summary of config
- Active methods have green check, inactive have outline style
- Click card → inline expand or sheet with configuration fields
- Add new method → card slides in with `listItem` variant
- Reorder via drag (or arrows)

#### 1.6 Orders Tab (Restaurant/Beauty) — Keep Separate but Polish

For verticals with incoming orders (restaurant, beauty with online booking):

```
[Mi Sitio]  [Pedidos (3)]  ← Tab with badge count
```

- Orders remain a tab (not mixed with settings)
- Badge shows pending order count
- Real-time polling continues (30s)
- Add: row stagger on load, status transition animation, order completion celebration

---

### LAYER 2: INTERACTION (35%)

#### 2.1 Live Mini-Preview

NOT an iframe. A styled React component that renders a simplified version of the storefront using the current settings state:

```tsx
function StorefrontMiniPreview({ config }: { config: StorefrontConfig }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card scale-[0.4] origin-top-left"
         style={{ width: '375px', height: '667px', /* iPhone size */ }}>
      {/* Hero */}
      <div style={{ background: config.theme.primaryColor, height: '200px' }}>
        {config.theme.logo && <img src={config.theme.logo} className="h-8" />}
        <h1>{config.restaurantName || 'Tu Negocio'}</h1>
        <p>{config.tagline || 'Tu tagline aquí'}</p>
      </div>
      {/* Services preview */}
      <div className="p-4 space-y-2">
        <div className="h-8 bg-muted rounded" /> {/* placeholder */}
        <div className="h-8 bg-muted rounded" />
      </div>
      {/* CTA Button */}
      <button style={{ background: config.accentColor || config.theme.primaryColor }}>
        Reservar
      </button>
    </div>
  );
}
```

- Updates INSTANTLY as user types name, changes color, uploads logo
- No API call, no iframe, no network dependency
- Scaled to 40% to fit in the sidebar
- Shows: hero (color + logo + name), placeholder service cards, CTA button in accent color
- When user uploads hero image/video → shows in preview
- Framing: mobile phone mockup around the preview for context

#### 2.2 Color Selection with Live Feedback

Replace hex input + circles with a proper color picker:

```
┌──────────────────────────────────────┐
│ Color principal                      │
│ [● ● ● ● ● ● ●]  [#D946EF]  [🎨] │
│                                      │
│ [Preview: mini button + header       │
│  rendered in the selected color]     │
└──────────────────────────────────────┘
```

- Preset palette (8 circles: brand-curated colors that look good on dark/light)
- Hex input for custom
- Color picker dialog (🎨 button) for visual selection
- **Instant preview** in the mini-storefront on the left — header changes color as user picks
- `haptics` not available on desktop — use color preview transition instead

#### 2.3 Image Upload with "Hanging a Painting" Feel

When user uploads a logo/banner/gallery image:

1. **Drop zone**: dashed border + "Arrastra tu imagen aquí" + click to browse
2. **Uploading**: progress ring (not spinner) around thumbnail placeholder
3. **Uploaded**: image scales in from 0.8→1 with `SPRING.bouncy` + frame glow
4. **In mini-preview**: logo/banner updates instantly in the live preview
5. **Gallery**: new image slides into the grid with `listItem` variant

#### 2.4 Section Animations

- Each section reveals with `fadeUp` as it enters the viewport (scroll-triggered via IntersectionObserver)
- Section headers have subtle stagger on mount
- Save button: `whileTap={{ scale: 0.97 }}`, loading spinner during save, green flash on success
- Tab transitions (Mi Sitio ↔ Pedidos): crossfade with `mode="wait"`

#### 2.5 Dirty State Indicator

When user has unsaved changes:

```
┌──────────────────────────────────────┐
│ ● Cambios sin guardar               │  ← Amber dot + text
│ [Guardar cambios]  [Descartar]      │  ← Sticky footer
└──────────────────────────────────────┘
```

- Sticky footer appears when any field changes
- Amber dot pulses to draw attention
- "Guardar" saves all changed sections at once
- "Descartar" reverts to saved state
- Warning if user navigates away with unsaved changes (`beforeunload`)

#### 2.6 Section Navigation (Sidebar Anchors)

Sticky left sidebar with section links:

```
│ ✓ Identidad        │
│ ✓ Diseño           │
│ ● Contacto    ← active │
│ ○ Pagos            │
│ ○ Galería          │
│ ○ Redes Sociales   │
│ ○ SEO              │
│ ○ Google           │
│ ○ Publicar         │
```

- Checkmark = section complete
- Circle = section empty/incomplete
- Active section highlighted based on scroll position
- Click → smooth scroll to section
- Same pattern as Notion settings sidebar

#### 2.7 Orders Tab Polish

- Order cards stagger in on load (`listItem`, `STAGGER(0.03)`)
- Status transition: badge morphs with crossfade + block flashes on change
- New order arrives: card slides in from top with sound cue (if enabled) + badge count increments with bounce
- Order completed (delivered): brief green flash + "Orden entregada" toast with AnimatedNumber on daily total

---

### LAYER 3: CELEBRATION (25%)

#### 3.1 "Going Live" Ceremony (See 1.4 above)

The peak moment of the entire storefront setup. Confetti + share prompt. This is the **peak-end rule** in action — users remember the peak (going live) and the end (sharing their link).

#### 3.2 Section Completion Mini-Celebrations

When a section transitions from incomplete to complete:

- Progress bar fills with `SPRING.soft`
- Percentage AnimatedNumber tweens up
- Section checkmark scales in with `SPRING.bouncy`
- Brief "Identidad lista ✓" micro-toast (not full toast — inline near the progress bar)

At 100%: "Tu sitio esta listo para publicar" with pulsing CTA to scroll to Publicar section.

#### 3.3 First Image Upload Celebration

When user uploads their FIRST gallery image:

```
🖼️ ¡Tu primera imagen está lista!
Tu galería ya tiene contenido. Tus clientes
podrán ver tu trabajo.
[Subir más]  [Continuar]
```

- Brief overlay with scale-in animation
- Encourages uploading more (variable ratio — the more they upload, the harder to leave)

#### 3.4 Gallery Milestone Celebrations

- 5 images: "Tu galería va tomando forma"
- 10 images: "10 imágenes — tus clientes van a amar esto"
- First before/after: "¡Tu primer antes/después! Esto vende solo."

#### 3.5 Intelligence Insights

Below the progress bar, show contextual suggestions:

```
💡 Los salones con galería de 10+ imágenes reciben 3x más reservas
💡 Agregar Google Business aumenta tu visibilidad en búsquedas locales
💡 Tu configuración de pagos está incompleta — los clientes no podrán pagar online
```

- Data-driven or rule-based (simple: if gallery < 5 images → suggest more)
- Actionable: click → scrolls to relevant section
- Disappears once addressed

---

## Micro-interactions Table

| Element | Trigger | Animation | Spec |
|---------|---------|-----------|------|
| Progress bar | Section complete | Width fill | `SPRING.soft` |
| Percentage | Value change | AnimatedNumber | 600ms |
| Section checkmark | Complete | Scale-in | `SPRING.bouncy` |
| Mini-preview | Setting change | Instant re-render | No animation (instant = responsive) |
| Color swatch | Select | Ring scale-in + preview update | `SPRING.snappy`, 100ms |
| Image upload | Complete | Scale 0.8→1 | `SPRING.bouncy` |
| Gallery image | Add | Slide-in | `listItem` variant |
| Payment card | Add | Slide-in | `listItem` variant |
| Payment card | Toggle | Green check / outline morph | 200ms transition |
| Save button | Tap | `whileTap scale 0.97` | Loading spinner → green flash |
| Dirty state | Change detected | Footer slides up | `SPRING.soft` |
| Going live toggle | ON | Confetti + share modal | 2.5s ceremony |
| Going live toggle | OFF | Fade to muted | 300ms, no ceremony |
| Section anchor | Click | Smooth scroll | 400ms ease |
| Section enter | Viewport | fadeUp | IntersectionObserver + `DUR.base` |
| Orders card | Mount | Stagger | `listItem`, `STAGGER(0.03)` |
| Order status | Change | Badge morph | `SPRING.snappy` |
| New order | Arrive | Slide-in from top + badge bounce | `SPRING.soft` + `SPRING.bouncy` |

---

## Implementation Order

```
LAYER 1 — STRUCTURE:
  1. Merge entry points → single StorefrontHub (route both paths here)
  2. Replace 9 tabs with scrollable sections + sidebar anchors
  3. Add progress bar with endowed progress (pre-fill from tenant/user)
  4. Build live mini-preview component (NOT iframe)
  5. Redesign payment methods as visual cards
  6. Move activation/domain to last section as "Going Live"
  7. Add dirty-state indicator with sticky save footer

LAYER 2 — INTERACTION:
  8. Color picker with live preview feedback
  9. Image upload with scale-in animation
  10. Section reveal on scroll (fadeUp)
  11. Tab transition (Settings ↔ Orders) crossfade
  12. Skeleton loading for initial config fetch
  13. Orders table stagger + status animation
  14. Gallery grid animations (add, remove, reorder)

LAYER 3 — CELEBRATION:
  15. "Going Live" ceremony (confetti + share prompt)
  16. Section completion mini-celebrations
  17. First image / gallery milestones
  18. Intelligence insights (suggestions based on completeness)
  19. Order completion celebration (daily total)
```

**After EACH item:** build + verify. TypeScript compilation must pass.

---

## Verification Criteria

| Criterion | Metric |
|-----------|--------|
| See preview instantly | Color/name changes reflect in mini-preview < 100ms |
| Know how done I am | Progress bar shows percentage with section checklist |
| Complete setup without tabs | All sections scrollable, sidebar anchors for navigation |
| Feel the "going live" moment | Confetti + share prompt when activating storefront |
| Never lose work | Dirty-state indicator + unsaved changes warning |
| Payment methods feel visual | Cards with icons, not data table rows |
| Gallery feels like curation | Images scale in with animation, milestones celebrated |
| Settings feel alive | Every section animates on scroll, every save has feedback |

---

## Technical Constraints

- StorefrontSettings components are **TypeScript (.tsx)** — maintain strict types
- RestaurantStorefrontPage is **JSX** — can convert to TSX or keep JSX for the merged hub
- Import motion tokens from `@/lib/motion`
- Reuse AnimatedNumber from `@/components/mobile/primitives/AnimatedNumber`
- Image uploads use existing endpoints (`/admin/storefront/upload-*`)
- Live mini-preview is a REACT COMPONENT, not an iframe
- Build: `npx vite build` (must pass TypeScript compilation)
- Test: 1280px, 1440px, 1920px viewports

### What NOT to Change

- API calls, endpoints, payloads
- StorefrontConfig type definitions
- Image upload endpoints and file size limits
- Payment method data structure
- Gallery data structure and beauty-specific fields
- Order management logic and status flow
- Domain availability checking logic

---

## Deliverables

1. `StorefrontHub.tsx` (NEW or merged) — unified entry point with scrollable sections + sidebar
2. `StorefrontMiniPreview.tsx` (NEW) — live preview component (not iframe)
3. `StorefrontProgress.tsx` (NEW) — progress bar with endowed progress + section checklist
4. `PaymentMethodCards.tsx` (NEW or refactored) — visual card-based payment method UI
5. `GoingLiveCeremony.tsx` (NEW) — activation celebration with confetti + share
6. `DirtyStateFooter.tsx` (NEW) — unsaved changes indicator with save/discard
7. All existing editors (Theme, SEO, Contact, etc.) — updated with fadeUp, save animations
8. `GalleryEditor.tsx` — upload animations, milestones
9. `OrdersTab` — table stagger, status animation, order arrival animation
10. Route update in `App.jsx` — both `/storefront` and `/restaurant/storefront` → StorefrontHub
11. Build passing with zero TypeScript errors
12. ALL existing functionality verified working

The storefront settings page is where a barbershop owner builds their online identity. It should feel like decorating their shop — hanging the sign, choosing the paint, arranging the photos. Every change should be visible INSTANTLY in the preview. Every section completed should feel like progress. And the moment they go live should feel like opening day — with confetti.
