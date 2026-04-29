---
title: "Guía de Producción: Recetas, Órdenes de Manufactura y Control de Calidad"
description: "Cómo definir recetas (BOM), crear órdenes de producción, planificar materiales (MRP), controlar calidad, y gestionar mermas."
category: "produccion"
slug: "guia-produccion"
keywords: ["producción", "recetas", "BOM", "manufactura", "MRP", "calidad", "merma"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "12 min"
industry: "Manufactura y Food Service"
problem: "Necesitas fabricar productos a partir de materias primas, controlar costos de producción, y asegurar calidad."
solution: "SmartKubik gestiona el ciclo completo: recetas → planificación de materiales → producción → control de calidad → producto terminado en inventario."
quickAnswer: |
  1. Ve a Producción → Recetas → crea la receta con ingredientes
  2. Producción → Nueva Orden → selecciona receta y cantidad
  3. El sistema calcula materiales necesarios
  4. Completa la orden → stock del producto final se actualiza
---

# Guía de Producción

## 1. Definir Recetas / BOM (`/production` → BOMs)

Una **receta** (Bill of Materials) define qué ingredientes necesitas y en qué cantidad para fabricar un producto.

1. Ve a **Producción** → pestaña **BOMs**
2. Haz clic en **"+ Nueva BOM"**
3. Selecciona el **producto terminado** (el que vas a fabricar)
4. Agrega **componentes** (ingredientes):
   - Producto componente, cantidad por unidad producida, unidad de medida
   - **Porcentaje de merma** (ej: 5% se desperdicia en el proceso)
5. Opcionalmente agrega **subproductos** (ej: huesos al filetear carne)
6. Guarda

### Explosión de BOM
Si un componente es a su vez un producto fabricado (tiene su propia BOM), el sistema hace **explosión multinivel** — descompone recursivamente hasta llegar a las materias primas puras.

### Verificar disponibilidad
Antes de producir, haz clic en **"Verificar Disponibilidad"** → el sistema compara los componentes con tu inventario y te dice qué falta.

---

## 2. Crear Orden de Manufactura (`/production` → Órdenes)

1. Haz clic en **"+ Nueva Orden"**
2. Selecciona el **producto** y la **cantidad a producir**
3. Selecciona la **versión de producción** (BOM + Ruta de operaciones)
4. El sistema carga automáticamente los componentes y operaciones
5. Guarda como borrador

### Ciclo de vida
| Estado | Qué significa | Qué puedes hacer |
|--------|---------------|------------------|
| **Borrador** | Recién creada | Editar, confirmar, cancelar |
| **Confirmada** | Materiales verificados | Iniciar producción |
| **En progreso** | Produciendo | Registrar operaciones, completar |
| **Completada** | Terminada | Inventario actualizado automáticamente |
| **Cancelada** | Anulada | Nada |

### Al completar la orden
El sistema hace todo automáticamente:
1. **Descuenta** las materias primas del inventario
2. **Crea** el producto terminado en inventario
3. **Calcula el costo**: (materiales + mano de obra + overhead) ÷ cantidad producida
4. **Genera asiento contable**: DR Inventario Terminado, CR Materias Primas

---

## 3. Planificación de Materiales / MRP

El MRP te dice si tienes suficiente materia prima para producir:

1. En una orden de manufactura, haz clic en **"Verificar Materiales"**
2. El sistema calcula: cantidad requerida - stock disponible = **faltante**
3. Si hay faltantes, puedes generar **sugerencias de compra** automáticamente
4. Las sugerencias se convierten en órdenes de compra con un clic

---

## 4. Control de Calidad

### Crear plan de QC
1. Ve a **Producción → Control de Calidad**
2. Crea un **plan de inspección** con checkpoints:
   - Nombre del checkpoint (ej: "Temperatura", "pH", "Peso")
   - Valor esperado y tolerancia
   - Si es crítico o no

### Inspeccionar
1. Selecciona la orden de manufactura o lote
2. Registra resultados por checkpoint
3. Si algún checkpoint falla → se crea automáticamente un registro de **no-conformidad**
4. Si todo pasa → puedes generar un **Certificado de Análisis (CoA)**

---

## 5. Gestión de Mermas (`/waste-control`)

Para registrar pérdidas de inventario (daño, vencimiento, producción):

1. Ve a **Control de Mermas**
2. Registra: producto, cantidad, razón (vencimiento, daño, producción, otro)
3. El sistema automáticamente:
   - Calcula el **costo** de la merma
   - **Descuenta** del inventario
   - **Genera asiento contable** (DR Mermas, CR Inventario)
   - Si tienes IA configurada, sugiere **acciones de prevención**

### Analytics de mermas
- Total por razón (vencimiento es el 45%? → mejorar FIFO)
- Tendencias semanales y mensuales
- Top 10 productos más desperdiciados
- Recomendaciones automáticas

---

## Problemas comunes

### "Al completar la orden, dice que no hay suficiente materia prima"
La verificación de materiales se hace al confirmar, pero entre la confirmación y la finalización pudo haber consumo. Verifica el stock actual de cada componente.

### "El costo del producto terminado parece incorrecto"
El costo se calcula como: `(Σ costo de componentes × cantidad usada + mano de obra) ÷ cantidad producida`. Revisa que los costos de las materias primas estén actualizados en el inventario.

### "¿Puedo tener varias versiones de una receta?"
Sí. Crea múltiples BOMs y vincúlalas como **versiones de producción** (v1, v2, v3). La "default" se usa automáticamente al crear órdenes.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
