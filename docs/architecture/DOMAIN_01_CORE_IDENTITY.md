# Domain 1: Core & Identity (Substrato Multi-Tenant)

## 📌 Visión General
Este dominio es la piedra angular del SaaS. Maneja la identidad de los usuarios, el aislamiento de datos (Multi-Tenant), la jerarquía organizacional (Negocios y Sedes), el control de acceso basado en roles (RBAC) y las configuraciones base o "Feature Flags" para encender/apagar módulos.

## 🗄️ Data Layer (Esquemas de Base de Datos)
El estado y modelo de este dominio residen en las siguientes colecciones principales:

- **`User`** (`user.schema.ts`): Contiene los datos de autenticación (email, password hashado), tokens de verificación, intentos de login (seguridad y bloqueo temporal), 2FA y `notificationPreferences` (qué alertas recibe por email, WhatsApp o In-App).
- **`Tenant`** (`tenant.schema.ts`): Es el esquema más robusto del sistema. Controla la información de la empresa, su vertical de negocio (Retail, Food Service, etc.), configuraciones fiscales (SENIAT/RIF), módulos habilitados (`enabledModules`), configuración de su IA (`aiAssistant`), información de suscripción (Trial, Planes), y configuraciones granulares (Inventory FEFO, auto-facturación, pasarelas de pago permitidas, etc.).
- **`Organization`** (`organization.schema.ts`): Define la jerarquía organizativa. Un `User` (owner) puede tener una Organización Padre ("new-business") que a su vez agrupa Sub-organizaciones o Sedes ("new-location"), compartiendo el mismo vertical de negocio y clonando catálogos si se desea.
- **`UserTenantMembership`** (`user-tenant-membership.schema.ts`): La tabla pivot que define en qué *Tenant* participa un *User* y con qué *Role*. Soporta estados como "active" o "invited" y mantiene un caché de permisos denormalizados para acceso rápido.
- **`Role`** y **`Permission`** (`role.schema.ts`, `permission.schema.ts`): Configuración de RBAC (`roles` de acceso) mapeados a políticas granulares definidas por `módulo` y `acción` (ej. `permissions("users_create")`).

## ⚙️ Backend (API Layer)
El backend orquesta este dominio a través de múltiples módulos y controladores estructurados:

- **`TenantController` (`/tenant`)**: Módulo superpuesto que expone endpoints para manejar configuraciones (`/settings`), subir logos, invitar y gestionar usuarios dentro del scope estricto de un tenant. Está protegido siempre por `JwtAuthGuard` y `TenantGuard`.
- **`OrganizationsController` (`/organizations`)**: Permite a un usuario autenticado listar, crear, actualizar y borrar organizaciones o sedes (sucursales).
- **`RolesController` / `PermissionsController` (`/roles`, `/permissions`)**: Permiten al administrador del tenant visualizar permisos disponibles y crear roles personalizados.
- **`SuperAdminController` (`/super-admin/`)**: Bypass de seguridad para el gestor del SaaS, con capacidades para impersonar usuarios, activar planes o manipular Feature Flags (`/feature-flags`).

## 🖥️ Frontend & UI Integration
A nivel de interfaz, este dominio se manifiesta de manera prominente en:

- **Auth Flow**: `Login.jsx`, `Register.jsx`, `ConfirmAccount.jsx`.
- **`OrganizationSelector.jsx`**: Es la puerta de entrada principal tras el login. Identifica si el usuario tiene una o múltiples membresías. Si es una sola, hace "auto-select" del tenant. Si quiere crear una nueva, le presenta opciones de "Nuevo Negocio" vs "Nueva Sede" y maneja lógicas complejas de clonación de bases de datos desde el cliente.
- **`use-auth.js` (Custom Hook)**: Mantiene el estado persistente (Token de Auth, Tenant Id seleccionado localmente) e inyecta la sesión a toda la App.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **Jerarquías Desacopladas (`Tenant` vs `Organization`)**: Existe duplicidad semántica entre el concepto de "Tenant" (la cápsula de datos aislada con configuraciones) y "Organization" (la estructura jerárquica padre-hijo). El frontend (`OrganizationSelector`) mezcla los conceptos al enviar payload al backend, y la entidad `Organization` apunta a su vez a `User`, pero el aislamiento perimetral lo hace el middleware basándose en el Header `x-tenant-id` (Membresía).
2. **Monolito en Autenticación**: El controlador principal `TenantController` asume tareas de membresía y de subir assets de marca en un mismo lugar, mezclando conceptos de "Tenant Settings" con "Users Membership Management".
3. **Módulo de Usuarios Subutilizado**: El controlador genérico `UsersController` (`/users/users.controller.ts`) prácticamente solo se usa para un `search` global sin validaciones severas de perfiles, delegando la carga real al `TenantController` (`/tenant/users`).
4. **Lógica Compleja de Auto-Selección en UI**: El archivo `OrganizationSelector.jsx` (casi 600 líneas) incluye `useEffects` en cascada (`autoSelectTenant` disparándose por cambios múltiples de estado en dependencias no siempre estables), lo cual es propenso a crear bucles de redirección o parpadeos molestos en el Login si no se estabilizan los "auto-selects".

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- Unificar/clarificar conceptualmente las colecciones de `Organization` (jerarquía visual/lógica) con `Tenant` (aislamiento de backend).
- Refactorizar y estabilizar el ciclo de vida del componente `OrganizationSelector.jsx` para desprender la lógica de redirección hacia un Provider o Contexto central.
