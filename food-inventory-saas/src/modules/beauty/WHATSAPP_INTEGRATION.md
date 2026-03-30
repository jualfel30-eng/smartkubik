# Integración WhatsApp - Beauty Module

## Descripción General

El Beauty Module cuenta con un sistema completo de notificaciones WhatsApp automáticas y manuales para gestionar la comunicación con clientes durante todo el ciclo de vida de una reserva.

## Características

- ✅ Notificaciones automáticas de confirmación tras crear reserva
- ✅ Recordatorios automáticos 24h antes de la cita
- ✅ Notificaciones de cancelación
- ✅ Modo auto/manual configurable por tenant
- ✅ Templates personalizables con variables
- ✅ Endpoint para envío manual desde el admin
- ✅ Fallback con links wa.me si API falla
- ✅ Estadísticas de notificaciones enviadas

## Arquitectura

### Servicios

#### 1. BeautyWhatsAppNotificationsService
**Ubicación**: `src/modules/beauty/services/beauty-whatsapp-notifications.service.ts`

Servicio principal para envío de notificaciones WhatsApp.

**Métodos principales**:
- `sendConfirmationNotification(booking)`: Envía confirmación tras crear reserva
- `sendReminderNotification(booking)`: Envía recordatorio 24h antes
- `sendCancellationNotification(booking)`: Envía aviso de cancelación
- `getWhatsAppLink(phone, message)`: Genera link wa.me como fallback

**Características**:
- Soporta modos: `auto`, `manual`, `disabled`
- Usa templates personalizados o templates por defecto
- Registra cada notificación en `booking.whatsappNotifications`
- Integración directa con Whapi API (sin dependencias complejas)

#### 2. BeautyBookingsJobsService
**Ubicación**: `src/modules/beauty/services/beauty-bookings-jobs.service.ts`

Servicio de trabajos programados (cron jobs) para recordatorios automáticos.

**Cron Jobs**:
- `@Cron(CronExpression.EVERY_HOUR)`: Ejecuta cada hora
- Busca reservas entre 23-25h en el futuro
- Envía recordatorios automáticamente

**Métodos adicionales**:
- `sendRemindersForDate(date)`: Envío manual para una fecha específica
- `getNotificationStats(tenantId?)`: Estadísticas de notificaciones
- `cleanupOldFailedNotifications()`: Limpieza de notificaciones fallidas antiguas

## Configuración del Storefront

La configuración de WhatsApp se encuentra en el schema `StorefrontConfig`:

```typescript
beautyConfig: {
  enabled: boolean,
  bookingSettings: {
    whatsappNotification: {
      enabled: boolean,              // Habilitar/deshabilitar WhatsApp
      mode: 'auto' | 'manual' | 'disabled',
      messageTemplate?: string       // Template personalizado (opcional)
    }
  }
}
```

### Modos de Operación

#### 1. Modo `auto`
- Envía notificaciones automáticamente via Whapi API
- Requiere token de Whapi configurado
- **Cuándo usar**: Para tenants con plan premium o con Whapi integrado

#### 2. Modo `manual`
- Solo registra la notificación, NO envía
- El admin debe enviar manualmente desde el panel
- **Cuándo usar**: Para tenants que prefieren control manual o sin Whapi

#### 3. Modo `disabled`
- No envía ni registra notificaciones
- **Cuándo usar**: Tenant que no usa WhatsApp

## Templates de Mensajes

### Variables Disponibles

Los templates personalizados pueden usar las siguientes variables:

- `{{clientName}}`: Nombre del cliente
- `{{salonName}}` o `{{storeName}}`: Nombre del salón
- `{{servicesList}}`: Lista de servicios reservados
- `{{professionalName}}`: Nombre del profesional (o "El siguiente disponible")
- `{{date}}`: Fecha formateada (ej: "Lunes 15 de Marzo")
- `{{startTime}}`: Hora de inicio (ej: "14:30")
- `{{endTime}}`: Hora de fin
- `{{totalDuration}}`: Duración total en minutos
- `{{totalPrice}}`: Precio total formateado (ej: "$45.00")
- `{{bookingNumber}}` o `{{bookingCode}}`: Código de reserva (ej: "BBK-00123")
- `{{paymentMethodsList}}`: Lista de métodos de pago aceptados
- `{{address}}`: Dirección del salón

### Template por Defecto - Confirmación

```
¡Hola {{clientName}}! 👋

Tu reserva en *{{salonName}}* ha sido confirmada:

💈 *Servicios:*
• Corte de cabello
• Manicure

👤 *Profesional:* {{professionalName}}
📅 *Fecha:* {{date}}
🕐 *Hora:* {{startTime}}
⏱️ *Duración:* {{totalDuration}} min
💰 *Total:* {{totalPrice}}

*Métodos de pago aceptados:*
{{paymentMethodsList}}

📍 *Dirección:* {{address}}

Tu código de reserva es: *{{bookingNumber}}*

Si necesitas reprogramar o cancelar, responde a este mensaje.

— {{salonName}}
Reserva gestionada por SmartKubik
```

### Configurar Template Personalizado

```typescript
// Ejemplo: Actualizar storefront config
await storefrontConfigModel.findOneAndUpdate(
  { tenantId: '...' },
  {
    $set: {
      'beautyConfig.bookingSettings.whatsappNotification.messageTemplate': `
        Hola {{clientName}}! 🎉

        Tu reserva está confirmada para el {{date}} a las {{startTime}}.
        Servicios: {{servicesList}}

        Te esperamos!
        {{salonName}}
      `
    }
  }
);
```

## Endpoints API

### 1. Envío Manual de Notificación
**POST** `/beauty-bookings/:id/notify`

Permite al admin enviar o reenviar notificaciones manualmente.

**Body**:
```json
{
  "type": "confirmation" | "reminder" | "cancellation"
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "confirmation notification sent successfully",
  "bookingNumber": "BBK-00123",
  "clientPhone": "+584241234567"
}
```

**Permisos**: `beauty_bookings_notify` (comentado por ahora)

### 2. Obtener Link WhatsApp
**GET** `/beauty-bookings/:id/whatsapp-link?type=confirmation`

Genera link wa.me pre-armado como fallback.

**Parámetros**:
- `type`: `confirmation`, `reminder`, `cancellation`

**Respuesta**:
```json
{
  "link": "https://wa.me/584241234567?text=Hola%20Juan...",
  "phone": "+584241234567",
  "bookingNumber": "BBK-00123"
}
```

### 3. Estadísticas de Notificaciones
**GET** `/beauty-bookings/stats/notifications` (a implementar en controller)

Obtiene estadísticas de notificaciones enviadas.

**Respuesta**:
```json
{
  "total": 450,
  "byType": {
    "confirmation": 200,
    "reminder": 180,
    "cancellation": 70
  },
  "byStatus": {
    "sent": 400,
    "delivered": 350,
    "read": 280,
    "failed": 50
  }
}
```

## Flujo de Integración

### 1. Creación de Reserva (Auto)

```
Cliente crea reserva (POST /public/beauty-bookings)
    ↓
BeautyBookingsService.create()
    ↓
[Crear booking en BD]
    ↓
BeautyWhatsAppNotificationsService.sendConfirmationNotification()
    ↓
¿Modo auto?
    YES → Enviar via Whapi API
    NO  → Solo registrar en booking.whatsappNotifications
    ↓
Registrar notificación en booking
    ↓
Retornar booking al cliente
```

### 2. Recordatorios (Cron Job)

```
Cada hora (CronExpression.EVERY_HOUR)
    ↓
BeautyBookingsJobsService.sendReminders()
    ↓
Buscar bookings entre 23-25h en el futuro
    ↓
Filtrar bookings sin recordatorio previo
    ↓
Para cada booking:
    - Enviar recordatorio
    - Registrar en booking.whatsappNotifications
    - Delay 500ms entre mensajes
    ↓
Log: "Success: X, Failed: Y"
```

### 3. Cancelación

```
Admin cancela reserva (PATCH /beauty-bookings/:id/status)
    ↓
BeautyBookingsService.updateStatus(dto.status = 'cancelled')
    ↓
Actualizar booking.status = 'cancelled'
Registrar booking.cancelledAt, cancelledBy
    ↓
BeautyWhatsAppNotificationsService.sendCancellationNotification()
    ↓
Enviar mensaje de cancelación
    ↓
Retornar booking actualizado
```

## Configuración del Token Whapi

### Orden de Prioridad

1. **Token del Tenant** (encriptado en BD) - ⚠️ Pendiente implementar
2. **WHAPI_MASTER_TOKEN** (variable de entorno)
3. **SuperAdmin setting** - ⚠️ Pendiente implementar

### Configurar Token Master

```bash
# .env
WHAPI_MASTER_TOKEN=your_whapi_token_here
```

### Implementación Futura: Token por Tenant

```typescript
// TODO: En Tenant schema
interface Tenant {
  // ...
  whapiToken?: string;  // Encriptado con safeEncrypt()
  whapiStatus?: 'active' | 'inactive' | 'expired';
}

// En BeautyWhatsAppNotificationsService.getWhapiToken()
const tenant = await this.tenantModel.findById(tenantId);
if (tenant.whapiToken) {
  return safeDecrypt(tenant.whapiToken);
}
```

## Registro de Notificaciones

Cada notificación enviada se registra en el booking:

```typescript
booking.whatsappNotifications: [
  {
    type: 'confirmation' | 'reminder' | 'cancellation',
    sentAt: Date,
    status: 'sent' | 'delivered' | 'read' | 'failed',
    messageId: string  // ID del mensaje en Whapi
  }
]
```

Este historial permite:
- Verificar que se envió la notificación
- Evitar duplicados (ej: no enviar recordatorio si ya se envió)
- Debugging y auditoría
- Estadísticas de engagement

## Testing

### Manual - Envío de Notificación

```bash
# 1. Crear una reserva
curl -X POST http://localhost:3000/public/beauty-bookings \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "...",
    "client": {
      "name": "Juan Pérez",
      "phone": "+584241234567"
    },
    "services": [...],
    "date": "2026-03-30",
    "startTime": "14:00"
  }'

# 2. Enviar notificación manual
curl -X POST http://localhost:3000/beauty-bookings/BOOKING_ID/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "reminder"
  }'
```

### Cron Job - Recordatorios

```typescript
// Ejecutar manualmente para fecha específica
const result = await beautyBookingsJobsService.sendRemindersForDate(
  new Date('2026-03-30')
);

console.log(result);
// { success: 5, failed: 1, bookings: ['BBK-00123', 'BBK-00124', ...] }
```

### Estadísticas

```typescript
const stats = await beautyBookingsJobsService.getNotificationStats('TENANT_ID');
console.log(stats);
```

## Troubleshooting

### Error: "Whapi token not configured"

**Causa**: No hay token configurado en ningún nivel.

**Solución**:
1. Verificar variable de entorno `WHAPI_MASTER_TOKEN`
2. O configurar token del tenant (pendiente implementar)

### Error: "WhatsApp notifications disabled"

**Causa**: `beautyConfig.bookingSettings.whatsappNotification.enabled = false`

**Solución**: Actualizar configuración del storefront:

```typescript
await storefrontConfigModel.findOneAndUpdate(
  { tenantId: '...' },
  {
    $set: {
      'beautyConfig.bookingSettings.whatsappNotification.enabled': true,
      'beautyConfig.bookingSettings.whatsappNotification.mode': 'auto'
    }
  }
);
```

### Notificaciones no se envían automáticamente

**Verificar**:
1. Modo configurado como `auto` (no `manual` ni `disabled`)
2. Token Whapi válido
3. Logs del servidor para errores

**Debug**:
```typescript
// En BeautyBookingsService.create(), línea 170-180
// Buscar logs:
// - "WhatsApp confirmation sent for booking BBK-XXX"
// - "WhatsApp notification failed for booking BBK-XXX: ERROR"
```

### Cron job no ejecuta

**Verificar**:
1. ScheduleModule importado en BeautyModule
2. BeautyBookingsJobsService registrado en providers
3. Logs cada hora: "Running reminder job..."

**Testing manual**:
```bash
# Forzar ejecución inmediata (añadir endpoint temporal)
curl -X POST http://localhost:3000/beauty-bookings/jobs/run-reminders
```

## Mejoras Futuras

### Fase 3 - Mejoras Avanzadas

- [ ] Webhooks de Whapi para actualizar `status` (delivered, read)
- [ ] Templates múltiples por tipo de servicio
- [ ] Internacionalización de mensajes (i18n)
- [ ] Rich media: enviar imágenes del servicio
- [ ] Botones interactivos (confirmar/cancelar)
- [ ] Recordatorios configurables (no solo 24h)
- [ ] A/B testing de templates
- [ ] Analytics de conversión (¿cuántos leen?, ¿cuántos confirman?)
- [ ] Rate limiting inteligente para evitar spam

### Código Pendiente en TODOs

1. **BeautyWhatsAppNotificationsService.getWhapiToken()** (línea 378-391)
   - Implementar obtención de token desde Tenant
   - Implementar descifrado con safeDecrypt()

2. **BeautyBookingsController.getWhatsAppLink()** (línea 112)
   - Construir mensaje correcto basado en `type`

## Mantenimiento

### Limpieza de Notificaciones Fallidas

Ejecutar periódicamente para mantener la BD limpia:

```typescript
// Elimina notificaciones fallidas con más de 7 días
const deletedCount = await beautyBookingsJobsService.cleanupOldFailedNotifications();
console.log(`Cleaned up ${deletedCount} old failed notifications`);
```

### Monitoreo

**Métricas clave a monitorear**:
- Tasa de éxito/fallo de envíos
- Tiempo de respuesta de Whapi API
- Cantidad de recordatorios enviados por día
- Notificaciones en estado 'failed'

**Dashboard recomendado**:
```typescript
// Endpoint para dashboard admin
GET /beauty-bookings/dashboard/notifications
{
  "last24h": {
    "sent": 45,
    "failed": 2,
    "successRate": 95.7
  },
  "lastWeek": {
    "sent": 320,
    "failed": 15,
    "successRate": 95.3
  }
}
```

## Contacto y Soporte

Para dudas sobre la integración WhatsApp:
- **Documentación Whapi**: https://whapi.cloud/docs
- **Support**: Crear issue en el repositorio del proyecto
