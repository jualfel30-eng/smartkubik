# Saldo a favor — Modelo de datos

## Colección `storecreditaccounts`

Un documento por cliente y tenant. Schema: `src/modules/store-credit/schemas/store-credit.schema.ts`.

| Campo | Tipo | Notas |
|---|---|---|
| `tenantId` | ObjectId | |
| `customerId` | ObjectId → Customer | |
| `balance` | Number (default 0) | Saldo actual (USD). Mutado atómicamente con `$inc`. |
| `currency` | String (default USD) | |

Índice único `{ tenantId, customerId }`.

## Colección `storecreditmovements` (ledger, append-only)

| Campo | Tipo | Notas |
|---|---|---|
| `tenantId` / `customerId` | ObjectId | |
| `type` | String enum | `credit` \| `debit`. |
| `amount` | Number | Monto del movimiento (USD). |
| `balanceAfter` | Number | Saldo resultante — nunca se recalcula. |
| `source` | String enum | `return` \| `order_redemption` \| `manual`. |
| `referenceId` | ObjectId | orderId / returnId. |
| `reference` | String | `RET-2026-0001` / `ORD-...`. |
| `reason` / `createdBy` | | |

Índice `{ tenantId, customerId, createdAt: -1 }`.

## Gotchas

- `balance` **nunca** se lee-y-escribe: `credit`=`$inc` upsert, `debit`=`findOneAndUpdate` con filtro `balance >= amount`. A prueba de carreras.
- Saldo denominado en **USD**. Una devolución pagada parcialmente en VES convierte esa porción a USD con la tasa de la propia orden (`totalAmountVes / totalAmount`).
