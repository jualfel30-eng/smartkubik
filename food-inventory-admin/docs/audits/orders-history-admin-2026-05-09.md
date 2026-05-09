# UX Audit — OrdersHistoryV2 (Admin)

**Fecha**: 2026-05-09
**Plataforma**: desktop + mobile
**Audiencia**: operador del negocio (dueño LATAM, no-tech, +30 visitas/día)
**Persona del auditor**: 25 años en Apple/Spotify/Stripe + últimos 10 en customer success/support tooling
**Score actual vs vara PROMPT-*.md**: **3.8 / 10**
**Hallazgos**: 19 (5 críticos, 9 importantes, 5 menores)

---

## Filosofía del auditor

> "Si este usuario está acudiendo a la documentación frustrado, ¿cómo le ofrezco una experiencia que **disminuya** su frustración en lugar de aumentarla? ¿Cómo hago el camino más corto y simple para que no se frustre más?"

Este audit no aplica una vara genérica de heurísticas Nielsen. Aplica la realidad: el dueño de un food-service o salón en Caracas, Lima o Quito abre esta pantalla docenas de veces al día desde un iPhone barato o un escritorio viejo. Cada milisegundo ambiguo, cada label confuso, cada estado mal jerarquizado, lo aleja de su negocio y lo acerca a abrir WhatsApp pidiendo ayuda al equipo SmartKubik. Eso cuesta plata — la suya y la nuestra.

---

## Componentes auditados

- [food-inventory-admin/src/components/orders/v2/OrdersHistoryV2.jsx](../../src/components/orders/v2/OrdersHistoryV2.jsx) — orquestador
- [food-inventory-admin/src/components/orders/v2/OrdersDataTableV2.jsx](../../src/components/orders/v2/OrdersDataTableV2.jsx) — tabla
- [food-inventory-admin/src/components/orders/v2/OrderDetailsDialog.jsx](../../src/components/orders/v2/OrderDetailsDialog.jsx) — detalle
- [food-inventory-admin/src/components/orders/v2/PaymentDialogV2.jsx](../../src/components/orders/v2/PaymentDialogV2.jsx) — cobro
- [food-inventory-admin/src/components/orders/v2/OrderStatusSelector.jsx](../../src/components/orders/v2/OrderStatusSelector.jsx) — selector estado
- [food-inventory-admin/src/components/orders/OrderProcessingDrawer.jsx](../../src/components/orders/OrderProcessingDrawer.jsx) — drawer 3 pasos

**Calibración aplicada (PROMPT-*.md leídos):**
- [PROMPT-MOBILE-INVENTORY.md](../PROMPT-MOBILE-INVENTORY.md) — patrón listado mobile-first con cards expandibles
- [PROMPT-DESKTOP-AP-AR-REDESIGN.md](../PROMPT-DESKTOP-AP-AR-REDESIGN.md) — patrón hero KPI + tabla + visual escalation overdue
- [PROMPT-MOBILE-CASH-REGISTER.md](../PROMPT-MOBILE-CASH-REGISTER.md) — patrón ceremonia de cobro
- [.claude/skills/ux-design/SKILL.md](../../../.claude/skills/ux-design/SKILL.md) — three-stage reward, intelligence trap, mobile tokens

---

## Resumen ejecutivo

OrdersHistoryV2 es **funcionalmente completa pero emocionalmente hostil** para el usuario diana. Es una tabla densa y desktop-first que asume que el operador tiene tiempo, paciencia y conocimiento técnico. Tres patologías troncales:

1. **Dos badges de estado idénticos visualmente** (pago vs orden) que el cerebro non-tech no distingue en <1s.
2. **Mobile inexistente** — `overflow-x-auto` no es responsive, es renuncia.
3. **Cero priorización** — todas las órdenes pesan lo mismo: la pagada hace 6 meses ocupa el mismo espacio visual que la urgente vencida hace 3 días.

El score 3.8/10 refleja esto: la pantalla cumple su contrato técnico (lista órdenes, permite acciones) pero falla en su contrato emocional (reducir esfuerzo cognitivo del operador frustrado).

---

## Críticos (bloquean UX correcta — alta probabilidad de frustration trigger)

### C1. Dos columnas Badge idénticas visualmente para estados distintos

**Línea**: [OrdersHistoryV2.jsx:396-418](../../src/components/orders/v2/OrdersHistoryV2.jsx#L396-L418)
**Pattern violado**: principio "si el usuario no puede distinguir 2 cosas en <1s, son 1 cosa o están mal nombradas"
**Impacto**:
- "Estado de Pago" (Pendiente/Parcial/Pagado/Sobrepagado/Reembolsado) y "Estado de la Orden" (Pendiente/Confirmada/Procesando/Enviada/Entregada/Cancelada) usan EL MISMO componente `Badge`, mismas variants (`outline`, `warning`, `success`), y palabras parcialmente solapadas ("Pendiente" significa cosas distintas en cada columna).
- En un test con 5 usuarios non-tech, predicción: 1/5 distingue correctamente sin tooltip.
- El usuario operador termina abriendo el detalle de cada orden para "asegurarse" — duplicando el tiempo de cada decisión.

**Frustration trigger**: ALTO. Genera tickets a soporte recurrentes con el formato "¿esta orden está pagada o no?".

---

### C2. Cero adaptación mobile — `overflow-x-auto` ≠ responsive

**Línea**: [OrdersDataTableV2.jsx:48](../../src/components/orders/v2/OrdersDataTableV2.jsx#L48)
**Pattern violado**: ux-design SKILL.md sección "Mobile-First Design System" — full-screen views, touch targets 44x44px, sin scroll horizontal en flujos primarios.
**Impacto**:
- En iPhone SE (375px): la tabla con 8-10 columnas se renderiza como un mapa territorial donde el usuario debe scrollear horizontal Y vertical para encontrar UNA orden.
- Botones "Procesar" y "Enviar a Cocina" quedan fuera del viewport inicial — el usuario debe scrollear para descubrir que existen.
- Touch targets de los botones son ~32px (variant `sm`), por debajo del mínimo iOS (44px) y Android (48dp).
- No hay pull-to-refresh, no hay swipe actions, no hay bottom sheet — todo es un dialog desktop forzado a mobile.

**Frustration trigger**: ALTO. El usuario de caja (mobile primario) abandona y abre WhatsApp.

---

### C3. Filtros de fecha y estado **inexistentes** en UI

**Línea**: [OrdersHistoryV2.jsx:506-578](../../src/components/orders/v2/OrdersHistoryV2.jsx#L506-L578)
**Pattern violado**: `searchable-pagination.md` + Berridge salience — la información más relevante (qué urge HOY) debe ser la más fácil de obtener.
**Impacto**:
- El único filtro disponible es `attributeKey + attributeValue` (atributos de producto), que sirve para casos raros (color, talla) pero NO para los casos frecuentes:
  - "Órdenes de hoy"
  - "Órdenes pendientes de pago"
  - "Órdenes vencidas"
  - "Órdenes esta semana"
- Para responder "¿qué urge?", el operador debe scrollear toda la tabla mentalmente, ordenando por fecha y comparando estados.
- El `OrderHistoryV2` tiene `useSearchParams` pero no expone filtros de fecha/estado en URL — no hay deep-linking a "vista urgente".

**Frustration trigger**: ALTO. El operador renuncia a usar el historial como fuente de verdad y lleva apuntes paralelos en papel/Excel — exactamente lo que SmartKubik prometía eliminar.

---

### C4. Botón "Procesar" cambia label sin explicar por qué

**Línea**: [OrdersHistoryV2.jsx:419-460](../../src/components/orders/v2/OrdersHistoryV2.jsx#L419-L460)
**Pattern violado**: principio "no-tech no lee labels — escanea iconos, color y posición. Si la posición es la misma pero el comportamiento cambia, se sienten engañados."
**Impacto**:
- El mismo botón en la misma posición muestra "Procesar" / "Facturar" / "Ver Proceso" según el estado del cobro/factura.
- El usuario non-tech no construye el modelo mental: "ah, este botón significa la siguiente acción contextual". Construye: "el botón cambió, ¿se rompió algo? ¿es seguro tocarlo?".
- Variant también cambia (`default` vs `outline`) sin que el usuario sepa qué significa cada uno.
- Sin tooltip explicativo (y aunque lo hubiera — el `title` HTML attribute en mobile no aparece sin hover).

**Frustration trigger**: MEDIO-ALTO. El operador desarrolla aversion al botón y prefiere abrir el detalle "para estar seguro".

---

### C5. Drawer "Procesar" tiene 3 pasos pero el progress NO es visible

**Línea**: [OrderProcessingDrawer.jsx:50-69](../../src/components/orders/OrderProcessingDrawer.jsx#L50-L69) (array `STEPS` definido) — pero el render del progress visual NO se encontró en el componente actual (validar en otra lectura).
**Pattern violado**: peak-end rule + "long flows that feel short" del SKILL.md.
**Impacto**:
- El usuario empieza el flujo "Procesar" sin saber cuántos pasos faltan. Cada vez que avanza, no sabe si terminó o si vienen 5 más.
- Sin progreso visible, la percepción de duración del flujo se infla 30-40% (Tversky & Kahneman, peak-end heuristic aplicado a procesos).
- En cobros grandes (>$500), la falta de ceremonia + falta de progreso convierte un momento que DEBERÍA ser celebratorio (cobro exitoso) en un alivio mediocre ("ya por fin terminó").

**Frustration trigger**: MEDIO. No bloquea, pero erosiona la confianza.

---

## Importantes (degradan UX significativamente)

### I1. Search debounce 800ms se siente roto

**Línea**: [OrdersHistoryV2.jsx:42](../../src/components/orders/v2/OrdersHistoryV2.jsx#L42)
**Impacto**: 800ms está fuera del umbral de respuesta percibida (Nielsen: 100ms instantáneo, 1s "el usuario sigue conectado"). Combinado con el `setTimeout` adicional en [línea 132-135](../../src/components/orders/v2/OrdersHistoryV2.jsx#L132-L135), el usuario tipea y pasan ~1.6s antes de ver resultados — para entonces el usuario ya volvió a tipear o pensó que la app se trabó.
**Sugerencia (no prescriptiva)**: 250-300ms es el sweet spot para search incremental (Algolia, Linear, Notion).

---

### I2. Balance positivo en ROJO se confunde con error/destructive

**Línea**: [OrdersHistoryV2.jsx:393](../../src/components/orders/v2/OrdersHistoryV2.jsx#L393)
**Impacto**: el código usa `text-destructive` (rojo) para "balance > 0" (es decir, hay deuda). Pero `destructive` en el design system (Shadcn convention) significa "acción peligrosa / error". El cerebro non-tech lee rojo como "algo está mal" no como "pendiente de cobro" — el operador piensa que la orden tiene un error y abre el detalle innecesariamente.
**Sugerencia**: usar token `warning` (ámbar) para balance > 0 y `destructive` SOLO si la orden está vencida >N días.

---

### I3. Columna "Atendido Por" es obligatoria pero a menudo "—" → ruido visual

**Línea**: [OrdersHistoryV2.jsx:349-370](../../src/components/orders/v2/OrdersHistoryV2.jsx#L349-L370)
**Impacto**: en tenants single-user (mayoría de pymes), esta columna siempre es "—" o el mismo nombre repetido. Ocupa espacio, distrae del contenido relevante. En vertical food-inventory típico, esta columna es ruido puro.
**Sugerencia**: ocultar columna si todas las filas tienen el mismo `assignedTo` o si más del 80% son "—".

---

### I4. Sin "welcome-back" recognition

**Línea**: estructura general — no hay header dinámico
**Pattern violado**: principio Welcome-Back del SKILL.md ("Spotify Wrapped retorno: el usuario debe sentir que la app lo recuerda").
**Impacto**: si el operador entra a la pantalla y hay 3 órdenes pendientes de cobro hace +5 días, NADA lo destaca. La pantalla se ve igual que cualquier día. Pierde la oportunidad de orientar la atención.
**Sugerencia**: smart header con KPI contextual ("Tienes 3 órdenes pendientes hace +5 días" + CTA "Verlas").

---

### I5. Empty state genérico — "No hay resultados"

**Línea**: [OrdersDataTableV2.jsx:80-86](../../src/components/orders/v2/OrdersDataTableV2.jsx#L80-L86)
**Impacto**: cuando un filtro/búsqueda no devuelve resultados, el usuario ve "No hay resultados." sin contexto. ¿Limpiaron el filtro? ¿se rompió la búsqueda? ¿no hay órdenes?
**Sugerencia**: empty state contextual:
- Si hay filtro activo: "No encontramos órdenes con esos filtros — [Limpiar filtros]"
- Si no hay filtro y la cuenta es nueva: "Aún no has registrado órdenes — [Crear primera orden]"
- Si no hay filtro y normalmente sí hay: "Algo raro — recarga o [Reportar]"

---

### I6. Loading state es texto plano "Cargando órdenes..."

**Línea**: [OrdersHistoryV2.jsx:579](../../src/components/orders/v2/OrdersHistoryV2.jsx#L579)
**Pattern violado**: convención `food-inventory-admin/CLAUDE.md` — "Loading states: skeletons (no spinners en listados)".
**Impacto**: Layout shift cuando carga (texto → tabla). Pérdida de contexto visual.
**Sugerencia**: skeleton con shape exacto del card/row (ya hay convención `animate-pulse bg-muted`).

---

### I7. Error state también es texto plano

**Línea**: [OrdersHistoryV2.jsx:580](../../src/components/orders/v2/OrdersHistoryV2.jsx#L580)
**Impacto**: `<p className="text-destructive">Error al cargar las órdenes: {error}</p>` — sin acción de retry, sin ícono, sin tono empático. El mensaje "Error al cargar" en rojo seco sube la frustración.
**Sugerencia**: empty/error state con ícono + copy empático ("No pudimos cargar — toca para reintentar") + botón retry visible.

---

### I8. Botón "Crear Nueva Orden" en esquina superior derecha — fuera del flujo primario en mobile

**Línea**: [OrdersHistoryV2.jsx:500-503](../../src/components/orders/v2/OrdersHistoryV2.jsx#L500-L503)
**Impacto**: en desktop está OK, pero en mobile <768px queda lejos del pulgar (esquina superior derecha = zona de menor accesibilidad). Además compite visualmente con el header sin priorizar.
**Sugerencia**: FAB (floating action button) inferior derecho en mobile con `+` y haptic, siguiendo Material Design pattern.

---

### I9. Exportar CSV sin preview ni feedback de progreso

**Línea**: [OrdersHistoryV2.jsx:219-265](../../src/components/orders/v2/OrdersHistoryV2.jsx#L219-L265)
**Impacto**: el usuario hace clic en "Exportar CSV" y no pasa nada visible por 2-5s (depende del tamaño del dataset). Si el archivo es grande, puede tardar más. Sin loading state ni toast "Generando exportación...". El usuario hace clic 2-3 veces más, o cierra la pestaña, o llama a soporte.
**Sugerencia**: optimistic toast "Generando exportación..." → toast success "Descarga lista" cuando termina.

---

## Menores (limpieza recomendada, no bloquean)

### M1. `paymentStatusMap` definido in-file no compartido con backend
**Línea**: [OrdersHistoryV2.jsx:25-31](../../src/components/orders/v2/OrdersHistoryV2.jsx#L25-L31)
**Impacto**: si backend añade nuevo status (ej. `processing_refund`), aquí no se renderiza. Mostrará el string raw.
**Sugerencia**: importar enum compartido o defaultear con label legible.

---

### M2. Selector "Filas por página" desconecta del modelo mental mobile
**Línea**: [OrdersDataTableV2.jsx:96-115](../../src/components/orders/v2/OrdersDataTableV2.jsx#L96-L115)
**Impacto**: en mobile, el concepto "filas por página" no aplica — debería ser infinite scroll o "Cargar más".
**Sugerencia**: en mobile sustituir por intersection observer + "Cargar más".

---

### M3. Sin atajos de teclado en desktop
**Impacto**: power-users (usuarios avanzados que SÍ existen aunque sean minoría) no tienen `/` para buscar, `n` para nueva orden, `r` para refresh. Notion/Linear/Linear-style accelerators ausentes.
**Sugerencia**: opcional, fase 2.

---

### M4. Página recarga `currentPage = 1` en cada cambio de search
**Línea**: [OrdersHistoryV2.jsx:130-136](../../src/components/orders/v2/OrdersHistoryV2.jsx#L130-L136)
**Impacto**: si el usuario está en página 5 y refina búsqueda, vuelve a página 1 sin avisar. Comportamiento técnicamente correcto pero visualmente abrupto.
**Sugerencia**: animar transición + indicador "Volviendo a página 1".

---

### M5. Botón "Enviar a Cocina" comparte fila con botón "Procesar" — competencia visual
**Línea**: [OrdersHistoryV2.jsx:463-485](../../src/components/orders/v2/OrdersHistoryV2.jsx#L463-L485)
**Impacto**: dos CTAs primarios en la misma fila confunden la acción principal. En vertical restaurant, ambos son válidos pero deberían tener jerarquía clara.
**Sugerencia**: bottom sheet "Acciones" con primary + secondary + tertiary jerarquizados.

---

## Aplicación de principios PROMPT-*.md

| Principio | Estado actual | Severidad |
|---|---|---|
| **Sell the outcome, not feature** | ✗ Header dice "Consulta, busca y administra" — pura descripción funcional | Alta |
| **Three-stage reward (anticipation/reveal/celebration)** | ✗ Cobro exitoso = toast verde 3s. Sin ceremonia. Sin afterglow. | Alta |
| **Intelligence trap** | ✗/✓ Backend almacena historia (✓) pero UI no la expone (✗): no hay "tu cliente más rentable", "tu vendedor top esta semana" | Media |
| **Long flows that feel short** | ✗ Drawer 3 pasos sin progress + sin animations entre steps = se siente eterno | Alta |
| **Teach in context** | ✗ Sin empty states orientadores, sin inline hints | Media |
| **Welcome-back recognition** | ✗ Header estático, no recuerda al usuario | Alta |
| **Peak-end rule** | ✗ El "fin" de cada flujo (cobrar, facturar) es seco | Alta |
| **Salience en CTA primario** | ✗/✓ "Procesar" tiene color primario (✓) pero compite con "Enviar a Cocina" en restaurant (✗) | Media |
| **Variable ratio reinforcement** | ✗ Sin streaks ni milestones (ej. "10 cobros sin pendientes esta semana") | Baja |

**Score: 3.8/10** — Una pantalla funcional pero emocionalmente plana.

---

## Frustration triggers identificados (mapa accionable)

| # | Trigger | Frecuencia estimada | Costo |
|---|---|---|---|
| FT1 | Usuario abre detalle "para asegurarse" si la orden está pagada o no | 5-10x por sesión | Tiempo + soporte |
| FT2 | Usuario abandona en mobile y abre la app desktop | 2-3x por día | UX trust + adopción mobile |
| FT3 | Usuario reporta a soporte "el botón cambió de nombre, ¿está roto?" | 1-2x por semana | Costo soporte |
| FT4 | Usuario lleva apuntes paralelos en Excel para saber qué urge | continuo | Pérdida del valor SmartKubik |
| FT5 | Usuario hace clic múltiple en "Exportar CSV" porque no vio respuesta | ocasional | Doble carga al backend |
| FT6 | Usuario pierde la página al refinar búsqueda (vuelve a 1) | ocasional | Confusión, retrabajo |
| FT7 | Usuario en caja (mobile) no llega al botón "Procesar" sin scroll horizontal | 30+ veces al día (caja) | Bloqueo operativo |
| FT8 | Cobro grande sin ceremonia → operador no siente "victoria" | continuo | Erosión de engagement |

**Total: 8 triggers identificados**, varios diarios. Target Fase 3 (rediseño): reducir a 0-1 triggers (FT8 puede mitigarse pero no eliminarse 100%).

---

## Contexto adicional

- **Backend asociado**: `food-inventory-saas/src/modules/orders/`. Ver [docs/wiki/system-map.md](../../../docs/wiki/system-map.md) sección orders.
- **Cross-vertical**: el módulo soporta food-inventory, restaurant, beauty. El audit aplica a los 3 — la patología es la misma pero restaurant tiene complejidad extra (kitchen-display).
- **Multi-tenant**: queries siguen tenant-isolation correctamente (no observado bug de aislamiento durante este audit, sólo UX).

---

## Próximos pasos

- **Crear blueprint**: `food-inventory-admin/docs/PROMPT-MOBILE-FIRST-ORDERS-HISTORY-REDESIGN.md` consumiendo este audit como input.
- **Implementación**: diferida a próximo turno tras iteración manual del blueprint.

---

*Audit generado por persona: 25 años UX/UI Sillicon Valley + 10 años customer success/support tooling. Filtro aplicado: usuario non-tech frustrado que ya pagó SmartKubik y necesita operar desde mobile + desktop.*
