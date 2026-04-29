---
title: "Ciclo de una Venta: De Producto a Cobro"
description: "Qué pasa desde que el cliente elige un producto hasta que se cobra, se factura, se despacha y se descuenta del inventario."
category: "flujos"
slug: "ciclo-de-venta"
keywords: ["venta", "orden", "cobro", "factura", "inventario", "fulfillment", "flujo"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "6 min"
industry: "Todas"
problem: "No entiendes el flujo completo de una venta y qué pasa en cada paso."
solution: "Este artículo explica el ciclo desde que se agrega un producto al carrito hasta que se entrega y se registra en contabilidad."
quickAnswer: |
  1. Agrega productos al carrito (POS o Storefront)
  2. Cobra (uno o varios métodos de pago)
  3. Genera factura o nota de entrega
  4. El sistema descuenta inventario y registra contabilidad automáticamente
---

# Ciclo de una Venta: De Producto a Cobro

## El ciclo paso a paso

### 1. Crear la orden
- **En el POS**: Busca productos, escanea barcode, agrega al carrito
- **En el Storefront**: El cliente compra online
- El sistema calcula automáticamente: descuentos (volumen + promociones + cupones), IVA, IGTF, envío

### 2. Cobrar
- Selecciona uno o más métodos de pago (multi-pago soportado)
- IGTF (3%) solo aplica a la parte pagada en divisas (USD)
- Al quedar totalmente pagada → el sistema descuenta el inventario automáticamente

### 3. Facturar
- **Factura**: Documento fiscal con IVA, IGTF, número de control. Para el SENIAT.
- **Nota de Entrega**: Sin impuestos. Para entregas donde la factura se genera después.
- La factura genera un asiento contable automático y se registra en el Libro de Ventas IVA

### 4. Completar / Despachar
Depende de la configuración de tu negocio:
- **Venta en mostrador**: Se completa inmediatamente
- **Retiro en tienda**: Queda en "Preparando" hasta que el cliente retire
- **Delivery**: Pasa por: Preparando → En camino → Entregado (con notificaciones WhatsApp)

## ¿Qué se descuenta del inventario?

| Tipo de producto | Qué se descuenta |
|------------------|------------------|
| **Producto normal** | El producto directamente |
| **Producto con receta (BOM)** | Los ingredientes de la receta, NO el producto terminado |
| **Con ingredientes removidos** | Se excluyen del descuento |

---

## ¿Qué puede salir mal?

### "No puedo completar la orden"
Necesitas **dos cosas**: (1) que esté pagada al 100%, Y (2) que tenga factura emitida.

### "El inventario no bajó después de vender"
El descuento es async (puede tardar unos segundos). Verifica en Movimientos que aparezca la salida.

### "La orden quedó en 'Confirmada' no en 'Completada'"
Es correcto si tu fulfillment está configurado como "counter" (retiro) o "logistics" (envío). Se completa cuando el cliente recibe.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
