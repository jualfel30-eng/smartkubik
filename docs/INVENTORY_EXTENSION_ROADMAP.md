# ROADMAP REALISTA: EXTENSIÓN INVENTARIO (MULTI-WAREHOUSE, MOVIMIENTOS, ALERTAS)

**Objetivo:** Integrar almacenes, movimientos y alertas en el módulo de Inventario sin crear apps separadas, siguiendo patrones de ERPs líderes.  
**Alcance:** Backend + ajustes de UX en Inventario.  
**Duración estimada:** 4-6 semanas.  
**Estado:** En Progreso (90% - Semanas 1 a 5 completadas; Semana 6 en curso).

---

## Semana 1 – Fundaciones de Datos (2-3 días) ✅ COMPLETADA
- [x] Schemas nuevos: `warehouse`, `inventory-movement` (warehouseId añadido), `inventory-alert-rule` (tenantId, isDeleted, índices).
- [x] Documentar modelo de datos y endpoints esperados (migración seed "General" en docs/migrations/001_seed_default_warehouses.md).
- [x] **Migración: crear warehouse "General" para todos los tenants; asociar stock existente a "General".** ✅ EJECUTADA (Dic 7, 2025)
  - 20 tenants migrados
  - 20 warehouses "GEN" creados
  - 49 inventarios asignados al warehouse "General"

## Semana 2 – API de Almacenes (2-3 días) ✅ COMPLETADA
- [x] CRUD warehouses: validación de duplicados por código por tenant; soft delete, isDefault exclusivo.
- [x] Toggle multi-warehouse en settings (flag `MULTI_WAREHOUSE` en features.config; controllers bloquean create/update/delete si está off).
- [x] Tests unitarios de warehouse service + actualización roadmap testing.

## Semana 3 – Movimientos de Inventario (4-5 días)
- [x] Servicio/endpoints de movimientos manuales: IN, OUT, ADJUSTMENT; cálculo `quantity_after`; referencia a warehouse opcional (documento origen pendiente).
- [x] Hooks automáticos: ventas (OUT), recepciones/compras (IN), cancelaciones (reverso con ADJUSTMENT), ajustes manuales listos.
- [x] Hook inicial: OUT en órdenes cuando pasan a paid (referencia orderId) – evitada doble generación de movimientos.
- [x] Validaciones: stock no negativo (flag enforceStock opcional), ownership tenant, producto activo, warehouse activo.
- [x] Vista/endpoint de auditoría: listado con filtros (fecha, tipo, producto, warehouse), paginación.
- [x] Tests unitarios de movimientos (producto inactivo, stock insuficiente, enforceStock=false).

## Semana 4 – Alertas de Stock (2-3 días) ✅ COMPLETADA
- [x] Reglas de alerta: por producto (y opcional por warehouse), minQuantity, canales.
- [x] Evaluador: hook post-movimiento que dispara evento de alerta al cruzar umbral (cooldown 6h).
- [x] Notificaciones: usa EventsService (in-app + tarea) y actualiza flags de inventario.
- [x] Tests de reglas y disparo (respetan cooldown).

## Semana 5 – UX en Inventario (3-4 días) ✅ COMPLETADA
- [x] Definición de UX rápida: flujos mínimos (Almacenes, Movimientos, Ajuste manual, Alertas por producto/almacén) y guardrails multi-warehouse.
- [x] UI/UX: sección Almacenes dentro de Inventario; creación/edición rápida.
- [x] Vista Movimientos (auditoría) y flujo de Ajuste manual simple (IN/OUT/ADJUST).
- [x] Configuración de alertas en ficha de producto (selector de warehouse opcional).
- [x] Guardrails: multi-warehouse off → ocultar secciones; multi-warehouse on → asistente inicial (crear 2-3 warehouses).

## Semana 6 – Pulido y Performance (2-3 días) 🚧 EN CURSO
- [x] Paginación/índices en movimientos y alertas; soft delete consistente.
- [x] Métricas: disponible por almacén en tab de Inventario (stock-summary por producto/almacén).
- [x] Documentación final: README Inventario, guías de migración y ejemplos de API.
- [x] Tests adicionales y cobertura en CI (paginación movimientos/alertas).

---

## Checklist Global
- [x] Schemas creados con índices y ownership.
- [x] Warehouse CRUD + tests.
- [x] Movimientos manuales + hooks automáticos desde órdenes/recepciones/cancelaciones + tests.
- [x] Alertas configurables en producto/ficha, disparo y notificación + tests.
- [x] UI integrada en Inventario (Almacenes/Movimientos/Ajustes/Alertas).
- [x] Documentación y migración aplicadas (warehouse “General”).

---

## Notas de UX (referencia ERPs líderes)
- Mantener todo en Inventario; no apps nuevas.
- Movimientos principalmente automáticos; manuales solo para ajustes.
- Default un almacén “General”; multi-warehouse habilitado por toggle + asistente.
- Alertas configurables desde la ficha de producto; notificaciones por canales existentes.
