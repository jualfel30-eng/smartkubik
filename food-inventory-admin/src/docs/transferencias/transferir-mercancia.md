---
title: "Cómo Transferir Mercancía entre Almacenes o Sedes"
description: "Guía para crear, aprobar, despachar y recibir transferencias. Incluye modo PUSH, PULL, express, y cross-tenant."
category: "transferencias"
slug: "transferir-mercancia"
keywords: ["transferencia", "traslado", "almacén", "sede", "despacho", "recepción"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "10 min"
industry: "Todas"
problem: "Necesitas mover mercancía de un almacén a otro o de una sede a otra."
solution: "SmartKubik gestiona transferencias con flujo de aprobación, despacho con descuento automático de stock, y recepción con detección de discrepancias."
quickAnswer: |
  1. Ve a Transferencias → Nueva Transferencia
  2. Selecciona almacén origen y destino
  3. Agrega productos y cantidades
  4. Guarda → Aprueba → Despacha
  5. En destino: "Recibir" la transferencia
---

# Cómo Transferir Mercancía entre Almacenes o Sedes

## ¿Dónde está?

**Menú lateral:** Inventario → pestaña **Traslados** (`/inventory-management?tab=transfers`)

> **Requisito:** Esta función necesita que tengas al menos 2 almacenes o 2 sedes configuradas.

---

## Dos modos de transferencia

| Modo | Quién inicia | Ejemplo |
|------|-------------|---------|
| **PUSH** (enviar) | El almacén de **origen** | "Tengo exceso de harina, se la envío a la otra sede" |
| **PULL** (solicitar) | El almacén de **destino** | "Necesito harina, le pido a la sede central que me envíe" |

---

## Crear una transferencia (PUSH)

1. Haz clic en **"+ Nueva Transferencia"**
2. Selecciona **almacén de origen** (de dónde sale)
3. Selecciona **almacén de destino** (a dónde va)
4. Agrega productos:
   - Solo aparecen productos **con stock** en el almacén de origen
   - Si el producto tiene múltiples unidades de venta (ej: kg/sacos), puedes seleccionar la unidad
   - La cantidad máxima se limita al stock disponible
5. Guarda como **borrador** o usa **"Enviar Ahora"** (express)

### Despacho Express ("Enviar Ahora")
Hace todo en un solo clic: crea → solicita → aprueba → prepara → despacha. Útil para transferencias urgentes.

---

## Flujo paso a paso

```
Borrador → Solicitado → Aprobado → En Preparación → En Tránsito → Recibido
```

| Paso | Quién | Qué pasa |
|------|-------|----------|
| **Solicitar** | Quien crea | Pide aprobación |
| **Aprobar** | Supervisor | Puede ajustar cantidades |
| **Preparar** | Almacenero origen | Marca que está empacando |
| **Despachar** | Almacenero origen | **Descuenta el stock del origen** (irreversible) |
| **Recibir** | Almacenero destino | **Agrega el stock al destino** |

> **Después del despacho no se puede cancelar.** El stock ya se descontó.

---

## Recibir una transferencia

1. Abre la transferencia (estará en estado "En Tránsito")
2. Para cada producto, indica la **cantidad que realmente recibiste**
3. Si todo coincide → estado "Recibido" ✅
4. Si algo falta → estado "Parcialmente Recibido" ⚠️ y el sistema detecta la discrepancia automáticamente

---

## Problemas comunes y soluciones

### "Al despachar da error: 'No existe inventario del producto en el almacén origen'"

**Causas:**
- El producto no tiene stock en ese almacén específico
- El inventario existe pero no tiene almacén asignado (registros antiguos)

**Solución:** Verifica que el producto tenga inventario con el almacén correcto asignado. Si es un registro antiguo sin almacén, contacta al administrador.

### "Despachamos 10 kg pero el inventario bajó 0.4 sacos"

**Explicación:** Es correcto. Si el producto se inventaría en "sacos" y transferiste en "kg", el sistema convierte automáticamente. Con factor 0.04: 10 kg = 0.4 sacos.

### "La cantidad recibida no coincide con lo enviado"

El sistema crea una **discrepancia** automáticamente. Puedes agregar fotos de evidencia desde el detalle de la transferencia.

### "¿Puedo cancelar una transferencia?"

- **Antes del despacho:** Sí, desde cualquier estado previo (borrador, solicitado, aprobado, en preparación)
- **Después del despacho:** No. El stock ya se descontó del origen.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
