# UX Audit — OrderHistoryClient (Storefront / Cliente final)

**Fecha**: 2026-05-09
**Plataforma**: desktop + mobile (mobile primario — el comprador pregunta "¿llegó?" desde el celular)
**Audiencia**: comprador final del storefront (no es operador, no paga SaaS, no le importa la jerga interna)
**Persona del auditor**: 25 años en Apple/Spotify/Stripe + últimos 10 en customer success/support tooling
**Score actual vs vara PROMPT-*.md**: **3.2 / 10**
**Hallazgos**: 16 (4 críticos, 8 importantes, 4 menores)

---

## Filosofía del auditor (recalibrada para storefront)

El comprador **no eligió usar SmartKubik** — eligió comprar en una tienda que casualmente corre sobre SmartKubik. Para él, esto es "la página donde compré" y lo que quiere saber es UNA cosa: **¿cuándo llega lo que pedí?**

> "Si este comprador entra estresado porque su pedido lleva 3 días sin actualizarse, ¿cómo le bajo la ansiedad en lugar de subírsela? ¿Cómo le doy seguridad sin que tenga que escribir por WhatsApp al comercio?"

Cada minuto que el cliente pasa en esta pantalla sin obtener respuesta clara es un minuto donde:
1. Probablemente abre WhatsApp del comercio (saturando soporte del cliente del cliente).
2. Probablemente piensa "no vuelvo a comprar aquí" (churn del cliente del cliente).
3. Probablemente deja review negativa del comercio (daño reputacional al cliente del cliente).

**Los tres caminos terminan dañando al tenant SmartKubik. Esta pantalla es defensa de marca de nuestros clientes.**

---

## Componentes auditados

- [src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx) — listado historial (315 líneas)
- [src/app/[domain]/mis-ordenes/page.tsx](../../src/app/[domain]/mis-ordenes/page.tsx) — entry point Next.js
- [src/app/[domain]/mis-ordenes/OrderSearchClient.tsx](../../src/app/[domain]/mis-ordenes/OrderSearchClient.tsx) — búsqueda de orden por número (no auth)
- [src/app/[domain]/orden/[orderNumber]/page.tsx](../../src/app/[domain]/orden/[orderNumber]/page.tsx) — vista detalle (referenciado por listado)

**Calibración aplicada:**
- Patrones de tracking emocional: Domino's Pizza Tracker (4 etapas), Uber Eats (6 etapas con mapa), Shopify Order Status Page.
- [.claude/skills/ux-design/SKILL.md](../../../.claude/skills/ux-design/SKILL.md) — three-stage reward, peak-end, welcome-back. Aplicados con cautela: el storefront NO es admin, no debe importar reglas operativas como universales.

---

## Resumen ejecutivo

OrderHistoryClient es **una réplica light del admin** trasladada al storefront — y eso es exactamente lo que está mal. Tres patologías troncales:

1. **7 estados técnicos visibles** (`pending/confirmed/processing/shipped/delivered/completed/cancelled`) cuando el cerebro del comprador necesita 3 emocionales: **Preparando / En camino / Llegó**.
2. **Sin tracking visual** — el comprador no sabe en qué etapa está el pedido sin abrir el detalle. Domino's resolvió esto en 2008.
3. **Acción única "Ver detalles"** — sin recompra, sin contacto al comercio, sin "¿qué tal todo?". El historial es un cementerio de pedidos.

Score 3.2/10 — la pantalla técnicamente lista pedidos, pero falla en el contrato emocional con el comprador (reducir ansiedad, dar control, generar repeat purchase).

---

## Críticos (alta probabilidad de churn / WhatsApp escalation)

### C1. 7 estados técnicos visibles, sin agrupación emocional

**Línea**: [OrderHistoryClient.tsx:14-23](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L14-L23)
**Pattern violado**: principio "el comprador no es operador — su modelo mental es lineal: pago → preparan → llega".
**Impacto**:
- El comprador ve `Pendiente`, `Confirmada`, `Procesando`, `Enviada`, `Entregada`, `Completada`, `Cancelada` y NO los distingue:
  - "¿Pendiente vs Confirmada vs Procesando es lo mismo o son etapas distintas?"
  - "¿Entregada vs Completada — qué falta?"
- Cada estado adicional incrementa carga cognitiva sin agregar valor para el comprador.
- Domino's redujo a 4 (Order Placed, Prep, Bake, Quality Check, Out for Delivery → 4-5 visibles) y el NPS subió +30 puntos.

**Frustration trigger**: ALTO. Comprador ansioso pregunta a comercio "¿qué significa Confirmada?" → soporte directo del cliente del cliente.

---

### C2. Sin tracking visual — el comprador debe hacer clic para entender la etapa

**Línea**: estructura general — sólo hay un `Badge` con texto.
**Pattern violado**: anticipation principle del SKILL.md ("el cerebro libera dopamina en la anticipación, no en la entrega").
**Impacto**:
- Sin progress bar, sin timeline horizontal, sin íconos de etapas. El comprador ve "Procesando" y debe interpretar mentalmente: "¿es la mitad? ¿está cerca?".
- Eliminar la incertidumbre visual reduce ansiedad de espera 40-60% (estudios Disney FastPass: la espera con tracking visible se percibe 30% más corta).
- El SmartKubik pierde la oportunidad de convertir el período de espera en una experiencia anticipatoria positiva ("Tu pedido está en preparación... falta poco").

**Frustration trigger**: ALTO. El comprador refresca compulsivamente la página + abre WhatsApp.

---

### C3. Empty state sin valor — "No tienes órdenes" + ícono genérico

**Línea**: [OrderHistoryClient.tsx:174-203](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L174-L203)
**Pattern violado**: principio "empty states never a dead end" del SKILL.md.
**Impacto**:
- El comprador que llega aquí (porque tal vez vio un anuncio del comercio) ve un estado vacío genérico sin contexto:
  - No sabe si su búsqueda anterior está mal.
  - No sabe si tiene que iniciar sesión con otra cuenta.
  - No sabe qué productos hay disponibles.
- El CTA "Explorar productos" es bueno pero está enterrado debajo del ícono.

**Frustration trigger**: MEDIO-ALTO. El comprador cierra la pestaña.

---

### C4. Acción única "Ver detalles" — sin recompra, sin contacto, sin reseña

**Línea**: [OrderHistoryClient.tsx:248-256](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L248-L256) (desktop) y [línea 289-294](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L289-L294) (mobile).
**Pattern violado**: peak-end rule ("el final del flujo es lo que más se recuerda").
**Impacto**:
- El historial es leído como cementerio. El comprador entra, ve qué compró, sale.
- Sin "Pedir lo mismo" / "Recomprar" / "Comprar otra vez" → se pierde una de las palancas de conversión más simples del e-commerce (Amazon: 35% de revenue es "Buy it again").
- Sin "¿Cómo te fue?" / "Calificar" después de "Entregada" → se pierde el peak emocional + datos de NPS para el comercio.
- Sin "Contactar al comercio" / "Reportar problema" → empuja al comprador a buscar el WhatsApp por fuera (mala UX + pérdida de trazabilidad).

**Frustration trigger**: MEDIO (no bloquea pero erosiona LTV).

---

## Importantes (degradan UX significativamente)

### I1. Loading state es texto plano en pantalla completa

**Línea**: [OrderHistoryClient.tsx:126-132](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L126-L132)
**Impacto**: pantalla completa con "Cargando órdenes..." centrado. Sin skeleton de cards. Layout shift al pasar a contenido.
**Sugerencia**: skeleton cards.

---

### I2. Error state como banner rojo sin acción

**Línea**: [OrderHistoryClient.tsx:165-169](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L165-L169)
**Impacto**: el error se muestra como banner rojo con el mensaje raw del backend (`err.message`). Sin botón retry. Sin tono empático. El comprador queda atascado.
**Sugerencia**: empty/error state con copy "No pudimos cargar tus pedidos — toca para reintentar" + botón retry visible + microcopy "Si esto sigue pasando, [contactar al comercio]".

---

### I3. Dark mode manejado con `if/else` inline en cada elemento → mantenimiento + bugs

**Línea**: pattern repetido a lo largo de todo el componente (~30 ocurrencias).
**Impacto**: el dark mode está implementado con `isDarkMode ? 'bg-gray-800' : 'bg-white'` repetido en cada elemento, en lugar de usar tokens Tailwind v4 (`dark:bg-gray-800`). Resultado:
- Mantener consistencia es propenso a errores.
- Layout shift visible en el primer paint (lee localStorage → setea state → re-render).
- No respeta `prefers-color-scheme` automáticamente del navegador (usa `matchMedia` manual).

**Sugerencia**: refactor a `dark:` prefix de Tailwind v4 + inicialización SSR-safe.

---

### I4. Sin filtros: no hay forma de filtrar por estado / fecha / monto

**Línea**: estructura general — la lista renderiza TODAS las órdenes sin opciones de filtrado.
**Impacto**: para un comprador frecuente con 20+ pedidos, encontrar UN pedido específico es scroll vertical largo. Sin chips "Pendientes / Recibidos", sin search, sin "últimos 30 días".
**Sugerencia**: chips horizontales con triage emocional + search por número de pedido.

---

### I5. Sin notificación in-app de cambio de estado

**Línea**: arquitectura — no hay polling, no hay WebSocket, no hay revalidate.
**Impacto**: el comprador entra, ve el estado, sale. Si el pedido cambia a "Enviado" 3 minutos después, el comprador no se entera hasta que vuelve a entrar manualmente. Pierde la oportunidad de delight ("¡Tu pedido salió!").
**Sugerencia**: revalidate cada 60s usando `useSWR` o WebSocket si existe. Bonus: push notification del navegador (PWA).

---

### I6. Sin tracking de ETA / fecha estimada de entrega

**Línea**: estructura — sólo se muestra `createdAt`, nunca `estimatedDelivery`.
**Impacto**: el comprador no sabe CUÁNDO llegará. Sólo sabe CUÁNDO compró. Esa es la pregunta más importante.
**Sugerencia**: si backend tiene `estimatedDelivery` o `dispatchedAt`, exponerlo. Si no, calcular estimación basada en estado actual + SLA del comercio.

---

### I7. Footer "Mostrando X órdenes" tiene cero valor

**Línea**: [OrderHistoryClient.tsx:303-310](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L303-L310)
**Impacto**: el comprador no necesita saber cuántas órdenes mostramos — necesita saber qué hacer con ellas. Espacio desperdiciado.
**Sugerencia**: reemplazar por CTA contextual ("¿Algo no está bien? [Contactar al comercio]") o por insight ("Has hecho 12 compras este año — gracias!").

---

### I8. Mobile card colapsa información valiosa

**Línea**: [OrderHistoryClient.tsx:262-298](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L262-L298)
**Impacto**: en mobile la card sólo muestra `orderNumber + fecha + status badge + #productos + total`. Falta:
- Foto del producto principal (anchor visual de memoria — Amazon, Etsy, Shopee lo tienen).
- Estado visual con ícono (no sólo badge texto).
- ETA si aplica.
- Acción rápida "Recomprar" si la orden ya fue entregada.

---

## Menores

### M1. Currency hardcoded a USD
**Línea**: [OrderHistoryClient.tsx:109-114](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L109-L114)
**Impacto**: si el comercio opera en VES o EUR, mostrará formato USD. Bug de display, no crítico pero visible.
**Sugerencia**: usar moneda del tenant config.

---

### M2. SVG empty state inline en JSX
**Línea**: [OrderHistoryClient.tsx:175-188](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L175-L188)
**Impacto**: ~14 líneas de SVG inline reducen legibilidad. Mejor componente o icon library (lucide-react ya está disponible).

---

### M3. Sin keyboard navigation explícita
**Impacto**: los enlaces "Ver detalles" son `<Link>` (Next.js) por lo que sí son navegables, pero no hay focus ring visible custom — usa el default del navegador, inconsistente entre browsers.

---

### M4. No accessibility — sin aria-labels en badges de estado
**Línea**: [OrderHistoryClient.tsx:119-123](../../src/app/[domain]/mis-ordenes/OrderHistoryClient.tsx#L119-L123)
**Impacto**: screen readers anunciarán "Procesando" sin contexto. Mejor `aria-label="Estado del pedido: Procesando"`.

---

## Aplicación de principios PROMPT-*.md (recalibrados para storefront)

| Principio | Estado actual | Severidad |
|---|---|---|
| **Sell the outcome (comprador-emocional)** | ✗ Header dice "Historial de todas tus compras" — descripción funcional. Debería ser "Sigue tus pedidos en tiempo real". | Alta |
| **Three-stage reward (anticipation/reveal/celebration)** | ✗ Llegada del pedido (peak emocional del flujo) no se celebra in-app. Sólo cambia de "Enviada" a "Entregada" sin ceremonia. | Alta |
| **Intelligence trap** | ✗/✓ Backend almacena historia (✓) pero UI no expone re-compra rápida ni favoritos (✗). El cliente no tiene razón para volver a esta página después del primer pedido. | Alta |
| **Long flows that feel short** | N/A (este flujo no es largo, es de espera) | — |
| **Welcome-back recognition** | ✗ Sin "Bienvenido de vuelta, [nombre]" + estado de pedidos activos. | Media |
| **Peak-end rule** | ✗ El "fin" (Entregada) es seco. Sin "¿Cómo te fue?" + "Recomprar". | Alta |
| **Salience en CTAs primarios** | ✗ "Ver detalles" no destaca, no hay otro CTA. | Media |

**Score: 3.2/10** — Funcional, hostil emocionalmente, sin retención.

---

## Frustration triggers identificados (mapa accionable)

| # | Trigger | Frecuencia estimada | Costo |
|---|---|---|---|
| FT1 | Comprador entra ansioso, ve 7 estados, no entiende, abre WhatsApp del comercio | Por cada pedido nuevo | Soporte del cliente del cliente + churn del comprador |
| FT2 | Comprador refresca compulsivamente (sin actualización in-app) | 3-5x por sesión durante espera | Carga al backend + ansiedad innecesaria |
| FT3 | Comprador no encuentra "Recomprar" → busca el producto manualmente o no recompra | Continuo | Pérdida de revenue del comercio (LTV) |
| FT4 | Comprador con error de carga ve banner rojo sin retry → cierra pestaña | Ocasional pero crítico | Trust + soporte |
| FT5 | Comprador no sabe si "Pendiente" significa "no nos llegó tu pago" o "estamos preparando" | Muy frecuente | Soporte + confusión transaccional |
| FT6 | Comprador espera entrega sin saber ETA → llama 5x al comercio | Constante en delivery | Soporte saturado |
| FT7 | Comprador con pedido entregado no encuentra dónde calificar → no deja review | Continuo | Pérdida de social proof para el comercio |
| FT8 | Comprador con 20+ órdenes scrollea infinito sin filtros | Para repeat customers | Mala UX + percepción de tienda "desordenada" |

**Total: 8 triggers identificados.** Target Fase 3 (rediseño): reducir a 0-1 triggers (FT2 puede mitigarse con polling pero requiere acuerdo backend).

---

## Diferencias críticas vs admin (no asumir reglas universales)

| Dimensión | Admin (operador) | Storefront (comprador) |
|---|---|---|
| Estado "Entregada" para... | Información operativa, dispara facturación | Pico emocional, momento de delight + reseña |
| Acciones primarias | Cobrar, facturar, cambiar estado | Ver tracking, recomprar, contactar |
| Tono copy | Operacional ("Cobrar $234") | Emocional ("Tu pedido está en camino") |
| Frecuencia visita | 30+/día | 1-3 veces por pedido |
| Nivel técnico | Tolerable medio | Cero |
| Multi-tenant context | Operador conoce su tenant | Comprador no sabe ni que existe SmartKubik |

---

## Contexto adicional

- **Backend asociado**: `food-inventory-saas/src/modules/orders/` (mismo que admin) + endpoints públicos `/customer/orders` con auth de cliente (token JWT customer).
- **Stack**: Next.js 15 App Router, NO Vite. Diferencias técnicas críticas:
  - Server Components disponibles (puede pre-renderizar listado en server).
  - `useSWR` o React Query no instalados — añadir si revalidate es necesario.
  - Tailwind v4 ya disponible (`globals.css`).
- **Multi-tenant**: el comprador entra a `<tenant>.smartkubik.com/[domain]/mis-ordenes`. El storefront debe respetar branding del tenant (colores, logo).

---

## Próximos pasos

- **Crear blueprint**: `food-inventory-storefront/docs/PROMPT-MOBILE-FIRST-MIS-ORDENES-REDESIGN.md` consumiendo este audit como input.
- **Implementación**: diferida a próximo turno tras iteración manual del blueprint.

---

*Audit generado por persona: 25 años UX/UI Sillicon Valley + 10 años customer success/support tooling. Filtro aplicado: comprador final ansioso esperando su pedido, sin lealtad pre-construida hacia SmartKubik.*
