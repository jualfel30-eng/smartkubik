# Prompt: Mobile-First Storefront (Mi Sitio Web) Module — SmartKubik Beauty Vertical

## Your Role

You are a senior UX engineer with 25 years of experience building mobile website builders and e-commerce dashboards at Squarespace, Wix, and Shopify. You specialize in making non-technical business owners feel like designers — every setting change shows an instant preview, every toggle has a clear before/after, and the entire site configuration feels like decorating a room, not filling out a tax form. You have shipped website builder UIs used by 10M+ small businesses and you know that a barbershop owner setting up their online presence wants to see their logo, pick a color, toggle "open", and share the link — in under 2 minutes.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). The admin panel is built with React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a background). Mobile-first PWA.

---

## Current State

### What exists (mobile)
- Nothing dedicated. `/storefront` renders the desktop `RestaurantStorefrontPage.jsx` with a 2-column layout (config + orders) that's unusable on mobile. There is no RouteGate.

### What exists (desktop)
- `RestaurantStorefrontPage.jsx` at `src/pages/RestaurantStorefrontPage.jsx` — 2 tabs:
  - **Tab 1: Configuracion** — branding (name, tagline, logo, hero image/video), WhatsApp number, payment instructions, accent color picker, enabled toggle
  - **Tab 2: Pedidos** — real-time order list with status management (pending → confirmed → preparing → ready → delivered/cancelled)
- `StorefrontSettings/` directory — advanced settings (theme, SEO, domain, social, contact, WhatsApp, payments, gallery, Google Business) — these are for the GENERIC storefront, not the restaurant/beauty storefront. May not be active for Beauty vertical.

### Backend API
```
Config:
  GET  /restaurant-storefront/config     — current storefront configuration
  PUT  /restaurant-storefront/config     — update configuration (partial merge)

Orders:
  GET   /restaurant-orders?limit=100     — list orders (real-time)
  PATCH /restaurant-orders/:id/status    — update order status

Image Upload:
  POST /upload                           — general file upload (returns URL)
```

### Data Structures
```
StorefrontConfig:
  enabled: boolean
  restaurantName: string (business name displayed on site)
  tagline: string
  logoUrl: string
  heroVideoUrl: string (takes priority over image)
  heroImageUrl: string
  whatsappNumber: string (format: 584141234567, no +)
  paymentInstructions: string (multi-line: Zelle, Pago Movil, bank details)
  currency: string (default 'USD')
  accentColor: string (hex, e.g., '#2563EB')

Order:
  _id: ObjectId
  orderRef: string (display number like '#0042')
  customerName: string
  customerPhone: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  items: [{
    name: string,
    quantity: number,
    final_price: number,
    customizations: [{ action: 'remove'|'add', name: string }]
  }]
  total: number
  notes: string
  createdAt: Date
```

### Design system tokens (already in use)
- Motion: `SPRING.drawer`, `SPRING.snappy`, `SPRING.soft`, `SPRING.bouncy`
- Variants: `listItem`, `scaleIn`, `STAGGER`, `fadeUp`
- Haptics, bottom sheets, touch targets — same as all mobile components

---

## Requirements

### Architecture
1. New `MobileStorefrontPage.jsx` at `src/components/mobile/storefront/MobileStorefrontPage.jsx`
2. New `StorefrontRouteGate.jsx` — mobile/desktop gate
3. Route registration in `App.jsx`
4. Two-tab layout: "Mi Sitio" (config) + "Pedidos" (order management)

### Tab 1: Mi Sitio (Configuration)

A visual, card-based settings page. NOT a plain form — each setting group is a tappable card that shows current value and opens a bottom sheet to edit.

**Layout (scrollable):**

```
+------------------------------------------+
|  Mi sitio web                       [↻]  |
|  [ Mi Sitio ]  [ Pedidos (3) ]           |
+------------------------------------------+
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Estado: ACTIVO  🟢    [toggle] │    |  ← Master toggle
|  │  tutienda.smartkubik.com        │    |
|  │  [Copiar enlace] [Compartir]    │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  🖼️ Vista previa               │    |
|  │  ┌────────────────────────────┐ │    |
|  │  │  Mini preview of site     │ │    |  ← Scaled-down live preview
|  │  │  (logo + name + colors)   │ │    |
|  │  └────────────────────────────┘ │    |
|  │  [Ver sitio completo]           │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Nombre y Marca                 [>] │ |
|  │  "Barberia El Pulpo"               │ |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Logo e Imagenes                [>] │ |
|  │  [logo thumbnail]                   │ |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Color de Acento                [>] │ |
|  │  ● #2563EB                          │ |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  WhatsApp                       [>] │ |
|  │  +58 414 123 4567                   │ |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  Info de Pago                   [>] │ |
|  │  "Zelle: email@..."                 │ |
|  └──────────────────────────────────┘    |
|                                          |
+------------------------------------------+
```

**Setting cards → Bottom sheets:**

1. **Nombre y Marca**: sheet with `restaurantName` input + `tagline` input. Save updates config.
2. **Logo e Imagenes**: sheet with logo upload (tap → file picker, preview), hero image/video upload. Show current images as thumbnails.
3. **Color de Acento**: sheet with color swatches grid (preset colors) + custom hex input. Show preview of how the color looks on a mini card.
4. **WhatsApp**: sheet with phone number input (`inputMode="tel"`), format helper text. Validate format.
5. **Info de Pago**: sheet with multi-line textarea for payment instructions. Template helpers: "Agregar Zelle", "Agregar Pago Movil" buttons that insert formatted templates.

**Master toggle**: Big toggle at top. When OFF → site is private (shows badge "Sitio desactivado"). When ON → shows URL + share buttons.

**Share actions**:
- "Copiar enlace": copies URL to clipboard, `haptics.success()`, toast "Enlace copiado"
- "Compartir": opens native share sheet (`navigator.share()`) with site URL

**Live preview**: Scaled-down iframe or styled card mimicking the storefront. Shows logo, name, accent color. "Ver sitio completo" opens the storefront URL in a new tab.

### Tab 2: Pedidos (Order Management)

Real-time order management optimized for mobile:

```
+------------------------------------------+
|  [ Mi Sitio ]  [ Pedidos (3) ]           |
+------------------------------------------+
|  [Activos] [Completados] [Todos]         |
+------------------------------------------+
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  #0042 · Juan Perez     2m ago │    |
|  │  🟡 Pendiente                   │    |
|  │  2x Corte Clasico, 1x Barba    │    |
|  │  $21.00                          │    |
|  │  [Confirmar →]                   │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  #0041 · Maria Lopez    15m ago │    |
|  │  🔵 Confirmado                  │    |
|  │  1x Tinte + Secado              │    |
|  │  $35.00                          │    |
|  │  [Preparar →]                    │    |
|  └──────────────────────────────────┘    |
|                                          |
+------------------------------------------+
```

**Order cards:**
- Header: order ref + customer name + time ago
- Status badge: color-coded pill (yellow=pending, blue=confirmed, orange=preparing, green=ready, gray=delivered, red=cancelled)
- Items summary (truncated to 1 line if many items)
- Total amount
- **Primary action button**: advances to next status (Confirmar → Preparar → Listo → Entregado)
- Tap card → expand to show: full item list with customizations, customer phone (tap to call/WhatsApp), notes, cancel button

**Status flow buttons:**
| Current Status | Button Label | Button Color | Next Status |
|---|---|---|---|
| pending | "Confirmar" | `bg-blue-600` | confirmed |
| confirmed | "Preparar" | `bg-orange-500` | preparing |
| preparing | "Listo" | `bg-emerald-600` | ready |
| ready | "Entregado" | `bg-primary` | delivered |

**Cancel**: Available at any stage. Opens confirmation bottom sheet with optional cancellation reason.

**Auto-refresh**: Poll every 30s or use existing polling pattern. New orders animate in at top with bounce + `haptics.tap()`.

**Filter pills**: "Activos" (pending+confirmed+preparing+ready), "Completados" (delivered), "Todos"

**Empty state**: "Sin pedidos — comparte tu enlace para empezar a recibir" with share button CTA

### Mobile UX Patterns (MANDATORY)

- **Setting cards**: `bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4`. Show current value as preview text. Chevron right. Tap → bottom sheet.
- **Toggle**: Animated spring toggle for site enabled/disabled. Large, prominent, with status text.
- **Color swatches**: Grid of 8 circles (preset colors) + custom hex input. Selected swatch has ring + check.
- **Image upload**: Thumbnail preview + "Cambiar" overlay. Tap → native file picker. Loading spinner while uploading.
- **Order cards**: Status-colored left border (4px). Primary action button right-aligned. Time-ago auto-updating.
- **Status transition**: Button press → status changes instantly (optimistic update) → confirm with API → revert on error.
- **Share**: Use `navigator.share()` API with fallback to clipboard copy.

### Micro-interactions
- Site toggle ON: green pulse, URL slides in from right, `haptics.success()`
- Site toggle OFF: red flash, URL fades out, `haptics.warning()`
- Copy link: button briefly shows checkmark, "Copiado!" tooltip, `haptics.success()`
- Color swatch selection: ring scales in with `SPRING.bouncy`, preview updates instantly
- Image upload: progress ring animation, scale-in on complete
- Order arrives: card slides in from top with `SPRING.soft`, badge count bounces
- Status change: button morphs to checkmark briefly, card reorders in list, `haptics.success()`
- Cancel order: card fades to 50% opacity with strikethrough, slides out after 1s

### Technical Constraints
- All sheets: `MobileActionSheet` (portaled to `document.body`)
- Image upload: `POST /upload` with `FormData`, returns `{ url: '...' }`
- Share: `navigator.share({ title, url })` with clipboard fallback
- Polling: `setInterval` 30s for orders, or use existing pattern
- Build: `npx vite build` — JSX only
- Test: 375px and 430px viewports

### What NOT to Build
- Advanced StorefrontSettings (SEO, domain, Google Business) — desktop power-user features
- Menu/product catalog editor — managed in Products module
- Delivery zone configuration — not applicable to Beauty
- Payment gateway integration — Beauty uses manual payment instructions

---

## Deliverables

1. `MobileStorefrontPage.jsx` — 2-tab layout (Mi Sitio + Pedidos)
2. `MobileStorefrontConfig.jsx` — visual config cards with bottom sheet editors
3. `MobileStorefrontOrders.jsx` — real-time order management with status flow
4. `MobileOrderCard.jsx` — expandable order card with status transition buttons
5. `StorefrontRouteGate.jsx` — mobile/desktop gate
6. `App.jsx` — route update

The barbershop owner must be able to set up their online presence, see it live on their phone, share it via WhatsApp, and manage incoming orders — all without touching a laptop.
