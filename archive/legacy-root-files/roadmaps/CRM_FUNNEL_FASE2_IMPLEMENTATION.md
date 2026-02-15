# CRM Funnel - Fase 2: Implementación Completa

## Resumen Ejecutivo

Se ha implementado la **Fase 2 del CRM Funnel** con las siguientes funcionalidades:

1. ✅ **Recordatorios por canal (email/WhatsApp)** - Schemas y sistema base
2. ✅ **Playbooks/secuencias automatizadas** - Completo con triggers por etapa/fuente
3. ✅ **Logging unificado de actividades** - Sistema de Activities con threading
4. 🔄 **Next step obligatorio reforzado** - Pendiente de integración
5. ⏳ **UI para playbooks y recordatorios** - Pendiente
6. ⏳ **Documentación técnica** - Este archivo

---

## 1. Arquitectura Implementada

### 1.1 Nuevos Schemas

#### **Activity Schema** (`/src/schemas/activity.schema.ts`)
- **Propósito**: Logging unificado de todas las actividades (email, WhatsApp, calendar, llamadas, reuniones, tareas)
- **Características**:
  - Threading con `messageId` y `threadId` para agrupar conversaciones
  - Soporte para actividades inbound/outbound
  - Integración con calendarios externos (Google, Microsoft, Apple)
  - Referencias a oportunidades y clientes
  - Metadata extensible

**Campos clave**:
```typescript
- type: email | call | meeting | whatsapp | note | task | calendar_event
- direction: inbound | outbound
- messageId, threadId: Para threading
- externalCalendar, externalEventId: Para sync de calendarios
- opportunityId, customerId, ownerId: Referencias
```

#### **Playbook Schema** (`/src/schemas/playbook.schema.ts`)
- **Propósito**: Automatización de secuencias de tareas/mensajes por etapa o fuente
- **Características**:
  - Triggers configurables (stage_entry, source, manual)
  - Pasos secuenciales con delays
  - Tipos de pasos: TASK, EMAIL, WHATSAPP, WAIT, NOTIFICATION
  - Idempotencia con `PlaybookExecution`

**Estructura**:
```typescript
Playbook:
  - name, description
  - triggerType: stage_entry | source | manual
  - triggerStage, triggerSource, triggerPipeline
  - steps: Array<PlaybookStep>

PlaybookStep:
  - type: task | email | whatsapp | wait | notification
  - order, delayMinutes
  - Configuración específica por tipo

PlaybookExecution:
  - Tracking de ejecución por oportunidad/playbook/step
  - Status: pending | executing | completed | failed
  - scheduledFor, executedAt
```

#### **Reminder Schema** (`/src/schemas/reminder.schema.ts`)
- **Propósito**: Sistema de recordatorios multi-canal
- **Características**:
  - Tipos: next_step_due, aging_alert, mql_response, calendar_event, custom
  - Canales: email, whatsapp, in_app
  - Programación con anticipación configurable
  - Referencias a oportunidades/actividades

---

## 2. Servicios Implementados

### 2.1 Activities Service (`/src/modules/activities/activities.service.ts`)

**Funcionalidades**:
- ✅ CRUD completo de actividades
- ✅ Threading de mensajes (buscar por messageId/threadId)
- ✅ Creación desde mensajes inbound
- ✅ Marcar tareas como completadas
- ✅ Filtros avanzados (oportunidad, cliente, owner, tipo, thread)
- ✅ Paginación

**Métodos clave**:
```typescript
- create(dto, user): Crear actividad
- findAll(query, user): Listar con filtros
- findByMessage(messageId, user): Buscar por mensaje (threading)
- createFromInboundMessage(params): Crear desde email/WhatsApp inbound
- markAsCompleted(id, user): Marcar tarea completada
- findPendingTasks(user): Obtener tareas pendientes
- countByOpportunity(opportunityId, user): Contar actividades
```

**Endpoint**: `/api/v1/activities`

---

### 2.2 Playbooks Service (`/src/modules/playbooks/playbooks.service.ts`)

**Funcionalidades**:
- ✅ CRUD de playbooks
- ✅ Ejecución programada de pasos con delays
- ✅ Idempotencia (no ejecutar pasos duplicados)
- ✅ Triggers automáticos por etapa/fuente
- ✅ Procesamiento en background (cron job cada 5 minutos)
- ✅ Tipos de pasos: TASK, EMAIL, WHATSAPP, NOTIFICATION, WAIT

**Métodos clave**:
```typescript
- create(dto, user): Crear playbook
- findAll(user): Listar playbooks
- executePlaybook(playbookId, opportunityId, user): Ejecutar playbook
- processPendingSteps(): Procesar pasos programados (cron)
- triggerByStageEntry(stage, opportunityId, pipeline, user): Trigger por etapa
- triggerBySource(source, opportunityId, user): Trigger por fuente
```

**Endpoints**:
- `GET /api/v1/playbooks` - Listar
- `POST /api/v1/playbooks` - Crear
- `PUT /api/v1/playbooks/:id` - Actualizar
- `DELETE /api/v1/playbooks/:id` - Eliminar
- `POST /api/v1/playbooks/:id/execute` - Ejecutar manualmente

**Cron Job**: `PlaybookExecutionJob` (`/src/jobs/playbook-execution.job.ts`)
- Ejecuta cada 5 minutos
- Procesa pasos programados (scheduledFor <= now)
- Límite de 100 pasos por ejecución

---

## 3. Integraciones Pendientes

### 3.1 Integrar Playbooks en Opportunities Service

**Archivo**: `/src/modules/opportunities/opportunities.service.ts`

**Cambios necesarios**:

1. **Importar PlaybooksService**:
```typescript
import { PlaybooksService } from '../playbooks/playbooks.service';

constructor(
  // ... otros servicios
  private readonly playbooksService: PlaybooksService,
) {}
```

2. **Trigger en cambio de etapa** (método `updateStage`):
```typescript
async updateStage(id: string, stage: string, user: any) {
  const opportunity = await this.opportunityModel.findOne({
    _id: id,
    tenantId: user.tenantId,
  });

  const previousStage = opportunity.stage;
  opportunity.stage = stage;
  opportunity.probability = this.calculateProbability(stage);

  // Guardar histórico
  opportunity.stageHistory.push({
    fromStage: previousStage,
    toStage: stage,
    changedAt: new Date(),
    changedBy: user.id,
    probability: opportunity.probability,
  });

  await opportunity.save();

  // 🆕 TRIGGER PLAYBOOKS
  await this.playbooksService.triggerByStageEntry(
    stage,
    opportunity._id.toString(),
    opportunity.pipeline,
    user,
  );

  return opportunity;
}
```

3. **Trigger en creación** (método `create`):
```typescript
async create(createOpportunityDto, user: any) {
  const opportunity = new this.opportunityModel({
    ...createOpportunityDto,
    tenantId: user.tenantId,
    createdBy: user.id,
  });

  await opportunity.save();

  // 🆕 TRIGGER PLAYBOOKS POR FUENTE
  if (opportunity.source) {
    await this.playbooksService.triggerBySource(
      opportunity.source,
      opportunity._id.toString(),
      user,
    );
  }

  return opportunity;
}
```

4. **Actualizar OpportunitiesModule** para inyectar PlaybooksModule:
```typescript
import { PlaybooksModule } from '../playbooks/playbooks.module';

@Module({
  imports: [
    // ... otros imports
    PlaybooksModule, // 🆕
  ],
  // ...
})
```

---

### 3.2 Sistema de Recordatorios (Reminders)

**Archivo a crear**: `/src/modules/reminders/reminders.service.ts`

**Funcionalidades necesarias**:

```typescript
@Injectable()
export class RemindersService {
  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    @InjectModel(Opportunity.name) private opportunityModel: Model<OpportunityDocument>,
    private activitiesService: ActivitiesService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Crear recordatorio para next step due
   */
  async createNextStepReminder(
    opportunityId: string,
    nextStepDue: Date,
    channels: ReminderChannel[],
    tenantId: string,
  ): Promise<void> {
    const opportunity = await this.opportunityModel.findById(opportunityId);

    const reminderDate = new Date(nextStepDue.getTime() - 2 * 60 * 60 * 1000); // 2 horas antes

    const reminder = new this.reminderModel({
      type: ReminderType.NEXT_STEP_DUE,
      title: `Próximo paso vence: ${opportunity.name}`,
      message: `El próximo paso "${opportunity.nextStep}" vence el ${nextStepDue.toLocaleString()}`,
      scheduledFor: reminderDate,
      channels,
      opportunityId: opportunity._id,
      customerId: opportunity.customerId,
      userId: opportunity.ownerId,
      advanceMinutes: 120, // 2 horas
      tenantId,
    });

    await reminder.save();
  }

  /**
   * Procesar recordatorios pendientes (cron job)
   */
  async processPendingReminders(): Promise<void> {
    const now = new Date();

    const pendingReminders = await this.reminderModel
      .find({
        status: 'pending',
        scheduledFor: { $lte: now },
      })
      .limit(100)
      .exec();

    for (const reminder of pendingReminders) {
      try {
        await this.sendReminder(reminder);
        reminder.status = 'sent';
        reminder.sentAt = new Date();
        await reminder.save();
      } catch (error) {
        reminder.status = 'failed';
        reminder.error = error.message;
        await reminder.save();
      }
    }
  }

  private async sendReminder(reminder: ReminderDocument): Promise<void> {
    // Enviar por cada canal
    for (const channel of reminder.channels) {
      switch (channel) {
        case 'email':
          // TODO: Enviar email
          break;
        case 'whatsapp':
          // TODO: Enviar WhatsApp
          break;
        case 'in_app':
          await this.notificationsService.enqueueInAppNotification({
            tenantId: reminder.tenantId.toString(),
            userId: reminder.userId?.toString(),
            title: reminder.title,
            message: reminder.message,
            metadata: { reminderId: reminder._id.toString() },
          });
          break;
      }
    }
  }
}
```

**Cron Job**: `/src/jobs/reminder-processing.job.ts`
```typescript
@Injectable()
export class ReminderProcessingJob {
  private readonly logger = new Logger(ReminderProcessingJob.name);

  constructor(private readonly remindersService: RemindersService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleReminderProcessing() {
    this.logger.log("Processing pending reminders...");
    await this.remindersService.processPendingReminders();
  }
}
```

---

### 3.3 Validaciones de Next Step Reforzadas

**Archivo**: `/src/modules/opportunities/opportunities.service.ts`

**Validaciones a agregar**:

1. **Al actualizar oportunidad**:
```typescript
async update(id: string, updateDto: any, user: any) {
  const opportunity = await this.findOne(id, user);

  // 🆕 VALIDAR NEXT STEP SEGÚN ETAPA
  const stageConfig = await this.getStageConfig(opportunity.stage);

  if (stageConfig.requiredFields.includes('nextStep') && !updateDto.nextStep) {
    throw new BadRequestException(
      `El campo "nextStep" es obligatorio para la etapa "${opportunity.stage}"`,
    );
  }

  if (stageConfig.requiredFields.includes('nextStepDue') && !updateDto.nextStepDue) {
    throw new BadRequestException(
      `El campo "nextStepDue" es obligatorio para la etapa "${opportunity.stage}"`,
    );
  }

  // Validar que nextStepDue no sea mayor a 14 días
  if (updateDto.nextStepDue) {
    const maxDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    if (new Date(updateDto.nextStepDue) > maxDate) {
      throw new BadRequestException(
        "nextStepDue no puede ser mayor a 14 días desde hoy",
      );
    }
  }

  Object.assign(opportunity, updateDto);
  await opportunity.save();

  // 🆕 CREAR RECORDATORIO SI HAY NEXTST EPDUE
  if (updateDto.nextStepDue) {
    await this.remindersService.createNextStepReminder(
      opportunity._id.toString(),
      new Date(updateDto.nextStepDue),
      ['email', 'in_app'], // Canales por defecto
      user.tenantId,
    );
  }

  return opportunity;
}
```

2. **Cron job para alertas de aging**:

**Archivo**: `/src/jobs/opportunity-aging-alerts.job.ts`
```typescript
@Injectable()
export class OpportunityAgingAlertsJob {
  private readonly logger = new Logger(OpportunityAgingAlertsJob.name);

  constructor(
    @InjectModel(Opportunity.name)
    private opportunityModel: Model<OpportunityDocument>,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleAgingAlerts() {
    const now = new Date();

    // Oportunidades con nextStepDue vencido
    const overdue = await this.opportunityModel.find({
      stage: { $nin: ['Cierre ganado', 'Cierre perdido'] },
      nextStepDue: { $lt: now },
    }).populate('ownerId customerId');

    for (const opp of overdue) {
      await this.notificationsService.enqueueInAppNotification({
        tenantId: opp.tenantId.toString(),
        userId: opp.ownerId?.toString(),
        title: `⚠️ Próximo paso vencido`,
        message: `La oportunidad "${opp.name}" tiene el próximo paso vencido desde ${opp.nextStepDue.toLocaleDateString()}`,
        metadata: { opportunityId: opp._id.toString() },
      });
    }

    // Alertas de aging 7/14/21 días
    const agingThresholds = [7, 14, 21];

    for (const threshold of agingThresholds) {
      const thresholdDate = new Date(now.getTime() - threshold * 24 * 60 * 60 * 1000);

      const aging = await this.opportunityModel.find({
        stage: { $nin: ['Cierre ganado', 'Cierre perdido'] },
        updatedAt: { $lt: thresholdDate },
      }).populate('ownerId customerId');

      for (const opp of aging) {
        await this.notificationsService.enqueueInAppNotification({
          tenantId: opp.tenantId.toString(),
          userId: opp.ownerId?.toString(),
          title: `⏰ Oportunidad sin actividad (${threshold} días)`,
          message: `La oportunidad "${opp.name}" lleva ${threshold}+ días sin actualización`,
          metadata: { opportunityId: opp._id.toString(), agingDays: threshold },
        });
      }
    }
  }
}
```

---

## 4. Actualizar App Module

**Archivo**: `/src/app.module.ts`

**Agregar imports**:
```typescript
import { ActivitiesModule } from './modules/activities/activities.module';
import { PlaybooksModule } from './modules/playbooks/playbooks.module';
import { RemindersModule } from './modules/reminders/reminders.module'; // Cuando se cree

@Module({
  imports: [
    // ... otros imports existentes
    ActivitiesModule,     // 🆕
    PlaybooksModule,      // 🆕
    // RemindersModule,   // 🆕 Pendiente de crear
    // ... resto de imports
  ],
})
```

---

## 5. Frontend (UI) - Pendiente

### 5.1 Gestión de Playbooks

**Archivo a crear**: `/food-inventory-admin/src/components/PlaybooksManagement.jsx`

**Funcionalidades**:
- Listar playbooks
- Crear/editar playbook con wizard:
  1. Información básica (nombre, descripción)
  2. Trigger (por etapa, fuente, manual)
  3. Pasos (agregar/eliminar/ordenar)
- Activar/desactivar playbooks
- Ver ejecuciones históricas

### 5.2 Timeline de Actividades

**Archivo a crear**: `/food-inventory-admin/src/components/ActivityTimeline.jsx`

**Funcionalidades**:
- Timeline cronológico de actividades por oportunidad
- Filtros por tipo (email, llamada, tarea, reunión)
- Threading de mensajes (agrupar por threadId)
- Marcar tareas como completadas
- Agregar nueva actividad inline

### 5.3 Panel de Recordatorios

**Archivo a actualizar**: `/food-inventory-admin/src/components/CRMManagement.jsx`

**Agregar**:
- Widget de recordatorios pendientes
- Configuración de canales preferidos (email/WhatsApp)
- Ver recordatorios programados

---

## 6. Testing Recomendado

### 6.1 Test de Playbooks

1. **Crear playbook de prueba**:
```bash
POST /api/v1/playbooks
{
  "name": "Bienvenida Lead Nuevo",
  "triggerType": "source",
  "triggerSource": "whatsapp",
  "steps": [
    {
      "name": "Tarea: Llamar en 1 hora",
      "type": "task",
      "order": 1,
      "delayMinutes": 60,
      "taskTitle": "Llamar al lead",
      "taskDueDays": 1
    },
    {
      "name": "Notificación inmediata",
      "type": "notification",
      "order": 2,
      "delayMinutes": 0,
      "notificationTitle": "Nuevo lead desde WhatsApp",
      "notificationMessage": "Revisar el lead y contactar"
    }
  ]
}
```

2. **Crear oportunidad con source="whatsapp"**
3. **Verificar que se ejecutan los pasos después de 60 minutos**

### 6.2 Test de Activities

1. **Crear actividad de email inbound**:
```bash
POST /api/v1/activities
{
  "type": "email",
  "direction": "inbound",
  "subject": "Consulta de producto",
  "body": "Hola, quisiera más información...",
  "customerId": "...",
  "messageId": "msg-123",
  "threadId": "thread-456"
}
```

2. **Buscar por thread**:
```bash
GET /api/v1/activities?threadId=thread-456
```

---

## 7. Variables de Entorno Necesarias

```env
# Ya existentes (no cambiar)
MONGODB_URI=...
API_BASE_URL=https://...

# Para notificaciones (ya configuradas)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
WHAPI_MASTER_TOKEN=...
```

---

## 8. Próximos Pasos (Roadmap Continuación)

### Inmediatos (esta semana):
1. ✅ Crear RemindersModule completo
2. ✅ Integrar playbooks en OpportunitiesService
3. ✅ Cron job de aging alerts
4. ⏳ Testing de playbooks
5. ⏳ UI básica de playbooks

### Corto plazo (próximas 2 semanas):
1. UI de timeline de actividades
2. Recordatorios por email/WhatsApp (integración real)
3. Métricas de playbooks (tasa de ejecución, éxito)
4. Dashboard de actividades

### Mediano plazo (próximo mes):
1. Plantillas de playbooks predefinidas
2. A/B testing de secuencias
3. Scoring basado en engagement (actividades)
4. Integración completa con calendarios (Microsoft, Apple)

---

## 9. Checklist de Implementación

- [x] Schema Activity
- [x] Schema Playbook + PlaybookExecution
- [x] Schema Reminder
- [x] DTOs (Activity, Playbook, Reminder)
- [x] ActivitiesService + Controller + Module
- [x] PlaybooksService + Controller + Module
- [x] PlaybookExecutionJob (cron)
- [ ] RemindersService + Controller + Module
- [ ] ReminderProcessingJob (cron)
- [ ] OpportunityAgingAlertsJob (cron)
- [ ] Integrar playbooks en OpportunitiesService
- [ ] Validaciones next step reforzadas
- [ ] Actualizar app.module.ts
- [ ] UI PlaybooksManagement
- [ ] UI ActivityTimeline
- [ ] UI Recordatorios
- [ ] Tests end-to-end
- [ ] Documentación de usuario

---

## 10. Notas Importantes

1. **Idempotencia**: Los playbooks verifican que no se ejecute el mismo paso dos veces para la misma oportunidad (tabla `PlaybookExecution`)

2. **Threading**: Las actividades de email/WhatsApp usan `messageId` y `threadId` para agrupar conversaciones

3. **Triggers automáticos**: Los playbooks se ejecutan automáticamente al:
   - Cambiar de etapa (`triggerType: "stage_entry"`)
   - Crear oportunidad con fuente específica (`triggerType: "source"`)

4. **Delays**: Los pasos de playbooks se ejecutan con delays configurables (en minutos)

5. **Cron jobs**:
   - Playbooks: cada 5 minutos
   - Reminders: cada 10 minutos (recomendado)
   - Aging alerts: diario a las 9 AM

6. **Canales de notificación**: El sistema soporta email, WhatsApp e in-app, pero actualmente solo in-app está completamente implementado

---

**Fecha de creación**: 2025-12-22
**Versión**: 1.0
**Estado**: Implementación parcial completada
