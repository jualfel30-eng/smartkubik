---
title: "Cuentas por Pagar y Cuentas Bancarias"
description: "Cómo gestionar deudas con proveedores, registrar pagos, conciliar cuentas bancarias, y hacer transferencias entre cuentas."
category: "finanzas"
slug: "cuentas-por-pagar"
keywords: ["cuentas por pagar", "banco", "conciliación", "transferencia", "pago a proveedor"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "8 min"
industry: "Todas"
problem: "Necesitas llevar control de las deudas con proveedores y gestionar tus cuentas bancarias."
solution: "SmartKubik genera cuentas por pagar automáticamente desde compras, permite pagos parciales, y gestiona cuentas bancarias con conciliación."
quickAnswer: |
  1. Ve a Finanzas → Cuentas por Pagar
  2. Verás todas las deudas pendientes
  3. Para pagar: selecciona la deuda → "Registrar Pago"
  4. Conciliar banco: Finanzas → Bancos → Conciliar
---

# Cuentas por Pagar y Cuentas Bancarias

## Cuentas por Pagar

**Ruta:** Finanzas → Cuentas por Pagar (`/accounts-payable`)

### ¿De dónde salen las cuentas por pagar?
Se crean **automáticamente** al recibir una orden de compra. No necesitas crearlas manualmente (aunque puedes para gastos no relacionados a compras).

### Ciclo de vida
1. **Abierta** — Deuda pendiente de pago
2. **Parcialmente pagada** — Se hicieron pagos pero falta
3. **Pagada** — Saldo en 0
4. **Anulada** — Cancelada (sin pago)

### Registrar un pago
1. Abre la cuenta por pagar
2. Registra el pago: monto, método, referencia, cuenta bancaria
3. Si el pago es parcial, la cuenta queda como "Parcialmente pagada"
4. Al completar el pago, se genera un asiento contable automáticamente

### Filtros útiles
- **Por moneda** — Para ver solo deudas en USD o VES
- **Vencidas** — Deudas que ya pasaron su fecha de vencimiento
- **Por antigüedad** — 0-30 días, 30-60, 60-90, más de 90

---

## Cuentas Bancarias

**Ruta:** Finanzas → Cuentas Bancarias (`/bank-accounts`)

### Crear una cuenta
1. Haz clic en **"+ Nueva Cuenta"**
2. Indica: banco, número de cuenta, tipo (corriente/ahorro/nómina), moneda, saldo inicial
3. Configura métodos de pago aceptados (ej: Pago Móvil, transferencia)
4. Opcional: activa alertas de saldo mínimo

### El saldo se actualiza automáticamente
Cada pago registrado con una cuenta bancaria actualiza el saldo:
- **Cobro de venta** → saldo sube
- **Pago a proveedor** → saldo baja

### Ajuste manual de saldo
Si necesitas corregir el saldo (ej: comisión bancaria):
1. Abre la cuenta → "Ajustar saldo"
2. Indica si es aumento o disminución
3. Monto y razón
4. Se registra la transacción

---

## Problemas comunes

### "Mi cuenta bancaria muestra un saldo incorrecto"

**Causas:**
- Se registró un pago con la cuenta equivocada
- Falta registrar una comisión o cargo bancario

**Solución:** Usa "Ajustar saldo" para corregir, con razón documentada. Revisa las transacciones de la cuenta para encontrar la discrepancia.

### "¿Cómo sé cuánto debo en total?"

En la vista de Cuentas por Pagar, las tarjetas de resumen en la parte superior muestran el total pendiente por moneda.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
