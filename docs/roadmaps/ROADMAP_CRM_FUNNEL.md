# ROADMAP – CRM + EMBUDO de ventas vinculado a contactos

**Objetivo**: implementar un embudo de ventas gobernado por CRM (sistema de registro) y sincronizado con Marketing Automation para nutrir, puntuar y reactivar contactos, replicando prácticas de líderes (Salesforce/HubSpot/Dynamics): histórico de etapas, next step obligatorio, ownership claro, SLA de respuesta y reportes de conversión/aging.

**Ubicación recomendada**: módulo de **CRM** como dueño del contacto, cuenta y oportunidad; módulo de **Marketing** como consumidor/enriquecedor (campañas, nurturing, scoring). El CRM expone eventos y webhooks a Marketing, pero mantiene el estado de la oportunidad y los acuerdos.

---

## 1) Principios y diseño
- **Sistema de verdad**: Contacto/Cuenta/Oportunidad viven en CRM; Marketing solo lee/escribe atributos permitidos y dispara acciones.
- **Histórico de etapa**: cada cambio con timestamp/usuario/probabilidad para medir duración y conversiones.
- **Next step obligatorio**: fecha y acción comprometida para evitar deals sin movimiento; alertas de SLA.
- **Deduplicación**: un contacto único por email/teléfono (normalizados); merge con auditoría.
- **Gobernanza y seguridad**: ownership por territorio/equipo; visibilidad por owner/team; campos obligatorios por etapa.
- **Playbooks y automatización**: secuencias según etapa/fuente; tareas automáticas al cambiar de etapa; sync 2-way con email/calendario.

---

## 2) Arquitectura funcional (alto nivel)
- **Entidades**: Contacto, Cuenta, Embudo (configurable), Etapa (ordenada con probabilidad), Oportunidad (contacto+cuenta+embudo+etapa+owner+valor), Actividad (llamada/email/reunión/tarea), Campaña (mkt), Lead Score, Segmento (dinámico), Playbook, Fuente (UTM/canal), SLA/Reglas.
- **Eventos**: `contact.created|updated|merged`, `opportunity.created|stage.changed|won|lost`, `activity.logged`, `mql.accepted|rejected`.
- **Integraciones**: email/calendario 2-way, formularios web/UTM, Ads/LinkedIn, chat, soporte/billing via webhooks.

---

## 3) Roadmap por fases (checklist)
- [x] **Fase 0 – Fundamentos (1-2 sprints)**  
  - Modelo Contacto/Cuenta/Oportunidad/Embudo/Etapa + histórico de etapas. ✅  
  - Dedupe/normalización; ownership/visibilidad; campos obligatorios por etapa; SLA inicial. ✅  
  - Razones de pérdida estándar. ✅
- [x] **Fase 1 – Captura, scoring y enrutamiento (1-2 sprints)**  
  - [x] Fuentes: formulario/API con UTM; creación de oportunidad desde captura.  
  - [x] Fuentes: CSV/Ads/LinkedIn/chat (bulk API).  
  - [x] Fuentes: WhatsApp (whapi) + Email landing (webhook/IMAP) con normalización y dedupe + threading.  
  - [x] Scoring fit+intent → MQL; handoff MQL→SQL con aceptación/rechazo.  
  - [x] Reglas de enrutamiento (round-robin/territorio/capacidad básica).  
  - [x] Creación auto de notifs y auto-asignación de owner en inbound (round-robin/backup).  
  - [x] Auto-win cuando hay pago/orden confirmada (webhook billing/order).  
  - [x] Registro de actividades de mensajes (threadId/messageId) y endpoint de consulta.
  - [x] UI de captura en frontend.
- [x] **Fase 2 – Productividad y playbooks (2-3 sprints)** ✅ COMPLETADO 2025-12-23
  - [x] Sync email/calendario 2-way (push desde ERP al calendario favorito; no importar vida personal) - Google Calendar completo.
  - [x] Logging de actividad inbound/outbound y recordatorios por canal (email/WhatsApp) - Sistema completo con Activities + Reminders.
  - [x] Playbooks/secuencias por etapa/fuente; plantillas; tareas automáticas - Sistema completo con triggers automáticos.
  - [x] Next step obligatorio + alertas de deals atascados/aging/SLA reforzadas - Cron jobs diarios + validaciones.
  - [x] **Backend completo**: Schemas (Activity, Playbook, PlaybookExecution, Reminder), Services, Controllers, Modules, DTOs.
  - [x] **Cron Jobs**: PlaybookExecutionJob (5 min), ReminderProcessingJob (10 min), OpportunityAgingAlertsJob (diario 9 AM).
  - [x] **Triggers automáticos**: Integrados en OpportunitiesService (stage_entry y source).
  - [x] **UI completa**: PlaybooksManagement, PlaybookDialog (wizard 3 pasos), ActivityTimeline, RemindersWidget, OpportunityDetailDialog.
  - [x] **Hooks**: use-playbooks.js, use-activities.js con operaciones CRUD completas.
  - [x] **Threading**: MessageId/ThreadId para agrupar conversaciones de email/WhatsApp.
  - [x] **Idempotencia**: PlaybookExecution evita duplicados; delays configurables por paso.
  - [x] **Documentación**: FASE2_UI_IMPLEMENTATION_GUIDE.md con guías completas de uso y testing.
- [ ] **Fase 3 – Automatización inter-módulos (1-2 sprints)**  
  - Triggers por etapa hacia nurturing/onboarding/soporte/presupuestos.  
  - Webhooks/API soporte/finanzas; actualización de score por engagement.  
  - Segmentos dinámicos y campañas reactivadoras.
- [ ] **Fase 4 – Analítica y calidad (2 sprints)**  
  - Dashboards: conversión/aging/cobertura/win rate por fuente/segmento/productividad.  
  - Cohortes tiempo a cierre; pérdidas por razón; salud de datos (duplicados/campos vacíos).  
  - Export API/BI; auditoría de cambios (etapa/owner/valor).
- [ ] **Fase 5 – Escalado y configuración avanzada (continuo)**  
  - Multi-embudo; probabilidades calibradas con datos.  
  - Configuración self-service de embudos/etapas/reglas/SLA; feature flags por territorio.  
  - Cumplimiento (consent/opt-in/GDPR/anonymize).

---

## 4) Métricas de éxito
- Conversión por etapa y win rate por fuente/segmento.
- Tiempo medio por etapa y aging; % deals con next step vigente.
- SLA de contacto a MQL y aceptación SQL; cobertura de pipeline vs cuota.
- Calidad de datos: duplicados por semana, % registros con campos clave completos.

---

## 5) Riesgos y mitigaciones
- **Datos sucios/duplicados** → normalizar y deduplicar con merge controlado y auditoría.
- **Baja adopción** → next step obligatorio, tareas automáticas, vistas kanban/tabla con filtros útiles.
- **Desalineación Mkt/Sales** → handoff con aceptación/rechazo y razones; SLA claros; reportes compartidos.
- **Fuga de visibilidad** → roles por equipo/territorio y reglas de compartición; auditoría de cambios.

---

## Paso 1 – Diseño de datos y gobernanza (iniciado)
- **Sistema de registro**: Contacto/Cuenta/Oportunidad/Embudo/Etapa viven en CRM; Marketing agrega atributos `leadScore`, `utm*`, `campaignId`, `intentSignals`.
- **Contacto**: clave por email/teléfono normalizados; merge con historial; atributos base (nombre, cargo, idioma, país, zona horaria, consentimiento).
- **Cuenta**: clave por dominio/ID externo; industria, tamaño, territorio; relación N:1 con Contacto/Oportunidad.
- **Oportunidad**: referencia a Contacto/Cuenta + Embudo/Etapa; valor, moneda, probabilidad, fecha cierre prevista, reasonLost, nextStep/nextStepDue, owner y equipo.
- **Embudo/Etapa**: etapas ordenadas con probabilidad base; campos obligatorios por etapa; SLA (respuesta, aging máximo) y razones de pérdida.
- **Histórico de etapa**: guardar `fromStage`, `toStage`, timestamp, usuario, probabilidad y valor ponderado; derivar duración por etapa.
- **Deduplicación**: normalizar email (lowercase/trim), teléfono (E.164); reglas: (email OR phone) exact match → merge sugerido; dominio + nombre + país → alerta de posible duplicado; merge con log de cambios.
- **Ownership/visibilidad**: owner obligatorio; equipo/territorio; sharing por owner/team/territory; colas de asignación para leads sin owner.
- **SLA inicial**: respuesta MQL ≤24h; nextStepDue obligatorio y no mayor a 14 días; aging por etapa con umbrales (ej. 7/14/21 días) para alertas.
- **Acción siguiente**: validar estos modelos y campos obligatorios con stakeholders y ajustar embudos/etapas priorizadas (nuevo negocio y expansión).
- **Propuesta de embudo (Nuevo negocio)**:  
  - Etapas y probabilidad base: `Prospecto (0%)`, `Contactado (5%)`, `Calificado (15%)`, `Demo/Discovery (30%)`, `Propuesta (50%)`, `Negociación (70%)`, `Cierre ganado (100%)`, `Cierre perdido (0%)`.  
  - Campos obligatorios por etapa:  
    - Calificado: `pain/need`, `budget fit (sí/no)`, `decision maker identificado`, `timeline`, `nextStep`, `nextStepDue`.  
    - Demo/Discovery: `stakeholders`, `useCases`, `risks`, `nextStep`, `nextStepDue`.  
    - Propuesta: `monto`, `moneda`, `fecha cierre prevista`, `competidor principal`, `nextStep`, `nextStepDue`.  
    - Negociación: `monto`, `moneda`, `fecha cierre prevista`, `razones de bloqueo`, `requisitos legales`, `nextStep`, `nextStepDue`.  
    - Cierre perdido: `reasonLost` (catálogo), `competidor`, `nota`.  
- **Checklist ejecución Paso 1 (esta semana)**:
  - Taller con Ventas/Marketing para validar embudos, etapas, probabilidades y campos obligatorios; aprobar catálogo de razones de pérdida.
  - Definir territorios/equipos y reglas de visibilidad/ownership (owner requerido; colas por territorio).
  - Congelar reglas de dedupe/normalización y proceso de merge con auditoría (quién aprueba merges).
  - Acordar SLA definitivos (respuesta MQL, caducidad de nextStepDue, aging por etapa) y umbrales de alertas.
  - Salida: definición aprobada + backlog técnico (schemas, validaciones, migración de datos y flags de configuración).

---

## Progreso al día (Fase 2 completada - 2025-12-23)
- **Backend completo**:
  - Schemas: `Opportunity`, `StageHistory`, `Activity`, `Playbook`, `PlaybookExecution`, `Reminder`
  - Services: OpportunitiesService (con triggers), ActivitiesService, PlaybooksService, RemindersService
  - Controllers: CRUD completos para todas las entidades
  - Validaciones: Campos obligatorios por etapa, nextStepDue ≤14 días, idempotencia en playbooks
  - Cron Jobs: PlaybookExecution (5min), ReminderProcessing (10min), OpportunityAgingAlerts (diario 9 AM)
- **Frontend completo**:
  - CRMManagement.jsx: 5 tabs (Contactos, Pipeline, Playbooks, Recordatorios, Configuración)
  - PlaybooksManagement + PlaybookDialog: Wizard de 3 pasos para crear secuencias
  - ActivityTimeline: Timeline visual con threading de conversaciones
  - RemindersWidget: Gestión de recordatorios multi-canal
  - OpportunityDetailDialog: Vista completa con actividades integradas
  - Hooks: use-playbooks.js, use-activities.js
- **Automatización**:
  - Playbooks se ejecutan automáticamente por stage_entry y source
  - Recordatorios programados con multi-canal (email/WhatsApp/in_app)
  - Aging alerts automáticos (7/14/21 días)
  - NextStepDue alerts 48h antes y vencidos
- **Pendientes menores Fase 2**:
  - Microsoft Calendar integration (Google ya completo)
  - Apple Calendar integration (CalDAV o ICS)
  - Envío real de emails/WhatsApp desde playbooks (actualmente solo crea actividades)

---

## 🎯 Próximos Pasos Prioritarios (Fase 3 - Automatización inter-módulos)

### Opción A: Completar integraciones de calendario (Fase 2 pendiente menor)
**Tiempo estimado: 1 sprint**
- [ ] **Microsoft 365/Outlook Calendar**
  - Agregar scopes de calendario a OAuth existente
  - Implementar Graph subscriptions para webhooks
  - Push de eventos desde ERP a Outlook
  - UI similar a Google Calendar
- [ ] **Apple Calendar**
  - Decidir: CalDAV vs ICS solo-lectura
  - Implementar sincronización según decisión
  - Endpoint `/calendar/{tenantCode}.ics` si es ICS
- [ ] **Envío real de emails/WhatsApp desde playbooks**
  - Integrar con servicios existentes de email/WhatsApp
  - Renderizar templates en pasos de playbook
  - Tracking de envíos y apertura

**Ventajas**: Completa la Fase 2 al 100%, mejora UX de sincronización cross-platform

---

### Opción B: Comenzar Fase 3 - Automatización inter-módulos
**Tiempo estimado: 1-2 sprints**

#### 1. Triggers entre módulos (prioridad ALTA)
- [ ] **CRM → Onboarding**
  - Al marcar "Cierre ganado", disparar proceso de onboarding
  - Crear tareas de implementación
  - Asignar Customer Success Manager
- [ ] **CRM → Soporte**
  - Crear tickets automáticos desde actividades
  - Sincronizar cliente entre CRM y soporte
  - Alertas de problemas técnicos al Sales Owner
- [ ] **CRM → Presupuestos/Cotizaciones**
  - Generar cotización desde oportunidad
  - Sincronizar productos/precios
  - Auto-actualizar monto en oportunidad
- [ ] **CRM → Finanzas**
  - Webhook cuando se gana deal → crear invoice
  - Sincronizar términos de pago
  - Alertas de pago recibido → completar oportunidad

#### 2. Segmentos dinámicos (prioridad MEDIA)
- [ ] **Motor de segmentación**
  - Query builder para crear segmentos
  - Actualización en tiempo real
  - Ejemplos: "MQLs últimos 30 días sin asignar", "Deals >$10K estancados >14 días"
- [ ] **Campañas reactivadoras**
  - Segmento "Lost deals últimos 6 meses" → campaña de re-engagement
  - Segmento "Deals estancados" → secuencia de follow-up
  - Tracking de conversiones por campaña

#### 3. Actualización de score por engagement (prioridad MEDIA)
- [ ] **Scoring dinámico**
  - +puntos por: email abierto, link clickeado, WhatsApp respondido, meeting agendado
  - -puntos por: no respuesta 14 días, bounce, unsubscribe
  - Auto-promoción a MQL/SQL cuando score > threshold
- [ ] **Intent signals**
  - Tracking de páginas visitadas (pricing, features, demo)
  - Descarga de recursos (whitepapers, case studies)
  - Integración con analytics

**Ventajas**: Convierte el CRM en hub central, automatiza flujos end-to-end, reduce trabajo manual

---

### Opción C: Fase 4 - Analítica y reporting
**Tiempo estimado: 2 sprints**

#### 1. Dashboards de conversión (prioridad ALTA)
- [ ] **Pipeline dashboard**
  - Conversión por etapa (funnel chart)
  - Win rate por fuente/campaña/owner
  - Velocity (tiempo promedio por etapa)
  - Valor ponderado del pipeline
- [ ] **Forecast dashboard**
  - Proyección de cierres por mes/trimestre
  - By owner, by territorio, by producto
  - Probabilidad ajustada por histórico
- [ ] **Productivity dashboard**
  - Actividades por rep (calls, meetings, emails)
  - Time to first response
  - SLA compliance (nextStepDue, MQL 24h)

#### 2. Reportes de calidad de datos
- [ ] **Data health**
  - % oportunidades con campos completos
  - Duplicados detectados/mergeados
  - Oportunidades sin nextStep/owner
- [ ] **Cohort analysis**
  - Tiempo promedio a cierre por cohorte
  - Win rate por mes de creación
  - Razones de pérdida más comunes

#### 3. Exportación y BI
- [ ] **Export API**
  - Endpoints para extraer datos de analytics
  - Formato CSV/JSON/Excel
- [ ] **Integración BI**
  - Conectores para Power BI/Tableau
  - Scheduled reports por email

**Ventajas**: Visibilidad completa de performance, data-driven decisions, identificar cuellos de botella

---

### 🏆 Recomendación: Opción B (Fase 3)

**Razones:**
1. **Mayor impacto en productividad**: Automatizar flujos entre módulos elimina trabajo manual repetitivo
2. **Mejor ROI**: Fase 2 ya está 90% completa (calendarios son nice-to-have)
3. **Aprovechar momentum**: El sistema de playbooks ya está listo para expandirse a otros módulos
4. **Quick wins visibles**: CRM→Presupuestos y CRM→Finanzas tienen valor inmediato

**Orden sugerido dentro de Fase 3:**
1. **CRM → Presupuestos** (1 semana) - Mayor impacto en ventas
2. **CRM → Finanzas** (3 días) - Auto-win por pago ya existe, solo falta invoice
3. **Segmentos dinámicos** (1 semana) - Base para campañas
4. **CRM → Onboarding** (1 semana) - Retención desde día 1
5. **Scoring por engagement** (1 semana) - Mejora calificación

---

## Plan detallado Fase 3 (si se aprueba)

### Sprint 1: CRM → Presupuestos y Finanzas

**Semana 1-2:**
- Backend:
  - Endpoint `POST /opportunities/{id}/generate-quote`
  - Webhook `POST /webhooks/quote-accepted` → actualizar oportunidad
  - Endpoint `POST /opportunities/{id}/generate-invoice`
  - Webhook `POST /webhooks/payment-received` → auto-win
- Frontend:
  - Botón "Generar Cotización" en opportunity detail
  - Modal de configuración de cotización
  - Link a módulo de presupuestos
  - Badge de "Invoice generada" en opportunity

**Entregables:**
- ✅ Generar cotización desde oportunidad en 1 clic
- ✅ Auto-actualizar monto cuando se acepta cotización
- ✅ Auto-crear invoice al ganar deal
- ✅ Auto-cerrar deal cuando se recibe pago

---

### Sprint 2: Segmentos dinámicos y CRM → Onboarding

**Semana 3-4:**
- Backend:
  - Schema `Segment` (name, query, tenantId, dynamic)
  - Service para evaluar queries (MongoDB aggregation)
  - Endpoint `/segments` CRUD
  - Webhook post-win → crear onboarding tasks
- Frontend:
  - Segment builder con filtros visuales
  - Lista de segmentos con contador de miembros
  - Aplicar segmento como filtro en pipeline
  - Onboarding checklist en opportunity post-win

**Entregables:**
- ✅ Crear segmentos tipo "Deals >$10K estancados >14 días"
- ✅ Usar segmentos para filtrar pipeline
- ✅ Auto-generar tareas de onboarding al ganar deal
- ✅ Asignar CS Manager automáticamente

---

### Sprint 3 (opcional): Scoring dinámico

**Semana 5-6:**
- Actualizar score por eventos
- Auto-promoción MQL/SQL
- Intent signals tracking

---

## Contexto clave para sincronización de calendarios (para Claude)
- Propósito: **empujar eventos/tareas del ERP a Google/Microsoft/Apple Calendar** para que los tenants los vean en sus móviles/calendarios preferidos. No se importan eventos personales; solo se reflejan los creados en SmartKubik.
- Se requiere **oauth delegado** con scopes de calendario y watch webhooks por tenant:  
  - Google: `https://www.googleapis.com/auth/calendar` (y `calendar.events`).  
  - Microsoft 365/Outlook: Graph `Calendars.ReadWrite`, `offline_access`, `Calendars.ReadWrite.Shared`.  
  - Apple: vía CalDAV/ICS (sin OAuth nativo) → usar app password/CalDAV o iCloud ICS (solo salida) según decisión.
- Webhooks que ya existen (backend):  
  - Email: `/mail-webhooks/gmail/inbound`, `/mail-webhooks/outlook/inbound`.  
  - Calendario: `/calendar-webhooks/google/event`, `/calendar-webhooks/microsoft/event`, `/calendar-webhooks/apple/event`.  
- API de watch (Google ya implementada): `POST /email-config/gmail/calendar/watch` crea canal; callback debe ser **HTTPS** y usa `API_BASE_URL`.
- Metadatos por evento: `externalEventId`, `externalCalendar=google|microsoft|apple`, `tenantId`, `opportunityId`, `attendees`.
- UX: toggle de sincronización en settings/email para habilitar calendar sync, botón de “probar” watch, y envío de recordatorios por email/WhatsApp opcional por tenant.

## Detalle Fase 2 – Email/Calendar 2-way (en progreso)
- [x] **Google Calendar (delegado OAuth)** - ✅ COMPLETADO
  - [x] Confirmar `API_BASE_URL` HTTPS en prod y renovar consentimiento con scopes calendar. ✅
  - [x] Validar `POST /email-config/gmail/calendar/watch` responde 200: crear canal, guardar `resourceId/channelId/expiration` por tenant. ✅
  - [x] Webhook `/calendar-webhooks/google/event`: si payload es notificación mínima, llamar `events.get` usando `resourceId/eventId`; hacer lookup de `opportunity` por `attendees[].email` o `metadata.opportunityId`; registrar actividad y sincronizar cambios de etapa si aplica. ✅
  - [x] Al crear/editar actividad en ERP con tipo `reunión`/`task` con fecha → crear/actualizar evento en Google con idempotencia completa (update si existe, insert si no). ✅
  - [x] Cron automático para renovar watches antes de expirar (CalendarWatchRenewalJob - diario 2 AM). ✅
  - [x] UI completa con toggle, estado, botón probar, alertas de expiración y garantías de privacidad. ✅
  - [ ] Recordatorios por canal: respetar preferencias tenant (email/WhatsApp) y generar notificación con antelación configurable.
- [ ] **Microsoft 365 / Outlook Calendar**  
  - [ ] Reusar autenticación Outlook existente, añadir scopes `Calendars.ReadWrite`, `offline_access`, `Calendars.ReadWrite.Shared`.  
  - [ ] Endpoint de watch (Graph subscriptions) por tenant; persistir `subscriptionId/resource/expirationDateTime`.  
  - [ ] Webhook `/calendar-webhooks/microsoft/event`: validar firma, obtener `changeType/resourceData`, luego `GET /events/{id}` para detalle; mapear a oportunidad por email/contacto; registrar actividad y guardar `externalEventId`.  
  - [ ] Push desde ERP: crear/actualizar/cancelar evento en Graph (calendar default del usuario autorizado); idempotencia por `externalEventId`.
- [ ] **Apple Calendar (CalDAV/ICS)**  
  - [ ] Definir modo: CalDAV autenticado (app password) o export ICS solo-lectura (si no hay CalDAV). Objetivo mínimo: export ICS por tenant con eventos del ERP.  
  - [ ] Si CalDAV: crear/actualizar evento con `UID` estable, manejar cancelaciones; si ICS: endpoint público por tenant (`/calendar/{tenantCode}.ics`) y regenerar al cambiar eventos.  
- [ ] **Controles de privacidad y dominio de datos**  
  - [ ] Garantizar que solo se envíen eventos/tareas creados en SmartKubik; no leer eventos personales.  
  - [ ] Flag por tenant para activar/desactivar calendar sync y elegir canales de recordatorio.
- [ ] **UI/UX**  
  - [ ] En settings/email: toggle de “Sincronizar calendario” por proveedor, botón “Probar watch”, y estado (activo/expira).  
  - [ ] En pipeline/actividades: opción “Agregar a calendario externo” y visor del `externalEventId` enlazable.  
  - [ ] Snackbar/toast de éxito/fallo de sincronización.
- [ ] **Monitoreo y confiabilidad**  
  - [ ] Reintentos/backoff para fallos de API externas; colas para webhooks.  
  - [ ] Cron para renovar watches/subscriptions antes de expirar (Google/Microsoft).  
  - [ ] Logs con `channelId/resourceId/opportunityId/tenantId` para trazabilidad.

## Lista explícita de pendientes por bloque (sin ocultar subpasos)
- **Google Calendar (push ERP → Google)** - ✅ COMPLETADO
  - [x] Verificar `API_BASE_URL` HTTPS en prod; renovar OAuth con scopes calendar. ✅
  - [x] Probar `POST /email-config/gmail/calendar/watch`; guardar `channelId/resourceId/expiration` por tenant. ✅
  - [x] En `/calendar-webhooks/google/event`: si notificación mínima, llamar `events.get`; lookup de oportunidad por `attendees.email` o `metadata.opportunityId`; registrar actividad. ✅
  - [x] Mejorar idempotencia en `syncGoogleEvent` (update si existe `externalEventId`, insert si no). ✅
  - [x] Cron para renovar watch antes de expirar (CalendarWatchRenewalJob ejecuta diariamente a las 2 AM). ✅
  - [x] UI: toggle "Sincronizar Google Calendar", botón "Probar watch", estado activo/expira con alertas visuales, información de privacidad. ✅
- **Microsoft 365 / Outlook Calendar**  
  - [ ] Agregar scopes `Calendars.ReadWrite`, `offline_access`, `Calendars.ReadWrite.Shared` al flujo existente.  
  - [ ] Endpoint para crear subscription Graph por tenant; guardar `subscriptionId/resource/expirationDateTime`.  
  - [ ] Webhook `/calendar-webhooks/microsoft/event`: validar firma, `GET /events/{id}`, mapear a oportunidad, registrar actividad, guardar `externalEventId`; reintentos/backoff.  
  - [ ] Push ERP→Graph (create/update/cancel) con idempotencia `externalEventId`.  
  - [ ] Cron de renovación de subscriptions.  
  - [ ] UI similar a Google (toggle, probar, estado, recordatorios).
- **Apple Calendar**  
  - [ ] Definir CalDAV (app password) vs ICS solo salida.  
  - [ ] Si CalDAV: create/update/cancel con UID estable; si ICS: endpoint `/calendar/{tenantCode}.ics` regenerable.  
  - [ ] UI: toggle/URL ICS; aclarar que es solo salida si ICS.
- **Playbooks/secuencias**  
  - [ ] Modelo playbook (etapa/fuente → pasos con tareas/mensajes/plantillas).  
  - [ ] Servicio: al entrar a etapa/fuente, generar tareas/notifs y opcionalmente enviar email/WhatsApp (si canal disponible).  
  - [ ] Idempotencia por oportunidad/playbook/step; reintentos envíos.  
  - [ ] UI para crear/editar playbooks y ver playbook activo por etapa/fuente.
- **Logging y recordatorios**  
  - [ ] Unificar logging inbound/outbound (email/WhatsApp/calendar) con `threadId/messageId`.  
  - [ ] Recordatorios configurables por tenant (email/WhatsApp) para `nextStepDue` y eventos calendar.  
  - [ ] Jobs aging 7/14/21 días y SLA MQL 24h; cola si sin owner >4h; escalado día 21.
- **UX/Privacidad**  
  - [ ] Validaciones frontend/backend para `nextStep/nextStepDue` en etapas requeridas.  
  - [ ] Confirmar no importamos eventos personales; solo publicamos los creados en SmartKubik; flag por tenant para activar/desactivar sync.  
  - [ ] Toasts de error/éxito en sincronización y estado visible en settings.

---

## Mejores prácticas líderes (Salesforce/HubSpot/Dynamics/Zendesk Sell/Intercom) para inbound WhatsApp/Email
- **Ingesta unificada y encolada**: un único endpoint/webhook por canal (WhatsApp, email/IMAP, landing) → normalizar payload, encolar con idempotencia (messageId/threadId) y procesar asíncrono.
- **Deduplicación antes de crear**: lookup por email normalizado y teléfono E.164; si existe contacto → anexar mensaje y, si no hay oportunidad abierta, crear una nueva en etapa inicial; si no existe → crear contacto + oportunidad; merge sugerido cuando hay dominio/nombre/país similares.
- **Threading y ownership**: conservar threadId (WhatsApp/Email inReplyTo) para agrupar historial y re-asignar al mismo owner; fallback round-robin/territorio para nuevos leads.
- **Clasificación automática**: reglas+NLU simple para intención (“compra directa” vs “consulta”); MQL auto si viene de landing con datos completos; SQL auto si detecta intención de compra.
- **Auto-win por pago**: webhook de pedido/pago (orderId) que busca la oportunidad abierta del contacto y la marca “Cierre ganado”, registra monto/moneda/closedAt y crea actividad “Pago recibido”.
- **Consent y auditoría**: bandera de opt-in por canal y log de quién/qué proceso creó/actualizó.

## Ruta sugerida (añadida al backlog de Fase 1)
1) **Webhook whapi + email/landing**: endpoints `/capture/whatsapp` y `/capture/email` que normalicen payload, hagan lookup/merge y creen contacto+oportunidad; heredar UTM/source.  
2) **Idempotencia y threading**: guardar `messageId/threadId` y `sourceType` en una colección de ingestión; si ya se procesó, no duplicar; linkear a contacto/oportunidad existente.  
3) **Clasificador de intención**: reglas y keywords para marcar `intent=buy_now` → stage “Contactado/Calificado” + nextStepDue inmediato; si el payload trae orderId pagado, saltar a “Cierre ganado”.  
4) **Webhook de pago/pedido**: al recibir `order.paid`, buscar contacto y oportunidad abierta → mover a “Cierre ganado”, set `amount/currency/closedAt`, crear actividad de pago.  
5) **Tareas/alertas**: si no hay pago ni next step, crear tarea/autonotificación para responder en <24h y asignar owner (territorio/round-robin).  
6) **Opt-in y privacidad**: almacenar `consentChannel`, fuente, y auditar qué proceso creó/actualizó para cumplimiento.

---

## Decisiones aterrizadas (listas para implementar)
- **Embudos activos**: `Nuevo negocio` y `Expansión/Upsell` (misma secuencia; expansión puede saltar Propuesta si pricing estándar).
- **Etapas y probabilidades**: Prospecto 0%, Contactado 5%, Calificado 15%, Demo/Discovery 30%, Propuesta 50%, Negociación 70%, Cierre ganado 100%, Cierre perdido 0%.
- **Campos obligatorios por etapa**:  
  - Calificado: `pain/need`, `budgetFit (sí/no)`, `decisionMaker`, `timeline`, `nextStep`, `nextStepDue`.  
  - Demo/Discovery: `stakeholders`, `useCases`, `risks`, `nextStep`, `nextStepDue`.  
  - Propuesta: `monto`, `moneda`, `fechaCierrePrevista`, `competidorPrincipal`, `nextStep`, `nextStepDue`.  
  - Negociación: `monto`, `moneda`, `fechaCierrePrevista`, `razonesBloqueo`, `requisitosLegales`, `nextStep`, `nextStepDue`.  
  - Cierre perdido: `reasonLost` (catálogo), `competidor`, `nota`.
- **Catálogo `reasonLost`**: Sin presupuesto; Sin urgencia/prioridad; No encaja caso de uso; Falta decision maker; Eligió competidor; Precio/condiciones; Pausado/No respuesta; Fuera territorio/segmento; Onboarding/CS issue (expansión); Otros (nota obligatoria).
- **SLA y alertas**: Respuesta MQL ≤24h; `nextStepDue` obligatorio y ≤14 días; alerta si vence en ≤48h o vencido; aging por etapa con alertas a 7/14/21 días (escalado al manager al día 21); SQL debe ser aceptado/rechazado con razón; lead sin owner → cola de territorio en <4h.
- **Ownership/visibilidad**: Owner obligatorio; fallback cola por territorio; visibilidad por owner + team + territory; flag `strategicAccount` para compartir cuentas estratégicas.
- **Territorios propuestos**: LATAM-Norte, LATAM-Sur, Europa, USA/CAN, segmentados por SMB vs Mid-Market/Enterprise (ajustable).
- **Dedupe/merge**: Clave de Contacto = email normalizado (lower/trim) o teléfono E.164; merge sugerido si coincide email o phone exacto; alerta de posible duplicado con dominio+nombre+país; merges aprobados por RevOps con log/auditoría.

## Backlog técnico a crear (tickets/epics)
- **Schemas/validaciones**: `StageHistory`; constraints por etapa; `nextStep/nextStepDue`; catálogo `reasonLost`; territorios/equipos/colas; flag `strategicAccount`.
- **Reglas de dedupe**: normalización email/phone; endpoint/UI de merge con auditoría; alertas duplicados exactos y sospechosos (dominio+nombre+país).
- **SLA/alertas**: job aging 7/14/21; alerta `nextStepDue` 48h antes/vencido; SLA MQL 24h; auto-cola si sin owner >4h; aceptación/rechazo SQL con razón.
- **Migraciones**: normalizar emails/phones; backfill territorios/owners; crear colas y asignar leads sin owner; poblar `reasonLost` (mapear, resto “Otros” + nota); cargar probabilidades base y flag de embudos múltiples.
- **Configuración/flags**: probabilidades editables por admin; catálogo `reasonLost` editable; alertas aging/SLA por territorio/equipo; feature flag embudos múltiples y `strategicAccount`.
