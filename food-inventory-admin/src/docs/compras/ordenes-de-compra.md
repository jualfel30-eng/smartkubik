---
title: "Cómo Crear y Recibir Órdenes de Compra"
description: "Guía completa: crear una orden, seleccionar proveedor, agregar productos, configurar condiciones de pago, y recibir la mercancía."
category: "compras"
slug: "ordenes-de-compra"
keywords: ["compras", "orden de compra", "proveedor", "recibir mercancía", "crédito", "adelanto"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "10 min"
industry: "Todas"
problem: "Necesitas registrar las compras a tus proveedores y que el inventario se actualice automáticamente."
solution: "SmartKubik gestiona el ciclo completo de compras: crear orden, aprobar, recibir mercancía, y generar la cuenta por pagar automáticamente."
quickAnswer: |
  1. Ve a Compras → Nueva Orden
  2. Selecciona el proveedor
  3. Agrega productos y cantidades
  4. Configura condiciones de pago
  5. Envía la orden → cuando llegue, haz clic en "Recibir"
---

# Cómo Crear y Recibir Órdenes de Compra

## ¿Dónde están las compras?

**Menú lateral:** Operaciones → Compras (`/purchases`)

También puedes acceder desde Inventario → pestaña Compras.

---

## Crear una orden de compra

### 1. Selecciona el proveedor

**Dos formas:**
- **Proveedor existente:** Escribe el nombre o RIF en el buscador (mínimo 2 caracteres). Busca en toda tu base de datos.
- **Proveedor nuevo:** Si no existe, puedes crearlo en el momento ingresando nombre, RIF, y datos de contacto.

> Al seleccionar un proveedor, el sistema carga automáticamente sus condiciones de pago (crédito, métodos aceptados).

### 2. Agrega productos

1. Busca el producto por **nombre o SKU**
2. Si el producto tiene variantes, selecciona cuál(es)
3. Para cada producto indica: **cantidad**, **precio de costo**, y **descuento %** (opcional)
4. Para productos perecederos: número de **lote** y **fecha de vencimiento**

### 3. Configura el pago

- **Moneda:** $BCV (tasa oficial), USD, Bolívares, Euros
- **¿Es a crédito?** Si sí, indica la fecha de vencimiento del pago
- **¿Requiere adelanto?** Indica el porcentaje del adelanto (ej: 50%)
- **Tipo de documento:** Factura fiscal o Nota de entrega

> **Nota sobre impuestos:** El IVA (16%) se calcula automáticamente según cada producto. El IGTF (3%) solo aplica si el pago es en divisas. Si seleccionas "Nota de Entrega", no se calculan impuestos.

### 4. Guarda la orden

La orden se crea con status **"Pendiente"**. Desde aquí puede seguir dos caminos:
- Aprobación → Recepción (flujo completo)
- Recepción directa (sin pasar por aprobación)

---

## Escanear una factura con IA

¿Tu proveedor te dio una factura en papel? En vez de copiar todo a mano:

1. Haz clic en el **ícono de cámara** en la barra de compras
2. Toma una foto de la factura
3. El sistema usa IA (GPT-4o) para extraer: proveedor, productos, cantidades, precios, totales
4. Se muestra con un **indicador de confianza** (verde ≥80%, amarillo 50-79%, rojo <50%)
5. Revisa, corrige lo que haga falta, y crea la orden

---

## Recibir mercancía

Este es el paso más importante — al recibir, el sistema actualiza TODO automáticamente.

### Paso a paso

1. Ve al **Historial de compras**
2. Busca la orden y cambia el status de "Pendiente" a **"Recibido"**
3. Se abre un formulario donde indicas:
   - **Fecha de la factura**
   - **Quién recibió** la mercancía (nombre)
   - **Calificación del proveedor** (1 a 5 estrellas)
4. Confirma

### Lo que pasa automáticamente al recibir:

| Acción | Descripción |
|--------|-------------|
| 📦 **Stock actualizado** | Cada producto de la orden se agrega al inventario |
| 🏭 **Proveedor vinculado** | Cada producto queda vinculado a este proveedor con su precio de costo |
| 💰 **Cuenta por pagar creada** | Si es a crédito, se crea una deuda pendiente en contabilidad |
| 📊 **Métricas del proveedor** | Se actualizan: total comprado, promedio por orden, última compra |
| 📋 **Historial registrado** | Queda registrada la transacción en el historial del proveedor |

> **Si la compra tiene adelanto:** Se crean DOS cuentas por pagar: una por el adelanto (vence hoy) y otra por el saldo restante (vence en la fecha de crédito).

---

## Crear producto nuevo con compra (todo en uno)

Si recibes un producto que nunca has vendido:

1. Haz clic en **"Nuevo Producto"** (no en "Añadir Inventario")
2. Llena los datos del producto nuevo (nombre, marca, categoría, precios)
3. Selecciona el proveedor
4. Indica la cantidad recibida y condiciones de pago
5. El sistema crea: **el producto + la orden de compra + recibe la mercancía** — todo en un solo paso

---

## Problemas comunes y soluciones

### "No encuentro al proveedor en el buscador"

**Causa:** El buscador necesita mínimo **2 caracteres** para buscar. Busca en toda la base de datos, no solo en los primeros 20 resultados.

**Si realmente no aparece:** Puede que el proveedor esté registrado con otro nombre o RIF. Intenta buscar solo por los dígitos del RIF.

### "Recibí la mercancía pero el stock no se actualizó"

**Verifica:** El status de la orden debe ser **"Recibido"** (verde). Si dice "Pendiente" o "Aprobado", la recepción no se completó. Cambia el status a "Recibido".

### "El RIF del proveedor me da error"

**Formato correcto:** El RIF debe seguir este formato: `J-12345678` (letra + guión + dígitos).
- Letras válidas: V, E, J, G, P, N, C
- Dígitos: 7 a 9 números
- El sistema normaliza automáticamente (acepta con o sin guión)

### "¿Por qué se crearon 2 cuentas por pagar?"

Si configuraste **adelanto** (ej: 50%), el sistema crea:
1. Una cuenta por el **adelanto** (50% del total, vence hoy)
2. Una cuenta por el **saldo** (50% restante, vence en la fecha de crédito)

Esto permite llevar control separado de cada pago.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
