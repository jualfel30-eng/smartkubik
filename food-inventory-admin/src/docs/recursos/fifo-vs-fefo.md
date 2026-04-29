---
title: "FIFO vs FEFO: Qué son, Diferencias y Cuál Usar en tu Negocio"
description: "Guía completa sobre métodos FIFO y FEFO de rotación de inventario. Aprende cuál usar según tu industria y cómo implementarlos correctamente."
category: "recursos"
slug: "fifo-vs-fefo"
keywords: ["FIFO", "FEFO", "rotación de inventario", "gestión de inventario", "control de caducidad", "almacén"]
author: "Equipo SmartKubik"
date: "2025-01-01"
readTime: "7 min"
industry: "General"
problem: "Productos Vencidos y Mal Rotados"
solution: "Método Correcto de Rotación"
quickAnswer: |
  FIFO: lo primero que entra, primero que sale (ideal para retail).
  FEFO: lo primero que vence, primero que sale (ideal para alimentos/farma).
  SmartKubik soporta ambos: configúralo en Inventario → Configuración.
---

# FIFO vs FEFO: Qué son, Diferencias y Cuál Usar en tu Negocio

## ¿Qué es FIFO?

**FIFO = First In, First Out** (Primero en Entrar, Primero en Salir)

Es un método de rotación de inventario donde **los productos que llegan primero a tu almacén, son los primeros en venderse o usarse**.

### Ejemplo de FIFO:
```
Lunes: Compras 50 camisetas blancas (Lote A)
Viernes: Compras 30 camisetas blancas (Lote B)

Con FIFO:
- Primero vendes las 50 del Lote A
- Después vendes las 30 del Lote B
```

### ¿Para qué sirve FIFO?
- ✅ Evitar obsolescencia de productos
- ✅ Mantener inventario fresco
- ✅ Cumplir con buenas prácticas contables
- ✅ Reducir pérdidas por productos viejos

---

## ¿Qué es FEFO?

**FEFO = First Expired, First Out** (Primero en Vencer, Primero en Salir)

Es un método donde **los productos con fecha de caducidad más cercana se venden/usan primero**, sin importar cuándo llegaron al almacén.

### Ejemplo de FEFO:
```
Lunes: Compras yogures (Lote A) - Caducan 15 de marzo
Miércoles: Compras yogures (Lote B) - Caducan 8 de marzo

Con FEFO:
- Primero vendes Lote B (caduca antes)
- Después vendes Lote A
```

### ¿Para qué sirve FEFO?
- ✅ Evitar desperdicio por caducidad
- ✅ Cumplir regulaciones sanitarias
- ✅ Garantizar frescura al cliente
- ✅ Reducir pérdidas económicas

---

## Diferencias Clave: FIFO vs FEFO

| Característica | FIFO | FEFO |
|----------------|------|------|
| **Criterio de salida** | Fecha de entrada al almacén | Fecha de caducidad |
| **Industrias** | Retail, manufactura, logística | Alimentos, farmacia, cosméticos |
| **Complejidad** | Baja (solo orden de llegada) | Media (requiere control de lotes) |
| **Regulación** | Buena práctica | Obligatorio en muchos sectores |
| **Etiquetado** | SKU básico | SKU + lote + fecha vencimiento |
| **Tecnología** | Opcional | Necesaria (códigos de barras) |

---

## ¿Cuándo Usar FIFO?

### ✅ Industrias y Productos Ideales para FIFO:

#### 1. **Ropa y Moda**
- Las camisetas de hace 3 meses siguen siendo buenas
- Pero las de la temporada pasada pierden valor (obsolescencia)
- FIFO evita que se queden con colecciones viejas

#### 2. **Electrónica y Tecnología**
- Los productos no "caducan" pero se vuelven obsoletos
- FIFO garantiza vender modelos más antiguos primero
- Evita quedarse con tecnología desfasada

#### 3. **Ferretería y Materiales de Construcción**
- Tornillos, clavos, cables no se vencen
- FIFO mantiene rotación constante
- Evita corrosión u deterioro por almacenamiento prolongado

#### 4. **Artículos de Oficina**
- Papelería, folders, bolígrafos
- Larga vida útil pero mejor rotar

#### 5. **Muebles y Decoración**
- No tienen caducidad
- FIFO evita acumulación de piezas sin vender

### 📊 Ejemplo Real: Tienda de Ropa "Fashion Express"

**Sin FIFO:**
- Llegan playeras de invierno en octubre (Lote A)
- Llegan más playeras en noviembre (Lote B)
- Venden primero las de noviembre (más visibles)
- Resultado: Lote A se queda sin vender hasta enero (descuento del 50%)

**Con FIFO:**
- Sistema indica: "Despachar primero Lote A"
- Lote A se vende a precio completo antes de que pase de moda
- Ahorro: $5,000 USD en descuentos evitados

---

## ¿Cuándo Usar FEFO?

### ✅ Industrias y Productos que DEBEN Usar FEFO:

#### 1. **Restaurantes y Food Service** ⭐ OBLIGATORIO
- Carnes, pescados, lácteos, vegetales
- Fechas de caducidad cortas (días/semanas)
- Regulación sanitaria estricta

**Ejemplo:**
```
Tienes en refrigerador:
- Leche A: caduca 5 de marzo
- Leche B: caduca 2 de marzo

FEFO: Usar primero Leche B (aunque haya llegado después)
```

#### 2. **Farmacias y Hospitales** ⭐ OBLIGATORIO
- Medicamentos con fecha de vencimiento
- Regulado por COFEPRIS (México) o FDA (USA)
- Vender medicamento vencido = multas severas

#### 3. **Supermercados y Tiendas de Alimentos**
- Cualquier producto perecedero
- Yogures, quesos, embutidos, pan
- FEFO protege al cliente y al negocio

#### 4. **Cosméticos y Cuidado Personal**
- Cremas, maquillajes, perfumes tienen PAO (Period After Opening)
- Aunque no siempre tienen fecha de caducidad visible
- FEFO mantiene productos frescos

#### 5. **Laboratorios y Química**
- Reactivos químicos con estabilidad limitada
- Muestras biológicas
- Fecha de caducidad = seguridad

### 🏥 Caso Real: Farmacia "Salud Total"

**Sin FEFO (usando FIFO tradicional):**
- Lote A de Paracetamol: llegó en enero, caduca en julio
- Lote B de Paracetamol: llegó en marzo, caduca en mayo
- Con FIFO venderían Lote A primero
- Resultado: Lote B caduca sin venderse → $2,000 USD perdidos

**Con FEFO:**
- Sistema detecta que Lote B caduca antes
- Alerta para vender Lote B primero
- Resultado: 0% de producto vencido, 100% de ventas aprovechadas

---

## ¿Se Pueden Combinar FIFO y FEFO?

**¡Sí!** De hecho, es lo más común en negocios mixtos.

### Ejemplo: Supermercado

| Categoría | Método | Razón |
|-----------|--------|-------|
| **Lácteos** | FEFO | Tienen fecha de caducidad |
| **Enlatados** | FIFO | Larga vida útil, pero rotar por frescura |
| **Artículos de limpieza** | FIFO | No caducan, pero evitar obsolescencia |
| **Panadería** | FEFO | Caducidad muy corta (1-3 días) |
| **Electrónicos** | FIFO | No caducan, pero tecnología avanza |

---

## Cómo Implementar FIFO en tu Negocio

### 1. **Organización Física del Almacén**
```
Zona de Recepción → Zona de Almacenamiento → Zona de Despacho

Regla: "Lo nuevo atrás, lo viejo adelante"
```

**Layout recomendado:**
- Productos nuevos siempre en la parte trasera del rack
- Productos viejos en la parte frontal (se toman primero)
- Señalización clara con fechas de entrada

### 2. **Etiquetado con Fecha de Entrada**
- Cada lote recibe sticker con fecha de recepción
- Código de barras con información de lote
- Color por semana/mes (sistema visual rápido)

### 3. **Capacitación del Equipo**
- Almacenistas deben rotar productos al recibir
- Vendedores deben tomar del frente
- Supervisores verifican cumplimiento

### 4. **Sistema Automatizado (SmartKubik)**
- Sistema sugiere qué lote despachar
- Alertas si se intenta vender lote incorrecto
- Reportes de cumplimiento de FIFO

---

## Cómo Implementar FEFO en tu Negocio

### 1. **Control Estricto de Lotes**
Cada producto debe tener:
- Número de lote
- Fecha de fabricación
- **Fecha de caducidad/vencimiento**

### 2. **Sistema de Código de Barras Avanzado**
Escanear código debe mostrar:
```
Producto: Yogurt Natural 1L
Lote: YN-2025-001
Fabricación: 15/01/2025
Caducidad: 15/03/2025
Días restantes: 45
```

### 3. **Alertas Automáticas**
- **Verde:** Más de 30 días para caducidad
- **Amarillo:** 15-30 días (priorizar venta)
- **Rojo:** Menos de 15 días (descuento o donar)
- **Negro:** Vencido (retirar inmediatamente)

### 4. **Ubicaciones Inteligentes**
- Productos próximos a vencer en ubicaciones preferenciales
- Productos con más vida útil en almacén profundo
- Separación física por rangos de caducidad

### 5. **SmartKubik con FEFO Automático**
- Escaneas producto → Sistema indica cuál lote usar
- Picking lists ordenadas por fecha de caducidad
- Imposible despachar lote incorrecto (validación)

---

## Errores Comunes y Cómo Evitarlos

### ❌ Error 1: "Uso FIFO para alimentos perecederos"
**✅ Solución:** Cambia a FEFO. FIFO puede hacer que vendas lo "nuevo" antes que lo que está por caducar.

### ❌ Error 2: "No etiqueto lotes con fecha de caducidad"
**✅ Solución:** Implementa etiquetado obligatorio al recibir mercancía.

### ❌ Error 3: "Confío solo en la memoria del equipo"
**✅ Solución:** Automatiza con un ERP. La memoria humana falla.

### ❌ Error 4: "Hago inventarios solo una vez al mes"
**✅ Solución:** Inventarios cíclicos semanales, especialmente en perecederos.

### ❌ Error 5: "No tengo visibilidad de qué está por caducar"
**✅ Solución:** Dashboard con alertas de productos con menos de X días.

---

## Tecnología para FIFO/FEFO: SmartKubik

### 🚀 Características del Módulo de Inventario:

#### Para FIFO:
- Registro automático de fecha de entrada
- Orden cronológico de lotes
- Sugerencias de despacho inteligente
- Reportes de antigüedad de inventario

#### Para FEFO:
- Control de fechas de caducidad por lote
- Alertas de productos próximos a vencer (configurable)
- Priorización automática en picking
- Dashboard de productos por caducar
- Bloqueo de lotes vencidos

#### Funcionalidades Avanzadas:
- **Rotación mixta:** FIFO para algunos productos, FEFO para otros
- **App móvil:** Escanea y el sistema te dice qué lote usar
- **Reportes:** % de cumplimiento de FIFO/FEFO
- **Costos:** Cálculo de pérdidas por productos vencidos

---

## Preguntas Frecuentes

### ¿Qué pasa si tengo productos sin fecha de caducidad pero quiero aplicar FEFO?
Puedes asignar una "fecha de vida útil sugerida" manualmente. Por ejemplo, camisetas de temporada pueden tener una "caducidad comercial" de 6 meses.

### ¿FEFO es obligatorio por ley?
En industrias reguladas (alimentos, farmacia) SÍ. Para otras industrias es una buena práctica pero no obligatorio.

### ¿Necesito un sistema automatizado o puedo hacerlo manual?
Puedes hacerlo manual con 10-50 productos. Con más de 100 SKUs o múltiples lotes, necesitas tecnología.

### ¿SmartKubik soporta ambos métodos?
Sí. Puedes configurar por categoría/producto cuál método usar. Incluso tener ambos en el mismo almacén.

---

## Conclusión: ¿Cuál Usar?

### Usa FIFO si:
- ✅ Tus productos NO tienen fecha de caducidad
- ✅ Quieres evitar obsolescencia comercial
- ✅ Industria: retail, moda, tecnología, ferretería

### Usa FEFO si:
- ✅ Tus productos tienen fecha de vencimiento
- ✅ Industria regulada (alimentos, farmacia)
- ✅ Quieres cero desperdicio por caducidad

### Usa AMBOS si:
- ✅ Tienes catálogo mixto (perecederos + no perecederos)
- ✅ Quieres máximo control de inventario

---

## Empieza a Rotar tu Inventario Correctamente

El método correcto de rotación puede ahorrar miles de dólares al mes en productos vencidos o desactualizados.

### 📋 Próximos Pasos:

1. **[Prueba SmartKubik GRATIS](https://smartkubik.com/register)** - Con control FIFO/FEFO incluido
2. **Configura tus productos** - Define qué método usar por categoría
3. **Activa alertas** - Recibe notificaciones de productos por caducar

---

## Recursos Relacionados

- [Qué es un ERP y Por Qué lo Necesitas](/docs/general/que-es-erp)
- [Reducir Desperdicio de Alimentos en Restaurantes](/docs/restaurantes/reducir-desperdicio-alimentos)
- [Control de Inventario para Tiendas](/docs/retail/control-inventario-tienda)
- [Gestión de Almacén con WMS](/docs/logistica/gestion-almacen)
- [Sistema ABC de Inventario](/docs/general/sistema-abc-inventario)

---

**Etiquetas:** #FIFO #FEFO #RotaciónDeInventario #ControlDeCaducidad #GestiónDeInventario #SmartKubik #Almacén #Perecederos
