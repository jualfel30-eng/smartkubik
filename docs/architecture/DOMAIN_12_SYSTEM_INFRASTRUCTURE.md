# Domain 12: System & Infrastructure (Infraestructura y Configuración)

## 📌 Visión General
Este dominio es el motor subyacente que mantiene al monolito SaaS operando con seguridad y orden. Aunque invisible para el usuario final del Storefront, es donde el SuperAdmin define las reglas del juego: integraciones globales, auditoría de acciones sensibles, y el delicado manejo de la concurrencia en la facturación.

## 🗄️ Data Layer (Esquemas de Base de Datos)
La persistencia está enfocada estrictamente en trazabilidad cruzada (Cross-Cutting Concerns) y settings:

- **`TenantSettings`** (`tenant-settings.schema.ts`): La columna vertebral de las integraciones de terceros. Centraliza todas las API Keys por Inquilino (Mailgun, SendGrid, Twilio, WhatsApp Cloud API, Whapi, Firebase Push). También controla las cuotas de envíos (`limits.emailsUsedToday`) para no quemar la billetera del proveedor del SaaS de manera silenciosa si un cliente hace Spam.
- **`GlobalSetting`** (`global-settings.schema.ts`): Configuraciones puras de sistema a nivel "Super Admin" (ej: modo mantenimiento, versión del SLA, feature flags globales).
- **`AuditLog`** (`audit-log.schema.ts`): La bitácora inmutable. Todo cambio sensible (`action: update_tenant`) y conexiones de soporte (`impersonate_user`) quedan grabados junto a la IP y el UserID para compliance de seguridad interno.
- **`DocumentSequence`** y **`SequenceLock`** (`document-sequence.schema.ts`, `sequence-lock.schema.ts`): Una de las ingenierías más importantes. Las facturas deben tener un número consecutivo perfecto (1, 2, 3...) sin saltos para cumplir la ley SENIAT. En peticiones concurrentes masivas (Race Conditions), dos procesos podrían tratar de leer y tomar la factura "101". `SequenceLock` asegura vía exclusión mutua pesimista en BDD que nadie tome el siguiente número de correlativo hasta que el anterior se genere o suelte el `expireAt`.

## ⚙️ Backend (API Layer)
Esta capa es "Fantasma" o está inyectada genéricamente:
- **No existe `/modules/system/`**: Las APIs para configurar el `TenantSettings` probablemente estén anidadas dentro de `/modules/tenants/` o manejadas por el controlador `/src/tenant.controller.ts` (Dominio 1).
- El manejo de `SequenceLock` está delegado al servicio `redis-lock.service.ts` documentado en el Módulo de Billing (Dominio 6).
- Los logs (`AuditLog`) son generados silenciosamente por "Interceptors" genéricos o en los servicios principales de NestJS tras interceptar los métodos POST/PUT/DELETE.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **Tokens Expuestos en Base de Datos**: El enome volumen de credenciales que guarda `TenantSettings` (API Keys de SendGrid, Auth tokens de Twilio, credenciales de Amazon SES) parece guardarse en *texto plano* dentro de Mongo. **Cualquier filtración a la base de datos entregará la infraestructura entera de email y sms de todos los clientes a un atacante.**
2. **TTL Lock vs Redis**: Existe `SequenceLock` nativo en Mongo (expira vía TTL `expireAt`), pero recordamos haber visto `redis-lock.service.ts` en Billing. Si el sistema está usando ambos para lo mismo, hay duplicación arquitectónica severa; si Redis falla, usar MongoDB para lock pesimisto es un fallback seguro pero mucho más lento en alta concurrencia.
3. **Impersonación (`impersonate_user`)**: Este feature detectado en los comentarios de `AuditLog` es útil para Soporte Técnico, pero conlleva riesgos legales GDPR/privacidad si no hay una notificación activa al Tenant cuando un SuperAdmin entra a ver sus datos. Hay que confirmar que exista un correo automático "Soporte ha ingresado a tu cuenta".

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- **Cifrado de Campos (Field-Level Encryption)**: Urge implementar un plugin o Middleware en el modelo de Mongoose `TenantSettings` que cifre en reposo mediante KMS (ej: AWS Key Management Service) los campos con `ApiKey` o `Token` antes de grabarlos en base de datos, descifrando en memoria solo tras consultarlos.
