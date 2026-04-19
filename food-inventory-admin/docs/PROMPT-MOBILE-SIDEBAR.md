# Prompt: Mobile-First Sidebar & Navigation Module — SmartKubik Beauty Vertical

## Your Role

You are a senior UX engineer with 25 years of experience building mobile navigation systems at Apple (iOS Settings & Springboard), Google (Material You), and Spotify (mobile nav redesign 2023). You specialize in information architecture that makes 20+ features feel like 5 — through smart grouping, contextual visibility, progressive disclosure, and muscle-memory-friendly tab placement. You have shipped navigation UIs used by billions of users and you know that a barbershop owner does NOT want to see "Contabilidad General", "Retenciones Fiscales", or "Libro Mayor" on their phone at 8am. They want: appointments, clients, charge, and done. Everything else must be reachable but never in the way.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). The admin panel is built with React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a background). Mobile-first PWA.

---

## Current State

### What exists (mobile navigation)

**1. Bottom Tab Bar** — `MobileBottomNav.jsx` at `src/components/mobile/MobileBottomNav.jsx`
- 5 slots: Hoy (dashboard) | Agenda | FAB (+) | Clientes | Más
- Fixed at viewport bottom, `height: calc(var(--mobile-bottomnav-h) + var(--safe-bottom))`
- Active tab has animated pill indicator (`layoutId`), icon scale + y-offset
- Badge dots on Hoy (unpaid count) and Agenda (pending count), real-time polling every 60s
- FAB center slot: opens action sheet with 4 actions (Nueva cita, Walk-in, Cobrar, Siguiente)

**2. "Más" Menu** — `MobileMoreMenu.jsx` at `src/components/mobile/MobileMoreMenu.jsx`
- Renders at route `/mas`
- Static 2-column grid of icon cards linking to secondary pages
- Beauty items: Tablero, Servicios, Profesionales, Inventario, Caja, Reportes, Ajustes (7 items)
- Default items: Productos, Inventario, Compras, Tienda online, Caja, Reportes, Contabilidad, Nómina, Ajustes (9 items)
- No badges, no grouping, no search, no personalization
- Missing modules: Comisiones, Mi Sitio Web, Marketing, WhatsApp, Reseñas

**3. Desktop Sidebar** — defined in `App.jsx` (lines 427-678)
- Full hierarchical navigation with 30+ items, nested up to 3 levels deep
- Filtered by: `permission`, `requiresModule`, `requiresVertical`, `requiresFeatureFlag`, `requiresProfileKey`, `requiresSubsidiaries`
- Profile-based whitelist: `sidebarProfiles.js` defines which top-level items each vertical sees
- Beauty (`barbershop-salon`) whitelist: dashboard, subsidiaries, appointments, floor-view, services, resources, crm, inventory-management, purchases, marketing, commissions, bank-accounts, cash-register, storefront, reviews, reports, whatsapp, assistant (18 items)
- Dynamic labels: "Citas" → "Agenda", "Recursos" → "Profesionales" based on profile key
- Collapsible groups with auto-expand on active route
- Badge counts via `useSidebarBadges` hook

**4. Mobile Top Bar** — `MobileTopBar.jsx`
- Shows SmartKubik logo, theme toggle, settings, logout
- No hamburger menu (sidebar is desktop-only)

### Problems with Current Mobile Navigation

1. **"Más" menu is a dumping ground** — 7 flat cards with no hierarchy, grouping, or priority. Missing 11 modules that the beauty sidebar whitelist includes.
2. **No badges on "Más" items** — pending commissions, unread WhatsApp messages, low stock alerts have no visibility.
3. **No search** — user must scan 7+ cards visually to find what they want.
4. **No module grouping** — "Inventario" and "Caja" are at the same level as "Ajustes", despite being fundamentally different in frequency of use.
5. **Bottom tab bar has no customization** — the 4 tabs (Hoy, Agenda, Clientes, Más) are hardcoded. A barbershop owner might want "Caja" as a primary tab instead of "Clientes".
6. **No contextual shortcuts** — the TodayDashboard has a "Quick Access" grid (Agenda, Caja, Servicios, Clientes) but it's disconnected from the "Más" menu. No learning from user behavior.
7. **Desktop sidebar is completely invisible on mobile** — all its intelligence (grouping, badges, permissions, whitelist) is lost.

### Design system tokens (already in use)
- Motion: `SPRING.drawer` (380,36), `SPRING.snappy` (500,40), `SPRING.soft` (260,30), `SPRING.bouncy` (420,22)
- Variants: `listItem` (fadeUp), `scaleIn`, `STAGGER(delay)`, `fadeUp`
- Haptics: `haptics.tap()`, `haptics.select()`, `haptics.success()`
- Bottom sheet: `MobileActionSheet` with `footer` prop, portaled to `document.body`
- Bottom nav: `var(--mobile-bottomnav-h)` = 64px, `var(--safe-bottom)` = env(safe-area-inset-bottom)
- Z-index: `--z-mobile-bottomnav: 50`, `--z-mobile-fab: 55`, `--z-mobile-sheet: 60`

---

## Requirements

### Architecture

1. Redesign `MobileMoreMenu.jsx` as a full-featured navigation hub — not a flat grid
2. Optionally redesign `MobileBottomNav.jsx` to support badge counts on "Más" tab
3. Keep the existing bottom tab structure (Hoy | Agenda | FAB | Clientes | Más) — do NOT add more tabs
4. The "Más" page must reflect the same module access logic as the desktop sidebar: permissions, modules, vertical, profile key, feature flags
5. Reuse `sidebarProfiles.js` whitelist — do NOT duplicate the access logic

### "Más" Menu Redesign

Replace the flat 2-column grid with a grouped, searchable, badge-aware navigation page:

```
+------------------------------------------+
|  Más                                [⚙]  |
|  Barbería El Pulpo · Juan                |
+------------------------------------------+
|  🔍 Buscar módulo...                     |
+------------------------------------------+
|                                          |
|  OPERACIONES                             |
|  +--------------------------------------+|
|  |  📋 Tablero de Piso            [>]  ||
|  |──────────────────────────────────────||
|  |  ✂️ Servicios                   [>]  ||
|  |──────────────────────────────────────||
|  |  👤 Profesionales               [>]  ||
|  |──────────────────────────────────────||
|  |  📦 Inventario             ●3   [>]  ||  ← badge: 3 low stock
|  |──────────────────────────────────────||
|  |  💰 Cierre de Caja         🟢   [>]  ||  ← green dot: session open
|  +--------------------------------------+|
|                                          |
|  VENTAS Y MARKETING                      |
|  +--------------------------------------+|
|  |  🌐 Mi Sitio Web               [>]  ||
|  |──────────────────────────────────────||
|  |  📢 Marketing                   [>]  ||
|  |──────────────────────────────────────||
|  |  💬 WhatsApp              ●5    [>]  ||  ← badge: 5 unread
|  |──────────────────────────────────────||
|  |  ⭐ Reseñas                     [>]  ||
|  +--------------------------------------+|
|                                          |
|  FINANZAS Y EQUIPO                       |
|  +--------------------------------------+|
|  |  🤝 Comisiones y Metas    ●2   [>]  ||  ← badge: 2 pending
|  |──────────────────────────────────────||
|  |  📊 Reportes                    [>]  ||
|  |──────────────────────────────────────||
|  |  🏦 Cuentas Bancarias          [>]  ||
|  +--------------------------------------+|
|                                          |
|  SISTEMA                                 |
|  +--------------------------------------+|
|  |  ⚙️ Configuración               [>]  ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
```

### Module Grouping (Beauty vertical)

| Group | Items | Logic |
|-------|-------|-------|
| **Operaciones** | Tablero de Piso, Servicios, Profesionales, Inventario, Cierre de Caja | Daily operational tools — most used |
| **Ventas y Marketing** | Mi Sitio Web, Marketing, WhatsApp, Reseñas | Growth & customer engagement |
| **Finanzas y Equipo** | Comisiones y Metas, Reportes, Cuentas Bancarias | Money management & team |
| **Sistema** | Configuración | Always last |

For non-beauty verticals, the grouping adapts:

| Group | Items |
|-------|-------|
| **Operaciones** | Productos, Inventario, Compras, Entregas |
| **Ventas** | Tienda online, Órdenes |
| **Finanzas** | Caja, Contabilidad, Nómina, Reportes |
| **Sistema** | Configuración |

### Search

- Sticky search bar at top of "Más" page
- Fuzzy search across all item labels
- As user types, filter items instantly (hide non-matching groups)
- Empty search result: "No se encontró el módulo"
- Search is purely client-side (no API call)

### Badges

Real-time badges on relevant items:

| Item | Badge Source | Visual |
|------|-------------|--------|
| Inventario | `/inventory/alerts/count` → low stock count | Red number badge |
| Cierre de Caja | `/cash-register/sessions/open` → session status | Green dot (open) or red dot (closed) |
| WhatsApp | unread message count (from NotificationContext) | Blue number badge |
| Comisiones | `/commissions/records/pending` → pending count | Amber number badge |
| Reseñas | pending reviews count | Number badge |

Badge data: polled every 60s (same interval as bottom nav badges), or updated via `onBadgeUpdate` event system.

**"Más" tab badge on bottom nav**: Sum of all secondary badges (so user knows something needs attention without opening "Más").

### Module Access Control

Each item must be filtered through the SAME logic as the desktop sidebar:

```jsx
// Pseudo-code for item visibility
function isItemVisible(item, tenant, user) {
  // 1. Profile whitelist
  const whitelist = getSidebarWhitelist(tenant?.verticalProfile?.key);
  if (whitelist && !whitelist.has(item.href)) return false;

  // 2. Permission check
  if (item.permission && !userHasPermission(user, item.permission)) return false;

  // 3. Module check
  if (item.requiresModule && !tenant.enabledModules?.[item.requiresModule]) return false;

  // 4. Vertical check
  if (item.requiresVertical && !item.requiresVertical.includes(tenant.vertical)) return false;

  // 5. Feature flag check
  if (item.requiresFeatureFlag && !isFeatureEnabled(item.requiresFeatureFlag)) return false;

  return true;
}
```

Reuse the `navLinks` array and filtering logic from `App.jsx` — do NOT hardcode a separate item list. Import from a shared config or pass via context.

### Item Rows

Each row in a group:

```jsx
<button
  onClick={() => { haptics.tap(); navigate(item.to); }}
  className="w-full flex items-center gap-3 px-4 py-3.5 text-left no-tap-highlight active:bg-muted transition-colors"
>
  <Icon size={18} className="text-muted-foreground shrink-0" />
  <span className="flex-1 text-sm font-medium">{item.label}</span>
  {badge > 0 && (
    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
      {badge}
    </span>
  )}
  <ChevronRight size={16} className="text-muted-foreground shrink-0" />
</button>
```

### Mobile UX Patterns (MANDATORY)

- **Groups**: iOS Settings style — section title in `text-xs font-semibold text-muted-foreground uppercase tracking-wider`, items in `bg-card rounded-[var(--mobile-radius-lg)] border border-border` with `divide-y divide-border`
- **Search**: `bg-muted rounded-xl pl-9 pr-4 py-2.5`, search icon left, instant filter, no debounce needed (client-side)
- **Badges**: Right-aligned, color-coded (red=urgent, amber=pending, blue=info, green=status). Animated bounce on count change.
- **Stagger entrance**: Groups enter with `STAGGER(0.05)` + `listItem` variant
- **User info header**: Tenant name + user first name + avatar. Tap → profile settings or tenant selector.
- **Settings shortcut**: Gear icon in header right → navigates to `/settings`
- **Pull to refresh**: Reloads badge counts
- **Safe bottom padding**: `pb-24` to account for bottom nav bar

### Micro-interactions

- Search focus: search bar expands slightly, groups animate filter with `AnimatePresence`
- Item tap: `active:bg-muted` background flash + `haptics.tap()` + navigate
- Badge count change: bounce animation (`SPRING.bouncy` on scale 1→1.2→1)
- Group entrance: `STAGGER(0.05)` on mount with `listItem` variant
- Empty search: fade-in empty state with search icon

### Dynamic Labels

Must support the same dynamic labels as the desktop sidebar:

| navLink name | barbershop-salon | clinic-spa | mechanic-shop |
|---|---|---|---|
| Citas | Agenda | Consultas | Citas de Servicio |
| Recursos | Profesionales | Profesionales | Bahías / Equipos |

Use `getDisplayName(item)` logic from `SidebarNavigation` in App.jsx.

### Bottom Nav "Más" Badge

Update `MobileBottomNav.jsx` to show a badge on the "Más" tab reflecting the total count of pending items across all secondary modules:

```jsx
// In MobileBottomNav badge calculation
const masTabBadge = lowStockCount + pendingCommissions + unreadWhatsApp;
```

This tells the user "there are N things needing attention in the Más menu" without them having to open it.

### Technical Constraints

- Import and reuse `navLinks` definition and access filtering from `App.jsx` (or extract to shared config)
- Import `getSidebarWhitelist` from `src/config/sidebarProfiles.js`
- Import `useSidebarBadges` from `src/hooks/use-sidebar-badges` for badge counts
- Use `useModuleAccess` for permission checks
- Use `useFeatureFlags` for feature flag checks
- All navigation via React Router `useNavigate`
- Build: `npx vite build` — JSX only
- Test: 375px and 430px viewports

### What NOT to Build

- Customizable tab bar (let user choose which 4 tabs to show) — future feature
- Drag-to-reorder modules — desktop behavior, not needed on mobile
- Nested sub-menus in "Más" (keep it flat within groups — tap goes to the page, not a sub-menu)
- Sidebar drawer/hamburger menu — the "Más" page IS the mobile equivalent of the sidebar

---

## Deliverables

1. `MobileMoreMenu.jsx` — complete rewrite: grouped, searchable, badge-aware, access-controlled
2. `MobileBottomNav.jsx` — updated to show aggregate badge on "Más" tab
3. Shared config extraction (if needed): `mobileNavConfig.js` mapping navLinks to mobile groups
4. Badge polling hook or integration with existing `useSidebarBadges`

The "Más" menu must feel like opening iOS Settings — clean groups, instant search, badge dots that pull you in, and zero clutter from modules the user doesn't have access to. Every tap leads somewhere useful. No dead ends, no desktop pages rendered on a phone screen.
