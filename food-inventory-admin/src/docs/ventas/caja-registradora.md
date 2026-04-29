---
title: "Cómo Abrir, Usar y Cerrar la Caja Registradora"
description: "Todo sobre el ciclo de la caja: apertura con conteo de billetes, movimientos durante el turno, y cierre con cuadre automático."
category: "ventas"
slug: "caja-registradora"
keywords: ["caja registradora", "apertura", "cierre", "cuadre", "billetes", "denominaciones", "turno"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "8 min"
industry: "Todas"
problem: "Necesitas controlar el efectivo en tu caja: cuánto hay al abrir, cuánto entra/sale durante el turno, y cuánto debe haber al cerrar."
solution: "SmartKubik gestiona el ciclo completo de la caja con conteo de denominaciones, movimientos documentados, y detección automática de diferencias."
quickAnswer: |
  Abrir: Caja → Abrir Caja → cuenta billetes → confirma.
  Cerrar: Caja → Cerrar Caja → cuenta billetes → el sistema compara con ventas → confirma.
---

# Cómo Abrir, Usar y Cerrar la Caja Registradora

## ¿Dónde está?

**Menú lateral:** Finanzas → Cierre de Caja

**Ruta directa:** `/cash-register`

---

## Abrir la caja

1. Haz clic en **"Abrir Caja"**
2. Ingresa el **nombre de la caja** (ej: "Caja 1", "Caja Principal")
3. Selecciona el **turno**: Mañana, Tarde, o Noche
4. **Cuenta los billetes** que tienes al inicio:
   - Para USD: cuántos de $100, $50, $20, $10, $5, $1, y monedas
   - Para VES: cuántos de cada denominación
5. El sistema calcula el total automáticamente
6. Agrega notas si es necesario
7. Haz clic en **"Abrir"**

> **Importante:** Solo puedes tener UNA caja abierta a la vez. Y el nombre de la caja no puede estar en uso por otro cajero.

---

## Durante el turno

### Ventas automáticas
Cada venta que hagas desde el POS se asocia automáticamente a tu caja abierta. No necesitas hacer nada extra.

### Movimientos de caja (entradas y salidas)

Si necesitas registrar dinero que entra o sale de la caja **fuera de una venta**:

1. Haz clic en **"Registrar movimiento"**
2. Selecciona: **Entrada** o **Salida**
3. Ingresa el **monto** y **moneda** (USD o VES)
4. Selecciona la **razón**:
   - **Cambio** — Necesitas billetes menores para dar vuelto
   - **Gasto operativo** — Compraste algo para la tienda
   - **Depósito bancario** — Retiras dinero para depositar
   - **Corrección** — Ajuste por error
   - **Otro**
5. Agrega una descripción y referencia (opcional)

---

## Cerrar la caja

1. Haz clic en **"Cerrar Caja"**
2. **Cuenta los billetes** que tienes al final (igual que al abrir)
3. Ingresa la **tasa de cambio** actual (USD/VES)
4. Agrega notas si es necesario
5. El sistema calcula automáticamente:

| Concepto | Fórmula |
|----------|---------|
| **Esperado USD** | Apertura + Ventas en USD - Vueltos dados + Entradas - Salidas |
| **Esperado VES** | Apertura + Ventas en VES - Vueltos dados + Entradas - Salidas |
| **Diferencia** | Lo que declaras - Lo que debería haber |

6. Resultado:
   - ✅ **Cuadra** (diferencia < $0.01) — Se aprueba automáticamente
   - ⚠️ **Sobrante** (declaras más de lo esperado) — Queda pendiente de aprobación
   - ❌ **Faltante** (declaras menos) — Queda pendiente de aprobación

7. El supervisor puede **aprobar** o **rechazar** el cierre

---

## Ver cierres anteriores

En la pestaña **Historial** puedes ver todos los cierres con:
- Fecha y cajero
- Total de transacciones
- Ventas totales por moneda
- Si hubo diferencias
- Estado (aprobado/pendiente/rechazado)

---

## Problemas comunes y soluciones

### "La caja dice que me falta dinero pero yo conté bien"

**Posibles causas:**
- Diste vuelto de más en alguna venta
- Un movimiento de salida no se registró (ej: compraste algo y no lo anotaste)
- El sistema suma las ventas por el monto **total de la orden** — si un cliente pagó parte con tarjeta y parte en efectivo, solo la parte en efectivo debería estar en caja

**Solución:** Revisa los movimientos detallados del turno. El cierre muestra un desglose por método de pago.

### "No puedo abrir una caja"

**Causas:**
1. Ya tienes una caja abierta → ciérrala primero
2. Otro cajero tiene una caja con el mismo nombre abierta → usa otro nombre

### "El cierre quedó 'pendiente de aprobación', ¿qué hago?"

Solo un supervisor con permiso `cash_register_approve` puede aprobar o rechazar. Contacta a tu supervisor.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
