---
title: "Facturación Electrónica y Retenciones (IVA/ISLR)"
description: "Cómo emitir facturas, notas de crédito/débito, gestionar retenciones de IVA e ISLR, y preparar la declaración de IVA."
category: "finanzas"
slug: "facturacion-fiscal"
keywords: ["facturación", "factura", "IVA", "ISLR", "retención", "SENIAT", "nota de crédito"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "10 min"
industry: "Todas"
problem: "Necesitas emitir facturas fiscales, gestionar retenciones, y preparar declaraciones de IVA."
solution: "SmartKubik integra facturación con números de control, libros de IVA automáticos, retenciones, y exportación a formato SENIAT."
quickAnswer: |
  Emitir factura: al cobrar una venta, activa "Generar factura".
  Retención IVA: Finanzas → Retenciones → Nueva → selecciona factura.
  Nota de crédito: desde la venta original → "Nota de Crédito".
---

# Facturación Electrónica y Retenciones

## Emitir una factura

1. Después de cobrar una orden en el POS, el sistema te pide el tipo de documento
2. Selecciona **"Factura"**
3. El sistema:
   - Asigna un **número de control** (Imprenta Digital)
   - Calcula los totales en VES con la tasa BCV del momento
   - Genera el asiento contable automáticamente
   - Registra la línea en el **Libro de Ventas IVA**

> **¿Cuándo usar Nota de Entrega?** Cuando entregas mercancía sin facturar inmediatamente. Las notas de entrega NO tienen impuestos ni número de control.

---

## Retenciones de IVA

Si tu negocio es agente de retención:

1. Ve a **Facturación → Retenciones** (`/billing/retenciones`)
2. Pestaña **IVA**
3. Crea una retención: selecciona proveedor, factura, porcentaje (75% o 100%)
4. **Postear:** Genera el asiento contable (Debita CxP, Acredita IVA Retenido)
5. **Exportar ARC:** Al final del mes, exporta las retenciones en formato SENIAT

---

## Retenciones de ISLR

Para pagos que requieren retención de impuesto sobre la renta:

1. Pestaña **ISLR** en Retenciones
2. Crea la retención con:
   - Tipo de beneficiario (proveedor o empleado)
   - Tipo de operación (honorarios, comisiones, salarios, etc.)
   - Porcentaje (varía según la operación, 1-34%)
3. Postear y exportar ARC para SENIAT

---

## Declaración de IVA (Forma 30)

1. Ve a **Contabilidad** → pestaña **Fiscal** → **Declaración IVA**
2. Selecciona **mes y año**
3. Haz clic en **"Calcular"** — el sistema:
   - Sincroniza facturas emitidas con el Libro de Ventas
   - Valida los Libros de Compras y Ventas
   - Calcula: Débito Fiscal - Crédito Fiscal = IVA a Pagar
4. Revisa los totales y el desglose por alícuota (0%, 8%, 16%)
5. **Presentar:** Genera XML para cargar en el portal SENIAT
6. **Registrar pago:** Cuando pagas, registra la referencia

---

## Cuentas por Pagar

Ve a **Finanzas → Cuentas por Pagar** (`/accounts-payable`)

Aquí ves todas las deudas del negocio:
- Se crean automáticamente al **recibir órdenes de compra**
- Filtrable por moneda, antigüedad, estado
- Registra pagos parciales o totales
- Cada pago genera asiento contable automático

---

## Cuentas Bancarias

Ve a **Finanzas → Cuentas Bancarias** (`/bank-accounts`)

- Registra todas tus cuentas (corriente, ahorro, nómina)
- El saldo se actualiza automáticamente con cada pago recibido o emitido
- Puedes hacer **ajustes manuales** de saldo con razón documentada
- Transferencias entre cuentas propias

---

## Problemas comunes

### "La declaración de IVA muestra números incorrectos"

Haz clic en **"Calcular"** de nuevo — el sistema re-sincroniza todas las facturas y valida los libros. Si hay facturas que no aparecen, verifica que fueron **emitidas** (no solo creadas como borrador).

### "Me falta un número de control en una factura"

Los números de control se asignan al **emitir**, no al crear. Si la factura está en borrador, no tiene número de control. Emítela para que se asigne.

### "¿Puedo anular una factura ya emitida?"

No puedes borrarla (cumplimiento fiscal). Pero puedes emitir una **Nota de Crédito** que la contrarresta. La nota queda registrada en el Libro de Ventas como anulación.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
