# Sistema de Vistas Configurables para Productos en Órdenes

## 🎯 Objetivo

Permitir que cada tenant configure cómo desea visualizar los productos al crear órdenes, adaptándose a diferentes tipos de negocio:

- **Restaurantes/Retail**: Vista de **grid con imágenes** para pantallas táctiles
- **Distribuidoras/Mayoristas**: Vista de **búsqueda** para catálogos grandes
- **Flexibilidad**: El usuario puede cambiar de vista según su preferencia

## 📁 Archivos Creados/Modificados

### Backend

1. **Schema de Tenant** - `/food-inventory-saas/src/schemas/tenant.schema.ts`
   - Agregado campo `orders` en `TenantSettings` con las nuevas propiedades:
     - `productViewType`: 'search' | 'grid' | 'list'
     - `gridColumns`: número de columnas (2-6)
     - `showProductImages`: mostrar imágenes
     - `showProductDescription`: mostrar descripción
     - `enableCategoryFilter`: habilitar filtro por categoría

2. **DTO de Tenant** - `/food-inventory-saas/src/dto/tenant.dto.ts`
   - Creada clase `OrdersSettingsDto` con validaciones
   - Agregada a `OperationalSettingsDto`

### Frontend

1. **Componentes Nuevos**:
   - `ProductGridView.jsx` - Vista de tarjetas con imágenes
   - `ProductSearchView.jsx` - Vista de búsqueda (wrapper del actual)
   - `ViewSwitcher.jsx` - Toggle para cambiar entre vistas

2. **Hook Personalizado**:
   - `useTenantViewPreferences.js` - Maneja preferencias de vista

3. **Integración**:
   - `NewOrderFormV2.jsx` - Modificado para usar el sistema de vistas

## 🚀 Cómo Usar

### Configuración Inicial por Tenant

Puedes configurar las preferencias por defecto usando la API:

```bash
PUT /tenant/settings
Authorization: Bearer <token>

{
  "settings": {
    "orders": {
      "productViewType": "grid",      // 'search' | 'grid' | 'list'
      "gridColumns": 3,                // 2, 3, 4, 6
      "showProductImages": true,
      "showProductDescription": false,
      "enableCategoryFilter": true
    }
  }
}
```

### Uso en la Interfaz

1. **El usuario entra a crear una orden**
2. **Se carga automáticamente** la vista configurada para su tenant
3. **Puede cambiar de vista** usando el `ViewSwitcher` (botones superiores)
4. **La preferencia se guarda automáticamente** al cambiar de vista

## 🎨 Características de la Vista Grid

### Funcionalidades

- **Búsqueda rápida**: Barra de búsqueda por nombre, SKU o marca
- **Filtros por categoría**: Chips clicables para filtrar por categoría
- **Tarjetas visuales**: Muestra imagen, nombre, precio y stock
- **Responsive**: Se adapta al número de columnas configurado
- **Hover effects**: Animaciones al pasar el mouse
- **Sin stock**: Marca visualmente productos sin disponibilidad

### Configuración Visual

```javascript
gridColumns: 3           // Tarjetas por fila
showProductImages: true  // Mostrar fotos de productos
showProductDescription: false  // Mostrar descripción en tarjeta
enableCategoryFilter: true     // Mostrar filtros de categoría
```

## 🔧 Configuraciones Recomendadas por Vertical

### Restaurantes (FOOD_SERVICE)
```json
{
  "productViewType": "grid",
  "gridColumns": 4,
  "showProductImages": true,
  "showProductDescription": false,
  "enableCategoryFilter": true
}
```
**Razón**: Pantallas táctiles, pocos productos, decisión visual

### Retail
```json
{
  "productViewType": "grid",
  "gridColumns": 3,
  "showProductImages": true,
  "showProductDescription": true,
  "enableCategoryFilter": true
}
```
**Razón**: Catálogo visual, POS táctil

### Distribuidoras/Mayoristas
```json
{
  "productViewType": "search",
  "gridColumns": 3,
  "showProductImages": false,
  "showProductDescription": false,
  "enableCategoryFilter": false
}
```
**Razón**: Muchos productos, búsqueda rápida por SKU

## 📊 Flujo de Datos

```
1. Usuario abre formulario de orden
   ↓
2. Hook useTenantViewPreferences carga configuración
   GET /tenant/settings
   ↓
3. Se renderiza vista según productViewType
   - 'grid' → ProductGridView
   - 'search' → ProductSearchView
   ↓
4. Usuario puede cambiar vista con ViewSwitcher
   ↓
5. Al cambiar, se guarda preferencia
   PUT /tenant/settings
   ↓
6. La próxima vez se abre con la vista guardada
```

## 🎯 Casos de Uso

### Caso 1: Restaurante con 50 productos
- **Vista**: Grid 4 columnas
- **Beneficio**: Camarero puede ver todos los platillos visualmente
- **Experiencia**: Similar a un POS táctil moderno

### Caso 2: Distribuidora con 2000 productos
- **Vista**: Búsqueda
- **Beneficio**: Encuentra productos rápido por SKU/código de barras
- **Experiencia**: Eficiente y sin cargar todas las imágenes

### Caso 3: Retail con catálogo medio (200 productos)
- **Vista**: Grid con filtros de categoría
- **Beneficio**: Navegación visual por departamento
- **Experiencia**: Combinación de búsqueda y exploración

## 🔐 Permisos

No se requieren permisos especiales para:
- Ver productos en cualquier vista
- Cambiar entre vistas

El usuario debe tener los permisos estándar de:
- `orders_create` para crear órdenes
- Acceso al módulo de órdenes (`enabledModules.orders`)

## 🐛 Troubleshooting

### La vista no cambia
- Verificar que el tenant tenga configuración en `settings.orders`
- Revisar console del navegador para errores
- Verificar que el endpoint `/tenant/settings` responda

### Imágenes no se cargan
- Verificar que los productos tengan imágenes en `variants[].images[]`
- Comprobar que las URLs de imágenes sean válidas
- El sistema usa placeholder 📦 si no hay imagen

### Filtros de categoría vacíos
- Asegurar que los productos tengan campo `category` poblado
- Categorías deben ser array: `["Bebidas", "Alcoholes"]`

## 🚀 Próximas Mejoras Sugeridas

1. **Vista de Lista**: Implementar `ProductListView` (tabla compacta)
2. **Búsqueda Server-Side**: Para catálogos muy grandes (>5000 productos)
3. **Virtualización**: Renderizar solo items visibles en grid largo
4. **Ordenamiento**: Por precio, nombre, popularidad
5. **Vista favoritos**: Productos más vendidos del tenant
6. **Configuración por usuario**: Además de por tenant

## 📝 Notas Técnicas

- El hook usa `localStorage` para obtener `tenantId` y `token`
- Las preferencias se cargan una vez al montar el componente
- El cambio de vista es instantáneo (no requiere reload)
- Compatible con el sistema de modificadores existente
- Funciona con productos de múltiples unidades de venta
- Respeta el filtro de stock disponible (`availableQuantity > 0`)

---

**Implementado por**: Claude Code
**Fecha**: 2025-12-28
**Versión**: 1.0
