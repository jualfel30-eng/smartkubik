# Doc - Modulo CRM y Gestion de Contactos

> **Version cubierta:** v1.03  
> **Ubicacion en la app:** Menu lateral `CRM` -> `Contactos` (componente `CRMManagement`)  
> **APIs relacionadas:** `/customers`, `/customers/:id`, `/customers?customerType=...`  
> **Permisos requeridos:**  
> - `customers_read` para consultar contactos  
> - `customers_create` para altas manuales  
> - `customers_update` y `customers_delete` para edicion/eliminacion

## 1. Proposito del modulo
Centraliza toda la agenda del tenant: clientes, proveedores, empleados y roles operativos. El CRM guarda datos fiscales, ubicaciones, historial de gasto y clasifica automaticamente a los clientes por tier (Diamante/Oro/Plata/Bronce) en base al consumo. Es la fuente unica para ventas, compras, eventos y delivery.

## 2. Secciones de la interfaz

### 2.1 Encabezado y acciones principales
- Boton `Actualizar`: refresca la lista invocando `/customers`.  
- Boton `Agregar Contacto`: abre dialogo para alta manual (datos basicos, tipo, RIF, ubicacion).  
- Indicadores (en versiones futuras) muestran totales por tipo y clasificacion.

### 2.2 Filtros y busquedas
- **Busqueda** por nombre, razon social, RIF, email o telefono (revisa contactos y direcciones).  
- **Tabs de tipo:** Todos, Clientes (`business`/`individual`), Proveedores (`supplier`), Empleados (`employee`).  
- **Filtro de tier:** Todos, Diamante, Oro, Plata, Bronce (basado en `metrics.totalSpent`).  
- Combinacion de filtros permite segmentar rapidamente.

### 2.3 Tabla de contactos
- Columnas: nombre, empresa, tipo (badge), RIF, telefono/email, tier, gasto total, ultima orden.  
- Badges visuales:  
  - Tiers: Diamante (Crown), Oro (Award), Plata (Medal), Bronce (Shield).  
  - Tipos: Cliente (azul), Proveedor (verde), Empleado (naranja), Admin/Gestor (gris).  
- Acciones por fila: editar, eliminar (segun permisos).  
- Paginacion controlada por `currentPage`, `pageLimit` y respuesta de la API.

### 2.4 Dialogo "Agregar Contacto"
- Captura nombre, tipo, empresa, correo, telefono, direccion, ciudad/estado, RIF (prefijo + numero), notas y ubicacion georreferenciada (`LocationPicker`).  
- Se construye payload con `contacts[]`, `addresses[]`, `primaryLocation` y `customerType`.  
- Guarda via `POST /customers`. Al cerrar, recarga listado.

### 2.5 Dialogo "Editar Contacto"
- Prellena datos existentes; solo envia campos que cambian.  
- Permite actualizar tipo, empresa, notas, correos, telefonos, direccion y ubicacion.  
- Al guardar usa `PATCH /customers/:id`.  
- Si no hubo cambios detectados, cierra sin llamar API.

### 2.6 Eliminacion
- Solicita confirmacion.  
- Ejecuta `DELETE /customers/:id` y recarga listado.  
- El backend puede aplicar soft delete segun politica (estatus `inactive`).

## 3. Automatismos y datos clave
- **Clasificacion de tiers:** calculada en backend segun gasto acumulado (`metrics.totalSpent`).  
- **customerType:** define comportamiento en otros modulos (`business`, `individual`, `supplier`, `employee`, `admin`, `manager`, `Repartidor`, `Cajero`, `Mesonero`).  
- **primaryLocation:** se usa en entregas y para autocompletar address en nuevas ordenes.  
- **contacts[]:** soporta multiples canales (email/telefono). El principal se marca con `isPrimary`.  
- **addresses[]:** permite almacenar multiples direcciones (por defecto shipping).  
- **metrics:** incluye `totalSpent`, `lastOrderDate`, `ordersCount`, etc.  
- **customerNumber:** generado automaticamente en altas desde otros modulos (ej. `CUST-...`, `EMP-...`).

## 4. Flujos frecuentes

### 4.1 Alta de cliente potencial desde CRM
1. Click `Agregar Contacto`.  
2. Seleccionar tipo `business` o `individual`.  
3. Completar datos de contacto y RIF.  
4. Guardar. El cliente queda disponible para ordenes, eventos o citas.  
5. Posteriormente las ventas actualizaran su tier y metricas.

### 4.2 Gestion de proveedores
1. Filtrar por `Proveedores`.  
2. Editar datos de contacto o RIF si cambian.  
3. Las ordenes de compra usan esta ficha para autocompletar datos y registrar payables.  
4. Si se inactiva un proveedor, se puede eliminar o modificar tipo.

### 4.3 Administracion de personal/usuarios
1. Usuarios invitados desde Configuracion -> Usuarios se registran en CRM como `employee` automaticamente (ver flujo asociado).  
2. Desde CRM se puede actualizar telefono/ubicacion para mejorar asignaciones (ej. delivery).  
3. Si se elimina el usuario, el backend marca el contacto como inactivo.

## 5. Integraciones con otros modulos
- **Ordenes de venta:** crean o actualizan clientes automaticamente cuando se registra una orden con nuevo RIF o nueva ubicacion (ver doc de flujo).  
- **Ordenes de compra:** generan proveedores (`customerType = supplier`) si no existen.  
- **Usuarios del tenant:** `inviteUser` crea contacto `employee`. Al eliminarlo, se marca como inactivo.  
- **Pagos y contabilidad:** reportes de cuentas por cobrar/pagar muestran nombres desde CRM.  
- **Eventos y citas:** `AppointmentsManagement` y `EventsService` consumen la lista para programacion.  
- **Dashboard:** metricas de gasto alimentan cards y segmentacion automatica.

## 6. Buenas practicas de soporte
- Mantener RIFs unicos para evitar duplicados (API valida).  
- Actualizar ubicaciones cuando cambien para precision en entregas.  
- Revisar `customerType` antes de eliminar: algunos modulos dependen de proveedores o empleados asociados.  
- Usar notas para registrar acuerdos comerciales o atencion.  
- Ante errores de sincronizacion, ejecutar `loadCustomers()` desde soporte o revisar logs de `customers.service.ts`.

## 7. Recursos vinculados
- UI: `food-inventory-admin/src/components/CRMManagement.jsx`, `LocationPicker.jsx`, `SearchableSelect`.  
- Contexto/Hooks: `CrmContext.jsx`, `use-crm.js`, `useCrmContext`.  
- Backend: `customers.service.ts`, `orders.service.ts`, `purchases.service.ts`, `tenant.service.ts`.  
- Documentos relacionados: `DOC-FLUJO-VENTAS-INVENTARIO-PAGOS-CONTABILIDAD.md`, `DOC-FLUJO-CRM-CONTACTOS.md`.

