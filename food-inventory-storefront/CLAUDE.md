# food-inventory-storefront (Next.js 15)

Storefront público genérico (multi-tenant via subdomain). App Router + middleware + Lenis smooth scrolling.

## Antes de tocar

1. Lee `../docs/wiki/storefront/` si existe.
2. Endpoints públicos consumidos están listados en `../docs/wiki/system-map.md` sección 5.

## Estructura

```
src/
├── app/                (App Router pages + layout)
├── components/
├── contexts/           (Cart, Tenant, Theme)
├── templates/          (variantes por vertical)
├── middleware.ts       (resuelve tenant por subdomain)
└── lib/
    └── api.ts          (fetch wrapper)
```

## Reglas

- **Multi-tenant via subdomain**: `<tenant-slug>.smartkubik.com`. `middleware.ts` resuelve y inyecta tenant en headers.
- **Endpoints públicos** (no auth): `/public/products`, `/public/categories`, `/public/menu`, etc. Ver system-map.
- **ISR cuando sea posible**: catálogo, menu (revalidate 60s); cart y checkout son SSR.
- **Tailwind v4**: tokens en `app/globals.css`. No mezclar con styled-components.

## Comandos

```bash
npm run dev               # next dev, port 3001
npm run build             # build prod
npm start                 # next start
```

## Templates

Cada vertical tiene su template (`food`, `restaurant-light`, `beauty`, etc.). El tenant config decide cuál se renderiza.

## Deploy

`/deploy-saas storefront` automatiza el flujo de build + rsync + nginx reload.
