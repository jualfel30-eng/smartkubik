# Local dev — troubleshooting recurrente

> **Doc interno**. Síntomas comunes durante desarrollo local en SmartKubik
> y la receta para resolverlos en segundos sin pasar 30 minutos buscando.
> Última actualización: 2026-05-14

---

## Storefront (Next.js 15)

### `Cannot find module './vendor-chunks/X.js'` o `__webpack_modules__[moduleId] is not a function`

**Síntoma**: el storefront tira un error 500 al cargar una página, con un
stack trace que apunta a algo en `.next/server/webpack-runtime.js` o
`chunks/...` que "no existe" o "no es función".

**Causa**: cache corrupto de Next.js. Pasa típicamente después de:
- Agregar un import nuevo a un módulo que ya estaba compilado
- Cambiar la lista de packages en `package.json`
- Cambiar middleware mientras el dev server está corriendo
- HMR queda en mal estado tras un crash

**Fix**:

```bash
# 1. Parar el dev server (Ctrl+C)
# 2. Nukear el cache
rm -rf food-inventory-storefront/.next
# 3. Volver a arrancar
cd food-inventory-storefront && npm run dev
```

Primera carga después de esto tarda 2-5 s extra (compilación on-demand).
Pasada esa, vuelve a velocidad normal.

**Cuándo NO usar este fix**: si el error persiste *después* de
`rm -rf .next`, es código real roto, no cache. Mirar el stack trace en
serio.

### Middleware no se actualiza tras editarlo

**Síntoma**: editaste `middleware.ts` (e.g. agregaste un path exempt) y
las rutas siguen comportándose con la lógica vieja.

**Causa**: Next.js middleware lo carga **una vez al startup**. HMR NO lo
re-evalúa, hay que matar el proceso.

**Fix**: full restart del dev server. Mismo `rm -rf .next` si querés
estar 100% seguro.

### `localhost:3001/pago/<token>` devuelve 404 aunque la PR existe

Posibles causas en orden de frecuencia:

1. **`NEXT_PUBLIC_API_URL=https://api.smartkubik.com` en `.env.local`** —
   el storefront SSR fetchea contra prod, donde el PR local no existe.
   Solución: usar `getApiBaseUrl()` (helper hostname-aware en `lib/api.ts`)
   en vez de la constante hardcoded. Ver
   [adding-permissions-modules.md](./adding-permissions-modules.md) para
   por qué no recomendamos toggle manual de env vars entre entornos.

2. **El backend devolvió 401/403/404** — mi page.tsx llama `notFound()`.
   Curlear directo para confirmar:
   ```bash
   curl -i "http://localhost:3000/api/v1/public/payment-portal/<token>"
   ```

3. **Middleware reescribió la ruta** — si pusiste un path nuevo y no
   está en la lista de exempt (`/api`, `/_next`, `/pago/`, etc.),
   middleware lo lleva a `/<domain>/<path>` que no matchea.

## Backend (NestJS / Mongoose)

### Query con `findOne({ tenantId: stringFromJwt })` devuelve null aunque el doc existe

**Síntoma**: el `findOne` no encuentra documents que claramente están en
la DB. Reproduce: el mismo query con `tenantId: new Types.ObjectId(str)`
SÍ encuentra el doc.

**Causa**: Mongoose autocastea strings a ObjectId **sólo para `_id`** de
forma confiable. Para otros campos declarados como `Types.ObjectId` bajo
`@nestjs/mongoose`, el autocast falla en ciertas combinaciones (especialmente
con `@Prop({ type: Types.ObjectId, ref: "X", ... })`).

**Fix**: castear explícitamente en TODA query.

```ts
// ❌ MAL
await this.model.findOne({ tenantId: claims.tenantId, _id: id });

// ✓ BIEN
await this.model.findOne({
  tenantId: new Types.ObjectId(claims.tenantId),
  _id: new Types.ObjectId(id),
});
```

Ver [objectid-vs-string.md](./objectid-vs-string.md) — pattern
pre-existente que es fácil de olvidar.

### Nodemon recarga pero el endpoint sigue devolviendo lo viejo

**Síntoma**: editaste un service / controller, ves en la terminal de
`npm run start:dev` que nodemon hizo reload, pero el curl sigue
devolviendo el comportamiento anterior.

**Causa**: nodemon re-ejecuta el proceso pero el handshake con el
puerto tarda 3-6 s después del log "successfully". Durante ese gap los
requests llegan y o son rechazados (`connection refused`, código 000) o
hit caché en TypeScript watcher.

**Fix**: esperar 5-8 segundos después del log de reload antes de
curlear. Si el endpoint sigue dando lo viejo después de 10s, revisar
que el archivo editado realmente compiló (typecheck error silencioso).

### `npm test` revienta con `JavaScript heap out of memory`

**Síntoma**: Jest tira un v8 crash con `out of memory` antes de empezar
a correr tests.

**Causa**: el monorepo tiene 169 schemas + 185 DTOs y ts-jest los
intenta cargar todos al descubrir specs. Default heap es 4 GB.

**Fix**:

```bash
NODE_OPTIONS="--max-old-space-size=8192" npm test -- --maxWorkers=1
```

Si esto persiste, especificar un patrón estrecho:
```bash
NODE_OPTIONS="--max-old-space-size=8192" \
  node ./node_modules/.bin/jest "test/unit/<feature>/" \
  --maxWorkers=1 --forceExit
```

## Mongo (Atlas / local)

### "Permission appeared in seed but not in super-admin UI"

Ver el incident del 2026-05-14 y el [pattern de permisos](./adding-permissions-modules.md).
Resumen: hay 4 fuentes de verdad para permisos, no sólo el seed.

### Bootstrap scripts no encuentran la DB

**Síntoma**: `npm run db:bootstrap:*` tira `ECONNREFUSED` o conecta a la
DB equivocada.

**Causa**: el script usa `MONGODB_URI` del `.env`. Si no está seteada,
defaultea a `mongodb://localhost:27017/food-inventory-saas` (que casi
seguro no es donde está tu data).

**Fix**: verificar `.env`:
```bash
grep MONGODB_URI food-inventory-saas/.env
```

Y si apunta a Atlas, confirmar que tenés conectividad:
```bash
mongosh "<la-uri>" --eval "db.adminCommand('ping')"
```

## Frontend (admin React + Vite)

### `__webpack_modules__[moduleId] is not a function` en el admin

**Causa**: igual que el storefront pero adaptado a Vite.

**Fix**:
```bash
rm -rf food-inventory-admin/node_modules/.vite
rm -rf food-inventory-admin/dist
# Restart npm run dev
```

### Cambios al `.env` no se reflejan

**Síntoma**: editaste `.env`, Vite hot-reload mostró un toast de cambio
detectado, pero `import.meta.env.VITE_X` sigue devolviendo el valor viejo.

**Causa**: Vite lee `.env` UNA vez al startup. HMR no re-evalúa env vars
incluso si ve el archivo cambiar.

**Fix**: full restart de `npm run dev`.

## Reglas generales

1. **"Probé y no anda"**: antes de re-leer código por horas, hacer
   `rm -rf .next` (storefront) o `rm -rf node_modules/.vite` (admin).
   Resuelve el 60% de los casos misteriosos.
2. **"Hice un cambio chico y rompió todo"**: mirar primero el cache.
3. **"El error no aparece en local pero sí en staging"**: env vars o
   migraciones que no corriste. Ver el playbook de bootstrap scripts.
4. **"Funcionaba ayer"**: package.json cambió, deps nuevas no instaladas.
   `npm install`.

Si encontrás un caso nuevo de papercut recurrente, agregalo acá.
