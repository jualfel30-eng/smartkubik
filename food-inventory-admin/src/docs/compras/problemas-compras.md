---
title: "Problemas Comunes de Compras y Cómo Resolverlos"
description: "Soluciones a: proveedor que no aparece, stock que no se actualiza al recibir, RIF inválido, y más."
category: "compras"
slug: "problemas-compras"
keywords: ["problemas", "compras", "proveedor no aparece", "stock", "RIF", "error", "solución"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "5 min"
industry: "Todas"
problem: "Algo no funciona como esperas en las compras o proveedores."
solution: "Guía rápida de diagnóstico."
quickAnswer: |
  Proveedor no aparece: escribe mín. 2 caracteres en el buscador.
  Stock no se actualiza: verifica que hayas hecho clic en "Recibir" la orden.
  RIF inválido: usa formato J-12345678 o V-12345678.
---

# Problemas Comunes de Compras

### "Recibí la orden pero el inventario no se actualizó"

**Verificar:** ¿El status de la orden dice "Recibido"? Si dice "Pendiente" o "Aprobado", el stock no se actualiza hasta que cambies a "Recibido".

### "El RIF me da error de formato"

Formato válido: **Letra + guión + 7 a 9 dígitos**. Ejemplos válidos:
- `J-12345678` ✅
- `V-9876543` ✅
- `J12345678` ✅ (el sistema agrega el guión)

Letras válidas: V, E, J, G, P, N, C.

### "Se crearon 2 cuentas por pagar para una sola compra"

Es correcto si configuraste **adelanto**. Se crea una por el adelanto (vence hoy) y otra por el saldo restante.

### "El proveedor aparece duplicado"

**Causa:** Se creó el proveedor desde dos lugares diferentes (CRM + Compras) con RIF ligeramente diferente (ej: "J12345678" vs "J-12345678").

**Solución:** El sistema normaliza los RIF, pero si uno se creó antes de la normalización, puede haber duplicados. Contacta al administrador para consolidar.

### "No puedo rechazar una orden de compra"

Para rechazar necesitas proporcionar una **razón** (obligatoria). Si el campo de razón está vacío, el botón no funciona.

### "¿Puedo editar una orden ya recibida?"

No. Una vez recibida, la orden es inmutable porque ya generó movimientos de inventario y cuentas por pagar. Si necesitas corregir algo, crea una orden nueva.

---

*¿Tu problema no está aquí? Usa el Asistente IA (✨) dentro de la plataforma.*
