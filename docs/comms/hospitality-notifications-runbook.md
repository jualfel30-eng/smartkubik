# Runbook de Notificaciones Hospitality (WhatsApp + Email)

Este runbook documenta los pasos de respuesta ante incidentes relacionados con la mensajería hotelera multicanal.

## 1. Alcance y responsables
- **Alcance:** recordatorios y confirmaciones enviados desde `notifications.service.ts` para citas de hotelería.
- **Canales cubiertos:** WhatsApp (Whapi), email (Nodemailer) y SMS fallback (Twilio).
- **Equipos on-call:**
  - *Backend/Integraciones:* responsable de workers BullMQ y credenciales Whapi/Twilio.
  - *Soporte Comercial:* comunicación con clientes, registro de incidentes en HubSpot.
  - *DevOps:* monitoreo de Redis, colas y disponibilidad de proveedores externos.

## 2. Monitorización continua
- **BullBoard:** revisar `appointment-reminders` para métricas de throughput y jobs fallidos.
- **Alertas Grafana:**
  - `reminder_queue_latency` > 120s (amarilla) o > 300s (roja).
  - `hospitality_notification_failures` > 5 en 5 minutos.
- **Logs estructurados:** buscar en ELK el `context.module=notifications` y `level=error`.

## 3. Procedimiento ante incidentes
1. **Confirmar impacto:** identificar tenant(s) afectado(s), canal fallando y hora de inicio.
2. **Congelar envíos:**
   - Desactivar temporalmente el job con `queue.pause('appointment-reminders')` desde consola o BullBoard.
   - Si el incidente sólo afecta WhatsApp, usar flag `notifications.whatsapp=false` en `tenant.settings` para forzar fallback.
3. **Diagnóstico rápido:**
   - Verificar credenciales en Vault (`WHAPI_TOKEN`, `TWILIO_TOKEN`).
   - Consultar `notifications.service` en logs para códigos HTTP devueltos por Whapi.
   - Revisar límites de API (`429`) o errores de validación de template.
4. **Mitigación:**
   - Cambiar a canal alterno (SMS/email) mediante `queue.add` con `channels=['email']`.
   - Reintentar jobs fallidos desde BullBoard tras restablecer el servicio.
5. **Comunicación:**
   - Informar al equipo comercial y registrar el incidente en la ficha del cliente (HubSpot).
   - Enviar correo a `soporte@smartkubik.com` con resumen inicial.
6. **Cierre:**
   - Reanudar la cola (`queue.resume`).
   - Ejecutar reporte de mensajes reintentados para validar entregas.
   - Documentar causa raíz y acciones preventivas en Confluence.

## 4. Checklist de cumplimiento (opt-out)
- **GDPR/TCPA:**
  - Confirmar que `tenant.settings.notifications.whatsapp` tiene respaldo de opt-in.
  - Respetar keywords `STOP`, `BAJA` y `UNSUBSCRIBE` registrando la baja en `customers.preferences`.
- **Whapi:** mantener plantillas aprobadas, no enviar campañas masivas sin consentimiento.
- **Retención de datos:** purge de logs con PII > 90 días (`notifications.audit` collection).

## 5. Playbooks específicos
- **Whapi 401/403:** regenerar token en consola Whapi, actualizar secret, ejecutar `POST /notifications/test`.
- **Twilio fallback sin entregar:** verificar saldo y remitente autorizado, usar `twilio api:core:messages:list --limit 5`.
- **Plantilla rechazada:** revisar variables en `templates/hospitality/notifications/*.json` y volver a enviar a aprobación.

## 6. Contactos de escalamiento
- **Integraciones:** `integraciones@smartkubik.com`
- **DevOps:** `infra@smartkubik.com`
- **Customer Success:** `cs-hospitality@smartkubik.com`

Mantener este runbook actualizado tras cada retrospectiva de incidentes.
