# 2026-04-01 — Missing customer record (Geomar Tarazona)

**Severidad**: media
**Módulos afectados**: customers, suppliers
**Tiempo a resolución**: < 1 día

## Síntoma

El proveedor "Geomar Tarazona" (PROV-000018, RIF J-506443430) era visible en el módulo Suppliers pero **no aparecía** en el dropdown de búsqueda de proveedores al crear una orden de compra para el tenant "Tiendas Broas".

## Root cause

El supplier tenía `customerId: 69b57f3425f06fd575d4302e` apuntando a un customer record que **no existía**. El frontend popula el dropdown con `/customers?customerType=supplier`, así que el supplier no aparecía.

Causa secundaria: existían **dos tenants distintos** con el mismo nombre "Tiendas Broas, C.A." y mismo email admin. La investigación inicial buscaba en el tenant equivocado.

## Archivos tocados

- Script `create-geomar-customer.js` — creó el customer faltante con `_id` exacto del `supplier.customerId`, taxId, customerNumber, customerType: 'supplier'.

## Prevención

- **Pattern**: [tenant-isolation](../patterns/tenant-isolation.md) (relacionado: confusión entre tenants con mismo nombre).
- **Validación de integridad**: skill futura `/integrity-check` debería detectar `supplier.customerId` huérfanos.
- **UI**: cuando hay tenants duplicados con mismo nombre, mostrar al super-admin algún disambiguador (slug, fecha de creación, primer usuario).

## Notas

Detectado un duplicado de RIF: "Samuel Gonzalez" (CLI-000002) y "Geomar Tarazona" (CLI-000027) ambos con J-506443430. Pendiente decisión de consolidación con el cliente.
