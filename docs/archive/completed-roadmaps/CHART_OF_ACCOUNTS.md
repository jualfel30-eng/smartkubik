# PLAN DE CUENTAS (CHART OF ACCOUNTS) - MATRIZ COMPLETA

## ESTRUCTURA Y CODIFICACIÓN

```
FORMATO: [TIPO][SECUENCIAL]
TIPO:
  1 = Activo
  2 = Pasivo
  3 = Patrimonio
  4 = Ingreso
  5 = Gasto

GENERACIÓN: Automática secuencial por tipo
  Ej: Si última cuenta Activo es 1103
  Siguiente = 1104
```

---

## 1. ACTIVO (Tipo 1xxx)

### Cuentas Corrientes (1100-1199)

| Código | Nombre | Tipo | Descripción | Estado |
|--------|--------|------|-------------|--------|
| 1101 | Caja y Bancos | Activo Circulante | Efectivo disponible y depósitos bancarios | Requerido |
| 1102 | Cuentas por Cobrar | Activo Circulante | Créditos por ventas a clientes | Requerido |
| 1103 | Inventario | Activo Circulante | Mercancía disponible para venta | Auto-creado |
| 1104+ | Otras Cuentas Activo | Activo | Según necesidad del negocio | Adicionales |

---

## 2. PASIVO (Tipo 2xxx)

### Obligaciones Corrientes (2100-2199)

| Código | Nombre | Tipo | Descripción | Estado |
|--------|--------|------|-------------|--------|
| 2101 | Cuentas por Pagar | Pasivo Circulante | Deudas a proveedores | Requerido |
| 2102 | Impuestos por Pagar | Pasivo Circulante | IVA, IGTF por tributar | Requerido |
| 2103 | Anticipos de Clientes | Pasivo Circulante | Depósitos por ventas futuras | Auto-creado |
| 2104 | Sueldos y Salarios por Pagar | Pasivo Circulante | Nómina pendiente | Sistema |
| 2105 | Prestaciones Sociales por Pagar | Pasivo Circulante | Prestaciones pendientes | Sistema |
| 2106 | Aportes Patronales por Pagar | Pasivo Circulante | Seguridad social | Sistema |

---

## 3. PATRIMONIO (Tipo 3xxx)

### Capital y Resultados (3100-3199)

| Código | Nombre | Tipo | Descripción | Estado |
|--------|--------|------|-------------|--------|
| 3101 | Capital Social | Patrimonio | Inversión inicial del dueño | Manual |
| 3102 | Utilidades Retenidas | Patrimonio | Ganancias acumuladas años anteriores | Calculado |
| 3103 | Utilidades del Período | Patrimonio | Ganancias del año actual | Calculado |
| 399 | Utilidad Neta del Período | Patrimonio | Ingresos - Gastos (en balance sheet) | Reportes |

---

## 4. INGRESOS (Tipo 4xxx)

### Ingresos Operacionales (4100-4199)

| Código | Nombre | Tipo | Descripción | Estado |
|--------|--------|------|-------------|--------|
| 4101 | Ingresos por Ventas | Ingreso Operacional | Ventas de mercancía/servicios | Requerido |
| 4102 | Ingresos por Envío | Ingreso Operacional | Comisión por envíos | Auto-creado |
| 4103 | Descuentos sobre Ventas | Contra-Ingreso | Descuentos en ventas | Auto-creado |
| 4104+ | Otros Ingresos | Ingreso | Según necesidad | Adicionales |

### Ingresos No Operacionales (4200-4299)

| Código | Nombre | Tipo | Descripción | Estado |
|--------|--------|------|-------------|--------|
| 4201 | Ingresos por Intereses | Ingreso No-Operacional | Intereses ganados | Manual |
| 4202 | Ganancias por Cambio de Divisa | Ingreso No-Operacional | Ganancia en conversión USD/VES | Manual |

---

## 5. GASTOS (Tipo 5xxx)

### Gastos de Operación (5100-5199)

| Código | Nombre | Tipo | Descripción | Estado |
|--------|--------|------|-------------|--------|
| 5101 | Costo de Mercancía Vendida | Gasto Operacional | Costo de bienes vendidos | Requerido |
| 5102 | Gastos de Transporte | Gasto Operacional | Fletes y distribución | Manual |
| 5103 | Gastos de Almacenamiento | Gasto Operacional | Alquiler de bodega | Manual |

### Gastos Administrativos (5200-5299)

| Código | Nombre | Tipo | Descripción | Estado |
|--------|--------|------|-------------|--------|
| 5201 | Gastos de Administración | Gasto Administrativo | Sueldos administrativos | Manual |
| 5202 | Servicios Profesionales | Gasto Administrativo | Contador, abogado, etc | Manual |
| 5203 | Servicios Básicos | Gasto Administrativo | Luz, agua, internet | Manual |
| 5205 | Gasto de Prestaciones Sociales | Gasto Operacional | Prestaciones a empleados | Sistema |
| 5206 | Gasto de Seguridad Social | Gasto Operacional | Aportes IVSS/Fondo de Paro | Sistema |
| 5207 | Gasto de Aguinaldos y Bonos | Gasto Operacional | Pagos especiales | Sistema |

### Otros Gastos (5300-5399)

| Código | Nombre | Tipo | Descripción | Estado |
|--------|--------|------|-------------|--------|
| 5301 | Gastos de Ventas | Gasto Operacional | Publicidad, comisiones | Manual |
| 5302 | Gastos de Mantenimiento | Gasto Operacional | Reparaciones | Manual |

### Gastos Financieros y Tributarios (5900-5999)

| Código | Nombre | Tipo | Descripción | Estado |
|--------|--------|------|-------------|--------|
| 5901 | Gastos de Intereses | Gasto Financiero | Intereses pagados | Manual |
| 5902 | Comisiones Bancarias | Gasto Financiero | Comisiones de banco | Manual |
| 5903 | Pérdidas por Cambio de Divisa | Gasto Financiero | Pérdida en conversión USD/VES | Manual |
| 599 | Gasto IGTF | Gasto Tributario | Impuesto sobre transacciones en USD | Auto-creado |

---

## MATRIZ DE RELACIONES TRANSACCIONALES

### Transacción: VENTA

```
Orden creada (subtotal $100, IVA $16, total $116)
        ↓
Asiento generado:
  Débito:  1102 Cuentas por Cobrar    $116
  Crédito: 4101 Ingresos por Venta    $100
  Crédito: 2102 Impuestos por Pagar   $16
  
Si hay descuento ($10):
  Débito:  4103 Descuentos           $10
  Débito:  1102 (ajustado)           $106 (total - descuento)
  
Si hay envío ($5):
  Crédito: 4102 Ingresos por Envío   $5
```

### Transacción: COSTO DE VENTAS

```
Misma orden con costPrice = $50
        ↓
Asiento generado:
  Débito:  5101 Costo Mercancía Vendida  $50
  Crédito: 1103 Inventario               $50
```

### Transacción: PAGO DE VENTA

```
Cliente paga $116
        ↓
Asiento generado:
  Débito:  1101 Caja y Bancos        $116
  Crédito: 1102 Cuentas por Cobrar   $116
  
Si hay IGTF ($3.48 = 3% de $116):
  Débito:  599 Gasto IGTF             $3.48
  Crédito: 2102 Impuestos por Pagar   $3.48
```

### Transacción: COMPRA

```
Recibe compra por $500
        ↓
Asiento generado:
  Débito:  1103 Inventario           $500
  Crédito: 2101 Cuentas por Pagar    $500
```

### Transacción: PAGO DE COMPRA

```
Paga proveedor $500
        ↓
Asiento generado:
  Débito:  2101 Cuentas por Pagar    $500
  Crédito: 1101 Caja y Bancos        $500
```

### Transacción: PAYABLE FLEXIBLE

```
Crear payable para gastos (nómina $300)
Líneas del payable especifican:
  - Línea 1: Gasto Prestaciones ($100) → 5205
  - Línea 2: Gasto Seguridad Social ($200) → 5206
        ↓
Asiento generado:
  Débito:  5205 Gasto Prestaciones      $100
  Débito:  5206 Gasto Seguridad Social  $200
  Crédito: 2101 Cuentas por Pagar       $300
```

---

## SALDOS NATURALES DE CUENTAS

```
TIPO        | SALDO NORMAL  | SIGNIFICADO
------------|---------------|--------------------------------------------
Activo      | DEUDOR        | Si Débito > Crédito (recurso disponible)
Pasivo      | ACREEDOR      | Si Crédito > Débito (obligación pendiente)
Patrimonio  | ACREEDOR      | Si Crédito > Débito (inversión neta)
Ingreso     | ACREEDOR      | Si Crédito > Débito (ganancia)
Gasto       | DEUDOR        | Si Débito > Crédito (costo)
```

**En Balance Sheet:**
- Activos: Se suman los débitos netos
- Pasivos: Se restan (son negativos)
- Patrimonio: Se resta (es negativo)
- Ingresos/Gastos: Se incluyen en Utilidad Neta

---

## CUENTAS AUTO-CREADAS

El sistema crea automáticamente si no existen:

1. **1103** - Inventario (en primer asiento de venta/compra)
2. **4102** - Ingresos por Envío (si hay costo de envío)
3. **4103** - Descuentos sobre Venta (si hay descuentos)
4. **2103** - Anticipos de Clientes (para depósitos)
5. **599** - Gasto IGTF (si hay pagos con IGTF)

---

## VENTAJAS DE ESTA ESTRUCTURA

1. **Codificación Clara**: Prefijo indica tipo, número secuencial
2. **Escalabilidad**: Permite agregar cuentas sin afectar existentes
3. **Automatización**: Cuentas se crean según necesidad
4. **Multi-tenant**: Cada empresa tiene su propio plan
5. **Reportabilidad**: Fácil filtrar por tipo para reportes
6. **Auditoría**: Metadata indica origen de transacciones

---

## EJEMPLO DE CONSULTAS

### Obtener todas las cuentas de Activo
```javascript
chartOfAccounts.find({ 
  tenantId: "tenant-123",
  type: "Activo",
  code: /^1/ 
})
```

### Obtener saldo de cuenta específica
```javascript
// En journal entries
journalEntryModel.aggregate([
  { $match: { tenantId: "tenant-123", "lines.account": accountId } },
  { $unwind: "$lines" },
  { $group: {
      _id: "$lines.account",
      totalDebit: { $sum: "$lines.debit" },
      totalCredit: { $sum: "$lines.credit" }
    }
  },
  { $project: {
      balance: { $subtract: ["$totalDebit", "$totalCredit"] }
    }
  }
])
```

