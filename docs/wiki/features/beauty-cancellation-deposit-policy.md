# Blueprint — Política de cancelación del depósito (configurable por tenant)

> **Estado:** propuesta para revisión · **Fecha:** 2026-06-15
> **Origen:** follow-up H3 del feature [depósito de reserva](beauty-deposit-via-payment-requests.md). Cuando una reserva con depósito **ya pagado** se cancela, hoy el asiento (débito Caja 1101 / crédito Anticipos de Clientes 2103) queda intacto y no hay tratamiento. El tenant debe poder elegir su política.

---

## 1. Problema

Una reserva con `depositInfo.paid=true` que se cancela deja el depósito como un **pasivo** (Anticipos de Clientes 2103) sin resolver. Qué debe pasar con ese dinero es una **decisión de negocio del tenant**, no un default hardcodeado. Hoy: sin tratamiento (queda como pasivo, sin UI ni lógica).

## 2. Las 4 políticas (requeridas por el usuario)

| Política | Significado | Modelo |
|---|---|---|
| **Saldo a favor** | El anticipo queda como crédito del cliente para una futura reserva | `mode: 'credit'` |
| **Quedarse con todo** | Penalización total; el negocio se queda el depósito como ingreso | `mode: 'refund', refundPercentage: 0` |
| **Devolver un %** | Reembolso parcial; el resto es ingreso | `mode: 'refund', refundPercentage: N` |
| **Devolver completo** | Reembolso total al cliente | `mode: 'refund', refundPercentage: 100` |

## 3. Config (schema)

En `storefrontConfig.beautyConfig`, hermana de `noShowPolicy` ([storefront-config.schema.ts:217-224](../../../food-inventory-saas/src/schemas/storefront-config.schema.ts#L217)):

```ts
cancellationPolicy?: {
  enabled?: boolean;          // default false → sin tratamiento (comportamiento actual)
  mode?: 'credit' | 'refund'; // default 'credit'
  refundPercentage?: number;  // 0–100, solo para mode='refund'. default 0
};
```

## 4. Lógica contable por modo

Disparada al cancelar una reserva con `depositInfo.paid=true` (§5). `D` = `depositInfo.amount`.

- **`credit`** → **sin asiento**. El anticipo 2103 permanece como saldo a favor. Se marca el booking (`depositInfo.creditedAsBalance=true`) para que el mecanismo de saldo a favor (§6) lo aplique luego.
- **`refund`, `refundPercentage = P`**:
  - `refund = D * P/100`  ·  `forfeit = D - refund`
  - Si `refund > 0` → asiento **reembolso**: débito Anticipos 2103 (`refund`) / crédito Caja 1101 (`refund`). Marca **reembolso pendiente** (salida de dinero real — §6).
  - Si `forfeit > 0` → asiento **ingreso por penalización**: débito Anticipos 2103 (`forfeit`) / crédito Ingresos (cuenta 4xxx, `forfeit`).
  - `P=0` → solo ingreso (forfeit total). `P=100` → solo reembolso.

**Implementación:** nuevos métodos en `AccountingService` reusando `createJournalEntry` + `findOrCreateAccount` ([accounting.service.ts:174,298](../../../food-inventory-saas/src/modules/accounting/accounting.service.ts#L174)), p.ej. `createJournalEntryForDepositRefund(...)` y `createJournalEntryForDepositForfeit(...)`, espejando el patrón de `createJournalEntryForManualDeposit`.

## 5. Hook de cancelación

En `updateStatus` ([beauty-bookings.service.ts:627](../../../food-inventory-saas/src/modules/beauty/services/beauty-bookings.service.ts#L627)), rama `dto.status === 'cancelled'`:

```
si previousStatus !== 'cancelled' y booking.depositInfo?.paid:
   policy = storefrontConfig.beautyConfig.cancellationPolicy
   si policy?.enabled:
      aplicar §4 según policy.mode/refundPercentage
      registrar en booking (depositInfo.cancellationOutcome, refundPending, etc.)
```

> **Importante:** el **job de expiración** (Fase B del depósito) cancela solo holds **no pagados** (`paymentStatus='unpaid'`), así que la política NO aplica ahí — solo a cancelaciones de reservas ya pagadas (manual/admin). No tocar el job.

## 6. Decisiones abiertas (a definir antes de codear)

1. **Reembolso real del dinero (`mode='refund'`)**: el asiento refleja la salida, pero ¿quién ejecuta el reembolso?
   - (a) Solo registrar el asiento + marcar `refundPending=true` y que el negocio pague por fuera (manual). ← más simple, recomendado para v1.
   - (b) Integrar con bancos/caja para registrar la salida real.
2. **Mecanismo de "saldo a favor" (`mode='credit'`)**: dejar el pasivo es trivial; **aplicarlo a una futura reserva** es otra pieza (crédito por cliente + descontarlo en el próximo pago). ¿v1 solo deja el pasivo + lo muestra, y la aplicación viene después?
3. **Cuenta de Ingresos** para el forfeit: ¿una dedicada ("Ingresos por penalización de cancelación", nueva 4xxx) o una de ingresos existente?
4. **No-show → v2 (decidido).** v1 aplica solo a cancelación explícita (`cancelled`). El tratamiento del depósito en no-show se hará en v2 (encaja con el mecanismo de penalización de no-show ya existente).
5. **Reembolso parcial**: ¿el % lo fija la config global del tenant, o el admin puede ajustarlo caso por caso al cancelar?

## 7. Fases

| Fase | Alcance | Entregable |
|---|---|---|
| **1** ✅ | Backend: schema `cancellationPolicy` + hook en `updateStatus` + `createJournalEntryForDepositCancellation` (refund→Caja 1101 / forfeit→Ingresos 4104). v1: §6.1(a) refundPending, §6.2 solo pasivo, no-show→v2. | **Verificado en prod**: refund 50% de $7.50 → asiento D:2103 7.50 / C:1101 3.75 / C:4104 3.75; `depositInfo.cancellationOutcome` con refundPending. |
| **2** | Admin UI: selector de política en Configuración del negocio (beauty) | El tenant configura su política |
| **3** (futuro) | Aplicación del saldo a favor a futuras reservas; integración de reembolso real con caja | — |

## 8. Riesgos

- **Doble tratamiento**: garantizar idempotencia — cancelar una reserva ya cancelada no debe re-generar asientos (guard `previousStatus !== 'cancelled'`).
- **Cuenta de ingresos inexistente**: usar `findOrCreateAccount` para no fallar si la cuenta 4xxx no existe.
- **Coherencia con `depositInfo`**: registrar el outcome en el booking para auditoría y para que la UI muestre qué pasó con el depósito.
- **No-show vs cancelación**: definir §6.4 para no dejar un hueco.

---

### Anchors
- Config: `food-inventory-saas/src/schemas/storefront-config.schema.ts` (beautyConfig)
- Hook: `food-inventory-saas/src/modules/beauty/services/beauty-bookings.service.ts` (`updateStatus`)
- Asientos: `food-inventory-saas/src/modules/accounting/accounting.service.ts`
- Feature base: [beauty-deposit-via-payment-requests.md](beauty-deposit-via-payment-requests.md)
