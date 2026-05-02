# food-inventory-admin (React + Vite)

Panel administrativo para los 6 verticales. 184 componentes, 46 páginas, 69 hooks. Tailwind CSS v4 + Framer Motion + custom WebGL shaders (OGL).

## Antes de tocar UI

1. Lee `../docs/wiki/frontend/` si tu cambio toca patrones globales (state, hooks, layouts).
2. Si vas a redesignar una pantalla, revisa `docs/PROMPT-*.md` correspondiente. Hay 25 blueprints con principios UX (Berridge salience, peak-end, welcome-back) que definen la vara de calidad.
3. Para análisis previo a redesign: usa `/ux-audit <screenPath>`.
4. Para generar nuevo blueprint: usa `/ux-redesign <screen>`.

## Estructura

```
src/
├── components/         (184 reutilizables + páginas específicas)
├── pages/              (46 páginas)
├── hooks/              (69 custom hooks)
├── contexts/           (Auth, CRM, Accounting, Shift, Notification, BusinessLocation, Theme)
├── layouts/            (TenantLayout, SuperAdminLayout, mobile gates)
├── lib/
│   ├── api.js          (axios + interceptors)
│   └── motion.js       (motion tokens)
└── App.jsx             (rutas + erp-active body class)
```

## Reglas de CSS scoping (críticas)

- **`body.erp-active`** — añadido por `TenantLayout` en useEffect (mount/unmount). Las reglas `!important` de typography en `App.css` SOLO aplican dentro del dashboard. Login, landing, blog, docs y futuras non-app quedan automáticamente aisladas.
- **`body.landing-page-active`** — useEffect de landing pages para fondo dark.
- **`#landing-page-root`** — wrapper en Home para CSS scoping de colores custom (`bg-navy-900`).
- **`glass-card`** — incluye `transform: translateZ(0)` para GPU compositing (crítico para WebGL interactions).
- `App.css :root font-size` cambia por breakpoint (10px–18px). Afecta TODOS los rem units globalmente.

## SearchableSelect

- Modo **async** para listar entidades de negocio: `asyncSearch={true}`, `loadOptions(query)`, `minSearchLength={2}`, `debounceMs={300}`. Nunca preload con sync.
- **NO usar** SearchableSelect para input libre (RIF/TaxID/email) — limpia el valor en blur/Tab. Usar `Input` plano + dropdown personalizado. Ver `ComprasManagement.jsx`.

## WebGL effects

- `LightRaysCanvas` (shader custom) y `PrismaticBurst` (OGL raymarching). Ambos usan `IntersectionObserver` para pause cuando offscreen.
- Headers sobre WebGL necesitan GPU layer isolation: `translate3d(0,0,0)` + `backfaceVisibility: hidden` (previene flickering).

## Comandos

```bash
npm run dev               # vite, port 5173
npm run build             # build prod
npm run preview           # preview build
```

## API client

- `src/lib/api.js` — axios con interceptor para `Authorization: Bearer <token>` y `X-Tenant-Id` cuando aplique.
- Token en `localStorage.accessToken` (refrescado automáticamente).
- Endpoints documentados en `../docs/wiki/system-map.md`.

## Convenciones de componente

- Componentes en PascalCase, hooks en camelCase con prefijo `use`.
- Usar `framer-motion` para animaciones, no CSS keyframes (consistencia + control).
- Loading states: skeletons (no spinners en listados).
- Error states: explicit error UI, no silent failures.

## PROMPT-*.md (blueprints UX)

25 archivos en `docs/PROMPT-*.md`. Patrón:

- **Role**: product designer (Notion/Linear/Stripe/Spotify level)
- **Layers**: STRUCTURE (40%) + INTERACTION + CELEBRATION
- **Principles**: Berridge salience, peak-end rule, welcome-back, variable ratio
- **Output**: especificación detallada con problemas identificados, layout breakpoints, tokens, micro-interacciones, criterios de aceptación

Para crear uno nuevo: `/ux-redesign <screen> <platform>`.

## Deploy

```bash
npm run build
rsync dist/ deployer@178.156.182.177:~/smartkubik/food-inventory-admin/dist/
```

`/deploy-saas admin` automatiza esto con build + smoke test post-deploy.
