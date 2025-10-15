# Doc - Flujo de Contactos entre Órdenes, Compras y Usuarios

> **Version cubierta:** v1.03  
> **Objetivo:** explicar como los modulos de Órdenes de Venta, Órdenes de Compra y Gestión de Usuarios alimentan automáticamente el CRM (`customers` collection).

## 1. Visión global
```
Orden de Venta  ─┐
                 ├──> CRM (contactos) ───> CRM Management
Orden de Compra ─┘           │
                              └──> Otros modulos (Inventario, Pagos, Eventos, Delivery)

Invitación de Usuario ────────┘
```

Los tres procesos crean o actualizan registros en CRM para mantener una base única de clientes, proveedores y empleados. Esto evita duplicidad de datos y permite que reportes, entregas y comunicaciones usen la misma información.

## 2. Ordenes de Venta → Clientes en CRM

### 2.1 Creacion automatica
- Cuando se registra una orden con un cliente nuevo (sin `customerId`), el backend (`orders.service.ts`) busca si existe un contacto con el mismo RIF.  
- Si no lo encuentra, crea uno con:  
  - `customerType = 'individual'` (o `business` segun payload).  
  - `name`, `taxInfo.taxId`, `taxType`, `customerNumber = CUST-...`.  
  - `createdBy` = usuario que generó la orden.  
- Esto ocurre en `POST /orders`; no requiere accion manual.

### 2.2 Actualizacion de ubicacion
- Si la orden incluye `customerLocation`, el servicio compara con `primaryLocation`.  
- Si no existe o cambio de coordenadas, actualiza la ubicación en CRM (`primaryLocation`).  
- Beneficios: delivery y geolocalizacion se mantienen sincronizados.

### 2.3 Uso posterior
- Las ventas futuras encuentran al cliente en el autocompletado (`NewOrderFormV2`).  
- CRM muestra gasto acumulado y clasificaciones automáticas.  
- Reportes de cuentas por cobrar usan la misma ficha.

## 3. Ordenes de Compra → Proveedores en CRM

### 3.1 Integracion en PurchasesService
- Al crear una orden de compra (`POST /purchases`), se valida si `supplierId` fue proporcionado.  
- Si no existe, se levanta un `CreateCustomerDto` con:  
  - `customerType = 'supplier'`.  
  - `companyName`, `taxInfo`, contactos (email/telefono).  
- Se guarda via `customersService.create`.  
- El nuevo proveedor queda disponible de inmediato en Compras, Payables y CRM.

### 3.2 Reutilizacion
- Ordenes de compra posteriores cargan lista de proveedores desde CRM.  
- Payables y pagos usan la misma ficha para notificar balances pendientes.  
- Filter `Proveedores` en CRM permite actualizar datos comerciales.

## 4. Invitacion de Usuarios → Empleados en CRM

### 4.1 Proceso en TenantService
- Al invitar un usuario (`POST /tenant/users`):  
  - Se crea `User` (con rol y password temporal).  
  - Simultaneamente se crea registro en `customers` con `customerType = 'employee'`.  
  - Se almacenan nombre, apellido, email y `customerNumber = EMP-...`.  
- Si se elimina el usuario, el CRM marca el contacto como inactivo.

### 4.2 Beneficios
- El tenant dispone de una lista actualizada de personal para asignar tareas, delivery o citas.  
- Otros modulos pueden filtrar por `employee` para selecciones rapidas (ej. appointments, turnos).

## 5. Escenarios tipicos

### 5.1 Cliente nuevo en venta retail
1. Operador registra orden con RIF desconocido.  
2. Sistema crea contacto `individual` y guarda ubicacion (si se capturo).  
3. CRM muestra nuevo contacto y empieza a sumar gasto.  
4. Subsecuentes ventas lo reconocen automaticamente.

### 5.2 Proveedor por primera vez
1. Compras crea orden para proveedor sin registro previo.  
2. Se genera contacto `supplier` con datos fiscales.  
3. Payables y pagos posteriores reutilizan la ficha para facturas recurrentes.  
4. CRM se convierte en directorio unificado de proveedores.

### 5.3 Onboarding de personal
1. Administrador invita a un nuevo empleado.  
2. El sistema crea usuario + contacto `employee` en CRM.  
3. CRM se usa para ubicar datos de contacto, asignar roles o generar eventos.  
4. Al eliminar usuario, el contacto se desactiva (no se pierde historial).

## 6. Buenas practicas
- Verificar RIFs antes de crear orden o compra para evitar duplicados (puede usarse filtro CRM).  
- Capturar ubicacion al crear cliente para optimizar rutas de delivery.  
- Al invitar usuarios, completar nombre/apellido para que la ficha de empleado quede prolija.  
- En caso de contactos duplicados, unificar manualmente desde CRM (el backend aplica `mergeUniqueCustomers` en el contexto).  
- Revisar periodicamente las listas filtradas (Clientes/Proveedores/Empleados) y actualizar notas/contactos.

## 7. Referencias tecnicas
- **Frontend:** `NewOrderFormV2`, `ComprasManagement`, `UserManagement`, `CRMManagement`.  
  - Uso de `CrmContext` para cargar contactos y ubicaciones.  
- **Backend:** `orders.service.ts` (lineas 70-110), `purchases.service.ts` (creacion de supplier), `tenant.service.ts` (inviteUser).  
- **Documentos complementarios:** `DOC-MODULO-CRM.md`, `DOC-MODULO-ORDENES.md`, `DOC-MODULO-COMPRAS.md`, `DOC-MODULO-PAGOS.md`.

La coherencia del CRM es clave para que Smartkubik automatice entregas, reportes y tareas de soporte sin duplicar informacion de clientes, proveedores y equipo.

