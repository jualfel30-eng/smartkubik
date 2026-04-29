# Cuentas Bancarias

## ¿Qué es?

El módulo de Cuentas Bancarias es la **bóveda digital del negocio** — gestiona todas las cuentas del negocio en diferentes bancos y monedas, registra cada transacción (depósitos, retiros, transferencias, comisiones), y facilita la reconciliación bancaria.

## Funcionalidades principales

- **Multi-cuenta**: Múltiples cuentas en diferentes bancos y monedas (USD/VES)
- **Tipos de cuenta**: Corriente, ahorro, nómina, otra
- **Balance automático**: Se actualiza con cada pago recibido/enviado
- **Transacciones**: Depósitos, retiros, POS, pago móvil, transferencias, comisiones, ajustes
- **Reconciliación**: Matching de transacciones con extracto bancario
- **Transferencias inter-cuenta**: Movimiento entre cuentas propias (con movimiento vinculado)
- **Alertas de saldo**: Notificación cuando el saldo cae bajo el mínimo configurado
- **Import de extractos**: Carga de estados de cuenta para reconciliación
- **Integración con Payments**: Cada pago con bankAccountId actualiza saldo + crea transacción

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/bank-accounts` | Crear cuenta |
| GET | `/api/v1/bank-accounts` | Listar cuentas |
| PATCH | `/api/v1/bank-accounts/:id` | Actualizar |
| DELETE | `/api/v1/bank-accounts/:id` | Eliminar |
| POST | `/api/v1/bank-accounts/:id/adjust` | Ajuste manual de saldo |
| GET | `/api/v1/bank-accounts/balances` | Saldos agrupados por moneda |
| GET | `/api/v1/bank-transactions` | Listar transacciones |
| POST | `/api/v1/bank-transfers` | Transferencia entre cuentas |
| POST | `/api/v1/bank-statements/import` | Importar extracto |

## Schema clave: BankAccount

- `bankName`, `accountNumber`, `accountType` (corriente/ahorro/nómina)
- `currency` (USD/VES), `initialBalance`, `currentBalance`
- `acceptedPaymentMethods[]`
- `alertEnabled`, `minimumBalance`
- `isActive`, `lastReconciliationDate`

## Schema: BankTransaction

- `bankAccountId`, `type` (credit/debit), `amount`, `transactionDate`
- `channel`: pago_movil, transferencia, pos, deposito_cajero, fee, interest, ajuste_manual
- `counterpart`: name, rif, phone, bank, accountNumber
- `reconciliationStatus`: pending / matched / manually_matched / rejected
- `paymentId` → Payment (vinculado)
- `linkedMovementId` → BankTransaction (para transfers entre cuentas)

---

*Última actualización: 2026-04-28*
*Archivos fuente: `modules/bank-accounts/`*
