# CONTEXTO PARA MIGRACIÓN DE CONVERSACIÓN - SMARTKUBIK HOMEPAGE

**Estado Actual:** Diseño Aprobado (Fase 6 Completada).
**Siguiente Paso Inmediato:** FASE 7 - Generación del Código (Complete Homepage Code Generation).

---

## 1. El Objetivo
Crear un homepage de alto impacto para "SmartKubik" (Business Operating System) enfocado en obtener una inversión de $2M.
**Estética:** "Liquid Future" (Obsidian backgrounds, Aurora gradients, Glassmorphism).
**Rol:** Elite Web Designer (Silicon Valley persona).

## 2. Estructura Aprobada (6 Secciones)
1.  **Hero:** "Your Business. Autopilot. 24/7." + Dashboard 3D.
2.  **Verticals:** 6 tarjetas (Restaurant, Retail, Manufacturing, etc.) con iconos brillantes.
3.  **Growth Engine:** WhatsApp UI (izquierda) vs CRM Pipeline (derecha). "It Sells While You Sleep".
4.  **Control Center:** Dashboard financiero "God View" (Payroll, Tax, Cashflow).
5.  **Tech Edge:** Visualización red neuronal/Vector DB. "The AI That Gets Smarter".
6.  **Pricing:** 3 tarjetas ($29, $59 highlight, $99).

## 3. Especificaciones de Diseño (Design System)

**Paleta de Colores:**
*   `--bg-abyss`: `#0A0A0F` (Fondo principal)
*   `--glow-cyan`: `#00FFFF` (Acentos AI)
*   `--glow-magenta`: `#FF00E5` (Hover/Secondary)
*   `--glow-aurora`: `linear-gradient(135deg, #00FFFF, #7B61FF, #FF00E5)`

**Componentes:**
*   **Cards:** Glassmorphism (`backdrop-filter: blur(16px)`), borde sutil, radio 24px.
*   **Botones:** Pill shape, gradientes brillantes, glow effect en hover.

## 4. Prompt de Referencia (Base del Código)
Utiliza este prompt como guía para el estilo visual del código:

```json
{
  "prompt": "Website screenshot of SmartKubik AI-powered Business Operating System... Liquid future aesthetic with glassmorphism and aurora gradient depth. Background: Deep obsidian #0A0A0F... Full homepage vertical scroll showing 6 sections... Components: glassmorphic cards with blur and subtle borders, prominent glowing CTAs... Framework: Tailwind patterns, Shadcn style, liquid glass effects...",
  "aspect_ratio": "9:16"
}
```

## 5. Instrucción para la Nueva Sesión (Copia y pega esto):

> "Hola. Vengo de una sesión anterior donde ya aprobamos el diseño del homepage de SmartKubik.
>
> **Rol:** Actúa como 'Elite Web Designer' (Code Generation Phase).
> **Contexto:** Hemos completado las fases 1 a 6. El diseño 'Liquid Future' está aprobado (ver archivo adjunto `CONTEXTO_MIGRACION_HOMEPAGE.md`).
>
> **TAREA:** Por favor inicia inmediatamente la **FASE 7: Complete Homepage Code Generation**.
> Quiero que generes el archivo HTML único (con Tailwind vía CDN o styles inline modernos) que replique exactamente el diseño aprobado: fondo obsidian, efectos aurora, glassmorphism, y las 6 secciones detalladas en el archivo de contexto.
>
> El código debe ser 'Drop-in ready' y visualmente impresionante."
