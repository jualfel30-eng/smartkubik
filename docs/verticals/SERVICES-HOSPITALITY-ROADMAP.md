# 🏨 Roadmap de Implementación – Vertical Servicios & Hotelería

> **Referencia base:** `IMPLEMENTATION-ROADMAP.md`  
> **Objetivo:** Escalar la oferta de agenda/servicios para competir con soluciones “top notch” del mercado anglosajón, priorizando casos de hotelería (habitaciones + spa + concierge).  
> **Fecha:** 2025-01-04  

---

## 📌 Metas Principales

1. **Agenda centralizada multi-recurso** que soporte habitaciones, spa, actividades del hotel y coordinación inter-áreas.
2. **Portal de reservas self-service 24/7** con marca del hotel (web + móvil), selección de sede/servicio/proveedor y gestión de cambios.
3. **Automatización de comunicaciones y pagos** para reducir no-shows, asegurar depósitos y respetar políticas de cancelación.
4. **Analítica y reportes hoteleros** sobre ocupación, upsells (spa, experiencias), no-shows y revenue recuperado.
5. **Integraciones & seguridad** con PMS/CRS, calendarios externos, videollamadas (teleconserjería) y capas de AI conversacional.

La ejecución se alinea al enfoque incremental del roadmap maestro: dependencias primero, bajo riesgo, habilitando quick wins para demos comerciales.

---

## 🔍 Estado Actual vs “Top Notch”

| Área | Capacidades actuales | Gap principal |
|------|---------------------|---------------|
| Agenda Backoffice | CRUD completo en `appointments.service.ts` con validación de choques por recurso y buffers básicos (`service.schema.ts`). Vista de calendario operativo (`CalendarView.jsx`) para eventos internos. | Falta calendario dedicado a citas con vistas por habitación/proveedor, soporte recurrente, reservas grupales y slots por capacidad. |
| Gestión Servicios & Recursos | UI para servicios con duración, buffers, precios y color (`ServicesManagement.jsx`). Recursos con horarios, vacaciones y especializaciones (`ResourcesManagement.jsx`, `resource.schema.ts`). | No hay asignación multi-recurso, capacidades (cupos) ni segmentación por ubicación/área hotelera. |
| Experiencia Cliente | Storefront Next listo para extender. AI Assistant ya consulta disponibilidad (`assistant-tools.service.ts`). CRM con datos completos (`CRMManagement.jsx`). | Ausencia total de portal público de reservas, reprogramación/cancelación online y formularios dinámicos por servicio. |
| Monetización & Comms | Módulo de pagos robusto (`payments.service.ts`) y esquema de cita contempla `paymentStatus`/`paidAmount`. Mailer base operativo (`mail.service.ts`). | Sin integración de pasarelas en reservas, sin manejo de depósitos/políticas, ni recordatorios/confirmaciones automatizadas (email/SMS/WhatsApp). |
| Analítica | Endpoint de estadísticas simple (`appointments.service.ts#getStatistics`). | Falta dashboard con métricas hoteleras (ocupación, no-shows, upsell), exportaciones y comparativas multi-sucursal. |
| Integraciones & Seguridad | Feature flags por vertical (`vertical-features.config.ts`). Tenants almacenan timezone/idioma/logo (`tenant.schema.ts`). | Sin conectores PMS/Google Calendar/Zoom, sin webhooks, branding parcial, ni portal whitelabel completo. |

---

## 🧭 Principios de Ejecución

- **“Backend first”:** extender APIs (`/appointments/*`, `/services/*`, `/resources/*`, `/payments/*`) antes del frontend para habilitar el storefront y asistentes.
- **Feature flags por tenant/vertical:** activar módulos como `booking` y `servicePackages` progresivamente (`tenant.enabledModules`).
- **Jobs y colas dedicadas:** recordatorios, check-ins automáticos y actualizaciones de disponibilidad deben correr en background (BullMQ/Redis).
- **Experiencia hotelera modular:** habilitar sub-módulos por área (habitaciones, spa, actividades) aprovechando `services.allowedResourceTypes` y `resource.specializations`.
- **Demo-driven:** priorizar entregables tangibles para la reunión comercial (pasarela de demo, calendario combinado, mock de portal).

---

## 🔗 Dependencias Clave

- **Backend & BD:** módulos `appointments`, `services`, `resources`, `payments` y `notifications` en Nest deben evolucionar en conjunto; migraciones en `appointment.schema.ts`, `service.schema.ts` y `resource.schema.ts` requieren scripts coordinados y despliegue con downtime cero.  
- **Admin Frontend (React):** pantallas `CalendarView.jsx`, `ServicesManagement.jsx`, `ResourcesManagement.jsx`, `PayablesManagement.jsx` y `AccountingManagement.jsx` son los pivotes UI para nuevas opciones; requieren hooks compartidos (`use-appointments`, `use-services`).  
- **Portal público (Next/Storefront):** crear o extender app `booking-portal` dentro del monorepo (o workspace dedicado) con Single Sign-On opcional, theming por `tenant.settings` y consumo seguro de los endpoints `/public/*`.  
- **Infra & DevOps:** Redis/BullMQ gestionados como servicio crítico (healthchecks, métricas, alertas), variables `ENABLE_SERVICE_BOOKING_PORTAL`, `ENABLE_APPOINTMENT_REMINDERS`, `ENABLE_SERVICE_PACKAGES`, secrets de pasarelas y Twilio/WhatsApp gestionados via Vault.  
- **Datos & Enablement:** seeds en `food-inventory-saas/src/database/seeds` (añadir perfil hospitality) para entornos de demo/staging, plantillas de emails (`templates/hospitality/*`), manuales comerciales y checklist de soporte sincronizados con `DOC-FLUJO-PAGOS-COMPRAS-CONTABILIDAD-CUENTAS-BANCARIAS.md`.

---

## 🛠️ Plan por Fases

### Fase 0 – Preparación (1 semana)
**Objetivo:** habilitar infraestructura y base de datos para nuevas capacidades.**
- [x] Auditar y extender índices en `appointment.schema.ts` (`locationId`, `capacityUsed`, `customerEmail`).
- [x] Configurar cola de jobs (BullMQ) + workers en `src/modules/appointments`.
- [x] Definir convenciones de `feature flags` (`ENABLE_SERVICE_BOOKING_PORTAL`, `ENABLE_APPOINTMENT_REMINDERS`).
- [x] Crear fixtures demo hotel (habitaciones, spa, city tours) en `seeding`.

**Salida esperada:** rama base, jobs configurados, flags listos, datos demo cargados.

### Fase 1 – Núcleo Agenda Hotelera (3–4 semanas)
**Objetivo:** elevar el módulo de citas al estándar hotel-spa.**
- **Modelo y API**  
  - [x] Agregar campos a `Appointment`: `locationId`, `participants`, `capacity`, `addons`, `source`, `customerEmail` y referencias multi-recurso.  
  - [x] Extender `Service` con `serviceType`, `minAdvanceBooking`, `maxAdvanceBooking`, `addons` y `requiresDeposit`.  
  - [x] Crear endpoint `POST /appointments/series` para recurrencia.  
  - [x] Crear endpoint `POST /appointments/group` para bloques grupales (tours/clases).  
  - [x] Ajustar multi-recurso en `checkConflict` para intersección de ubicaciones.
- **Calendario backoffice**  
  - [x] Nueva vista con pestañas lista/calendario, filtros por tipo/estado y recursos.  
  - [x] Integración de `GET /appointments/calendar` con capacidad, estado y metadatos coloreados.
- **Capacidades especiales hotel**  
  - [x] Pausa automática entre check-out/check-in con buffers y tarea de housekeeping automática.  
  - [x] Bloqueo manual de habitaciones para mantenimiento desde backoffice.

**Criterios de salida:** reservas sin solaparse por habitación, vista calendario operativa, pruebas e2e básicas con multi-recurso.

### Fase 2 – Portal de Reservas Self-Service (4 semanas)
**Objetivo:** dar autonomía al huésped y soportar marca blanca.**
- **Frontend Web (Next)**  
  - [x] Crear flow `/book` con pasos: selección, extras, datos del huésped, confirmación.  
  - [x] Añadir paso de depósito (recordatorio y tarea de cobro) en portal público.  
  - [x] Completar theming dinámico (logo/idioma) desde `tenant.settings`.  
  - [x] Panel cliente `/reservations` con lookup por email/código, reprogramación y cancelación.
- **API Pública**  
  - [x] Endpoints `POST /public/appointments` y `/availability`.  
  - [x] Endpoints `/:id/cancel` y `/:id/reschedule` con validación de código.  
  - [x] Validaciones de cupos combinados por grupo/capacidad en bloque grupal.
- **Móvil & multicanal**  
  - [x] Portal responsivo listo para móvil.  
  - [x] Deep link de auto-gestión/QR disponibles y CTA “Reserve with Google” configurable (pendiente integración API oficial).

**Criterios de salida:** portal funcional con pagos deshabilitados por flag, reprogramación activa, branding básico.

### Fase 3 – Pagos, Depósitos y Políticas (3 semanas)
**Objetivo:** disminuir no-shows y asegurar revenue.**
- **Pasarelas y depósitos**  
  - [x] Flujo manual de cobro operativo: CTA WhatsApp en el portal, registro de depósitos en backoffice con comprobantes, notas y tareas automáticas.  
  - [x] Persistencia y auditoría de depósitos en `appointments.service.ts` (adjuntos base64, estados `requested/submitted/confirmed/rejected`, integración con todo list).  
  - [x] Confirmación manual genera movimiento en `bank-transactions.service.ts` y asiento automático vía `accounting.service.ts` (`Anticipos de Clientes`).  
  - [x] Profundizar en herramientas 100% manuales: plantillas de mensajes por banco, checklist de validación y dashboard de depósitos pendientes (sin pasarelas internacionales).
- **Políticas configurables**  
  - [x] Configuración UI: porcentaje depósito, penalties, ventana free-cancel.  
  - [x] Automatizar recordatorios al equipo para validar pagos pendientes (antes y después del check-in).
- **Documentos y facturación**  
  - [x] Generar recibo automático al confirmar depósitos y exponer comprobante (`/manual-deposits/:id/receipt`) enlazado con el asiento contable.

**Criterios de salida:** cobro de depósito en reserva de spa/habitación, retención automática en no-show, facturas emitidas.

### Fase 4 – Comunicaciones Inteligentes (3 semanas)
**Objetivo:** reducir ausencias e incrementar upsells.**
- **Plantillas y notificaciones**  
  - Crear plantillas email/SMS/WhatsApp (confirmación, reminder 24h, reminder 2h, follow-up).  
  - Jobs programados utilizando la cola: consumo de `appointments.reminderSent` para evitar duplicados.
- **WhatsApp & AI**  
  - Extender `assistant-tools.service.ts` para crear/modificar reservas desde chat usando LangChain.  
  - Flujos de conversación: “reserva habitación”, “agrega masaje”, “cancela tour”.
- **CRM insights**  
  - Registrar interacciones en CRM (último recordatorio enviado, canal preferido).  
  - Etiquetas automáticas: VIP, huéspedes frecuentes, preferencia de idioma.

**Criterios de salida:** recordatorios multi-canal en producción, chatbot capaz de reservar y modificar citas demo, logs auditables.

### Fase 5 – Analítica & Verticalización Hotel (4 semanas)
**Objetivo:** ofrecer inteligencia y paquetizar la solución.**
- **Dashboard & reportes**  
  - Panel “Hotel Ops” con: ocupación diaria/semanal, spa utilization, ingresos por upsell, no-shows evitados.  
  - Reportes exportables (CSV, PDF) y endpoints para BI (`/appointments/reports`).  
  - Métricas para seguimiento de campañas (citas recuperadas por recordatorios).
- **Floor plan habitaciones**  
  - Tablero visual tipo “floor plan” por zonas/pisos mostrando estado de cada habitación (ocupada, check-out hoy, housekeeping pendiente, servicios extra).  
  - Flags y hooks compartidos con la vista Calendario Hotel para sincronizar disponibilidad y tareas operativas en tiempo real.
- **Paquetes & membresías**  
  - Activar `servicePackages` para combos (noche + spa + cena).  
  - Integración con loyalty o CRM para upgrades automáticos.
- **Integraciones clave**  
  - Conector PMS (webhooks + API) para sincronizar disponibilidad habitaciones.  
  - Sincronización externa de calendarios (Google/Outlook) y generación de links de videollamada para concierge virtual.
- **Seguridad & Compliance**  
  - 2FA obligatorio para administradores.  
  - Auditoría de cambios sobre reservas (quién confirmó/canceló).  
  - Revisión de GDPR/HIPAA (si clínica/spa médico dentro del hotel).

**Criterios de salida:** dashboard operativo, floor plan hotel publicado, paquetes vendidos, conectores piloto integrados, controles de seguridad activos.

---

## 🚨 Riesgos & Mitigaciones

- **Overbooking multi-recurso:** riesgo de choques cuando reservas públicas y backoffice se ejecutan en paralelo; mitigar con locks optimistas en `appointments.service.ts`, jobs de reconciliación cada 5 min y auditoría de cambios.  
- **Pagos y depósitos parciales:** posible desalineación entre portal y backoffice; usar estados explícitos (`pendingDeposit`, `awaitingEvidence`), workflows manuales con checklist y reportes diarios.  
- **Compliance & datos sensibles:** tratamiento de datos médicos/spa y tarjetas; aislar secretos por tenant, tokenizar depósitos, habilitar retención mínima en logs (`PII scrub`).  
- **Carga operacional por comunicaciones:** envío duplicado de recordatorios o mensajes erróneos; centralizar lógica en worker único, usar idempotency keys y dashboards de mailer/SMS.  
- **Integraciones externas inestables:** APIs PMS/Google/WhatsApp pueden fallar; encapsular en adaptadores con retries exponenciales y feature flags independientes por conector.

---

## 👥 Equipo & Ownership

- **Backend Lead – Agenda & Pagos:** diseña contratos de `appointments`, `services`, `payments`, cubre migraciones y workers; responsable de Fases 1 y 3.  
- **Frontend Lead – Admin Ops:** evoluciona `CalendarView.jsx`, `ServicesManagement.jsx` y componentes auxiliares; trabaja con Product para UX hotelera.  
- **Storefront/Portal Lead:** desarrolla la app Next para reservas públicas, integra pagos y personaliza branding.  
- **AI & Integraciones:** mantiene `assistant-tools.service.ts`, webhooks y conectores PMS/WhatsApp; coordina pilotos de concierge virtual.  
- **Analytics & Growth:** construye dashboard hotelero, define KPIs, prepara historias de demo y contenidos de enablement.  
- **Customer Success / Soporte:** documenta políticas, ejecuta seeds demo, valida runbooks y lidera QA funcional con clientes piloto.

---

## 🧪 QA & Rollout Plan

- **Entornos y datos:** habilitar `staging-hospitality` con seeds de hotel boutique y scripts de reset diario; crear tenant piloto para demo.  
- **Testing incremental:** cada fase debe cerrar con unit tests (Nest + React Testing Library), contract tests para `/public/*` y suites Playwright (`apps/calendar-booking.e2e.spec.ts`).  
- **Flujo de depósitos manuales:** validar registro en portal, aprobación/rechazo en admin, creación de `depositRecords`, movimientos bancarios y asiento contable.  
- **QA cruzado:** repetir smoke en vertical `food-service` con flags activos para evitar regresiones; checklist compartido en `docs/qa/hospitality-runbook.md`.  
- **Monitoreo & alertas:** instrumentar métricas (`appointment_conflicts`, `reminder_queue_latency`, `deposit_collected`) en Grafana, alertas Slack.  
- **Rollout controlado:** activar flags primero en demo interna, luego en hotel piloto, y finalmente habilitación global con capacitación + soporte on-call.

---

## 🏁 Quick Wins para la Reunión Comercial

- **Demo personalizada hotel boutique:** calendario combinado (habitaciones + spa), portal de reservas con branding del cliente demo y flujo de cobro sandbox.  
- **Storytelling de IA:** chatbot concertando un masaje para un huésped, confirmación por WhatsApp y bloqueo automático en calendario.  
- **Report snapshot:** mock de dashboard que muestre ocupación y ventas cruzadas (habitaciones vs spa) con cifras de ejemplo.  
- **Checklist de cumplimiento:** security bullet points (multi-tenant aislado, `ModuleAccessGuard`, `JwtAuthGuard`, backups, logs) para confianza del cliente.

---

## 📊 KPIs Clave

| Fase | Métrica | Meta |
|------|---------|------|
| F1 | % de solapes de recursos | < 0.5% por mes |
| F2 | Reservas self-service | ≥ 50% de las nuevas en demo pilot |
| F3 | Reducción no-show | -60% vs baseline (con depósitos + recordatorios) |
| F4 | Conversión upsell via reminders | ≥ 15% respuesta positiva |
| F5 | Tiempo promedio de check-in en spa | -30% gracias a pre-registro |

---

## ✅ Checklist Cierre de Proyecto

- [ ] Documentación actualizada (`DOC-MODULO-CALENDARIO.md` + nuevo `DOC-MODULO-BOOKING.md`).  
- [ ] Playbook de soporte y runbook de incidencias (colas, pasarelas).  
- [ ] Scripts de migración validados (campos nuevos en citas/servicios).  
- [ ] Pruebas E2E en `apps/calendar-booking.e2e.spec.ts` cubriendo portal público + backoffice.  
- [ ] Hand-off comercial: slides con roadmap, casos de éxito demo y KPIs.

---

> **Siguiente paso recomendado:** aprobar Fase 0 y asignar equipo responsable por stream (Backend, Frontend, AI/Integraciones, Growth & Analytics). Una vez validados los primers quick wins, preparar demo dirigida al cliente hotelero aprovechando los flags para activar únicamente módulos completos.
