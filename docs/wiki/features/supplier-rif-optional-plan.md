# Plan: proveedores informales (RIF opcional)

> Estado: **propuesta, sin implementar**. Generado tras implementar el ajuste masivo de inventario (punto 1).
> Origen: insight del usuario — abastos y tiendas naturistas compran a proveedores artesanales sin RIF ni empresa registrada. Exigir RIF bloquea una transacción que ocurre igual, así que el software pierde el dato en vez de ayudar.

## PROBLEMA REAL

Registrar compras a proveedores informales (sin RIF / sin razón social formal) **sin perder integridad fiscal**. Hoy el RIF es obligatorio en 3 capas y, peor, es la **llave de join** Supplier↔Customer y la fuente del RIF que aparece en el Libro de Compras / retenciones.

## Por qué NO es "hacer el campo opcional y ya"

El RIF no es un dato suelto. En [`suppliers.service.ts:89-262`](../../../food-inventory-saas/src/modules/suppliers/suppliers.service.ts#L89-L262) se usa para:

1. **Buscar/crear el Customer** vinculado (`taxInfo.taxId`) — patrón "LINKED PROFILE".
2. **Deduplicar proveedores** (`{ "taxInfo.rif": rif } OR { customerId }`).
3. Fluye a **accounting**: `IvaPurchaseBook`, `IslrWithholdingForm`, `IslrWithholdingList` consumen el RIF del proveedor.

Si se deja vacío sin cuidado aparecen **dos bugs reales**:

- `customerModel.findOne({ "taxInfo.taxId": undefined })` y `supplierModel.findOne({ "taxInfo.rif": undefined })` pueden **machear cualquier registro sin RIF** → devolver un proveedor existente como si el nuevo "ya existiera" (dedupe falso positivo).
- Una compra a proveedor sin RIF entra al Libro de Compras con RIF en blanco → **fila fiscal inválida**.

## ENFOQUE

RIF opcional + marcador explícito de "proveedor informal", con guardas en todas las búsquedas por RIF y manejo definido en los reportes fiscales.

## DECISIÓN PENDIENTE DEL USUARIO (bloqueante para la parte fiscal)

¿Cómo deben aparecer los proveedores informales en los libros fiscales?

- **(A)** Excluirlos del Libro de Compras formal (las compras a informales no se reportan al SENIAT — coherente con que no hay RIF que reportar).
- **(B)** Incluirlos en un bucket "sin RIF / consumidor final" con un identificador genérico.
- **(C)** Permitir registrar la compra pero marcarla como "no fiscal" / solo gestión interna.

El resto del plan (registro del proveedor) es independiente de esta decisión y puede implementarse primero; la integración fiscal espera esta respuesta.

## LO QUE NO SE VA A HACER

- No se borra el RIF del modelo (solo se flexibiliza).
- No se toca la lógica de proveedores formales existentes (su flujo queda intacto).
- No se hace migración de datos (los proveedores actuales conservan su RIF; el flag nuevo default `false`).

---

## Cambios por capa

### 1. DTO — `food-inventory-saas/src/dto/supplier.dto.ts`

[`supplier.dto.ts:85-91`](../../../food-inventory-saas/src/dto/supplier.dto.ts#L85-L91) — hacer `rif` opcional y validar formato **solo si viene**:

```ts
@IsOptional()
@ValidateIf((o) => o.rif !== undefined && o.rif !== '')
@IsString()
@SanitizeString()
@Matches(/^[VEJGPNC]-?\d{7,9}(-\d)?$/, { message: 'RIF debe tener formato válido...' })
rif?: string;

@IsOptional()
@IsBoolean()
isInformal?: boolean;
```

`name` sigue **obligatorio** (un proveedor necesita al menos un nombre). Regla de negocio: exigir `rif` **o** `isInformal === true` (si no hay RIF, debe marcarse informal explícitamente). Validar en el service o con un validador custom.

### 2. Schema — `food-inventory-saas/src/schemas/supplier.schema.ts`

Añadir flag de primera clase (no solo ausencia de RIF):

```ts
@Prop({ type: Boolean, default: false })
isInformal: boolean;
```

Evaluar espejarlo en `Customer` si los reportes fiscales leen del Customer y no del Supplier (verificar de dónde toma el RIF cada libro antes de decidir). El índice `{ "taxInfo.rif": 1, tenantId: 1 }` ([`:197`](../../../food-inventory-saas/src/schemas/supplier.schema.ts#L197)) puede quedar; documentar que `taxInfo.rif` puede ser vacío.

### 3. Service create — `food-inventory-saas/src/modules/suppliers/suppliers.service.ts`

Envolver **toda** búsqueda por RIF en `if (rif)`:

- [`:102-114`](../../../food-inventory-saas/src/modules/suppliers/suppliers.service.ts#L102-L114) — solo buscar Customer por `taxId`/dígitos si hay RIF. Sin RIF → saltar directo a crear Customer.
- [`:158-182`](../../../food-inventory-saas/src/modules/suppliers/suppliers.service.ts#L158-L182) — crear Customer sin `taxInfo.taxId` (o `taxInfo: { taxName: name }` sin `taxId`). Marcar `isInformal`.
- [`:196-204`](../../../food-inventory-saas/src/modules/suppliers/suppliers.service.ts#L196-L204) — **GUARDA CRÍTICA**: el dedupe `{ "taxInfo.rif": rif }` solo aplica si `rif` está presente. Sin RIF, deduplicar por `name` (normalizado) dentro del tenant, o permitir duplicado (decidir; informal admite homónimos).
- [`:233-237`](../../../food-inventory-saas/src/modules/suppliers/suppliers.service.ts#L233-L237) — `taxInfo.rif` queda vacío/omitido; setear `isInformal: true`.

Auditar también `update` ([`:412-414`](../../../food-inventory-saas/src/modules/suppliers/suppliers.service.ts#L412-L414)) y `normalizeRif` ([`:78`](../../../food-inventory-saas/src/modules/suppliers/suppliers.service.ts#L78)) para que toleren entrada vacía.

### 4. Frontend — formulario directo `SupplierDetailDialog.jsx`

- [`:276-277`](../../../food-inventory-admin/src/components/suppliers/SupplierDetailDialog.jsx#L276-L277) — quitar el bloqueo duro `if (!payload.name || !payload.rif)`. Pasar a: `name` obligatorio; si no hay RIF, exigir toggle "Proveedor informal".
- [`:354-388`](../../../food-inventory-admin/src/components/suppliers/SupplierDetailDialog.jsx#L354-L388) — RIF marcado como opcional; validar formato solo si el usuario lo llena.
- Añadir un toggle/checkbox **"Proveedor informal (sin RIF)"** que, al activarse, deshabilita/limpia el campo RIF y envía `isInformal: true`.

### 5. Frontend — creación inline en orden de compra (`ComprasManagement` + `useComprasData.js`)

**Tercer punto de entrada, el más acoplado.** Durante una OC se crea proveedor con `newSupplierRif` ([`useComprasData.js:495-496,642-643`](../../../food-inventory-admin/src/components/compras/useComprasData.js#L495-L496)). Aquí nace el dato que va al Libro de Compras. Requiere:

- Permitir crear el proveedor de la OC sin RIF, marcándolo informal.
- Definir, según la decisión fiscal (A/B/C), cómo se comporta la OC/recepción de un proveedor informal en los libros.

### 6. Accounting / fiscal

Según decisión A/B/C: ajustar `IvaPurchaseBook`, `IslrWithholdingForm`/`List` para tratar proveedores `isInformal` (excluir, bucket "sin RIF", o marcar no-fiscal). **No declarar "done" hasta cerrar esto** — es donde un cambio mal hecho ensucia los reportes al SENIAT.

### 7. Permisos

Revisar checklist de [`adding-permissions-modules.md`](../patterns/adding-permissions-modules.md) **solo si** se introduce un permiso nuevo (probablemente no — se reutiliza `suppliers_*`).

## Tests obligatorios (backend)

- Crear proveedor **sin RIF** con `isInformal: true` → éxito.
- Crear dos informales con mismo nombre → **no** colisionan por el dedupe de RIF vacío (regresión del falso positivo).
- Crear proveedor **con RIF** → flujo formal intacto (no romper).
- Ownership: tenant A no ve/crea proveedores de tenant B (ver `test/ownership-validation.e2e.spec.ts`).
- Fiscal: una compra a proveedor informal aparece donde la decisión A/B/C indique, y **no** como fila con RIF en blanco en el libro formal.

## RIESGOS

- **Dedupe falso positivo** por RIF vacío (mitigado por la guarda del paso 3).
- **Integridad fiscal** si se omite el paso 6 (mitigado bloqueando "done" hasta cerrar A/B/C).
- **Tres puntos de entrada** desincronizados (form directo, OC inline, import de datos) — verificar los tres.

## Orden sugerido de ejecución

1. Backend DTO + schema + service con guardas + tests (independiente de la decisión fiscal).
2. Frontend form directo (`SupplierDetailDialog`).
3. **Esperar decisión A/B/C** → integración fiscal + OC inline.
