# 🗺️ Hotel Floor Plan – Ruta de Implementación

> **Objetivo**  
> Separar el “Mapa de Habitaciones” como módulo independiente enfocado en operación diaria (recepción/housekeeping), permitiendo organizar habitaciones por pisos/zonas y ejecutar acciones rápidas sin perder la capa analítica del tablero “Operaciones hotel”.

---

## 🎯 Metas Clave

1. **Visualización jerárquica** por piso/ala/torre con layout configurable y persistente por tenant.  
2. **Acciones instantáneas** sobre cada habitación (check-in walk-in, housekeeping, mantenimiento, bloqueos) con sincronización en tiempo real.  
3. **Integración nativa** con el motor de reservas/appointments y con la vista Operaciones para mantener coherencia de datos y métricas.  
4. **Experiencia receptiva** que funcione tanto en desktop (panel multitarea) como en tablet (turnos móviles).

---

## 🧱 Alcance Funcional

- Distribución de habitaciones por `floor` y `zone`, configurable mediante panel drag & drop.  
- Vista principal con columnas por piso y tarjetas (cards) de habitaciones mostrando estado, huésped actual, próximos check-in/out, tareas.  
- Filtros rápidos: disponibilidad, check-outs del día, housekeeping pendiente, VIP, habitaciones bloqueadas.  
- Acciones contextuales: check-in rápido, registrar check-out, asignar housekeeping, bloquear/activar mantenimiento, ver notas.  
- Indicadores visuales: colores por estado, badges por SLA (countdown), iconos de tipo de habitación.  
- WebSocket/event bus para reflejar cambios en vivo (minimiza refresh).  
- Deep links desde Operaciones → Mapa (ej. clic en KPI piso 3 abre piso 3) y viceversa.

---

## 🔄 Flujo de Fases

### Fase 0 – Descubrimiento & Diseño (3-4 días)
- Auditar datos actuales de `resources` (habitaciones) y mapear atributos existentes.  
- Definir estructura de layout (piso, zona, sortIndex, etiquetas).  
- Diseñar wireframes: vista piso completo, vista mobile, modal de configuración.  
- Alinear experiencia con soporte/recepción (UX research rápido).

### Fase 1 – Fundamentos de Datos & API (1 semana)
- Extender `resource.schema.ts`, DTOs y servicios para soportar `metadata.floor`, `metadata.zone`, `metadata.sortIndex`, `metadata.tags`.  
- Endpoints para listar habitaciones por piso/orden y actualizar layout en bloque.  
- Añadir seeds/herramientas para precargar pisos demo (hotel boutique, 3 niveles).  
- Ajustar `HospitalityOperationsDashboard` para consumir nuevos campos.

### Fase 2 – Configurador de Layout (1.5 semanas)
- Nueva vista de administración “Organizar habitaciones” (drag & drop).  
- Guardado atómico del layout (`PUT /resources/layout`).  
- Validaciones: duplicados, pisos vacíos, estado cross-tenant.  
- Feature flag `hospitality.floorplanBuilder`.

### Fase 3 – Módulo “Mapa de Habitaciones” (2 semanas)
- Crear ruta dedicada (`/hospitality/floor-plan`) con layout por columnas y componentes reutilizables.  
- Filtros, buscador y legendas.  
- Quick actions integradas con API existente (check-in, housekeeping, mantenimiento).  
- Notificaciones en vivo vía event listener (broadcast de operaciones).  
- Métricas rápidas (occupancy per floor) como encabezado opcional.

### Fase 4 – Integraciones y sinergias (1 semana)
- [x] Panel lateral con ficha detallada, quick actions extendidas (check-out, housekeeping listo, mantenimiento) y sincronización en vivo.  
- [x] Indicadores de housekeeping (badges) y countdown de check-in en cards/panel.  
- [x] Deep links con Operaciones (enlaces contextuales).  
- [x] Sincronizar tareas de housekeeping si existe módulo en roadmap (o placeholders).  
- [x] Logs/auditoría de cambios de estado para seguimiento (eventos cliente + session storage, pendiente capa backend).

> Las quick actions ahora consumen el endpoint `/todos` (tags `housekeeping`) para crear, reabrir y completar tareas reales vinculadas a cada habitación.

### Fase 5 – QA, Documentación y Rollout (3-4 días)
- Suite de pruebas (unitarias, e2e en Playwright) cubriendo layout y quick actions.  
- Documentación operativa para recepción/housekeeping.  
- Guía de despliegue + checklist de migraciones (script de backfill).  
- Lanzamiento gradual con feature flag por tenant.

---

## 📐 Cambios Técnicos Clave

| Capa | Cambios |
|------|---------|
| **Backend** | Nuevos campos en `ResourceSchema`, endpoints para layout, broadcast en sockets/eventos. Validaciones en `ResourcesService`. |
| **Frontend Admin** | Nuevo módulo `floor-plan`, componentes reutilizables (RoomCard, FloorColumn), hooks (`useHotelFloorPlan`). Configurador en sección de ajustes. |
| **Infra/DevOps** | Actualizar seeds, scripts de backfill, monitoreo de evento `hospitality-floorplan-sync`. Feature flags (`tenant.enabledModules`). |
| **Datos/Analytics** | Ajustar queries para métricas por piso (occupation, housekeeping load). |

---

## 🪜 Primeros Entregables

1. **[Actual] Fase 1 – Fundamentos de Datos & API**  
   - Agregar campos `floor`, `zone`, `sortIndex` al modelo `Resource` y exponerlos en DTOs.  
   - Endpoint/servicio para actualizar layout masivo (lista ordenada por piso).  
   - Actualizar seeds demo con valores de piso.  
   - Ajustar consumo en `HospitalityOperationsDashboard` y listener live.

2. Fase 2 – Configurador drag & drop en Admin.  
3. Fase 3 – Nueva vista Mapa con agrupación por piso.  
4. … (continúa con fases descritas).

---

## ✅ Criterios de Éxito

- Recepcionista puede cambiar de piso y ver distribución organizada en <2 clics.  
- Acciones más frecuentes (check-in, housekeeping) toman ≤5 segundos por habitación.  
- Datos sincronizados con Operaciones sin discrepancias mayores a 1 refresh.  
- Configuración de layout sobreviviente a despliegues y multi-usuario.  
- Feedback positivo en piloto (≥80% satisfacción operacional).

---

> **Siguiente paso inmediato:** Implementar la Fase 1 (Fundamentos de Datos & API). Abajo comenzamos con el primer punto (extensión del modelo `Resource`).
