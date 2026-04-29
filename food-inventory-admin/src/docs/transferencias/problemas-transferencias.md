---
title: "Problemas Comunes de Transferencias y Cómo Resolverlos"
description: "Soluciones a: despacho que falla, cantidades que no coinciden, producto que no aparece en el almacén destino."
category: "transferencias"
slug: "problemas-transferencias"
keywords: ["problemas", "transferencia", "despacho falla", "stock", "error", "solución"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "5 min"
industry: "Todas"
problem: "Algo no funciona con las transferencias de inventario."
solution: "Guía rápida de diagnóstico."
quickAnswer: |
  Despacho falla: verifica que haya stock suficiente en origen.
  Cantidades no coinciden: revisa la unidad de medida seleccionada.
  Producto no aparece en destino: confirma que la transferencia fue recibida.
---

# Problemas Comunes de Transferencias

### "Error al despachar: producto no encontrado en almacén"
Verifica que el producto tenga stock en el **almacén de origen** seleccionado. Si el inventario no tiene almacén asignado (registros antiguos), el sistema no lo encuentra. Contacta al admin.

### "El stock se descontó del origen pero no llegó al destino"
La transferencia está **en tránsito**. El stock del destino se agrega solo cuando alguien hace clic en **"Recibir"** en el destino.

### "Las cantidades convertidas no tienen sentido"
Revisa el **factor de conversión** del producto. Si el producto se inventaría en "sacos" y transferiste en "kg", el sistema aplica el factor. Ejemplo: 10 kg × 0.04 = 0.4 sacos.

### "No puedo crear transferencias (no veo la opción)"
La funcionalidad de traslados requiere el feature flag **MULTI_LOCATION** activo y tener al menos 2 almacenes o sedes configuradas.

### "¿Puedo revertir una transferencia ya despachada?"
No hay reverso automático. Si necesitas devolver la mercancía, crea una **nueva transferencia en sentido contrario** (del destino al origen).

---

*¿Tu problema no está aquí? Usa el Asistente IA (✨) dentro de la plataforma.*
