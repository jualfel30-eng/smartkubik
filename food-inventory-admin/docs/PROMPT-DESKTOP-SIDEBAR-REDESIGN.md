# Prompt: Desktop Sidebar Redesign — SmartKubik (All Verticals)

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 25 years of experience building navigation systems at Linear, Notion, Figma, and Slack. You specialize in sidebars that feel alive — where every menu item breathes, every badge pulls you in, every collapse animation has weight, and the navigation itself becomes a dashboard of your business health. You understand that a sidebar is NOT a list of links — it's a living map of the user's world. Linear proved that a sidebar can be the most beautiful part of an app. Notion proved it can be infinitely flexible. Figma proved it can feel instant even with 1000 files. Your job is to make SmartKubik's sidebar the most satisfying navigation in any ERP — a sidebar so fluid, so responsive, so information-rich that users WANT to explore it.

You are working on SmartKubik, a multi-vertical SaaS ERP. React 18 + Vite + Tailwind CSS v4 + Framer Motion. Shadcn/Radix UI component library. Dark mode (#0a0e1a). Sidebar uses Radix `Collapsible` primitives.

---

## Current State

### What exists
- Desktop sidebar defined in `App.jsx` (SidebarNavigation component, ~280 lines)
- Uses Shadcn `Sidebar`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuSub` primitives
- Radix `Collapsible` for expandable groups
- `useSidebar()` hook: `state` (expanded/collapsed), `openMobile`, `toggleSidebar()` (Cmd+B)
- `navLinks` array from `config/navLinks.js` — 30+ items, up to 3 levels deep
- Filtering: permissions, modules, verticals, feature flags, profile whitelist (`sidebarProfiles.js`)
- Dynamic labels: "Citas" → "Agenda" (beauty), "Recursos" → "Profesionales" (beauty)
- Badges: `useSidebarBadges` hook (appointments count, inventory alerts), 60s polling
- WhatsApp unread count from `useNotification()` context
- Collapsed mode: icon-only (3.8rem), tooltips on hover
- Footer: Collapse toggle + Settings + Logout

### CSS Variables
```css
--sidebar-width: 16rem (256px)
--sidebar-width-icon: 3.8rem (60.8px)
--sidebar-width-mobile: 18rem (288px)
```

### Current animations
- Chevron rotation: CSS `transform: rotate(90deg)`, 200ms, linear
- Width transition: CSS `duration-200 ease-linear`
- Hover: `hover:bg-sidebar-accent hover:translate-x-0.5`
- Active press: `active:scale-[0.98]`
- Badge entrance: `animate-in fade-in-0 zoom-in-75 duration-300`
- Collapsible content: Radix default (instant, no animation)
- **NO Framer Motion** — all CSS transitions, no springs, no stagger

### Problems
1. **Collapsible animation is instant** — groups snap open/close with zero transition. Radix default. Feels jarring.
2. **No stagger on sub-items** — when a group opens, all children appear at once. No sequential reveal.
3. **Chevron animation is mechanical** — CSS rotate 200ms linear. No spring, no bounce, no organic feel.
4. **Badges don't animate on count change** — the badge appears with fade-in, but when the COUNT changes (e.g., 3→5), there's no animation. The number just jumps.
5. **Active indicator is flat** — `bg-sidebar-accent` background is a rectangle. No pill shape, no animated transition between active items (no `layoutId` pattern).
6. **Collapsed mode has no polish** — icons shrink but the transition is linear. No spring-back, no bounce.
7. **No hover intelligence** — all items look the same on hover. No preview, no tooltip with badge count, no indication of what's inside a collapsed group.
8. **No visual grouping** — 30+ items in a flat list with only indentation to show hierarchy. No section headers, no dividers, no visual breathing room.
9. **Footer is afterthought** — Settings and Logout are identical in weight to navigation items. No visual separation.
10. **No motion language** — the sidebar uses zero Framer Motion. It's the ONLY part of the app that doesn't use the motion.js tokens (SPRING, DUR, EASE, listItem, etc.).

---

## Requirements

### Architecture
1. Modify the existing `SidebarNavigation` in `App.jsx` (or extract to `src/components/sidebar/SidebarNavigation.jsx`)
2. DO NOT change the sidebar primitives (`sidebar.jsx`) — work within the existing component library
3. Add Framer Motion to the sidebar for: collapsible animation, stagger, badge count, active indicator, chevron
4. Keep all existing functionality: filtering, permissions, badges, collapse, tooltips, keyboard shortcut
5. The redesign is DESKTOP ONLY — mobile sidebar remains a Sheet overlay

### Visual Redesign

**Section Headers:**
Currently, all 30+ navLinks are in one flat list. Add visual grouping:

```
┌──────────────────────────┐
│ 🔍 Search... (Cmd+K)    │  ← Quick search bar
├──────────────────────────┤
│ OPERACIONES              │  ← Section header
│  📊 Panel de Control     │
│  📅 Agenda           (3) │  ← Badge
│  📋 Tablero de Piso      │
│  ✂️ Servicios             │
│  👤 Profesionales         │
│                          │
│ CRM Y VENTAS             │
│  👥 CRM              ▶   │  ← Expandable
│  📦 Inventario        ▶  │
│  🌐 Mi Sitio Web         │
│  📢 Marketing         ▶  │
│                          │
│ FINANZAS                 │
│  💰 Cierre de Caja       │
│  🤝 Comisiones            │
│  📊 Reportes              │
│  🏦 Cuentas Bancarias    │
│                          │
│ ── ── ── ── ── ── ── ── │  ← Divider
│  ⚙️ Configuración        │
│  🚪 Cerrar Sesión        │
└──────────────────────────┘
```

**Section headers**: `text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] px-3 pt-4 pb-1`

Group assignments should reuse `MOBILE_NAV_GROUPS` from `config/mobileNavGroups.js` for consistency with mobile "Mas" menu. Add a `sidebarGroup` field to each navLink or create a mapping.

### Animated Active Indicator

Replace the flat `bg-sidebar-accent` rectangle with a pill that SLIDES between items:

```jsx
// Using Framer Motion layoutId for shared layout animation
{isActive && (
  <motion.div
    layoutId="sidebar-active-pill"
    className="absolute inset-y-0.5 left-0.5 right-0.5 rounded-lg bg-primary/10 border border-primary/20"
    transition={SPRING.soft}
  />
)}
```

- The pill smoothly transitions from one menu item to another when the user navigates
- Same `layoutId` pattern as the mobile bottom nav pill indicator
- Color: `bg-primary/10 border border-primary/20` (subtle, not overwhelming)
- Active text: `text-primary font-semibold` (not just `font-medium`)

### Animated Collapsible Groups

Replace instant open/close with spring animation:

```jsx
// Wrap Radix CollapsibleContent with Framer Motion
<CollapsibleContent forceMount>
  <AnimatePresence initial={false}>
    {isOpen && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: DUR.base, ease: EASE.out }}
      >
        <SidebarMenuSub>
          {children.map((child, i) => (
            <motion.div
              key={child.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: DUR.fast, ease: EASE.out }}
            >
              {renderMenuItem(child, level + 1)}
            </motion.div>
          ))}
        </SidebarMenuSub>
      </motion.div>
    )}
  </AnimatePresence>
</CollapsibleContent>
```

- Height animates from 0 → auto (not instant)
- Children stagger in with 30ms delay each
- Each child fades in + slides from left (`x: -8 → 0`)
- Exit: height collapses + fade out (no stagger on exit — snappy close)

### Chevron with Spring

Replace CSS transform with Framer Motion:

```jsx
<motion.div
  animate={{ rotate: isOpen ? 90 : 0 }}
  transition={SPRING.snappy}
>
  <ChevronRight size={14} />
</motion.div>
```

- Uses `SPRING.snappy` (stiffness: 500, damping: 40) — organic, not linear
- Slight overshoot on open (the bounce makes it feel alive)

### Badge Count Animation

When badge count changes, animate the number:

```jsx
<motion.span
  key={count} // Re-mount on count change triggers animation
  initial={{ scale: 1.3, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={SPRING.bouncy}
  className="badge-classes..."
>
  {count}
</motion.span>
```

- Count change: badge scales from 1.3→1 with bounce
- New badge appears: zoom-in from 0.75 + fade-in
- Badge disappears: zoom-out to 0.75 + fade-out

### Collapse/Expand Sidebar Animation

When toggling between expanded and icon-only:

- Width transition: keep CSS `duration-200` but change easing to `cubic-bezier(0.22, 1, 0.36, 1)` (EASE.out from motion.js)
- Labels: fade out BEFORE width shrinks, fade in AFTER width expands (sequence, not simultaneous)
- Icons: subtle scale pulse (`1→1.05→1`) when entering icon-only mode

### Hover Enhancement

On hover over a menu item:

```jsx
<motion.div
  whileHover={{ x: 2 }}
  transition={{ duration: 0.15 }}
>
  <SidebarMenuButton ...>
```

- Subtle 2px right shift on hover (current: 0.5px — too subtle to notice)
- Background: keep `hover:bg-sidebar-accent` but add 100ms transition
- Collapsed mode hover: show tooltip with item name + badge count + description

### Collapsed Mode: Badge Dots

When sidebar is collapsed, badges should show as small colored dots on the icon:

```jsx
{state === 'collapsed' && badge > 0 && (
  <motion.span
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={SPRING.bouncy}
    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-sidebar"
  />
)}
```

- Small dot (not full number badge — no room in icon-only mode)
- Color: `bg-destructive` for urgent (appointments), `bg-blue-500` for info (WhatsApp)
- Bouncy entrance animation

### Footer Redesign

Separate footer visually from navigation:

```
├──────────────────────────┤
│                          │
│  [User Avatar] Juan P.   │  ← User info row
│  Barbería El Pulpo       │
│                          │
│  ⚙️ Ajustes   🚪 Salir  │  ← Icon buttons, not full rows
│  [← Colapsar]            │
├──────────────────────────┤
```

- User info at bottom: avatar (initials or photo) + name + tenant name
- Settings and Logout as icon buttons side by side (not full menu rows)
- Collapse toggle as subtle text link at very bottom
- In collapsed mode: only avatar circle visible, tap → popover with name + actions

### Quick Search in Sidebar (Optional Enhancement)

Add a search input at the top of the sidebar (collapsed: magnifying glass icon):

```jsx
// Expanded mode:
<div className="px-2 pb-2">
  <button
    onClick={openCommandPalette}
    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm"
  >
    <Search size={14} />
    <span>Buscar...</span>
    <kbd className="ml-auto text-[10px] bg-background px-1.5 py-0.5 rounded">⌘K</kbd>
  </button>
</div>
```

- Not a real search — just a button that opens the existing Command Palette (Cmd+K)
- Shows the keyboard shortcut as a visual hint
- In collapsed mode: just the magnifying glass icon

### Micro-interactions Table

| Element | Trigger | Animation | Spec |
|---------|---------|-----------|------|
| Active pill | Route change | Shared layout slide | `layoutId`, `SPRING.soft` |
| Group open | Chevron tap | Height 0→auto + children stagger | `DUR.base`, stagger 30ms |
| Group close | Chevron tap | Height auto→0 + fade | `DUR.fast`, no stagger |
| Chevron | Group toggle | Rotate 0→90 with spring | `SPRING.snappy` |
| Badge count | Count changes | Scale 1.3→1 bounce | `SPRING.bouncy` |
| Badge appear | First render | Zoom-in 0.75→1 + fade | `DUR.base` |
| Menu hover | Mouse enter | x: 0→2, bg transition | 150ms, `EASE.out` |
| Collapse | Toggle | Width + label fade sequence | 200ms, `EASE.out` |
| Icon mode | Enter collapsed | Icon scale 1→1.05→1 | `SPRING.snappy` |
| Badge dot | Collapsed + badge | Scale 0→1 bounce | `SPRING.bouncy` |
| Footer user | Hover | Subtle highlight | 100ms, bg transition |
| Search button | Hover | Subtle scale 1.01 | 100ms |

### Technical Constraints

- Keep existing Shadcn sidebar primitives (`SidebarMenu`, `SidebarMenuButton`, etc.)
- Add Framer Motion alongside existing Radix Collapsible (use `forceMount` on CollapsibleContent)
- Keep `Cmd+B` toggle, `useSidebar()` hook, `useSidebarBadges()` hook
- Keep all permission/module/vertical filtering unchanged
- Keep mobile Sheet overlay behavior unchanged
- Import motion tokens from `@/lib/motion` (SPRING, DUR, EASE, etc.)
- Build: `npx vite build`
- Test: 1280px+ (standard desktop), 768-1280px (narrow desktop/tablet)

### What NOT to Build

- Mobile sidebar redesign (handled by MobileMoreMenu, already redesigned)
- New sidebar primitives (work within Shadcn library)
- Sidebar resize by drag (future feature)
- Pinned/favorites (future feature)
- Sidebar tabs/modes (keep single navigation list)
- Notification panel inside sidebar (notifications are in the topbar)

---

## Deliverables

1. `SidebarNavigation` — rewritten with Framer Motion animations, section headers, active pill
2. `SidebarFooterContent` — redesigned with user info, icon buttons, subtle collapse toggle
3. `AnimatedCollapsible.jsx` — wrapper for Radix Collapsible with height + stagger animation
4. `SidebarBadge.jsx` — badge component with count-change animation and collapsed-mode dot
5. CSS updates in sidebar.jsx — easing changes for collapse transition, label fade sequencing

The sidebar is open 100% of the time on desktop. It's the permanent frame around the entire app. Every pixel matters. The difference between "a list of links" and "a living map of my business" is animation, grouping, and intelligence. Make it feel like Linear's sidebar — where navigation itself is a pleasure.
