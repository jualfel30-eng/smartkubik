# Fase 4 · Plan de QA Cruzado para Verticales Retail
## Food Inventory SaaS · Octubre 2025

> **Objetivo**: Validar que la configuración multi-vertical funcione extremo a extremo en Productos, Inventario, Órdenes, Dashboard y Asistente IA, garantizando no-regresiones para tenants de alimentación.
>
> **Estado**: 🛠️ En ejecución (Fase 4)

---

## 1. Alcance y Supuestos

- **Verticales cubiertos**: `food-service` (baseline), `retail-fashion`, `retail-footwear`, `retail-hardware`, `retail-tech`.
- **Módulos críticos**: Productos, Inventario, Órdenes (creación + exportación), Analytics/Dashboard, IA (herramienta `get_inventory_status`), Import/Export masivo.
- **Entornos**: 
  - `staging-retail` (feature flag `ENABLE_VERTICAL_PROFILES=true`).
  - `staging-food` (legacy tenant alimentación).
- **Datos de prueba**: Seeds en `scripts/seeds/vertical-fixtures/*` (crear si no existen). Cada vertical requiere:
  - 5 productos con atributos completos.
  - Inventario con combinaciones representativas (tallas, seriales, etc.).
  - Órdenes entregadas para alimentar dashboards.
- **Fuera de alcance**: Integraciones externas (Whatsapp, storefront) salvo que dependan de atributos verticales.

---

## 2. Matriz de Pruebas por Vertical

| Vertical / Módulo | Productos | Inventario | Órdenes | Dashboard & Analytics | IA & Herramientas |
|-------------------|-----------|------------|---------|-----------------------|-------------------|
| **Food Service**  | Crear/editar producto con lotes | Registrar lotes + FEFO | Crear pedido con notas/peso | Ver métricas sin columnas extra | Assistant responde sin atributos |
| **Retail Fashion**| Atributos `size`/`color`, import/export | Matriz talla-color, alertas stock | Pedido obliga talla, filtros en listado | Dashboard muestra atributos en tablas | Assistant filtra por talla/color |
| **Retail Footwear**| Atributos `size`/`width` | Matriz talla-ancho | Pedido obliga talla+ancho | Reportes por talla | Assistant valida ancho |
| **Retail Hardware**| Atributos `dimensions`/`gauge` | Sin matriz; verifica atributos opcionales | Pedido sin requeridos, export incluye atributos | Dashboard agrupa por atributos numéricos | Assistant responde por calibre |
| **Retail Tech**   | Atributos `serial`/`warranty`, import/export | Seriales únicos, reservas | Pedido obliga serial, export muestra serial | Dashboard alerta garantías | Assistant reconoce serial |

> **Nota**: cada intersección requiere al menos 2 casos: escenario feliz y escenario de validación (p.ej. serial duplicado, talla faltante, etc.).

---

## 3. Ciclos y Cronograma

| Iteración | Objetivo | Duración estimada | Output |
|-----------|----------|-------------------|--------|
| **Cycle 1 – Smoke multi-vertical** | Confirmar que cada vertical puede crear/editar productos, inventario y órdenes | 1.5 días | Checklist con screens y issues críticos |
| **Cycle 2 – Funcional completo** | Ejecutar matriz completa (tabla sección 2) + dashboards | 3 días | Reporte con casos ejecutados, bugs clasificados (P0-P3) |
| **Cycle 3 – Regresión alimentación** | Validar que `food-service` se mantiene estable con flag activo | 1 día | Reporte comparativo con Fase 2 |
| **Cycle 4 – Validación IA & exportaciones** | Casos conversacionales y export CSV/Excel por vertical | 1 día | Logs de asistente + archivos exportados aprobados |

Retroalimentación se registrará en Linear/Jira con etiqueta `retail-fase4`.

---

## 4. Casos de Prueba Prioritarios

### 4.1 Productos
- Crear producto fashion con tallas múltiples → verificar UI, payload y persistencia (`attributes.size`, `attributeSchema`).
- Importar XLSX con columnas `productAttr_*`, `variantAttr_*` para retail tech → validar mensajes de error por atributos faltantes.
- Editar producto hardware y eliminar atributo opcional → asegurarse de que export CSV no incluya columna vacía duplicada.

### 4.2 Inventario
- Cargar matriz talla-color (fashion) → validar totales y alertas de bajo stock por atributo.
- Registrar serial individual (tech) → impedir duplicados; reserva automática al crear orden.
- Inventario food-service → FEFO intacto y sin columnas extra en UI.

### 4.3 Órdenes
- Crear pedido fashion → UI exige selección de talla/color; backend rechaza si falta atributo.
- Filtrar listado de órdenes por atributo (e.g. `itemAttributeKey=size`) → verificar resultados y export CSV.
- Pedido tecnología con serial → export CSV incluye serial y dashboard refleja venta en atributos.

### 4.4 Dashboard & Analytics
- Cambiar período a 30/90 días → tablas de atributos muestran combinaciones correctas.
- Validar que tenants food-service no ven columnas de atributos adicionales.
- Verificar `InventoryAttributeTable` exporta CSV con encabezados esperados.

### 4.5 Asistente IA
- Prompt: “¿Cuántas camisas talla M color azul tengo?” → assistant responde con combinaciones correctas.
- Prompt: “Buscar laptop con serial XXXX en inventario” → assistant verifica serial.
- Prompt: “Mostrar inventario de arroz” (food-service) → no pide atributos no existentes.

---

## 5. Datos y Herramientas de Soporte

- **Fixtures**: crear script `scripts/fixtures/create-retail-vertical-data.ts` (pendiente).
- **Usuarios de prueba**: 
  - QA Analyst – `qa.tester@demo.io` (rol Manager).
  - Store Manager – `store.manager@demo.io` (rol Operator).
- **Feature flags**: `ENABLE_VERTICAL_PROFILES`, `DASHBOARD_CHARTS`, `ENABLE_ASSISTANT_VERTICALS`.
- **Automatización**:
  - Reutilizar suites Playwright (módulo admin) para smoke.
  - Agregar pruebas API para `POST /orders` con atributos (`test/orders/vertical-attributes.spec.ts`).

---

## 6. Gestión de Resultados

- **Repositorio de evidencias**: `docs/verticals/test-results/` (capturas, CSV, logs).
- **Canal de comunicación**: Slack `#qa-retail-fase4` (crear).
- **Criterios de salida**:
  - 0 bugs P0/P1 abiertos.
  - P2 mitigados con workaround documented.
  - Regresión food-service con 100% de casos clave aprobados.
  - IA con al menos 3 prompts exitosos por vertical.

---

## 7. Pendientes previos al Go-Live

1. Generar seeds para cada vertical.
2. Documentar scripts de limpieza de inventario/órdenes en caso de rollback.
3. Coordinar dry-run con equipo de soporte y ventas para validar manuales (ver documento de enablement).

> Este plan se revisará semanalmente y se cerrará cuando todos los criterios de salida se cumplan y estén registrados en el informe final de Fase 4.
