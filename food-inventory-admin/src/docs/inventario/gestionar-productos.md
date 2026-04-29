---
title: "Cómo Crear y Gestionar Productos"
description: "Aprende a registrar productos, configurar variantes, precios, unidades de venta, y usar el escaneo de etiquetas con IA."
category: "inventario"
slug: "gestionar-productos"
keywords: ["productos", "variantes", "SKU", "crear producto", "catálogo", "escaneo etiqueta"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "10 min"
industry: "Todas"
problem: "Necesitas registrar los productos de tu negocio con toda su información: precios, variantes, imágenes, y proveedores."
solution: "SmartKubik te permite crear un catálogo completo con variantes, múltiples unidades de venta, escaneo de etiquetas con IA, e importación masiva."
quickAnswer: |
  1. Ve a Inventario → Productos
  2. Haz clic en "Nuevo Producto"
  3. Llena nombre, SKU, precio y categoría
  4. Agrega variantes si aplica
  5. Guarda el producto
---

# Cómo Crear y Gestionar Productos

## ¿Dónde están los productos?

Ve a **Inventario** en el menú lateral, y luego selecciona la pestaña **Mercancía** (o "Materias Primas", "Consumibles", "Suministros" según el tipo).

**Ruta directa:** `/inventory-management?tab=products`

---

## Crear un producto nuevo

### Paso a paso

1. Haz clic en **"+ Agregar Producto"** en la barra superior
2. Se abre un formulario con varias secciones:

**Información básica:**
- **Nombre** — El nombre del producto (obligatorio)
- **Marca** — La marca (obligatorio)
- **Categoría** — Puedes escribir una nueva o elegir una existente
- **SKU** — Código único. Si lo dejas vacío, el sistema genera uno automáticamente (ej: "TIE-0042")

**Imágenes:**
- Puedes agregar hasta 3 fotos
- La primera foto será la portada
- Arrastra para reordenar
- Las imágenes se comprimen automáticamente a máximo 500 KB

**Variantes (presentaciones):**
- Todo producto necesita al menos una variante
- La variante principal usa el mismo SKU del producto
- Si vendes el mismo producto en diferentes tamaños (500g, 1kg, 5kg), agrega más variantes
- Cada variante tiene su propio **precio de costo** y **precio de venta**

**Código de barras:**
- Puedes escribirlo manualmente o escanear con la cámara
- El sistema verifica que no esté repetido en otro producto

**Configuración de inventario:**
- **Stock mínimo** — Cuándo te avisa que se está acabando
- **Stock máximo** — Cuánto deberías tener como máximo
- **Punto de reorden** — En qué cantidad pedir más al proveedor

3. Haz clic en **Guardar**

### Tipos de producto

| Tipo | Uso | Ejemplo |
|------|-----|---------|
| **Mercancía** | Lo que vendes directamente | Harina, Bebidas, Ropa |
| **Materia Prima** | Ingredientes para producción | Azúcar, Mantequilla |
| **Consumible** | Se usa pero no se vende | Vasos desechables, Bolsas |
| **Suministro** | Material de operación | Productos de limpieza |

---

## Escanear etiqueta con IA

¿Tienes un producto nuevo y no quieres escribir todos los datos a mano?

1. Haz clic en **"Escanear Etiqueta"** en la barra superior
2. Toma 1 a 3 fotos de la etiqueta del producto
3. El sistema usa inteligencia artificial para extraer: nombre, marca, ingredientes, alérgenos, temperatura de almacenamiento, y más
4. Revisa los datos extraídos (se muestra un porcentaje de confianza)
5. Los datos se llenan automáticamente en el formulario de creación

> **Tip:** Funciona mejor con fotos nítidas de la etiqueta completa. Acepta JPEG, PNG, WebP y HEIC.

---

## Editar un producto

- Haz clic en el **lápiz** (ícono de editar) en la fila del producto
- O haz clic directamente en el **precio** o **categoría** para editar en línea (sin abrir formulario)
- Después de editar en línea, tienes **4 segundos para deshacer** si te equivocaste

---

## Importar productos masivamente

Si tienes muchos productos que registrar:

1. Haz clic en **"Importar"** en la barra superior
2. Descarga la **plantilla Excel**
3. Llena la plantilla con tus productos (uno por fila)
4. Sube el archivo .xlsx
5. El sistema procesa todos los productos de una vez

> **Importante:** Si algún producto tiene un error, **ninguno se crea**. Corrige el error y sube de nuevo.

---

## Múltiples unidades de venta

Si compras un producto en una unidad (sacos) pero lo vendes en otra (kilos):

1. En el formulario del producto, activa **"Múltiples unidades de venta"**
2. Configura cada unidad:
   - **Nombre** (ej: "Kilogramos")
   - **Abreviatura** (ej: "kg")
   - **Factor de conversión** — cuántas unidades de venta hay en una unidad base (ej: 1 saco = 25 kg)
   - **Precio por unidad** y **Costo por unidad**

---

## Problemas comunes y soluciones

### "Mi producto no aparece en la tienda online (Storefront)"

**Causa:** La tienda online solo muestra productos que cumplen TODAS estas condiciones:
- Tipo = **Mercancía** (simple). Los consumibles, suministros y materias primas no se publican
- **Stock disponible** > 0 (si no tienes inventario, no aparece)
- **Estado** = Activo (no eliminado)

**Solución:** Verifica que el producto es tipo "Mercancía", que tiene stock en inventario, y que no está desactivado.

### "Intenté crear un producto y me dice 'límite alcanzado'"

**Causa:** Tu plan de suscripción tiene un máximo de productos permitidos.

**Solución:** Contacta al administrador para actualizar el plan, o elimina productos que ya no uses.

### "El código de barras da error de duplicado"

**Causa:** Otro producto en tu negocio ya tiene ese mismo código de barras registrado.

**Solución:** Busca el código de barras en la barra de búsqueda para encontrar el producto duplicado. Cada código de barras debe ser único.

### "Creé un producto pero el SKU quedó raro (como '-VAR1')"

**Causa:** Esto ocurría en versiones anteriores cuando el campo de SKU se dejaba vacío. Ya está corregido — el SKU principal del producto se usa para la primera variante.

**Solución:** Edita el producto y corrige el SKU de la variante.

### "¿Cómo vinculo un proveedor a un producto?"

La vinculación se hace desde el módulo de **Compras**, no desde Productos. Cuando creas una orden de compra y seleccionas un producto, el proveedor se vincula automáticamente.

También puedes hacerlo desde **Proveedores**: abre el proveedor, ve a la pestaña "Productos vinculados", y agrega el producto.

---

*¿No encontraste lo que buscabas? Escríbenos por WhatsApp o usa el Asistente IA dentro de la plataforma.*
