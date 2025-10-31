# Hospitality – Playbook de Soporte Operativo

## 1. Objetivo
Garantizar una respuesta consistente ante incidentes y solicitudes de clientes hoteleros, alineando el roadmap hospitality y los nuevos módulos (paquetes, loyalty, PMS y calendario).

## 2. Equipo y canales
- **Nivel 1 (Customer Success):** recepción de tickets en Zendesk > vista `Hospitality / Go-Live`. Escala incidentes críticos a L2.
- **Nivel 2 (Soporte Técnico):** canal `#hospitality-oncall` en Slack y guardia rotativa (pager). Ejecutan scripts y verificaciones en tiempo real.
- **Nivel 3 (Ingeniería):** owners de módulos (`appointments`, `service-packages`, `notifications`, `hospitality-integrations`). Intervienen en bugs de código o degradación prolongada.

## 3. Runbook resumido
| Escenario | Acciones inmediatas | Resolución | Follow-up |
|-----------|--------------------|------------|-----------|
| Fallo de recordatorios WhatsApp | Revisar BullMQ `hospitality-notifications` y ejecutar `npm run load-test:hospitality-notifications -- --dry-run`. Validar token Whapi (`Tenant.whapiToken`). | Reejecutar jobs fallidos y documentar en `docs/comms/hospitality-notifications-runbook.md`. | Registrar RCA en Linear y actualizar checklist de notificaciones. |
| Desfase calendario vs PMS | Verificar cola `hospitality-pms-sync` y endpoint `/hospitality/integrations/pms/health`. Correr script `npm run db:migrate:hospitality-hand-off -- --tenant=<id>` si faltan banderas. | Forzar sincronización manual con `hospitality-pms-sync:replay`. | Informar al cliente y anotar mejoras en roadmap. |
| Problemas de 2FA | Confirmar `user.twoFactorSecret` y backup codes. Validar con `verifyTotpCode` (nueva implementación sin dependencias externas). | Regenerar códigos desde Admin > Seguridad. | Compartir guía de regeneración en playbook comercial. |

## 4. Matriz de severidad
- **S1 – Servicio caído:** reservas no disponibles o PMS fuera de sync global. Tiempo de respuesta < 15 min, se activa bridge con ingeniería.
- **S2 – Funcionalidad degradada:** recordatorios retrasados, reportes con latencia > 10 min, dashboard sin badges live. Respuesta < 1h.
- **S3 – Consulta:** solicitudes de configuración, ajustes de templates, dudas sobre loyalty. SLA < 8h.

## 5. Scripts y herramientas
- `npm run db:migrate:hospitality-hand-off` – aplica banderas finales y backfill loyalty.
- `scripts/hospitality-notification-load-test.ts` – stress test de recordatorios pre-go-live.
- `docs/comms/hospitality-notifications-load-test.md` – protocolo de monitoreo BullMQ.
- `docs/verticals/hospitality-playbook.md` – guía comercial y de implementación.

## 6. Checklist semanal post go-live
1. Revisar métricas Grafana (`hospitality_pms_jobs`, `calendar_sync_latency`, `whatsapp_delivery_success`).
2. Exportar reporte `/reports/appointments/export?format=csv` y validar totales vs PMS.
3. Auditar upgrades de loyalty (CRMManagement.jsx) y pendientes de beneficios.
4. Confirmar rotación de guardia y backups de tokens Whapi.

## 7. Documentación relacionada
- `docs/verticals/SERVICES-HOSPITALITY-HANDOFF-CHECKLIST.md`
- `docs/security/hospitality.md`
- `docs/comms/hospitality-notifications-runbook.md`

