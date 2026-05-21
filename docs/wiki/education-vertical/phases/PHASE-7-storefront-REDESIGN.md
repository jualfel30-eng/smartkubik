# PHASE 7 — Storefront Educativo: Portal Institucional Prestigioso

> **Este documento reemplaza `PHASE-7-storefront.md` a nivel de diseño.**
> La arquitectura técnica (endpoints, rutas, auth) es la misma. La diferencia es que aquí el diseño está completamente especificado para que no haya interpretación libre que derive en una plantilla genérica.

---

## Evaluación de Propuestas de Diseño Consideradas

Antes de ejecutar, se evaluaron 4 direcciones de diseño. Solo las ≥ 8/10 fueron consideradas:

| Propuesta | Descripción | Score | Decisión |
|---|---|---|---|
| A — Editorial + Institutional Dark | Navy profundo + cream + gold, Playfair Display + Plus Jakarta Sans, secciones editoriales, sin cards flotantes | **9/10** | ✅ Incluida |
| B — Bold Contemporary | Cobalt + white, tipografía display grande, marquee de stats, staggered image+text | **8.5/10** | ✅ Incluida (stats band) |
| C — Clean Modernist Ivory | Ivory base, Inter para todo, card grid | **4/10** | ❌ Demasiado genérico |
| D — Classic Serif Solo | Parchment + crimson, estilo periódico, solo serif | **6.5/10** | ❌ Puede sentirse anticuado sin balance |

**El prompt usa A como base con el stats band de B.**

---

## Rol del Ejecutor

Tienes experiencia en Next.js 15 App Router, Tailwind v4, Framer Motion, animaciones CSS avanzadas (clip-path reveal, scroll-triggered counters), tipografía editorial de instituciones educativas, sistemas de diseño OKLCH, auth dual (student/teacher JWT), y diseño mobile-first de portales institucionales reales.

**Referencia mental:** Harvard.edu, Imperial College London, Stanford.edu, VCU School of the Arts (Webby Winner 2025). No los estás copiando — estás internalizando su principio: el texto ES el diseño, el espacio en blanco ES el diseño, el color se usa con escalpelo no con pincel grueso.

No eres un generador de plantillas SaaS. Este storefront no puede salir pareciendo ninguno de los templates existentes del repo (`PremiumStorefront`, `BeautyStorefront`, `ModernEcommerce`, `ModernServices`).

---

## PARTE 1: ANTI-PATRONES PROHIBIDOS (LEER PRIMERO)

Los templates actuales del repo tienen estos vicios que ESTÁN EXPLÍCITAMENTE PROHIBIDOS aquí:

| Prohibido | Dónde vive en el repo | Por qué está prohibido | En su lugar |
|---|---|---|---|
| `linear-gradient(135deg, primaryColor, secondaryColor)` como fondo de hero | PremiumStorefront.tsx, BeautyHero.tsx fallback | Grita "SaaS template" | Imagen oscura con overlay `rgba(12,31,63,0.75)` o fondo `var(--edu-navy)` sólido |
| Orbs flotantes con `blur-[120px]` | PremiumStorefront.tsx L56-68 | Decoración vacía sin intención | Espacio en blanco deliberado |
| `WaveDivider` SVG entre secciones | PremiumStorefront.tsx L73-80 | Visual noise, pattern de landing de startup | Separadores `1px` o cambio limpio de color de fondo |
| Cards con `box-shadow: 0 20px 60px rgba(0,0,0,0.3)` | PremiumStorefront.tsx | Exceso dramático | `box-shadow: 0 1px 3px rgba(0,0,0,0.08)` máximo |
| Sección "Features" ícono + título + 2 líneas × 6 | ModernServices, ModernEcommerce | Patrón de landing de startup | Lista editorial con líneas horizontales o secciones imagen+texto |
| Todo en `Inter` o `Poppins` | Todos los templates | Cero personalidad tipográfica | Playfair Display para display + Plus Jakarta Sans para body |
| `GrainOverlay` + `NoiseSVG` decorativas | PremiumStorefront.tsx L34-41 | Afectan performance, nula intención de diseño | Eliminadas |
| Animated gradient background (`animate-gradient-shift`) | PremiumStorefront.tsx L44-69 | Distrae, no comunica institución educativa | Fondo estático, movimiento en el contenido |

---

## PARTE 2: SISTEMA DE DISEÑO

### 2.1 Tipografía

Importar en el layout del education portal:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

Tokens en `templates/EducationPortal/education.css`:
```css
:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;

  --text-hero:    clamp(48px, 8vw, 88px);
  --text-section: clamp(32px, 4.5vw, 56px);
  --text-xl:      24px;
  --text-lg:      18px;
  --text-base:    16px;
  --text-sm:      14px;
  --text-xs:      12px;

  --leading-tight:  1.1;
  --leading-display: 1.15;
  --leading-normal: 1.65;
}
```

### 2.2 Paleta de Color

```css
:root {
  /* Institucionales */
  --edu-navy:         #0C1F3F;
  --edu-navy-hover:   #1a3561;
  --edu-cream:        #FAF7F2;
  --edu-white:        #FFFFFF;

  /* Acento — usar quirúrgicamente, nunca como fondo de sección */
  --edu-gold:         #C9A84C;
  --edu-gold-subtle:  rgba(201, 168, 76, 0.12);
  --edu-gold-border:  rgba(201, 168, 76, 0.4);

  /* Semánticos para el portal */
  --edu-success:      #1B6B45;
  --edu-success-bg:   rgba(27, 107, 69, 0.08);
  --edu-danger:       #B91C1C;
  --edu-danger-bg:    rgba(185, 28, 28, 0.07);
  --edu-warning:      #B45309;
  --edu-warning-bg:   rgba(180, 83, 9, 0.08);
  --edu-info:         #1D4ED8;
  --edu-info-bg:      rgba(29, 78, 216, 0.08);

  /* Grises */
  --edu-gray-50:  #F8F7F4;
  --edu-gray-100: #F0EDEA;
  --edu-gray-200: #E2DDD8;
  --edu-gray-300: #C9C4BF;
  --edu-gray-500: #8B8680;
  --edu-gray-700: #4A4745;
  --edu-gray-900: #1C1B18;

  /* Espaciado */
  --section-py:    clamp(80px, 10vw, 140px);
  --section-px:    clamp(24px, 6vw, 100px);
  --container-max: 1200px;
  --gap-xl:        clamp(40px, 5vw, 80px);
  --gap-lg:        clamp(24px, 3vw, 48px);
  --gap-md:        24px;
  --gap-sm:        16px;

  /* Forma */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;

  /* Sombras (minimalistas) */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);

  /* Transiciones */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
}
```

**Regla de oro:** Si vas a escribir un color hexadecimal directamente en el JSX, para. Usa un token de esta lista. Sin excepciones.

### 2.3 Botones

```css
/* Primario: fondo navy, texto blanco, hover → navy-hover */
.btn-primary {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.02em;
  padding: 14px 32px;
  background: var(--edu-navy);
  color: var(--edu-white);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.btn-primary:hover { background: var(--edu-navy-hover); }

/* Acento: fondo gold, texto navy — solo para el CTA principal de la landing */
.btn-accent {
  background: var(--edu-gold);
  color: var(--edu-navy);
  border: 1px solid var(--edu-gold);
}
.btn-accent:hover { background: #b8973d; }

/* Ghost: borde navy, fondo transparente */
.btn-ghost {
  background: transparent;
  color: var(--edu-navy);
  border: 1px solid var(--edu-navy);
}
.btn-ghost:hover { background: var(--edu-navy); color: var(--edu-white); }

/* Ghost sobre fondo oscuro */
.btn-ghost-on-dark {
  background: transparent;
  color: var(--edu-white);
  border: 1px solid rgba(255,255,255,0.4);
}
.btn-ghost-on-dark:hover { border-color: rgba(255,255,255,0.8); }
```

---

## PARTE 3: LANDING PÚBLICA — Sección por Sección

**Server Component.** Lee `GET /education/public/config/:domain` (sin auth) para obtener `config`:
```typescript
interface EduPublicConfig {
  institutionName: string;
  logoUrl?: string;
  tagline?: string;
  primaryColor?: string;  // solo para indicadores dot en nav, nada más
  bannerUrl?: string;
  foundedYear?: number;
  totalStudents?: number;
  totalTeachers?: number;
  programs?: { name: string; level: string }[];
  quote?: { text: string; author: string; avatarUrl?: string };
  contactInfo?: { phone?: string; email?: string; address?: string };
}
```

### Sección 1 — NAV

```
Desktop: [Logo + Nombre] _________ [Institución] [Programas] [Admisiones] [Contacto]  [Portal →]
Mobile:  [Logo + Nombre] _________ [≡]
```

Comportamiento scroll:
- Posición inicial: `position: fixed`, `background: transparent`, texto blanco
- Después de 80px de scroll: `background: white`, `box-shadow: 0 1px 0 rgba(0,0,0,0.08)`, texto navy
- Transición: 200ms ease para background, color y box-shadow

El botón "Portal →": siempre visble, estilo `btn-primary` en versión compact (`padding: 8px 20px`). En versión transparente: `btn-ghost-on-dark`.

**NO glassmorphism. NO backdrop-blur. NO gradientes en el nav.**

### Sección 2 — HERO (Define el resto de la página)

**Altura: `100svh`**

**Fondo:**
- Si `config.bannerUrl` existe: `<Image fill objectFit="cover">` con overlay `linear-gradient(to bottom, rgba(12,31,63,0.72) 0%, rgba(12,31,63,0.45) 60%, rgba(12,31,63,0.65) 100%)`
- Si NO hay imagen: `background: var(--edu-navy)` + SVG pattern de líneas diagonales finas (opacity 0.04), estilo:
  ```svg
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="0.5"/>
  </pattern>
  ```

**Layout del contenido:** absolutamente posicionado, `bottom: 15%`, `left: var(--section-px)`, `max-width: 860px`

**Elementos y animaciones (en orden de aparición):**

```tsx
// 1. Tag line: aparece con opacity 0→1, translateY(12px)→0, delay: 0.2s
<span style={{
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--edu-gold)',
  display: 'block',
  marginBottom: '20px',
}}>
  Excelencia Educativa · Desde {config.foundedYear || '1998'}
</span>

// 2. H1: aparece con clip-path inset(100% 0 0 0) → inset(0% 0 0 0), duration: 0.85s, delay: 0.4s
// NO fade. Clip-path reveal de abajo hacia arriba.
<h1 style={{
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--text-hero)',
  fontWeight: 700,
  lineHeight: 'var(--leading-display)',
  color: 'var(--edu-white)',
  margin: 0,
}}>
  {config.institutionName}
</h1>

// 3. Tagline: aparece con opacity 0→1, translateY(16px)→0, delay: 0.75s
<p style={{
  fontFamily: 'var(--font-body)',
  fontSize: '20px',
  lineHeight: 'var(--leading-normal)',
  color: 'rgba(255,255,255,0.72)',
  marginTop: '24px',
  maxWidth: '500px',
}}>
  {config.tagline || 'Formando líderes con valores, conocimiento y vocación de servicio.'}
</p>

// 4. CTAs: aparecen con opacity 0→1, delay: 1s
<div style={{ display: 'flex', gap: '16px', marginTop: '44px', flexWrap: 'wrap' }}>
  <a href="#access" className="btn-accent">Acceder al Portal</a>
  <a href="#programs" className="btn-ghost-on-dark">Ver Programas</a>
</div>
```

**Scroll indicator** — absolutamente posicionado, `right: 48px`, `bottom: 48px`, en desktop únicamente:
```tsx
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
  <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', writingMode: 'vertical-rl' }}>
    Descubre más
  </span>
  {/* Línea animada: 2px wide, crece de 0px → 40px height en loop */}
  <div className="scroll-line" style={{ width: '1px', background: 'rgba(255,255,255,0.3)', animation: 'scrollLine 1.8s ease-in-out infinite' }} />
</div>
```

### Sección 3 — STATS BAND

```
Fondo: var(--edu-navy)
Padding: 80px var(--section-px)
```

4 estadísticas en grid (`grid-template-columns: repeat(4, 1fr)` desktop, `2fr 2fr` mobile):

```tsx
const stats = [
  { value: config.totalStudents, suffix: '+', label: 'Estudiantes Activos' },
  { value: config.totalTeachers, suffix: '+', label: 'Docentes Certificados' },
  { value: currentYear - (config.foundedYear || 2000), suffix: '', label: 'Años de Trayectoria' },
  { value: 98, suffix: '%', label: 'Satisfacción de Egresados' },
];

/* Cada stat:
   - Número: Playfair Display Bold, 64px desktop / 44px mobile, color: var(--edu-gold)
   - Counter animation: useInView + Framer Motion useMotionValue (anima de 0 al valor real, 1.5s ease-out)
   - Suffix ("+", "%"): mismo estilo, 50% del tamaño del número
   - Label: Plus Jakarta Sans, 13px, uppercase, letter-spacing: 0.12em, rgba(255,255,255,0.55)
   - Separador vertical entre stats: 1px solid rgba(255,255,255,0.12) (solo desktop, oculto en mobile)
*/
```

### Sección 4 — PROGRAMS

```
Fondo: var(--edu-cream)
Padding: var(--section-py) var(--section-px)
```

**Layout desktop:** `display: grid; grid-template-columns: 5fr 7fr; gap: var(--gap-xl); align-items: start;`

**Columna izquierda (sticky en desktop, `position: sticky; top: 120px`):**
```tsx
<div>
  {/* Etiqueta */}
  <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--edu-gold)', display: 'block', marginBottom: '16px' }}>
    Formación Académica
  </span>

  {/* Título */}
  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', color: 'var(--edu-navy)', lineHeight: 'var(--leading-display)', margin: 0 }}>
    Oferta<br/>Académica
  </h2>

  {/* Línea decorativa */}
  <div style={{ width: '48px', height: '3px', background: 'var(--edu-gold)', marginTop: '24px' }} />

  {/* Texto de apoyo */}
  <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--edu-gray-700)', lineHeight: 'var(--leading-normal)', marginTop: '24px', maxWidth: '280px' }}>
    Programas diseñados para desarrollar excelencia académica y valores humanos en cada etapa formativa.
  </p>
</div>
```

**Columna derecha — Lista editorial (NO cards):**
```tsx
/* config.programs o lista por defecto */
{programs.map((program, i) => (
  <div key={i} style={{
    borderTop: '1px solid var(--edu-gray-200)',
    padding: '24px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  }}>
    <div>
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-lg)', color: 'var(--edu-navy)' }}>
        {program.name}
      </span>
      <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', marginTop: '4px' }}>
        {program.level}
      </span>
    </div>
    {/* Flecha: opacity 0, translateX(-8px) → visibles al hover de la fila */}
    <svg width="20" height="20" viewBox="0 0 20 20" style={{ color: 'var(--edu-gold)', opacity: 0, transition: 'opacity 200ms, transform 200ms' }}>
      <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  </div>
))}
{/* Última línea de cierre */}
<div style={{ borderTop: '1px solid var(--edu-gray-200)' }} />
```

**Mobile:** stack vertical, columna izquierda arriba sin sticky, lista abajo.

### Sección 5 — PULL QUOTE

```
Fondo: var(--edu-navy)
Padding: clamp(80px, 8vw, 120px) var(--section-px)
Text-align: center
Max-width: 720px, centrado
```

```tsx
<blockquote style={{ margin: 0 }}>
  {/* Comilla decorativa: " en Playfair Display, 120px, gold, opacity 0.3, position: absolute */}
  <p style={{
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontSize: 'clamp(24px, 3.5vw, 36px)',
    lineHeight: 1.45,
    color: 'var(--edu-white)',
    margin: 0,
  }}>
    {config.quote?.text || '"Esta institución cambió mi forma de ver el mundo. No solo aprendí, crecí."'}
  </p>
  <footer style={{ marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
    {config.quote?.avatarUrl && (
      <img src={config.quote.avatarUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--edu-gold)' }} />
    )}
    <cite style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.6)', fontStyle: 'normal', letterSpacing: '0.05em' }}>
      — {config.quote?.author || 'Egresado, Promoción 2023'}
    </cite>
  </footer>
</blockquote>
```

### Sección 6 — ABOUT (Dos Columnas)

```
Fondo: var(--edu-cream)
Padding: var(--section-py) var(--section-px)
```

```
Desktop: [IMAGEN 50%] [TEXTO 50%]
Mobile: [IMAGEN] [TEXTO]
```

**Bloque de imagen (izquierda):**
- Si hay foto de instalaciones: `<Image fill objectFit="cover">` en contenedor `aspect-ratio: 4/5`
- Si NO hay foto: bloque navy sólido `aspect-ratio: 4/5` con datos superpuestos (`position: absolute, bottom: 32px, left: 32px`)
  - Texto: "Est. [año]", "Sede principal", "Ciudad"
  - Estilo: Playfair Display Italic, 20px, blanco

**Bloque de texto (derecha):**
```tsx
<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
  <span style={{ /* etiqueta uppercase gold */ }}>Nuestra Historia</span>
  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3.5vw,44px)', color: 'var(--edu-navy)' }}>
    {config.aboutTitle || 'Tres décadas formando generaciones'}
  </h2>
  <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', lineHeight: 'var(--leading-normal)', color: 'var(--edu-gray-700)' }}>
    {config.aboutText || 'Texto institucional real aquí...'}
  </p>
  {/* Lista de valores con dash dorado */}
  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
    {['Excelencia académica', 'Formación en valores', 'Innovación pedagógica', 'Compromiso comunitario'].map(v => (
      <li key={v} style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--edu-gray-700)', display: 'flex', gap: '12px', alignItems: 'baseline' }}>
        <span style={{ color: 'var(--edu-gold)', fontWeight: 700, flexShrink: 0 }}>—</span>
        {v}
      </li>
    ))}
  </ul>
</div>
```

### Sección 7 — ACCESS (La Conversión)

```
Fondo: var(--edu-navy)
Padding: var(--section-py) var(--section-px)
id="access"
```

Header de sección (centrado):
```tsx
<div style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto 64px' }}>
  <span style={{ /* etiqueta gold */ }}>Portal Institucional</span>
  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,4vw,48px)', color: 'var(--edu-white)', marginTop: '16px', marginBottom: '16px' }}>
    Tu acceso a la vida académica
  </h2>
  <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'rgba(255,255,255,0.6)', lineHeight: 'var(--leading-normal)' }}>
    Calificaciones, horarios, asistencia y cuotas desde un solo lugar.
  </p>
</div>
```

**Dos cards de acceso** — `display: grid; grid-template-columns: 1fr 1fr; gap: 24px;` (1 columna en mobile):

```tsx
/* NO son cards con ícono centrado y 2 líneas de texto */
/* Son bloques editoriales con lista de funcionalidades */

const accessCards = [
  {
    role: 'Estudiante',
    href: './login?type=student',
    icon: '🎓', // o SVG lineal propio
    features: ['Mis calificaciones', 'Horario semanal', 'Registro de asistencia', 'Estado de cuotas'],
    cta: 'Iniciar sesión como Estudiante',
  },
  {
    role: 'Docente',
    href: './login?type=teacher',
    icon: '📋',
    features: ['Mi horario de clases', 'Pasar lista de asistencia', 'Cargar calificaciones', 'Historial de registros'],
    cta: 'Iniciar sesión como Docente',
  },
];

/* Cada card:
   border: 1px solid rgba(255,255,255,0.12)
   border-radius: var(--radius-md)
   padding: 40px
   transition: border-color 200ms
   hover: border-color: var(--edu-gold-border)
   
   Ícono: 40px × 40px, centrado izquierda (no centrado en la card)
   Título role: Playfair Display, 28px, white
   Lista: sin bullets estándar, con checkmark SVG en gold (16px) antes de cada ítem
   CTA: btn-accent en la card de estudiante, btn-primary en la de docente (diferenciación sutil)
*/
```

### Sección 8 — FOOTER

```
Fondo: var(--edu-navy)
Border-top: 1px solid rgba(255,255,255,0.08)
Padding: 80px var(--section-px) 40px
```

Grid: `grid-template-columns: 2fr 1fr 1fr 1fr` desktop, `1fr 1fr` tablet, `1fr` mobile

```
Col 1: Logo + nombre + descripción breve (2-3 líneas) + email de contacto
Col 2: "Académico" — links: Programas, Admisiones, Horarios, Calificaciones
Col 3: "Institución" — links: Historia, Docentes, Instalaciones, Noticias
Col 4: "Contacto" — dirección, teléfono, email (de config.contactInfo)
```

Línea de copyright: `border-top: 1px solid rgba(255,255,255,0.08)`, `margin-top: 64px`, `padding-top: 32px`, color `rgba(255,255,255,0.35)`, Plus Jakarta Sans 13px.

**Sin redes sociales a menos que `config.socialLinks` exista y no esté vacío.**

---

## PARTE 4: LOGIN PAGE (`education/login/page.tsx`)

**NO reutilizar el login genérico del storefront.**

Layout de dos columnas (desktop únicamente):

```
Desktop:
┌──────────────────────────────────────────────────┐
│ LEFT (45%)                 │ RIGHT (55%)          │
│ Fondo: var(--edu-navy)     │ Fondo: var(--edu-cream)│
│ Con imagen/patrón          │ Formulario centrado   │
│ + quote de la institución  │                      │
└──────────────────────────────────────────────────┘

Mobile: Solo la columna derecha (formulario) a pantalla completa.
```

**Columna izquierda (desktop):**
```tsx
/* Background: imagen de instalaciones si disponible, o navy con pattern SVG */
/* Contenido centrado verticalmente, padding 60px */
<div>
  {/* Logo blanco */}
  {/* Nombre de la institución en Playfair Display 28px blanco */}
  {/* Línea 1px white/20 */}
  {/* Quote en Playfair Display Italic 20px white/80 */}
  {/* Nombre del autor en Plus Jakarta Sans 13px white/50 */}
</div>
```

**Columna derecha — El formulario:**
```tsx
<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(40px, 6vw, 80px)', maxWidth: '420px', margin: '0 auto', width: '100%' }}>
  {/* Logo (si existe) centrado, max 48px height */}
  
  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--edu-navy)', marginTop: '32px', marginBottom: '8px' }}>
    Bienvenido de vuelta
  </h1>
  <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', marginBottom: '40px' }}>
    {config.institutionName}
  </p>

  {/* Toggle Estudiante / Docente */}
  {/* Dos botones pill, NO tabs con borde inferior */}
  <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'var(--edu-gray-100)', borderRadius: '100px', padding: '4px' }}>
    {['student', 'teacher'].map(type => (
      <button key={type}
        onClick={() => setUserType(type)}
        style={{
          flex: 1,
          padding: '10px',
          borderRadius: '100px',
          border: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          background: userType === type ? 'var(--edu-navy)' : 'transparent',
          color: userType === type ? 'white' : 'var(--edu-gray-500)',
          transition: 'background 200ms, color 200ms',
          cursor: 'pointer',
        }}
      >
        {type === 'student' ? 'Estudiante' : 'Docente'}
      </button>
    ))}
  </div>

  {/* Inputs: estilo minimalista con solo border-bottom */}
  {/* Email input */}
  <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--edu-gray-300)', paddingBottom: '12px', focusWithin: { borderColor: 'var(--edu-navy)' } }}>
    <label style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--edu-gray-500)', display: 'block', marginBottom: '8px' }}>Email</label>
    <input type="email" style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--edu-gray-900)', outline: 'none' }} />
  </div>

  {/* Password input: idéntico, con toggle de visibilidad */}

  {/* Error message: fadeIn, con ícono de alerta, fondo rojo/5% */}
  {error && (
    <div style={{ background: 'var(--edu-danger-bg)', border: '1px solid var(--edu-danger)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '24px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-danger)' }}>
      {error}
    </div>
  )}

  {/* Submit: ancho completo, fondo navy, loading spinner dentro del botón (no overlay) */}
  <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', position: 'relative' }}>
    {loading ? <Spinner size={16} /> : 'Iniciar Sesión'}
  </button>
</div>
```

**Post-login:** `router.push()` en el handler del submit, NO `useEffect`.

---

## PARTE 5: PORTAL — Layout Base

### Sidebar (Desktop, `components/EduSidebar.tsx`)

```
width: 240px
height: 100vh
position: sticky, top: 0
background: var(--edu-navy)
overflow-y: auto
padding: 32px 0
```

```tsx
/* Logo + nombre arriba */
/* Links de navegación: */
const navItems = [
  /* Para estudiante: */
  { href: './student', icon: HomeIcon, label: 'Dashboard' },
  { href: './student/schedule', icon: CalendarIcon, label: 'Mi Horario' },
  { href: './student/grades', icon: BookIcon, label: 'Calificaciones' },
  { href: './student/attendance', icon: CheckSquareIcon, label: 'Asistencia' },
  { href: './student/payments', icon: ReceiptIcon, label: 'Cuotas' },
  /* Para docente: */
  { href: './teacher', icon: HomeIcon, label: 'Dashboard' },
  { href: './teacher/schedule', icon: CalendarIcon, label: 'Mi Horario' },
  { href: './teacher/attendance', icon: CheckSquareIcon, label: 'Pasar Lista' },
  { href: './teacher/grades', icon: BookIcon, label: 'Calificaciones' },
];

/* Cada link:
   padding: 12px 24px
   fontFamily: var(--font-body), fontSize: 14px, fontWeight: 500
   color: rgba(255,255,255,0.65)
   display: flex, gap: 12px, alignItems: center
   
   Activo:
   color: white
   border-left: 3px solid var(--edu-gold)
   background: rgba(255,255,255,0.06)
   
   Hover (no activo):
   color: rgba(255,255,255,0.9)
   background: rgba(255,255,255,0.04)
   
   Transición: 150ms ease
*/

/* Botón de logout: al fondo del sidebar, separado por border-top 1px white/10 */
```

### Bottom Nav (Mobile, `components/EduBottomNav.tsx`)

```
position: fixed, bottom: 0, left: 0, right: 0
height: 64px
background: white
border-top: 1px solid var(--edu-gray-200)
display: flex
padding-bottom: env(safe-area-inset-bottom)
z-index: 100
```

4 ítems, centrados, con ícono 20px + label 10px uppercase.
Activo: ícono y label en `var(--edu-navy)`. Inactivo: `var(--edu-gray-500)`.

### Page Layout

```tsx
<div style={{ display: 'flex', minHeight: '100vh', background: 'var(--edu-gray-50)' }}>
  <EduSidebar />  {/* oculto en mobile */}
  <main style={{ flex: 1, padding: 'clamp(24px, 3vw, 48px)', paddingBottom: '80px' /* espacio para bottom nav mobile */ }}>
    {children}
  </main>
</div>
```

---

## PARTE 6: COMPONENTES DEL PORTAL

### GradeRow (lista de calificaciones del alumno)

```tsx
/* NO card con sombra. Es una fila en una lista. */
{grades.map(grade => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    padding: '20px 0',
    borderBottom: '1px solid var(--edu-gray-100)',
    gap: '24px',
  }}>
    <div>
      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-900)', margin: 0 }}>
        {grade.subjectName}
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', margin: '4px 0 0' }}>
        Prof. {grade.teacherName} · {grade.period}
      </p>
      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--edu-gray-100)', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(grade.score / grade.maxScore) * 100}%`,
          background: grade.passed ? 'var(--edu-success)' : 'var(--edu-danger)',
          borderRadius: '2px',
          transition: 'width 600ms ease',
        }} />
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: grade.passed ? 'var(--edu-success)' : 'var(--edu-danger)' }}>
        {grade.score ?? '—'}
      </span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)' }}>/{grade.maxScore}</span>
      <span style={{
        display: 'block',
        fontFamily: 'var(--font-body)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: grade.score === null ? 'var(--edu-gray-400)' : grade.passed ? 'var(--edu-success)' : 'var(--edu-danger)',
        marginTop: '4px',
      }}>
        {grade.score === null ? 'Pendiente' : grade.passed ? 'Aprobado' : 'Reprobado'}
      </span>
    </div>
  </div>
))}
```

### TuitionStatusCard

```tsx
/* Ordenadas por urgencia: overdue → pending → paid */
{tuitions.map(t => (
  <div style={{
    borderLeft: `3px solid ${t.status === 'overdue' ? 'var(--edu-danger)' : t.status === 'pending' ? 'var(--edu-warning)' : 'var(--edu-success)'}`,
    background: t.status === 'overdue' ? 'var(--edu-danger-bg)' : t.status === 'pending' ? 'var(--edu-warning-bg)' : 'transparent',
    padding: '20px 20px 20px 24px',
    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  }}>
    <div>
      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--edu-gray-900)', margin: 0 }}>
        {t.period} — {t.type}
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', margin: '4px 0 0' }}>
        {t.status === 'overdue'
          ? `Vencida hace ${t.daysOverdue} días`
          : t.status === 'pending'
          ? `Vence el ${formatDate(t.dueDate)}`
          : `Pagada el ${formatDate(t.paidDate)}`}
      </p>
    </div>
    <div style={{ textAlign: 'right' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '20px', color: 'var(--edu-gray-900)' }}>
        {formatCurrency(t.amount)}
      </span>
      <span style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: t.status === 'overdue' ? 'var(--edu-danger)' : t.status === 'pending' ? 'var(--edu-warning)' : 'var(--edu-success)',
        marginTop: '4px',
      }}>
        {t.status === 'overdue' ? 'Vencida' : t.status === 'pending' ? 'Pendiente' : 'Pagada'}
      </span>
    </div>
  </div>
))}
```

### AttendanceSummary (card del alumno)

```tsx
/* Bloque simple, sin sombra grande */
<div style={{ border: '1px solid var(--edu-gray-200)', borderRadius: 'var(--radius-md)', padding: '24px', background: 'var(--edu-white)' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
    <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-700)', margin: 0 }}>
      Asistencia del Período
    </h3>
    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '32px', color: attendancePct >= 80 ? 'var(--edu-success)' : 'var(--edu-danger)' }}>
      {attendancePct}%
    </span>
  </div>
  {/* Progress bar */}
  <div style={{ height: '6px', background: 'var(--edu-gray-100)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
    <div style={{ height: '100%', width: `${attendancePct}%`, background: attendancePct >= 80 ? 'var(--edu-success)' : 'var(--edu-danger)', borderRadius: '3px', transition: 'width 700ms ease' }} />
  </div>
  {/* Stats en fila */}
  <div style={{ display: 'flex', gap: '24px', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-600)', fontFamily: 'var(--font-body)' }}>
    <span>✓ {present} presentes</span>
    <span>✗ {absent} ausentes</span>
    <span>⏱ {late} tarde</span>
  </div>
</div>
```

### AttendanceSheet (docente — pasar lista)

```tsx
/* Mobile-first: lista vertical */
<div style={{ maxWidth: '680px' }}>
  {/* Header: salón + fecha */}
  <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
    <select style={{ /* border-bottom 1px navy, no border completo */ }}>
      {classrooms.map(c => <option key={c.id}>{c.name}</option>)}
    </select>
    <input type="date" style={{ /* mismo estilo que select */ }} />
  </div>

  {/* Contador en tiempo real */}
  <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', marginBottom: '24px' }}>
    {presentCount} presentes · {absentCount} ausentes · {lateCount} tarde
  </div>

  {/* Lista de alumnos */}
  {students.map(student => (
    <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--edu-gray-100)' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-900)' }}>
        {student.name}
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        {['P', 'A', 'T'].map(status => (
          <button key={status}
            onClick={() => { setAttendance(student.id, status); haptics?.tap(); }}
            style={{
              minWidth: '52px',
              minHeight: '52px',  /* touch target */
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              background: attendance[student.id] === status
                ? status === 'P' ? 'var(--edu-success)' : status === 'A' ? 'var(--edu-danger)' : 'var(--edu-warning)'
                : 'var(--edu-gray-100)',
              color: attendance[student.id] === status ? 'white' : 'var(--edu-gray-500)',
              transition: 'background 150ms, color 150ms',
            }}
          >
            {status === 'P' ? 'Pres' : status === 'A' ? 'Aus' : 'Tarde'}
          </button>
        ))}
      </div>
    </div>
  ))}

  {/* Botón guardar: sticky abajo */}
  <div style={{ position: 'sticky', bottom: 0, padding: '16px 0', background: 'linear-gradient(to top, var(--edu-gray-50) 80%, transparent)' }}>
    <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ width: '100%' }}>
      {saving ? 'Guardando...' : 'Guardar Asistencia'}
    </button>
  </div>
</div>
```

Todos inician en 'P' por defecto (`useState` con object reducido de `{ [studentId]: 'P' }`).

### WeeklySchedule

```tsx
/* Desktop: CSS Grid 5 columnas (L-V) × N filas (bloques de hora) */
/* Mobile: Tabs de día (5 pills) → lista vertical del día seleccionado */

/* Bloque de horario activo (hora actual dentro del rango): */
/* background: var(--edu-navy), color: white */
/* Bloque normal: background: white, border: 1px solid var(--edu-gray-100) */
/* Bloque vacío: background: transparent */

/* Sin sombras. La diferencia de color es suficiente. */
```

---

## PARTE 7: INTEGRACIÓN TÉCNICA

### Leer Primero (Obligatorio)

1. `food-inventory-storefront/src/middleware.ts` — resolución de tenant
2. `food-inventory-storefront/src/contexts/AuthContext.tsx` — patrón auth existente
3. `food-inventory-storefront/src/lib/templateFactory.ts` — registro de templates
4. `food-inventory-storefront/src/app/[domain]/page.tsx` — selección de template
5. `food-inventory-storefront/src/templates/BeautyStorefront/BeautyStorefront.tsx` — SOLO para entender estructura de archivos e imports. **NO copiar diseño.**

### EducationAuthContext.tsx

```typescript
// contexts/EducationAuthContext.tsx
'use client';

interface EducationUser {
  type: 'edu_student' | 'teacher';
  id: string;
  name: string;
  tenantId: string;
  academicYear?: string;
  role?: string;
}

// Login student: POST /education/auth/student/login
// Login teacher: POST /auth/login → verificar role.name === 'TEACHER'
// Token: localStorage key 'edu_auth_token'
// Decodificar JWT sin network call (jose o jsonwebtoken, lo que use el repo)
// isStudent: user?.type === 'edu_student'
// isTeacher: user?.role === 'TEACHER'
```

### educationApi.ts

```typescript
// lib/educationApi.ts
// Wrap sobre fetch que inyecta Authorization: Bearer <edu_auth_token>
// Endpoints necesarios:
// GET  /education/public/config/:domain          — sin auth
// POST /education/auth/student/login             — sin auth
// POST /auth/login                               — sin auth (teacher)
// GET  /education/classrooms                     — auth
// GET  /education/classrooms/:id/students        — auth
// POST /education/attendance                     — auth (teacher)
// GET  /education/grades                         — auth
// GET  /education/schedules                      — auth
// GET  /education/tuition/my                     — auth (student)
// GET  /education/dashboard/summary              — auth
```

### templateFactory.ts

Añadir:
```typescript
import { EducationPortal } from '@/templates/EducationPortal/EducationPortal';
// En el switch/map:
case 'education':
  return <EducationPortal config={tenantConfig} />;
```

### app/[domain]/page.tsx

Añadir antes del return final:
```typescript
if (tenantConfig.templateType === 'education') {
  redirect(`/${domain}/education`);
}
```

### Endpoint Backend Requerido

```typescript
// GET /education/public/config/:domain — sin auth, crear en edu-dashboard.controller.ts
// Retorna: { institutionName, logoUrl, tagline, primaryColor, bannerUrl,
//            foundedYear, totalStudents, totalTeachers, programs, quote, contactInfo }
// Query: busca tenant por domain field. Solo campos públicos. Sin datos de alumnos.
```

---

## PARTE 8: ESTRUCTURA DE ARCHIVOS

```
food-inventory-storefront/src/
  app/[domain]/
    page.tsx                                       ← MODIFICAR (redirect si education)
    education/
      layout.tsx                                   ← NUEVO (EducationAuthContext provider)
      page.tsx                                     ← NUEVO (landing — Server Component)
      login/
        page.tsx                                   ← NUEVO
      teacher/
        layout.tsx                                 ← NUEVO (guard TEACHER)
        page.tsx                                   ← NUEVO
        schedule/page.tsx                          ← NUEVO
        attendance/page.tsx                        ← NUEVO
        grades/page.tsx                            ← NUEVO
        grades/[classroomId]/[subjectId]/page.tsx  ← NUEVO
      student/
        layout.tsx                                 ← NUEVO (guard edu_student)
        page.tsx                                   ← NUEVO
        schedule/page.tsx                          ← NUEVO
        grades/page.tsx                            ← NUEVO
        attendance/page.tsx                        ← NUEVO
        payments/page.tsx                          ← NUEVO
  contexts/
    EducationAuthContext.tsx                       ← NUEVO
  lib/
    educationApi.ts                                ← NUEVO
    templateFactory.ts                             ← MODIFICAR
  templates/
    EducationPortal/
      education.css                               ← NUEVO (todos los tokens)
      EducationPortal.tsx                         ← NUEVO
      components/
        EduNav.tsx
        EduHero.tsx
        EduStatsBand.tsx
        EduPrograms.tsx
        EduQuote.tsx
        EduAbout.tsx
        EduAccess.tsx
        EduFooter.tsx
        EduLoginForm.tsx
        EduSidebar.tsx
        EduBottomNav.tsx
        WeeklySchedule.tsx
        GradeRow.tsx
        AttendanceSummary.tsx
        AttendanceSheet.tsx
        TuitionStatusCard.tsx
```

---

## PARTE 9: CRITERIO DE DONE

1. La landing pública se ve como el sitio de una institución educativa real. Un observador externo que no sepa nada del proyecto no puede adivinar que fue generado por una IA ni que usa un template preexistente.
2. El visitante sin cuenta puede ver nombre, programas, estadísticas institucionales y los dos accesos al portal.
3. Login estudiante → redirige a `/education/student`, ve sus calificaciones y cuotas reales del backend.
4. Login docente → redirige a `/education/teacher`, ve su horario y puede navegar a pasar lista.
5. Alumno intentando `/education/teacher/grades` → redirige a login. No error 500 ni 404.
6. En mobile 375px: todo el portal es usable sin scroll horizontal. Touch targets ≥ 48px en todos los botones interactivos.
7. Animación del hero H1 (clip-path reveal) no causa CLS perceptible.
8. El archivo `education.css` centraliza TODOS los tokens. No hay ningún hex hardcodeado en el JSX. Verificar con grep.
9. `npm run build` en `food-inventory-storefront/` — sin errores TypeScript.
10. Abrir devtools → Performance → no hay re-renders innecesarios en el dashboard de alumno al navegar entre tabs del horario.
