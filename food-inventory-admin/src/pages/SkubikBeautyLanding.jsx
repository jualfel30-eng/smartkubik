import React, { useState, useEffect, useRef, useMemo } from 'react';

// ════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════

const BEAUTY_DATA = {
  brand: {
    name: 'SmartKubik',
    vertical: 'Belleza',
    whatsapp: '584120402324',
    whatsappDisplay: '+58 412 040 2324',
    waMsg: (text) => `https://wa.me/584120402324?text=${encodeURIComponent(text)}`,
  },

  hero: {
    headlineVariants: [
      {
        eyebrow: 'Software de agendamiento para belleza',
        title: 'Tu salón, abierto siempre. Aunque tú estés dormida.',
        subtitle: 'Agenda 24/7, señas que no se pierden, y cero mensajes de WhatsApp a las 11pm. Para salones, barberías, spas y nail studios en Venezuela y LATAM.',
      },
      {
        eyebrow: 'Agenda sin caos',
        title: 'Menos "¿tenés hueco pa\' mañana?". Más tijera en mano.',
        subtitle: 'Tus clientas reservan solas. Tú cobras seña antes. Y el domingo lo tienes libre, de verdad.',
      },
      {
        eyebrow: 'SmartKubik · Belleza',
        title: 'La agenda que tu salón se merecía desde hace años.',
        subtitle: 'Reservas online, pagos anticipados y un panel que entiende cómo trabajas. Sin comisiones por cita, sin amarres.',
      },
    ],
    stats: [
      { value: '24/7', label: 'Agenda abierta' },
      { value: '–38%', label: 'Cancelaciones sin aviso' },
      { value: '+2h', label: 'Ahorradas al día' },
    ],
    primaryCTA: 'Hablar por WhatsApp',
    secondaryCTA: 'Ver demo de 60s',
    microcopy: 'Sin tarjeta · 14 días · Migramos tu agenda gratis',
  },

  pain: {
    title: '¿Te suena alguno de estos?',
    subtitle: 'Llevamos 3 años hablando con dueñas de salón. Siempre salen los mismos siete.',
    items: [
      { q: '"Son las 10:47pm y tengo 14 WhatsApps sin responder."', a: 'Tu cliente reserva sola, sin escribirte.' },
      { q: '"Me dejó plantada. Otra vez. Y hoy rechacé dos clientas por ese hueco."', a: 'Seña del 30% antes de reservar. No viene = no pierdes.' },
      { q: '"Mi cuaderno se me mojó y con él, tres meses de citas."', a: 'Todo en la nube. Sincronizado con tu equipo.' },
      { q: '"No sé cuánto vendí el mes pasado. Ni quién es mi mejor clienta."', a: 'Dashboard con ingresos, frecuencia y ticket promedio.' },
      { q: '"Mi recepcionista renunció y toda la información se fue con ella."', a: 'Tus datos son tuyos. Exporta cuando quieras, sin permisos.' },
      { q: '"Contraté a una chica nueva y no sé dónde meter su agenda."', a: 'Múltiples calendarios, cada uno con sus servicios y precios.' },
      { q: '"Cobro en efectivo, Zelle, Pago Móvil, Binance... y el Excel me odia."', a: 'Caja unificada. Cierre de día en 30 segundos.' },
    ],
  },

  benefits: {
    title: 'Tres cosas que cambian el día que migras',
    items: [
      {
        num: '01',
        kicker: 'Agenda 24/7',
        title: 'Tus clientas reservan mientras duermes.',
        body: 'Link personalizado que compartes en Instagram, WhatsApp o pegas en Google Maps. Ellas eligen servicio, estilista y hora. Tú recibes la confirmación.',
        outcome: '+47%',
        outcomeLabel: 'reservas fuera de horario en el primer mes',
      },
      {
        num: '02',
        kicker: 'Señas que se cobran solas',
        title: 'No más plantones. No más "se me olvidó".',
        body: 'Configura el % de seña por servicio. El sistema cobra por Zelle, Pago Móvil, tarjeta o Binance antes de confirmar. Si no pagan, no reservan.',
        outcome: '–38%',
        outcomeLabel: 'cancelaciones de último minuto',
      },
      {
        num: '03',
        kicker: 'Tus datos son tuyos',
        title: 'Tus clientas, tus números, tu negocio.',
        body: 'Exporta contactos, historial y ventas cuando quieras, en un clic. Sin candados, sin permisos, sin "contáctanos para desactivar". Aquí mandas tú.',
        outcome: '100%',
        outcomeLabel: 'propiedad de tu base de clientes',
      },
    ],
  },

  timeline: {
    title: 'Crece sin cambiar de sistema',
    subtitle: 'Empiezas sola en casa. Terminas con tres locales. El mismo software te acompaña.',
    stages: [
      {
        stage: 'Etapa 1',
        name: 'Solita en casa',
        who: '1 persona · 0 empleados',
        features: ['Agenda online', 'Cobro de seña', 'Ficha de clienta', 'Recordatorios WhatsApp'],
      },
      {
        stage: 'Etapa 2',
        name: 'Primer local',
        who: '2–5 estilistas · 1 local',
        features: ['Múltiples calendarios', 'Comisiones por estilista', 'Inventario de productos', 'Caja unificada', 'Reportes de venta'],
      },
      {
        stage: 'Etapa 3',
        name: 'Multi-sede',
        who: '6+ estilistas · 2+ locales',
        features: ['Sedes ilimitadas', 'Dashboard ejecutivo', 'Roles y permisos', 'API + integraciones', 'Soporte prioritario'],
      },
    ],
  },

  chat: {
    title: 'Habla con nuestra asistente de belleza',
    subtitle: 'Respuestas honestas, en segundos. Sin formularios, sin "un asesor te contactará".',
    assistantName: 'Kubia',
    assistantRole: 'Asistente SmartKubik',
    seed: [
      { from: 'bot', text: '¡Hola! Soy Kubia 👋 Cuéntame de tu salón y te digo si somos buena match. ¿Qué haces?' },
    ],
    prompts: [
      '¿Cuánto cuesta para un salón de 3 estilistas?',
      '¿Cómo funcionan las señas en Venezuela?',
      '¿Puedo migrar desde mi cuaderno/Excel?',
      '¿Cobran comisión por cita?',
    ],
    founder: {
      name: 'Jualfel Morales',
      role: 'Fundador · SmartKubik',
      quote: 'Mi mamá tuvo un salón por 22 años. Vi de cerca cómo un cuaderno perdido un viernes destruye una semana. SmartKubik existe para que eso no le pase a nadie más.',
    },
  },

  start: {
    title: 'Empezar toma 12 minutos. Lo medimos.',
    steps: [
      { n: '1', t: 'Nos escribes por WhatsApp', d: 'Te mandamos un link corto. Llenas datos del salón y servicios.' },
      { n: '2', t: 'Migramos tu agenda', d: 'Si tienes cuaderno, Excel, o veníais de otro sistema, nosotros lo pasamos. Gratis.' },
      { n: '3', t: 'Compartes el link', d: 'Pegas tu link en Instagram, WhatsApp Business y Google. Listo.' },
    ],
    cta: 'Empezar ahora',
  },

  pricing: {
    title: 'Precios honestos. Sin sorpresas.',
    subtitle: 'Paga por lo que usas. Cancela cuando quieras. No cobramos comisión por cita.',
    plans: [
      {
        name: 'Solo',
        price: '15',
        per: '/mes',
        desc: 'Para quien empieza sola.',
        features: ['1 agenda', 'Reservas online', 'Cobro de seña', '200 clientas', 'WhatsApp recordatorios'],
        cta: 'Probar Solo',
      },
      {
        name: 'Estudio',
        price: '35',
        per: '/mes',
        desc: 'El favorito. Para salones pequeños.',
        featured: true,
        badge: 'Más elegido',
        features: ['Hasta 5 agendas', 'Todo lo de Solo', 'Comisiones por estilista', 'Inventario básico', 'Reportes', '1.000 clientas'],
        cta: 'Probar Estudio',
      },
      {
        name: 'Salón',
        price: '65',
        per: '/mes',
        desc: 'Para operaciones establecidas.',
        features: ['Hasta 15 agendas', 'Todo lo de Estudio', 'Inventario avanzado', 'Paquetes y bonos', 'Soporte prioritario', '5.000 clientas'],
        cta: 'Probar Salón',
      },
      {
        name: 'Multi',
        price: '95',
        per: '+ /mes',
        desc: 'Para cadenas y franquicias.',
        features: ['Agendas ilimitadas', 'Múltiples sedes', 'Dashboard ejecutivo', 'API + integraciones', 'Gerente de cuenta', 'Clientas ilimitadas'],
        cta: 'Hablar con ventas',
      },
    ],
    blocks: [
      { t: 'Qué incluye todo', d: 'Reservas online, cobro de seña, recordatorios WhatsApp, ficha de clienta, reportes, exportación de datos, soporte humano en español.' },
      { t: 'Qué no recortamos', d: 'Ningún plan tiene comisión por cita. Ninguno te obliga a pagar por pasarela de cobro. Ninguno te amarra más allá del mes en curso.' },
      { t: 'Cuando crezcas', d: 'Cambia de plan en un clic. No pierdes datos, no pagas setup, no re-entrenas al equipo. El mismo producto, más capacidad.' },
    ],
  },

  faq: {
    title: 'Preguntas que nos hacen mucho',
    items: [
      { q: '¿Funciona en Venezuela con pagos locales?', a: 'Sí. Aceptamos Pago Móvil, Zelle, transferencias, tarjeta internacional, Binance Pay y efectivo. Configuras qué métodos muestras a tus clientas.' },
      { q: '¿Cobran comisión por cada reserva?', a: 'No. Cero. Tu plan mensual es todo lo que pagas. Las señas van directo a tu cuenta (o pasarela si usas una), nosotros no tocamos ese dinero.' },
      { q: '¿Puedo migrar desde mi cuaderno o Excel?', a: 'Sí, gratis. Nos mandas fotos del cuaderno o el archivo, y un humano de nuestro equipo te sube clientas, servicios y precios en 48h.' },
      { q: '¿Qué pasa si mi internet se cae?', a: 'La app funciona offline para crear citas y ver tu agenda del día. Cuando vuelve la señal, sincroniza sola. Nada se pierde.' },
      { q: '¿Mis clientas necesitan bajar una app?', a: 'No. Reservan desde el navegador, con su número de WhatsApp. Cero fricción.' },
      { q: '¿Puedo exportar mis datos si decido irme?', a: 'Sí. Un clic, un CSV con todo: clientas, historial, ventas, contactos. Sin preguntas, sin candados.' },
      { q: '¿Tienen soporte humano?', a: 'Sí. Respondemos por WhatsApp en menos de 2h en horario laboral. Lunes a sábado 8am–8pm (VE/COL/MX).' },
      { q: '¿Cuánto tiempo me toma aprender?', a: 'El setup inicial con nosotros toma 45min. Después, tu equipo domina lo básico en un turno. Tenemos videos de 1 minuto por cada funcionalidad.' },
      { q: '¿Qué pasa si no me gusta?', a: 'Los primeros 14 días son gratis. Después, cancelas cuando quieras, sin permanencia. Te damos un CSV con tus datos y chao.' },
    ],
  },

  closure: {
    title: 'Tu sábado empieza a las 8am. Que tu agenda ya esté lista.',
    subtitle: 'Hablemos hoy. Probablemente en media hora tienes tu salón online.',
    cta: 'Hablar por WhatsApp',
  },
};

// ════════════════════════════════════════════════════════
// CSS (injected dynamically, scoped to .skubik-page)
// ════════════════════════════════════════════════════════

const SKUBIK_STYLES = `
/* V4 Story — scroll-driven storytelling landing */
:root {
  --s-bg: #0b0a09;
  --s-bg2: #141210;
  --s-fg: #f5efe3;
  --s-muted: #8a8275;
  --s-dim: #4a443b;
  --s-accent: #ff5a2c;
  --s-accent2: #d0ff3a;
  --s-green: #25d366;
  --s-line: rgba(245,239,227,0.08);
  --s-card: rgba(245,239,227,0.03);
}

.skubik-page * { box-sizing: border-box; margin: 0; padding: 0; }
html.skubik-page-active { scroll-behavior: smooth; }
html.skubik-page-active, body.skubik-page-active { background: var(--s-bg); color: var(--s-fg); font-family: 'Inter Tight', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
body.skubik-page-active { cursor: none; overflow-x: clip; }
@media (hover: none) { body.skubik-page-active { cursor: auto; } }

/* Custom cursor */
.s-cursor { position: fixed; width: 10px; height: 10px; border-radius: 50%; background: var(--s-accent); pointer-events: none; z-index: 9999; mix-blend-mode: difference; transition: transform 0.15s ease, width 0.2s, height 0.2s; transform: translate(-50%,-50%); }
.s-cursor.hover { width: 60px; height: 60px; background: var(--s-fg); }
.s-cursor-ring { position: fixed; width: 40px; height: 40px; border: 1px solid var(--s-fg); border-radius: 50%; pointer-events: none; z-index: 9998; mix-blend-mode: difference; transform: translate(-50%,-50%); transition: transform 0.4s cubic-bezier(0.2,0.8,0.2,1); opacity: 0.5; }

/* Progress rail */
.s-progress { position: fixed; top: 0; left: 0; right: 0; height: 2px; background: transparent; z-index: 100; pointer-events: none; }
.s-progress-bar { height: 100%; background: var(--s-accent); width: 0%; transition: width 0.08s linear; }

/* Nav */
.s-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 60; padding: 18px 32px; display: flex; justify-content: space-between; align-items: center; backdrop-filter: blur(14px); background: rgba(11,10,9,0.6); border-bottom: 1px solid var(--s-line); }
.s-nav-logo { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; letter-spacing: -0.02em; display: flex; align-items: center; gap: 10px; }
.s-nav-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--s-accent); animation: s-pulse 2s ease-in-out infinite; }
@keyframes s-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
.s-nav-logo-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); letter-spacing: 0.15em; text-transform: uppercase; margin-left: 4px; }
.s-nav-links { display: flex; gap: 24px; font-size: 13px; }
.s-nav-links a { color: var(--s-muted); text-decoration: none; transition: color 0.2s; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
.s-nav-links a:hover { color: var(--s-fg); }
@media (max-width: 720px) { .s-nav-links { display: none; } }
.s-wa-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--s-green); color: #fff; text-decoration: none; border-radius: 99px; font-weight: 600; font-size: 13px; border: none; cursor: none; transition: transform 0.2s; }
.s-wa-btn:hover { transform: translateY(-1px); }

/* Containers */
.s-container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
.s-container-narrow { max-width: 960px; margin: 0 auto; padding: 0 32px; }

/* Typography */
.skubik-page h1, .skubik-page h2, .skubik-page h3 { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.03em; line-height: 0.98; }
.s-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.22em; color: var(--s-accent); display: inline-flex; align-items: center; gap: 10px; }
.s-eyebrow::before { content: ''; width: 24px; height: 1px; background: var(--s-accent); }

/* === HERO === */
.s-hero { min-height: 100vh; padding: 140px 0 80px; position: relative; overflow: hidden; }
.s-hero-grid-bg { position: absolute; inset: 0; background-image: linear-gradient(var(--s-line) 1px, transparent 1px), linear-gradient(90deg, var(--s-line) 1px, transparent 1px); background-size: 80px 80px; opacity: 0.5; mask: radial-gradient(ellipse at center top, #000 0%, transparent 70%); }
.s-hero-inner { position: relative; display: grid; grid-template-columns: 1.1fr 1fr; gap: 60px; align-items: center; }
@media (max-width: 960px) { .s-hero-inner { grid-template-columns: 1fr; } }
.s-hero-left h1 { font-size: clamp(52px, 7.5vw, 104px); margin: 24px 0 28px; }
.s-hero-left h1 em { font-style: italic; color: var(--s-accent); }
.s-hero-word { display: inline-block; opacity: 0; transform: translateY(40px); transition: opacity 0.7s cubic-bezier(0.2,0.8,0.2,1), transform 0.7s cubic-bezier(0.2,0.8,0.2,1); }
.s-hero-word.in { opacity: 1; transform: none; }
.s-hero-sub { font-size: 19px; line-height: 1.5; color: var(--s-muted); max-width: 520px; margin-bottom: 40px; }
.s-hero-cta { display: flex; gap: 14px; flex-wrap: wrap; }
.s-btn { display: inline-flex; align-items: center; gap: 10px; padding: 16px 26px; border-radius: 99px; font-weight: 600; font-size: 15px; text-decoration: none; border: 1px solid transparent; cursor: none; transition: all 0.25s cubic-bezier(0.2,0.8,0.2,1); position: relative; overflow: hidden; }
.s-btn-primary { background: var(--s-fg); color: var(--s-bg); }
.s-btn-primary:hover { background: var(--s-accent); color: #fff; transform: translateY(-2px); }
.s-btn-ghost { background: transparent; color: var(--s-fg); border-color: var(--s-line); }
.s-btn-ghost:hover { border-color: var(--s-fg); }
.s-hero-micro { margin-top: 18px; font-size: 12px; color: var(--s-muted); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em; }

/* Hero calendar viz */
.s-hero-right { position: relative; height: 560px; }
.s-cal { position: absolute; inset: 0; background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 20px; overflow: hidden; padding: 20px; display: flex; flex-direction: column; }
.s-cal-head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid var(--s-line); margin-bottom: 14px; }
.s-cal-title { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--s-muted); }
.s-cal-live { display: inline-flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-green); }
.s-cal-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--s-green); animation: s-pulse 1.4s infinite; }
.s-cal-days { display: grid; grid-template-columns: 60px repeat(5, 1fr); gap: 1px; background: var(--s-line); flex: 1; }
.s-cal-cell { background: var(--s-bg2); padding: 6px 8px; min-height: 44px; position: relative; overflow: hidden; }
.s-cal-h { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); display: flex; align-items: center; justify-content: flex-end; }
.s-cal-dayh { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); text-align: center; padding: 4px 0; background: var(--s-bg); text-transform: uppercase; letter-spacing: 0.1em; }
.s-cal-appt { position: absolute; inset: 4px; border-radius: 6px; padding: 6px 8px; font-size: 10px; background: var(--s-accent); color: #fff; opacity: 0; transform: translateY(-6px) scale(0.95); transition: all 0.4s cubic-bezier(0.2,0.8,0.2,1); display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
.s-cal-appt.in { opacity: 1; transform: none; }
.s-cal-appt .name { font-weight: 600; font-size: 10px; }
.s-cal-appt .svc { font-family: 'JetBrains Mono', monospace; font-size: 8px; opacity: 0.85; }
.s-cal-appt.accent2 { background: var(--s-accent2); color: #0b0a09; }
.s-cal-appt.muted { background: rgba(245,239,227,0.1); color: var(--s-fg); border: 1px dashed var(--s-line); }
.s-cal-foot { display: flex; justify-content: space-between; margin-top: 12px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); }
.s-cal-foot strong { color: var(--s-fg); }

/* New-booking toast overlay */
.s-toast { position: absolute; right: -10px; top: 40px; background: var(--s-fg); color: var(--s-bg); padding: 12px 16px; border-radius: 12px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); opacity: 0; transform: translateX(20px); transition: all 0.4s; max-width: 220px; z-index: 5; }
.s-toast.show { opacity: 1; transform: none; }
.s-toast-time { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); }

/* Hero scroll hint */
.s-hero-hint { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.2em; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.s-hero-hint-line { width: 1px; height: 40px; background: linear-gradient(to bottom, var(--s-muted), transparent); animation: s-hintScroll 2s ease-in-out infinite; }
@keyframes s-hintScroll { 0% { transform: translateY(-10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(10px); opacity: 0; } }

/* === MARQUEE === */
.s-marquee { padding: 20px 0; overflow: hidden; border-top: 1px solid var(--s-line); border-bottom: 1px solid var(--s-line); background: var(--s-bg2); }
.s-marquee-track { display: flex; gap: 40px; animation: s-scroll 40s linear infinite; white-space: nowrap; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--s-muted); }
.s-marquee-track span { display: inline-flex; align-items: center; gap: 40px; }
.s-marquee-track span::after { content: '\\2726'; color: var(--s-accent); }
@keyframes s-scroll { to { transform: translateX(-50%); } }

/* === PAIN / VOICE NOTES === */
.s-pain { padding: 120px 0 80px; position: relative; }
.s-pain-head { margin-bottom: 80px; max-width: 780px; }
.s-pain-head h2 { font-size: clamp(40px, 5.5vw, 72px); margin: 20px 0; }
.s-pain-head h2 em { font-style: italic; color: var(--s-accent); }
.s-pain-head p { color: var(--s-muted); font-size: 17px; max-width: 520px; line-height: 1.6; margin-top: 10px; }
.s-voice-list { display: flex; flex-direction: column; gap: 16px; max-width: 680px; margin: 0 auto; }
.s-voice { display: flex; gap: 14px; align-items: flex-end; opacity: 0; transform: translateY(30px); transition: all 0.6s cubic-bezier(0.2,0.8,0.2,1); }
.s-voice.in { opacity: 1; transform: none; }
.s-voice.reverse { flex-direction: row-reverse; align-items: flex-start; }
.s-voice-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, #c25a3a, #8a3e25); display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 16px; font-weight: 500; color: #fff; }
.s-voice.reverse .s-voice-avatar { background: linear-gradient(135deg, #25d366, #128c7e); }
.s-voice-bubble { flex: 1; max-width: 500px; background: #1f2c33; border-radius: 14px 14px 14px 4px; padding: 12px 14px; position: relative; }
.s-voice.reverse .s-voice-bubble { background: #005c4b; border-radius: 14px 14px 4px 14px; }
.s-voice-row { display: flex; align-items: center; gap: 10px; }
.s-voice-play { width: 34px; height: 34px; border-radius: 50%; background: var(--s-fg); color: var(--s-bg); border: none; display: flex; align-items: center; justify-content: center; cursor: none; flex-shrink: 0; }
.s-voice-play svg { width: 14px; height: 14px; }
.s-voice-wave { flex: 1; height: 28px; display: flex; align-items: center; gap: 2px; }
.s-voice-wave span { flex: 1; background: rgba(245,239,227,0.35); border-radius: 2px; transition: height 0.2s, background 0.2s; }
.s-voice-wave.playing span { background: var(--s-accent2); }
.s-voice-time { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(245,239,227,0.5); }
.s-voice-transcript { font-size: 14px; line-height: 1.55; padding: 8px 4px 4px; color: rgba(245,239,227,0.9); font-style: italic; }
.s-voice-meta { display: flex; gap: 8px; justify-content: flex-end; align-items: center; margin-top: 4px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(245,239,227,0.45); }

/* === BENEFITS STICKY === */
.s-benefits { padding: 120px 0 0; position: relative; }
.s-ben-head { text-align: center; margin-bottom: 60px; }
.s-ben-head h2 { font-size: clamp(40px, 5.5vw, 72px); margin: 20px 0; }
.s-ben-head h2 em { font-style: italic; color: var(--s-accent); }
.s-ben-stage { position: relative; height: 180vh; }
.s-ben-sticky { position: sticky; top: 60px; height: calc(100vh - 60px); display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; padding: 0 32px; max-width: 1280px; margin: 0 auto; }
@media (max-width: 900px) { .s-ben-stage { height: auto; } .s-ben-sticky { position: relative; top: 0; height: auto; padding: 40px 32px; grid-template-columns: 1fr; gap: 24px; } }
.s-ben-text h3 { font-size: clamp(32px, 4.5vw, 56px); margin: 16px 0; }
.s-ben-text h3 em { color: var(--s-accent); font-style: italic; }
.s-ben-kicker { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--s-accent2); }
.s-ben-body { color: var(--s-muted); font-size: 17px; line-height: 1.6; margin: 16px 0 24px; max-width: 460px; }
.s-ben-outcome { display: inline-flex; align-items: baseline; gap: 10px; padding: 14px 20px; background: var(--s-accent); color: #fff; border-radius: 99px; }
.s-ben-outcome-v { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 500; font-style: italic; }
.s-ben-outcome-l { font-size: 12px; opacity: 0.9; }
.s-ben-visual { height: 500px; background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 24px; padding: 24px; position: relative; overflow: hidden; }
.s-ben-indicator { position: absolute; top: 32px; right: 32px; display: flex; flex-direction: column; gap: 6px; z-index: 5; }
.s-ben-indicator-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--s-dim); transition: all 0.3s; }
.s-ben-indicator-dot.active { background: var(--s-accent); height: 18px; border-radius: 3px; }

/* Money counter (benefit 2) */
.s-money { padding: 20px; background: var(--s-bg); border: 1px solid var(--s-line); border-radius: 16px; height: 100%; display: flex; flex-direction: column; }
.s-money-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.15em; }
.s-money-big { font-family: 'Fraunces', serif; font-size: 72px; font-weight: 400; letter-spacing: -0.03em; margin-top: 8px; color: var(--s-accent); font-variant-numeric: tabular-nums; }
.s-money-sub { color: var(--s-muted); font-size: 14px; margin-top: 4px; }
.s-money-list { margin-top: auto; display: flex; flex-direction: column; gap: 10px; padding-top: 20px; border-top: 1px solid var(--s-line); }
.s-money-item { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 10px 14px; border-radius: 10px; background: var(--s-card); transition: all 0.3s; }
.s-money-item.in { transform: translateX(-6px); background: rgba(255,90,44,0.12); border-left: 3px solid var(--s-accent); }
.s-money-item-name { display: flex; flex-direction: column; gap: 2px; }
.s-money-item-name strong { font-weight: 600; }
.s-money-item-name span { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); }
.s-money-item-v { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: var(--s-accent2); }

/* Export visual (benefit 3) */
.s-export { height: 100%; display: flex; flex-direction: column; gap: 12px; }
.s-export-file { background: var(--s-bg); border: 1px solid var(--s-line); border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; transition: all 0.3s; }
.s-export-file-icon { width: 32px; height: 32px; border-radius: 6px; background: var(--s-accent2); color: #0b0a09; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px; flex-shrink: 0; }
.s-export-file-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.s-export-file-name { color: var(--s-fg); font-weight: 600; }
.s-export-file-size { color: var(--s-muted); font-size: 10px; }
.s-export-progress { height: 2px; background: var(--s-line); border-radius: 99px; overflow: hidden; margin-top: 8px; }
.s-export-progress-bar { height: 100%; background: var(--s-accent2); width: 0%; transition: width 1s cubic-bezier(0.2,0.8,0.2,1); }
.s-export-term { flex: 1; background: var(--s-bg); border: 1px solid var(--s-line); border-radius: 12px; padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); overflow: hidden; }
.s-export-line { opacity: 0; animation: s-termLine 0.4s forwards; }
.s-export-line .ok { color: var(--s-accent2); }
.s-export-line .arrow { color: var(--s-accent); }
@keyframes s-termLine { to { opacity: 1; } }

/* === TIMELINE === */
.s-timeline { padding: 120px 0; background: var(--s-bg2); border-top: 1px solid var(--s-line); border-bottom: 1px solid var(--s-line); position: relative; }
.s-tl-head { margin-bottom: 80px; max-width: 780px; }
.s-tl-head h2 { font-size: clamp(40px, 5.5vw, 72px); margin: 20px 0; }
.s-tl-head h2 em { font-style: italic; color: var(--s-accent); }
.s-tl-stages { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; position: relative; }
@media (max-width: 820px) { .s-tl-stages { grid-template-columns: 1fr; } }
.s-tl-stage { background: var(--s-bg); border: 1px solid var(--s-line); border-radius: 20px; padding: 32px 24px; position: relative; opacity: 0.4; transform: scale(0.96); transition: all 0.5s cubic-bezier(0.2,0.8,0.2,1); }
.s-tl-stage.active { opacity: 1; transform: scale(1); border-color: var(--s-accent); }
.s-tl-stage-num { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-accent); text-transform: uppercase; letter-spacing: 0.2em; display: inline-flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.s-tl-stage-num::before { content: ''; width: 10px; height: 10px; border-radius: 50%; background: var(--s-accent); }
.s-tl-stage h3 { font-size: 30px; margin-bottom: 4px; }
.s-tl-stage-who { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); margin-bottom: 18px; }
.s-tl-stage-features { display: flex; flex-direction: column; gap: 8px; }
.s-tl-feat { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--s-muted); opacity: 0; transform: translateX(-6px); transition: all 0.3s; }
.s-tl-stage.active .s-tl-feat { opacity: 1; transform: none; color: var(--s-fg); }
.s-tl-feat-check { width: 16px; height: 16px; border-radius: 50%; background: var(--s-accent2); color: var(--s-bg); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
.s-tl-scrub { margin-top: 30px; display: flex; justify-content: center; gap: 6px; }
.s-tl-scrub-pill { padding: 10px 18px; border: 1px solid var(--s-line); background: transparent; color: var(--s-muted); border-radius: 99px; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; cursor: none; transition: all 0.2s; }
.s-tl-scrub-pill.active { background: var(--s-accent); color: #fff; border-color: var(--s-accent); }

/* === CHAT === */
.s-chat { padding: 120px 0; position: relative; }
.s-chat-wrap { display: grid; grid-template-columns: 1fr 1.1fr; gap: 60px; align-items: start; }
@media (max-width: 900px) { .s-chat-wrap { grid-template-columns: 1fr; } }
.s-chat-left h2 { font-size: clamp(40px, 5.5vw, 72px); margin: 20px 0; }
.s-chat-left h2 em { font-style: italic; color: var(--s-accent); }
.s-chat-left p { color: var(--s-muted); font-size: 17px; line-height: 1.6; margin: 20px 0 32px; }
.s-founder { display: flex; gap: 16px; padding: 24px; background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 20px; margin-top: 40px; }
.s-founder-ph { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--s-accent), #8a3e25); display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 26px; color: #fff; font-style: italic; flex-shrink: 0; }
.s-founder-name { font-weight: 600; }
.s-founder-role { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; margin: 4px 0 10px; }
.s-founder-q { font-family: 'Fraunces', serif; font-size: 15px; line-height: 1.5; color: var(--s-fg); font-style: italic; }

.s-chat-window { background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; height: 560px; }
.s-chat-head { padding: 14px 18px; border-bottom: 1px solid var(--s-line); display: flex; align-items: center; gap: 12px; }
.s-chat-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--s-accent), var(--s-accent2)); display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-weight: 600; color: var(--s-bg); }
.s-chat-head-info { flex: 1; }
.s-chat-head-name { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.s-chat-head-name::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--s-green); }
.s-chat-head-status { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.s-chat-body { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.s-chat-msg { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; opacity: 0; transform: translateY(10px); animation: s-msgIn 0.4s forwards; }
@keyframes s-msgIn { to { opacity: 1; transform: none; } }
.s-chat-msg.bot { background: var(--s-card); color: var(--s-fg); border-bottom-left-radius: 4px; align-self: flex-start; }
.s-chat-msg.user { background: var(--s-accent); color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; }
.s-chat-typing { display: inline-flex; align-items: center; gap: 4px; padding: 12px 14px; background: var(--s-card); border-radius: 16px; border-bottom-left-radius: 4px; align-self: flex-start; }
.s-chat-typing span { width: 6px; height: 6px; border-radius: 50%; background: var(--s-muted); animation: s-typingDot 1.4s infinite; }
.s-chat-typing span:nth-child(2) { animation-delay: 0.2s; }
.s-chat-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes s-typingDot { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
.s-chat-prompts { padding: 12px 16px; display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid var(--s-line); }
.s-chat-prompt { padding: 8px 14px; background: var(--s-card); border: 1px solid var(--s-line); border-radius: 99px; color: var(--s-fg); font-size: 12px; cursor: none; transition: all 0.2s; }
.s-chat-prompt:hover { background: var(--s-accent); border-color: var(--s-accent); color: #fff; }
.s-chat-input { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--s-line); }
.s-chat-input input { flex: 1; background: var(--s-card); border: 1px solid var(--s-line); border-radius: 99px; padding: 10px 16px; color: var(--s-fg); font-family: inherit; font-size: 14px; outline: none; }
.s-chat-input input:focus { border-color: var(--s-accent); }
.s-chat-input button { padding: 10px 18px; background: var(--s-accent); color: #fff; border: none; border-radius: 99px; font-weight: 600; font-size: 13px; cursor: none; }

/* === PRICING / ROI === */
.s-pricing { padding: 120px 0; }
.s-price-head { text-align: center; margin-bottom: 60px; }
.s-price-head h2 { font-size: clamp(40px, 5.5vw, 72px); margin: 20px 0; }
.s-price-head h2 em { font-style: italic; color: var(--s-accent); }
.s-price-head p { color: var(--s-muted); font-size: 17px; max-width: 520px; margin: 0 auto; }
.s-roi { background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 24px; padding: 40px; margin-bottom: 40px; max-width: 960px; margin-left: auto; margin-right: auto; }
.s-roi-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 14px; }
.s-roi-head h3 { font-family: 'Fraunces', serif; font-size: 24px; font-style: italic; }
.s-roi-badge { font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 4px 10px; border: 1px solid var(--s-accent); color: var(--s-accent); border-radius: 99px; text-transform: uppercase; letter-spacing: 0.15em; }
.s-roi-slider-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
.s-roi-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--s-muted); }
.s-roi-val { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--s-fg); font-size: 14px; }
.s-roi input[type=range] { width: 100%; -webkit-appearance: none; height: 6px; background: var(--s-line); border-radius: 99px; outline: none; }
.s-roi input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; background: var(--s-accent); border-radius: 50%; cursor: none; border: 3px solid var(--s-bg2); box-shadow: 0 0 0 2px var(--s-accent); }
.s-roi input[type=range]::-moz-range-thumb { width: 20px; height: 20px; background: var(--s-accent); border-radius: 50%; border: 3px solid var(--s-bg2); }
.s-roi-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
@media (max-width: 600px) { .s-roi-compare { grid-template-columns: 1fr; } }
.s-roi-col { padding: 24px; border-radius: 16px; position: relative; overflow: hidden; }
.s-roi-col.bad { background: rgba(255,90,44,0.08); border: 1px solid rgba(255,90,44,0.2); }
.s-roi-col.good { background: rgba(208,255,58,0.08); border: 1px solid rgba(208,255,58,0.2); }
.s-roi-col-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--s-muted); margin-bottom: 8px; }
.s-roi-col-val { font-family: 'Fraunces', serif; font-size: 52px; font-weight: 400; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.s-roi-col.bad .s-roi-col-val { color: var(--s-accent); }
.s-roi-col.good .s-roi-col-val { color: var(--s-accent2); }
.s-roi-col-sub { font-size: 13px; color: var(--s-muted); margin-top: 6px; }
.s-roi-saves { text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--s-line); }
.s-roi-saves-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.15em; }
.s-roi-saves-val { font-family: 'Fraunces', serif; font-style: italic; font-size: clamp(40px, 5vw, 64px); color: var(--s-fg); margin-top: 6px; }
.s-roi-saves-val em { color: var(--s-accent2); font-style: normal; }

.s-price-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 1000px) { .s-price-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .s-price-grid { grid-template-columns: 1fr; } }
.s-price-card { background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 20px; padding: 28px 22px; display: flex; flex-direction: column; gap: 20px; position: relative; transition: all 0.3s; }
.s-price-card:hover { border-color: var(--s-muted); transform: translateY(-4px); }
.s-price-card.featured { border-color: var(--s-accent); background: linear-gradient(180deg, rgba(255,90,44,0.08) 0%, var(--s-bg2) 50%); }
.s-price-badge { position: absolute; top: -10px; right: 20px; padding: 4px 10px; background: var(--s-accent); color: #fff; border-radius: 99px; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.s-price-name { font-family: 'Fraunces', serif; font-size: 24px; font-style: italic; }
.s-price-desc { color: var(--s-muted); font-size: 13px; margin-top: 4px; }
.s-price-amt { display: flex; align-items: baseline; gap: 4px; }
.s-price-sym { font-size: 18px; color: var(--s-muted); }
.s-price-val { font-family: 'Fraunces', serif; font-size: 56px; font-weight: 400; letter-spacing: -0.03em; }
.s-price-per { font-size: 13px; color: var(--s-muted); }
.s-price-feats { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.s-price-feat { font-size: 13px; color: var(--s-muted); padding-left: 18px; position: relative; line-height: 1.5; }
.s-price-feat::before { content: '\\2192'; position: absolute; left: 0; color: var(--s-accent); }
.s-price-cta { padding: 12px; background: transparent; border: 1px solid var(--s-line); color: var(--s-fg); border-radius: 99px; cursor: none; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.s-price-cta:hover { background: var(--s-fg); color: var(--s-bg); border-color: var(--s-fg); }
.s-price-card.featured .s-price-cta { background: var(--s-accent); border-color: var(--s-accent); color: #fff; }
.s-price-card.featured .s-price-cta:hover { background: #fff; color: var(--s-accent); }

/* === FAQ === */
.s-faq { padding: 120px 0; }
.s-faq-head { margin-bottom: 50px; }
.s-faq-head h2 { font-size: clamp(40px, 5.5vw, 72px); margin: 20px 0; }
.s-faq-head h2 em { font-style: italic; color: var(--s-accent); }
.s-faq-list { display: flex; flex-direction: column; }
.s-faq-item { border-top: 1px solid var(--s-line); padding: 22px 0; cursor: none; transition: all 0.3s; }
.s-faq-item:last-child { border-bottom: 1px solid var(--s-line); }
.s-faq-item:hover { padding-left: 14px; }
.s-faq-item.open { padding-left: 14px; }
.s-faq-q { display: flex; justify-content: space-between; align-items: center; gap: 20px; font-family: 'Fraunces', serif; font-size: clamp(20px, 2.5vw, 28px); font-weight: 400; }
.s-faq-q-n { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); margin-right: 12px; }
.s-faq-plus { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--s-line); display: flex; align-items: center; justify-content: center; color: var(--s-muted); transition: all 0.3s; flex-shrink: 0; }
.s-faq-item.open .s-faq-plus { background: var(--s-accent); border-color: var(--s-accent); color: #fff; transform: rotate(45deg); }
.s-faq-a { max-height: 0; overflow: hidden; transition: all 0.4s cubic-bezier(0.2,0.8,0.2,1); color: var(--s-muted); font-size: 16px; line-height: 1.6; max-width: 720px; }
.s-faq-item.open .s-faq-a { max-height: 200px; padding-top: 14px; }

/* === CLOSURE === */
.s-close { padding: 160px 0 120px; text-align: center; position: relative; overflow: hidden; }
.s-close-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(255,90,44,0.15) 0%, transparent 60%); pointer-events: none; }
.s-close h2 { font-size: clamp(56px, 9vw, 128px); letter-spacing: -0.035em; line-height: 0.92; position: relative; }
.s-close h2 em { font-style: italic; color: var(--s-accent); }
.s-close p { font-size: 18px; color: var(--s-muted); margin: 30px auto; max-width: 500px; line-height: 1.5; position: relative; }
.s-close .s-btn { margin-top: 14px; padding: 20px 36px; font-size: 16px; position: relative; }

/* Footer */
.s-foot { padding: 40px 0; border-top: 1px solid var(--s-line); font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; }
.s-foot-inner { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }

/* WA floating */
.s-wa-float { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: var(--s-green); color: #fff; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 10px 30px rgba(37,211,102,0.35); z-index: 90; transition: transform 0.2s; }
.s-wa-float:hover { transform: scale(1.08); }

/* How-to-start */
.s-how { padding: 120px 0; background: var(--s-bg2); border-top: 1px solid var(--s-line); border-bottom: 1px solid var(--s-line); }
.s-how-head { text-align: center; margin-bottom: 60px; }
.s-how-head h2 { font-size: clamp(40px, 5.5vw, 72px); margin: 20px 0; }
.s-how-head h2 em { font-style: italic; color: var(--s-accent); }
.s-how-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1080px; margin: 0 auto; }
@media (max-width: 820px) { .s-how-steps { grid-template-columns: 1fr; } }
.s-how-step { background: var(--s-bg); border: 1px solid var(--s-line); border-radius: 20px; padding: 36px 28px; position: relative; }
.s-how-step-n { font-family: 'Fraunces', serif; font-size: 72px; font-style: italic; color: var(--s-accent); line-height: 1; margin-bottom: 20px; }
.s-how-step h3 { font-size: 22px; margin-bottom: 10px; }
.s-how-step p { color: var(--s-muted); font-size: 14px; line-height: 1.55; }
.s-how-cta { text-align: center; margin-top: 40px; }

/* Reveal */
.s-reveal { opacity: 0; transform: translateY(40px); transition: all 0.8s cubic-bezier(0.2,0.8,0.2,1); }
.s-reveal.in { opacity: 1; transform: none; }
`;

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';

// ════════════════════════════════════════════════════════
// HOOKS
// ════════════════════════════════════════════════════════

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return ref;
}

function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? h.scrollTop / max : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return p;
}

function useSectionProgress(ref) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const onScroll = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height + vh;
      const offset = vh - r.top;
      setP(Math.max(0, Math.min(1, offset / total)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [ref]);
  return p;
}

function useCountUp(target, enabled, dur = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let start = null;
    let raf;
    const tick = (t) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, dur]);
  return v;
}

// ════════════════════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════════════════════

const WA_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2.6 1 3.1.8 3.7.8.6-.1 1.8-.7 2-1.5.2-.7.2-1.4.2-1.5-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 00-8.5 15.3L2 22l4.9-1.3A10 10 0 1012 2z"/></svg>
);

const WA_ICON_LG = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2.6 1 3.1.8 3.7.8.6-.1 1.8-.7 2-1.5.2-.7.2-1.4.2-1.5-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 00-8.5 15.3L2 22l4.9-1.3A10 10 0 1012 2z"/></svg>
);

// ---- Cursor ----
function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    let rx = 0, ry = 0, dx = 0, dy = 0;
    const move = (e) => {
      dx = e.clientX; dy = e.clientY;
      if (dotRef.current) dotRef.current.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
    };
    const tick = () => {
      rx += (dx - rx) * 0.15;
      ry += (dy - ry) * 0.15;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', move);
    tick();
    const over = (e) => {
      const t = e.target;
      if (t.closest('a, button, input, .s-hoverable, .s-faq-item, .s-chat-prompt, .s-tl-scrub-pill')) {
        dotRef.current?.classList.add('hover');
      }
    };
    const out = () => dotRef.current?.classList.remove('hover');
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);
    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout', out);
    };
  }, []);
  return (
    <>
      <div className="s-cursor-ring" ref={ringRef} />
      <div className="s-cursor" ref={dotRef} />
    </>
  );
}

function Progress() {
  const p = useScrollProgress();
  return <div className="s-progress"><div className="s-progress-bar" style={{ width: `${p*100}%` }} /></div>;
}

// ---- Nav ----
function SNav({ D }) {
  return (
    <nav className="s-nav">
      <div className="s-nav-logo">
        <span className="s-nav-logo-dot"></span>
        SmartKubik
        <span className="s-nav-logo-tag">/ belleza</span>
      </div>
      <div className="s-nav-links">
        <a href="#dolor">Dolor</a>
        <a href="#beneficios">Beneficios</a>
        <a href="#precios">Precios</a>
        <a href="#faq">FAQ</a>
      </div>
      <a href={D.brand.waMsg('Hola, SmartKubik.')} target="_blank" rel="noreferrer" className="s-wa-btn">
        {WA_ICON}
        WhatsApp
      </a>
    </nav>
  );
}

// ---- Hero ----
const HERO_APPTS = [
  { d: 0, h: 0, name: 'Karina R.', svc: 'Corte + Brush', label: 'Reservó a las 2:14am', accent: false },
  { d: 1, h: 2, name: 'Vanessa M.', svc: 'Balayage', label: 'Pagó seña vía Zelle', accent: false },
  { d: 0, h: 3, name: 'Jesús T.', svc: 'Barba + Fade', label: 'Viene por IG', accent: true },
  { d: 2, h: 1, name: 'Fiorella', svc: 'Mani+Pedi', label: 'Confirmó por WA', accent: false },
  { d: 3, h: 0, name: 'Luisa P.', svc: 'Coloración', label: 'Pago Móvil ✓', accent: true },
  { d: 4, h: 3, name: 'Rebeca G.', svc: 'Alisado', label: 'Reserva nueva', accent: false },
  { d: 2, h: 2, name: 'Emilia', svc: 'Tinte raíz', label: 'Domingo confirmado', accent: false },
  { d: 4, h: 1, name: 'Andrea V.', svc: 'Extensiones', label: 'Seña 30% cobrada', accent: true },
];

function HeroCalendar() {
  const [visible, setVisible] = useState(0);
  const [toast, setToast] = useState(null);
  useEffect(() => {
    let i = 0;
    const run = () => {
      if (i >= HERO_APPTS.length) { i = 0; setVisible(0); }
      i++;
      setVisible(i);
      const a = HERO_APPTS[i-1];
      if (a) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2,'0');
        const mm = String(now.getMinutes()).padStart(2,'0');
        setToast({ name: a.name, label: a.label, time: `${hh}:${mm}` });
        setTimeout(() => setToast(null), 2200);
      }
    };
    const int = setInterval(run, 900);
    return () => clearInterval(int);
  }, []);

  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  const hours = ['9am', '11am', '2pm', '4pm'];
  return (
    <div className="s-cal">
      <div className="s-cal-head">
        <div className="s-cal-title">Tu agenda · esta semana</div>
        <div className="s-cal-live"><span className="s-cal-live-dot"></span>EN VIVO</div>
      </div>
      <div className="s-cal-days">
        <div className="s-cal-dayh"></div>
        {days.map(d => <div key={d} className="s-cal-dayh">{d}</div>)}
        {hours.map((h, hi) => (
          <React.Fragment key={h}>
            <div className="s-cal-cell s-cal-h">{h}</div>
            {days.map((_, di) => {
              const appt = HERO_APPTS.find(a => a.d === di && a.h === hi);
              const idx = appt ? HERO_APPTS.indexOf(appt) : -1;
              const shown = idx >= 0 && idx < visible;
              return (
                <div key={di+'_'+hi} className="s-cal-cell">
                  {appt && (
                    <div className={`s-cal-appt ${shown ? 'in' : ''} ${appt.accent ? 'accent2' : ''}`}>
                      <div className="name">{appt.name.split(' ')[0]}</div>
                      <div className="svc">{appt.svc}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="s-cal-foot">
        <span>Reservas activas · <strong>{visible}</strong></span>
        <span>Seña cobrada · <strong>${(visible*12).toFixed(0)}</strong></span>
      </div>
      {toast && (
        <div className="s-toast show">
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Nueva: {toast.name}</div>
            <div className="s-toast-time">{toast.label} · {toast.time}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroHeadline({ title }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);
  const words = title.split(' ');
  return (
    <h1>
      {words.map((w, i) => {
        const em = w.includes('merecía') || w.includes('años');
        return (
          <span className={`s-hero-word ${mounted ? 'in' : ''}`} key={i} style={{ transitionDelay: `${0.08 + i*0.05}s` }}>
            {em ? <em>{w}&nbsp;</em> : <>{w}&nbsp;</>}
          </span>
        );
      })}
    </h1>
  );
}

function SHero({ D }) {
  const h = D.hero.headlineVariants[2];
  return (
    <section className="s-hero" data-screen-label="01 Hero">
      <div className="s-hero-grid-bg"></div>
      <div className="s-container s-hero-inner">
        <div className="s-hero-left">
          <span className="s-eyebrow">{h.eyebrow}</span>
          <HeroHeadline title={h.title} />
          <p className="s-hero-sub">{h.subtitle}</p>
          <div className="s-hero-cta">
            <a className="s-btn s-btn-primary" href={D.brand.waMsg('Quiero probar.')} target="_blank" rel="noreferrer">
              {WA_ICON}
              {D.hero.primaryCTA}
            </a>
            <a className="s-btn s-btn-ghost" href="#dolor">↓ Ver cómo funciona</a>
          </div>
          <div className="s-hero-micro">{D.hero.microcopy}</div>
        </div>
        <div className="s-hero-right">
          <HeroCalendar />
        </div>
      </div>
      <div className="s-hero-hint">
        <span>Scroll</span>
        <span className="s-hero-hint-line"></span>
      </div>
    </section>
  );
}

// ---- Marquee ----
function SMarquee() {
  const items = ['Reservas 24/7', 'Señas cobradas', 'Cero plantones', 'Tu data es tuya', 'Sin comisión por cita', 'Migramos gratis', 'Soporte humano', '14 días free'];
  const dup = [...items, ...items, ...items];
  return (
    <div className="s-marquee">
      <div className="s-marquee-track">
        <span>{dup.map((t, i) => <span key={i}>{t}</span>)}</span>
        <span>{dup.map((t, i) => <span key={i}>{t}</span>)}</span>
      </div>
    </div>
  );
}

// ---- Pain / Voice Notes ----
function VoiceBar({ playing, delay }) {
  const bars = 32;
  return (
    <div className={`s-voice-wave ${playing ? 'playing' : ''}`}>
      {Array.from({ length: bars }).map((_, i) => {
        const h = Math.sin(i * 0.6 + delay) * 8 + Math.cos(i * 0.3) * 6 + 14;
        return <span key={i} style={{ height: `${Math.max(3, h)}px` }} />;
      })}
    </div>
  );
}

function VoiceNote({ item, i }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !entered) {
        setEntered(true);
        ref.current?.classList.add('in');
        setTimeout(() => setPlaying(true), 300);
        setTimeout(() => setPlaying(false), 2800);
      }
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [entered]);

  const names = ['Jennifer · Caracas', 'Vanessa · Valencia', 'Paola · Maracaibo', 'Isabel · Barquisimeto', 'Moraima · Margarita', 'Greta · Mérida', 'Daniela · Caracas'];
  const times = ['hace 3 min', 'hace 8 min', 'hace 14 min', 'hace 22 min', 'hace 31 min', 'hace 48 min', 'hace 1 h'];
  const duration = ['0:18', '0:24', '0:11', '0:32', '0:09', '0:21', '0:27'];

  return (
    <div className="s-voice" ref={ref}>
      <div className="s-voice-avatar">{names[i][0]}</div>
      <div className="s-voice-bubble">
        <div className="s-voice-row">
          <button className="s-voice-play" onClick={() => { setPlaying(true); setTimeout(() => setPlaying(false), 2500); }}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <VoiceBar playing={playing} delay={i} />
          <span className="s-voice-time">{duration[i]}</span>
        </div>
        <div className="s-voice-transcript">{item.q}</div>
        <div className="s-voice-meta">
          <span>{names[i]} · {times[i]}</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(245,239,227,0.75)', padding: '8px 10px', background: 'rgba(255,90,44,0.12)', borderLeft: '2px solid var(--s-accent)', borderRadius: '4px 8px 8px 4px' }}>
          <strong style={{ color: 'var(--s-accent)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Respuesta de SmartKubik →</strong>
          <div style={{ marginTop: 4 }}>{item.a}</div>
        </div>
      </div>
    </div>
  );
}

function SPain({ D }) {
  const ref = useReveal();
  return (
    <section className="s-pain s-reveal" ref={ref} id="dolor" data-screen-label="02 Pain">
      <div className="s-container-narrow">
        <div className="s-pain-head">
          <span className="s-eyebrow">Dossier · Dolor real</span>
          <h2>Siete notas de voz<br/>que <em>recibimos todas las semanas.</em></h2>
          <p>Reproduce. Escucha. ¿Te suena? Al final de cada una, lo que SmartKubik hace al respecto.</p>
        </div>
        <div className="s-voice-list">
          {D.pain.items.map((item, i) => <VoiceNote key={i} item={item} i={i} />)}
        </div>
      </div>
    </section>
  );
}

// ---- Benefits ----
function CalendarFilling({ progress }) {
  const total = 12;
  const filled = Math.floor(progress * total);
  const data = [
    { name: 'Karina', svc: '9am', t: '02:14am' },
    { name: 'Jesús', svc: '11am', t: '11:47pm' },
    { name: 'Vanessa', svc: '2pm', t: '05:22am' },
    { name: 'Paola', svc: '4pm', t: '07:08am' },
    { name: 'Andrea', svc: '10am', t: '01:30am' },
    { name: 'Luisa', svc: '3pm', t: '06:12am' },
    { name: 'Emilia', svc: '12pm', t: '08:44pm' },
    { name: 'Rebeca', svc: '9am', t: '10:15pm' },
    { name: 'Moraima', svc: '5pm', t: '03:18am' },
    { name: 'Daniela', svc: '11am', t: '09:50pm' },
    { name: 'Fiorella', svc: '1pm', t: '12:02am' },
    { name: 'Greta', svc: '4pm', t: '06:54am' },
  ];
  return (
    <div style={{ padding: 20, background: 'var(--s-bg)', border: '1px solid var(--s-line)', borderRadius: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--s-line)' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--s-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Reservas nocturnas · 24h</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontStyle: 'italic', color: 'var(--s-accent)' }}>{filled}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {data.map((d, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderRadius: 8,
            background: i < filled ? 'rgba(255,90,44,0.12)' : 'var(--s-bg2)',
            borderLeft: i < filled ? '3px solid var(--s-accent)' : '3px solid transparent',
            opacity: i < filled ? 1 : 0.3,
            transform: i < filled ? 'translateX(0)' : 'translateX(-10px)',
            transition: 'all 0.4s cubic-bezier(0.2,0.8,0.2,1)',
            fontSize: 13,
          }}>
            <div>
              <strong>{d.name}</strong>
              <span style={{ color: 'var(--s-muted)', marginLeft: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{d.svc}</span>
            </div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: i < filled ? 'var(--s-accent2)' : 'var(--s-muted)' }}>{d.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoneyCounter({ progress }) {
  const steps = Math.floor(progress * 40);
  const target = steps * 50;
  return (
    <div className="s-money">
      <div className="s-money-label">Dinero recuperado este mes</div>
      <div className="s-money-big" style={{ transition: 'color 0.1s' }}>${target.toLocaleString('es-VE')}</div>
      <div className="s-money-sub">= plantones evitados × ticket promedio · salta de $50 en $50</div>
      <div className="s-money-list">
        {[
          { n: 'Karina R.', s: 'Pagó seña · no vino', v: '+ $50' },
          { n: 'Paola M.', s: 'Intentó cancelar 2h antes', v: '+ $50' },
          { n: 'Jennifer T.', s: 'Re-agendó con 48h', v: '+ $50' },
          { n: 'Moraima G.', s: 'Pagó completo · vino', v: '+ $50' },
        ].map((it, i) => (
          <div key={i} className={`s-money-item ${progress > (i+1)/5 ? 'in' : ''}`}>
            <div className="s-money-item-name">
              <strong>{it.n}</strong>
              <span>{it.s}</span>
            </div>
            <span className="s-money-item-v">{it.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportFlow({ progress }) {
  const lines = [
    { t: '$ smartkubik export --all', type: 'cmd' },
    { t: '→ Preparando exportación...', type: 'log' },
    { t: '✓ 1.247 clientas exportadas', type: 'ok' },
    { t: '✓ 3.482 citas del historial', type: 'ok' },
    { t: '✓ 847 transacciones · $42.108', type: 'ok' },
    { t: '✓ clientas.csv · 284 KB', type: 'ok' },
    { t: '→ Listo. Se está descargando...', type: 'done' },
  ];
  const visible = Math.floor(progress * (lines.length + 1));
  const dlPercent = Math.max(0, Math.min(100, (progress - 0.6) * 250));
  return (
    <div className="s-export">
      <div className="s-export-file">
        <div className="s-export-file-icon">CSV</div>
        <div className="s-export-file-info">
          <div className="s-export-file-name">clientas_smartkubik_abril_2026.csv</div>
          <div className="s-export-file-size">{progress > 0.6 ? '284 KB · Completado' : 'Preparando...'}</div>
          <div className="s-export-progress">
            <div className="s-export-progress-bar" style={{ width: `${dlPercent}%` }}></div>
          </div>
        </div>
      </div>
      <div className="s-export-term">
        {lines.slice(0, visible).map((l, i) => (
          <div key={i} className="s-export-line" style={{ animationDelay: `${i*0.05}s`, color: l.type === 'cmd' ? 'var(--s-fg)' : l.type === 'ok' ? 'var(--s-accent2)' : l.type === 'done' ? 'var(--s-accent)' : 'var(--s-muted)' }}>
            <span className={l.type === 'ok' ? 'ok' : l.type === 'done' ? 'arrow' : ''}>
              {l.t}
            </span>
          </div>
        ))}
        {visible > 0 && <div style={{ color: 'var(--s-accent)', marginTop: 4 }}>▊</div>}
      </div>
      <div style={{ padding: '12px 16px', background: 'rgba(208,255,58,0.08)', border: '1px solid rgba(208,255,58,0.2)', borderRadius: 12, fontSize: 12, color: 'var(--s-accent2)', fontFamily: 'JetBrains Mono, monospace' }}>
        Sin permisos. Sin "contáctanos para desactivar". Un clic. Tus datos, tuyos.
      </div>
    </div>
  );
}

function BenefitVisual({ idx, progress }) {
  if (idx === 0) return <CalendarFilling progress={progress} />;
  if (idx === 1) return <MoneyCounter progress={progress} />;
  return <ExportFlow progress={progress} />;
}

function SBenefits({ D }) {
  const stageRef = useRef(null);
  const progress = useSectionProgress(stageRef);
  const currentIdx = Math.min(2, Math.floor(progress * 3.2));
  const localP = Math.max(0, Math.min(1, (progress * 3.2) - currentIdx));
  const ben = D.benefits.items[currentIdx];

  return (
    <section className="s-benefits" id="beneficios" data-screen-label="03 Benefits">
      <div className="s-container">
        <div className="s-ben-head">
          <span className="s-eyebrow">Tres actos</span>
          <h2>Lo que <em>cambia</em> el día que migras.</h2>
        </div>
      </div>
      <div className="s-ben-stage" ref={stageRef}>
        <div className="s-ben-sticky">
          <div className="s-ben-text" key={currentIdx}>
            <div className="s-ben-kicker">Acto {ben.num} · {ben.kicker}</div>
            <h3 dangerouslySetInnerHTML={{ __html: ben.title.replace(/\b(duermes|plantones|tuyas)\b/g, '<em>$1</em>') }} />
            <p className="s-ben-body">{ben.body}</p>
            <div className="s-ben-outcome">
              <span className="s-ben-outcome-v">{ben.outcome}</span>
              <span className="s-ben-outcome-l">{ben.outcomeLabel}</span>
            </div>
          </div>
          <div className="s-ben-visual">
            <div className="s-ben-indicator">
              {[0,1,2].map(i => <div key={i} className={`s-ben-indicator-dot ${i === currentIdx ? 'active' : ''}`}></div>)}
            </div>
            <BenefitVisual idx={currentIdx} progress={localP} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Timeline ----
function STimeline({ D }) {
  const ref = useRef(null);
  const progress = useSectionProgress(ref);
  const [active, setActive] = useState(0);
  useEffect(() => {
    setActive(Math.min(2, Math.floor(progress * 3.5)));
  }, [progress]);
  const revealRef = useReveal();
  return (
    <section className="s-timeline s-reveal" ref={revealRef} data-screen-label="04 Timeline">
      <div className="s-container" ref={ref}>
        <div className="s-tl-head">
          <span className="s-eyebrow">Escala contigo</span>
          <h2>Crece sin <em>cambiar de sistema.</em></h2>
          <p style={{ color: 'var(--s-muted)', fontSize: 17, marginTop: 14, maxWidth: 520, lineHeight: 1.6 }}>{D.timeline.subtitle}</p>
        </div>
        <div className="s-tl-stages">
          {D.timeline.stages.map((s, i) => (
            <div key={i} className={`s-tl-stage ${i <= active ? 'active' : ''}`}>
              <div className="s-tl-stage-num">{s.stage}</div>
              <h3>{s.name}</h3>
              <div className="s-tl-stage-who">{s.who}</div>
              <div className="s-tl-stage-features">
                {s.features.map((f, fi) => (
                  <div key={fi} className="s-tl-feat" style={{ transitionDelay: `${fi*0.05}s` }}>
                    <span className="s-tl-feat-check">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="s-tl-scrub">
          {D.timeline.stages.map((s, i) => (
            <button key={i} className={`s-tl-scrub-pill ${i === active ? 'active' : ''}`} onClick={() => setActive(i)}>{s.stage}</button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Chat ----
function SChat({ D }) {
  const ref = useReveal();
  const [msgs, setMsgs] = useState([{ from: 'bot', text: '¡Hola! Soy Kubia 👋 Cuéntame de tu salón y te digo si somos buena match. ¿Qué haces?', id: 0 }]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, typing]);

  const addBot = (text, delay = 1200) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(m => [...m, { from: 'bot', text, id: Date.now() }]);
    }, delay);
  };

  const replies = {
    '¿Cuánto cuesta para un salón de 3 estilistas?': 'Para 3 estilistas el plan Estudio ($35/mes) es perfecto. Incluye comisiones, inventario, reportes y hasta 5 agendas. ¿Cobrar en Zelle/Pago Móvil? También sin comisión extra.',
    '¿Cómo funcionan las señas en Venezuela?': 'Configuras el % por servicio (típico: 30%). La clienta paga al reservar vía Pago Móvil, Zelle, tarjeta, Binance o efectivo. El dinero va directo a tu cuenta. Nosotros no tocamos un centavo.',
    '¿Puedo migrar desde mi cuaderno/Excel?': 'Sí, gratis. Nos mandas fotos del cuaderno o tu Excel. En 48h tu salón está completo: clientas, servicios, precios, historial. Humanos reales haciéndolo, no un bot que se equivoca.',
    '¿Cobran comisión por cita?': 'No. Cero. Tu plan mensual es todo. Cobras 50 citas o 500: mismo precio. Las señas van 100% a tu cuenta. Esto nos diferencia de Fresha, Booksy y compañía.',
  };

  const sendPrompt = (p) => {
    setMsgs(m => [...m, { from: 'user', text: p, id: Date.now() }]);
    const reply = replies[p] || 'Interesante. Para eso mejor hablemos por WhatsApp y te conecto con el equipo. ¿Te pasamos el link?';
    addBot(reply, 1400);
    setTimeout(() => {
      addBot('¿Quieres que te pasemos al equipo por WhatsApp? Responden en menos de 2h.', 1800);
    }, 2200);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMsgs(m => [...m, { from: 'user', text: input, id: Date.now() }]);
    const q = input.toLowerCase();
    setInput('');
    let reply = 'Buena pregunta. ¿Me cuentas más? O mejor: escríbenos por WhatsApp y te respondemos en segundos.';
    if (q.includes('precio') || q.includes('cuesta') || q.includes('cuanto')) reply = replies['¿Cuánto cuesta para un salón de 3 estilistas?'];
    else if (q.includes('seña') || q.includes('sena') || q.includes('pago')) reply = replies['¿Cómo funcionan las señas en Venezuela?'];
    else if (q.includes('migrar') || q.includes('cuaderno') || q.includes('excel')) reply = replies['¿Puedo migrar desde mi cuaderno/Excel?'];
    else if (q.includes('comisi')) reply = replies['¿Cobran comisión por cita?'];
    addBot(reply, 1200);
  };

  return (
    <section className="s-chat s-reveal" ref={ref} data-screen-label="05 Chat">
      <div className="s-container">
        <div className="s-chat-wrap">
          <div className="s-chat-left">
            <span className="s-eyebrow">Habla con nosotros</span>
            <h2>Pregunta <em>lo que sea.</em></h2>
            <p>{D.chat.subtitle}</p>
            <div className="s-founder">
              <div className="s-founder-ph">J</div>
              <div>
                <div className="s-founder-name">{D.chat.founder.name}</div>
                <div className="s-founder-role">{D.chat.founder.role}</div>
                <div className="s-founder-q">"{D.chat.founder.quote}"</div>
              </div>
            </div>
          </div>
          <div className="s-chat-window">
            <div className="s-chat-head">
              <div className="s-chat-avatar">K</div>
              <div className="s-chat-head-info">
                <div className="s-chat-head-name">Kubia</div>
                <div className="s-chat-head-status">En línea · responde al toque</div>
              </div>
            </div>
            <div className="s-chat-body" ref={bodyRef}>
              {msgs.map(m => (
                <div key={m.id} className={`s-chat-msg ${m.from}`}>{m.text}</div>
              ))}
              {typing && (
                <div className="s-chat-typing">
                  <span></span><span></span><span></span>
                </div>
              )}
            </div>
            <div className="s-chat-prompts">
              {D.chat.prompts.map((p, i) => (
                <button key={i} className="s-chat-prompt" onClick={() => sendPrompt(p)}>{p}</button>
              ))}
            </div>
            <div className="s-chat-input">
              <input placeholder="Escribe tu pregunta..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
              <button onClick={handleSend}>Enviar</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- How to Start ----
function SHow({ D }) {
  const ref = useReveal();
  return (
    <section className="s-how s-reveal" ref={ref} data-screen-label="06 How">
      <div className="s-container">
        <div className="s-how-head">
          <span className="s-eyebrow">Cómo empezar</span>
          <h2>Empezar toma <em>12 minutos.</em><br/>Lo medimos.</h2>
        </div>
        <div className="s-how-steps">
          {D.start.steps.map((s, i) => (
            <div className="s-how-step" key={i}>
              <div className="s-how-step-n">0{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
        <div className="s-how-cta">
          <a className="s-btn s-btn-primary" href={D.brand.waMsg('Arranquemos.')} target="_blank" rel="noreferrer">
            {WA_ICON}
            {D.start.cta}
          </a>
        </div>
      </div>
    </section>
  );
}

// ---- Pricing ----
function SPricing({ D }) {
  const ref = useReveal();
  const [clientsPerMonth, setClientsPerMonth] = useState(120);
  const [ticket, setTicket] = useState(40);
  const cancelRate = 0.22;
  const withSK = 0.06;
  const lostWithout = Math.round(clientsPerMonth * cancelRate * ticket);
  const lostWith = Math.round(clientsPerMonth * withSK * ticket);
  const saved = lostWithout - lostWith;
  const plan = clientsPerMonth < 80 ? 15 : clientsPerMonth < 300 ? 35 : 65;
  const net = saved - plan;

  return (
    <section className="s-pricing s-reveal" ref={ref} id="precios" data-screen-label="07 Pricing">
      <div className="s-container">
        <div className="s-price-head">
          <span className="s-eyebrow">Precios</span>
          <h2>Honestos. <em>Sin sorpresas.</em></h2>
          <p>{D.pricing.subtitle}</p>
        </div>

        <div className="s-roi">
          <div className="s-roi-head">
            <h3>Calculadora de plantones</h3>
            <span className="s-roi-badge">En vivo</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div className="s-roi-slider-row">
                <span className="s-roi-label">Clientas por mes</span>
                <span className="s-roi-val">{clientsPerMonth}</span>
              </div>
              <input type="range" min={20} max={600} step={10} value={clientsPerMonth} onChange={e => setClientsPerMonth(+e.target.value)} />
            </div>
            <div>
              <div className="s-roi-slider-row">
                <span className="s-roi-label">Ticket promedio</span>
                <span className="s-roi-val">${ticket}</span>
              </div>
              <input type="range" min={15} max={150} step={5} value={ticket} onChange={e => setTicket(+e.target.value)} />
            </div>
          </div>
          <div className="s-roi-compare">
            <div className="s-roi-col bad">
              <div className="s-roi-col-label">Sin SmartKubik · plantones al mes</div>
              <div className="s-roi-col-val">${lostWithout.toLocaleString('es-VE')}</div>
              <div className="s-roi-col-sub">22% de no-show sin seña obligatoria</div>
            </div>
            <div className="s-roi-col good">
              <div className="s-roi-col-label">Con SmartKubik · plantones al mes</div>
              <div className="s-roi-col-val">${lostWith.toLocaleString('es-VE')}</div>
              <div className="s-roi-col-sub">6% residual · señas hacen el trabajo</div>
            </div>
          </div>
          <div className="s-roi-saves">
            <div className="s-roi-saves-label">Recuperas al mes, después del plan (${plan})</div>
            <div className="s-roi-saves-val">≈ <em>${net.toLocaleString('es-VE')}</em> / mes</div>
          </div>
        </div>

        <div className="s-price-grid">
          {D.pricing.plans.map(p => (
            <div key={p.name} className={`s-price-card ${p.featured ? 'featured' : ''}`}>
              {p.badge && <div className="s-price-badge">★ {p.badge}</div>}
              <div>
                <div className="s-price-name">{p.name}</div>
                <div className="s-price-desc">{p.desc}</div>
              </div>
              <div className="s-price-amt">
                <span className="s-price-sym">$</span>
                <span className="s-price-val">{p.price}</span>
                <span className="s-price-per">{p.per}</span>
              </div>
              <div className="s-price-feats">
                {p.features.map(f => <div key={f} className="s-price-feat">{f}</div>)}
              </div>
              <button className="s-price-cta" onClick={() => window.open(D.brand.waMsg(`Plan ${p.name}.`), '_blank')}>{p.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- FAQ ----
function SFAQ({ D }) {
  const ref = useReveal();
  const [open, setOpen] = useState(0);
  return (
    <section className="s-faq s-reveal" ref={ref} id="faq" data-screen-label="08 FAQ">
      <div className="s-container-narrow">
        <div className="s-faq-head">
          <span className="s-eyebrow">FAQ</span>
          <h2>Las preguntas <em>inevitables.</em></h2>
        </div>
        <div className="s-faq-list">
          {D.faq.items.map((f, i) => (
            <div key={i} className={`s-faq-item ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? -1 : i)}>
              <div className="s-faq-q">
                <div><span className="s-faq-q-n">Q.0{i+1}</span>{f.q}</div>
                <div className="s-faq-plus">+</div>
              </div>
              <div className="s-faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Closure ----
function SClose({ D }) {
  const ref = useReveal();
  return (
    <section className="s-close s-reveal" ref={ref} data-screen-label="09 Closure">
      <div className="s-close-bg"></div>
      <div className="s-container">
        <h2>Tu sábado<br/>empieza a las <em>8am.</em></h2>
        <p>Que tu agenda ya esté lista. En media hora tienes tu salón online.</p>
        <a className="s-btn s-btn-primary" href={D.brand.waMsg('Vamos.')} target="_blank" rel="noreferrer">
          {WA_ICON}
          {D.closure.cta}
        </a>
      </div>
    </section>
  );
}

// ---- Footer ----
function SFoot({ D }) {
  return (
    <footer className="s-foot">
      <div className="s-container s-foot-inner">
        <span>SmartKubik · /belleza</span>
        <span>© 2026 · Caracas · {D.brand.whatsappDisplay}</span>
      </div>
    </footer>
  );
}

// ---- Floating WhatsApp ----
function SWAFloat({ D }) {
  return (
    <a className="s-wa-float" href={D.brand.waMsg('Hola.')} target="_blank" rel="noreferrer">
      {WA_ICON_LG}
    </a>
  );
}

// ════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════

export default function SkubikBeautyLanding() {
  const D = BEAUTY_DATA;

  useEffect(() => {
    // Inject styles
    const styleId = 'skubik-beauty-styles';
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = SKUBIK_STYLES;
    document.head.appendChild(style);

    // Inject Google Fonts
    const fontId = 'skubik-beauty-fonts';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = FONT_URL;
      document.head.appendChild(link);
    }

    // Body classes
    document.body.classList.add('skubik-page-active');
    document.documentElement.classList.add('skubik-page-active');

    // Scroll to top
    window.scrollTo(0, 0);

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
      document.body.classList.remove('skubik-page-active');
      document.documentElement.classList.remove('skubik-page-active');
    };
  }, []);

  return (
    <div className="skubik-page">
      <Cursor />
      <Progress />
      <SNav D={D} />
      <SHero D={D} />
      <SMarquee />
      <SPain D={D} />
      <SBenefits D={D} />
      <STimeline D={D} />
      <SChat D={D} />
      <SHow D={D} />
      <SPricing D={D} />
      <SFAQ D={D} />
      <SClose D={D} />
      <SFoot D={D} />
      <SWAFloat D={D} />
    </div>
  );
}
