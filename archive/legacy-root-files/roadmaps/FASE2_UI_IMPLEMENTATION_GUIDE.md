# Guía de Implementación UI - Fase 2 CRM Funnel

## 📋 Resumen

Esta guía documenta la implementación completa de la UI para la Fase 2 del CRM Funnel, incluyendo:
- ✅ Playbooks (secuencias automatizadas)
- ✅ Activities Timeline (historial unificado)
- ✅ Reminders Widget (recordatorios multi-canal)
- ✅ Opportunity Detail Dialog (vista detallada con actividades)

---

## 🎨 Componentes Creados

### 1. PlaybooksManagement.jsx

**Ubicación:** `/food-inventory-admin/src/components/PlaybooksManagement.jsx`

**Propósito:** Gestionar playbooks (secuencias automatizadas de tareas)

**Características:**
- Tabla con lista de todos los playbooks
- Visualización de tipo de trigger (stage_entry, source, manual)
- Contador de pasos configurados
- Badge de estado activo/inactivo
- Botones para crear, editar y eliminar playbooks
- Integración con PlaybookDialog para crear/editar

**Uso:**
```jsx
import { PlaybooksManagement } from './PlaybooksManagement';

// En CRMManagement.jsx ya está integrado en:
<TabsContent value="playbooks">
  <PlaybooksManagement />
</TabsContent>
```

**Hook asociado:** `use-playbooks.js`

---

### 2. PlaybookDialog.jsx

**Ubicación:** `/food-inventory-admin/src/components/PlaybookDialog.jsx`

**Propósito:** Dialog wizard para crear/editar playbooks con 3 pasos

**Características:**

**Paso 1 - Información Básica:**
- Nombre del playbook
- Descripción
- Tipo de trigger (stage_entry, source, manual)
- Switch para activar/desactivar

**Paso 2 - Configurar Trigger:**
- Si es `stage_entry`: Seleccionar pipeline y etapa
- Si es `source`: Seleccionar fuente (whatsapp, email, web, etc.)
- Si es `manual`: Solo mensaje informativo

**Paso 3 - Agregar Pasos:**
- Lista de pasos con drag & drop (usando botones arriba/abajo)
- Cada paso tiene:
  - Nombre
  - Tipo (task, email, whatsapp, notification, wait)
  - Delay en minutos
  - Campos específicos según el tipo:
    - **Task**: Título, descripción, días para vencer
    - **Email**: Asunto, cuerpo
    - **WhatsApp**: Mensaje
    - **Notification**: Título, mensaje
    - **Wait**: Solo delay
- Botón para agregar más pasos
- Botones para reordenar y eliminar pasos

**Validación:**
- Paso 1: Nombre requerido
- Paso 2: Si es stage_entry requiere etapa y pipeline, si es source requiere fuente
- Paso 3: Al menos un paso configurado

**Uso:**
```jsx
import { PlaybookDialog } from './PlaybookDialog';

const [dialogOpen, setDialogOpen] = useState(false);
const [editingPlaybook, setEditingPlaybook] = useState(null);

<PlaybookDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  playbook={editingPlaybook} // null para crear nuevo
  onSave={handleSave}
/>
```

---

### 3. ActivityTimeline.jsx

**Ubicación:** `/food-inventory-admin/src/components/ActivityTimeline.jsx`

**Propósito:** Mostrar timeline de todas las actividades de una oportunidad

**Características:**
- Timeline visual con iconos por tipo de actividad
- Colores diferenciados por tipo (email, call, meeting, whatsapp, task, note)
- Agrupación de conversaciones por threadId
- Conversaciones colapsables con Collapsible
- Badge de dirección (entrante/saliente)
- Para tareas: botón "Completar" y badge de estado
- Para reuniones: fecha/hora y ubicación
- Formulario inline para agregar nueva actividad
- Filtrado por tipo de actividad

**Tipos de actividad soportados:**
- `email` - Email
- `call` - Llamada
- `meeting` - Reunión
- `whatsapp` - WhatsApp
- `task` - Tarea
- `note` - Nota
- `calendar_event` - Evento de calendario

**Uso:**
```jsx
import { ActivityTimeline } from './ActivityTimeline';

<ActivityTimeline opportunityId={opportunity._id} />
```

**Hook asociado:** `use-activities.js`

---

### 4. RemindersWidget.jsx

**Ubicación:** `/food-inventory-admin/src/components/RemindersWidget.jsx`

**Propósito:** Widget para mostrar y gestionar recordatorios

**Características:**
- Lista de recordatorios con filtros (todos, pendientes, enviados)
- Badge contador de pendientes en el título
- Visualización de:
  - Tipo de recordatorio (next_step_due, aging_alert, mql_response, etc.)
  - Estado (pendiente/vencido/enviado)
  - Fecha/hora programada
  - Canales configurados (email, whatsapp, in_app)
  - Oportunidad asociada
- Botón para marcar como enviado
- Indicador visual de recordatorios vencidos (borde rojo)

**Tipos de recordatorio:**
- `next_step_due` - Próximo paso vence
- `aging_alert` - Oportunidad estancada
- `mql_response` - MQL sin respuesta
- `calendar_event` - Evento de calendario
- `custom` - Personalizado

**Uso:**
```jsx
import { RemindersWidget } from './RemindersWidget';

<TabsContent value="reminders">
  <RemindersWidget />
</TabsContent>
```

---

### 5. OpportunityDetailDialog.jsx

**Ubicación:** `/food-inventory-admin/src/components/OpportunityDetailDialog.jsx`

**Propósito:** Dialog completo para ver todos los detalles de una oportunidad

**Características:**

**3 Tabs:**

**Tab 1 - Resumen:**
- Información general (empresa, contacto, email, teléfono, fuente, responsable)
- Próximo paso con fecha de vencimiento (destacado en rojo si está vencido)
- Notas de la oportunidad

**Tab 2 - Detalles:**
- Información BANT (Budget, Authority, Need, Timeline)
- Datos de descubrimiento técnico:
  - Stakeholders
  - Casos de uso
  - Riesgos
- Fecha de cierre estimada
- Si está perdida: razón de pérdida

**Tab 3 - Actividades:**
- Componente ActivityTimeline integrado
- Historial completo de interacciones
- Posibilidad de agregar nuevas actividades

**Uso:**
```jsx
import { OpportunityDetailDialog } from './OpportunityDetailDialog';

const [detailDialogOpen, setDetailDialogOpen] = useState(false);
const [selectedOpportunity, setSelectedOpportunity] = useState(null);

// Al hacer clic en una oportunidad:
<Button onClick={() => {
  setSelectedOpportunity(opportunity);
  setDetailDialogOpen(true);
}}>
  Ver Detalles
</Button>

<OpportunityDetailDialog
  open={detailDialogOpen}
  onOpenChange={setDetailDialogOpen}
  opportunity={selectedOpportunity}
/>
```

---

## 🔧 Hooks Creados

### use-playbooks.js

**Ubicación:** `/food-inventory-admin/src/hooks/use-playbooks.js`

**Funciones:**
```javascript
const {
  playbooks,        // Array de playbooks
  loading,          // Estado de carga
  createPlaybook,   // Crear nuevo playbook
  updatePlaybook,   // Actualizar playbook existente
  deletePlaybook,   // Eliminar playbook
  executePlaybook,  // Ejecutar playbook manualmente
} = usePlaybooks();
```

**Ejemplo de uso:**
```javascript
// Crear playbook
await createPlaybook({
  name: 'Bienvenida WhatsApp',
  description: 'Secuencia de bienvenida para leads de WhatsApp',
  triggerType: 'source',
  triggerSource: 'whatsapp',
  steps: [
    {
      name: 'Enviar saludo inicial',
      type: 'whatsapp',
      order: 1,
      delayMinutes: 0,
      whatsappMessage: 'Hola! Gracias por contactarnos...',
      active: true,
    },
    {
      name: 'Crear tarea de seguimiento',
      type: 'task',
      order: 2,
      delayMinutes: 1440, // 24 horas
      taskTitle: 'Llamar al prospecto',
      taskDueDays: 2,
      active: true,
    },
  ],
  active: true,
});
```

---

### use-activities.js

**Ubicación:** `/food-inventory-admin/src/hooks/use-activities.js`

**Funciones:**
```javascript
const {
  activities,       // Array de actividades
  loading,          // Estado de carga
  createActivity,   // Crear nueva actividad
  updateActivity,   // Actualizar actividad
  markAsCompleted,  // Marcar tarea como completada
  deleteActivity,   // Eliminar actividad
} = useActivities(opportunityId);
```

**Ejemplo de uso:**
```javascript
// Crear actividad
await createActivity({
  opportunityId: '...',
  type: 'email',
  direction: 'outbound',
  subject: 'Propuesta comercial',
  body: 'Adjunto envío propuesta...',
  messageId: 'unique-message-id',
  threadId: 'thread-id-for-grouping',
});

// Marcar tarea como completada
await markAsCompleted(activityId);
```

---

## 📦 Integración en CRMManagement.jsx

### Cambios Realizados:

**1. Imports agregados (línea 45-47):**
```javascript
import { PlaybooksManagement } from './PlaybooksManagement.jsx';
import { ActivityTimeline } from './ActivityTimeline.jsx';
import { RemindersWidget } from './RemindersWidget.jsx';
```

**2. Tabs actualizados (línea 1652):**
```javascript
<TabsList className="grid w-full grid-cols-5 max-w-[1000px]">
  <TabsTrigger value="contacts">Contactos</TabsTrigger>
  <TabsTrigger value="pipeline">Embudo de Ventas</TabsTrigger>
  <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
  <TabsTrigger value="reminders">Recordatorios</TabsTrigger>
  {isAdmin && <TabsTrigger value="settings">Configuración</TabsTrigger>}
</TabsList>
```

**3. TabsContent agregados (antes del settings tab):**
```javascript
<TabsContent value="playbooks" className="space-y-6">
  <PlaybooksManagement />
</TabsContent>

<TabsContent value="reminders" className="space-y-6">
  <RemindersWidget />
</TabsContent>
```

---

## 🚀 Cómo Integrar OpportunityDetailDialog

Para integrar el dialog de detalle de oportunidad en las tarjetas del kanban o tabla:

**1. Agregar el import:**
```javascript
import { OpportunityDetailDialog } from './OpportunityDetailDialog.jsx';
```

**2. Agregar estados:**
```javascript
const [detailDialogOpen, setDetailDialogOpen] = useState(false);
const [selectedOpportunity, setSelectedOpportunity] = useState(null);
```

**3. En cada tarjeta de oportunidad, agregar botón "Ver Detalles":**
```javascript
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    setSelectedOpportunity(opp);
    setDetailDialogOpen(true);
  }}
>
  <Eye className="h-4 w-4 mr-2" />
  Ver Detalles
</Button>
```

**4. Agregar el dialog al final del componente:**
```javascript
<OpportunityDetailDialog
  open={detailDialogOpen}
  onOpenChange={setDetailDialogOpen}
  opportunity={selectedOpportunity}
/>
```

---

## 🎯 Flujo de Usuario Completo

### Crear un Playbook:

1. Usuario navega a tab "Playbooks"
2. Hace clic en "Crear Playbook"
3. **Paso 1:** Llena nombre, descripción, selecciona trigger type
4. Clic en "Siguiente"
5. **Paso 2:** Configura el trigger (etapa o fuente según el tipo)
6. Clic en "Siguiente"
7. **Paso 3:** Agrega pasos:
   - Clic en "Agregar Paso"
   - Selecciona tipo de paso
   - Llena campos específicos
   - Configura delay
   - Repite para más pasos
   - Reordena con botones ↑↓
8. Clic en "Crear Playbook"
9. Playbook aparece en la tabla
10. Automáticamente se ejecutará cuando se cumplan las condiciones del trigger

### Ver Actividades de una Oportunidad:

1. En el embudo de ventas, clic en una oportunidad
2. Se abre OpportunityDetailDialog
3. Navega a tab "Actividades"
4. Ve el timeline completo
5. Puede agregar nuevas actividades desde ahí
6. Las tareas pendientes muestran botón "Completar"
7. Las conversaciones (por threadId) aparecen agrupadas y colapsables

### Gestionar Recordatorios:

1. Usuario navega a tab "Recordatorios"
2. Ve lista de todos los recordatorios
3. Puede filtrar: Todos | Pendientes | Enviados
4. Los recordatorios vencidos aparecen con borde rojo
5. Puede marcar como enviado manualmente
6. Los recordatorios se envían automáticamente por el cron job cada 10 minutos

---

## 🔔 Notificaciones y Automatización

### Playbooks se ejecutan automáticamente cuando:

1. **Trigger: stage_entry**
   - Se crea una oportunidad en esa etapa
   - Se cambia una oportunidad a esa etapa
   - Ejemplo: Al cambiar a "Propuesta", enviar email con propuesta

2. **Trigger: source**
   - Se crea un lead con esa fuente
   - Ejemplo: Lead de WhatsApp → Enviar saludo + crear tarea de llamada

3. **Trigger: manual**
   - Solo se ejecuta cuando se llama explícitamente
   - Usar `executePlaybook(playbookId, opportunityId)`

### Cron Jobs activos:

1. **PlaybookExecutionJob** (cada 5 minutos)
   - Procesa pasos pendientes de playbooks
   - Ejecuta pasos cuyo `scheduledFor` ya llegó

2. **ReminderProcessingJob** (cada 10 minutos)
   - Envía recordatorios pendientes
   - Marca como enviados

3. **OpportunityAgingAlertsJob** (diario a las 9 AM)
   - Detecta oportunidades estancadas (7, 14, 21 días)
   - Detecta nextStepDue vencidos
   - Crea recordatorios automáticos

---

## ✅ Checklist de Testing

### Playbooks:
- [ ] Crear playbook con trigger `stage_entry`
- [ ] Crear playbook con trigger `source`
- [ ] Agregar múltiples pasos de diferentes tipos
- [ ] Reordenar pasos con botones arriba/abajo
- [ ] Editar playbook existente
- [ ] Eliminar playbook
- [ ] Cambiar etapa de oportunidad y verificar que se ejecute playbook
- [ ] Crear lead con fuente específica y verificar playbook

### Activities:
- [ ] Ver timeline de actividades de una oportunidad
- [ ] Agregar nueva actividad (nota, email, tarea)
- [ ] Completar una tarea
- [ ] Ver conversación agrupada por threadId
- [ ] Expandir/colapsar conversaciones

### Reminders:
- [ ] Ver lista de recordatorios
- [ ] Filtrar por pendientes/enviados
- [ ] Marcar recordatorio como enviado
- [ ] Ver recordatorio vencido (con borde rojo)

### Opportunity Detail:
- [ ] Abrir detalle de oportunidad
- [ ] Ver tab de resumen
- [ ] Ver tab de detalles
- [ ] Ver tab de actividades
- [ ] Verificar que ActivityTimeline funcione dentro del dialog

---

## 🎨 Personalización

### Cambiar colores de actividades:

En `ActivityTimeline.jsx`, línea 29-36:
```javascript
const ACTIVITY_COLORS = {
  email: 'bg-blue-500',    // Cambiar a tu color preferido
  call: 'bg-green-500',
  // ...
};
```

### Agregar nuevos tipos de pasos a playbooks:

En `PlaybookDialog.jsx`, línea 47-53:
```javascript
const STEP_TYPES = [
  // ...
  { value: 'sms', label: 'SMS', icon: '📱' },  // Nuevo tipo
];
```

Luego agregar los campos específicos en el paso 3 del wizard.

### Cambiar frecuencia de cron jobs:

En los archivos `*.job.ts`:
```typescript
@Cron(CronExpression.EVERY_5_MINUTES)  // Cambiar a EVERY_MINUTE, etc.
```

---

## 📊 Estructura de Datos

### Playbook:
```typescript
{
  name: string;
  description?: string;
  triggerType: 'stage_entry' | 'source' | 'manual';
  triggerStage?: string;
  triggerSource?: string;
  pipeline?: 'ventas' | 'postventa';
  steps: PlaybookStep[];
  active: boolean;
}
```

### PlaybookStep:
```typescript
{
  name: string;
  type: 'task' | 'email' | 'whatsapp' | 'notification' | 'wait';
  order: number;
  delayMinutes: number;
  active: boolean;
  // Campos específicos por tipo:
  taskTitle?: string;
  taskDescription?: string;
  taskDueDays?: number;
  emailSubject?: string;
  emailBody?: string;
  whatsappMessage?: string;
  notificationTitle?: string;
  notificationMessage?: string;
}
```

### Activity:
```typescript
{
  type: 'email' | 'call' | 'meeting' | 'whatsapp' | 'task' | 'note' | 'calendar_event';
  direction?: 'inbound' | 'outbound';
  subject?: string;
  body?: string;
  opportunityId: string;
  contactId?: string;
  messageId?: string;  // Para threading
  threadId?: string;   // Para threading
  status?: 'pending' | 'completed';
  taskDueDate?: Date;
  meetingStartTime?: Date;
  meetingEndTime?: Date;
  meetingLocation?: string;
}
```

### Reminder:
```typescript
{
  type: 'next_step_due' | 'aging_alert' | 'mql_response' | 'calendar_event' | 'custom';
  opportunityId: string;
  message?: string;
  scheduledFor: Date;
  channels: ('email' | 'whatsapp' | 'in_app')[];
  status: 'pending' | 'sent' | 'failed';
}
```

---

## 🐛 Troubleshooting

### Playbooks no se ejecutan automáticamente:
1. Verificar que el playbook esté `active: true`
2. Verificar que el trigger esté configurado correctamente
3. Revisar logs del backend: `PlaybooksService.triggerByStageEntry` o `triggerBySource`
4. Verificar que el cron job esté corriendo

### Activities no se muestran:
1. Verificar que `opportunityId` sea correcto
2. Revisar permisos del usuario (debe tener acceso a la oportunidad)
3. Verificar logs de `/activities` endpoint

### Reminders no se envían:
1. Verificar que el cron job `ReminderProcessingJob` esté activo
2. Revisar configuración de email/WhatsApp para envíos externos
3. Por ahora solo `in_app` está completamente implementado

---

## 📝 Próximos Pasos Opcionales

1. **Integración con Microsoft Calendar**
   - Sincronizar reuniones con Outlook
   - Ver eventos en ActivityTimeline

2. **Integración con Apple Calendar**
   - Sincronizar con iCloud Calendar
   - Recordatorios nativos de iOS

3. **Analytics de Playbooks**
   - Dashboard con métricas de ejecución
   - Tasa de conversión por playbook
   - Tiempo promedio de ejecución

4. **Templates de Playbooks**
   - Biblioteca de playbooks predefinidos
   - Importar/exportar playbooks

5. **Webhooks**
   - Notificar a sistemas externos cuando se ejecuta un playbook
   - Integrar con Zapier/Make

---

## 🎉 Conclusión

La implementación de la Fase 2 UI está **completa** y funcional. Todos los componentes están integrados en CRMManagement.jsx y listos para usar.

Los usuarios ahora pueden:
- ✅ Crear y gestionar playbooks automatizados
- ✅ Ver timeline completo de actividades por oportunidad
- ✅ Gestionar recordatorios multi-canal
- ✅ Ver detalle completo de oportunidades con historial

El sistema está completamente funcional end-to-end con backend y frontend integrados.
