# 🛍️ ROADMAP DE IMPLEMENTACIÓN – ADAPTACIÓN MULTI-VERTICAL (MINORISTAS)
## Food Inventory SaaS · Retail extendido 2025

> **Objetivo**: Extender los módulos actuales de Productos, Inventario y Órdenes para soportar verticales como moda, calzado, ferreterías, tecnología, jugueterías y otros minoristas con variantes particulares.
> **Enfoque**: Mantener un solo código base configurable por tenant, evitando duplicidad de módulos.
> **Última actualización**: 2025-10-19

---

## 📋 ÍNDICE

1. [Orden Óptimo de Implementación](#orden-óptimo)
2. [Principios de Diseño](#principios)
3. [Fases Detalladas](#fases)
4. [Checklist por Fase](#checklist)
5. [Consideraciones Técnicas](#consideraciones)
6. [Plan de Rollout y Riesgos](#rollout)
7. [Métricas de Éxito](#métricas)

---

## 🎯 ORDEN ÓPTIMO DE IMPLEMENTACIÓN {#orden-óptimo}

### Principios
1. **Backward compatibility**: los tenants actuales (alimentación) no deben notar cambios sin activar la nueva configuración.
2. **Configuración declarativa**: las diferencias por vertical se definen via metadata, no por bifurcar módulos.
3. **UI adaptativa**: los componentes centrales leen la configuración y muestran/ocultan campos.
4. **Pruebas y documentación**: cada vertical habilitado incluye fixtures, seeds y manual de uso.

### Orden recomendado
```
FASE 0: Descubrimiento y diseño de configuración (8-12 h)
   └─> FASE 1: Backend – modelo de atributos y feature flags (16-20 h)
        └─> FASE 2: Frontend – UI condicional y narrativa por vertical (20-24 h)
             └─> FASE 3: Integraciones complementarias (IA, reportes, catálogos) (16-20 h)
                  └─> FASE 4: QA cruzado + documentación + enablement (12-16 h)
```

### Estados iniciales (oct 2025)
| Fase | Estado | Notas |
|------|--------|-------|
| Fase 0 | ⏳ Pendiente | Necesario consolidar requisitos por vertical y definir matriz de atributos. |
| Fase 1 | ⏳ Pendiente | Esquema `product.attributes` y `inventory.attributeMatrix` aún no creados. |
| Fase 2 | ⏳ Pendiente | Falta selector de vertical en UI y hooks para personalizar formularios/listados. |
| Fase 3 | ⏳ Pendiente | IA aún no expone detalles específicos (p.ej. tallas, SKU de tecnología). |
| Fase 4 | ⏳ Pendiente | Sin manuales ni planes de activación por tenant. |

---

## 🧭 PRINCIPIOS DE DISEÑO {#principios}

1. **Configuración centralizada**  
   - Añadir `tenant.settings.verticalConfig` con propiedades como `hasSizes`, `requiresSerials`, `allowsWeight`, `hasVariants`, `attributePresets`.
   - Mantener defaults actuales (alimentación) para no afectar instalaciones vigentes.

2. **Capas reutilizables**  
   - Formularios (`ProductsForm`, `InventoryForm`, `OrderForm`) reciben `verticalConfig` y renderizan secciones condicionales.
   - Validaciones condicionales en DTOs usando `@ValidateIf` (NestJS).

3. **Metadatos flexibles**  
   - Productos almacenan atributos genéricos (`attributes: Record<string, any>`).
   - Inventario soporta matrices (p.ej. talla/color) o lotes por peso según vertical.

4. **UX guiada**  
   - Banner en el módulo para indicar vertical activa y quicklinks a configuración.
   - Tooltips/contextual help describiendo cada campo relevante a esa vertical.

---

## 🛠️ FASES DETALLADAS {#fases}

### FASE 0 · Descubrimiento y diseño (8-12 h)
- Auditar verticales objetivo: moda/calzado, ferretería, tecnología, jugueterías. Documentar atributos clave (p.ej. talla, color, serial, compatibilidad, lote).
- Definir matriz `VerticalProfile` con:
  - Campos visibles/ocultos (peso, talla, serial, marca, composición).
  - Campos obligatorios por vertical.
  - Reglas de inventario (matrices vs. lotes, multi-almacén).
- Diagramar flujos de UI para cada vertical (Wireframe rápido por módulo).

### FASE 1 · Backend (16-20 h)
1. **Modelo/configuración**
   - Ampliar `tenant.schema.ts` para incluir `verticalProfile` (nombre, presets, toggles).
   - Agregar seeds/fixtures para verticales principales.
2. **Productos**
   - Modificar `product.schema.ts` para soportar `attributes` y `variantSchema` flexible.
   - DTO: `CreateProductDto`/`UpdateProductDto` con validaciones condicionales.
   - Service: adaptar `products.service.ts` para guardar atributos dinámicos y validar `verticalProfile`.
3. **Inventario**
   - Ajustar `inventory.schema.ts` para soportar `attributeMatrix` (e.g., tallas/colores).
   - Servicios: recalcular stock por combinación cuando aplique.
4. **Órdenes**
   - Permitir seleccionar atributos específicos al agregar items (`orders.service.ts`).
   - Backend debe validar disponibilidad por atributo (p.ej. talla 39).
5. **API de configuración**
   - Endpoints para listar verticales disponibles y permitir override por tenant.

### FASE 2 · Frontend (20-24 h)
1. **Selector de vertical**
   - Mostrar en dashboard/config el perfil actual y permitir cambio (siempre con confirmación).
   - Cargar `verticalProfile` en context (`use-auth`/`TenantContext`).
2. **Productos**
   - Formulario adaptable (campo peso sólo si `allowsWeight`; tallas si `hasSizes`).
   - Grillas de productos mostrando columnas dinámicas (e.g. talla/serial).
3. **Inventario**
   - UI para matriz (tabla tallas/colores). Mantener vista actual para alimentario.
   - Alertas personalizadas (bajo stock por talla).
4. **Órdenes**
   - Modal de selección de productos mostrando atributos relevantes.
   - Etiquetas/resúmenes en la tabla (p.ej. “Camisa / Talla M / Color Azul”).
5. **Onboarding**
   - Wizard inicial para elegir vertical y cargar presets.

### FASE 3 · Integraciones y IA (16-20 h)
- IA: ampliar herramientas para consultar stock por atributo (p.ej. “talla 38”).
- Reportes: vistas filtradas por vertical (ventas por talla, rotación por categoría).
- Import/export: plantillas CSV diferentes por vertical (moda vs. tecnología).
- Notificaciones: reglas específicas (alerta de seriales, kits incompletos).

### FASE 4 · QA, documentación y enablement (12-16 h)
- Testing cruzado (unit + e2e) cubriendo verticales principales.
- Guías de uso por vertical (manual PDF y onboarding en UI).
- Checklist de activación: feature flags, configuración inicial, capacitación.
- Plan de rollback por vertical (desactivar profile y volver a defaults).

---

## ✅ CHECKLIST POR FASE {#checklist}

| Ítem | Descripción | Fase | Estado |
|------|-------------|------|--------|
| `verticalProfiles` definidos | JSON/TypeScript con presets (alimentación, moda, etc.) | F0 | ⏳ |
| Ampliar `tenant.schema` | Campo `verticalProfile` + seeds | F1 | ⏳ |
| DTO condicionales | `product.dto.ts`, `inventory.dto.ts`, `order.dto.ts` | F1 | ⏳ |
| Refactor services | Procesar atributos dinámicos | F1 | ⏳ |
| UI adaptable productos | Form + listado condicionales | F2 | ⏳ |
| UI adaptable inventario | Matriz atributos + alertas | F2 | ⏳ |
| UI adaptable órdenes | Selección y resumen atributos | F2 | ⏳ |
| Scripts de migración | Normalizar datos existentes | F3 | ⏳ |
| Tests y documentación | Cobertura + manuales | F4 | ⏳ |

---

## ⚙️ CONSIDERACIONES TÉCNICAS {#consideraciones}

- **Persistencia**  
  - Usar `attributes: Record<string, any>` y `attributeSchema` por vertical para validar.
  - Inventario: guardar combinaciones como `{ sku, attributes: { size: "M", color: "Azul" } }`.

- **Validación**  
  - NestJS `@ValidateIf()` basado en `verticalProfile`.
  - Válidas migraciones para normalizar datos antiguos (p.ej. transformar peso → atributo).

- **Frontend**  
  - Centralizar lógica en un hook `useVerticalConfig()` que obtenga la configuración.
  - Componentes UI parametrizados (`<AttributeMatrix>`, `<AttributeFields>`).
  - Mantener test suites para asegurar que la vista legacy se mantiene.

- **Performance**  
  - Cachear vertical presets en memoria (config service).
  - Vigilar tamaño de documentos `inventory` al usar matrices (considerar subcolecciones si crece demasiado).

---

## 🚀 PLAN DE ROLLOUT Y RIESGOS {#rollout}

1. **Feature flags**  
   - Activar `ENABLE_VERTICAL_PROFILES` por tenant.
   - Mantener panel en Super Admin para togglear verticales.

2. **Pilotos**  
   - Seleccionar un tenant piloto por vertical (moda, tecnología).
   - Feedback en 2-3 semanas antes de GA.

3. **Riesgos**  
   - Validaciones rotas si el tenant cambia de vertical sin datos consistentes.
   - Reportes existentes podrían requerir adaptación (e.g., peso → talla).
   - Complejidad UI (demasiados condicionales). Mitigar con componentes bien encapsulados.

4. **Rollback**  
   - Desactivar flag → vuelve a vista legacy.
   - Scripts de migración reversibles (guardar snapshot previo).

---

## 📊 MÉTRICAS DE ÉXITO {#métricas}

- % de tenants no-alimentarios activos después del lanzamiento.
- Reducción de tiempos de onboarding (medido en soporte).
- Nº de incidencias relacionadas con productos/inventario por vertical.
- Cobertura de test para variantes y atributos (>85% escenarios críticos).
- Uso del asistente IA para consultas de atributos (tracking `usedTools`).

---

> **Siguiente paso**: Completar Fase 0 recolectando requisitos detallados de cada vertical y definiendo `verticalProfiles` en código. A partir de esa definición se pueden crear issues/tickets por fase.
