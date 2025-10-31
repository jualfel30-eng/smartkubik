# Estado de Implementación – Roadmap Servicios & Hotelería

## Resumen general
- Se activó el motor de paquetes dinámicos con pricing inteligente y verificación de disponibilidad combinada, expuesto vía `/service-packages/*`.
- La capa de loyalty ahora sincroniza tiers y beneficios con CRM, aplicando descuentos automáticos y recompensas al momento de cotizar paquetes.
- Se habilitó el conector PMS (webhooks + cola BullMQ) y la sincronización de calendarios externos, con trazabilidad en `metadata.calendar` y auditoría dedicada.
- Autenticación reforzada con soporte 2FA, registro de auditoría por cita y actualización del playbook/compliance para el hand-off final.

## Pendientes críticos de la Fase 4
- ✅ **QA conversacional** — Suite en `assistant.e2e.spec.ts` cubre creación, cambios y cancelaciones (incluye overbooking y depósitos pendientes).
- ✅ **Stress test de notificaciones** — Script BullMQ ejecutado a 1k mensajes/h, con métricas observadas desde BullBoard y checklist de monitoreo actualizado.
- ✅ **Runbook & opt-out** — Procedimientos documentados en `docs/comms/` con cumplimiento GDPR/TCPA y pasos de reversión.

## Entregables clave de la Fase 5
- ✅ **Exportaciones ejecutivas** — `/reports/appointments/export` disponible (CSV/PDF) con filtros multi-sede en `reports.service.ts`.
- ✅ **Sincronización ops** — `HotelFloorPlan.jsx` y `HotelCalendar.jsx` comparten estado live vía WebSocket.
- ✅ **Service Packages dinámicos** — Nuevo módulo `service-packages` con pricing contextual, verificación multi-recurso y endpoint de disponibilidad.
- ✅ **Loyalty & upgrades** — `loyalty.service.ts` calcula beneficios por tier, registra upgrades en CRM y aplica descuentos automáticos.
- ✅ **Conector PMS** — Webhook `POST /hospitality/integrations/pms/webhook`, cola nocturna BullMQ y reconciliación en `PmsIntegrationService`.
- ✅ **Calendarios externos** — `CalendarIntegrationService` genera ICS y persiste referencias Google/Outlook en `metadata.calendar`.
- ✅ **Seguridad reforzada** — Soporte 2FA en `auth.service.ts`, nuevos campos en `user.schema.ts` y política documentada en `docs/security/hospitality.md`.
- ✅ **Auditoría de reservas** — `appointment-audit.service.ts` registra cambios y la UI muestra timeline contextual.
- ✅ **Compliance & Enablement** — Checklist GDPR/HIPAA actualizado, notas de cifrado/logs y guía `docs/verticals/hospitality-playbook.md` para el hand-off comercial.

## Handoff final
- ✅ Checklist de cierre (`docs/verticals/SERVICES-HOSPITALITY-HANDOFF-CHECKLIST.md`).
- ✅ Playbook de soporte (`docs/support/hospitality-support-playbook.md`).
- ✅ Sales kit para equipo comercial (`docs/verticals/hospitality-sales-kit.md`).
- ✅ Script de migración final (`npm run db:migrate:hospitality-hand-off`).
