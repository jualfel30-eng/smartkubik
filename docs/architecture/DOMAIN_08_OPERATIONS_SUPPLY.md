# Domain 8: Operations & Supply Chain (Manufactura y Control de Calidad)

## 📌 Visión General
Este dominio está conceptualizado para escalar SmartKubik más allá del simple comercio minorista (Retail), llevándolo a la manufactura ligera, ensamblaje de kits, y procesos de cocina industrial (comisariatos) mediante la definición formal de Recetas, Líneas de Producción y Puntos de Inspección.

## 🗄️ Data Layer (Esquemas de Base de Datos)
Los esquemas de manufactura están modelados con una profundidad digna de un ERP industrial (MRP):

- **`BillOfMaterials` (BOM)** (`bill-of-materials.schema.ts`): La Receta Maestra. Define los ingredientes (`components`) necesarios para producir un `Product` final. Incluye control de desperdicio (`scrapPercentage`) y manejo de subproductos generados durante la cocción/ensamblaje (`byproducts`).
- **`WorkCenter`** (`work-center.schema.ts`): Define Centros de Trabajo (ej. "Horno Principal", "Máquina Empacadora") donde ocurre la magia. Hace tracking de capacidad, horas hábiles y calcula el costo operativo por hora (`costPerHour`) y la eficiencia de la máquina/operario (`efficiencyPercentage`).
- **`QualityControlPlan`** (`quality-control-plan.schema.ts`): Define inspecciones obligatorias (vía `checkpoints` como medición de temperatura, pH, color visual) con planes probabilísticos de muestreo probabilístico (`samplingPlan`).
- **`ManufacturingOrder`** (`manufacturing-order.schema.ts`): La orden real de ejecución. Cruzando una cantidad a producir contra el `BOM` activo, calcula los insumos teóricos y bloquea/reserva inventario. Monitorea Tiempos (Setup/Cycle/Teardown Time) reportados por el `WorkCenter` para calcular un Costo Total Real vs Estimado y evaluar el performance de la cadena.

## ⚙️ Backend (API Layer)
Similar al caso de "HR & Payroll", el análisis estructural de módulos arroja una revelación importante:

- **Módulos Ausentes/Incompletos**:
  - No existe el directorio `/modules/manufacturing/`.
  - No existe el directorio `/modules/quality/`.
  - Aunque los esquemas de bases de datos son estructuralmente magistrales y abarcan la complejidad multi-tenant y de ruteo industrial, las APIs REST que dictaminan la reserva de inventario al lanzar una BOM, o la inyección del QC Pass/Fail en la tabla de Lotes, no están presentes bajo la arquitectura estándar de NestJS en la carpeta modules.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **Phantom Domain (Dominio Fantasma Nivel 2)**: Al igual que el Dominio 7, se ha invertido tiempo arquitectónico masivo en definir colecciones analíticas de costo/fabricación (costeo estándar, desviación overhead/labor), pero las rutas de red y controladores no existen localmente en los directorios inspeccionados.
2. **Ciclo de Inventario Roto**: Para que `ManufacturingOrder` funcione, debe interactuar forzosamente con el monstruoso `inventory.controller.ts` (Dominio 2). Es altamente probable que la integración de deducción de materia prima por BOM sea manual o propensa a errores si los servicios de manufactura no son desarrollados con *Transactions* de MongoDB estrictas.

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- **MVP de Manufactura**: Si el negocio pivotará temporalmente a no-fabricantes (Retail simple), es seguro ocultar este dominio del roadmap activo. Si se requiere para Food Service (Recetas de Platos), se necesita construir el `manufacturing.service.ts` enfocado primariamente en descargar inventario base cuando la Cocina o el KDS (Kitchen Display System) reporta una orden como "Ready".
