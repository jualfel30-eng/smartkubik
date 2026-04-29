---
title: "Problemas Comunes de Inventario y Cómo Resolverlos"
description: "Soluciones a los problemas más frecuentes: stock que no cuadra, productos que no aparecen, alertas que no llegan, y más."
category: "inventario"
slug: "problemas-inventario"
keywords: ["problemas", "inventario", "stock no cuadra", "producto no aparece", "error", "solución"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "6 min"
industry: "Todas"
problem: "Algo no funciona como esperas en el inventario y necesitas una solución rápida."
solution: "Guía de diagnóstico y solución para los problemas más frecuentes reportados por usuarios de SmartKubik."
quickAnswer: |
  Stock no cuadra: Inventario → Conteo Físico → compara y ajusta.
  Producto no aparece: revisa filtros y categoría.
  Alertas no llegan: Configuración → Notificaciones → activa alertas de stock.
---

# Problemas Comunes de Inventario

Guía rápida de diagnóstico. Busca tu problema y sigue la solución.

---

## Stock y Cantidades

### "El stock del sistema no coincide con lo que tengo físicamente"

**Diagnóstico rápido:**
1. Revisa los **movimientos** del producto (Inventario → Movimientos → filtra por producto). Ahí verás cada entrada y salida con razón.
2. Busca si hubo una venta, transferencia o ajuste que no esperabas.
3. Si confirmas que hay diferencia, haz un **ajuste manual** con razón "Conteo físico".

### "Recibí mercancía pero el stock no se actualizó"

**Paso a paso para verificar:**
1. Ve a **Compras** → busca la orden de compra
2. Verifica el **status**: debe decir "Recibido" (verde)
3. Si dice "Pendiente" o "Aprobado", el stock NO se ha actualizado aún
4. Cambia el status a "Recibido" → el sistema actualiza el inventario automáticamente

**Si ya dice "Recibido" y el stock no subió:** Puede que el producto de la orden de compra no coincida exactamente con el producto en inventario (problema de IDs internos). Contacta soporte.

### "Se duplicó el stock (tengo el doble de lo que debería)"

**Causa histórica:** En versiones anteriores, recibir una orden de compra creaba el stock dos veces. Este bug ya fue corregido.

**Solución:** Haz un ajuste manual para corregir la cantidad al valor real.

---

## Productos y Búsqueda

### "Un producto no aparece en la tienda online"

Verifica estas **3 condiciones** (todas deben cumplirse):
1. ✅ Tipo = **Mercancía** (no consumible, suministro, ni materia prima)
2. ✅ Stock disponible **> 0** en el inventario
3. ✅ Estado **activo** (no eliminado)

Si las 3 se cumplen y aún no aparece, espera unos minutos — el storefront puede tener caché.

### "No encuentro un producto al buscar"

La búsqueda busca en: **nombre, marca, SKU, y código de barras**. Prueba:
- Buscar solo una palabra del nombre (ej: "harina" en vez de "Harina Pan 1kg")
- Buscar por SKU si lo conoces
- Verificar que no esté desactivado (activa "Incluir inactivos" en filtros)

---

## Transferencias

### "Al intentar despachar una transferencia da error"

**Posibles causas y soluciones:**

| Error | Causa | Solución |
|-------|-------|----------|
| "No existe inventario del producto en el almacén origen" | El inventario no tiene almacén asignado (registros antiguos) | Contacta al admin para asignar almacén |
| "Stock insuficiente" | No hay suficiente cantidad disponible | Verifica el stock real; puede haber reservas activas |

### "Despachamos 10 kg pero el inventario bajó cantidades raras"

**Explicación:** Si el producto usa múltiples unidades de venta (ej: se inventaría en "sacos" pero se transfirió en "kg"), el sistema convierte automáticamente. 10 kg con factor 0.04 = 0.4 sacos descontados. Es correcto.

### "La cantidad recibida no coincide con lo enviado"

El sistema detecta automáticamente la diferencia y la marca como **discrepancia**. Puedes agregar fotos de evidencia desde el detalle de la transferencia.

---

## Alertas

### "Configuré una alerta pero no me avisa"

**Checklist:**
- [ ] ¿La regla está **activa**? (ve a Alertas y verifica el toggle)
- [ ] ¿La cantidad actual está **por debajo** del mínimo? (si está justo en el mínimo, no dispara)
- [ ] ¿Se disparó recientemente? (hay un **cooldown de 6 horas** entre alertas)
- [ ] ¿La regla es para un almacén específico? (verifica que el inventario esté en ese almacén)

---

## Lotes y Vencimiento

### "¿Cómo sé qué productos están por vencer?"

Ve a **Inventario** → pestaña **Alertas** → busca la sección de **"Próximos a vencer"**. También puedes filtrar la tabla principal de inventario por "Próximo a vencer".

### "Un lote venció pero sigue apareciendo como disponible"

El sistema no descuenta automáticamente los lotes vencidos — necesitas hacer un **ajuste manual** con razón "Merma" o "Vencimiento" para reflejar la pérdida.

---

## Varios

### "¿Por qué mi almacén no aparece?"

Si estás en un negocio con múltiples almacenes, verifica que la funcionalidad **Multi-Almacén** esté activada (es un feature flag). Si solo tienes un almacén, el sistema lo asigna automáticamente.

### "Hice un ajuste por error, ¿puedo deshacerlo?"

No hay botón de "deshacer" para ajustes. Pero puedes hacer un **ajuste en sentido contrario**: si restaste 5 por error, suma 5 con razón "Corrección". Todo queda documentado en los movimientos.

---

*¿Tu problema no está aquí? Escríbenos por WhatsApp o usa el Asistente IA (ícono ✨ arriba a la derecha) — puede consultar tu inventario en tiempo real.*
