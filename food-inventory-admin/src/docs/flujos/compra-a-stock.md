---
title: "De Compra a Stock: El Flujo Completo"
description: "Qué pasa desde que haces una orden de compra hasta que el producto aparece en tu inventario y se genera la cuenta por pagar."
category: "flujos"
slug: "compra-a-stock"
keywords: ["compra", "stock", "inventario", "proveedor", "recibir", "cuenta por pagar", "flujo"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "5 min"
industry: "Todas"
problem: "No entiendes qué pasa entre crear una compra y que el inventario se actualice."
solution: "Este artículo explica el flujo completo paso a paso, qué se crea automáticamente, y qué puede salir mal."
quickAnswer: |
  1. Creas la orden de compra (Compras → Nueva Orden)
  2. La apruebas (opcional)
  3. Marcas como "Recibido" cuando llega la mercancía
  4. Automáticamente: stock sube, proveedor se vincula, y se crea la cuenta por pagar
---

# De Compra a Stock: El Flujo Completo

## El flujo en 4 pasos

### Paso 1: Creas la orden de compra
- Ve a **Compras → Nueva Orden**
- Selecciona proveedor, agrega productos, configura pago
- La orden queda como **"Pendiente"**
- En este punto **NO cambia nada** en el inventario

### Paso 2: Apruebas (opcional)
- Un supervisor cambia el status a **"Aprobado"**
- Sigue sin afectar el inventario — es solo una autorización

### Paso 3: Marcas como "Recibido" (aquí pasa TODO)
Cuando la mercancía llega y haces clic en **"Recibir"**, el sistema hace 5 cosas automáticamente:

| Lo que pasa | Dónde lo ves |
|-------------|-------------|
| **Stock sube** | Inventario → el producto tiene más unidades |
| **Movimiento registrado** | Inventario → Movimientos → tipo "Entrada" |
| **Proveedor vinculado** | El producto ahora muestra este proveedor en su lista |
| **Cuenta por pagar creada** | Cuentas por Pagar → nueva deuda pendiente |
| **Costo actualizado** | El costo promedio del producto se recalcula |

### Paso 4: Pagas al proveedor
- Ve a **Cuentas por Pagar** → registra el pago
- Se genera un asiento contable automáticamente

---

## ¿Qué puede salir mal?

### "Recibí la mercancía pero el stock no subió"
El status de la orden debe decir **"Recibido"** (verde). Si dice "Pendiente" o "Aprobado", el stock no se actualiza. Cambia a "Recibido".

### "Aparecieron 2 cuentas por pagar"
Si la compra tiene **adelanto** (ej: 50%), es correcto — se crea una por el adelanto y otra por el saldo.

### "El proveedor no aparece vinculado al producto"
La vinculación se hace al **recibir**, no al crear la orden. Si la orden no se recibió, el producto no se vincula.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
