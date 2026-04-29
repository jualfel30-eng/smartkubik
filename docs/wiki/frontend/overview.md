# Frontend Admin — Arquitectura y Patrones

> Documentación técnica del admin frontend (React 18 + Vite).
> Última actualización: 2026-04-28

---

## Stack

| Tecnología | Uso |
|---|---|
| React 18 | UI framework |
| Vite | Build tool / dev server |
| React Router v6 | Routing (BrowserRouter) |
| Tailwind CSS v4 | Styling |
| shadcn/ui | Componentes base (Button, Dialog, Sheet, etc.) |
| Framer Motion | Animaciones |
| Material UI | Componentes específicos (DatePicker, etc.) |
| Lucide React | Iconos |
| Recharts | Gráficas |

## Arquitectura

```
src/
├── App.jsx                 # Router principal + Providers
├── pages/                  # Componentes de ruta (Login, Register, etc.)
├── components/             # Componentes por feature
│   ├── sidebar/            # SidebarNavigation, SidebarFooterContent
│   ├── orders/v2/          # POS v2 (OrdersPOS, OrdersHistory)
│   ├── inventory/          # InventoryTable, Dialogs, InlineStockAdjust
│   ├── compras/            # CompraCreateDialog, useComprasData
│   ├── billing/            # BillingDashboard, WithholdingManagement
│   ├── payroll/            # PayrollRunsDashboard, Structures
│   ├── production/         # ProductionManagement
│   ├── fulfillment/        # FulfillmentDashboard
│   ├── hospitality/        # HotelFloorPlan, PaymentsManagement
│   ├── drivers/            # DriverLayout, DriverDashboard
│   ├── mobile/             # RouteGates por módulo (responsive)
│   └── ui/                 # shadcn/ui components
├── hooks/                  # Custom hooks (use-auth, use-crm, use-feature-flags)
├── context/                # React Context (Shift, CRM, Accounting, Notification)
├── contexts/               # Más contexts (CashRegister, Fab, BusinessLocation)
├── config/                 # navLinks, sidebarNavGroups, sidebarProfiles
├── lib/                    # Utilidades (api.js, analytics, motion)
├── docs/                   # Artículos markdown del help center
├── country-plugins/        # Localización fiscal por país
└── assets/                 # Logos, imágenes
```

## Patrones de Componentes

### Pattern: Management Component
Componente principal de un módulo. Típicamente tiene tabs, filtros, tabla, y diálogos CRUD.
- Ejemplo: `ProductsManagement.jsx`, `ComprasManagement.jsx`, `AccountingManagement.jsx`
- Usa un hook custom (`useComprasData`, `useInventoryData`) que encapsula estado + API calls
- Renderiza sub-componentes (Table, Dialogs, Toolbar)

### Pattern: RouteGate
Decide qué renderizar según si es mobile o desktop.
- Ejemplo: `InventoryRouteGate.jsx`, `CrmRouteGate.jsx`, `AppointmentsRouteGate.jsx`
- Mobile → componente optimizado para pantalla pequeña
- Desktop → componente completo con sidebar/tabs

### Pattern: View Component
Vista de detalle o dashboard. Típicamente read-only con métricas.
- Ejemplo: `DashboardView.jsx`, `FixedAssetsView.jsx`, `BankReconciliationView.jsx`

### Pattern: Context Provider
Estado compartido entre componentes de un módulo.
- `ShiftContext` — Turno activo (clock in/out)
- `CrmContext` — Clientes, oportunidades, empleados
- `AccountingContext` — Estado contable
- `CashRegisterContext` — Sesión de caja activa
- `BusinessLocationContext` — Sede seleccionada

## Estado Global (sin Redux)

SmartKubik usa React Context exclusivamente:

```
Router
└── ThemeProvider (dark/light/system)
    └── MuiThemeBridge (syncroniza Tailwind↔MUI)
        └── AuthProvider (JWT, user, tenant, memberships, permissions)
            └── CountryPluginProvider (localización fiscal)
                └── NotificationProvider (in-app notifications)
                    └── ShiftProvider → BusinessLocationProvider → AccountingProvider
                        └── CashRegisterProvider → FabProvider → TenantLayout
```

## API Layer

Toda comunicación con el backend pasa por `lib/api.js`:

```javascript
fetchApi(path, options)
```

- Auto-adjunta `Authorization: Bearer {token}` y `x-tenant-id`
- Auto-refresh del token si recibe 401
- Centraliza error handling
- ~2,900 líneas con helpers para cada módulo

## Navegación

La navegación se define en `config/navLinks.js`:
- Cada link tiene: label, route, icon, permission, requiresModule, requiresVertical, requiresProfileKey
- `isNavItemVisible()` filtra por: sidebar whitelist → module check → vertical check → profile key → subsidiaries → feature flag → permission
- Perfiles niche (barbershop-salon, auto-parts) tienen whitelists que ocultan módulos no relevantes
- Labels dinámicos según vertical (ej: "Recursos" → "Profesionales" en beauty)

## Mobile

- `MobileBottomNav` — Barra inferior con 4 tabs (Dashboard, Agenda, Órdenes, Más)
- `MobileTopBar` — Header con logo, asistente, logout
- `MobileMoreMenu` — Grid de todos los módulos accesibles
- `RouteGate` components deciden layout mobile vs desktop
- PWA: `MobileInstallPrompt` sugiere instalar como app

---

*Última actualización: 2026-04-28*
