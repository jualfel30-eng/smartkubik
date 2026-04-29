---
title: "Cómo Gestionar Proveedores"
description: "Aprende a crear proveedores, vincular productos, configurar condiciones de pago, y revisar el historial de compras por proveedor."
category: "compras"
slug: "gestionar-proveedores"
keywords: ["proveedores", "RIF", "condiciones de pago", "vincular productos", "historial"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "7 min"
industry: "Todas"
problem: "Necesitas llevar un directorio de proveedores con sus condiciones comerciales y saber qué le compras a cada uno."
solution: "SmartKubik gestiona proveedores con condiciones de pago, productos vinculados, calificaciones, y sincronización automática."
quickAnswer: |
  1. Ve a Proveedores → Nuevo Proveedor
  2. Llena nombre, RIF, contacto
  3. Configura condiciones de pago
  4. Para vincular productos: edita el producto → pestaña Proveedores
---

# Cómo Gestionar Proveedores

## ¿Dónde están los proveedores?

**Menú lateral:** Inventario → pestaña **Proveedores** (`/inventory-management?tab=suppliers`)

También aparecen en el CRM (pestaña "Proveedores").

---

## Crear un proveedor

1. Haz clic en **"+ Nuevo Proveedor"**
2. Llena los datos:
   - **Nombre de la empresa** (obligatorio)
   - **RIF** (obligatorio, formato: J-12345678)
   - **Contacto principal** (nombre, teléfono, email)
   - **Dirección** (ciudad, estado)
3. Configura las **condiciones de pago**:
   - ¿Acepta crédito? → días de crédito
   - Métodos de pago aceptados (efectivo, Zelle, transferencia, etc.)
   - Método preferido
   - ¿Requiere adelanto? → porcentaje
4. Guarda

> Los proveedores también se pueden crear automáticamente al crear una orden de compra con un proveedor nuevo.

---

## Vincular productos a un proveedor

### Desde el proveedor:
1. Abre el proveedor → pestaña **"Productos Vinculados"**
2. Haz clic en **"Vincular Producto"**
3. Busca el producto
4. Indica: precio de costo, SKU del proveedor, tiempo de entrega, cantidad mínima de pedido

### Automáticamente:
Cada vez que **recibes una orden de compra**, todos los productos de esa orden se vinculan al proveedor automáticamente con el precio de costo actualizado.

---

## Calificación de proveedores

Cada vez que recibes mercancía, el sistema te pide calificar al proveedor (1 a 5 estrellas). Las calificaciones se promedian y se muestran en el listado de proveedores.

---

## Problemas comunes

### "El proveedor no aparece en la búsqueda de compras"

**Causa:** El buscador de la orden de compra necesita mínimo **2 caracteres**. Busca por nombre o RIF.

**Si sigue sin aparecer:** Puede que el proveedor exista en el CRM pero no tenga perfil de proveedor. Edítalo y asegúrate de que el tipo sea "Proveedor".

### "Actualicé las condiciones de pago del proveedor, ¿se aplican a los productos?"

**Sí, automáticamente.** Cuando cambias el método de pago preferido o la moneda del proveedor, el sistema sincroniza esa información a todos los productos vinculados (en background).

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
