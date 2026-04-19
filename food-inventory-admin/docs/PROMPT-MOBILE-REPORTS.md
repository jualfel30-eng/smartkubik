# Prompt: Mobile-First Reports Module — SmartKubik Beauty Vertical

## Your Role

You are a senior UX engineer with 25 years of experience building mobile-first data visualization at Apple Health, Stripe Dashboard, and Spotify Wrapped. You specialize in distilling complex analytics into scannable, thumb-friendly cards that tell a story in 3 seconds. You have shipped analytics dashboards used by 200M+ users and you know that a barbershop owner glancing at their phone between clients does NOT want a spreadsheet — they want one number, one trend arrow, and one action button. Every chart must be touch-zoomable, every metric must be tap-to-drill-down, and every empty state must guide the user to generate data.

You are working on SmartKubik, a SaaS ERP for barbershops/salons (Beauty vertical). The admin panel is built with React 18 + Vite + Tailwind CSS v4 + Framer Motion. Dark mode (#0a0e1a background). Mobile-first PWA.

---

## Current State

### What exists (mobile)
- Nothing. The Reports page at `/reports` renders the desktop `ReportsPage.jsx` with wide tables, horizontal charts, and multi-column layouts that are completely unusable on mobile. There is no RouteGate, no mobile component, no responsive adaptation.

### What exists (desktop)
- `ReportsPage.jsx` at `src/pages/ReportsPage.jsx` — tab-based report selector
- `BeautyReportsWidget.jsx` — Beauty-specific reports (the ONLY relevant reports for this vertical):
  - Revenue by professional (bar chart)
  - Popular services (ranked list)
  - No-show rate (percentage + trend)
  - Client retention (percentage + trend)
  - Peak hours heatmap
  - Professional utilization (percentage bars)
- `PerformanceReport.jsx` — employee sales performance table
- `TipsReportWidget.jsx` — tips distribution breakdown
- `CashFlowStatement.jsx` — cash flow over time (line chart)

### Backend API
```
Beauty-specific (PRIMARY for this vertical):
  GET /beauty-reports/revenue-by-professional?startDate={}&endDate={}
  GET /beauty-reports/popular-services?startDate={}&endDate={}
  GET /beauty-reports/no-show-rate?startDate={}&endDate={}
  GET /beauty-reports/client-retention?startDate={}&endDate={}
  GET /beauty-reports/peak-hours?startDate={}&endDate={}
  GET /beauty-reports/utilization?startDate={}&endDate={}

General:
  GET /analytics/performance?date={YYYY-MM-DD}
  GET /analytics/tips?startDate={}&endDate={}&employeeId={}
  GET /dashboard/summary  (daily revenue, appointment count, etc.)
```

### Design system tokens (already in use)
- Motion: `SPRING.drawer` (380,36), `SPRING.snappy` (500,40), `SPRING.soft` (260,30), `SPRING.bouncy` (420,22)
- Variants: `listItem`, `scaleIn`, `STAGGER(delay)`, `fadeUp`
- Haptics: `haptics.tap()`, `haptics.select()`, `haptics.success()`
- Bottom sheet: `MobileActionSheet` with `footer` prop, renders via `createPortal` to `document.body`
- Existing chart component: `AnimatedNumber` for animated count-up values
- Existing: `Sparkline` SVG component in `TodayDashboard.jsx` (mini line charts)

---

## Requirements

### Architecture
1. New `MobileReportsPage.jsx` at `src/components/mobile/reports/MobileReportsPage.jsx`
2. New `ReportsRouteGate.jsx` that shows mobile on mobile, desktop on desktop
3. Route registration in `App.jsx` replacing direct `ReportsPage` reference
4. The mobile reports page is a vertically scrollable dashboard of metric cards — NOT tabs with tables

### Report Layout — Scrollable Dashboard (not tabs)

The mobile reports page is ONE scrollable view with cards stacked vertically. Each card is a self-contained metric with a chart/visualization. A sticky date-range picker at the top filters all cards simultaneously.

**Date Range Picker (sticky top):**
- Pill chips: "Hoy", "7 dias", "30 dias", "Este mes", "Personalizado"
- "Personalizado" opens a bottom sheet with two date inputs
- Default: "7 dias"
- When changed: all cards reload with new date range (show skeleton per card while loading)

**Card Order (top to bottom, Beauty priority):**

1. **Ingresos Totales** (hero card, large)
   - Big number: total revenue in period (`AnimatedNumber` with `$` format)
   - Comparison badge: "+12% vs periodo anterior" (green/red)
   - Mini sparkline showing daily revenue trend
   - Tap → bottom sheet with daily breakdown list

2. **Ingresos por Profesional** (bar chart card)
   - Horizontal bar chart: professional name + revenue bar + amount
   - Bars sorted by revenue descending
   - Each bar is tappable → bottom sheet with that professional's detail (services breakdown, appointment count)
   - Max 6 bars visible, "Ver todos" link if more

3. **Servicios Populares** (ranked list card)
   - Numbered list: #1 Corte Clasico (145 veces, $1,160), #2 Barba Completa (98 veces, $490)...
   - Each row has: rank number, service name, count badge, total revenue
   - Top 5 visible, expandable to show all

4. **Tasa de No-Show** (metric + trend card)
   - Large percentage: "4.2%"
   - Trend arrow + comparison: "↓ 1.5% vs mes anterior" (green = lower is better)
   - Small bar chart showing weekly no-show rate
   - Tap → bottom sheet with list of no-show clients

5. **Retencion de Clientes** (metric + trend card)
   - Large percentage: "78%"
   - Trend arrow: "↑ 5% vs mes anterior" (green = higher is better)
   - Donut or radial chart visualization
   - Definition text: "Clientes que regresaron al menos 1 vez en el periodo"

6. **Horas Pico** (heatmap card)
   - 7×12 grid: days (Mon-Sun) × hours (8am-8pm)
   - Color intensity: light → dark based on appointment density
   - Tap cell → tooltip with exact count
   - Legend: "Bajo · Medio · Alto"

7. **Utilizacion de Profesionales** (percentage bars card)
   - Professional name + percentage bar + "65%"
   - Bar color: green (>75%), amber (50-75%), red (<50%)
   - Sorted by utilization descending
   - Definition text: "% de horas disponibles con cita asignada"

8. **Propinas** (summary card — only if tips enabled)
   - Total tips in period
   - Breakdown by professional (mini bars)
   - Average tip percentage

### Mobile UX Patterns (MANDATORY)

- **Metric cards**: `bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4`. Each card is self-contained with title, visualization, and optional tap-to-expand.
- **Charts**: Use SVG-based charts (NOT a heavy charting library). Horizontal bars, sparklines, and the heatmap can all be built with SVG + Framer Motion path animations.
- **Animated numbers**: Use `AnimatedNumber` for all key metrics (count-up on mount, re-animate on data change).
- **Skeleton loading**: Each card shows its own skeleton while loading (not a full-page spinner).
- **Pull to refresh**: Reload all cards.
- **Stagger entrance**: Cards enter with `STAGGER(0.05)` + `listItem` variant as user scrolls or on initial load.
- **Bar chart animation**: Bars animate width from 0 to final value with `SPRING.soft`, staggered 50ms.
- **Trend badges**: Green for positive trends (revenue up, no-show down), red for negative. Include arrow icon.
- **Tap to drill-down**: Every card is tappable. Opens `MobileActionSheet` with detailed breakdown.

### Micro-interactions
- Date pill selection: `haptics.select()`, active pill scales to 1.05 briefly
- Number count-up: 600ms duration, ease-out
- Sparkline: `pathLength: 0→1` animation (600ms)
- Bar chart bars: `width: 0→final` with `SPRING.soft`, `STAGGER(0.05)`
- Heatmap cells: `opacity: 0→1` stagger from top-left to bottom-right
- Card expand (tap): bottom sheet slides up with `SPRING.drawer`
- Pull refresh: spinner + all cards show skeleton briefly
- Trend badge: fade-in with slight bounce on mount

### Technical Constraints
- All sheets: `MobileActionSheet` (portals to `document.body`)
- Data: `fetchApi()` from `@/lib/api`
- No heavy charting libraries (no Recharts, no Chart.js) — use SVG + Framer Motion
- Build: `npx vite build` must succeed — all JSX, no TypeScript
- Test: 375px and 430px viewports

### What NOT to Build
- Accounting reports (Balance Sheet, P&L, Trial Balance) — these are for accountants on desktop
- Inventory reports — handled in inventory module
- Export to PDF/Excel — desktop-only feature
- Menu engineering matrix — restaurant-specific, not beauty

---

## Deliverables

1. `MobileReportsPage.jsx` — scrollable dashboard with all metric cards
2. `ReportsRouteGate.jsx` — mobile/desktop gate
3. `MobileRevenueCard.jsx` — hero revenue card with sparkline
4. `MobileBarChart.jsx` — reusable horizontal bar chart (SVG + Framer Motion)
5. `MobileHeatmap.jsx` — peak hours heatmap grid
6. `MobileMetricCard.jsx` — reusable metric + trend card template
7. `App.jsx` — route update for `/reports`

Every card must fetch its own data, show its own skeleton, animate on mount, and offer tap-to-drill-down. The user must be able to understand their business performance in 10 seconds of scrolling.
