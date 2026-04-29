---
title: "Control de Stock: Ajustes, Lotes y Alertas"
description: "Todo sobre el inventario: cómo ajustar cantidades, manejar lotes con vencimiento, configurar alertas de stock bajo, y hacer conteos masivos."
category: "inventario"
slug: "control-de-stock"
keywords: ["inventario", "stock", "ajuste", "lotes", "vencimiento", "alertas", "conteo físico", "merma"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "12 min"
industry: "Todas"
problem: "Necesitas saber cuánto tienes de cada producto, recibir alertas cuando se acaba, y poder corregir diferencias."
solution: "SmartKubik controla tu stock en tiempo real, te alerta automáticamente, y te permite ajustar cantidades con razón documentada."
quickAnswer: |
  1. Ve a Inventario → Inventario
  2. Busca el producto
  3. Haz clic en [+] o [-] junto a la cantidad
  4. Selecciona la razón del ajuste
  5. Confirma
---

# Control de Stock: Ajustes, Lotes y Alertas

## ¿Dónde veo mi inventario?

Ve a **Inventario** en el menú lateral → pestaña **Inventario**.

**Ruta directa:** `/inventory-management?tab=inventory`

Aquí verás una tabla con todos tus productos y su stock actual. Cada fila muestra:
- **SKU** y nombre del producto
- **Cantidad disponible** (lo que puedes vender)
- **Cantidad reservada** (apartado para órdenes en proceso)
- **Costo promedio** (se calcula automáticamente)
- **Estado** — color verde (disponible), naranja (próximo a vencer), rojo (stock crítico)

---

## Agregar inventario (stock inicial)

Si acabas de registrar un producto y necesitas indicar cuánto tienes:

1. Haz clic en **"Agregar Inventario"**
2. Busca y selecciona el producto
3. Indica la **cantidad** y el **costo por unidad**
4. Si el producto es perecedero, agrega un **lote** con:
   - Número de lote
   - Cantidad
   - Fecha de vencimiento
5. Haz clic en **Guardar**

> Si el producto ya tiene inventario, el sistema **suma** la cantidad nueva a la existente automáticamente (no crea un duplicado).

---

## Ajustar stock (conteo físico)

Cuando cuentas los productos y la cantidad real no coincide con el sistema:

1. En la tabla de inventario, busca el producto
2. Haz clic en los botones **+** o **-** al lado de la cantidad
3. Ingresa cuánto agregar o restar
4. Selecciona la **razón del ajuste**:
   - **Conteo físico** — El más común: "conté y había 47, no 50"
   - **Daño** — Producto dañado que ya no se puede vender
   - **Merma** — Pérdida por vencimiento, robo, etc.
   - **Devolución** — Un cliente devolvió producto
   - **Otro** — Cualquier otra razón
5. Confirma

Cada ajuste queda registrado como un **movimiento de inventario** con fecha, usuario, y razón. Nadie puede ajustar sin que quede rastro.

---

## Ajuste masivo (desde Excel)

Después de un inventario general:

1. Haz clic en **"Importar"** en la barra del inventario
2. Descarga la plantilla Excel
3. Llena con el SKU y la cantidad real de cada producto
4. Sube el archivo
5. Revisa la vista previa
6. Selecciona una razón global ("Conteo físico")
7. Confirma

> Si algún producto falla, **todo el ajuste se cancela**. Corrige y vuelve a subir.

---

## Gestionar lotes (productos perecederos)

Para productos con fecha de vencimiento:

- Los lotes se crean automáticamente al **recibir mercancía** de una orden de compra
- También puedes crearlos manualmente al agregar inventario
- Cada lote tiene: número, cantidad, fecha de vencimiento, costo

Para ver o editar los lotes de un producto:
1. Haz clic en el ícono de **lotes** en la fila del producto
2. Se abre un diálogo con todos los lotes activos
3. Puedes editar cantidades, agregar o quitar lotes

> El sistema usa **FEFO** (First Expired, First Out) — cuando se vende, primero sale el lote que vence primero.

---

## Configurar alertas de stock bajo

Para que el sistema te avise cuando un producto se está acabando:

1. Ve a la pestaña **Alertas** (dentro de Inventario)
2. Haz clic en **"Crear regla"**
3. Selecciona el producto
4. Indica la **cantidad mínima** (ej: "Avísame cuando queden menos de 10")
5. Opcionalmente, selecciona un almacén específico (o déjalo en "todos")
6. Guarda

Cuando el stock baje del mínimo, recibirás una notificación. Las alertas tienen un **cooldown de 6 horas** para no saturarte.

---

## Ver movimientos de inventario

Cada cambio de stock queda registrado. Para verlos:

1. Ve a la pestaña **Movimientos**
2. Filtra por: tipo (entrada/salida/ajuste/transferencia), almacén, producto, proveedor, fecha
3. Cada movimiento muestra: fecha, tipo, producto, cantidad, costo, razón, referencia, y usuario

**Exportar:** Puedes descargar los movimientos en **PDF** o **CSV** con los filtros que tengas activos.

**Generar recibo:** Para un movimiento específico (como una recepción de mercancía), haz clic en "Recibo" para generar un PDF con logo del negocio, detalles, y espacio para firma.

---

## Problemas comunes y soluciones

### "El stock dice 50 pero yo solo conté 47"

**Solución:** Haz un ajuste manual: botones +/- → ingresa la diferencia → razón "Conteo físico". El sistema registra el movimiento con tu nombre y la razón.

### "Recibí mercancía pero el stock no subió"

**Causa posible:** La orden de compra no se marcó como "Recibida". Solo al recibir la PO se actualiza el inventario.

**Solución:** Ve a Compras → busca la orden → cambia el status a "Recibido". Eso disparará la actualización de stock.

### "Un producto no aparece en los traslados (dice 'No hay productos con inventario')"

**Causa:** El inventario de ese producto no tiene un almacén asignado. Esto pasa con inventarios creados antes de que se activara el multi-almacén.

**Solución:** Contacta al administrador para asignar el almacén al inventario existente.

### "La alerta de stock bajo no me llega"

**Causas posibles:**
1. No tienes una regla de alerta creada para ese producto → Créala en la pestaña Alertas
2. La alerta se disparó hace menos de 6 horas (cooldown) → Espera y revisará de nuevo
3. La cantidad aún no bajó del mínimo → Verifica el umbral configurado

### "Eliminé un producto del inventario y desapareció"

**Lo que pasó:** Al eliminar del inventario, se marca como inactivo y las cantidades se ponen en 0. El producto como tal sigue existiendo en el catálogo.

**Solución:** Puedes volver a agregar inventario para ese producto en cualquier momento.

### "El costo promedio no parece correcto"

**Cómo funciona:** El costo promedio se recalcula cada vez que entra mercancía nueva. Es un **promedio ponderado**: `(stockActual × costoAnterior + cantidadNueva × costoNuevo) / (stockActual + cantidadNueva)`.

**Ejemplo:** Si tenías 10 unidades a $2.00 y entran 5 a $3.00, el nuevo costo promedio es: (10×2 + 5×3) / 15 = $2.33.

---

*¿No encontraste lo que buscabas? Escríbenos por WhatsApp o usa el Asistente IA dentro de la plataforma.*
