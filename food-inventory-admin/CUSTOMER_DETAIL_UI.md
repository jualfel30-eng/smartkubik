# Vista de Detalle del Cliente - Documentación UI

## 📍 Ubicación en la Interfaz

### Navegación:
```
Menú Principal → CRM → Clientes
└── Tabla de Clientes
    └── Botón "👁️" (Ojo) en columna "Acciones"
```

## 🎯 Funcionalidad

Al hacer clic en el botón **"👁️ Ver Detalle"** de cualquier cliente en la tabla, se abre un **diálogo modal** de tamaño grande con **3 pestañas**:

---

## 📑 Pestaña 1: INFORMACIÓN

### Contenido:
- **Header**: Nombre del cliente + Badge de Tier (Diamante/Oro/Plata/Bronce) + Tipo
- **Tarjetas de Información**:
  1. **Contacto**:
     - 📧 Email
     - 📞 Teléfono
     - 📍 Dirección completa

  2. **Empresa** (si aplica):
     - Razón Social
     - RIF/NIT

  3. **Resumen Rápido** (4 métricas):
     - 💵 Total Gastado
     - 🛒 Número de Órdenes
     - 📊 Ticket Promedio
     - 📅 Última Compra

---

## 📋 Pestaña 2: HISTORIAL DE COMPRAS

### Multi-Vertical Adaptable:

El sistema **detecta automáticamente** el tipo de negocio basándose en las categorías de productos:

#### Retail/Productos (Por defecto):
```
📦 Historial Completo (X transacciones)

┌──────────────────────────────────────┐
│ ORD-251025-124931-1973    ✅ completed│
│ 25 Oct 2025, 12:49                   │
│                          $428.04      │
│ zelle_usd                             │
├──────────────────────────────────────┤
│ Productos (5):                        │
│ ┌────────────────────────────────┐   │
│ │ Producto      Cant.  P.Unit Total│  │
│ ├────────────────────────────────┤   │
│ │ Mantequilla    3    $14.00  $42 │   │
│ │ Beef Tallow    4    $24.00  $96 │   │
│ │ ...                             │   │
│ └────────────────────────────────┘   │
└──────────────────────────────────────┘
```

#### Hotel (Auto-detectado):
```
Cambios automáticos:
- "Producto" → "Habitación/Servicio"
- Muestra: Suite Deluxe, Habitación Doble, Spa, etc.
```

#### Restaurante (Auto-detectado):
```
Cambios automáticos:
- "Producto" → "Platillo/Bebida"
- Muestra: Paella, Cerveza Artesanal, Postre, etc.
```

### Características:
- ✅ Lista completa de transacciones ordenadas por fecha (más reciente primero)
- ✅ Cada transacción muestra:
  - Número de orden
  - Fecha y hora
  - Estado (badge colorido)
  - Monto total
  - Método de pago
  - Desglose completo de items con:
    - Nombre del producto/servicio
    - Categoría (badge)
    - Cantidad
    - Precio unitario
    - Total por item

- ✅ **Scroll infinito** para historiales largos
- ✅ Estados de carga con spinner
- ✅ Mensaje amigable si no hay transacciones

---

## 📊 Pestaña 3: ESTADÍSTICAS

### Métricas Principales (3 Cards):

1. **Total Gastado**:
   - Monto total en verde
   - Suma de todas las transacciones

2. **Valor Promedio por Orden**:
   - Monto promedio en azul
   - Calculado: Total Gastado / # Órdenes

3. **Total de Transacciones**:
   - Número de órdenes en morado

### Actividad:
- Primera Compra: Fecha
- Última Compra: Fecha

### Top 5 Productos/Servicios Más Comprados:

```
┌──────────────────────────────────────────────────────────┐
│ #  │ Producto       │ Compras │ Cantidad │ Total Gastado │
├────┼────────────────┼─────────┼──────────┼───────────────┤
│ 1  │ Miel con panal │    10   │    18    │    $324.00    │
│    │ [Badge]        │         │          │               │
├────┼────────────────┼─────────┼──────────┼───────────────┤
│ 2  │ Beef Tallow    │    9    │    12    │    $288.00    │
│    │ Facial         │         │          │               │
├────┼────────────────┼─────────┼──────────┼───────────────┤
│ ... (5 productos más comprados)                          │
└──────────────────────────────────────────────────────────┘
```

**Adaptable según vertical**:
- Retail: "Top 5 Productos Más Comprados"
- Hotel: "Top 5 Habitaciones/Servicios Más Comprados"
- Restaurant: "Top 5 Platillos/Bebidas Más Comprados"

---

## 🎨 Características de UX

### Diseño:
- ✅ **Modal de tamaño grande** (max-w-5xl)
- ✅ **Altura máxima** 90% viewport
- ✅ **Scroll interno** para contenido largo
- ✅ **Responsive**: Se adapta a mobile/tablet/desktop
- ✅ **Pestañas con iconos** para fácil navegación

### Estados:
- ✅ **Loading**: Spinner con mensaje "Cargando historial..."
- ✅ **Error**: Mensaje de error con icono
- ✅ **Empty State**: Mensaje amigable si no hay datos

### Performance:
- ✅ **Lazy loading**: Solo carga datos al abrir el diálogo
- ✅ **Parallel requests**: Transacciones y estadísticas se cargan en paralelo
- ✅ **Memoization**: Cálculos optimizados

---

## 🔗 Integración Backend

### Endpoints Utilizados:

1. `GET /customers/:id/transactions`
   - Retorna: Array de transacciones completas
   - Incluye: items, fechas, montos, métodos de pago

2. `GET /customers/:id/transaction-stats`
   - Retorna: Estadísticas agregadas
   - Incluye: totales, promedios, top productos

### Ejemplo de Datos Mostrados:

```javascript
// Cliente: Diana Moreira
{
  totalSpent: 1454.79,
  totalTransactions: 20,
  averageOrderValue: 72.74,
  firstPurchaseDate: "2025-10-20",
  lastPurchaseDate: "2025-10-25",
  topProducts: [
    {
      productName: "Miel con panal",
      purchaseCount: 10,
      totalQuantity: 18,
      totalSpent: 324.00
    }
    // ... más productos
  ]
}
```

---

## 🌍 Multi-Vertical: Detección Automática

### Algoritmo de Detección:

```javascript
// Analiza categorías de productos en transacciones
const categories = transactions[0]?.items?.map(item => item.category);

if (categories.includes('habitación') || categories.includes('room')) {
  → businessType = 'hotel'
  → Label: "Habitación/Servicio"
}
else if (categories.includes('comida') || categories.includes('food')) {
  → businessType = 'restaurant'
  → Label: "Platillo/Bebida"
}
else {
  → businessType = 'retail'
  → Label: "Producto"
}
```

### Ejemplos por Vertical:

#### 🏢 Retail/Mayorista:
```
Top 5 Productos:
- Aceite de coco (8 compras)
- Beef Tallow (6 compras)
- Miel con panal (10 compras)
```

#### 🏨 Hotel:
```
Top 5 Habitaciones/Servicios:
- Suite Presidential (5 reservas)
- Habitación Doble (12 reservas)
- Spa Premium (8 sesiones)
```

#### 🍽️ Restaurante:
```
Top 5 Platillos/Bebidas:
- Paella Valenciana (15 órdenes)
- Cerveza Artesanal (25 órdenes)
- Tarta de Limón (8 órdenes)
```

---

## 📱 Vista Mobile

En dispositivos móviles:
- ✅ Modal ocupa 100% del ancho
- ✅ Grid de métricas cambia a columna única
- ✅ Tabla de productos con scroll horizontal
- ✅ Pestañas siguen siendo navegables

---

## 🎯 Casos de Uso

### 1. Ver Historial Completo de Cliente
```
1. Ir a CRM → Clientes
2. Buscar cliente "Diana Moreira"
3. Click en botón 👁️
4. Click en pestaña "Historial de Compras"
5. Ver 20 transacciones con desglose completo
```

### 2. Identificar Top Productos del Cliente
```
1. Abrir detalle del cliente
2. Click en pestaña "Estadísticas"
3. Scroll a "Top 5 Productos"
4. Ver que "Miel con panal" es el favorito ($324 gastados)
```

### 3. Calcular Frecuencia de Compra
```
1. Abrir detalle del cliente
2. Ver en "Estadísticas":
   - Primera compra: 20 Oct 2025
   - Última compra: 25 Oct 2025
   - Total transacciones: 20
   - Frecuencia: ~1 compra por día (en 5 días)
```

---

## 🚀 Archivos Modificados

### Nuevos:
```
✅ src/components/CustomerDetailDialog.jsx (500+ líneas)
   - Componente principal con 3 pestañas
   - Detección automática de vertical
   - Integración con backend
   - Estados de carga/error
```

### Modificados:
```
✏️  src/components/CRMManagement.jsx
   - Importado CustomerDetailDialog (+1 línea 39)
   - Importado icono Eye (+1 línea 33)
   - Estado selectedCustomer (+2 líneas 152-153)
   - Botón "Ver Detalle" en tabla (+11 líneas 1909-1919)
   - Render del diálogo (+11 líneas 2210-2219)
```

---

## ✅ Resultado Final

### Antes:
```
CRM → Clientes
└── Tabla con:
    - Nombre
    - Email
    - Total Gastado
    - Acciones: [Editar] [Eliminar]
```

### Ahora:
```
CRM → Clientes
└── Tabla con:
    - Nombre
    - Email
    - Total Gastado
    - Acciones: [👁️ Ver] [✏️ Editar] [🗑️ Eliminar]
                   ↓
           [Diálogo Modal]
           ┌──────────────────────┐
           │ 📋 Información       │
           │ 🛒 Historial Compras │ ← NUEVO
           │ 📊 Estadísticas      │ ← NUEVO
           └──────────────────────┘
```

---

## 🎓 Notas Técnicas

### Ventajas del Diseño:
1. **No sobrecarga el diálogo**: Usa pestañas para organizar información
2. **100% multi-vertical**: Se adapta automáticamente a cualquier negocio
3. **Reutilizable**: Funciona para retail, hotel, restaurante, fabricante, etc.
4. **Performance optimizada**: Carga datos solo cuando se necesitan
5. **UX moderna**: Diseño limpio con ShadcnUI components

### Tecnologías:
- ✅ React Hooks (useState, useEffect)
- ✅ ShadcnUI (Dialog, Tabs, Card, Table, Badge, ScrollArea)
- ✅ Lucide Icons
- ✅ Tailwind CSS
- ✅ API Integration (fetchApi)

---

**Documentación actualizada**: 2025-11-21
**Versión**: 1.0
**Estado**: ✅ Implementado y Funcional
