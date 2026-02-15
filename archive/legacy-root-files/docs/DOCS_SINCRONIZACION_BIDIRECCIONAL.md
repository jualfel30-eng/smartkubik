# Documentación: Sincronización Bidireccional Google Calendar ↔ ERP

## Índice
1. [Descripción General](#descripción-general)
2. [Requisitos](#requisitos)
3. [Flujo de Configuración](#flujo-de-configuración)
4. [Uso de la Funcionalidad](#uso-de-la-funcionalidad)
5. [Aspectos Técnicos](#aspectos-técnicos)
6. [Troubleshooting](#troubleshooting)

---

## Descripción General

La sincronización bidireccional permite que los cambios realizados en Google Calendar se reflejen automáticamente en el ERP, complementando la sincronización ERP → Google que ya existía.

### Características Principales:
- ✅ **Sincronización en tiempo real**: Los cambios en Google se reflejan automáticamente en el ERP
- ✅ **Solo calendarios del ERP**: Los calendarios personales de Google NO se sincronizan
- ✅ **Control de permisos**: Solo administradores pueden activar la sincronización bidireccional
- ✅ **Renovación automática**: Los watch channels se renuevan automáticamente cada 7 días
- ✅ **Sincronización incremental**: Solo se descargan los cambios, no todo el calendario

---

## Requisitos

### Permisos de Usuario:
- **Para activar sincronización bidireccional**: Rol de `admin`
- **Para sincronizar manualmente desde Google**: Cualquier usuario con acceso al calendario

### Configuración Previa:
1. El calendario debe existir en el ERP
2. El calendario debe estar sincronizado con Google Calendar (botón "Sincronizar")
3. La configuración de Gmail OAuth debe estar completa para el tenant

### Variables de Entorno:
```bash
API_BASE_URL=https://api.tu-dominio.com  # URL base del API (requerido para webhooks)
GOOGLE_CLIENT_ID=...                     # ID de cliente de Google OAuth
GOOGLE_CLIENT_SECRET=...                 # Secret de cliente de Google OAuth
```

---

## Flujo de Configuración

### Paso 1: Crear Calendario
1. Navegar a **Calendario → Configuración**
2. Hacer clic en **"Nuevo Calendario"**
3. Completar el formulario:
   - Nombre del calendario
   - Descripción (opcional)
   - Categoría (sales, production, hr, etc.)
   - Color
   - Roles con acceso
   - Configuración de visibilidad

### Paso 2: Sincronizar con Google
1. En la tarjeta del calendario, hacer clic en **"Sincronizar"**
2. Esto crea un calendario secundario en Google Calendar del tenant
3. El estado cambiará a "Sincronizado con Google"

### Paso 3: Activar Sincronización Bidireccional (Solo Admin)
1. En la tarjeta del calendario sincronizado, hacer clic en **"Activar Sync Bidireccional"**
2. Esto configura un watch channel con Google Calendar
3. A partir de este momento, los cambios en Google se reflejarán automáticamente

### Diagrama de Flujo:
```
┌─────────────────────┐
│ Crear Calendario    │
│ en ERP              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Sincronizar con     │
│ Google              │
│ (Crea calendario    │
│  secundario)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Activar Sync        │
│ Bidireccional       │
│ (Solo Admin)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ✅ Sincronización   │
│    Activa           │
└─────────────────────┘
```

---

## Uso de la Funcionalidad

### Desde el ERP:

#### Crear/Editar Eventos:
1. Los eventos creados en el ERP se sincronizan automáticamente a Google
2. Al crear un evento, seleccionar el calendario al que pertenece
3. Los cambios se reflejan en Google en tiempo real

#### Importar Eventos Manualmente:
1. Hacer clic en **"Importar desde Google"** en la tarjeta del calendario
2. Esto sincroniza todos los eventos de Google hacia el ERP
3. Útil para sincronización inicial o recuperación de cambios

### Desde Google Calendar:

#### Eventos Sincronizados Automáticamente:
- ✅ Crear nuevo evento
- ✅ Editar evento existente
- ✅ Eliminar evento
- ✅ Cambiar fecha/hora
- ✅ Cambiar título/descripción

#### Limitaciones:
- ❌ Los eventos del calendario primario de Google NO se sincronizan
- ❌ Solo eventos en calendarios secundarios creados por el ERP
- ❌ Los eventos de otros calendarios personales se ignoran

---

## Aspectos Técnicos

### Arquitectura de Sincronización:

```
Google Calendar
      │
      │ (1) Usuario modifica evento
      │
      ▼
Watch Channel (Webhook)
      │
      │ (2) Google envía notificación
      │
      ▼
ERP Backend
/calendars/google-webhook
      │
      │ (3) Valida token y canal
      │
      ▼
CalendarsService
.syncEventsFromGoogle()
      │
      │ (4) Obtiene cambios incrementales
      │
      ▼
MongoDB
      │
      │ (5) Actualiza eventos
      │
      ▼
Frontend
      │
      │ (6) Usuario ve cambios
      │
      ▼
✅ Sincronización Completa
```

### Endpoints del Backend:

#### 1. Setup Watch Channel (Solo Admin)
```http
POST /api/v1/calendars/:id/setup-watch
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "calendar_id",
    "googleSync": {
      "enabled": true,
      "calendarId": "google_calendar_id",
      "watchChannel": {
        "id": "channel_id",
        "resourceId": "resource_id",
        "expiration": 1234567890,
        "token": "verification_token"
      }
    }
  },
  "message": "Sincronización bidireccional configurada..."
}
```

#### 2. Sincronizar desde Google
```http
POST /api/v1/calendars/:id/sync-from-google
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "synced": 15,
    "errors": 0
  },
  "message": "Sincronización completada: 15 eventos sincronizados, 0 errores"
}
```

#### 3. Webhook de Google (Público)
```http
POST /api/v1/calendars/google-webhook
X-Goog-Channel-Id: <channel_id>
X-Goog-Resource-Id: <resource_id>
X-Goog-Resource-State: <exists|sync>
X-Goog-Channel-Token: <token>
```

### Renovación Automática de Watch Channels:

**Cron Job:** Se ejecuta diariamente a las 3 AM

**Ubicación:** `src/jobs/calendar-watch-renewal.job.ts`

**Funcionamiento:**
1. Busca calendarios con watch channels activos
2. Verifica si expiran en menos de 24 horas
3. Renueva el watch channel por 7 días más
4. Si falla, marca el calendario con error

**Logs:**
```
[CalendarWatchRenewalJob] Iniciando renovación de watch channels...
[CalendarWatchRenewalJob] Encontrados 5 calendarios con watch channels
[CalendarWatchRenewalJob] Renovando watch channel para calendario 123 (expira en 12 horas)
[CalendarWatchRenewalJob] Renovación completada: 5 canales renovados, 0 errores
```

### Sincronización Incremental:

El sistema usa **syncToken** de Google Calendar para sincronización incremental:

```typescript
// Primera sincronización: Últimos 30 días
const params = {
  calendarId: googleCalendarId,
  timeMin: (new Date() - 30 días).toISOString()
};

// Sincronizaciones siguientes: Solo cambios
const params = {
  calendarId: googleCalendarId,
  syncToken: previousSyncToken  // Solo trae cambios
};
```

Esto optimiza el rendimiento y reduce el uso de API.

---

## Troubleshooting

### Problema: "Error al configurar sincronización bidireccional"

**Causas Posibles:**
1. Usuario no es admin
2. Calendario no sincronizado con Google
3. API_BASE_URL no configurada

**Solución:**
1. Verificar que el usuario tenga rol `admin`
2. Sincronizar primero con Google (botón "Sincronizar")
3. Configurar `API_BASE_URL` en variables de entorno

---

### Problema: "Eventos no se sincronizan desde Google"

**Causas Posibles:**
1. Watch channel expirado
2. Webhook URL inaccesible
3. Token de verificación inválido

**Solución:**
1. Hacer clic en "Importar desde Google" para sincronizar manualmente
2. Verificar logs del servidor para errores de webhook
3. Reactivar sincronización bidireccional

---

### Problema: "Watch channel expira constantemente"

**Causas Posibles:**
1. Cron job no está ejecutándose
2. Errores al renovar el canal

**Solución:**
1. Verificar que el módulo de Schedule esté habilitado
2. Revisar logs del cron job en el servidor
3. Renovar manualmente el watch channel

---

## Seguridad

### Validaciones Implementadas:

1. **Autenticación del Webhook:**
   - Validación de `X-Goog-Channel-Token`
   - Verificación de `channelId` en base de datos
   - Solo canales registrados son procesados

2. **Permisos de Usuario:**
   - Solo admin puede configurar sync bidireccional
   - Validación de acceso al calendario
   - Filtrado por tenant (multi-tenancy)

3. **Protección de Datos:**
   - Solo calendarios del ERP se sincronizan
   - Calendarios personales nunca se tocan
   - Eventos filtrados por permisos de calendario

---

## Límites y Consideraciones

### Límites de Google Calendar API:
- **Watch Channels**: Máximo 30 días de duración (configurado a 7 días)
- **Solicitudes**: 1,000,000 queries/día por proyecto
- **Eventos**: Sincronización incremental para optimizar

### Mejores Prácticas:
1. ✅ Renovar watch channels antes de que expiren
2. ✅ Usar sincronización manual solo cuando sea necesario
3. ✅ Monitorear logs del cron job regularmente
4. ✅ Configurar alertas para errores de sincronización

---

## Próximos Pasos (Opcional)

### Mejoras Futuras:
1. Panel de monitoreo de sincronización
2. Métricas de eventos sincronizados
3. Notificaciones en tiempo real al usuario
4. Sincronización selectiva de campos
5. Historial de cambios sincronizados

---

## Soporte

Para problemas o preguntas:
1. Revisar logs del servidor
2. Verificar configuración de Google OAuth
3. Consultar documentación de Google Calendar API
4. Contactar al equipo de desarrollo

---

**Última actualización:** Diciembre 2024
**Versión:** 1.0.0
