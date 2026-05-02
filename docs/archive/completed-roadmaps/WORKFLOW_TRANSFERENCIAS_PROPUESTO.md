# Workflow Propuesto: Transferencias de Inventario con Modelo Pull

## 🎯 Objetivo
Implementar un sistema bidireccional de transferencias que permita tanto reabastecimiento proactivo (push) como solicitudes de inventario desde sedes (pull), con segregación clara de responsabilidades.

---

## 📋 Estados Propuestos

```typescript
enum TransferRequestType {
  PUSH = "push",  // Iniciada por origen (reabastecimiento)
  PULL = "pull"   // Iniciada por destino (solicitud)
}

enum TransferOrderStatus {
  // Estados comunes
  DRAFT = "draft",
  CANCELLED = "cancelled",

  // Estados específicos PUSH
  PUSH_REQUESTED = "push_requested",      // Origen solicita aprobación interna
  PUSH_APPROVED = "push_approved",        // Aprobada por supervisor origen

  // Estados específicos PULL
  PULL_REQUESTED = "pull_requested",      // Destino solicita inventario
  PULL_APPROVED = "pull_approved",        // Origen aprueba solicitud
  PULL_REJECTED = "pull_rejected",        // Origen rechaza solicitud

  // Estados compartidos (post-aprobación)
  IN_PREPARATION = "in_preparation",      // Origen preparando despacho
  IN_TRANSIT = "in_transit",              // Despachado y en camino
  DELIVERED = "delivered",                // Entregado físicamente (opcional)
  PARTIALLY_RECEIVED = "partially_received",
  RECEIVED = "received"                   // Confirmado por destino
}
```

---

## 🔄 Flujo PUSH (Reabastecimiento Proactivo)

### Actor Principal: **ALMACÉN DE DISTRIBUCIÓN / ORIGEN**

```
┌─────────────────────────────────────────────────────────────┐
│ FLUJO PUSH - El origen decide enviar inventario             │
└─────────────────────────────────────────────────────────────┘

1. [ORIGEN] Crea transferencia (DRAFT)
   - Acción: createTransferOrder({ type: "push", ... })
   - UI: Solo visible para origen
   - Botones: "Guardar borrador", "Solicitar aprobación"

2. [ORIGEN] Solicita aprobación interna (PUSH_REQUESTED)
   - Acción: requestApproval(transferId)
   - UI: Notifica a supervisores de origen
   - Botones: "Editar", "Cancelar"

3. [SUPERVISOR ORIGEN] Aprueba/Rechaza (PUSH_APPROVED)
   - Acción: approve(transferId, { items, adjustedQuantities })
   - Permiso: "transfer_orders_approve"
   - UI: Panel de "Solicitudes pendientes" (solo origen)
   - Puede ajustar cantidades
   - Botones: "Aprobar", "Rechazar", "Solicitar cambios"

4. [ORIGEN] Prepara y despacha (IN_PREPARATION → IN_TRANSIT)
   - Acción: markAsInPreparation(transferId)
   - Acción: ship(transferId, { items, shippedQuantities, trackingInfo })
   - UI: Origen puede ver progreso de preparación
   - Genera: Movimiento OUT de inventario
   - Botones: "Preparar despacho", "Despachar"

5. [DESTINO] Recibe notificación de envío
   - UI: Aparece en "Transferencias en tránsito" (solo lectura)
   - Info visible: tracking, ETA, contenido
   - **NO puede editar ni cancelar**

6. [DESTINO] Confirma recepción (RECEIVED / PARTIALLY_RECEIVED)
   - Acción: receiveTransfer(transferId, { items, receivedQuantities })
   - UI: Panel de "Recepciones pendientes" (solo destino)
   - Genera: Movimiento IN de inventario
   - Puede reportar: faltantes, daños, diferencias
   - Botones: "Recibir completo", "Recibir parcial", "Reportar problema"
```

### Segregación de UI:

| Vista | Origen | Destino |
|-------|--------|---------|
| Crear/Editar | ✅ Completo | ❌ No accede |
| Solicitar aprobación | ✅ Puede | ❌ No accede |
| Aprobar | ✅ Supervisor | ❌ No accede |
| Despachar | ✅ Puede | ❌ No accede |
| Ver en tránsito | ✅ Solo lectura | ✅ Solo lectura |
| Recibir | ❌ No accede | ✅ Exclusivo |

---

## 🔄 Flujo PULL (Solicitud de Inventario)

### Actor Principal: **SEDE SOLICITANTE / DESTINO**

```
┌─────────────────────────────────────────────────────────────┐
│ FLUJO PULL - La sede solicita inventario al almacén central │
└─────────────────────────────────────────────────────────────┘

1. [DESTINO] Crea solicitud de inventario (DRAFT)
   - Acción: createTransferRequest({ type: "pull", sourceWarehouseId, items })
   - UI: Panel "Solicitar inventario" (solo destino)
   - Justificación: motivo, prioridad, fecha requerida
   - Botones: "Guardar borrador", "Enviar solicitud"

2. [DESTINO] Envía solicitud (PULL_REQUESTED)
   - Acción: submitRequest(transferId)
   - UI: Cambia a "Solicitudes enviadas" (solo lectura para destino)
   - **NO puede editar después de enviar**
   - Botones: "Ver detalle", "Cancelar solicitud" (solo antes de aprobación)

3. [ORIGEN] Recibe y revisa solicitud (PULL_REQUESTED)
   - UI: Aparece en "Solicitudes de inventario recibidas"
   - Info visible: productos, cantidades, justificación, sede solicitante
   - Valida: disponibilidad de stock, prioridad, historial
   - Botones: "Aprobar", "Rechazar", "Solicitar aclaración", "Ajustar cantidades"

4. [ORIGEN] Aprueba o Rechaza solicitud

   **Opción A: APRUEBA (PULL_APPROVED)**
   - Acción: approveRequest(transferId, { items, approvedQuantities })
   - Puede ajustar cantidades según disponibilidad
   - Motivo: si ajusta cantidades
   - Notifica a destino automáticamente
   - Pasa a paso 5

   **Opción B: RECHAZA (PULL_REJECTED)**
   - Acción: rejectRequest(transferId, { reason })
   - Motivo obligatorio: "Sin stock", "Solicitud duplicada", etc.
   - Notifica a destino
   - **FIN del flujo**

5. [DESTINO] Recibe notificación de aprobación/rechazo
   - UI: Actualización automática del estado
   - Si aprobada: puede ver cantidades ajustadas (si aplica)
   - Si rechazada: ve motivo y puede crear nueva solicitud
   - **NO puede modificar la decisión**

6. [ORIGEN] Prepara y despacha (IN_PREPARATION → IN_TRANSIT)
   - Acción: markAsInPreparation(transferId)
   - Acción: ship(transferId, { items, shippedQuantities, trackingInfo })
   - Genera: Movimiento OUT de inventario
   - Notifica a destino cuando despacha
   - Botones: "Preparar despacho", "Despachar"

7. [DESTINO] Recibe notificación de despacho
   - UI: Aparece en "Recepciones en tránsito"
   - Info: tracking, ETA, contenido aprobado
   - **NO puede cancelar en este punto**

8. [DESTINO] Confirma recepción (RECEIVED / PARTIALLY_RECEIVED)
   - Acción: receiveTransfer(transferId, { items, receivedQuantities })
   - UI: Panel "Recepciones pendientes"
   - Genera: Movimiento IN de inventario
   - Puede reportar: faltantes vs aprobado, daños
   - Botones: "Recibir completo", "Recibir parcial", "Reportar discrepancia"
```

### Segregación de UI:

| Vista | Destino (Solicitante) | Origen (Almacén) |
|-------|-----------------------|------------------|
| Crear solicitud | ✅ Completo | ❌ No accede |
| Enviar solicitud | ✅ Puede | ❌ No accede |
| Ver solicitudes pendientes | ✅ Solo lectura | ✅ Puede aprobar/rechazar |
| Aprobar/Rechazar | ❌ No accede | ✅ Exclusivo |
| Preparar/Despachar | ❌ No accede | ✅ Exclusivo |
| Ver en tránsito | ✅ Solo lectura | ✅ Solo lectura |
| Recibir | ✅ Exclusivo | ❌ No accede |

---

## 🔐 Matriz de Permisos y Acciones

### Permisos Base

```typescript
// Permisos actuales
"transfer_orders_read"           // Ver transferencias
"transfer_orders_write"          // CRUD básico
"transfer_orders_approve"        // Aprobar (supervisor)

// Permisos nuevos propuestos
"transfer_requests_create"       // Crear solicitudes (modelo pull)
"transfer_requests_approve"      // Aprobar solicitudes de otras sedes
"transfer_orders_ship"           // Despachar transferencias
"transfer_orders_receive"        // Recibir transferencias
"transfer_orders_cancel"         // Cancelar (con restricciones)
```

### Acciones por Rol y Tipo

```typescript
// MODELO PUSH
const pushWorkflow = {
  DRAFT: {
    origen: ["edit", "request_approval", "cancel"],
    destino: [] // No ve la transferencia
  },
  PUSH_REQUESTED: {
    origen: ["approve", "reject", "cancel"],
    destino: [] // No ve la transferencia
  },
  PUSH_APPROVED: {
    origen: ["prepare", "ship", "cancel"],
    destino: [] // No ve la transferencia
  },
  IN_TRANSIT: {
    origen: ["view_tracking"],
    destino: ["view_tracking", "receive", "report_issue"]
  },
  RECEIVED: {
    origen: ["view_receipt"],
    destino: ["view_receipt"]
  }
}

// MODELO PULL
const pullWorkflow = {
  DRAFT: {
    origen: [], // No ve la solicitud
    destino: ["edit", "submit_request", "cancel"]
  },
  PULL_REQUESTED: {
    origen: ["approve", "reject", "request_clarification"],
    destino: ["view", "cancel"] // Solo antes de aprobación
  },
  PULL_APPROVED: {
    origen: ["prepare", "ship"],
    destino: ["view", "acknowledge"]
  },
  PULL_REJECTED: {
    origen: ["view"],
    destino: ["view", "create_new_request"]
  },
  IN_TRANSIT: {
    origen: ["view_tracking"],
    destino: ["view_tracking", "receive", "report_issue"]
  },
  RECEIVED: {
    origen: ["view_receipt"],
    destino: ["view_receipt"]
  }
}
```

---

## 🎨 Cambios en UI/UX

### 1. Navegación Contextual

```jsx
// Componente: TransferNavigation.jsx
<Tabs value={activeTab}>
  {/* PARA ALMACÉN/ORIGEN */}
  <Tab label="Despachos push" value="push-outbound" />
  <Tab label="Solicitudes recibidas" value="pull-requests" badge={pendingCount} />
  <Tab label="En preparación" value="in-preparation" />
  <Tab label="Despachadas" value="shipped" />

  {/* PARA SEDES/DESTINO */}
  <Tab label="Solicitar inventario" value="create-request" />
  <Tab label="Mis solicitudes" value="my-requests" />
  <Tab label="En tránsito" value="incoming" badge={inTransitCount} />
  <Tab label="Recepciones pendientes" value="to-receive" badge={toReceiveCount} />

  {/* COMÚN */}
  <Tab label="Historial" value="history" />
</Tabs>
```

### 2. Estados Visuales Claros

```jsx
// Componente: TransferStatusBadge.jsx
const statusConfig = {
  // Push flow
  push_requested: {
    color: "warning",
    icon: "pending",
    label: "Pendiente aprobación interna",
    audience: "origen"
  },
  push_approved: {
    color: "info",
    icon: "check_circle",
    label: "Aprobada - Lista para despacho",
    audience: "origen"
  },

  // Pull flow
  pull_requested: {
    color: "primary",
    icon: "request_quote",
    label: "Solicitud enviada",
    audience: "destino"
  },
  pull_approved: {
    color: "success",
    icon: "thumb_up",
    label: "Solicitud aprobada",
    audience: "ambos"
  },
  pull_rejected: {
    color: "error",
    icon: "cancel",
    label: "Solicitud rechazada",
    audience: "destino"
  },

  // Shared
  in_preparation: {
    color: "info",
    icon: "inventory",
    label: "En preparación",
    audience: "origen"
  },
  in_transit: {
    color: "warning",
    icon: "local_shipping",
    label: "En tránsito",
    audience: "ambos"
  },
  received: {
    color: "success",
    icon: "done_all",
    label: "Recibido",
    audience: "ambos"
  }
}
```

### 3. Botones Contextuales

```jsx
// Componente: TransferActions.jsx
function TransferActions({ transfer, currentTenant, userPermissions }) {
  const isSource = transfer.sourceTenantId === currentTenant
  const isDestination = transfer.destinationTenantId === currentTenant
  const isPush = transfer.type === "push"
  const isPull = transfer.type === "pull"

  // MODELO PUSH - Origen
  if (isPush && isSource) {
    switch (transfer.status) {
      case "draft":
        return <ButtonGroup>
          <EditButton />
          <RequestApprovalButton />
          <CancelButton />
        </ButtonGroup>

      case "push_requested":
        return <ButtonGroup>
          <ApproveButton permission="transfer_orders_approve" />
          <RejectButton permission="transfer_orders_approve" />
        </ButtonGroup>

      case "push_approved":
        return <ButtonGroup>
          <PrepareButton />
          <ShipButton disabled={!isPrepared} />
        </ButtonGroup>

      default:
        return <ViewOnlyBadge />
    }
  }

  // MODELO PULL - Destino crea solicitud
  if (isPull && isDestination) {
    switch (transfer.status) {
      case "draft":
        return <ButtonGroup>
          <EditButton />
          <SubmitRequestButton />
          <CancelButton />
        </ButtonGroup>

      case "pull_requested":
        return <ButtonGroup>
          <ViewButton />
          <CancelRequestButton disabled={transfer.approvedBy} />
        </ButtonGroup>

      case "pull_approved":
        return <AcknowledgeButton />

      case "in_transit":
        return <ViewTrackingButton />

      default:
        return <ViewOnlyBadge />
    }
  }

  // MODELO PULL - Origen aprueba solicitud
  if (isPull && isSource) {
    switch (transfer.status) {
      case "pull_requested":
        return <ButtonGroup>
          <ApproveButton permission="transfer_requests_approve" />
          <RejectButton permission="transfer_requests_approve" />
          <RequestClarificationButton />
        </ButtonGroup>

      case "pull_approved":
        return <ButtonGroup>
          <PrepareButton />
          <ShipButton disabled={!isPrepared} />
        </ButtonGroup>

      default:
        return <ViewOnlyBadge />
    }
  }

  // Recepción - Solo destino
  if (isDestination && transfer.status === "in_transit") {
    return <ButtonGroup>
      <ReceiveButton />
      <ReportIssueButton />
    </ButtonGroup>
  }

  return <ViewOnlyBadge />
}
```

---

## 📊 Notificaciones y Alertas

```typescript
// Eventos que disparan notificaciones

// Notificar a DESTINO
- pull_approved: "Tu solicitud #{orderNumber} fue aprobada"
- pull_rejected: "Tu solicitud #{orderNumber} fue rechazada: {reason}"
- in_transit: "Despacho #{orderNumber} en camino - ETA: {estimatedArrival}"
- delivered: "Despacho #{orderNumber} entregado - Confirma recepción"

// Notificar a ORIGEN
- pull_requested: "Nueva solicitud #{orderNumber} de {destinationName}"
- received: "{destinationName} confirmó recepción de #{orderNumber}"
- partially_received: "{destinationName} reportó recepción parcial de #{orderNumber}"

// Notificar a SUPERVISORES
- push_requested: "Solicitud #{orderNumber} pendiente de aprobación"
- in_preparation_delayed: "Despacho #{orderNumber} lleva {days} días en preparación"
```

---

## 🗄️ Cambios en Backend

### Schema Modificado

```typescript
// transfer-order.schema.ts
class TransferOrder {
  // ... campos existentes ...

  // NUEVO
  type: {
    type: String,
    enum: ["push", "pull"],
    required: true,
    default: "push"
  }

  // Para modelo PULL - quien inicia
  requestedBy: { type: Schema.Types.ObjectId, ref: "User" }
  requestedAt: Date

  // Aprobación de solicitud PULL
  approvalReviewedBy: { type: Schema.Types.ObjectId, ref: "User" }
  approvalReviewedAt: Date
  approvalDecision: { type: String, enum: ["approved", "rejected"] }
  approvalNotes: String

  // Preparación antes de despacho
  inPreparationBy: { type: Schema.Types.ObjectId, ref: "User" }
  inPreparationAt: Date

  // Tracking información
  trackingNumber: String
  carrier: String
  estimatedArrival: Date

  // Recepción con validaciones
  receivedBy: { type: Schema.Types.ObjectId, ref: "User" }
  receivedAt: Date
  receiptNotes: String
  hasDiscrepancies: Boolean
  discrepancies: [{
    productId: Schema.Types.ObjectId,
    variantId: Schema.Types.ObjectId,
    expectedQuantity: Number,
    receivedQuantity: Number,
    reason: String,
    images: [String]
  }]
}
```

### Nuevos Endpoints

```typescript
// transfer-orders.controller.ts

// MODELO PULL - Creación de solicitud por destino
@Post("requests")
@RequirePermissions("transfer_requests_create")
async createRequest(@Body() dto: CreateTransferRequestDto) {
  // Valida que el usuario esté en sede destino
  // Crea transferencia con type="pull", status="draft"
}

// MODELO PULL - Enviar solicitud (draft → pull_requested)
@Post("requests/:id/submit")
@RequirePermissions("transfer_requests_create")
async submitRequest(@Param("id") id: string) {
  // Valida estado draft
  // Cambia a pull_requested
  // Notifica a origen
}

// MODELO PULL - Aprobar solicitud
@Post("requests/:id/approve")
@RequirePermissions("transfer_requests_approve")
async approveRequest(@Param("id") id: string, @Body() dto: ApproveRequestDto) {
  // Valida estado pull_requested
  // Valida que usuario esté en sede origen
  // Puede ajustar cantidades
  // Cambia a pull_approved
  // Notifica a destino
}

// MODELO PULL - Rechazar solicitud
@Post("requests/:id/reject")
@RequirePermissions("transfer_requests_approve")
async rejectRequest(@Param("id") id: string, @Body() dto: RejectRequestDto) {
  // Valida estado pull_requested
  // Valida que usuario esté en sede origen
  // Requiere motivo
  // Cambia a pull_rejected
  // Notifica a destino
}

// Marcar como en preparación (compartido push/pull)
@Post(":id/prepare")
@RequirePermissions("transfer_orders_ship")
async markAsInPreparation(@Param("id") id: string) {
  // Valida estado push_approved o pull_approved
  // Cambia a in_preparation
}

// Despachar (compartido push/pull)
@Post(":id/ship")
@RequirePermissions("transfer_orders_ship")
async ship(@Param("id") id: string, @Body() dto: ShipTransferDto) {
  // Valida estado in_preparation
  // Decrementa inventario origen
  // Crea movimiento OUT
  // Cambia a in_transit
  // Notifica a destino
}

// Recibir (compartido push/pull)
@Post(":id/receive")
@RequirePermissions("transfer_orders_receive")
async receive(@Param("id") id: string, @Body() dto: ReceiveTransferDto) {
  // Valida estado in_transit
  // Valida que usuario esté en sede destino
  // Incrementa inventario destino
  // Crea movimiento IN
  // Detecta discrepancias
  // Cambia a received o partially_received
  // Notifica a origen
}

// Reportar discrepancia
@Post(":id/report-discrepancy")
@RequirePermissions("transfer_orders_receive")
async reportDiscrepancy(@Param("id") id: string, @Body() dto: ReportDiscrepancyDto) {
  // Registra diferencias entre esperado y recibido
  // Permite adjuntar fotos
  // Crea caso de investigación (opcional)
  // Notifica a origen
}
```

### Validaciones Específicas por Flujo

```typescript
// transfer-orders.service.ts

private validateWorkflowTransition(
  transfer: TransferOrder,
  targetStatus: TransferOrderStatus,
  currentTenant: string,
  userId: string
) {
  const isSource = transfer.sourceTenantId.toString() === currentTenant
  const isDestination = transfer.destinationTenantId.toString() === currentTenant
  const isPush = transfer.type === "push"
  const isPull = transfer.type === "pull"

  // Validaciones específicas PUSH
  if (isPush) {
    if (targetStatus === "push_requested" && !isSource) {
      throw new ForbiddenException("Solo la sede origen puede solicitar aprobación")
    }
    if (targetStatus === "push_approved" && !isSource) {
      throw new ForbiddenException("Solo la sede origen puede aprobar")
    }
  }

  // Validaciones específicas PULL
  if (isPull) {
    if (targetStatus === "pull_requested" && !isDestination) {
      throw new ForbiddenException("Solo la sede destino puede enviar solicitud")
    }
    if (["pull_approved", "pull_rejected"].includes(targetStatus) && !isSource) {
      throw new ForbiddenException("Solo la sede origen puede aprobar/rechazar solicitudes")
    }
  }

  // Validaciones compartidas
  if (targetStatus === "in_transit" && !isSource) {
    throw new ForbiddenException("Solo la sede origen puede despachar")
  }
  if (["received", "partially_received"].includes(targetStatus) && !isDestination) {
    throw new ForbiddenException("Solo la sede destino puede confirmar recepción")
  }

  // Validar transiciones permitidas
  const allowedTransitions = this.getAllowedTransitions(transfer.status, transfer.type)
  if (!allowedTransitions.includes(targetStatus)) {
    throw new BadRequestException(`No se puede cambiar de ${transfer.status} a ${targetStatus}`)
  }
}

private getAllowedTransitions(
  currentStatus: TransferOrderStatus,
  type: "push" | "pull"
): TransferOrderStatus[] {
  const transitions = {
    push: {
      draft: ["push_requested", "cancelled"],
      push_requested: ["push_approved", "cancelled"],
      push_approved: ["in_preparation", "cancelled"],
      in_preparation: ["in_transit", "cancelled"],
      in_transit: ["received", "partially_received"],
      received: [],
      partially_received: ["received"],
      cancelled: []
    },
    pull: {
      draft: ["pull_requested", "cancelled"],
      pull_requested: ["pull_approved", "pull_rejected", "cancelled"],
      pull_approved: ["in_preparation"],
      pull_rejected: [],
      in_preparation: ["in_transit"],
      in_transit: ["received", "partially_received"],
      received: [],
      partially_received: ["received"],
      cancelled: []
    }
  }

  return transitions[type][currentStatus] || []
}
```

---

## 📈 Reportes y Analytics

### Métricas PULL (Solicitudes de inventario)

```typescript
// Dashboard de Almacén Central
- Solicitudes pendientes de aprobación
- Tiempo promedio de aprobación
- Tasa de aprobación vs rechazo
- Motivos de rechazo más comunes
- Sedes con más solicitudes
- Productos más solicitados

// Dashboard de Sedes
- Solicitudes enviadas (total, aprobadas, rechazadas)
- Tiempo promedio de respuesta del almacén
- Tasa de aprobación de mis solicitudes
- Productos con más solicitudes rechazadas
```

### Métricas PUSH (Reabastecimiento)

```typescript
// Dashboard de Almacén Central
- Transferencias push creadas
- Tiempo promedio de preparación
- Tiempo promedio de tránsito
- Sedes con recepciones pendientes

// Dashboard de Sedes
- Recepciones pendientes
- Recepciones completadas
- Discrepancias reportadas
- Tiempo promedio de recepción
```

---

## 🚀 Plan de Implementación

### Fase 1: Backend Core (1-2 semanas)
1. Agregar campo `type` al schema de TransferOrder
2. Crear nuevos estados (pull_requested, pull_approved, etc.)
3. Implementar validaciones de workflow por tipo
4. Crear endpoints nuevos para modelo PULL
5. Agregar middleware de validación de sede (origen vs destino)
6. Implementar sistema de notificaciones

### Fase 2: Frontend - Segregación de UI (1-2 semanas)
7. Crear componente `TransferRequestDialog` (para sedes)
8. Modificar `TransferOrdersPanel` con tabs contextuales
9. Actualizar `TransferOrderDetail` con acciones contextuales
10. Implementar `ApprovalPanel` (para almacén central)
11. Crear `ReceiptPanel` (para sedes)
12. Agregar notificaciones en tiempo real

### Fase 3: Permisos y Seguridad (1 semana)
13. Crear nuevos permisos específicos
14. Implementar guards de validación de sede
15. Auditoría de acciones por usuario
16. Testing de seguridad

### Fase 4: Testing y Ajustes (1 semana)
17. Tests unitarios de validaciones
18. Tests de integración de workflows
19. Tests de permisos y segregación
20. UAT con usuarios reales

---

## ✅ Checklist de Validación

### Modelo PULL
- [ ] Sede destino puede crear solicitud de inventario
- [ ] Origen recibe notificación de solicitud
- [ ] Origen puede aprobar/rechazar con motivo
- [ ] Destino recibe notificación de decisión
- [ ] Destino NO puede editar después de enviar solicitud
- [ ] Origen NO puede ver solicitudes en borrador de destino
- [ ] Destino NO puede aprobar su propia solicitud
- [ ] Sistema valida disponibilidad de stock antes de aprobar

### Modelo PUSH
- [ ] Origen puede crear transferencia push
- [ ] Requiere aprobación interna antes de despachar
- [ ] Destino NO ve transferencias hasta que estén despachadas
- [ ] Destino recibe notificación cuando se despacha

### Recepciones
- [ ] Solo destino puede confirmar recepción
- [ ] Puede reportar discrepancias con fotos
- [ ] Sistema compara esperado vs recibido
- [ ] Origen recibe notificación de recepción
- [ ] Origen ve discrepancias reportadas

### Seguridad
- [ ] Permisos específicos por acción
- [ ] Guards validan sede origen/destino
- [ ] Logs de auditoría en cada transición
- [ ] No se puede omitir pasos del workflow
- [ ] Cancelaciones requieren motivo

---

## 📚 Referencias y Estándares

### Sistemas de Referencia
- **SAP WM (Warehouse Management)**: Transfer Orders con flujo push/pull
- **Oracle WMS**: Request for Transfer (RFT) + Transfer Order
- **NetSuite**: Transfer Order con aprobaciones multi-nivel
- **Odoo**: Stock Request + Internal Transfer

### Principios Aplicados
- **Separation of Concerns**: Cada sede solo controla sus acciones
- **Principle of Least Privilege**: Permisos mínimos necesarios
- **Audit Trail**: Trazabilidad completa de decisiones
- **Fail-Safe Defaults**: Estados seguros por defecto
- **Defense in Depth**: Validaciones en múltiples capas

---

Este documento proporciona una guía completa para implementar un sistema robusto de transferencias bidireccionales con segregación adecuada de responsabilidades.
