# Doc - Configuracion del Tenant

> **Version cubierta:** v1.03  
> **Ubicacion en la app:** Menu lateral `Configuracion` (componentes `SettingsPage`, `DeliverySettings`, `WhatsAppConnection`, `UserManagement`, `RolesManagement`, `UsageAndBilling`, `ChangePasswordForm`)  
> **APIs relacionadas:**  
> - `/tenant/settings` (GET/PUT)  
> - `/tenant/logo` (POST multipart)  
> - `/delivery/rates` (GET/POST)  
> - `/chat/qr-code`, `/chat/configure-webhook`  
> - `/tenant/users`, `/tenant/users/:id`, `/roles`  
> - `/auth/change-password` (ver componente)  
> **Permisos requeridos:**  
> - `tenant_settings_read` / `tenant_settings_update`  
> - `delivery_settings_update`  
> - `chat_read` y `chat_write` para integrar WhatsApp  
> - `users_read`, `users_create`, `users_update`, `users_delete`  
> - `roles_read`, `roles_update`  
> - `billing_read`

## 1. Objetivo del modulo
Centralizar la administracion del tenant: identidad visual, datos fiscales, configuraciones de inventario y documentos, logistica de delivery, integracion con WhatsApp, seguridad (usuarios/roles/credenciales) y seguimiento de uso del plan. Lo configurado aqui impacta a casi todos los modulos operativos.

## 2. Pestaña General

### 2.1 Logo e identidad
- Carga de logo en base64 (preview) y envio via `uploadTenantLogo`.  
- El logo se usa en el dashboard, encabezados de PDF (facturas/presupuestos) y cualquier marca blanca del tenant.

### 2.2 Informacion de contacto
- Campos: nombre del negocio, sitio web, email, telefono, direccion completa.  
- Estos datos aparecen en documentos fiscales, notificaciones y en el storefront.

### 2.3 Informacion fiscal
- RIF y razon social.  
- Alimenta los PDF emitidos (facturas, presupuestos) y puede ser usado por reportes contables.

### 2.4 Moneda y configuraciones
- `settings.currency.primary`: moneda base (ej. VES).  
- Afecta calculos de ordenes, reportes y conversiones mostradas al cliente (cuando se paga en VES se usa tasa BCV).

### 2.5 Inventario
- `settings.inventory.fefoEnabled`: activa FEFO, obligando reservas por fecha de vencimiento.  
- Sincronizado con `InventoryManagement`; desactivar lo libera restricciones para verticales retail que no usan perecibles.

### 2.6 Plantillas de documentos
- Colores (primario/acento) y footer para facturas y presupuestos.  
- Usado por `OrderDetailsDialog` al generar PDFs y por el storefront cuando envía presupuestos.

### 2.7 Guardado
- Boton `Guardar Cambios` dispara `updateTenantSettings`.  
- Validar posibles errores via toasts.

## 3. Pestaña Delivery
Component `DeliverySettings` con sub-secciones:
- **General:** habilitar pickup, delivery local y envios nacionales; configurar umbral de envio gratis y distancia maxima.  
- **Ubicacion del negocio:** se selecciona en mapa (`LocationPicker`) para calcular distancias.  
- **Zonas de delivery:** tabla de rangos (min/max km) con tasa base y por km; se usa para `delivery/calculate` durante ordenes.  
- **Envio nacional:** tarifas por estado/ciudad, empresa de mensajeria y estimado de entrega.  
- Al guardar (POST `/delivery/rates`) impacta `NewOrderFormV2` (calculo de shipping) y el modulo de logistica.

## 4. Pestaña WhatsApp (chat)
- Disponible si el tenant tiene `enabledModules.chat` y permiso `chat_read`.  
- Paso 1: `Generar QR` (GET `/chat/qr-code`) para vincular dispositivo.  
- Paso 2: `Activar Webhook` (`POST /chat/configure-webhook`).  
- Una vez activo, el modulo `WhatsAppInbox` recibe mensajes y se sincroniza con CRM.  
- Importante renovar QR si la sesión expira.

## 5. Pestaña Seguridad
- `ChangePasswordForm` permite al usuario autenticado actualizar contraseña (interactúa con `/auth/change-password`).  
- Recomendado tras invitar usuarios con claves temporales.

## 6. Pestaña Usuarios
- Reutiliza `UserManagement`.  
- Funciones: invitar usuarios (`POST /tenant/users`), actualizar rol (`PATCH`), eliminar (`DELETE`).  
- Al invitar, se crea usuario, se envía email con credenciales y se genera contacto `employee` en CRM (ver `TenantService`).  
- Eliminar reduce contador de uso y marca contacto como inactivo.

## 7. Pestaña Roles y Permisos
- `RolesManagement` (no detallado aquí) permite crear/editar roles y asignar permisos.  
- Los cambios impactan inmediatamente la experiencia del usuario (componentes respetan `hasPermission`).

## 8. Pestaña Uso y Facturacion
- `UsageAndBilling` muestra plan actual, limites y consumo (usuarios, productos, ordenes, almacenamiento).  
- Datos provienen de `tenant.limits` y `tenant.usage` (actualizados por backend).  
- Ayuda a decidir upgrades; se puede disparar alerta si se acercan a limites.

## 9. Interacciones con otros modulos
- **Documentos PDF:** logo, colores y textos afectan facturas/presupuestos emitidos desde Órdenes.  
- **Moneda/Inventario:** controlan calculos de precios (Orders), manejo FEFO (Inventory) y reporteo en contabilidad.  
- **Delivery:** configuraciones alimentan `delivery/calculate` y se reflejan en agenda (Eventos/Tareas) al crear ordenes con entregas.  
- **WhatsApp:** integra con modulo `chat` y con CRM (mensajes asociados a contactos).  
- **Usuarios/Roles:** determinan acceso a CRM, Ventas, Compras, etc.; la tabla `UserTenantMembership` se alimenta desde aquí.  
- **Usage:** contadores limitan operaciones en `orders.service` (no se permite exceder `maxOrders`, `maxUsers`, etc.).

## 10. Buenas practicas
- Revisar contacto y tax info antes de emitir facturas.  
- Mantener FEFO activo si se manejan perecibles para evitar errores en inventario.  
- Configurar colores acordes a la marca para PDF profesionales.  
- Actualizar zonas de delivery tras abrir nuevas sucursales.  
- Regenerar QR de WhatsApp regularmente para mantener sesion activa.  
- Auditar roles y permisos periodicamente; restringir `billing_read` a administradores.  
- Monitorear uso en la pestaña de facturacion para evitar bloquear operaciones por limites.

## 11. Recursos vinculados
- UI: `SettingsPage.jsx`, `DeliverySettings.jsx`, `WhatsAppConnection.jsx`, `UserManagement.jsx`, `RolesManagement.jsx`, `UsageAndBilling.jsx`, `ChangePasswordForm.jsx`.  
- Backend: `tenant.controller.ts` / `tenant.service.ts`, `delivery` module, `chat` module, `customers` (creacion de empleados), `users` y `roles`, `orders` (plan limits).  
- Documentos relacionados: `DOC-MODULO-ORDENES.md`, `DOC-MODULO-COMPRAS.md`, `DOC-MODULO-PAGOS.md`, `DOC-MODULO-CRM.md`, `DOC-FLUJO-CRM-CONTACTOS.md`.

