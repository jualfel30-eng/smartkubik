---
title: "Cómo Crear Ventas en el Punto de Venta (POS)"
description: "Guía paso a paso para vender: buscar productos, escanear códigos, aplicar descuentos, cobrar con múltiples métodos, y generar factura."
category: "ventas"
slug: "crear-ventas-pos"
keywords: ["POS", "venta", "cobrar", "factura", "descuento", "pago", "punto de venta"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "12 min"
industry: "Todas"
problem: "Necesitas vender productos, cobrar de diferentes formas, y generar facturas."
solution: "El POS de SmartKubik permite crear ventas rápidamente con múltiples métodos de pago, descuentos automáticos, y facturación integrada."
quickAnswer: |
  1. Ve a Órdenes → Nueva Orden
  2. Busca o escanea el producto
  3. Ajusta cantidad y descuentos
  4. Presiona F4 o "Cobrar"
  5. Selecciona método de pago y confirma
---

# Cómo Crear Ventas en el Punto de Venta (POS)

## ¿Dónde está el POS?

Ve a **Órdenes** en el menú lateral → **Nueva Orden**.

**Ruta directa:** `/orders/new`

**Atajos de teclado:**
- **F2** — Buscar producto
- **F4** — Pagar (abre el cobro)
- **Esc** — Limpiar la orden
- **B** — Activar escáner de código de barras

---

## Crear una venta (paso a paso)

### 1. Selecciona el cliente (opcional)

En la parte superior, puedes buscar un cliente por **nombre, teléfono, o RIF**. Si el cliente no existe, puedes crearlo al momento.

> **Tip:** Registrar el cliente permite llevar historial de compras, aplicar precios especiales, y generar factura a su nombre.

### 2. Agrega productos

**Tres formas de agregar productos:**
- **Buscar por nombre:** Escribe en la barra de búsqueda (F2)
- **Escanear código de barras:** Activa el escáner (B) y apunta al producto
- **Grid visual:** Si tienes pocos productos, usa la vista de cuadrícula

Si un producto tiene **múltiples variantes** (ej: 500g y 1kg), se mostrará un selector de variante.

Si un producto tiene **modificadores** (extras, opciones), se abrirá un diálogo para configurarlos.

### 3. Revisa el carrito

El carrito muestra:
- Nombre y cantidad de cada producto
- Precio unitario y subtotal
- Descuentos aplicados (si hay)

Puedes:
- Cambiar la **cantidad** directamente
- Aplicar un **descuento por item** (% con razón)
- Aplicar un **descuento general** a toda la orden
- Agregar **instrucciones especiales** por item

### 4. Selecciona el tipo de entrega

| Tipo | Cuándo usarlo |
|------|---------------|
| **En tienda** | El cliente se lleva el producto ahora mismo |
| **Retiro (Pickup)** | El cliente pasa a buscarlo después |
| **Delivery local** | Envías al cliente dentro de tu zona |
| **Envío nacional** | Envías por agencia/courier |

### 5. Cobra la venta (F4)

Al presionar **F4** o el botón **"Pagar"**:

1. **Selecciona método(s) de pago:**
   - Efectivo USD, Efectivo VES
   - Tarjeta, POS
   - Transferencia, Zelle
   - Pago Móvil
   - Puedes combinar varios (ej: $30 efectivo + Bs. 200,000 pago móvil)

2. **El sistema calcula automáticamente:**
   - **IVA** (16%) por cada producto que lo aplique
   - **IGTF** (3%) si el pago es en divisas (USD)
   - **Vuelto** si pagas en efectivo más de lo debido

3. **Propinas** (opcional): Selecciona 10%, 15%, 18%, 20%, o ingresa un monto personalizado

4. **Confirma el pago**

### 6. Genera la factura

Después de pagar:
1. El sistema te pregunta el tipo de documento:
   - **Factura** — Documento fiscal con IVA e IGTF
   - **Nota de Entrega** — Sin impuestos (para entregas)
2. Se genera automáticamente con número de control
3. La orden queda como **completada**

---

## Descuentos automáticos

SmartKubik aplica automáticamente el **mejor descuento** para el cliente:

- **Descuento por volumen:** Si el producto tiene reglas como "10+ unidades = 5% descuento", se aplica automáticamente
- **Promoción activa:** Si el producto tiene una promoción vigente, se aplica el % de descuento
- **Cupón:** El cliente puede ingresar un código de cupón

El sistema compara todos los descuentos disponibles y aplica el que le dé el **precio más bajo** al cliente.

---

## Historial de órdenes

Ve a **Órdenes** → **Historial** (`/orders/history`)

Aquí puedes:
- Ver todas las órdenes con su estado y monto
- Filtrar por cliente, fecha, estado de pago
- **Procesar** órdenes pendientes (cobrar + facturar)
- **Cancelar** órdenes (revierte el inventario automáticamente)
- Exportar a CSV

---

## Problemas comunes y soluciones

### "Pagué la orden pero no me deja completarla"

**Causa:** Para completar una orden necesitas: (1) que esté pagada al 100%, Y (2) que tenga factura o nota de entrega emitida.

**Solución:** Después de pagar, genera la factura (paso 2 del wizard de procesamiento).

### "El IGTF se está calculando mal"

**Cómo funciona:** El IGTF (3%) solo se cobra sobre pagos en **divisas** (efectivo USD, Zelle, transferencia USD). Si pagas parte en USD y parte en Bolívares, solo la parte en USD tiene IGTF.

**Ejemplo:** Orden de $100. Pagas $50 en Zelle + Bs 200,000 en Pago Móvil. IGTF = $50 × 3% = $1.50 (no $3.00).

### "La orden se quedó en 'Pendiente' y no puedo hacer nada"

**Solución:** Abre la orden desde el Historial → haz clic en "Procesar" → completa el pago y la facturación.

### "Cancelé una orden pero el stock no volvió"

Al cancelar, el sistema crea movimientos de **ajuste** (no de "entrada"). Verifica en Inventario → Movimientos que los ajustes se crearon correctamente.

### "No aparecen los métodos de pago"

**Causa:** Los métodos de pago se configuran en **Configuración** → pestaña **Pagos**. Si no hay métodos configurados, el POS no mostrará opciones.

### "¿Cómo doy vuelto en una moneda diferente?"

Si el cliente paga en USD pero quieres dar vuelto en Bolívares: al registrar el pago en efectivo, el sistema abre un diálogo de **vuelto mixto** donde puedes especificar cuánto en USD y cuánto en VES (con la tasa de cambio actual).

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
