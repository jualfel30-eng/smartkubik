# restaurant-storefront (Next.js 14)

Storefront público específico para restaurantes (booking, menu, cart, checkout). React Query + Framer Motion + Zod + React Hook Form.

## Antes de tocar

1. Lee `../docs/verticals/` para playbook de restaurant/hospitality.
2. Lee `../docs/wiki/system-map.md` sección de endpoints públicos.
3. Para cambios de UX: revisa los `PROMPT-*.md` relevantes en `../food-inventory-admin/docs/`.

## Estructura

```
src/
├── app/                (App Router)
├── components/
│   ├── booking/
│   ├── menu/
│   ├── cart/
│   └── checkout/
├── lib/
└── styles/
```

## Reglas

- **Server actions** para mutaciones críticas (reservation, checkout). Validación con Zod en client + server.
- **React Query** para fetch de menu/availability con cache. Invalidación granular por tenant.
- **Booking flow**: ver `../docs/verticals/hospitality-deposit-playbook.md` para reglas de depósito.

## Comandos

```bash
npm run dev               # next dev, port 3002
npm run build             # build prod
```

## Diferencia con food-inventory-storefront

- food-inventory-storefront es **genérico** (multi-vertical via templates).
- restaurant-storefront es **específico** para restaurantes con flujos de booking + table management.
- Eventualmente serán consolidados (decisión pendiente).

## Deploy

`/deploy-saas storefront --target=restaurant` para deploy aislado.
