# Mobile Design Principles — SmartKubik

> Referencia de Fase 1 del [ROADMAP_MOBILE_UX_BEAUTY.md](../../ROADMAP_MOBILE_UX_BEAUTY.md).
> Todo componente dentro de `src/components/mobile/` debe cumplir estos principios.

## 1. Thumb-zone first
Las acciones primarias siempre en el tercio inferior de la pantalla. El header es informativo, no accionable.

## 2. One primary action per screen
Cada vista responde a una sola pregunta ("¿qué sigue?"). Acciones secundarias van en overflow menu o bottom sheet.

## 3. Context over navigation
Prefiere mostrar la acción donde el usuario ya está (ej. botón "Cobrar" dentro de la tarjeta de la cita) en lugar de mandarlo a otro módulo.

## 4. Progressive disclosure
Muestra 3 campos visibles; el resto detrás de "más opciones". Los formularios largos matan mobile.

## 5. Optimistic UI + offline-first
La acción se ve completada al instante; el backend sincroniza después. Críticamente importante con conectividad intermitente.

## 6. Cards > Tables
En mobile, **nunca** scroll horizontal. Cada fila es una card táctil con la información mínima necesaria.

## 7. Gestures as first-class
- Swipe-left en ítems = acciones rápidas
- Long-press = reordenar / drag
- Pull-to-refresh donde aplique

## 8. Smart defaults
"Nueva cita" ya trae hoy, próximo hueco, servicio más frecuente del cliente, etc.

## 9. Touch targets ≥ 44×44px
Usar la utilidad `.tap-target` del design system mobile.

## 10. Safe-area insets siempre
Usar `.safe-bottom`, `.safe-top` en elementos sticky/fixed. Iterar con `env(safe-area-inset-*)`.

---

## Tokens y utilidades disponibles

Archivo: [src/styles/mobile-tokens.css](src/styles/mobile-tokens.css)

### Variables CSS
- `--tap-min` (44px), `--tap-comfortable` (48px), `--tap-large` (56px)
- `--mobile-topbar-h`, `--mobile-bottomnav-h`, `--mobile-fab-size`
- `--safe-top`, `--safe-bottom`, `--safe-left`, `--safe-right`
- `--z-mobile-content/topbar/bottomnav/fab/sheet/modal/toast`
- `--mobile-ease-out`, `--mobile-ease-spring`
- `--mobile-duration-fast/base/slow`

### Clases utilitarias
- `.safe-top`, `.safe-bottom`, `.safe-x`
- `.tap-target`, `.no-tap-highlight`, `.no-select`
- `.mobile-scroll` (momentum + oculta scrollbar)
- `.snap-row` (scroll snap horizontal)
- `.mobile-only`, `.desktop-only`
- `.mobile-content-pad` (padding-bottom para la bottom nav)

---

## Breakpoints

Usamos los breakpoints por defecto de Tailwind:
- Mobile: `< 768px` (sin prefijo)
- Tablet/Desktop: `md:` (≥ 768px)

La bottom nav se esconde con `md:hidden`. El sidebar desktop se ve desde `md:`.

---

## Patrón de detección de vertical

```jsx
import { useMobileVertical } from '@/hooks/use-mobile-vertical';

const { isBeauty, isFoodService, isRetail } = useMobileVertical();
```

Los tabs de BottomNav y las acciones del FAB se personalizan por vertical.

---

## Checklist antes de hacer merge de un componente mobile

- [ ] Touch targets ≥ 44×44px
- [ ] No produce scroll horizontal en 360px de ancho
- [ ] Respeta safe-area en top y bottom
- [ ] Usa tokens de `mobile-tokens.css`, no valores mágicos
- [ ] Acciones primarias en el tercio inferior
- [ ] Gestos (cuando aplique) con `framer-motion`
- [ ] Animaciones respetan `prefers-reduced-motion`
- [ ] Probado en iPhone SE (375×667) y Pixel 5 (393×851)
- [ ] No regresiona desktop (componente `md:hidden` o equivalente)
