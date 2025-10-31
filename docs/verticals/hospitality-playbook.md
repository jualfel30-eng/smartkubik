# Hospitality Vertical – Playbook de Implementación y Enablement

## 1. Elevator pitch
- **Oferta integrada:** agenda hotel + spa, paquetes combinados, comunicaciones multicanal y dashboards de revenue en tiempo real.
- **Quick wins demo:** reservar paquete “Noche romántica + spa”, confirmación WhatsApp, calendario sincronizado en Google y tablero de ocupación.
- **Clientes objetivo:** hoteles boutique, resorts wellness y cadenas con spa/experiencias que requieren conciergerie digital.

## 2. Alcance funcional
- **Service Packages:** combos configurables en backoffice (`/service-packages`) con pricing dinámico y disponibilidad multi-recurso.
- **Loyalty & CRM:** scoring automático (`customers.service.ts`) + beneficios (`loyalty.service.ts`) aplicados al cotizar/confirmar paquetes.
- **PMS Connector:** webhook `POST /hospitality/integrations/pms/webhook` + cola `hospitality-pms-sync` para reconciliación nocturna.
- **Calendars:** sincronización ICS/Google/Outlook con tracking en `metadata.calendar` y control de cancelación.
- **Auditoría:** timeline consultable desde Appointments > editar > “Historial de cambios”.

## 3. Kick-off con cliente
1. **Discovery (1h)** – Identificar tipos de servicio, recursos, políticas de depósito/cancelación y sistemas PMS/Calendario actuales.
2. **Configuración inicial (0.5d)** – Cargar servicios, recursos, packages demo y usuarios administradores (activar 2FA). Revisar seeds `seeding/hospitality`.
3. **Integraciones (1-2d)** – Coordinar claves PMS, calendar IDs y pruebas de webhook. Habilitar cola BullMQ en entorno del cliente.
4. **UAT guiado (1d)** – Validar flujos: creación paquete, confirmación, recordatorios Whapi, sincronización Google/Outlook y reporte exportado.
5. **Go-live (0.5d)** – Activar flags en tenant (`servicePackages`, `appointments`, `notifications`), monitorear colas y canal #hospitality-oncall.

## 4. Checklist de compliance
- Confirmar aceptación de términos y políticas en portal público (`metadata.portalSubmission`).
- Registrar consentimiento de comunicaciones (opt-in) y mantener runbook de opt-out (`docs/comms`).
- Verificar almacenamiento seguro de comprobantes/depósitos y acceso restringido en buckets.
- Ejecutar borrado selectivo de auditoría/logs si el cliente lo solicita (scripts de mantenimiento documentados).

## 5. Métricas de éxito
- **Tasa de ocupación** ≥ 80% (dashboard Hotel Ops).
- **Ingresos por paquetes** – meta inicial: +15% sobre baseline mensual.
- **Depósitos confirmados** – >90% con reconciliación bancaria.
- **SLA comunicaciones** – recordatorios procesados < 5 minutos desde job programado.
- **Adopción 2FA** – 100% administradores activos.

## 6. Material de apoyo
- Deck comercial editable (`/docs/assets/hospitality-demo.pptx`).
- Videos Loom: demo de paquete + sincronización calendar, walkthrough de auditoría.
- Scripts `scripts/hospitality-notification-load-test.ts` y `docs/comms/*` para validaciones previas al go-live.
- Política de seguridad: `docs/security/hospitality.md`.

## 7. Post-go-live
- Revisar semanalmente cola `hospitality-pms-sync` y métricas en Grafana (`hospitality_pms_jobs`, `calendar_sync_latency`).
- Reunión de seguimiento con el cliente a los 14 días (feedback de huéspedes, mejoras UX portal).
- Mantener backlog de mejoras en `Implementation-Roadmap.md` (ej. upsell en portal público, kioskos self check-in).
