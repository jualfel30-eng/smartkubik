# Fase 0 · Descubrimiento y Diseño de Perfiles Verticales
## Food Inventory SaaS · Octubre 2025

> Objetivo: Mapear requisitos por vertical minorista y definir un modelo de configuración reutilizable (`VerticalProfile`) que permita adaptar Productos, Inventario y Órdenes sin duplicar módulos.

> **Estado**: ✅ Completo (Fase 0)

---

## 1. Estado actual del sistema

### 1.1 Tenants
- `tenant.vertical` admite: `FOOD_SERVICE`, `RETAIL`, `SERVICES`, `LOGISTICS`, `HYBRID`.
- Configuración custom por tenant: `settings.inventory.*`, `settings.documentTemplates.*`, `aiAssistant.*`.
- Falta un bloque dedicado a necesidades retail (p.ej. tallas/seriales).

### 1.2 Productos (`product.schema.ts`)
- SKU único por tenant, variantes (`ProductVariant`) con `unit`, `basePrice`, `costPrice`.
- `sellingUnits` admite múltiples unidades de venta (útil para alimentos a granel).
- Campos relevantes:
  - `isPerishable`, `isSoldByWeight`, `hasMultipleSellingUnits`.
  - `variants[]`: sin metadata adicional para tallas/colores.
  - `pricingRules`, `inventoryConfig`.
- Falta un contenedor flexible para atributos por vertical (tallas, seriales, etc.).

### 1.3 Inventario (`inventory.schema.ts`)
- Gestión por SKU + variante (opcional).
- Control de lotes (`InventoryLot`) para alimentos (cantidad/peso/fecha vencimiento).
- No existe matriz de atributos (p.ej. talla+color) ni serialización individual.

### 1.4 Órdenes (`orders.service.ts`, `orders` UI)
- Los items guardan `productId`, `variantId`, cantidades, precios.
- UX y lógica están orientados a venta por peso/unidad estándar.
- No se capturan atributos adicionales (talla, color, serial) al vender.

### 1.5 IA / Integraciones
- Herramientas RAG cubren inventario general, pero no atributos específicos.
- No existen reportes segmentados por talla/serial/etc.

---

## 2. Verticales objetivo y diferencias clave

| Vertical            | Diferenciadores principales                                         | Campos críticos                                      |
|---------------------|----------------------------------------------------------------------|-------------------------------------------------------|
| Moda (ropa)         | Talla, color, colección, género, temporada                           | `size`, `color`, `fit`, `season`                      |
| Calzado             | Talla numérica, ancho, material, género                              | `size`, `width`, `material`, `gender`                 |
| Ferretería          | Dimensiones, calibre, compatibilidad, certificaciones               | `dimensions`, `gauge`, `usage`, `certifications`      |
| Tecnología          | Serial, SKU del fabricante, garantía, specs técnicos                 | `serial`, `manufacturerSku`, `warranty`, `specs`      |
| Juguetería          | Rango de edad, advertencias seguridad, tipo de batería, franquicia   | `ageRange`, `safetyNotes`, `battery`, `license`       |
| Alimentación (actual)| Peso, lote, fecha vencimiento, origen, condiciones de almacenamiento | `lot`, `expirationDate`, `origin`, `storage`          |

**Observación**: Todos comparten base (SKU, variantes, precio, stock) y cambian en los atributos, validaciones y alertas.

---

## 3. Requerimientos por módulo

### 3.1 Productos
- Campo genérico `attributes: Record<string, AttributeValue>` con esquema por vertical.
- Control de UI:
  - Mostrar peso solo si `allowsWeight`.
  - Mostrar tallas/colores si `hasSizeMatrix`.
  - Campos de serial/warranty solo si `requiresSerial`.

### 3.2 Inventario
- Necesidad de matriz para tallas/colores (moda/calzado).
- Seriales individuales (tecnología) → tracking por unidad.
- Lotes siguen siendo válidos para alimentación; deben convivir con atributos.

### 3.3 Órdenes
- Selección de combinaciones (talla/color) al agregar ítems.
- Validación de inventario por atributo.
- Soporte para serial escaneado (tecnología).

### 3.4 Reportes/Alertas
- Reportes por talla, por rango de edad, por serial vencido.
- Alertas custom: stock bajo por atributo, garantías próximas a vencer, etc.

---

## 4. Propuesta de estructura `VerticalProfile`

```ts
export interface VerticalProfile {
  key: string;                // "retail-fashion"
  label: string;              // "Moda y Calzado"
  baseVertical: "RETAIL" | "FOOD_SERVICE" | "SERVICES" | "LOGISTICS";

  allowsWeight: boolean;
  hasSizeMatrix: boolean;     // tallas/colores
  requiresSerial: boolean;
  supportsVariants: boolean;
  supportsLote: boolean;
  attributeSchema: AttributeDescriptor[];
  defaultUnits?: string[];    // e.g. ["unidad", "par"]
  orderLineTemplate: OrderLineDescriptor;
  inventoryConfig?: InventoryDescriptor;
}

export interface AttributeDescriptor {
  key: string;                // "size", "color"
  label: string;              // "Talla"
  type: "string" | "number" | "enum" | "dimension" | "range";
  required: boolean;
  options?: string[];         // para enums predefinidos
  scope: "product" | "variant" | "inventory" | "order";
  ui?: { widget: "select" | "chip" | "text" | "textarea" };
}
```

> Nota: el esquema definitivo se implementará en Fase 1; esta definición sirve como base de diseño.

---

## 5. Próximos pasos (entrada a Fase 1)

1. Validar con stakeholders la matriz de atributos.
2. Congelar lista inicial de `VerticalProfile`:
   - `retail-fashion` (ropa),
   - `retail-footwear`,
   - `retail-hardware`,
   - `retail-tech`,
   - `retail-toys`,
   - `food-service` (baseline actual).
3. Crear seeds/fixtures en `configs/vertical-profiles.ts`.
4. Preparar plan de migración para productos existentes cuando un tenant cambie de perfil.

---

## 6. Historial de decisiones
- **19-10-2025**: Se opta por configuración declarativa en lugar de clonar módulos.
- **19-10-2025**: `VerticalProfile` incluirá tanto flags como `attributeSchema` para cubrir necesidades UI+validación.

---

> Documento elaborado para la Fase 0 del roadmap “Retail Verticals”. Al completar la validación con stakeholders, avanzar a Fase 1 (implementación backend).
