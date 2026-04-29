---
title: "Contabilidad: Plan de Cuentas, Asientos y Reportes"
description: "Cómo funciona la contabilidad en SmartKubik: plan de cuentas, asientos automáticos, estados financieros, y períodos contables."
category: "finanzas"
slug: "contabilidad-general"
keywords: ["contabilidad", "plan de cuentas", "asiento", "balance", "P&L", "período contable"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "12 min"
industry: "Todas"
problem: "Necesitas llevar la contabilidad de tu negocio con plan de cuentas, asientos, y reportes financieros."
solution: "SmartKubik genera asientos contables automáticamente desde ventas, compras, pagos, y nómina. Incluye reportes financieros y compliance fiscal venezolana."
quickAnswer: |
  1. Ve a Finanzas → Contabilidad
  2. El plan de cuentas viene preconfigurado
  3. Los asientos se generan automáticamente con cada venta/compra
  4. Para reportes: Finanzas → Reportes → selecciona Balance o Estado de Resultados
---

# Contabilidad: Plan de Cuentas, Asientos y Reportes

## ¿Dónde está?

**Menú lateral:** Finanzas → Contabilidad General (`/accounting`)

---

## Plan de Cuentas

El plan de cuentas viene pre-configurado con las cuentas más comunes. Está organizado en 5 tipos:

| Código | Tipo | Ejemplo |
|--------|------|---------|
| **1xx** | Activo | Caja, Cuentas por Cobrar, Inventario |
| **2xx** | Pasivo | Cuentas por Pagar, IVA por Pagar |
| **3xx** | Patrimonio | Capital, Utilidades Retenidas |
| **4xx** | Ingreso | Ventas, Descuentos (contra) |
| **5xx** | Gasto | Costo de Ventas, Mermas, IGTF |

Puedes crear cuentas nuevas — el sistema genera el código automáticamente.

---

## Asientos Contables

### Automáticos (no necesitas hacer nada)
SmartKubik genera asientos automáticamente cuando:
- **Vendes** → Debita CxC, Acredita Ventas + IVA
- **Cobras** → Debita Caja, Acredita CxC
- **Compras** → Debita Inventario, Acredita CxP
- **Pagas CxP** → Debita CxP, Acredita Caja
- **Ejecutas nómina** → Debita Gastos, Acredita CxP/Banco
- **Registras merma** → Debita Mermas, Acredita Inventario
- **Emites factura** → Asiento en VES con la tasa del momento

### Manuales
Para ajustes, correcciones, o asientos que el sistema no genera:
1. Ve a **Libro Diario** → "Nuevo Asiento"
2. Agrega líneas (cada una con cuenta, descripción, débito o crédito)
3. El sistema valida que **débito = crédito** (partida doble)

---

## Reportes Financieros

| Reporte | Qué muestra | Dónde está |
|---------|-------------|------------|
| **Estado de Resultados (P&L)** | Ingresos - Gastos = Utilidad | Contabilidad → Estados Financieros |
| **Balance General** | Activos = Pasivos + Patrimonio | Contabilidad → Estados Financieros |
| **Balance de Comprobación** | Todas las cuentas con saldos | Contabilidad → Estados Financieros |
| **Libro Mayor** | Movimientos de una cuenta específica | Contabilidad → Libros Contables |
| **Flujo de Caja** | Entradas y salidas por método de pago | Contabilidad → Reportes |

---

## Períodos Contables

Los períodos controlan cuándo se pueden registrar asientos:

1. **Crear período** — Define un rango de fechas (ej: Enero 2026)
2. **Cerrar período** — El sistema calcula ingresos, gastos, y utilidad neta; genera un asiento de cierre
3. **Bloquear período** — Después de cerrado, bloquéalo para que nadie pueda modificarlo

> **Tip:** Puedes **reabrir** un período cerrado (pero no uno bloqueado). El bloqueo es el paso final.

---

## Asientos Recurrentes

Para gastos que se repiten (alquiler, servicios, etc.):

1. Ve a **Asientos Recurrentes** → "Crear"
2. Configura: nombre, frecuencia (mensual, semanal, etc.), líneas del asiento
3. El sistema ejecuta automáticamente en la fecha programada
4. También puedes ejecutar manualmente con "Ejecutar pendientes"

---

## Problemas comunes

### "No entiendo los asientos automáticos"

Cada asiento automático tiene un campo **metadata** que dice de dónde vino. En el Libro Diario, los asientos automáticos se marcan con un ícono de rayo (⚡). Puedes filtrar para ver solo manuales o solo automáticos.

### "El Balance de Comprobación no cuadra"

Si los débitos no son iguales a los créditos, significa que hay un asiento desbalanceado. Esto no debería ocurrir porque el sistema valida cada asiento. Si lo ves, contacta soporte — puede ser un asiento de migración con error.

### "¿Puedo modificar un asiento automático?"

No directamente. Si necesitas corregir un asiento automático, crea un **asiento manual de ajuste** que compense el error.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
