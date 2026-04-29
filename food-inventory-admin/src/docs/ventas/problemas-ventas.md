---
title: "Problemas Comunes de Ventas y Cómo Resolverlos"
description: "Soluciones a: pagos que no se registran, IGTF incorrecto, orden que no se puede completar, caja que no cuadra, y más."
category: "ventas"
slug: "problemas-ventas"
keywords: ["problemas", "ventas", "pago", "IGTF", "caja", "error", "solución"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "6 min"
industry: "Todas"
problem: "Algo no funciona como esperas en las ventas, pagos, o caja registradora."
solution: "Guía de diagnóstico rápido para los problemas más frecuentes."
quickAnswer: |
  Pago no registra: verifica que la caja esté abierta.
  IGTF incorrecto: revisa Configuración → Impuestos.
  Caja no cuadra: revisa movimientos manuales del turno.
---

# Problemas Comunes de Ventas

---

## Órdenes

### "No puedo completar la orden (el botón está gris)"

Para completar una orden necesitas **dos cosas**:
1. ✅ Que esté **pagada al 100%** (paymentStatus = "paid")
2. ✅ Que tenga un **documento fiscal** emitido (factura o nota de entrega)

**Solución:** Verifica en el historial de órdenes que el status de pago sea "Pagado" (verde). Si falta la factura, haz clic en "Facturar".

### "La orden se completó pero dice 'Confirmada' en vez de 'Completada'"

**Explicación:** Depende de la **estrategia de fulfillment** configurada:
- **Inmediato** (venta en mostrador): Se completa directamente
- **Counter** (retiro): Queda en "Confirmada/Picking" hasta que el cliente retire
- **Logística** (envío): Queda en "Confirmada/Pendiente" hasta que se despache

Esto se configura en **Configuración** → **Entregas**.

### "Cancelé una orden pero no aparece como cancelada"

La cancelación puede tomar unos segundos porque el sistema revierte los movimientos de inventario en background. Recarga la página después de un momento.

---

## Pagos

### "Registré un pago pero el monto pagado sigue en 0"

**Causa posible:** El pago se creó como "borrador" o "pendiente de validación" en vez de "confirmado".

**Solución:** Abre la orden → ve los pagos registrados → confirma el pago (si hay botón de confirmar).

### "El IGTF está mal calculado"

El IGTF (3%) solo aplica sobre pagos en **divisas** (USD). Recuerda:
- Efectivo USD → **Sí** aplica IGTF
- Zelle → **Sí** aplica IGTF
- Transferencia USD → **Sí** aplica IGTF
- Pago Móvil VES → **No** aplica IGTF
- POS/Tarjeta VES → **No** aplica IGTF

Si pagas $50 USD + Bs 200,000: IGTF = $50 × 3% = **$1.50** (no el 3% del total).

### "¿Cómo cobro con dos métodos de pago diferentes?"

El POS soporta **multi-pago**. Al abrir el diálogo de pago:
1. Registra el primer pago (ej: $50 en efectivo)
2. El sistema muestra el **saldo restante**
3. Registra el segundo pago con otro método (ej: Bs 200,000 en pago móvil)
4. Repite hasta que el saldo sea 0

### "El cliente quiere vuelto en Bolívares pero pagó en dólares"

Al registrar un pago en efectivo USD donde el monto entregado supera el total:
1. El sistema abre un diálogo de **vuelto mixto**
2. Puedes especificar cuánto vuelto en USD y cuánto en VES
3. Si das vuelto en VES vía Pago Móvil, selecciona el método

---

## Caja Registradora

### "La caja tiene más dinero del esperado (sobrante)"

**Causas comunes:**
- Un movimiento de **entrada** no se registró en el sistema (alguien metió dinero a la caja sin anotarlo)
- Un vuelto se dio de menos

**Solución:** Registra el sobrante con razón "Corrección" al cierre. El supervisor revisará.

### "La caja tiene menos dinero del esperado (faltante)"

**Causas comunes:**
- Un gasto no se registró (ej: compraste agua y no anotaste la salida)
- Un vuelto se dio de más
- Un pago en efectivo se registró pero el cliente pagó con otro método

**Solución:** Revisa el desglose por método de pago en el cierre. A menudo el faltante se explica porque una venta "en efectivo" en realidad fue "con tarjeta".

### "No me aparece la opción de cerrar caja"

Necesitas el permiso **`cash_register_close`**. Si no lo tienes, contacta al administrador para que te asigne un rol con ese permiso.

---

## Facturación

### "No puedo emitir factura (sale error)"

**Causas posibles:**
1. La orden no tiene un **cliente con RIF** → agrega el RIF del cliente antes de facturar
2. No hay **secuencias de facturación** configuradas → ve a Facturación → Secuencias y crea una
3. La secuencia está **pausada o cerrada** → actívala

### "¿Cuál es la diferencia entre Factura y Nota de Entrega?"

| | Factura | Nota de Entrega |
|---|---------|-----------------|
| **Impuestos** | Incluye IVA e IGTF | Sin impuestos |
| **Uso** | Venta fiscal formal | Entrega de mercancía |
| **Número de control** | Sí (asignado por sistema) | No |
| **Para el SENIAT** | Sí | No |

**Cuándo usar Nota de Entrega:** Cuando entregas mercancía y la factura se genera después, o cuando el cliente no necesita factura fiscal.

---

*¿Tu problema no está aquí? Usa el Asistente IA (✨) — puede revisar tus órdenes y pagos en tiempo real.*
