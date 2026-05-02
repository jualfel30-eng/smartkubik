# 2026-04-01 — Supplier search pagination

**Severidad**: alta
**Módulos afectados**: customers (backend), purchase-orders (frontend)
**Tiempo a resolución**: < 1 día

## Síntoma

Solo 20 de 27 proveedores aparecían en la búsqueda al crear una orden de compra. Proveedores como "Wynco de Venezuela" y "Emprendimiento Samuel Gonzalez" no eran encontrables a pesar de existir.

## Root cause

El frontend pre-cargaba todos los suppliers via `/customers?customerType=supplier`, pero el backend tiene `limit=20` por defecto en pagination. Solo los primeros 20 quedaban disponibles en el `SearchableSelect`. Subir el límite no escala (max 100) y el componente sync no es la herramienta correcta.

## Archivos tocados

- `food-inventory-admin/src/components/ComprasManagement.jsx`:
  - Nueva función `loadSupplierOptions(query)` que llama `/customers?customerType=supplier&search=${query}`.
  - `SearchableSelect` cambió de modo sync (preloaded array) a async (`asyncSearch={true}`, `loadOptions`).
  - `minSearchLength={2}`, `debounceMs={300}`.
  - `handleSupplierSelection` actualizado para nueva estructura del campo `supplier`.

## Prevención

- **Pattern**: [searchable-pagination](../patterns/searchable-pagination.md).
- **Skill**: [`searchable-audit`](../../../.claude/skills/searchable-audit/SKILL.md) escanea endpoints `list` sin pagination y consumidores `SearchableSelect` afectados.
- **Regla**: ningún dropdown de entidades de negocio debe pre-cargar opciones. Siempre async.

## Notas

Cita textual del usuario al diagnosticar: "un buscador debería buscar en la base de datos completa, no limitado al número de la paginación". El feedback fue clave para descartar workarounds y aplicar la solución correcta.
