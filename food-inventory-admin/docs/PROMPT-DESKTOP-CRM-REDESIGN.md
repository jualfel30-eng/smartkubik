# Prompt: Desktop UX/UI Redesign — CRM Module

## Your Role

Apply the `/ux-design` skill. You are a senior product design engineer with 25 years of experience building CRM interfaces at HubSpot, Salesforce Lightning, Attio, and Folk. You specialize in contact management that feels personal, not corporate — where a barbershop owner can find any client by first name, see their complete history in one glance, and send a WhatsApp message in one click. You understand that a CRM for a 5-person barbershop is NOT Salesforce. It's a digital Rolodex with superpowers. Every interaction should feel like flipping through a well-organized contact book, not navigating enterprise software.

Stack: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Shadcn/Radix UI. Dark mode (#0a0e1a). Desktop only (≥1024px).

---

## Critical Constraint: DO NOT BREAK FUNCTIONALITY

The CRM has 3,783 lines with customer CRUD, pipeline management, playbooks, reminders, bulk operations, and employee management. ALL must continue working. Add polish, not complexity.

---

## Current State

**File:** `src/components/CRMManagement.jsx` (3,783 lines)

**Tabs:** Contacts (with sub-tabs: All, Clients, Suppliers, Employees) | Pipeline | Playbooks | Reminders | Settings

**What exists:** Customer table, pipeline kanban (react-dnd), bulk operations, search (600ms debounce), CSV export, summary cards, employee management with org structure, activity timeline, reminders widget.

**ZERO Framer Motion.**

**12 Problems:**

| # | Problem | Layer |
|---|---------|-------|
| 1 | **No customer preview** — clicking a customer opens a full dialog. No inline preview panel (like HubSpot's split view). | STRUCTURE |
| 2 | **Search is debounced 600ms** — feels slow. Should feel instant with skeleton placeholder while loading. | INTERACTION |
| 3 | **Table rows have no animation** — 50+ rows appear instantly. No stagger, no hover reveal. | INTERACTION |
| 4 | **Summary cards don't compare** — "45 clientes" with no trend. Are we gaining or losing clients? | STRUCTURE |
| 5 | **Pipeline has no animation** — kanban cards snap between columns. No spring drag, no placeholder while moving. | INTERACTION |
| 6 | **Bulk operations feel dangerous** — selecting 20 customers for bulk email has no confirmation animation. | CELEBRATION |
| 7 | **No "at-risk" signal** — clients who haven't visited in 60+ days should surface automatically. No churn indicator. | STRUCTURE |
| 8 | **Contact creation dialog is generic** — same form for customer, supplier, employee. No vertical-specific fields. | STRUCTURE |
| 9 | **No activity timeline on hover** — to see a client's history, you must open their full detail dialog. | INTERACTION |
| 10 | **Empty states are plain** — "No hay clientes" with no guidance or CTA. | INTERACTION |
| 11 | **No milestone celebration** — 100th client, 500th client — unmarked. | CELEBRATION |
| 12 | **Tab transitions are instant** — switching Contacts→Pipeline has no animation. | INTERACTION |

---

## Three-Layer Redesign

### LAYER 1: STRUCTURE (40%)

#### 1.1 Split View (Table + Detail Panel)

Replace full-screen dialog with a master-detail layout:

```
┌──────────────────────────────┬──────────────────────┐
│ CONTACTS TABLE (60%)         │ DETAIL PANEL (40%)   │
│                              │                      │
│ [Search...] [+ Nuevo]       │ Maria Lopez           │
│                              │ 📱 0414-123-4567     │
│ ┌────────────────────────┐  │ 📧 maria@email.com   │
│ │ Maria Lopez     Cliente│  │                      │
│ │ Juan Perez      Cliente│  │ ÚLTIMA VISITA: 3 dic │
│ │ Proveedor X   Proveedor│  │ VISITAS TOTALES: 12  │
│ │ ...                    │  │ GASTO TOTAL: $480    │
│ └────────────────────────┘  │                      │
│                              │ [WhatsApp] [Editar]  │
│ Página 1 de 5               │ [Ver historial]      │
└──────────────────────────────┴──────────────────────┘
```

- Click a row → detail panel slides in from right (SPRING.soft)
- Detail shows: contact info, last visit, total spend, visit count, recent activity
- WhatsApp button opens wa.me link directly
- Full dialog still accessible via "Ver completo" button
- Panel closes with Esc or clicking another row
- On screens < 1280px, panel overlays instead of side-by-side

#### 1.2 At-Risk Client Indicator

In the contact table, flag clients at risk of churning:

```
│ Maria Lopez  · Última visita: hace 67 días ⚠️ │
```

- Amber dot for 30-60 days inactive
- Red dot for 60+ days inactive
- Sortable column: "Días inactivos"
- CTA in detail panel: "Enviar mensaje de reactivación"

#### 1.3 Summary Cards with Trends

```
┌────────────┬────────────┬────────────┬────────────┐
│ 142        │ 12         │ 8          │ 5          │
│ Clientes   │ Nuevos     │ En riesgo  │ Proveedores│
│ ↑ +5 mes  │ este mes   │ sin visita │            │
└────────────┴────────────┴────────────┴────────────┘
```

- "Nuevos este mes" and "En riesgo" are actionable (clickable, filter the table)
- AnimatedNumber on all counts

### LAYER 2: INTERACTION (35%)

- Table row stagger on load (`listItem`, `STAGGER(0.03)`)
- Table row hover with bg highlight + quick action buttons reveal
- Search: reduce debounce to 300ms, show skeleton rows while loading
- Tab content transition (fadeUp on switch)
- Pipeline kanban: add spring physics to drag-drop (Framer Motion `drag` with `SPRING.soft`)
- Pipeline card: entrance animation when moved between columns
- Dialog scaleIn/scaleOut animation
- Bulk selection: floating action bar slides up from bottom (like inventory module)
- Empty states with icon + CTA + guidance text
- Contact detail panel: slide-in with `SPRING.soft` from right

### LAYER 3: CELEBRATION (25%)

- **New client created**: table row slides in at top with pulse highlight
- **100th client milestone**: confetti + "100 clientes en tu base" toast
- **Client reactivated** (visits after 60+ days inactive): "Maria volvió después de 67 días" toast with green accent
- **Bulk action completed**: "24 clientes actualizados" with AnimatedNumber count
- **Pipeline deal won**: card pulses green, amount animates, total pipeline value updates

---

## Verification Criteria

| Criterion | Metric |
|-----------|--------|
| Find any client | < 2 seconds (type name → see result) |
| See client details | 0 dialogs (split panel, 1 click) |
| Know who's at risk | Visible in table without filtering |
| Celebrate growth | Milestones on 100/500/1000 clients |
| Pipeline feels physical | Drag has spring physics, cards bounce |

---

## Deliverables

1. `CRMManagement.jsx` — split view layout, at-risk indicators, summary cards with trends
2. `ContactDetailPanel.jsx` (NEW) — slide-in panel with contact info + actions
3. `AtRiskBadge.jsx` (NEW) — inactive client warning indicator
4. Pipeline kanban — Framer Motion drag physics
5. All table animations (stagger, hover, delete exit)
6. Build passing, all features working
