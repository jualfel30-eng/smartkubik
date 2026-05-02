# Pattern: Generación segura de números secuenciales

## El problema

Generar números secuenciales humanamente legibles (`PO-000123`, `CLI-000027`, `PROV-000018`, `SKU-000045`) usando `countDocuments()` no es atómico. Bajo concurrencia (clicks rápidos en UI, jobs paralelos, requests simultáneos), múltiples requests leen el mismo conteo y emiten el mismo número, disparando `E11000 duplicate key error` en índices únicos.

## Patrón a aplicar

### MAX+1, no count+1

```ts
async generateSupplierNumber(tenantId: ObjectId): Promise<string> {
  const last = await this.model
    .findOne({ tenantId })
    .sort({ supplierNumber: -1 })
    .select('supplierNumber')
    .lean();

  const lastNum = last?.supplierNumber
    ? parseInt(last.supplierNumber.replace(/\D/g, ''), 10)
    : 0;

  return `PROV-${String(lastNum + 1).padStart(6, '0')}`;
}
```

Sigue sin ser perfectamente atómico, pero reduce drásticamente la ventana de colisión y maneja gaps (eliminados, números no contiguos).

### Defensa con retry sobre E11000

```ts
async createWithRetry(dto: CreateDto, maxRetries = 3): Promise<Doc> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const number = await this.generateNumber(dto.tenantId);
      return await this.model.create({ ...dto, number });
    } catch (err) {
      if (err.code === 11000 && i < maxRetries - 1) continue;
      if (err.code === 11000) {
        throw new ConflictException(
          'Conflicto de numeración. Por favor reintenta la operación.',
        );
      }
      throw err;
    }
  }
}
```

### Atomicidad real (cuando MAX+1 no basta)

Para módulos críticos (facturación, pagos), usar contador dedicado con `findOneAndUpdate` atómico:

```ts
const counter = await this.counterModel.findOneAndUpdate(
  { tenantId, scope: 'invoice' },
  { $inc: { value: 1 } },
  { upsert: true, new: true },
);
return `INV-${String(counter.value).padStart(6, '0')}`;
```

## Cuándo NO aplica

- IDs globales únicos (usa `ObjectId` o `uuid`).
- Números que NO requieren contigüidad ni orden humano (usa `nanoid`).

## Detección automática

La skill [`preflight-tenant-safety`](../../../.claude/skills/preflight-tenant-safety/SKILL.md) advierte cuando ve `countDocuments` seguido de string concatenation que parece numeración.

## Incidentes relacionados

- [2026-03-26 — Supplier race condition](../incidents/2026-03-26-supplier-race-condition.md)
