# food-inventory-saas (Backend NestJS)

Backend monolítico que sirve a admin + 2 storefronts + integraciones. 118 módulos, 169 schemas, 185 DTOs.

## Antes de tocar un módulo

1. Lee `../docs/wiki/system-map.md` (sección del módulo).
2. Lee `../docs/wiki/modules/<X>.md` si existe.
3. Si el módulo aparece en `../docs/wiki/incidents/`, lee al menos los más recientes.

## Estructura por módulo

Cada módulo en `src/modules/<X>/` sigue el patrón:

```
<X>/
├── dto/
│   ├── create-<X>.dto.ts
│   ├── update-<X>.dto.ts
│   └── query-<X>.dto.ts
├── schemas/
│   └── <X>.schema.ts
├── <X>.controller.ts
├── <X>.service.ts
├── <X>.module.ts
└── <X>.service.spec.ts
```

## Reglas críticas (no negociables)

- **Tenant isolation**: todo controller protegido pasa por `JwtAuthGuard + TenantGuard`. Todo método de service recibe `tenantId` como argumento explícito y lo usa en todo `find/update/delete/aggregate`. Ver `../docs/wiki/patterns/tenant-isolation.md`.
- **ObjectId vs String**: campos como `tenantId`, `productId`, `supplierId`, `customerId`, `warehouseId` están a veces String, a veces ObjectId. Queries usar `$in: [str, new Types.ObjectId(str)]`. Ver `../docs/wiki/patterns/objectid-vs-string.md`.
- **Soft-delete**: filtra siempre con `{ isDeleted: { $ne: true } }`, nunca `{ isDeleted: false }`. Ver pattern.
- **Multi-unit items**: preserva `selectedUnit`, `conversionFactor`, `unitOfMeasure` en TODO mapping DTO ↔ Schema.
- **Sequential numbers**: usa MAX+1, no `countDocuments()`. Ver pattern.

## Comandos

```bash
npm run start:dev          # nodemon, port 3000
npm run build              # nest build
npm test                   # jest unit
npm run test:e2e           # jest E2E
npm run test:security      # 73 tests de seguridad (sanitization, rate-limit, ownership, CSP)
npm run lint               # eslint --fix
```

## Tests obligatorios al añadir endpoint nuevo

- Unit del service
- Ownership validation: tenant A no puede leer/modificar entidades de tenant B (ver `test/ownership-validation.e2e.spec.ts` como referencia).
- Si toca búsqueda: pagination con `limit/page`, no asumir que el resultado cabe en 20 items.

## Auth

- Login: `POST /api/v1/auth/login` → `{ data: { accessToken, refreshToken, user, tenant } }`.
- Tenant ID: extraído del JWT por `TenantGuard`, inyectado como `request.tenantId` (ya `ObjectId`).
- Rutas públicas declaradas en `../docs/wiki/system-map.md` sección 5.

## Eventos del sistema

Ver `../docs/wiki/system-map.md` sección 6. Resumen: 6 eventos con listeners (`order.created` → consumables deduction; `billing.document.issued` → accounting journal entry).

## Migraciones

- Hoy: scripts en `scripts/migrations/` ejecutados manualmente o via endpoint `POST /migrations/<name>`.
- Próximamente: skill `/migration-create <name>` orquesta scaffold + ejecución + verificación.

## Deploy

```bash
npx nest build
rsync dist/ deployer@178.156.182.177:/home/deployer/smartkubik/api/dist/
ssh deployer@178.156.182.177 "pm2 reload smartkubik-api"
```

`/deploy-saas saas` automatiza esto con pre/post checks.
