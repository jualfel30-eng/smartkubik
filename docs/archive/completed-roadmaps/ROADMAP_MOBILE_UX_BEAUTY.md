# Roadmap Mobile UX/UI — SmartKubik (Beauty-first)

> **Objetivo**: Transformar SmartKubik de un ERP responsive a un producto mobile-first, usando el vertical **beauty** (peluquerías, barberías, salones de uñas) como vehículo de validación.
>
> **Principio rector**: El dueño del negocio debe poder operar 100% desde el móvil con fluidez equivalente a WhatsApp/Instagram.
>
> **Fecha de creación**: 2026-04-14
> **Estado**: Fase 1 en curso

---

## 0. Principios de diseño (adoptar antes de tocar pantallas)

- [ ] **Thumb-zone first** — acciones primarias en el tercio inferior
- [ ] **One primary action per screen**
- [ ] **Context over navigation** — acciones donde el usuario ya está
- [ ] **Progressive disclosure** — 3 campos visibles, resto en "más opciones"
- [ ] **Optimistic UI + offline-first**
- [ ] **Cards > Tables** en mobile (nunca scroll horizontal)
- [ ] **Gestures first-class** (swipe, pull-to-refresh, long-press)
- [ ] **Smart defaults siempre**
- [ ] **Touch targets ≥ 44x44px**
- [ ] **Safe-area insets** en sticky/fixed

Documentar en `food-inventory-admin/docs/MOBILE_DESIGN_PRINCIPLES.md`.

---

## Fase 1 — Foundations (Sprint 1-2)

**Meta**: Habilitar infraestructura mobile sin cambiar features. PWA instalable + shell mobile navegable.

### 1.1 PWA base
- [x] Crear `public/manifest.webmanifest` con nombre, íconos, theme_color, display=standalone, start_url
- [ ] Generar íconos dedicados (192, 512, maskable) — hoy usa favicon existente como placeholder, **tarea de diseño pendiente**
- [x] Agregar meta tags iOS: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`
- [x] Agregar `theme-color` meta tag (light + dark)
- [ ] Crear splash screens iOS (opcional Fase 1, backlog)
- [x] Configurar `vite.config.js` con `vite-plugin-pwa` (Workbox)
- [x] Service worker: precache shell + runtime cache `/api/*` GET (NetworkFirst), imágenes (CacheFirst), fuentes Google (CacheFirst)
- [x] Banner "Instalar en pantalla de inicio" (A2HS prompt custom con hint iOS)
- [ ] Validar con Lighthouse mobile ≥ 90 — pendiente de deploy

### 1.2 Design tokens mobile
- [x] Crear `src/styles/mobile-tokens.css` (spacing, type scale, z-index, safe-areas, animaciones)
- [x] Definir touch target mínimo como utility (`.tap-target`)
- [x] Definir safe-area helpers (`.safe-bottom`, `.safe-top`, `.safe-x`)
- [x] Documentar en `MOBILE_DESIGN_PRINCIPLES.md`

### 1.3 Shell mobile (navegación)
- [x] Crear `src/components/mobile/MobileBottomNav.jsx` con 5 tabs (Hoy, Agenda, FAB, Clientes, Más)
- [x] Crear `src/components/mobile/MobileFAB.jsx` (Floating Action Button central)
- [x] Crear `src/components/mobile/MobileActionSheet.jsx` (bottom sheet para acciones del FAB)
- [x] Crear `src/components/mobile/MobileTopBar.jsx` — reemplaza el header actual en mobile, colapsa en scroll
- [x] Wire en `TenantLayout` (App.jsx): renderizar BottomNav vía `md:hidden`
- [x] Ajustar padding-bottom del content (`mobile-content-pad`) para que BottomNav no tape contenido
- [x] Ruta `/mas` = `MobileMoreMenu` con módulos secundarios

### 1.4 Detección de vertical
- [x] Hook `useMobileVertical()` que expone `isBeauty`, `isFoodService`, `isRetail`, `isServices`
- [x] BottomNav y FAB renderizan tabs/acciones distintas según vertical (beauty vs default)

**Criterios de cierre Fase 1**
- [ ] App instalable en iPhone y Android desde el navegador
- [ ] En mobile, el usuario ve bottom nav con 5 tabs y un FAB
- [ ] Lighthouse PWA score ≥ 90
- [ ] No regresiones en desktop

---

## Fase 2 — Agenda Mobile (Sprint 3-4)

**Meta**: Rediseñar `AppointmentsManagement` para mobile. Esta es la pantalla que más abre un salón.

### 2.1 Vista día mobile
- [x] Crear `src/components/mobile/appointments/MobileDayAgenda.jsx`
- [x] Header sticky con fecha + navegación días (prev/next/today/refresh)
- [x] Bloques de cita = cards táctiles agrupadas por hora (NO tabla)
- [x] Indicador visual "en curso" (ring emerald animado)
- [x] Tap en estado vacío → abre "Crear cita rápida"
- [x] Swipe horizontal entre días (touch gesture con direction lock)
- [ ] Columnas por recurso/empleado con swipe horizontal — pendiente (v2 del MobileDayAgenda)
- [ ] Línea de tiempo actual "ahora" visible

### 2.2 Card de cita con swipe-actions
- [x] `MobileAppointmentCard.jsx` con `framer-motion` drag-x
- [x] Swipe-left revela: Completar (✓), Cobrar ($), Cancelar (✕)
- [x] Tap = abre bottom sheet con detalle completo
- [ ] Long-press = drag para mover/reagendar — requiere librería DnD (Fase 2.5)

### 2.3 Detalle de cita (bottom sheet)
- [x] `MobileAppointmentDetailSheet.jsx` con estado, servicio, profesional, total, notas
- [x] Acceso rápido llamar (tel:) + WhatsApp (wa.me)
- [x] Botones: Iniciar, Completar, Cobrar (stub Fase 3), Cancelar
- [x] Snap points 40% / 90% — framer-motion SnapSheet con drag y spring snap

### 2.4 Crear cita rápida (1 pantalla)
- [x] `MobileQuickCreateAppointment.jsx` unipantalla
- [x] Cliente: búsqueda async con debounce 300ms + opción "Crear nuevo" inline
- [x] Servicio: chips con top 12 servicios
- [x] Hora: chips de sugerencias rápidas (ahora / +1h / +2h / +3h) + datetime-local
- [x] Recurso: chips (incluye "Sin asignar")
- [x] Duración + hora fin auto-calculadas por servicio
- [x] Botón Guardar sticky-bottom con `safe-bottom`
- [x] Toast post-guardar con acción "Enviar recordatorio WhatsApp"
- [ ] Priorizar clientes "recientes" / "hoy" en el ranking — pendiente

### 2.5 Otras vistas y gestos
- [x] Vista semana compacta (MobileWeekStrip: 7 días con dots de ocupación)
- [x] Vista agenda-list (MobileAgendaList: próximas citas multi-día con toggle día/lista)
- [x] Filtros en bottom sheet (status, recurso/profesional)
- [ ] Drag & drop de card sobre slot para reagendar
- [x] Pull-to-refresh nativo en la agenda (touch gesture)

### 2.6 Integración
- [x] `AppointmentsRouteGate` decide desktop vs mobile según `isBeauty && isMobile`
- [x] FAB "Nueva cita" enlaza a `/appointments?new=1` y abre quick-create

**Criterios de cierre Fase 2**
- [ ] Crear cita en ≤ 30s en mobile — medir
- [ ] Swipe-actions funcionan sin lag en iPhone SE / Android mid-range — probar
- [ ] Drag & drop reagenda una cita correctamente — pendiente
- [ ] Validar endpoint POST para beauty (actualmente la creación puede requerir ajuste backend)

---

## Fase 3 — POS Móvil + Home "Hoy" (Sprint 5-6)

### 3.1 Home "Hoy"
- [x] Crear `src/components/mobile/home/TodayDashboard.jsx`
- [x] Hero card: ingresos del día + sparkline semanal
- [x] Lista "Próximas 4 citas" con acción rápida Iniciar/Cobrar
- [x] Alertas (citas sin confirmar, caja no abierta)
- [x] Acceso rápido a Agenda, Caja, Servicios, Clientes
- [x] Greeting personalizado (buen día/tarde/noche + nombre)
- [x] Skeleton loader mientras carga
- [ ] Widget "Walk-ins esperando" — pendiente (requiere check-in Fase 4)
- [x] Route gate: en mobile muestra TodayDashboard encima del DashboardView desktop (`md:hidden`)

### 3.2 POS móvil desde la cita
- [x] Crear `src/components/mobile/pos/MobilePOS.jsx`
- [x] Teclado numérico grande custom (NumPad)
- [x] Total precargado del appointment, editable
- [x] Tip picker (0% / 10% / 15% / 20%) con cálculo automático
- [x] Métodos de pago: chips con todos los métodos del tenant (fallback a defaults)
- [x] Campo referencia opcional
- [x] Muestra equivalente en VES cuando método VES + exchange rate disponible
- [x] Botón Cobrar en swipe-action de AppointmentCard → abre MobilePOS
- [x] Botón Cobrar en MobileAppointmentDetailSheet → abre MobilePOS
- [x] Pago mixto multi-línea — toggle Un método/Pago mixto con balance indicator
- [x] Post-cobro: toast con acción "Enviar recibo WhatsApp" (wa.me prefilled)

### 3.3 Push notifications (Web Push)
- [x] Instalar `web-push` en backend
- [x] Generar VAPID keys y agregar a `.env` y `.env.example`
- [x] `WebPushService`: saveSubscription, removeSubscription, sendToUser, sendToTenant
- [x] Campo `pushSubscriptions[]` en User schema
- [x] `GET /notification-center/push/vapid-key` — VAPID public key
- [x] `POST /notification-center/push/subscribe` — registra subscription
- [x] `POST /notification-center/push/unsubscribe` — elimina subscription
- [x] Hook frontend `use-push-notifications.js`
- [x] `MobilePushPrompt.jsx` — prompt con contexto, no intrusivo, dismiss 30 días
- [x] Integrado en TodayDashboard (aparece al final del contenido)
- [x] Disparar push desde beauty-bookings al crear reserva nueva
- [x] Disparar push al confirmar cita
- [ ] Casos de uso walk-in / check-in — Fase 4

**Criterios de cierre Fase 3**
- [ ] Cobrar desde cita en ≤ 15s — medir en device real
- [ ] Push notification llega en background en Android Chrome — probar tras deploy

---

## Fase 4 — Clientes + Diferenciadores Beauty (Sprint 7-8)

### 4.1 Clientes mobile
- [ ] Lista de clientes en cards (avatar, nombre, última visita, LTV)
- [ ] Swipe-actions: llamar, WhatsApp, nueva cita
- [ ] Búsqueda full-text con debounce
- [ ] Virtualización (`@tanstack/react-virtual`)

### 4.2 Perfil cliente (beauty-specific)
- [ ] Timeline visual de servicios (no tabla)
- [ ] Campo "Preferencias / Fórmulas" (tinte, degradé, largo, etc.)
- [ ] Fotos de referencia (antes/después)
- [ ] Historial de productos consumidos
- [ ] Tags/notas rápidas

### 4.3 Check-in cliente por QR
- [ ] Generar QR único por tenant/ubicación
- [ ] Endpoint público `/storefront/{tenant}/checkin?code=xxx`
- [ ] Cliente escanea → marca cita del día como "llegó"
- [ ] Push al dueño/empleado
- [ ] Fallback: check-in manual desde agenda

### 4.4 Offline-first (citas del día)
- [ ] IndexedDB con Dexie para citas del día
- [ ] Queue de mutaciones pendientes (crear, editar, cobrar)
- [ ] Sync al reconectar
- [ ] Indicador visual de "offline" en UI

**Criterios de cierre Fase 4**
- [ ] Funciona en avión (citas del día + cobrar en efectivo) con sync al volver
- [ ] Perfil cliente con preferencias visuales operativo

---

## Fase 5 — Polish + Extender (Sprint 9-10)

### 5.1 Performance
- [ ] Virtualización en todas las listas >50 items
- [ ] Bundle splitting agresivo por vertical (lazy load de módulos)
- [ ] Skeleton states en todas las vistas de carga
- [ ] Imágenes con `loading="lazy"` y formatos modernos (AVIF/WebP)
- [ ] Web Vitals CLS <0.1, LCP <2.5s, INP <200ms

### 5.2 Servicios / Recursos (beauty)
- [ ] Cards para Services (no tabla) con imagen, duración, precio
- [ ] Drag-and-drop para reordenar favoritos
- [ ] Edit inline

### 5.3 Medición
- [ ] Integrar Hotjar o Microsoft Clarity (solo en mobile)
- [ ] Eventos custom: `appointment_created`, `payment_completed`, `checkin_scanned`
- [ ] Dashboard de métricas mobile

### 5.4 Portabilidad a otras verticales
- [ ] Identificar patrones reutilizables (bottom nav, FAB, cards, swipe)
- [ ] Extract a `src/components/mobile/primitives/`
- [ ] Template de "vertical mobile" documentado

**Criterios de cierre Fase 5**
- [ ] Mobile DAU / Total DAU ≥ 60% en tenants beauty
- [ ] NPS mobile ≥ NPS desktop
- [ ] D30 retention mejora vs baseline

---

## Backlog / Ideas futuras

- [ ] Apple Wallet / Google Wallet passes para tarjetas de fidelidad
- [ ] Widget iOS/Android con ingresos del día
- [ ] Shortcuts Siri / Google Assistant ("SmartKubik próxima cita")
- [ ] Modo tablet (iPad en recepción)
- [ ] Reconocimiento facial del cliente al entrar (premium)
- [ ] Voice commands ("agenda a María a las 3pm")

---

## Métricas objetivo

| Métrica | Baseline (est.) | Target 6 meses |
|---|---|---|
| Time-to-first-appointment (mobile) | ~120s | <30s |
| Mobile DAU / Total DAU (beauty) | ~15% | >60% |
| Task success rate cobro mobile | N/A | >95% |
| D30 retention tenants beauty | TBD | +20% |
| Lighthouse PWA | ~40 | ≥90 |
| NPS mobile | TBD | ≥ NPS desktop |

---

## Referencias clave (archivos a tocar)

- Shell layout: [food-inventory-admin/src/App.jsx](food-inventory-admin/src/App.jsx) (líneas 1060-1140 del `TenantLayout`)
- Agenda: [food-inventory-admin/src/components/AppointmentsManagement.jsx](food-inventory-admin/src/components/AppointmentsManagement.jsx) (3.432 líneas — refactor mayor en Fase 2)
- Servicios: [food-inventory-admin/src/components/ServicesManagement.jsx](food-inventory-admin/src/components/ServicesManagement.jsx)
- Recursos: [food-inventory-admin/src/components/ResourcesManagement.jsx](food-inventory-admin/src/components/ResourcesManagement.jsx)
- Caja: [food-inventory-admin/src/pages/CashRegisterPage.jsx](food-inventory-admin/src/pages/CashRegisterPage.jsx)
- Index HTML: [food-inventory-admin/index.html](food-inventory-admin/index.html)
- Vite config: [food-inventory-admin/vite.config.js](food-inventory-admin/vite.config.js)

---

## Cómo continuar este roadmap

Cada fase tiene checklists granulares. Si otro agente (Gemini, Claude, o humano) retoma:

1. Buscar el último checkbox marcado `[x]` en este archivo
2. Continuar con el siguiente `[ ]`
3. Al completar cada ítem, marcar `[x]` y commit
4. Al cerrar una fase, validar "Criterios de cierre" antes de avanzar
5. Mantener memoria del proyecto actualizada en `MEMORY.md` con hallazgos/decisiones

**Convenciones**:
- Todo componente mobile nuevo vive en `src/components/mobile/`
- Prefijo `Mobile*` para componentes específicos móvil
- Feature flag `tenant.vertical === 'beauty'` para habilitar flujos beauty-first
- No tocar desktop salvo que haya bug (Fase 1-4). Polish desktop en Fase 5+

---

*Owner inicial: Juan Alfredo Santamaría · Documento vivo, actualizar tras cada sprint.*
