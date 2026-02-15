# Doc - Modulo Calendario y Agenda

> **Version cubierta:** v1.03  
> **Ubicacion en la app:** Menu lateral `Operaciones` -> `Calendario` (componente `CalendarView`)  
> **APIs relacionadas:** `/events`, `/events/:id`, `/todos`, `/todos/:id`  
> **Permisos requeridos:**  
> - `events_read` para visualizar agenda  
> - `events_create` / `events_update` / `events_delete` para gestionar eventos  
> - `todos_read` / `todos_create` / `todos_update` / `todos_delete` para Tareas

## 1. Proposito del modulo
Centralizar la agenda operativa del tenant combinando eventos de negocio (pagos, compras, inventario) con tareas pendientes (to-dos) en una sola vista. Facilita anticipar vencimientos, entregar productos a tiempo y coordinar equipo.

## 2. Vista principal (`CalendarView`)
- **Cabecera adaptable:** en escritorio muestra barra de controles de FullCalendar; en mobile se renderiza titulo+botones (Hoy, prev/next, Mes/Semana/Dia).  
- **Calendario interactivo:**  
  - Vistas `dayGridMonth`, `timeGridWeek`, `timeGridDay`.  
  - Seleccion de rango o click crea evento (abre `EventDialog`).  
  - Drag & drop para cambiar fechas (evento llama `PATCH /events/:id`).  
  - Localizado en español con botones personalizados.  
- **Integracion con TodoList:** lista de tareas se muestra a la derecha (en layout responsive) y sus tareas con fecha se proyectan como eventos `📋` en el calendario.  
- **Carga dinamica:** `datesSet` obtiene eventos según rango visible (`/events?start&end`).  
- **Refresco de titulo/vista:** en mobile se actualiza estado `calendarTitle` y `activeView`.  
- **Botones navegacion:** Prev/Siguiente/Hoy modifican la vista y disparan fetch.

## 3. Dialogo de eventos (`EventDialog.jsx`)
- **Creacion:** campos titulo, descripcion, fecha inicio/fin, allDay, color.  
- **Edicion:** se abre al hacer click en un evento (rellena datos).  
- **Acciones:** Guardar (POST/PATCH) y Eliminar (DELETE).  
- **Sincronizacion:** tras guardar/eliminar, recalcula agenda y (cuando aplica) actualiza To-dos (`refetchTodos`).  
- **Soporta eventos generados automaticamente** (por compras/inventario); se pueden editar o eliminar si el usuario tiene permisos.

## 4. Lista de tareas (`TodoList.jsx`)
- Vista en tarjeta con filtros por etiquetas, creacion rapida, edicion y eliminación.  
- **Campos:** titulo, fecha de vencimiento, etiquetas (predefinidas + custom), prioridad (baja/media/alta).  
- **Etiquetas custom:** almacenadas en `localStorage`, se suman a `TAG_OPTIONS`.  
- **Acciones:**  
  - Marcar completado (PATCH /todos/:id).  
  - Crear/editar abre dialogo con calendario.  
  - Eliminar remueve de la lista y, si tenía evento asociado, el backend lo borra (ver TodosService).  
- **Sincronizacion con calendario:**  
  - Tareas con `dueDate` se representan como eventos `allDay` en el calendario.  
  - Al completar tarea, si existe `relatedEventId`, el backend elimina evento asociado.

## 5. Hooks y servicios
- `useTodos` maneja ciclo de vida de tareas (`GET /todos`, `POST`, `PATCH`, `DELETE`).  
- `useMediaQuery` ajusta la UI segun tamaño de pantalla.  
- Backend `EventsService` enlaza eventos con to-dos y genera entradas desde compras o alertas de inventario.  
- `TodosService` elimina eventos vinculados al marcar tarea como completa.

## 6. Automatizaciones disponibles
- **Compras con fecha de pago:** `createFromPurchase` genera evento y tarea (tags `compras`, `pagos`) para la orden.  
- **Alertas de inventario:** crea evento + tarea con prioridad según urgencia (`low_stock` vs `expiring_soon`).  
- Sistema de prioridades automáticas según días restantes (`calculatePriority`).  
- Eliminacion cascada: borrar evento limpia tareas relacionadas y viceversa.

## 7. Buenas practicas
- Mantener colores/etiquetas consistentes para identificar responsabilidades.  
- Revisar semanalmente la vista `timeGridWeek` para planificar tareas en equipo.  
- Al completar una tarea generada automaticamente, confirmar que el evento desaparecio (sincronizacion correcta).  
- Usar notas detalladas en eventos para que el equipo entienda contextos (pagos, mantenimiento, etc.).  
- Si un evento cambia de fecha en el calendario, validar impacto en la tarea (prioridad recalculada).  
- Ante fallas de sincronizacion, usar `refetchTodos` y `fetchEvents` manualmente (boton Actualizar).

## 8. Recursos vinculados
- UI: `CalendarView.jsx`, `EventDialog.jsx`, `TodoList.jsx`.  
- Hooks: `use-todos.js`, `use-media-query.js`.  
- Backend: `events.service.ts`, `todos.service.ts`, `event.schema.ts`, `todo.schema.ts`.  
- Documentos relacionados: `DOC-MODULO-PAGOS.md` (pago recurrente -> eventos), `DOC-MODULO-COMPRAS.md`, `DOC-FLUJO-INVENTARIOS.md`, `DOC-FLUJO-VENTAS-INVENTARIO-PAGOS-CONTABILIDAD.md`.

