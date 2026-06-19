import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';

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
    eyebrow: 'La plataforma para negocios de belleza',
    title: 'Tu talento está en tus manos, no pegado a un teclado.',
    subtitle: 'Tu propia web donde tus clientes reservan solos. WhatsApp confirma sus citas automáticamente. Y nadie te embarca: cobras anticipo antes de agendar.',
    stats: [
      { value: '24/7', label: 'Tu agenda abierta' },
      { value: 'WhatsApp', label: 'Confirma por ti' },
      { value: 'Anticipo', label: 'Cero embarques' },
    ],
    primaryCTA: 'Compruébalo gratis',
    secondaryCTA: '¿Dudas? Hablemos',
    microBadges: ['Sin tarjeta', '14 días', 'Migramos tu agenda gratis'],
  },

  pain: {
    title: '¿Te suena?',
    subtitle: 'Cada tarjeta tiene un final diferente. Tócala.',
    items: [
      { q: 'Son las 11pm y todavía estás contestando "¿tienes disponibilidad mañana?"', a: 'Tu clienta reserva sola desde tu link, a cualquier hora. Tú duermes.', tag: 'La Esclavitud', video: '/videos/late-night-scroll.webm', backVideo: '/videos/late-night-back.mp4', backVideoBg: '#ef4444' },
      { q: 'Confié en mi memoria y cité a dos clientas a la misma hora. Una me perdonó. La otra me dejó 1 estrella en Google y no volvió.', a: 'Skubik bloquea automáticamente los horarios ocupados. Cero cruces, cero sorpresas.', tag: 'El Traspapelado', video: '/videos/double-booking.webm', backAnim: 'booking', backImageBg: '#ef4444' },
      { q: 'Me embarcó. Otra vez. Y hoy rechacé dos clientas por ese espacio.', a: 'Anticipo obligatorio antes de confirmar. No paga = no reserva. Tú no pierdes.', tag: 'El Embarque', video: '/videos/no-show.webm' },
      { q: '"Ni idea de cuánto vendí el mes pasado, cuál de mis estilistas produjo menos, ni quién es mi mejor clienta activa"', a: 'Dashboard con ingresos, frecuencia, ticket promedio y ranking de clientas.', tag: 'Viviendo al Límite', video: '/videos/reports.webm' },
      { q: 'Mi recepcionista renunció y toda la información se fue con ella.', a: 'Todo vive en la nube. Tus datos son tuyos. Nadie se los lleva.', tag: 'La Traición', video: '/videos/data-loss.webm' },
    ],
  },

  benefits: {
    title: 'Tres cosas que cambian el día que migras',
    items: [
      {
        num: '01',
        kicker: 'Tu web de reservas',
        title: 'La presencia empieza antes de la cita.',
        body: 'Ofrece una web elegante y profesional, donde tus clientes reservan en segundos. La experiencia que ofreces de principio a fin es lo que justifica tus precios.',
        outcome: '+34%',
        outcomeLabel: 'aumenta el ticket promedio con web propia',
      },
      {
        num: '02',
        kicker: 'Agenda 24/7',
        title: 'Control total desde tu teléfono.',
        body: 'Dedícate a lo importante y automatiza reservas, mensajes de confirmación y comisiones sin que tú tengas que mover un dedo. Gestiona todo en pocos pasos.',
        outcome: '46%',
        outcomeLabel: 'de reservas son fuera de horario',
      },
      {
        num: '03',
        kicker: 'Anticipos que se cobran solos',
        title: 'Reduce embarques y pérdidas.',
        body: 'Blíndate con nosotros. Pide anticipos para agendar y envía recordatorios para confirmar. Sin pago no hay reserva. Skubik lo hace por ti.',
        outcome: '–38%',
        outcomeLabel: 'cancelaciones de último minuto',
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
        features: ['Agenda online', 'Cobro de anticipo', 'Ficha de clienta', 'Recordatorios WhatsApp'],
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
    eyebrow: 'WhatsApp integrado',
    titleStart: 'WhatsApp, tu',
    titleEm: 'asistente automatizado.',
    subtitle: 'Confirmaciones, recordatorios, reactivaciones y un chatbot con IA. Tus clientas responden — tú no levantas el teléfono.',
    features: [
      {
        icon: 'template',
        title: 'Plantillas editables',
        desc: 'Escribes el mensaje una vez, Skubik lo envía siempre. Tono, emojis y firma del salón — los pones tú.',
      },
      {
        icon: 'auto',
        title: 'Automático por evento',
        desc: 'Cita confirmada, 24h antes, 8 semanas sin venir. Cada disparo va sin que muevas un dedo.',
      },
      {
        icon: 'inbox',
        title: 'Bandeja unificada',
        desc: 'Todos los chats — automáticos y humanos — en una sola pantalla. Tu equipo responde desde Skubik, no desde sus celulares.',
      },
      {
        icon: 'ai',
        title: 'Chatbot con IA',
        desc: 'Si la clienta pregunta precios, horarios o si atienden niñas, la IA responde sola. Si la pregunta es delicada, te avisa.',
      },
    ],
    stat: {
      big: '98%',
      label: 'de tus clientas leen WhatsApp en los primeros 5 minutos.',
      foot: 'Email abierto: 21%. SMS: 19%. Por eso todo va por WhatsApp.',
    },
    salonName: 'Salón Loft 47',
    salonHandle: 'Andrea · clienta',
    tabs: [
      {
        key: 'confirm',
        label: 'Confirmación',
        sub: 'Cuando reservan',
        conv: [
          { from: 'cliente', text: 'Hola, quisiera reservar un corte 🙌', time: '10:42' },
          { from: 'salon', text: '¡Hola Andrea! 👋 Soy el asistente de *Salón Loft 47*.\n\nTu reserva quedó así:\n📅 Sábado 14 · 11:00 am\n💇 Corte + lavado con Mariana\n💵 Anticipo $10 (Pago Móvil)\n\n¿Confirmamos?', time: '10:42' },
          { from: 'cliente', text: 'Sí, perfecto 😊', time: '10:43' },
          { from: 'salon', text: 'Listo, cita confirmada ✅\nTe esperamos el sábado. Si necesitas reagendar, escríbenos por aquí.', time: '10:43' },
        ],
      },
      {
        key: 'remind',
        label: 'Recordatorio',
        sub: '24h antes',
        conv: [
          { from: 'salon', text: 'Hola Andrea ✨\nTe recordamos tu cita de *mañana* en Salón Loft 47:\n\n📅 Sábado 14 · 11:00 am\n💇 Corte + lavado · Mariana\n📍 Av. Principal #47\n\nResponde *1* para confirmar · *2* para reagendar.', time: '6:00' },
          { from: 'cliente', text: '1', time: '7:14' },
          { from: 'salon', text: '¡Genial! Te esperamos mañana 🤍\nSi te demoras, avísanos por aquí.', time: '7:14' },
        ],
      },
      {
        key: 'reactivate',
        label: 'Reactivación',
        sub: 'Sin visitar 8+ semanas',
        conv: [
          { from: 'salon', text: 'Hola Andrea 💔 hace *8 semanas* que no nos vemos.\nTu última cita fue con Mariana el 17 de marzo.\n\nEsta semana te regalamos *15% de descuento* si reservas hoy. ¿Te apuntas?', time: '15:20' },
          { from: 'cliente', text: 'Uy sí, ya me toca 😅', time: '15:23' },
          { from: 'salon', text: 'Perfecto. Tengo disponible:\n• Jueves 5:00 pm\n• Sábado 11:00 am\n\n¿Cuál te queda mejor?', time: '15:23' },
        ],
      },
      {
        key: 'ai',
        label: 'Chatbot IA',
        sub: 'Responde solo',
        conv: [
          { from: 'cliente', text: 'hola, atienden niñas? mi hija tiene 6', time: '19:08' },
          { from: 'salon', text: '¡Hola! 👋 Sí, atendemos desde 4 años.\nCorte infantil $12 — incluye peinado y un mini gloss 🌸\n¿Quieres ver disponibilidad esta semana?', time: '19:08' },
          { from: 'cliente', text: 'sí, sábado en la tarde si pueden', time: '19:09' },
          { from: 'salon', text: 'Para sábado tarde tengo:\n• 3:00 pm con Sofía\n• 4:30 pm con Mariana\n\nResponde con la hora y reservo 🤍', time: '19:09' },
        ],
      },
    ],
  },

  start: {
    title: 'Empezar toma 10 minutos. Lo medimos.',
    steps: [
      { n: '1', t: 'Regístrate o contáctanos', d: 'Llenas un formulario corto con los datos del negocio, servicios y staff.' },
      { n: '2', t: 'Migramos tu negocio', d: 'Si usabas Excel, o vienes de otro sistema, nosotros lo pasamos. Gratis.' },
      { n: '3', t: 'Compartes el link', d: 'Tu web está activa. Comparte el link en Instagram, WhatsApp y Google.' },
    ],
    cta: 'Empezar ahora',
  },

  pricing: {
    title: 'Precios honestos. Sin sorpresas.',
    subtitle: 'Paga por lo que usas. Cancela cuando quieras. No cobramos comisión por cita.',
    plans: [
      {
        name: 'Solo',
        priceMonthly: '18',
        priceAnnual: '15',
        per: '/mes',
        desc: 'Para quien empieza sola.',
        features: ['1 agenda', 'Reservas online', 'Cobro de anticipo', '200 clientas'],
        cta: 'Probar Solo',
      },
      {
        name: 'Estudio',
        priceMonthly: '28',
        priceAnnual: '25',
        per: '/mes',
        desc: 'El favorito. Para salones pequeños.',
        featured: true,
        badge: 'Más elegido',
        features: ['Hasta 5 agendas', 'Todo lo de Solo', 'WhatsApp automatizado', 'Comisiones por estilista', 'Inventario básico', 'Reportes', '1.000 clientas'],
        cta: 'Probar Estudio',
      },
      {
        name: 'Salón',
        priceMonthly: '60',
        priceAnnual: '50',
        per: '/mes',
        desc: 'Para operaciones establecidas.',
        features: ['Hasta 15 agendas', 'Todo lo de Estudio', 'Inventario avanzado', 'Paquetes y bonos', 'Soporte prioritario', '5.000 clientas'],
        cta: 'Probar Salón',
      },
      {
        name: 'Multi',
        priceMonthly: '125',
        priceAnnual: '99',
        per: '+ /mes',
        desc: 'Para cadenas y franquicias.',
        features: ['Agendas ilimitadas', 'Múltiples sedes', 'Dashboard ejecutivo', 'API + integraciones', 'Gerente de cuenta', 'Clientas ilimitadas'],
        cta: 'Hablar con ventas',
      },
    ],
    blocks: [
      { t: 'Qué incluye todo', d: 'Reservas online, cobro de anticipo, recordatorios WhatsApp, ficha de clienta, reportes, exportación de datos, soporte humano en español.' },
      { t: 'Qué no recortamos', d: 'Ningún plan tiene comisión por cita. Ninguno te obliga a pagar por pasarela de cobro. Ninguno te amarra más allá del mes en curso.' },
      { t: 'Cuando crezcas', d: 'Cambia de plan en un clic. No pierdes datos, no pagas setup, no re-entrenas al equipo. El mismo producto, más capacidad.' },
    ],
  },

  faq: {
    title: 'Preguntas que nos hacen mucho',
    items: [
      { q: '¿Funciona en Venezuela con pagos locales?', a: 'Sí. Aceptamos Pago Móvil, Zelle, transferencias, tarjeta internacional, Binance Pay y efectivo. Configuras qué métodos muestras a tus clientas.' },
      { q: '¿Cobran comisión por cada reserva?', a: 'No. Cero. Tu plan mensual es todo lo que pagas. Los anticipos van directo a tu cuenta (o pasarela si usas una), nosotros no tocamos ese dinero.' },
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
    title: 'Empieza gratis hoy.',
    subtitle: '10 minutos para configurarlo. 14 días para probar. Sin tarjeta. Sin compromiso. Si no funciona, te ayudamos a migrar tus datos a donde quieras.',
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
.s-cursor { position: fixed; top: 0; left: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--s-accent); pointer-events: none; z-index: 9999; will-change: transform; transform: translate(-50%,-50%); transition: width 0.2s, height 0.2s, background 0.2s; }
.s-cursor.hover { width: 60px; height: 60px; background: var(--s-fg); mix-blend-mode: difference; }
.s-cursor-ring { position: fixed; top: 0; left: 0; width: 40px; height: 40px; border: 1px solid var(--s-fg); border-radius: 50%; pointer-events: none; z-index: 9998; will-change: transform; transform: translate(-50%,-50%); opacity: 0.5; }

/* Progress rail */
.s-progress { position: fixed; top: 0; left: 0; right: 0; height: 2px; background: transparent; z-index: 100; pointer-events: none; }
.s-progress-bar { height: 100%; background: var(--s-accent); width: 0%; transition: width 0.08s linear; }

/* Nav */
.s-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 60; padding: 18px 32px; display: flex; justify-content: space-between; align-items: center; backdrop-filter: blur(14px); background: rgba(11,10,9,0.6); border-bottom: 1px solid var(--s-line); transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), background 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease; }
.s-nav.transparent { background: transparent; backdrop-filter: none; border-bottom-color: transparent; }
.s-nav.hidden { transform: translateY(-100%); }
.s-nav-logo { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; letter-spacing: -0.02em; display: flex; align-items: center; gap: 10px; color: var(--s-fg); }
.s-nav-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--s-accent); animation: s-pulse 2s ease-in-out infinite; }
@keyframes s-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
.s-nav-links { display: flex; gap: 24px; font-size: 13px; }
.s-nav-links a { color: var(--s-muted); text-decoration: none; transition: color 0.2s; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
.s-nav-links a:hover { color: var(--s-fg); }
@media (max-width: 720px) { .s-nav-links { display: none; } }

.s-nav-cta { display: flex; align-items: center; gap: 8px; }
.s-nav-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--s-line); color: var(--s-fg); text-decoration: none; transition: all 0.2s; cursor: none; }
.s-nav-icon-btn svg { width: 16px; height: 16px; }
.s-nav-icon-btn:hover { border-color: var(--s-accent); color: var(--s-accent); transform: translateY(-1px); }
.s-nav.transparent .s-nav-icon-btn { border-color: rgba(255,255,255,0.25); }
.s-nav-register-btn { display: inline-flex; align-items: center; padding: 9px 18px; background: var(--s-fg); color: var(--s-bg); border-radius: 99px; font-weight: 600; font-size: 13px; text-decoration: none; transition: all 0.2s; cursor: none; }
.s-nav-register-btn:hover { background: var(--s-accent); color: #fff; transform: translateY(-1px); }
@media (max-width: 700px) { .s-nav { padding: 14px 18px; } .s-nav-register-btn { padding: 8px 14px; font-size: 12px; } .s-nav-icon-btn { width: 36px; height: 36px; } }

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

/* Mobile fullscreen video background */
.s-hero-mobile-bg { position: absolute; inset: 0; overflow: hidden; z-index: 0; pointer-events: none; }
.s-hero-mobile-bg video { width: 100%; height: 100%; object-fit: cover; display: block; }
.s-hero-mobile-bg-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.65) 35%, rgba(10,10,10,0.85) 75%, var(--s-bg) 100%); }
.s-hero.s-hero-mobile { padding: 110px 0 120px; min-height: 100svh; }
.s-hero.s-hero-mobile .s-hero-grid-bg { opacity: 0.12; }
.s-hero.s-hero-mobile .s-hero-inner { position: relative; z-index: 2; }
.s-hero.s-hero-mobile .s-hero-hint { z-index: 2; }
.s-hero-grid-bg { position: absolute; inset: 0; background-image: linear-gradient(var(--s-line) 1px, transparent 1px), linear-gradient(90deg, var(--s-line) 1px, transparent 1px); background-size: 80px 80px; opacity: 0.5; mask: radial-gradient(ellipse at center top, #000 0%, transparent 70%); }
.s-hero-inner { position: relative; display: grid; grid-template-columns: 1.1fr 1fr; gap: 60px; align-items: center; }
@media (max-width: 960px) { .s-hero-inner { grid-template-columns: 1fr; } }
.s-hero-left h1 { font-size: clamp(52px, 7.5vw, 104px); margin: 24px 0 28px; }
.s-hero-left h1 em { font-style: italic; color: var(--s-accent); }
.s-hero-word { display: inline-block; opacity: 0; transform: translateY(40px); transition: opacity 0.7s cubic-bezier(0.2,0.8,0.2,1), transform 0.7s cubic-bezier(0.2,0.8,0.2,1); }
.s-hero-word.in { opacity: 1; transform: none; }
.s-hero-sub { font-size: 19px; line-height: 1.5; color: var(--s-muted); max-width: 520px; margin-bottom: 40px; }
@media (max-width: 700px) {
  .s-hero-left h1 { font-size: 48px; margin: 18px 0 22px; }
  .s-hero-sub { font-size: 16px; margin-bottom: 32px; }
}
.s-hero-cta { display: flex; gap: 14px; flex-wrap: wrap; }
@media (max-width: 700px) { .s-hero-cta .s-btn { font-size: 13px; padding: 14px 22px; gap: 8px; } }
.s-btn { display: inline-flex; align-items: center; gap: 10px; padding: 16px 26px; border-radius: 99px; font-weight: 600; font-size: 15px; text-decoration: none; border: 1px solid transparent; cursor: none; transition: all 0.25s cubic-bezier(0.2,0.8,0.2,1); position: relative; overflow: hidden; }
.s-btn-primary { background: var(--s-fg); color: var(--s-bg); }
.s-btn-primary:hover { background: var(--s-accent); color: #fff; transform: translateY(-2px); }
.s-btn-ghost { background: transparent; color: var(--s-fg); border-color: var(--s-line); }
.s-btn-ghost:hover { border-color: var(--s-fg); }
.s-hero-micro { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 8px; }
.s-hero-micro-badge { display: inline-flex; align-items: center; padding: 6px 12px; border: 1px solid var(--s-line); border-radius: 99px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.08em; background: rgba(255,255,255,0.02); white-space: nowrap; }
@media (max-width: 700px) { .s-hero-micro { margin-top: 16px; gap: 6px; } .s-hero-micro-badge { padding: 5px 10px; font-size: 10px; } }

/* Hero video viz */
.s-hero-right { position: relative; display: flex; align-items: center; justify-content: center; min-height: 560px; }
@media (max-width: 960px) { .s-hero-right { min-height: auto; padding-top: 16px; } }
.s-hero-video-wrap { position: relative; width: 100%; max-width: 380px; aspect-ratio: 9 / 16; }
@media (max-width: 960px) { .s-hero-video-wrap { max-width: 320px; margin: 0 auto; } }
@media (max-width: 600px) { .s-hero-video-wrap { max-width: 280px; } }
.s-hero-video-wrap::before { content: ''; position: absolute; inset: -60px; background: radial-gradient(ellipse at center, rgba(255, 90, 44, 0.24), transparent 60%); filter: blur(48px); z-index: 0; pointer-events: none; }
.s-hero-video-wrap::after { content: ''; position: absolute; inset: -40px; background: radial-gradient(ellipse at 30% 80%, rgba(255, 138, 76, 0.14), transparent 55%); filter: blur(36px); z-index: 0; pointer-events: none; }
.s-hero-video { position: relative; width: 100%; height: 100%; border-radius: 28px; overflow: hidden; background: #0a0a0a; box-shadow: 0 40px 90px -24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06); z-index: 1; }
.s-hero-video video { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Hero calendar viz (legacy, kept for fallback) */
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

/* === PAIN / SCROLL-HIJACK DOCK CAROUSEL === */
.s-pain-wrap { position: relative; }
.s-pain-sticky { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.s-pain-head { flex-shrink: 0; padding: 80px 32px 24px; max-width: 780px; margin: 0 auto; text-align: center; }
@media (max-width: 600px) { .s-pain-head { padding: 16px 20px 10px; text-align: left; margin: 0; } }
.s-pain-head h2 { font-size: clamp(32px, 5vw, 64px); margin: 14px 0; }
.s-pain-head h2 em { font-style: italic; color: var(--s-accent); }
.s-pain-head p { color: var(--s-muted); font-size: 15px; max-width: 520px; line-height: 1.5; margin: 6px auto 0; }
@media (max-width: 600px) {
  .s-pain-head h2 { font-size: 18px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .s-pain-head h2 br { display: none; }
  .s-pain-head p { display: none; }
  .s-pain-head .s-eyebrow { display: none; }
}

/* Carousel track — fills remaining height, cards sized to fit */
.s-pain-track-wrap { flex: 1; display: flex; align-items: center; min-height: 0; }
.s-pain-track { display: flex; gap: 28px; padding: 0 calc(50vw - var(--pain-card-hw, 170px)); align-items: center; will-change: transform; height: 100%; }
@media (max-width: 900px) {
  .s-pain-track-wrap { align-items: stretch; overflow: visible; }
  .s-pain-track { display: block; padding: 0; gap: 0; height: 100%; width: 100%; position: relative; }
  .s-pain-track > .s-pain-card + .s-pain-card { margin-top: 0; }
}

/* Card — aspect-ratio 9:16, height fills available space */
.s-pain-card { flex-shrink: 0; width: auto; aspect-ratio: 9/16; height: 90%; max-height: 680px; position: relative; border-radius: 28px; cursor: default; perspective: 900px; will-change: transform, filter; transform-style: preserve-3d; }
@media (max-width: 900px) {
  .s-pain-card {
    position: absolute;
    top: 50%;
    left: 50%;
    height: min(77vh, calc(100vh - 200px));
    max-height: 685px;
    min-height: 342px;
    width: auto;
    transform: translate(-50%, -50%);
  }
}

/* Glow — border-only, follows cursor position, covers 3/4 perimeter */
.s-pain-glow { position: absolute; inset: -3px; border-radius: 31px; opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 1; }
.s-pain-card:hover .s-pain-glow { opacity: 1; }
/* Outer soft halo — behind the border, no interior light */
.s-pain-glow-spot { display: none; }
/* Border line — white at cursor, orange/amber spreading 3/4 around */
.s-pain-glow-border { position: absolute; inset: 0; border-radius: inherit; background: conic-gradient(from var(--glow-angle, 0deg) at var(--glow-x, 50%) var(--glow-y, 50%), rgba(255,255,255,var(--glow-border-a, 0)) 0deg, rgba(255,200,120,calc(var(--glow-border-a, 0)*0.7)) 45deg, rgba(255,130,50,calc(var(--glow-border-a, 0)*0.4)) 90deg, rgba(255,90,44,calc(var(--glow-border-a, 0)*0.15)) 135deg, transparent 160deg, transparent 200deg, rgba(255,90,44,calc(var(--glow-border-a, 0)*0.15)) 225deg, rgba(255,130,50,calc(var(--glow-border-a, 0)*0.4)) 270deg, rgba(255,200,120,calc(var(--glow-border-a, 0)*0.7)) 315deg, rgba(255,255,255,var(--glow-border-a, 0)) 360deg); mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; -webkit-mask-composite: xor; padding: 2px; }

/* Flip + zoom inner */
.s-pain-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; -webkit-transform-style: preserve-3d; z-index: 2; }
.s-pain-card.flipped .s-pain-card-inner { transform: rotateY(180deg) scale(1.15); }
.s-pain-card.flipped { z-index: 200 !important; filter: none !important; }
@media (max-width: 600px) { .s-pain-card.flipped .s-pain-card-inner { transform: rotateY(180deg) scale(1.08); } }

/* Shared face */
.s-pain-face { position: absolute; top: 0; left: 0; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 28px; padding: 36px 28px; display: flex; flex-direction: column; border: 1px solid var(--s-line); overflow: hidden; }
/* Safari fallback: manually toggle visibility at flip midpoint (0.35s = half of 0.7s flip) */
.s-pain-card.flipped .s-pain-front { visibility: hidden; transition: visibility 0s 0.35s; }
.s-pain-card:not(.flipped) .s-pain-back { visibility: hidden; transition: visibility 0s 0.35s; }
.s-pain-card.flipped .s-pain-back { visibility: visible; }
.s-pain-card:not(.flipped) .s-pain-front { visibility: visible; }
@media (max-width: 600px) { .s-pain-face { padding: 28px 22px; } }

/* Front — must have opaque bg for Safari backface to work */
.s-pain-front { background: var(--s-bg2); position: relative; }
/* Video bg — INSIDE the 3D flip context, rotates with the card */
.s-pain-card-video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 28px; opacity: 0.3; pointer-events: none; z-index: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; transition: opacity 0.4s; }
.s-pain-card:hover .s-pain-card-video { opacity: 0.85; }
.s-pain-front.has-video { background: var(--s-bg2); }
/* Back video — plays on flip. Keep opaque bg so Safari backface-visibility works */
.s-pain-back-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 28px; pointer-events: none; z-index: 0; }
/* Centered play button (IG reel style) — paddle in the middle, fades out on play, padding-left optically centers the triangle */
.s-pain-back-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 3; width: 72px; height: 72px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.4); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity 0.3s ease, transform 0.2s ease, background 0.2s ease; opacity: 1; }
.s-pain-back-play:hover { background: rgba(0,0,0,0.6); border-color: rgba(255,255,255,0.5); transform: translate(-50%, -50%) scale(1.08); }
.s-pain-back-play.is-playing { opacity: 0; pointer-events: none; transition: opacity 0.4s ease 0.2s; }
@media (max-width: 600px) { .s-pain-back-play { width: 64px; height: 64px; } }

/* Return-to-front control — the only flip-back affordance when there's a back video */
.s-pain-back-return { position: absolute; bottom: 18px; left: 18px; z-index: 4; width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.25); background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s ease, transform 0.2s ease; }
.s-pain-back-return:hover { background: rgba(0,0,0,0.6); transform: scale(1.08); }

/* Caption sits at the bottom over a gradient, video fills the rest */
.s-pain-back.has-back-video { justify-content: flex-start; }
.s-pain-back.has-back-video::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 55%; border-radius: 28px 28px 0 0; background: linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.15) 70%, transparent 100%); z-index: 1; pointer-events: none; }
.s-pain-back.has-back-video .s-pain-back-label,
.s-pain-back.has-back-video .s-pain-back-a { position: relative; z-index: 2; text-shadow: 0 1px 8px rgba(0,0,0,0.5); }

/* Static screenshot floating over the card's solid background (matches card-1 reel framing) */
.s-pain-back.has-back-image { justify-content: flex-start; }
.s-pain-back.has-back-image .s-pain-back-label,
.s-pain-back.has-back-image .s-pain-back-a { position: relative; z-index: 2; text-shadow: 0 1px 6px rgba(0,0,0,0.35); }
.s-pain-back.has-back-image .s-pain-back-a { color: #fff; }
.s-pain-back-image { position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; width: 100%; margin: 18px 0 8px; object-fit: contain; object-position: center; pointer-events: none; filter: drop-shadow(0 12px 28px rgba(0,0,0,0.3)); }

/* Animated booking-flow mini-UI (floats on the card's solid bg like a phone screen) */
.s-pain-anim { position: relative; z-index: 1; align-self: center; width: 100%; max-width: 246px; margin: 16px auto 4px; background: #0b1018; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 13px 13px 15px; display: flex; flex-direction: column; gap: 9px; box-shadow: 0 18px 40px rgba(0,0,0,0.4); overflow: hidden; pointer-events: none; }
.s-anim-head { display: flex; align-items: center; justify-content: space-between; }
.s-anim-title { font-family: 'Inter Tight', system-ui, sans-serif; font-size: 13px; font-weight: 600; color: #fff; }
.s-anim-prog { display: flex; gap: 4px; }
.s-anim-prog i { width: 15px; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.15); transition: background 0.35s ease; }
.s-anim-prog i.on { background: #5b6ef5; }
.s-anim-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.45); }
.s-anim-pros { display: flex; flex-wrap: wrap; gap: 5px; }
.s-anim-pill { display: inline-flex; align-items: center; gap: 5px; font-family: 'Inter Tight', system-ui, sans-serif; font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); padding: 5px 9px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); transition: background 0.35s cubic-bezier(0.2,0.8,0.2,1), border-color 0.35s, color 0.35s, box-shadow 0.35s; white-space: nowrap; }
.s-anim-pill.sel { background: #5b6ef5; border-color: #5b6ef5; color: #fff; box-shadow: 0 4px 14px rgba(91,110,245,0.4); }
.s-anim-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.s-anim-when { display: flex; flex-direction: column; gap: 6px; opacity: 0; transform: translateY(8px); transition: opacity 0.45s ease, transform 0.45s ease; }
.s-anim-when.show { opacity: 1; transform: none; }
.s-anim-wheel { position: relative; }
.s-anim-sel { position: absolute; left: 0; right: 0; top: 0; height: 26px; border-radius: 8px; border: 1.5px solid #5b6ef5; background: rgba(91,110,245,0.14); transition: transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease; }
.s-anim-slot { position: relative; height: 26px; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: rgba(255,255,255,0.8); transition: color 0.3s; }
.s-anim-slot.occ { color: rgba(255,255,255,0.26); text-decoration: line-through; }
.s-anim-slot.land { color: #fff; font-weight: 600; }
.s-anim-occ { font-size: 8px; letter-spacing: 0.04em; color: #ef6a6a; text-decoration: none; text-transform: uppercase; }
.s-anim-badge { align-self: center; display: inline-flex; align-items: center; gap: 5px; margin-top: 2px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #34d399; opacity: 0; transform: scale(0.9); transition: opacity 0.3s ease, transform 0.3s ease; }
.s-anim-badge.show { opacity: 1; transform: none; }
/* Bottom gradient overlay for text legibility */
.s-pain-front.has-video::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 65%; border-radius: 0 0 28px 28px; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.2) 60%, transparent 100%); z-index: 1; pointer-events: none; }
.s-pain-front.has-video .s-pain-front-num,
.s-pain-front.has-video .s-pain-front-tag,
.s-pain-front.has-video .s-pain-front-q,
.s-pain-front.has-video .s-pain-front-cta { position: relative; z-index: 2; text-shadow: 0 1px 8px rgba(0,0,0,0.5); }
.s-pain-front-num { font-family: 'Fraunces', serif; font-size: 80px; font-style: italic; color: var(--s-accent); line-height: 1; pointer-events: none; margin-bottom: auto; }
@media (max-width: 600px) { .s-pain-front-num { font-size: 64px; } }
.s-pain-front-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--s-accent); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.s-pain-front-tag::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--s-accent); }
.s-pain-front-q { font-family: 'Inter Tight', system-ui, sans-serif; font-size: 18px; line-height: 1.5; color: var(--s-fg); font-weight: 500; }
@media (max-width: 600px) { .s-pain-front-q { font-size: 16px; } }
.s-pain-front-cta { margin-top: 24px; display: flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-accent); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
.s-pain-front-cta-arrow { display: inline-block; transition: transform 0.3s cubic-bezier(0.22,1,0.36,1); }
.s-pain-card:hover .s-pain-front-cta { color: #ffa03c; }
.s-pain-card:hover .s-pain-front-cta-arrow { transform: translateX(6px); }

/* Back */
.s-pain-back { background: linear-gradient(160deg, #1d1f12, var(--s-bg2) 55%); border-color: rgba(208,255,58,0.3); transform: rotateY(180deg); justify-content: center; }
.s-pain-back-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--s-accent2); margin-bottom: 20px; display: flex; align-items: center; gap: 6px; }
.s-pain-back-label::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--s-accent2); }
.s-pain-back-a { font-family: 'Inter Tight', system-ui, sans-serif; font-size: 20px; line-height: 1.55; color: var(--s-fg); font-weight: 500; }
@media (max-width: 600px) { .s-pain-back-a { font-size: 19px; } }
.s-pain-back-hint { margin-top: auto; padding-top: 20px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-dim); text-transform: uppercase; letter-spacing: 0.1em; }

/* Progress dots */
.s-pain-dots { flex-shrink: 0; display: flex; justify-content: center; gap: 6px; padding: 12px 0 20px; }
.s-pain-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--s-dim); transition: all 0.3s; }
.s-pain-dot.active { background: var(--s-accent); width: 20px; border-radius: 3px; }

/* === BENEFITS STICKY === */
.s-benefits { position: relative; }
.s-ben-stage { position: relative; height: 600vh; }
.s-ben-sticky { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 0 32px; overflow: hidden; }
.s-ben-head { text-align: center; margin-bottom: 0; flex-shrink: 0; padding-top: 12px; }
.s-ben-head h2 { font-size: clamp(36px, 5vw, 64px); margin: 16px 0; }
.s-ben-head h2 em { font-style: italic; color: var(--s-accent); }
.s-ben-content { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; max-width: 1280px; width: 100%; flex: 1; min-height: 0; }
.s-ben-text { align-self: center; }
.s-ben-visual { align-self: center; }
@media (max-width: 900px) {
  .s-ben-stage { height: 650vh; }
  .s-ben-sticky { padding: 0 16px; justify-content: flex-start; }
  .s-ben-head { display: none; }
  .s-ben-content { display: flex !important; flex-direction: column; width: 100%; flex: 1; min-height: 0; }
  .s-ben-text { flex-shrink: 0; padding: 8px 0 0; }
  .s-ben-kicker { font-size: 9px; }
  .s-ben-text h3 { font-size: 17px; margin: 4px 0; }
  .s-ben-body { display: block !important; font-size: 14px !important; line-height: 1.4 !important; margin: 8px 0 0 !important; max-width: none !important; }
  .s-ben-outcome { padding: 6px 12px; margin-top: 4px; }
  .s-ben-outcome { white-space: nowrap; }
  .s-ben-outcome-v { font-size: 13px; font-style: normal; font-family: 'Inter Tight', sans-serif; font-weight: 700; }
  .s-ben-outcome-l { font-size: 13px; }
  /* Visual fills all remaining space */
  .s-ben-visual { flex: 1; min-height: 0; height: 0; padding: 0; display: flex; align-items: stretch; justify-content: center; overflow: visible; position: relative; }
  /* iPhone — fill available space */
  .s-iphone { width: 72vw !important; height: auto !important; aspect-ratio: 9/19.5 !important; max-height: calc(100% - 16px) !important; border-radius: 42px !important; margin: 0 0 16px !important; }
  .s-iphone-island { width: 76px; height: 22px; top: 8px; }
  .s-iphone-screen { border-radius: 39px; }
  .s-app-statusbar { height: 36px; padding: 10px 20px 0; }
  .s-app-header { padding: 4px 12px 6px; }
  .s-app-logo { font-size: 8px; }
  /* Indicator — vertical, right side of visual area */
  .s-ben-indicator { display: flex !important; position: absolute !important; right: 4px !important; top: 50% !important; left: auto !important; transform: translateY(-50%) !important; flex-direction: column !important; gap: 6px !important; z-index: 10 !important; }
}
.s-ben-text h3 { font-size: clamp(32px, 4.5vw, 56px); margin: 16px 0; }
.s-ben-text h3 em { color: var(--s-accent); font-style: italic; }
.s-ben-kicker { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--s-accent2); }
.s-ben-body { color: var(--s-muted); font-size: 17px; line-height: 1.6; margin: 16px 0 24px; max-width: 460px; }
.s-ben-outcome { display: inline-flex; align-items: baseline; gap: 10px; padding: 14px 20px; background: var(--s-accent); color: #fff; border-radius: 99px; }
.s-ben-outcome-v { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 500; font-style: italic; }
.s-ben-outcome-l { font-size: 12px; opacity: 0.9; }
.s-ben-visual { height: 580px; background: transparent; border: none; border-radius: 24px; padding: 0; position: relative; overflow: visible; display: flex; align-items: center; justify-content: center; }
/* Floating badge over the visual */
.s-ben-outcome-float { position: absolute; bottom: 33%; left: 50%; z-index: 20; pointer-events: none; display: none; }
@media (max-width: 900px) { .s-ben-outcome-desktop { display: none !important; } }

/* Mobile-only: act subtitle + CTA hint above iPhone */
.s-ben-mobile-claim { display: none; }
.s-ben-mobile-cta { display: flex; align-items: center; justify-content: center; gap: 6px; position: absolute; left: 50%; transform: translateX(-50%); top: 24px; z-index: 30; pointer-events: none; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--s-accent); font-weight: 600; padding: 6px 12px; background: rgba(11,10,9,0.85); border: 1px solid rgba(255,90,44,0.3); border-radius: 99px; backdrop-filter: blur(8px); white-space: nowrap; }
.s-ben-mobile-cta-arrow { display: inline-block; animation: s-ben-arrow-bounce 1.6s ease-in-out infinite; }

/* Background parallax grid */
.s-ben-bg-parallax { position: absolute; inset: -500px 0; background-image: linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px); background-size: 64px 64px; pointer-events: none; z-index: 0; will-change: transform; mask: radial-gradient(ellipse at center, #000 40%, transparent 90%); -webkit-mask: radial-gradient(ellipse at center, #000 40%, transparent 90%); }

/* Intro screen — fullscreen title fading into acts (mobile only) */
.s-ben-intro { display: none; position: absolute; inset: 0; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 32px; z-index: 5; transition: opacity 0.3s; }
@media (max-width: 900px) { .s-ben-intro { display: flex; } }
.s-ben-intro h2 { font-family: 'Fraunces', serif; font-size: clamp(40px, 6vw, 72px); margin: 16px 0; line-height: 0.95; }
.s-ben-intro h2 em { font-style: italic; color: var(--s-accent); }
.s-ben-intro-hint { margin-top: 24px; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--s-muted); display: flex; align-items: center; gap: 8px; }

/* Vertical progress bar — mobile only */
.s-ben-progress-vertical { display: none; }
@media (max-width: 900px) {
  .s-ben-progress-vertical { display: block; position: absolute; right: -10px; top: 25%; bottom: 25%; width: 2px; background: rgba(255,255,255,0.08); border-radius: 2px; z-index: 15; overflow: hidden; }
  .s-ben-progress-vertical-fill { width: 100%; background: var(--s-accent); border-radius: 2px; transition: height 0.15s linear; }
  /* Hide dots indicator on mobile, replaced by vertical bar */
  .s-ben-indicator { display: none; }
}

/* Scroll hint pulsante */
.s-ben-scroll-hint { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); padding: 11px 20px; background: var(--s-accent); border: 1px solid var(--s-accent); border-radius: 99px; color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px; z-index: 2147483647; pointer-events: none; box-shadow: 0 8px 30px rgba(0,0,0,0.5); animation: s-ben-hint-pulse 1.6s ease-in-out infinite; }
@keyframes s-ben-hint-pulse { 0%, 100% { opacity: 0.85; transform: translateX(-50%) scale(1); } 50% { opacity: 1; transform: translateX(-50%) scale(1.04); } }
@media (max-width: 600px) { .s-ben-scroll-hint { font-size: 10px; padding: 8px 14px; bottom: 20px; } }
@media (max-width: 900px) {
  .s-ben-mobile-claim { display: block; font-family: 'Inter Tight', sans-serif; font-size: 17px; font-weight: 400; color: var(--s-muted); margin-top: 10px; line-height: 1.3; }
  /* CTA inside the iPhone visual, top-right area (not tapped by chat) */
  .s-ben-visual { position: relative; }
  .s-ben-mobile-cta { display: flex; align-items: center; justify-content: center; gap: 6px; position: absolute; left: 50%; transform: translateX(-50%); top: 24px; z-index: 30; pointer-events: none; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--s-accent); font-weight: 600; padding: 6px 12px; background: rgba(11,10,9,0.85); border: 1px solid rgba(255,90,44,0.3); border-radius: 99px; backdrop-filter: blur(8px); white-space: nowrap; }
  .s-ben-mobile-cta-arrow { display: inline-block; animation: s-ben-arrow-bounce 1.6s ease-in-out infinite; }
}
@keyframes s-ben-arrow-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
@media (max-width: 900px) { .s-ben-visual { height: auto; min-height: 380px; } }

/* iPhone 16 Pro mockup frame */
.s-iphone { position: relative; width: 280px; height: 660px; border-radius: 52px; background: #1c1c1e; border: 3px solid #38383a; box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06); overflow: hidden; }
/* Dynamic Island */
.s-iphone-island { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 96px; height: 28px; background: #000; border-radius: 20px; z-index: 10; }
@media (max-width: 600px) { .s-iphone-island { width: 84px; height: 24px; top: 8px; } }
.s-iphone-screen { position: absolute; inset: 3px; border-radius: 49px; overflow: hidden; background: #0a0e1a; display: flex; flex-direction: column; }
@media (max-width: 600px) { .s-iphone-screen { border-radius: 43px; } }

/* App header inside phone */
/* Status bar above header */
.s-app-statusbar { flex-shrink: 0; height: 44px; padding: 14px 24px 0; display: flex; justify-content: space-between; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--s-fg); font-weight: 600; }
.s-app-statusbar-right { display: flex; align-items: center; gap: 4px; }
.s-app-statusbar-batt { width: 18px; height: 9px; border: 1px solid var(--s-fg); border-radius: 2px; position: relative; }
.s-app-statusbar-batt::after { content: ''; position: absolute; inset: 1px; right: 3px; background: var(--s-fg); border-radius: 1px; }
.s-app-statusbar-batt::before { content: ''; position: absolute; right: -3px; top: 2px; width: 2px; height: 4px; background: var(--s-fg); border-radius: 0 1px 1px 0; }
.s-app-header { padding: 8px 16px 10px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.s-app-logo { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--s-fg); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; }

/* Date bar */
.s-app-datebar { padding: 8px 16px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.s-app-date-label { font-size: 12px; font-weight: 600; color: var(--s-fg); }
.s-app-date-sub { font-size: 9px; color: var(--s-muted); font-family: 'JetBrains Mono', monospace; }

/* Week strip */
.s-app-week { display: flex; gap: 4px; padding: 6px 16px 10px; flex-shrink: 0; }
.s-app-day { flex: 1; text-align: center; font-size: 9px; color: var(--s-muted); font-family: 'JetBrains Mono', monospace; }
.s-app-day-num { font-size: 13px; font-weight: 600; color: var(--s-fg); margin-top: 2px; }
.s-app-day.today .s-app-day-num { background: #3b82f6; color: #fff; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; margin: 2px auto 0; }

/* Appointment slots */
.s-app-slots { flex: 1; overflow: hidden; padding: 0 12px 16px; }
.s-app-time { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--s-dim); padding: 8px 4px 4px; }
.s-app-appt { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; opacity: 0; transform: translateY(16px) scale(0.97); transition: all 0.5s cubic-bezier(0.22,1,0.36,1); }
.s-app-appt.visible { opacity: 1; transform: none; }
.s-app-appt-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.s-app-appt-status { font-family: 'JetBrains Mono', monospace; font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; display: flex; align-items: center; gap: 4px; }
.s-app-appt-status.confirmed { color: #4ade80; }
.s-app-appt-status.pending { color: #fbbf24; }
.s-app-appt-price { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-fg); font-weight: 600; }
.s-app-appt-name { font-size: 13px; font-weight: 600; color: var(--s-fg); margin-bottom: 2px; }
.s-app-appt-svc { font-size: 10px; color: var(--s-muted); }
.s-app-appt-pro { font-size: 9px; color: var(--s-dim); margin-top: 3px; display: flex; align-items: center; gap: 4px; }

/* Bottom sheet — appointment detail */
.s-app-sheet-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 30; opacity: 0; pointer-events: none; transition: opacity 0.3s; border-radius: inherit; }
.s-app-sheet-overlay.open { opacity: 1; pointer-events: auto; }
.s-app-sheet { position: absolute; bottom: 0; left: 0; right: 0; background: #1c1e23; border-radius: 16px 16px 0 0; z-index: 31; transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.22,1,0.36,1); padding: 0 16px 20px; max-height: 85%; overflow-y: auto; }
.s-app-sheet.open { transform: translateY(0); }
.s-app-sheet-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin: 10px auto 14px; }
.s-app-sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.s-app-sheet-title { font-size: 14px; font-weight: 600; color: var(--s-fg); }
.s-app-sheet-close { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.06); border: none; color: var(--s-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; }
.s-app-sheet-status { font-family: 'JetBrains Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
.s-app-sheet-status.pending { color: #fbbf24; }
.s-app-sheet-status.confirmed { color: #4ade80; }
.s-app-sheet-name { font-size: 16px; font-weight: 700; color: var(--s-fg); margin-bottom: 4px; }
.s-app-sheet-date { font-size: 11px; color: var(--s-muted); display: flex; align-items: center; gap: 6px; margin-bottom: 14px; }
.s-app-sheet-info { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; }
.s-app-sheet-info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
.s-app-sheet-info-label { color: var(--s-muted); }
.s-app-sheet-info-val { color: var(--s-fg); font-weight: 500; text-align: right; max-width: 60%; }
.s-app-sheet-info-val.price { font-weight: 700; color: var(--s-fg); }
.s-app-sheet-btns { display: flex; gap: 8px; margin-bottom: 8px; }
.s-app-sheet-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 10px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--s-fg); }
.s-app-sheet-btn.primary { background: #3b82f6; border-color: #3b82f6; color: #fff; }
.s-app-sheet-btn.wa { background: #25d366; border-color: #25d366; color: #fff; }
.s-app-sheet-btn.danger { border-color: rgba(239,68,68,0.4); color: #ef4444; }

/* WhatsApp popup sheet — stacks on top of detail sheet */
.s-app-wa-sheet { position: absolute; bottom: 0; left: 0; right: 0; background: #1c1e23; border-radius: 16px 16px 0 0; z-index: 35; transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.22,1,0.36,1); padding: 0 16px 20px; max-height: 70%; overflow-y: auto; }
.s-app-wa-sheet.open { transform: translateY(0); }
.s-app-wa-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 0 12px; }
.s-app-wa-title { font-size: 14px; font-weight: 700; color: var(--s-fg); }
.s-app-wa-sub { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 11px; }
.s-app-wa-sub-label { color: var(--s-muted); }
.s-app-wa-sub-link { color: #3b82f6; font-weight: 600; display: flex; align-items: center; gap: 4px; cursor: pointer; }
.s-app-wa-option { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.2s; }
.s-app-wa-option:hover { border-color: #25d366; }
.s-app-wa-option-title { font-size: 12px; font-weight: 600; color: var(--s-fg); margin-bottom: 3px; }
.s-app-wa-option-preview { font-size: 10px; color: var(--s-muted); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Config flow screens */
.s-cfg-wrap { flex: 1; min-height: 0; position: relative; overflow: hidden; padding-bottom: 60px; }
.s-cfg-screen { position: absolute; inset: 0; transition: transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.3s; display: flex; flex-direction: column; overflow: hidden; }
.s-cfg-screen-inner { transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); will-change: transform; }
.s-cfg-screen.out-left { transform: translateX(-100%); opacity: 0; }
.s-cfg-screen.out-right { transform: translateX(100%); opacity: 0; }
.s-cfg-screen.active { transform: translateX(0); opacity: 1; }
.s-cfg-title { font-size: 16px; font-weight: 700; color: var(--s-fg); padding: 8px 16px 12px; }
.s-cfg-back { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--s-fg); padding: 8px 16px 4px; }
.s-cfg-section { font-family: 'JetBrains Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--s-muted); padding: 12px 16px 6px; }
.s-cfg-card { margin: 0 12px 2px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; }
.s-cfg-row { display: flex; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 12px; color: var(--s-fg); gap: 10px; }
.s-cfg-row:last-child { border-bottom: none; }
.s-cfg-row-icon { color: var(--s-muted); flex-shrink: 0; }
.s-cfg-row-label { flex: 1; }
.s-cfg-row-chev { color: var(--s-dim); }
.s-cfg-row.highlight { background: rgba(59,130,246,0.08); }
/* Toggle */
.s-cfg-toggle { width: 34px; height: 18px; border-radius: 9px; background: rgba(255,255,255,0.15); position: relative; flex-shrink: 0; transition: background 0.3s; }
.s-cfg-toggle.on { background: #3b82f6; }
.s-cfg-toggle-dot { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: transform 0.3s; }
.s-cfg-toggle.on .s-cfg-toggle-dot { transform: translateX(16px); }
.s-cfg-toggle-label { color: #3b82f6; font-size: 9px; font-weight: 600; margin-left: 4px; }
/* Input fields */
.s-cfg-input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 10px; font-size: 10px; color: var(--s-muted); margin: 4px 14px 6px; font-family: 'Inter Tight', sans-serif; }
.s-cfg-input-label { font-size: 9px; color: var(--s-dim); padding: 6px 14px 0; }
/* Deposit config */
.s-cfg-deposit-val { font-size: 20px; font-weight: 700; color: var(--s-fg); padding: 4px 14px; display: flex; align-items: baseline; gap: 4px; }
.s-cfg-deposit-val span { font-size: 12px; color: var(--s-muted); }
/* Save button */
.s-cfg-save { margin: 10px 12px; padding: 10px; background: #3b82f6; border-radius: 10px; color: #fff; font-size: 12px; font-weight: 600; text-align: center; }
/* Dashboard card */
.s-cfg-dash-card { margin: 8px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px; }
.s-cfg-dash-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
.s-cfg-dash-amount { font-family: 'Fraunces', serif; font-size: 32px; color: var(--s-accent2); font-variant-numeric: tabular-nums; }
.s-cfg-dash-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 11px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.s-cfg-dash-row:last-child { border-bottom: none; }
.s-cfg-dash-name { color: var(--s-fg); }
.s-cfg-dash-deposit { color: var(--s-accent2); font-family: 'JetBrains Mono', monospace; font-size: 10px; }
.s-cfg-dash-status { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #4ade80; text-transform: uppercase; letter-spacing: 0.05em; }

/* Non-iphone visuals keep original container */
.s-ben-visual-box { height: 100%; width: 100%; background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 24px; padding: 24px; position: relative; overflow: hidden; }
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

/* === WEB SHOWCASE === */
.s-web { padding: 140px 0; position: relative; overflow: hidden; }
@media (max-width: 600px) { .s-web { padding: 90px 0; } }
.s-web-head { max-width: 780px; padding: 0 32px; margin: 0 auto 64px; text-align: center; }
@media (max-width: 600px) { .s-web-head { padding: 0 20px; margin: 0 0 40px; text-align: left; } }
.s-web-head h2 { font-size: clamp(36px, 5.5vw, 64px); margin: 18px 0; }
.s-web-head h2 em { font-style: italic; color: var(--s-accent); }
.s-web-head p { color: var(--s-muted); font-size: 17px; line-height: 1.6; max-width: 540px; margin: 10px auto 0; }
@media (max-width: 600px) { .s-web-head p { font-size: 15px; margin: 10px 0 0; } }

/* Stage with laptop frame */
.s-web-stage { display: flex; flex-direction: column; align-items: center; max-width: 1200px; margin: 0 auto; padding: 0 32px; }
@media (max-width: 600px) { .s-web-stage { padding: 0 16px; } }

/* Laptop mockup frame (desktop) */
.s-web-laptop { position: relative; width: 100%; max-width: 880px; aspect-ratio: 16/10; background: linear-gradient(180deg, #1a1a1e 0%, #0d0d10 100%); border-radius: 16px 16px 4px 4px; padding: 14px 14px 14px; box-shadow: 0 30px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05); }
.s-web-laptop::before { content: ''; position: absolute; top: 6px; left: 50%; transform: translateX(-50%); width: 60px; height: 5px; background: #2a2a2e; border-radius: 3px; }
.s-web-laptop-screen { position: relative; width: 100%; height: 100%; border-radius: 6px; overflow: hidden; background: #0a0e1a; }
.s-web-laptop-base { width: calc(100% + 120px); margin: 0 -60px; height: 18px; background: linear-gradient(180deg, #2a2a2e, #1a1a1e); border-radius: 0 0 16px 16px; position: relative; }
.s-web-laptop-base::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 100px; height: 5px; background: #0d0d10; border-radius: 0 0 8px 8px; }

/* iPhone variant (mobile) */
@media (max-width: 700px) {
  .s-web-laptop { aspect-ratio: 9/16; max-width: 280px; border-radius: 38px; padding: 10px; background: #1c1c1e; border: 2px solid #38383a; }
  .s-web-laptop::before { width: 80px; height: 22px; top: 6px; border-radius: 14px; background: #000; }
  .s-web-laptop-screen { border-radius: 28px; }
  .s-web-laptop-base { display: none; }
}

/* Web mock screens (one per vertical) */
.s-web-mock { position: absolute; inset: 0; opacity: 0; transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1); display: flex; flex-direction: column; overflow: hidden; }
.s-web-mock.active { opacity: 1; }
.s-web-mock-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; }
.s-web-mock-logo { display: flex; align-items: center; gap: 8px; }
.s-web-mock-logo-dot { width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-weight: 700; font-size: 12px; color: #fff; }
.s-web-mock-name { font-family: 'Fraunces', serif; font-size: 13px; font-weight: 600; }
.s-web-mock-cta { padding: 5px 12px; border-radius: 99px; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #fff; }
.s-web-mock-hero { flex: 1; padding: 24px; display: flex; flex-direction: column; justify-content: center; text-align: center; position: relative; overflow: hidden; }
.s-web-mock-hero-bg { position: absolute; inset: 0; opacity: 0.4; }
.s-web-mock-hero-content { position: relative; z-index: 1; }
.s-web-mock-tagline { font-family: 'Fraunces', serif; font-weight: 700; line-height: 1.05; margin-bottom: 12px; }
.s-web-mock-rating { display: inline-flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.05em; opacity: 0.85; }
.s-web-mock-buttons { display: flex; gap: 8px; justify-content: center; margin-top: 18px; }
.s-web-mock-btn { padding: 8px 16px; border-radius: 8px; font-size: 11px; font-weight: 700; }
.s-web-mock-gallery { padding: 0 24px 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; flex-shrink: 0; }
.s-web-mock-gallery > div { aspect-ratio: 1/1; border-radius: 3px; }
@media (max-width: 700px) {
  .s-web-mock-header { padding: 10px 14px; }
  .s-web-mock-hero { padding: 20px 16px; }
  .s-web-mock-gallery { padding: 0 14px 14px; }
}

/* Vertical-specific palettes */
.s-web-mock.v-barber { background: #1a1612; color: #f5efe3; }
.s-web-mock.v-barber .s-web-mock-logo-dot { background: linear-gradient(135deg, #b08968, #6b4e3d); }
.s-web-mock.v-barber .s-web-mock-cta { background: #b08968; }
.s-web-mock.v-barber .s-web-mock-hero-bg { background: radial-gradient(ellipse at center, rgba(176,137,104,0.3), transparent 70%); }
.s-web-mock.v-barber .s-web-mock-btn-primary { background: #b08968; color: #fff; }
.s-web-mock.v-barber .s-web-mock-btn-ghost { background: transparent; color: #f5efe3; border: 1px solid rgba(245,239,227,0.2); }
.s-web-mock.v-barber .s-web-mock-gallery > div { background: linear-gradient(135deg, #2a1f17, #4a3a2a); }

.s-web-mock.v-salon { background: #faf6f0; color: #2a1f17; }
.s-web-mock.v-salon .s-web-mock-logo-dot { background: linear-gradient(135deg, #d4af6f, #8b7355); }
.s-web-mock.v-salon .s-web-mock-cta { background: #c9a663; color: #fff; }
.s-web-mock.v-salon .s-web-mock-hero-bg { background: radial-gradient(ellipse at center, rgba(212,175,111,0.35), transparent 70%); }
.s-web-mock.v-salon .s-web-mock-btn-primary { background: #2a1f17; color: #fff; }
.s-web-mock.v-salon .s-web-mock-btn-ghost { background: transparent; color: #2a1f17; border: 1px solid rgba(42,31,23,0.2); }
.s-web-mock.v-salon .s-web-mock-rating { color: #2a1f17; }
.s-web-mock.v-salon .s-web-mock-gallery > div { background: linear-gradient(135deg, #e8d5b7, #c9a663); }

.s-web-mock.v-nails { background: #fdf2f7; color: #831843; }
.s-web-mock.v-nails .s-web-mock-logo-dot { background: linear-gradient(135deg, #ec4899, #be185d); }
.s-web-mock.v-nails .s-web-mock-cta { background: #ec4899; color: #fff; }
.s-web-mock.v-nails .s-web-mock-hero-bg { background: radial-gradient(ellipse at center, rgba(236,72,153,0.25), transparent 70%); }
.s-web-mock.v-nails .s-web-mock-btn-primary { background: #ec4899; color: #fff; }
.s-web-mock.v-nails .s-web-mock-btn-ghost { background: transparent; color: #831843; border: 1px solid rgba(131,24,67,0.2); }
.s-web-mock.v-nails .s-web-mock-rating { color: #831843; }
.s-web-mock.v-nails .s-web-mock-gallery > div { background: linear-gradient(135deg, #fce7f3, #f9a8d4); }

.s-web-mock.v-spa { background: #f0f7f0; color: #1c3d1c; }
.s-web-mock.v-spa .s-web-mock-logo-dot { background: linear-gradient(135deg, #6b9166, #3a5a3a); }
.s-web-mock.v-spa .s-web-mock-cta { background: #6b9166; color: #fff; }
.s-web-mock.v-spa .s-web-mock-hero-bg { background: radial-gradient(ellipse at center, rgba(107,145,102,0.3), transparent 70%); }
.s-web-mock.v-spa .s-web-mock-btn-primary { background: #3a5a3a; color: #fff; }
.s-web-mock.v-spa .s-web-mock-btn-ghost { background: transparent; color: #1c3d1c; border: 1px solid rgba(28,61,28,0.2); }
.s-web-mock.v-spa .s-web-mock-rating { color: #1c3d1c; }
.s-web-mock.v-spa .s-web-mock-gallery > div { background: linear-gradient(135deg, #d1e3d1, #8aab85); }

/* URL bar below laptop */
.s-web-url { margin-top: 32px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--s-muted); display: flex; align-items: center; gap: 8px; }
.s-web-url-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; animation: s-pulse 2s infinite; }
@media (max-width: 600px) { .s-web-url { font-size: 11px; margin-top: 20px; } }

/* Tabs (vertical selectors) */
.s-web-tabs { display: flex; gap: 10px; margin-top: 28px; flex-wrap: wrap; justify-content: center; }
.s-web-tab { padding: 8px 18px; border-radius: 99px; background: transparent; border: 1px solid var(--s-line); font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--s-muted); cursor: pointer; transition: all 0.25s; }
.s-web-tab.active { background: var(--s-accent); border-color: var(--s-accent); color: #fff; }
.s-web-tab:hover { color: var(--s-fg); border-color: var(--s-muted); }
.s-web-tab.active:hover { color: #fff; border-color: var(--s-accent); }
@media (max-width: 600px) { .s-web-tab { padding: 6px 14px; font-size: 10px; } }

/* Features grid */
.s-web-features { margin-top: 100px; padding: 0 32px; max-width: 1080px; margin-left: auto; margin-right: auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
@media (max-width: 900px) { .s-web-features { grid-template-columns: repeat(2, 1fr); gap: 22px; } }
@media (max-width: 600px) { .s-web-features { grid-template-columns: 1fr; gap: 18px; margin-top: 60px; padding: 0 20px; } }
.s-web-feat { display: flex; gap: 14px; align-items: flex-start; }
.s-web-feat-icon { flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; background: rgba(255,90,44,0.08); border: 1px solid rgba(255,90,44,0.2); display: flex; align-items: center; justify-content: center; color: var(--s-accent); }
.s-web-feat-icon svg { width: 20px; height: 20px; }
.s-web-feat-title { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 600; color: var(--s-fg); margin-bottom: 4px; }
.s-web-feat-desc { font-size: 13px; color: var(--s-muted); line-height: 1.5; }

/* Final CTA */
.s-web-final { margin-top: 80px; text-align: center; padding: 0 32px; }
@media (max-width: 600px) { .s-web-final { margin-top: 50px; padding: 0 20px; } }
.s-web-final p { font-family: 'Fraunces', serif; font-size: 22px; font-style: italic; color: var(--s-fg); max-width: 600px; margin: 0 auto 24px; line-height: 1.4; }
@media (max-width: 600px) { .s-web-final p { font-size: 18px; } }
.s-web-final-link { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: var(--s-accent); color: #fff; border-radius: 99px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none; transition: transform 0.25s; }
.s-web-final-link:hover { transform: translateY(-2px); }

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
.s-chat-section-head { text-align: center; max-width: 780px; margin: 0 auto 64px; padding: 0 20px; }
.s-chat-section-head h2 { font-size: clamp(40px, 5.5vw, 72px); margin: 20px 0; line-height: 1.05; }
.s-chat-section-head h2 em { font-style: italic; color: var(--s-accent); }
.s-chat-section-head p { color: var(--s-muted); font-size: 17px; line-height: 1.6; max-width: 560px; margin: 0 auto; }
@media (max-width: 600px) { .s-chat-section-head { text-align: left; margin: 0 0 40px; } .s-chat-section-head p { margin: 0; font-size: 15px; } }
.s-chat-wrap { display: grid; grid-template-columns: 1fr 1.05fr; gap: 60px; align-items: start; }
@media (max-width: 900px) { .s-chat-wrap { grid-template-columns: 1fr; gap: 48px; } }

/* WhatsApp features list (left side) */
.s-wa-features { display: flex; flex-direction: column; gap: 12px; margin: 32px 0; }
.s-wa-feat { display: flex; gap: 14px; padding: 16px 18px; background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 14px; transition: border-color 0.25s, transform 0.25s, background 0.25s; }
.s-wa-feat:hover { border-color: rgba(208, 255, 58, 0.4); transform: translateY(-2px); background: rgba(208, 255, 58, 0.03); }
.s-wa-feat-icon { width: 38px; height: 38px; flex-shrink: 0; border-radius: 10px; background: linear-gradient(135deg, rgba(208, 255, 58, 0.18), rgba(208, 255, 58, 0.04)); display: flex; align-items: center; justify-content: center; color: var(--s-accent2); }
.s-wa-feat-icon svg { width: 18px; height: 18px; }
.s-wa-feat-body { flex: 1; min-width: 0; }
.s-wa-feat-title { font-size: 14px; font-weight: 600; margin-bottom: 3px; color: var(--s-fg); }
.s-wa-feat-desc { font-size: 13px; color: var(--s-muted); line-height: 1.5; margin: 0; }

/* Stat card (replaces founder) */
.s-wa-stat { padding: 24px 26px; background: linear-gradient(135deg, rgba(208, 255, 58, 0.10), rgba(208, 255, 58, 0.02)); border: 1px solid rgba(208, 255, 58, 0.28); border-radius: 18px; }
.s-wa-stat-big { font-family: 'Fraunces', serif; font-size: clamp(48px, 6vw, 68px); font-weight: 600; color: var(--s-accent2); line-height: 1; letter-spacing: -0.03em; }
.s-wa-stat-label { font-size: 15px; color: var(--s-fg); margin-top: 10px; line-height: 1.5; max-width: 380px; }
.s-wa-stat-foot { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 14px; }

/* WhatsApp window */
.s-chat-window { background: #0b141a; border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; height: 640px; box-shadow: 0 30px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04); }
@media (max-width: 600px) { .s-chat-window { height: 580px; border-radius: 14px; } }

.s-chat-head { padding: 10px 14px; background: #202c33; display: flex; align-items: center; gap: 12px; }
.s-chat-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--s-accent), var(--s-accent2)); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.s-chat-avatar svg { width: 20px; height: 20px; }
.s-chat-head-info { flex: 1; min-width: 0; }
.s-chat-head-name { font-weight: 500; font-size: 15px; color: #e9edef; display: block; }
.s-chat-head-name::after { display: none; }
.s-chat-head-status { font-family: inherit; font-size: 12px; color: #aebac1; text-transform: none; letter-spacing: 0; margin-top: 1px; }
.s-chat-head-icons { display: flex; gap: 22px; color: #aebac1; align-items: center; }
.s-chat-head-icons svg { width: 18px; height: 18px; }
@media (max-width: 600px) { .s-chat-head-icons { gap: 16px; } .s-chat-head-icons svg { width: 16px; height: 16px; } }

/* Tabs */
.s-chat-tabs { display: flex; gap: 6px; padding: 10px; background: #111b21; border-bottom: 1px solid rgba(255,255,255,0.04); overflow-x: auto; scrollbar-width: none; }
.s-chat-tabs::-webkit-scrollbar { display: none; }
.s-chat-tab { flex: 1; min-width: max-content; padding: 7px 12px; background: transparent; border: 1px solid transparent; color: #aebac1; font-size: 12px; font-weight: 500; cursor: none; border-radius: 99px; transition: all 0.2s; white-space: nowrap; font-family: inherit; }
.s-chat-tab:hover { color: #e9edef; background: rgba(255,255,255,0.04); }
.s-chat-tab.active { background: rgba(37, 211, 102, 0.18); border-color: rgba(37, 211, 102, 0.32); color: #25d366; }
.s-chat-tab.active:hover { background: rgba(37, 211, 102, 0.22); }

/* Body (with subtle WA pattern) */
.s-chat-body {
  flex: 1;
  padding: 16px 12px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background-color: #0b141a;
  background-image:
    radial-gradient(circle at 18% 24%, rgba(255,255,255,0.03) 1.2px, transparent 1.6px),
    radial-gradient(circle at 62% 68%, rgba(255,255,255,0.022) 1.2px, transparent 1.6px),
    radial-gradient(circle at 82% 18%, rgba(255,255,255,0.018) 1px, transparent 1.4px),
    radial-gradient(circle at 35% 82%, rgba(255,255,255,0.02) 1px, transparent 1.4px);
  background-size: 80px 80px, 110px 110px, 60px 60px, 90px 90px;
}
.s-chat-body::-webkit-scrollbar { width: 6px; }
.s-chat-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 3px; }

/* Date separator */
.s-chat-date { align-self: center; padding: 4px 12px; background: rgba(28, 41, 51, 0.85); color: #aebac1; font-size: 11px; border-radius: 8px; margin: 4px 0 8px; box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); }

/* Messages */
.s-chat-msg {
  max-width: 78%;
  padding: 6px 9px 6px 10px;
  border-radius: 8px;
  font-size: 14.2px;
  line-height: 1.38;
  white-space: pre-wrap;
  position: relative;
  opacity: 0;
  transform: translateY(6px);
  animation: s-msgIn 0.32s forwards;
  box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
  word-wrap: break-word;
}
@keyframes s-msgIn { to { opacity: 1; transform: none; } }
.s-chat-msg strong, .s-chat-msg b { font-weight: 600; }
.s-chat-msg.cliente { background: #202c33; color: #e9edef; align-self: flex-start; border-top-left-radius: 0; }
.s-chat-msg.salon { background: #005c4b; color: #e9edef; align-self: flex-end; border-top-right-radius: 0; }
.s-chat-msg-text { display: block; }
.s-chat-msg-meta { display: inline-flex; align-items: center; gap: 3px; float: right; margin: 4px -2px -2px 8px; height: 14px; }
.s-chat-msg-time { font-size: 10.5px; color: rgba(233, 237, 239, 0.55); }
.s-chat-msg.cliente .s-chat-msg-time { color: rgba(233, 237, 239, 0.45); }
.s-chat-msg-ticks { color: #53bdeb; display: inline-flex; align-items: center; }
.s-chat-msg-ticks svg { width: 15px; height: 11px; }
.s-chat-msg.cliente .s-chat-msg-ticks { display: none; }

/* Typing indicator */
.s-chat-typing { display: inline-flex; align-items: center; gap: 4px; padding: 11px 14px; background: #202c33; border-radius: 8px; border-top-left-radius: 0; align-self: flex-start; box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); }
.s-chat-typing span { width: 6px; height: 6px; border-radius: 50%; background: rgba(174, 186, 193, 0.6); animation: s-typingDot 1.4s infinite; }
.s-chat-typing span:nth-child(2) { animation-delay: 0.2s; }
.s-chat-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes s-typingDot { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-3px); opacity: 1; } }

/* Input bar (visual only) */
.s-chat-input { display: flex; align-items: center; gap: 8px; padding: 8px 10px 10px; background: #111b21; }
.s-chat-input-btn { color: #aebac1; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; }
.s-chat-input-btn svg { width: 22px; height: 22px; }
.s-chat-input-field { flex: 1; background: #2a3942; border-radius: 99px; padding: 9px 16px; color: #8696a0; font-size: 13.5px; display: flex; align-items: center; gap: 10px; min-width: 0; }
.s-chat-input-field-text { flex: 1; }
.s-chat-input-mic { background: #00a884; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.s-chat-input-mic svg { width: 18px; height: 18px; }

/* === PRICING / ROI === */
.s-pricing { padding: 120px 0; }
.s-price-head { text-align: center; margin-bottom: 60px; }
.s-price-head h2 { font-size: clamp(40px, 5.5vw, 72px); margin: 20px 0; }
.s-price-head h2 em { font-style: italic; color: var(--s-accent); }
.s-price-head p { color: var(--s-muted); font-size: 17px; max-width: 520px; margin: 0 auto; }
.s-roi { background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 20px; padding: 28px; margin: 0 auto 40px; max-width: 880px; }
@media (max-width: 600px) { .s-roi { padding: 20px; border-radius: 18px; margin-bottom: 32px; } }
.s-roi-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px; }
.s-roi-head h3 { font-family: 'Fraunces', serif; font-size: 20px; font-style: italic; }
.s-roi-badge { font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 4px 10px; border: 1px solid var(--s-accent); color: var(--s-accent); border-radius: 99px; text-transform: uppercase; letter-spacing: 0.15em; }
.s-roi-sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
@media (max-width: 700px) { .s-roi-sliders { grid-template-columns: 1fr; gap: 18px; } }
.s-roi-slider-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.s-roi-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--s-muted); }
.s-roi-val { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--s-fg); font-size: 14px; }
.s-roi input[type=range] { width: 100%; -webkit-appearance: none; height: 4px; background: var(--s-line); border-radius: 99px; outline: none; }
.s-roi input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; background: var(--s-accent); border-radius: 50%; cursor: none; border: 3px solid var(--s-bg2); box-shadow: 0 0 0 1.5px var(--s-accent); }
.s-roi input[type=range]::-moz-range-thumb { width: 18px; height: 18px; background: var(--s-accent); border-radius: 50%; border: 3px solid var(--s-bg2); }
.s-roi-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 24px; }
@media (max-width: 600px) { .s-roi-compare { grid-template-columns: 1fr; gap: 10px; } }
.s-roi-col { padding: 18px 20px; border-radius: 14px; position: relative; overflow: hidden; }
.s-roi-col.bad { background: rgba(255,90,44,0.07); border: 1px solid rgba(255,90,44,0.18); }
.s-roi-col.good { background: rgba(208,255,58,0.07); border: 1px solid rgba(208,255,58,0.18); }
.s-roi-col-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--s-muted); margin-bottom: 6px; }
.s-roi-col-val { font-family: 'Fraunces', serif; font-size: clamp(32px, 4.5vw, 42px); font-weight: 400; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1.05; }
.s-roi-col.bad .s-roi-col-val { color: var(--s-accent); }
.s-roi-col.good .s-roi-col-val { color: var(--s-accent2); }
.s-roi-col-sub { font-size: 12px; color: var(--s-muted); margin-top: 6px; line-height: 1.4; }
.s-roi-saves { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--s-line); }
.s-roi-saves-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.12em; }
.s-roi-saves-val { font-family: 'Fraunces', serif; font-style: italic; font-size: clamp(30px, 4.5vw, 48px); color: var(--s-fg); margin-top: 4px; }
.s-roi-saves-val em { color: var(--s-accent2); font-style: normal; }

.s-price-toggle-wrap { display: flex; justify-content: center; margin: 8px 0 56px; }
.s-price-toggle { display: inline-flex; padding: 4px; background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 99px; gap: 4px; }
.s-price-toggle button { padding: 10px 22px; background: transparent; border: none; color: var(--s-muted); font-size: 13px; font-weight: 600; cursor: none; border-radius: 99px; transition: all 0.25s; display: inline-flex; align-items: center; gap: 8px; font-family: inherit; }
.s-price-toggle button:hover { color: var(--s-fg); }
.s-price-toggle button.active { background: var(--s-fg); color: var(--s-bg); }
.s-price-toggle-badge { font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 2px 7px; border-radius: 99px; background: rgba(255,90,44,0.16); color: var(--s-accent); letter-spacing: 0.05em; font-weight: 700; }
.s-price-toggle button.active .s-price-toggle-badge { background: rgba(255,90,44,0.25); }
.s-price-billing { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: -8px; }
@media (max-width: 600px) { .s-price-toggle-wrap { margin: 4px 0 40px; } .s-price-toggle button { padding: 9px 18px; font-size: 12px; } }

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
.s-price-cta { padding: 12px; background: transparent; border: 1px solid var(--s-line); color: var(--s-fg); border-radius: 99px; cursor: none; font-size: 13px; font-weight: 600; transition: all 0.2s; text-decoration: none; display: block; text-align: center; }
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

/* === AFFILIATE STRIP === */
.s-aff { padding: 40px 0 80px; }
.s-aff-card { max-width: 880px; margin: 0 auto; padding: 22px 28px; background: linear-gradient(135deg, rgba(208, 255, 58, 0.08), rgba(208, 255, 58, 0.02)); border: 1px solid rgba(208, 255, 58, 0.28); border-radius: 18px; display: flex; align-items: center; gap: 28px; }
@media (max-width: 720px) { .s-aff-card { flex-direction: column; align-items: flex-start; gap: 16px; padding: 22px; } }
.s-aff-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--s-accent2); margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
.s-aff-eyebrow::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--s-accent2); }
.s-aff-text { flex: 1; font-size: 16px; line-height: 1.5; color: var(--s-fg); }
.s-aff-text strong { color: var(--s-accent2); font-weight: 600; }
.s-aff-cta { display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; background: transparent; border: 1px solid rgba(208, 255, 58, 0.5); border-radius: 99px; color: var(--s-accent2); font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none; white-space: nowrap; transition: all 0.25s; flex-shrink: 0; }
.s-aff-cta:hover { background: rgba(208, 255, 58, 0.14); border-color: var(--s-accent2); transform: translateY(-2px); }

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
.s-how-cta { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; margin-top: 40px; }

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
    let mx = 0, my = 0; // mouse target
    let rx = 0, ry = 0; // ring interpolated
    let rafId = 0;
    const move = (e) => { mx = e.clientX; my = e.clientY; };
    const tick = () => {
      // Dot follows mouse directly (no CSS transition, just RAF batching)
      if (dotRef.current) dotRef.current.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      // Ring follows with smooth lerp (0.25 = responsive but soft)
      rx += (mx - rx) * 0.25;
      ry += (my - ry) * 0.25;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      rafId = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', move, { passive: true });
    rafId = requestAnimationFrame(tick);
    const over = (e) => {
      const t = e.target;
      if (t.closest('a, button, input, .s-hoverable, .s-faq-item, .s-chat-tab, .s-tl-scrub-pill')) {
        dotRef.current?.classList.add('hover');
      }
    };
    const out = () => dotRef.current?.classList.remove('hover');
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);
    return () => {
      cancelAnimationFrame(rafId);
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
function SNav() {
  const [hidden, setHidden] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setTransparent(y < 60);
      const down = y > lastY.current && y > 80;
      setHidden(down);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`s-nav ${hidden ? 'hidden' : ''} ${transparent ? 'transparent' : ''}`}>
      <div className="s-nav-logo">
        <span className="s-nav-logo-dot"></span>
        Skubik
      </div>
      <div className="s-nav-links">
        <a href="#dolor">Dolor</a>
        <a href="#beneficios">Beneficios</a>
        <a href="#precios">Precios</a>
        <a href="#faq">FAQ</a>
      </div>
      <div className="s-nav-cta">
        <Link to="/login" className="s-nav-icon-btn" aria-label="Iniciar sesión">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </Link>
        <Link to="/register/beauty" state={{ source: 'skubik-landing', category: 'barbershop-salon' }} className="s-nav-register-btn">
          Regístrate
        </Link>
      </div>
    </nav>
  );
}

// ---- Hero ----
const HERO_APPTS = [
  { d: 0, h: 0, name: 'Karina R.', svc: 'Corte + Brush', label: 'Reservó a las 2:14am', accent: false },
  { d: 1, h: 2, name: 'Vanessa M.', svc: 'Balayage', label: 'Pagó anticipo vía Zelle', accent: false },
  { d: 0, h: 3, name: 'Jesús T.', svc: 'Barba + Fade', label: 'Viene por IG', accent: true },
  { d: 2, h: 1, name: 'Fiorella', svc: 'Mani+Pedi', label: 'Confirmó por WA', accent: false },
  { d: 3, h: 0, name: 'Luisa P.', svc: 'Coloración', label: 'Pago Móvil ✓', accent: true },
  { d: 4, h: 3, name: 'Rebeca G.', svc: 'Alisado', label: 'Reserva nueva', accent: false },
  { d: 2, h: 2, name: 'Emilia', svc: 'Tinte raíz', label: 'Domingo confirmado', accent: false },
  { d: 4, h: 1, name: 'Andrea V.', svc: 'Extensiones', label: 'Anticipo 30% cobrado', accent: true },
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
        <span>Anticipo cobrado · <strong>${(visible*12).toFixed(0)}</strong></span>
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
  const emphWords = ['manos,', 'teclado.'];
  return (
    <h1>
      {words.map((w, i) => {
        const em = emphWords.some(e => w.includes(e));
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
  const h = D.hero;
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <section className={`s-hero ${isMobile ? 's-hero-mobile' : ''}`} data-screen-label="01 Hero">
      <div className="s-hero-grid-bg"></div>
      {isMobile && (
        <div className="s-hero-mobile-bg" aria-hidden="true">
          <video autoPlay muted loop playsInline preload="metadata" poster="/videos/skubik-hero-poster.jpg">
            <source src="/videos/skubik-hero.webm" type="video/webm" />
            <source src="/videos/skubik-hero.mp4" type="video/mp4" />
          </video>
          <div className="s-hero-mobile-bg-overlay"></div>
        </div>
      )}
      <div className="s-container s-hero-inner">
        <div className="s-hero-left">
          <span className="s-eyebrow">{h.eyebrow}</span>
          <HeroHeadline title={h.title} />
          <p className="s-hero-sub">{h.subtitle}</p>
          <div className="s-hero-cta">
            <Link to="/register/beauty" state={{ source: 'skubik-landing', category: 'barbershop-salon' }} className="s-btn s-btn-primary">
              {h.primaryCTA} →
            </Link>
            <a className="s-btn s-btn-ghost" href={D.brand.waMsg('Hola, tengo dudas sobre Skubik.')} target="_blank" rel="noreferrer">
              {WA_ICON}
              {h.secondaryCTA}
            </a>
          </div>
          <div className="s-hero-micro">
            {h.microBadges.map((b, i) => (
              <span key={i} className="s-hero-micro-badge">{b}</span>
            ))}
          </div>
        </div>
        {!isMobile && (
          <div className="s-hero-right">
            <div className="s-hero-video-wrap">
              <div className="s-hero-video">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/videos/skubik-hero-poster.jpg"
                >
                  <source src="/videos/skubik-hero.webm" type="video/webm" />
                  <source src="/videos/skubik-hero.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        )}
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
  const items = ['Reservas 24/7', 'Anticipos cobrados', 'Cero plantones', 'Tu data es tuya', 'Sin comisión por cita', 'Migramos gratis', 'Soporte humano', '14 días free'];
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

// ---- Booking-flow animation (back of pain card 2) ----
// Loops the CORRECTED flow: pick the professional FIRST, then the wheel shows
// that professional's real availability for the day (occupied slots blocked).
// Cycles between two professionals to show availability is per-person, not merged.
const BOOK_PROS = [
  { name: 'Carlos', dot: '#a78bfa' },
  { name: 'Miguel', dot: '#34d399' },
  { name: 'José', dot: '#60a5fa' },
];
const BOOK_SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'];
const BOOK_CYCLE = [
  { pro: 0, occupied: ['08:30', '09:00'], land: '11:00' },
  { pro: 1, occupied: ['10:00', '10:30'], land: '09:30' },
];
const BOOK_STAGES = 5; // 0 idle · 1 pro selected · 2 wheel reveal · 3 land on free slot · 4 "sin cruces"
const BOOK_SLOT_H = 26; // px per slot row, must match .s-anim-slot height

function BookingFlowAnim({ active }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active) { setFrame(0); return; }
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFrame(3); // hold a representative "landed" frame, no motion
      return;
    }
    const id = setInterval(() => setFrame(f => (f + 1) % (BOOK_STAGES * BOOK_CYCLE.length)), 1150);
    return () => clearInterval(id);
  }, [active]);

  const cycleIdx = Math.floor(frame / BOOK_STAGES) % BOOK_CYCLE.length;
  const stage = frame % BOOK_STAGES;
  const cyc = BOOK_CYCLE[cycleIdx];
  const proSelected = stage >= 1;
  const wheelVisible = stage >= 2;
  const landed = stage >= 3;
  const showBadge = stage >= 4;
  const targetIdx = landed ? BOOK_SLOTS.indexOf(cyc.land) : 0;
  const progOn = stage >= 2 ? 3 : stage >= 1 ? 2 : 1;

  return (
    <div className="s-pain-anim" aria-hidden="true">
      <div className="s-anim-head">
        <span className="s-anim-title">Agendar cita</span>
        <div className="s-anim-prog">
          {[1, 2, 3].map(i => <i key={i} className={i <= progOn ? 'on' : ''} />)}
        </div>
      </div>

      <div className="s-anim-label">¿Con quién?</div>
      <div className="s-anim-pros">
        {BOOK_PROS.map((p, i) => (
          <span key={p.name} className={`s-anim-pill ${proSelected && i === cyc.pro ? 'sel' : ''}`}>
            <i className="s-anim-dot" style={{ background: p.dot }} />
            {p.name}
          </span>
        ))}
      </div>

      <div className={`s-anim-when ${wheelVisible ? 'show' : ''}`}>
        <div className="s-anim-label">Horarios{proSelected ? ` · ${BOOK_PROS[cyc.pro].name}` : ''}</div>
        <div className="s-anim-wheel">
          <div className="s-anim-sel" style={{ transform: `translateY(${targetIdx * BOOK_SLOT_H}px)`, opacity: landed ? 1 : 0.45 }} />
          {BOOK_SLOTS.map(s => {
            const occ = cyc.occupied.includes(s);
            const isLand = landed && s === cyc.land;
            return (
              <div key={s} className={`s-anim-slot ${occ ? 'occ' : ''} ${isLand ? 'land' : ''}`}>
                <span>{s}</span>
                {occ && <span className="s-anim-occ">ocupado</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`s-anim-badge ${showBadge ? 'show' : ''}`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        Sin cruces
      </div>
    </div>
  );
}

// ---- Pain / Scroll-Hijack Dock Carousel ----
function PainCard({ item, i, activeIdx }) {
  const [flipped, setFlipped] = useState(false);
  const [backPlaying, setBackPlaying] = useState(false);
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const videoRef = useRef(null);
  const backVideoRef = useRef(null);

  // Auto-unflip when card leaves focus
  useEffect(() => {
    if (i !== activeIdx && flipped) setFlipped(false);
  }, [activeIdx, i, flipped]);

  // Only play front videos on focused card ± 1 neighbor
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const shouldPlay = Math.abs(i - activeIdx) <= 1;
    if (shouldPlay) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [activeIdx, i]);

  // Pause + reset back video when card flips back
  useEffect(() => {
    const vid = backVideoRef.current;
    if (!vid) return;
    if (!flipped) {
      vid.pause();
      vid.currentTime = 0;
      setBackPlaying(false);
    }
  }, [flipped]);

  const toggleBackVideo = () => {
    const vid = backVideoRef.current;
    if (!vid) return;
    if (backPlaying) {
      vid.pause();
      setBackPlaying(false);
    } else {
      vid.play().catch(() => {});
      setBackPlaying(true);
    }
  };

  // IG-style: tap anywhere on the back video toggles play/pause (does NOT flip back)
  const handleBackTap = (e) => {
    e.stopPropagation();
    toggleBackVideo();
  };

  // Dedicated return control — the only way to flip back when there's a back video
  const flipBack = (e) => {
    e.stopPropagation();
    setFlipped(false);
  };

  const handlePointerMove = (e) => {
    const glow = glowRef.current;
    const el = cardRef.current;
    if (!glow || !el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const xPct = px * 100;
    const yPct = py * 100;
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    const angle = Math.atan2(cy, cx) * (180 / Math.PI) + 90;

    const edgeX = Math.max(1 - px * 2, px * 2 - 1, 0);
    const edgeY = Math.max(1 - py * 2, py * 2 - 1, 0);
    const edge = Math.max(edgeX, edgeY);
    const eq = edge * edge;

    const borderA = Math.min(eq * 2.2, 1);
    const outerA = Math.min(eq * 1.4, 0.5);

    glow.style.setProperty('--glow-x', `${xPct}%`);
    glow.style.setProperty('--glow-y', `${yPct}%`);
    glow.style.setProperty('--glow-angle', `${angle}deg`);
    glow.style.setProperty('--glow-border-a', `${borderA}`);
    glow.style.setProperty('--glow-outer-a', `${outerA}`);
  };

  return (
    <div
      ref={cardRef}
      className={`s-pain-card ${flipped ? 'flipped' : ''}`}
      onClick={() => setFlipped(f => !f)}
      onPointerMove={handlePointerMove}
    >
      <div className="s-pain-glow" ref={glowRef}>
        <div className="s-pain-glow-spot" />
        <div className="s-pain-glow-border" />
      </div>
      <div className="s-pain-card-inner">
        <div className={`s-pain-face s-pain-front ${item.video ? 'has-video' : ''}`}>
          {item.video && (
            <video ref={videoRef} className="s-pain-card-video" src={item.video} loop muted playsInline preload="none" />
          )}
          <div className="s-pain-front-num">0{i + 1}</div>
          <div style={{ marginTop: 'auto' }}>
            <div className="s-pain-front-tag">{item.tag}</div>
            <div className="s-pain-front-q">{item.q}</div>
            <div className="s-pain-front-cta">
              Ver solución <span className="s-pain-front-cta-arrow">→</span>
            </div>
          </div>
        </div>
        <div
          className={`s-pain-face s-pain-back ${item.backVideo ? 'has-back-video' : (item.backImage || item.backAnim) ? 'has-back-image' : ''}`}
          style={(item.backVideoBg || item.backImageBg) ? { background: item.backVideoBg || item.backImageBg } : undefined}
          onClick={item.backVideo ? handleBackTap : undefined}
        >
          {item.backVideo && (
            <>
              <video ref={backVideoRef} className="s-pain-back-video" src={item.backVideo} loop muted playsInline preload="metadata" />
              <button className="s-pain-back-return" onClick={flipBack} aria-label="Volver">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h12a4 4 0 010 8h-3"/></svg>
              </button>
              <button
                className={`s-pain-back-play ${backPlaying ? 'is-playing' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleBackVideo(); }}
                aria-label={backPlaying ? 'Pausar' : 'Reproducir'}
                tabIndex={-1}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z"/></svg>
              </button>
            </>
          )}
          {(item.backImage || item.backAnim) && !item.backVideo && (
            <button className="s-pain-back-return" onClick={flipBack} aria-label="Volver">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h12a4 4 0 010 8h-3"/></svg>
            </button>
          )}
          <div className="s-pain-back-label">Skubik lo resuelve</div>
          <div className="s-pain-back-a">{item.a}</div>
          {item.backAnim === 'booking' && <BookingFlowAnim active={flipped} />}
          {item.backImage && !item.backVideo && (
            <img className="s-pain-back-image" src={item.backImage} alt="Pantalla de Skubik mostrando horarios ocupados bloqueados" loading="lazy" />
          )}
          {!item.backVideo && !item.backImage && !item.backAnim && <div className="s-pain-back-hint">← Toca para volver</div>}
        </div>
      </div>
    </div>
  );
}

function useScrollHijackCarousel(wrapRef, trackRef, stickyRef, count) {
  const [activeIdx, setActiveIdx] = useState(0);
  const rafRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    const sticky = stickyRef.current;
    if (!wrap || !track || !sticky) return;

    const isVertical = () => window.matchMedia('(max-width: 900px)').matches;

    const getMetrics = () => {
      const cards = track.querySelectorAll('.s-pain-card');
      if (!cards.length) return null;
      const vertical = isVertical();
      if (vertical) {
        track.style.removeProperty('--pain-card-hw');
        return { cards, vertical, maxOffset: 0 };
      }
      const cardWidth = cards[0].offsetWidth;
      // Set CSS var so padding centers first card exactly
      track.style.setProperty('--pain-card-hw', `${cardWidth / 2}px`);
      const gap = 28;
      const padLeft = parseFloat(getComputedStyle(track).paddingLeft);
      const firstCenter = padLeft + cardWidth / 2;
      const lastCenter = padLeft + (cardWidth + gap) * (count - 1) + cardWidth / 2;
      return { cards, vertical, maxOffset: lastCenter - firstCenter };
    };

    const applyProgress = (p) => {
      const m = getMetrics();
      if (!m) return;
      progressRef.current = p;

      if (m.vertical) {
        // ── Stacking mode (mobile) ──
        // Cards absolute-positioned at same spot. Card N (N>0) rises from below during its
        // slot [(N-1)/L, N/L] to cover the previous card. Buried cards peek + recede in 3D:
        // progressively darker, more blurred, lower opacity and pushed back (translateZ).
        track.style.transform = '';
        const lastIdx = Math.max(1, count - 1);
        const viewportH = window.innerHeight;
        const activeIdx = Math.min(count - 1, Math.round(p * lastIdx));
        const peekOffset = 8;      // px peek per stack level
        const maxPeekLevels = 4;   // cap so it doesn't push too far up

        const buriedStyle = (depth) => {
          // depth is continuous (0..maxPeekLevels) so transitions are smooth
          const d = Math.min(depth, maxPeekLevels);
          return {
            translateY: -d * peekOffset,
            translateZ: -d * 32,
            blur: d * 2.4,
            opacity: Math.max(0, 1 - d * 0.18),
            brightness: Math.max(0.2, 1 - d * 0.17),
          };
        };

        m.cards.forEach((card, idx) => {
          let translateY = 0, translateZ = 0, blur = 0, opacity = 1, brightness = 1;
          let rising = false;

          if (idx === 0) {
            // Card 0 is always present; recedes as newer cards arrive on top
            const s = buriedStyle(p * lastIdx);
            ({ translateY, translateZ, blur, opacity, brightness } = s);
          } else {
            const slotStart = (idx - 1) / lastIdx;
            const slotEnd = idx / lastIdx;
            const localP = (p - slotStart) / (slotEnd - slotStart);

            if (localP <= 0) {
              translateY = viewportH * 1.1; // below viewport
              opacity = 1;
            } else if (localP >= 1) {
              const s = buriedStyle(p * lastIdx - idx);
              ({ translateY, translateZ, blur, opacity, brightness } = s);
            } else {
              const eased = 1 - Math.pow(1 - localP, 3); // ease-out cubic
              translateY = viewportH * 1.1 * (1 - eased);
              rising = true;
            }
          }

          card.style.transform = `translate(-50%, calc(-50% + ${translateY}px)) translateZ(${translateZ}px)`;
          card.style.filter = blur ? `blur(${blur}px) brightness(${brightness})` : 'none';
          card.style.opacity = opacity;
          card.style.zIndex = idx;
          card.style.transition = 'none';
        });
        setActiveIdx(activeIdx);
        return;
      }

      // ── Horizontal dock mode (desktop) ──
      track.style.transform = `translateX(${-p * m.maxOffset}px)`;
      const center = window.innerWidth / 2;
      const maxDist = window.innerWidth * 0.6;

      let closest = 0;
      let closestDist = Infinity;
      m.cards.forEach((card, idx) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const dist = Math.abs(cardCenter - center);
        if (dist < closestDist) { closestDist = dist; closest = idx; }
      });

      m.cards.forEach((card, idx) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const dist = Math.abs(cardCenter - center);
        const norm = Math.min(dist / maxDist, 1);
        const cardDist = Math.abs(idx - closest);

        const scale = 1 - norm * 0.2;
        const z = -norm * 140;
        const maxBlur = cardDist <= 0 ? 0 : cardDist === 1 ? 2 : cardDist === 2 ? 4 : 6;
        const blur = norm * maxBlur;
        const brightness = 1 - norm * (cardDist <= 1 ? 0.2 : 0.4);
        const zIdx = Math.round((1 - norm) * 100);

        card.style.transform = `translateZ(${z}px) scale(${scale})`;
        card.style.filter = `blur(${blur}px) brightness(${brightness})`;
        card.style.opacity = 1;
        card.style.zIndex = zIdx;
        card.style.transition = 'none';
      });
      setActiveIdx(closest);
    };

    // Vertical document scroll drives progress (same logic in both modes)
    const onScroll = () => {
      const wrapRect = wrap.getBoundingClientRect();
      const wrapTop = window.scrollY + wrapRect.top;
      const scrollableHeight = wrap.offsetHeight - window.innerHeight;
      const scrolled = window.scrollY - wrapTop;
      const p = Math.max(0, Math.min(1, scrolled / scrollableHeight));
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => applyProgress(p));
    };

    // Trackpad horizontal-to-vertical relay (desktop only)
    const onWheel = (e) => {
      if (isVertical()) return;
      if (Math.abs(e.deltaX) < 5 || Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
      const stickyRect = sticky.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const isInSection = stickyRect.top <= 1 && wrapRect.bottom > window.innerHeight;
      if (!isInSection) return;
      const p = progressRef.current;
      if ((p <= 0 && e.deltaX < 0) || (p >= 1 && e.deltaX > 0)) return;
      e.preventDefault();
      window.scrollBy({ top: e.deltaX * 2 });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('load', onScroll);
    onScroll();
    // Re-measure after layout settles (fonts, images, video metadata)
    const t1 = setTimeout(onScroll, 300);
    const t2 = setTimeout(onScroll, 1200);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('load', onScroll);
      clearTimeout(t1);
      clearTimeout(t2);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [wrapRef, trackRef, stickyRef, count]);

  return activeIdx;
}

function SPain({ D }) {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const stickyRef = useRef(null);
  const n = D.pain.items.length;
  const scrollHeight = n * 70;
  const activeIdx = useScrollHijackCarousel(wrapRef, trackRef, stickyRef, n);

  return (
    <div className="s-pain-wrap" ref={wrapRef} id="dolor" style={{ height: `${scrollHeight}vh` }}>
      <div className="s-pain-sticky" ref={stickyRef}>
        <div className="s-pain-head">
          <span className="s-eyebrow" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--s-accent)', display: 'inline-flex', alignItems: 'center', gap: 10 }}>Dolor real</span>
          <h2>¿Protagonizas alguna<br/>de estas <em>películas?</em></h2>
          <p>{D.pain.subtitle}</p>
        </div>
        <div className="s-pain-track-wrap">
          <div className="s-pain-track" ref={trackRef} style={{ perspective: '1200px' }}>
            {D.pain.items.map((item, i) => (
              <PainCard key={i} item={item} i={i} activeIdx={activeIdx} />
            ))}
          </div>
        </div>
        <div className="s-pain-dots">
          {D.pain.items.map((_, i) => (
            <div key={i} className={`s-pain-dot ${i === activeIdx ? 'active' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Benefits ----
const MOCK_APPTS = [
  { time: '08:00', name: 'María Fernández', svc: 'Brushing + Planchado', pro: 'Ana María López', price: 20, status: 'confirmed' },
  { time: '08:30', name: 'Luisa Martínez', svc: 'Corte de Puntas', pro: 'Carlos "El Pulpo" Ramírez', price: 12, status: 'confirmed' },
  { time: '08:00', name: 'María Fernández', svc: 'Brushing + Planchado', pro: 'Ana María López', price: 20, status: 'confirmed' },
  { time: '08:30', name: 'Luisa Martínez', svc: 'Corte de Puntas', pro: 'Carlos "El Pulpo" Ramírez', price: 12, status: 'confirmed' },
  { time: '09:00', name: 'Karina Rodríguez', svc: 'Corte + Brushing', pro: 'Carlos "El Pulpo" Ramírez', price: 25, status: 'confirmed' },
  { time: '09:30', name: 'Daniela Rojas', svc: 'Tinte Raíz', pro: 'Ana María López', price: 40, status: 'confirmed' },
  { time: '10:00', name: 'Vanessa Méndez', svc: 'Balayage + Toner', pro: 'Ana María López', price: 65, status: 'confirmed' },
  { time: '10:30', name: 'Carolina Pérez', svc: 'Mechas + Matizado', pro: 'Ana María López', price: 55, status: 'confirmed' },
  { time: '11:00', name: 'Isabel Paredes', svc: 'Keratina', pro: 'Luisa Fernández', price: 80, status: 'pending' },
  { time: '11:30', name: 'Jesús Torres', svc: 'Corte + Barba', pro: 'Carlos "El Pulpo" Ramírez', price: 15, status: 'pending' },
  { time: '12:00', name: 'Rebeca Gómez', svc: 'Uñas Acrílicas', pro: 'Luisa Fernández', price: 30, status: 'confirmed' },
  { time: '13:00', name: 'Paola Gutiérrez', svc: 'Mani + Pedi + Gel', pro: 'Luisa Fernández', price: 35, status: 'confirmed' },
  { time: '13:30', name: 'Gabriela Suárez', svc: 'Depilación Facial', pro: 'Luisa Fernández', price: 15, status: 'confirmed' },
  { time: '14:00', name: 'Andrea Villamizar', svc: 'Extensiones', pro: 'Ana María López', price: 120, status: 'pending' },
  { time: '15:00', name: 'Pedro García', svc: 'Corte + Barba', pro: 'Carlos "El Pulpo" Ramírez', price: 15, status: 'confirmed' },
  { time: '15:30', name: 'Sofía Mendoza', svc: 'Alisado Progresivo', pro: 'Ana María López', price: 90, status: 'pending' },
  { time: '16:00', name: 'Gonzalo Montero', svc: 'Black Mask + Limpieza Facial', pro: 'Carlos "El Pulpo" Ramírez', price: 27, status: 'pending' },
];

// SVG icons for phone mockup (lucide style, 14px)
const IC = {
  moon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
  sparkle: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>,
  gear: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2m-9-11h2m18 0h2m-3.3-6.7-1.4 1.4M4.7 19.3l1.4-1.4m0-11.2L4.7 4.7m14.6 14.6-1.4-1.4"/></svg>,
  logout: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevL: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevR: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  cal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  more: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>,
  user: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  list: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>,
  filter: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>,
};

function IPhoneMockup({ progress }) {
  const [visible, setVisible] = useState(4);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(-1);
  const [waOpen, setWaOpen] = useState(false);
  const slotsRef = useRef(null);
  const timerRef = useRef(null);

  // Autoplay: add one appointment every 1.5s, pause on interaction
  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setVisible(v => {
        if (v >= MOCK_APPTS.length) {
          // Reset: scroll back to top, then restart
          const el = slotsRef.current;
          if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
          return 0;
        }
        return v + 1;
      });
    }, 1500);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  // Auto-scroll to keep new appointments visible
  useEffect(() => {
    const el = slotsRef.current;
    if (!el) return;
    const cards = el.querySelectorAll('.s-app-appt.visible');
    if (cards.length > 0) {
      const last = cards[cards.length - 1];
      const containerTop = el.getBoundingClientRect().top;
      const cardBottom = last.getBoundingClientRect().bottom;
      const overflow = cardBottom - containerTop - el.clientHeight;
      if (overflow > 0) {
        el.scrollTo({ top: el.scrollTop + overflow + 20, behavior: 'smooth' });
      }
    }
  }, [visible]);

  // Resume after 3s of no interaction
  const pauseAndResume = () => {
    setPaused(true);
    clearTimeout(timerRef.current);
    setTimeout(() => setPaused(false), 3000);
  };

  const days = [
    { d: 'L', n: '28' }, { d: 'M', n: '29', today: true }, { d: 'M', n: '30' },
    { d: 'J', n: '1' }, { d: 'V', n: '2' }, { d: 'S', n: '3' },
  ];

  return (
    <div className="s-iphone">
      <div className="s-iphone-island" />
      <div className="s-iphone-screen">
        {/* Status bar */}
        <div className="s-app-statusbar">
          <span>9:41</span>
          <div className="s-app-statusbar-right">
            <svg width="12" height="10" viewBox="0 0 16 12" fill="var(--s-fg)"><path d="M1 8h2v4H1zM5 5h2v7H5zM9 2h2v10H9zM13 0h2v12h-2z" opacity=".9"/></svg>
            <svg width="12" height="10" viewBox="0 0 16 12" fill="var(--s-fg)"><path d="M8 2.5A7.5 7.5 0 0 0 .5 10l1.4 1.4A5.6 5.6 0 0 1 8 8a5.6 5.6 0 0 1 6.1 3.4L15.5 10A7.5 7.5 0 0 0 8 2.5z" opacity=".9"/></svg>
            <div className="s-app-statusbar-batt"></div>
          </div>
        </div>

        {/* App header */}
        <div className="s-app-header">
          <div className="s-app-logo">SmartKubik</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--s-muted)' }}>
            {IC.moon}{IC.sparkle}{IC.gear}{IC.logout}
          </div>
        </div>

        {/* Date bar */}
        <div className="s-app-datebar">
          <span style={{ color: 'var(--s-muted)' }}>{IC.chevL}</span>
          <div style={{ flex: 1 }}>
            <div className="s-app-date-label">Martes 29 De Abr</div>
            <div className="s-app-date-sub">29 abr 2026</div>
          </div>
          <span style={{ color: 'var(--s-muted)' }}>{IC.chevR}</span>
          <div style={{ display: 'flex', gap: 8, marginLeft: 8, color: 'var(--s-muted)' }}>
            {IC.list}{IC.filter}
            <span style={{ color: '#3b82f6' }}>{IC.users}</span>
            {IC.refresh}
          </div>
        </div>

        {/* Week strip */}
        <div className="s-app-week">
          {days.map((d, i) => (
            <div key={i} className={`s-app-day ${d.today ? 'today' : ''}`}>
              <div>{d.d}</div>
              <div className="s-app-day-num">{d.n}</div>
            </div>
          ))}
        </div>

        {/* Appointment slots */}
        <div className="s-app-slots" ref={slotsRef}>
          {MOCK_APPTS.map((a, i) => (
            <div key={i}>
              <div className="s-app-time">{a.time}</div>
              <div
                className={`s-app-appt ${i < visible ? 'visible' : ''}`}
                style={{ transitionDelay: `${i * 0.08}s`, cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setExpanded(i); pauseAndResume(); }}
                onPointerEnter={pauseAndResume}
              >
                <div className="s-app-appt-row">
                  <div className={`s-app-appt-status ${a.status}`}>
                    <span style={{ fontSize: 6 }}>●</span> {a.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                  </div>
                  <div className="s-app-appt-price">${a.price.toFixed(2)}</div>
                </div>
                <div className="s-app-appt-name">{a.name}</div>
                <div className="s-app-appt-svc">{a.svc}</div>
                <div className="s-app-appt-pro">{IC.user} {a.pro}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom nav */}
        <div style={{ flexShrink: 0, padding: '6px 16px 20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: 'var(--s-dim)' }}>{IC.home}</span>
          <span style={{ color: '#3b82f6' }}>{IC.cal}</span>
          <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 300 }}>+</span>
          <span style={{ color: 'var(--s-dim)' }}>{IC.users}</span>
          <span style={{ color: 'var(--s-dim)', position: 'relative' }}>{IC.more}<span style={{ position: 'absolute', top: -2, right: -4, width: 6, height: 6, borderRadius: '50%', background: 'var(--s-accent)' }}></span></span>
        </div>

        {/* Bottom sheet — appointment detail */}
        <div className={`s-app-sheet-overlay ${expanded >= 0 ? 'open' : ''}`} onClick={() => { setExpanded(-1); setWaOpen(false); }} />
        <div className={`s-app-sheet ${expanded >= 0 ? 'open' : ''}`} onClick={() => { if (waOpen) return; }}>
          {expanded >= 0 && (() => {
            const a = MOCK_APPTS[expanded];
            return (<>
              <div className="s-app-sheet-handle" />
              <div className="s-app-sheet-head">
                <div className="s-app-sheet-title">Detalle de la cita</div>
                <button className="s-app-sheet-close" onClick={() => { setExpanded(-1); setWaOpen(false); }}>✕</button>
              </div>
              <div className={`s-app-sheet-status ${a.status}`}>
                {a.status === 'confirmed' ? 'CONFIRMADA' : 'PENDIENTE'}
              </div>
              <div className="s-app-sheet-name">{a.name}</div>
              <div className="s-app-sheet-date">
                {IC.cal} martes 29 de abr · {a.time}
              </div>
              <div className="s-app-sheet-info">
                <div className="s-app-sheet-info-row">
                  <span className="s-app-sheet-info-label">Servicio</span>
                  <span className="s-app-sheet-info-val">{a.svc}</span>
                </div>
                <div className="s-app-sheet-info-row">
                  <span className="s-app-sheet-info-label">Profesional</span>
                  <span className="s-app-sheet-info-val">{a.pro}</span>
                </div>
                <div className="s-app-sheet-info-row">
                  <span className="s-app-sheet-info-label">Total</span>
                  <span className="s-app-sheet-info-val price">${a.price.toFixed(2)}</span>
                </div>
              </div>
              <div className="s-app-sheet-btns">
                <div className="s-app-sheet-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  Llamar
                </div>
                <div className="s-app-sheet-btn wa" onClick={(e) => { e.stopPropagation(); setWaOpen(true); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2.6 1 3.1.8 3.7.8.6-.1 1.8-.7 2-1.5.2-.7.2-1.4.2-1.5-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 00-8.5 15.3L2 22l4.9-1.3A10 10 0 1012 2z"/></svg>
                  WhatsApp
                </div>
              </div>
              <div className="s-app-sheet-btn primary" style={{ marginBottom: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Confirmar
              </div>
              <div className="s-app-sheet-btns">
                <div className="s-app-sheet-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  Reagendar
                </div>
                <div className="s-app-sheet-btn danger">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                  Cancelar
                </div>
              </div>
            </>);
          })()}
        </div>

        {/* WhatsApp message picker sheet */}
        <div className={`s-app-wa-sheet ${waOpen ? 'open' : ''}`}>
          <div className="s-app-sheet-handle" />
          <div className="s-app-wa-head">
            <div className="s-app-wa-title">Enviar WhatsApp</div>
            <button className="s-app-sheet-close" onClick={() => setWaOpen(false)}>✕</button>
          </div>
          <div className="s-app-wa-sub">
            <span className="s-app-wa-sub-label">Enviar WhatsApp</span>
            <span className="s-app-wa-sub-link">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Personalizado
            </span>
          </div>
          {expanded >= 0 && (() => {
            const a = MOCK_APPTS[expanded];
            return (<>
              <div className="s-app-wa-option" onClick={() => setWaOpen(false)}>
                <div className="s-app-wa-option-title">Confirmación</div>
                <div className="s-app-wa-option-preview">Hola {a.name.split(' ')[0]}, te confirmamos tu cita de {a.svc}...</div>
              </div>
              <div className="s-app-wa-option" onClick={() => setWaOpen(false)}>
                <div className="s-app-wa-option-title">Recordatorio</div>
                <div className="s-app-wa-option-preview">Hola {a.name.split(' ')[0]}, te recordamos que tienes cita de {a.svc}...</div>
              </div>
              <div className="s-app-wa-option" onClick={() => setWaOpen(false)}>
                <div className="s-app-wa-option-title">Reagendamiento</div>
                <div className="s-app-wa-option-preview">Hola {a.name.split(' ')[0]}, necesitamos reagendar tu cita de {a.svc}...</div>
              </div>
            </>);
          })()}
        </div>
      </div>
    </div>
  );
}

function ConfigFlowMockup({ progress }) {
  // 3 screens: 0=settings, 1=payments+deposits, 2=dashboard
  const screen = progress < 0.12 ? 0 : progress < 0.7 ? 1 : 2;
  const lp = screen === 0 ? progress / 0.12
    : screen === 1 ? (progress - 0.12) / 0.58
    : (progress - 0.7) / 0.3;

  const toggleOn = (threshold) => lp > threshold;

  // Translate the inner content based on lp — entire page scrolls as a block
  // lp 0.0-0.50: stays at top (toggles + accordion expansion visible)
  // lp 0.50-0.62: slides up to reveal Depósitos section
  // lp 0.62-1.0: stays scrolled (Depósitos visible, save button)
  let translateY = 0;
  if (screen === 1) {
    if (lp < 0.5) translateY = 0;
    else if (lp < 0.62) translateY = -((lp - 0.5) / 0.12) * 280;
    else translateY = -280;
  }

  // Dashboard deposits amount
  const dashAmount = screen === 2 ? Math.round(lp * 485) : 0;

  const deposits = [
    { name: 'Karina R.', svc: 'Corte + Brushing', amt: 7.50 },
    { name: 'Vanessa M.', svc: 'Balayage', amt: 19.50 },
    { name: 'Andrea V.', svc: 'Extensiones', amt: 36.00 },
    { name: 'Paola G.', svc: 'Mani + Pedi', amt: 10.50 },
    { name: 'Isabel P.', svc: 'Keratina', amt: 24.00 },
  ];

  return (
    <div className="s-iphone">
      <div className="s-iphone-island" />
      <div className="s-iphone-screen">
        <div className="s-app-statusbar">
          <span>9:41</span>
          <div className="s-app-statusbar-right">
            <svg width="12" height="10" viewBox="0 0 16 12" fill="var(--s-fg)"><path d="M1 8h2v4H1zM5 5h2v7H5zM9 2h2v10H9zM13 0h2v12h-2z" opacity=".9"/></svg>
            <svg width="12" height="10" viewBox="0 0 16 12" fill="var(--s-fg)"><path d="M8 2.5A7.5 7.5 0 0 0 .5 10l1.4 1.4A5.6 5.6 0 0 1 8 8a5.6 5.6 0 0 1 6.1 3.4L15.5 10A7.5 7.5 0 0 0 8 2.5z" opacity=".9"/></svg>
            <div className="s-app-statusbar-batt"></div>
          </div>
        </div>
        <div className="s-app-header">
          <div className="s-app-logo">SmartKubik</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--s-muted)' }}>
            {IC.moon}{IC.sparkle}
            <span style={{ color: screen === 0 ? '#3b82f6' : 'var(--s-muted)', border: screen === 0 ? '1px solid #3b82f6' : 'none', borderRadius: 6, padding: 2 }}>{IC.gear}</span>
            {IC.logout}
          </div>
        </div>

        <div className="s-cfg-wrap">
        {/* Screen 0: Settings main */}
        <div className={`s-cfg-screen ${screen === 0 ? 'active' : 'out-left'}`}>
          <div className="s-cfg-title">Configuración</div>
          <div className="s-cfg-section">General</div>
          <div className="s-cfg-card">
            <div className="s-cfg-row"><span className="s-cfg-row-icon">{IC.home}</span><span className="s-cfg-row-label">Datos del negocio</span><span className="s-cfg-row-chev">{IC.chevR}</span></div>
            <div className="s-cfg-row"><span className="s-cfg-row-icon">{IC.moon}</span><span className="s-cfg-row-label">Horarios de atención</span><span className="s-cfg-row-chev">{IC.chevR}</span></div>
            <div className={`s-cfg-row ${progress > 0.06 ? 'highlight' : ''}`}><span className="s-cfg-row-icon" style={{ color: progress > 0.06 ? '#3b82f6' : '' }}>$</span><span className="s-cfg-row-label">Monedas y métodos de pago</span><span className="s-cfg-row-chev">{IC.chevR}</span></div>
          </div>
          <div className="s-cfg-section">Servicios</div>
          <div className="s-cfg-card">
            <div className="s-cfg-row"><span className="s-cfg-row-icon">{IC.sparkle}</span><span className="s-cfg-row-label">Servicios y precios</span><span className="s-cfg-row-chev">{IC.chevR}</span></div>
          </div>
          <div className="s-cfg-section">Notificaciones</div>
          <div className="s-cfg-card">
            <div className="s-cfg-row"><span className="s-cfg-row-icon">{IC.sparkle}</span><span className="s-cfg-row-label">Push y recordatorios</span><span className="s-cfg-row-chev">{IC.chevR}</span></div>
            <div className="s-cfg-row"><span className="s-cfg-row-icon">{IC.sparkle}</span><span className="s-cfg-row-label">WhatsApp automático</span><span className="s-cfg-row-chev">{IC.chevR}</span></div>
          </div>
          <div className="s-cfg-section">Avanzado</div>
          <div className="s-cfg-card">
            <div className="s-cfg-row"><span className="s-cfg-row-icon">{IC.sparkle}</span><span className="s-cfg-row-label">Penalizaciones No-Show</span><span className="s-cfg-row-chev">{IC.chevR}</span></div>
            <div className="s-cfg-row"><span className="s-cfg-row-icon">{IC.sparkle}</span><span className="s-cfg-row-label">Usuarios y permisos</span><span className="s-cfg-row-chev">{IC.chevR}</span></div>
          </div>
        </div>

        {/* Screen 1: Métodos de pago + Depósitos (single scrollable screen) */}
        <div className={`s-cfg-screen ${screen === 1 ? 'active' : screen < 1 ? 'out-right' : 'out-left'}`}>
          <div className="s-cfg-screen-inner" style={{ transform: `translateY(${translateY}px)` }}>
          <div className="s-cfg-back">{IC.chevL} Métodos de pago</div>
          <div className="s-cfg-section">Métodos de pago</div>
          <div className="s-cfg-card">
            <div className="s-cfg-row"><span className="s-cfg-row-label">Efectivo (USD)</span><div className={`s-cfg-toggle ${toggleOn(0.08) ? 'on' : ''}`}><div className="s-cfg-toggle-dot"/></div></div>
            <div className="s-cfg-row"><span className="s-cfg-row-label">Transferencia (USD)</span><div className="s-cfg-toggle"><div className="s-cfg-toggle-dot"/></div></div>
            <div className="s-cfg-row"><span className="s-cfg-row-label">Zelle (USD)</span><div className="s-cfg-toggle"><div className="s-cfg-toggle-dot"/></div></div>
            <div className="s-cfg-row"><span className="s-cfg-row-label">Efectivo (VES)</span><div className={`s-cfg-toggle ${toggleOn(0.15) ? 'on' : ''}`}><div className="s-cfg-toggle-dot"/></div></div>
            <div className="s-cfg-row" style={{ flexWrap: 'wrap' }}>
              <span className="s-cfg-row-label">Pago Móvil (VES)</span>
              <div className={`s-cfg-toggle ${toggleOn(0.22) ? 'on' : ''}`}><div className="s-cfg-toggle-dot"/></div>
              {toggleOn(0.22) && <span className="s-cfg-toggle-label">Detalles</span>}
            </div>
            {/* Accordion: Pago Móvil details expand inline */}
            {/* Accordion: open 0.30→0.50, then collapses */}
            {lp > 0.30 && lp < 0.52 && (
              <div style={{ padding: '6px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="s-cfg-input-label" style={{ padding: '2px 0' }}>Banco</div>
                <div className="s-cfg-input" style={{ margin: '2px 0 6px', color: toggleOn(0.33) ? 'var(--s-fg)' : 'var(--s-dim)' }}>
                  {toggleOn(0.33) ? 'Banesco' : 'Ej: Banesco'}
                </div>
                {toggleOn(0.35) && <>
                  <div className="s-cfg-input-label" style={{ padding: '2px 0' }}>Teléfono</div>
                  <div className="s-cfg-input" style={{ margin: '2px 0 6px', color: toggleOn(0.37) ? 'var(--s-fg)' : 'var(--s-dim)' }}>
                    {toggleOn(0.37) ? '0414-1234567' : 'Ej: 0414-1234567'}
                  </div>
                </>}
                {toggleOn(0.39) && <>
                  <div className="s-cfg-input-label" style={{ padding: '2px 0' }}>Cédula / RIF</div>
                  <div className="s-cfg-input" style={{ margin: '2px 0 6px', color: toggleOn(0.41) ? 'var(--s-fg)' : 'var(--s-dim)' }}>
                    {toggleOn(0.41) ? 'J-12345678' : 'Ej: J-12345678'}
                  </div>
                </>}
                {toggleOn(0.43) && <>
                  <div className="s-cfg-input-label" style={{ padding: '2px 0' }}>Instrucciones para el cliente</div>
                  <div className="s-cfg-input" style={{ margin: '2px 0', color: toggleOn(0.45) ? 'var(--s-fg)' : 'var(--s-dim)' }}>
                    {toggleOn(0.45) ? 'Transferir a cuenta corriente' : 'Ej: Transferir a cuenta...'}
                  </div>
                </>}
              </div>
            )}
            <div className="s-cfg-row"><span className="s-cfg-row-label">Punto de Venta (VES)</span><div className={`s-cfg-toggle ${toggleOn(0.22) ? 'on' : ''}`}><div className="s-cfg-toggle-dot"/></div></div>
            <div className="s-cfg-row"><span className="s-cfg-row-label">Tarjeta (VES)</span><div className="s-cfg-toggle"><div className="s-cfg-toggle-dot"/></div></div>
            <div className="s-cfg-row"><span className="s-cfg-row-label">Pago Mixto</span><div className={`s-cfg-toggle ${toggleOn(0.28) ? 'on' : ''}`}><div className="s-cfg-toggle-dot"/></div></div>
          </div>

          {/* Depósitos y Políticas — visible after accordion collapses */}
          <div className="s-cfg-section">Depósitos y Políticas</div>
          <div className="s-cfg-card">
            <div className="s-cfg-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--s-fg)' }}>Requiere depósito</div>
                <div style={{ fontSize: 9, color: 'var(--s-muted)', marginTop: 2 }}>Solicitar depósito anticipado al agendar</div>
              </div>
              <div className={`s-cfg-toggle ${toggleOn(0.58) ? 'on' : ''}`}><div className="s-cfg-toggle-dot"/></div>
            </div>
          </div>
          {toggleOn(0.62) && (<>
            <div className="s-cfg-input-label">Porcentaje de depósito</div>
            <div className="s-cfg-deposit-val">{toggleOn(0.7) ? '30' : '25'} <span>%</span></div>
          </>)}
          {toggleOn(0.72) && (<>
            <div className="s-cfg-input-label">Ventana de cancelación (horas)</div>
            <div className="s-cfg-deposit-val">24</div>
          </>)}
          {toggleOn(0.8) && (
            <div className="s-cfg-save" style={{ opacity: toggleOn(0.88) ? 0.7 : 1 }}>
              {toggleOn(0.88) ? '✓ Guardado' : 'Guardar'}
            </div>
          )}
          </div>{/* close s-cfg-screen-inner */}
        </div>

        {/* Screen 2: Dashboard — deposits coming in */}
        <div className={`s-cfg-screen ${screen === 2 ? 'active' : 'out-right'}`}>
          <div className="s-cfg-title">Panel de Control</div>
          <div className="s-cfg-dash-card">
            <div className="s-cfg-dash-label">Depósitos cobrados hoy</div>
            <div className="s-cfg-dash-amount">${dashAmount.toLocaleString('es-VE')}</div>
          </div>
          <div className="s-cfg-section">Reservas con depósito</div>
          <div className="s-cfg-card">
            {deposits.map((d, i) => (
              <div key={i} className="s-cfg-dash-row" style={{ opacity: lp > (i + 1) * 0.18 ? 1 : 0.2, transition: 'opacity 0.4s' }}>
                <div>
                  <div className="s-cfg-dash-name">{d.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--s-muted)' }}>{d.svc}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="s-cfg-dash-deposit">+${d.amt.toFixed(2)}</div>
                  <div className="s-cfg-dash-status">● Depósito cobrado</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>{/* close s-cfg-wrap */}

        {/* Bottom nav — absolute so it doesn't steal space from cfg-wrap */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 16px 20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0a0e1a', zIndex: 5 }}>
          <span style={{ color: screen === 2 ? '#3b82f6' : 'var(--s-dim)' }}>{IC.home}</span>
          <span style={{ color: 'var(--s-dim)' }}>{IC.cal}</span>
          <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 300 }}>+</span>
          <span style={{ color: 'var(--s-dim)' }}>{IC.users}</span>
          <span style={{ color: 'var(--s-dim)' }}>{IC.more}</span>
        </div>
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
          { n: 'Karina R.', s: 'Pagó anticipo · no vino', v: '+ $50' },
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
  if (idx === 0) return <BookingWebMockup progress={progress} />;
  if (idx === 1) return <IPhoneMockup progress={progress} />;
  return <ConfigFlowMockup progress={progress} />;
}

// Booking website mockup — autoplay video inside iPhone frame
function BookingWebMockup() {
  return (
    <div className="s-iphone">
      <div className="s-iphone-island" />
      <div className="s-iphone-screen" style={{ background: '#000' }}>
        <video
          src="/videos/skubik-act1-clean.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    </div>
  );
}

function SBenefits({ D }) {
  const stageRef = useRef(null);
  const progress = useSectionProgress(stageRef);

  // Detect mobile viewport for intro screen
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Sticky is pinned between progress 0.14 and 0.86 — remap to 0-1 within that range
  const pinStart = 0.14;
  const pinEnd = 0.86;
  const pinned = Math.max(0, Math.min((progress - pinStart) / (pinEnd - pinStart), 1));

  // Mobile: reserve first 8% of pinned time for intro screen
  // Desktop: no intro screen, content visible from start
  const introOpacity = !isMobile ? 0 : (pinned < 0.06 ? 1 : Math.max(0, 1 - (pinned - 0.06) / 0.04));
  const contentOpacity = !isMobile ? 1 : (pinned < 0.06 ? 0 : Math.min(1, (pinned - 0.06) / 0.04));
  const introVisible = isMobile && pinned < 0.10;

  // Acts span: mobile starts after intro (0.10), desktop starts at 0
  const actStart = isMobile ? 0.10 : 0;
  const p = pinned < actStart ? 0 : Math.min((pinned - actStart) / (1 - actStart), 1);
  const currentIdx = Math.min(2, Math.floor(p * 3));
  const localP = Math.max(0, Math.min(1, (p * 3) - currentIdx));
  const ben = D.benefits.items[currentIdx];

  // Grid parallax opacity — fade in/out at section edges
  const gridOpacity =
    progress < 0.10 ? 0
    : progress < 0.20 ? (progress - 0.10) / 0.10
    : progress > 0.92 ? 0
    : progress > 0.82 ? 1 - (progress - 0.82) / 0.10
    : 1;

  // Hint pulsante "Sigue scrolleando": visible siempre que estás dentro de la sección de actos.
  const showHint = progress > 0.05 && progress < 0.9;

  return (
    <section className="s-benefits" id="beneficios" data-screen-label="03 Benefits">
      <div className="s-ben-stage" ref={stageRef}>
        <div className="s-ben-sticky">
          {/* Background parallax grid */}
          <div className="s-ben-bg-parallax" style={{ transform: `translateY(${pinned * -400}px)`, opacity: gridOpacity }} />

          {/* Intro screen — fullscreen title that fades into the acts */}
          <div className="s-ben-intro" style={{ opacity: introOpacity, pointerEvents: introVisible ? 'auto' : 'none' }}>
            <span className="s-eyebrow">Tres actos</span>
            <h2>¿Qué cambia cuando <em>hacemos equipo?</em></h2>
            <div className="s-ben-intro-hint">
              <span className="s-ben-mobile-cta-arrow">↓</span> Continúa para descubrir
            </div>
          </div>

          {/* Main content */}
          <div className="s-ben-head" style={{ opacity: contentOpacity }}>
            <span className="s-eyebrow">Tres actos</span>
            <h2>¿Qué cambia cuando <em>hacemos equipo?</em></h2>
          </div>
          <div className="s-ben-content" style={{ opacity: contentOpacity }}>
            <div className="s-ben-text" key={currentIdx}>
              <div className="s-ben-kicker">Acto {ben.num} · {ben.kicker}</div>
              <h3 dangerouslySetInnerHTML={{ __html: ben.title.replace(/\b(duermes|plantones|tuyas)\b/g, '<em>$1</em>') }} />
              <p className="s-ben-body">{ben.body}</p>
              <div className="s-ben-outcome s-ben-outcome-desktop">
                <span className="s-ben-outcome-v">{ben.outcome}</span>
                <span className="s-ben-outcome-l">{ben.outcomeLabel}</span>
              </div>
            </div>
            <div className="s-ben-visual" style={{ position: 'relative' }}>
              <div className="s-ben-indicator">
                {[0,1,2].map(i => <div key={i} className={`s-ben-indicator-dot ${i === currentIdx ? 'active' : ''}`}></div>)}
              </div>
              {/* Vertical progress bar (mobile) */}
              <div className="s-ben-progress-vertical">
                <div className="s-ben-progress-vertical-fill" style={{ height: `${((currentIdx + localP) / 3) * 100}%` }} />
              </div>
              <BenefitVisual idx={currentIdx} progress={localP} />
              {currentIdx === 1 && (
                <div className="s-ben-mobile-cta">
                  <span className="s-ben-mobile-cta-arrow">↓</span> Toca cualquier cita
                </div>
              )}
            </div>
          </div>

          {/* Scroll hint pulsante */}
          {showHint && (
            <div className="s-ben-scroll-hint">
              <span className="s-ben-mobile-cta-arrow">↓</span> Sigue scrolleando para continuar
            </div>
          )}
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

// ---- Web Showcase — "Tu salón en internet" ----
const WEB_MOCKS = [
  {
    key: 'barber',
    name: 'Barbería Sava',
    initial: 'S',
    url: 'savabarberia.smartkubik.com',
    tagline: 'Precisión impecable, actitud total',
    rating: '★ 4.7 · 25 reseñas',
    ctaPrimary: 'Reservar Ahora',
    ctaGhost: 'Ver Servicios',
    ctaShort: 'Reservar',
    vertical: 'Barbería',
  },
  {
    key: 'salon',
    name: 'Studio Bella',
    initial: 'B',
    url: 'studiobella.smartkubik.com',
    tagline: 'El arte de sentirte radiante',
    rating: '★ 4.9 · 187 reseñas',
    ctaPrimary: 'Reserva tu cita',
    ctaGhost: 'Conoce el equipo',
    ctaShort: 'Reservar',
    vertical: 'Salón premium',
  },
  {
    key: 'nails',
    name: 'Nails by Sophie',
    initial: 'N',
    url: 'nailsbysophie.smartkubik.com',
    tagline: 'Manos perfectas, todos los días',
    rating: '★ 5.0 · 94 reseñas',
    ctaPrimary: 'Reservar Cita',
    ctaGhost: 'Ver diseños',
    ctaShort: 'Reservar',
    vertical: 'Nail Studio',
  },
  {
    key: 'spa',
    name: 'Spa Renacer',
    initial: 'R',
    url: 'sparenacer.smartkubik.com',
    tagline: 'Tu pausa, tu santuario',
    rating: '★ 4.8 · 62 reseñas',
    ctaPrimary: 'Reservar Sesión',
    ctaGhost: 'Ver tratamientos',
    ctaShort: 'Reservar',
    vertical: 'Spa Wellness',
  },
];

const WEB_FEATURES = [
  {
    title: 'URL personalizada',
    desc: 'Tu propio subdominio o conecta tu dominio. Compártelo en Instagram, WhatsApp, Google Maps.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  },
  {
    title: 'Reservas + anticipo',
    desc: 'Tus clientes eligen servicio, profesional, día y hora. Cobras anticipo antes de confirmar.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>,
  },
  {
    title: 'Reseñas de Google',
    desc: 'Tus reseñas de Google aparecen en tu web. Prueba social que vende sola.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
  {
    title: 'Galería y portafolio',
    desc: 'Fotos antes/después organizadas por servicio. Tu trabajo en exhibición permanente.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  },
  {
    title: 'Cuentas claras, equipo feliz',
    desc: 'Tus clientes eligen con quién agendar y las comisiones se calculan solas. Horarios, días libres y vacaciones sin sorpresas.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    title: 'Tu base de clientes es tuya',
    desc: 'Tus contactos, historial y datos pertenecen a tu negocio. Exporta cuando quieras. Nadie te secuestra a tus clientes.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  },
];

function SWebShowcase() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const revealRef = useReveal();

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setActiveIdx(i => (i + 1) % WEB_MOCKS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <section className="s-web s-reveal" ref={revealRef} id="web" data-screen-label="04 Web">
      <div className="s-web-head">
        <span className="s-eyebrow">Tu web propia</span>
        <h2>Tu salón en internet, <em>listo en 10 minutos.</em></h2>
        <p>Sin diseñador, sin hosting, sin código. Elige plantilla, sube tus fotos y compártelo. Funciona desde el primer día.</p>
      </div>

      <div className="s-web-stage">
        <div
          className="s-web-laptop"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="s-web-laptop-screen">
            {WEB_MOCKS.map((m, i) => (
              <div key={m.key} className={`s-web-mock v-${m.key} ${i === activeIdx ? 'active' : ''}`}>
                <div className="s-web-mock-header">
                  <div className="s-web-mock-logo">
                    <div className="s-web-mock-logo-dot">{m.initial}</div>
                    <div className="s-web-mock-name">{m.name}</div>
                  </div>
                  <div className="s-web-mock-cta">{m.ctaShort}</div>
                </div>
                <div className="s-web-mock-hero">
                  <div className="s-web-mock-hero-bg" />
                  <div className="s-web-mock-hero-content">
                    <div className="s-web-mock-tagline" style={{ fontSize: 'clamp(18px, 3vw, 28px)' }}>{m.tagline}</div>
                    <div className="s-web-mock-rating">
                      <span style={{ color: '#fbbf24' }}>{m.rating.split('·')[0]}</span>
                      <span style={{ opacity: 0.7 }}>·{m.rating.split('·')[1]}</span>
                    </div>
                    <div className="s-web-mock-buttons">
                      <div className="s-web-mock-btn s-web-mock-btn-primary">{m.ctaPrimary}</div>
                      <div className="s-web-mock-btn s-web-mock-btn-ghost">{m.ctaGhost}</div>
                    </div>
                  </div>
                </div>
                <div className="s-web-mock-gallery">
                  {[0,1,2,3].map(g => <div key={g} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="s-web-laptop-base" />
        <div className="s-web-url">
          <span className="s-web-url-dot" />
          {WEB_MOCKS[activeIdx].url}
        </div>
        <div className="s-web-tabs">
          {WEB_MOCKS.map((m, i) => (
            <button
              key={m.key}
              className={`s-web-tab ${i === activeIdx ? 'active' : ''}`}
              onClick={() => { setActiveIdx(i); setPaused(true); }}
            >{m.vertical}</button>
          ))}
        </div>
      </div>

      <div className="s-web-features">
        {WEB_FEATURES.map((f, i) => (
          <div key={i} className="s-web-feat">
            <div className="s-web-feat-icon">{f.icon}</div>
            <div>
              <div className="s-web-feat-title">{f.title}</div>
              <div className="s-web-feat-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="s-web-final">
        <p>"Tu primera web profesional, sin pagar diseñador. Incluida en tu plan."</p>
        <a className="s-web-final-link" href="https://savabarberia.smartkubik.com" target="_blank" rel="noreferrer">
          Ver demo en vivo →
        </a>
      </div>
    </section>
  );
}

// ---- Chat ----
// Inline bold formatter: *texto* → <strong>
function formatWA(text) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
      return <strong key={i}>{p.slice(1, -1)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

const WA_ICONS = {
  template: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/></svg>
  ),
  auto: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
  ),
  ai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3v0a3 3 0 0 0 3 3v0a3 3 0 0 0 3 3 3 3 0 0 0 3-3v0a3 3 0 0 0 3-3v0a3 3 0 0 0 3-3v0a3 3 0 0 0-3-3v0a3 3 0 0 0-3-3v0a3 3 0 0 0-3-3z"/><path d="M9 12h0M15 12h0M12 9v6"/></svg>
  ),
  scissors: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
  ),
  kebab: (
    <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
  ),
  emoji: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
  ),
  clip: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5S13.5 3.62 13.5 5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
  ),
  ticks: (
    <svg viewBox="0 0 16 11" fill="currentColor"><path d="M11.071.653a.5.5 0 0 0-.696.122l-5.81 7.793-2.51-2.748a.5.5 0 0 0-.738.675l2.939 3.217a.5.5 0 0 0 .77-.045L11.193 1.35a.5.5 0 0 0-.122-.697z"/><path d="M15.215.653a.5.5 0 0 0-.697.122l-5.811 7.793-1.04-1.139a.5.5 0 0 0-.738.675l1.47 1.61a.5.5 0 0 0 .77-.046L15.336 1.35a.5.5 0 0 0-.121-.697z"/></svg>
  ),
};

function SChat({ D }) {
  const ref = useReveal();
  const [activeTab, setActiveTab] = useState(0);
  const [visibleMsgs, setVisibleMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const bodyRef = useRef(null);
  const sectionRef = useRef(null);
  const timersRef = useRef([]);

  // Compose refs: useReveal returns a ref, we also need our own
  const setSectionRef = (node) => {
    sectionRef.current = node;
    if (ref) ref.current = node;
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // Start animation only when the section enters viewport
  useEffect(() => {
    if (!sectionRef.current || started) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setStarted(true);
        obs.disconnect();
      }
    }, { threshold: 0.25 });
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, [started]);

  // Drive conversation when started or activeTab changes
  useEffect(() => {
    if (!started) return;
    clearTimers();
    setVisibleMsgs([]);
    setTyping(false);

    const conv = D.chat.tabs[activeTab].conv;
    let cumulative = 0;

    conv.forEach((msg, idx) => {
      if (idx === 0) {
        const t = setTimeout(() => {
          setVisibleMsgs(prev => [...prev, { ...msg, id: idx }]);
        }, 220);
        timersRef.current.push(t);
        cumulative = 220;
        return;
      }

      // Typing indicator before subsequent messages
      const typingShow = setTimeout(() => setTyping(true), cumulative + 350);
      timersRef.current.push(typingShow);

      // Reveal message
      const msgPause = Math.min(900 + msg.text.length * 14, 2200);
      const reveal = setTimeout(() => {
        setTyping(false);
        setVisibleMsgs(prev => [...prev, { ...msg, id: idx }]);
      }, cumulative + 350 + msgPause);
      timersRef.current.push(reveal);

      cumulative += 350 + msgPause;
    });

    return clearTimers;
  }, [activeTab, started, D.chat.tabs]);

  // Auto-scroll body to latest
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [visibleMsgs, typing]);

  return (
    <section className="s-chat s-reveal" ref={setSectionRef} data-screen-label="05 WhatsApp">
      <div className="s-container">
        <div className="s-chat-section-head">
          <span className="s-eyebrow">{D.chat.eyebrow}</span>
          <h2>{D.chat.titleStart} <em>{D.chat.titleEm}</em></h2>
          <p>{D.chat.subtitle}</p>
        </div>
        <div className="s-chat-wrap">
          <div className="s-chat-left">
            <div className="s-wa-features">
              {D.chat.features.map((f, i) => (
                <div key={i} className="s-wa-feat">
                  <div className="s-wa-feat-icon">{WA_ICONS[f.icon]}</div>
                  <div className="s-wa-feat-body">
                    <div className="s-wa-feat-title">{f.title}</div>
                    <p className="s-wa-feat-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="s-wa-stat">
              <div className="s-wa-stat-big">{D.chat.stat.big}</div>
              <div className="s-wa-stat-label">{D.chat.stat.label}</div>
              <div className="s-wa-stat-foot">{D.chat.stat.foot}</div>
            </div>
          </div>

          <div className="s-chat-window">
            <div className="s-chat-head">
              <div className="s-chat-avatar">{WA_ICONS.scissors}</div>
              <div className="s-chat-head-info">
                <div className="s-chat-head-name">{D.chat.salonName}</div>
                <div className="s-chat-head-status">en línea</div>
              </div>
              <div className="s-chat-head-icons">
                {WA_ICONS.video}
                {WA_ICONS.phone}
                {WA_ICONS.kebab}
              </div>
            </div>

            <div className="s-chat-tabs" role="tablist">
              {D.chat.tabs.map((t, i) => (
                <button
                  key={t.key}
                  className={`s-chat-tab ${i === activeTab ? 'active' : ''}`}
                  onClick={() => setActiveTab(i)}
                  role="tab"
                  aria-selected={i === activeTab}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="s-chat-body" ref={bodyRef}>
              <div className="s-chat-date">HOY</div>
              {visibleMsgs.map(m => (
                <div key={m.id} className={`s-chat-msg ${m.from}`}>
                  <span className="s-chat-msg-text">{formatWA(m.text)}</span>
                  <span className="s-chat-msg-meta">
                    <span className="s-chat-msg-time">{m.time}</span>
                    <span className="s-chat-msg-ticks">{WA_ICONS.ticks}</span>
                  </span>
                </div>
              ))}
              {typing && (
                <div className="s-chat-typing">
                  <span></span><span></span><span></span>
                </div>
              )}
            </div>

            <div className="s-chat-input">
              <div className="s-chat-input-btn">{WA_ICONS.emoji}</div>
              <div className="s-chat-input-field">
                <div className="s-chat-input-field-text">Escribe un mensaje</div>
                <div className="s-chat-input-btn" style={{ width: 22, height: 22, marginRight: -4 }}>{WA_ICONS.clip}</div>
              </div>
              <div className="s-chat-input-mic">{WA_ICONS.mic}</div>
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
          <h2>Empezar toma <em>10 minutos.</em><br/>Lo medimos.</h2>
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
          <Link to="/register/beauty" state={{ source: 'skubik-how', category: 'barbershop-salon' }} className="s-btn s-btn-primary">
            Regístrate →
          </Link>
          <a className="s-btn s-btn-ghost" href={D.brand.waMsg('Arranquemos.')} target="_blank" rel="noreferrer">
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
  const [billingCycle, setBillingCycle] = useState('annual');
  const isAnnual = billingCycle === 'annual';
  const [clientsPerMonth, setClientsPerMonth] = useState(120);
  const [ticket, setTicket] = useState(40);
  const cancelRate = 0.22;
  const withSK = 0.06;
  const lostWithout = Math.round(clientsPerMonth * cancelRate * ticket);
  const lostWith = Math.round(clientsPerMonth * withSK * ticket);
  const saved = lostWithout - lostWith;
  const planAnnual = clientsPerMonth < 80 ? 15 : clientsPerMonth < 300 ? 25 : 50;
  const planMonthly = clientsPerMonth < 80 ? 18 : clientsPerMonth < 300 ? 28 : 60;
  const plan = isAnnual ? planAnnual : planMonthly;
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
          <div className="s-roi-sliders">
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
              <div className="s-roi-col-sub">22% de no-show sin anticipo obligatorio</div>
            </div>
            <div className="s-roi-col good">
              <div className="s-roi-col-label">Con SmartKubik · plantones al mes</div>
              <div className="s-roi-col-val">${lostWith.toLocaleString('es-VE')}</div>
              <div className="s-roi-col-sub">6% residual · anticipos hacen el trabajo</div>
            </div>
          </div>
          <div className="s-roi-saves">
            <div className="s-roi-saves-label">Recuperas al mes, después del plan (${plan})</div>
            <div className="s-roi-saves-val">≈ <em>${net.toLocaleString('es-VE')}</em> / mes</div>
          </div>
        </div>

        <div className="s-price-toggle-wrap">
          <div className="s-price-toggle" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={!isAnnual}
              className={!isAnnual ? 'active' : ''}
              onClick={() => setBillingCycle('monthly')}
            >Mensual</button>
            <button
              type="button"
              role="tab"
              aria-selected={isAnnual}
              className={isAnnual ? 'active' : ''}
              onClick={() => setBillingCycle('annual')}
            >Anual <span className="s-price-toggle-badge">−21%</span></button>
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
                <span className="s-price-val">{isAnnual ? p.priceAnnual : p.priceMonthly}</span>
                <span className="s-price-per">{p.per}</span>
              </div>
              <div className="s-price-billing">
                {isAnnual ? `Facturado anualmente · $${Number(p.priceAnnual) * 12}/año` : 'Sin compromiso · mes a mes'}
              </div>
              <div className="s-price-feats">
                {p.features.map(f => <div key={f} className="s-price-feat">{f}</div>)}
              </div>
              {p.name === 'Multi' ? (
                <button className="s-price-cta" onClick={() => window.open(D.brand.waMsg(`Plan ${p.name}.`), '_blank')}>{p.cta}</button>
              ) : (
                <Link to="/register/beauty" state={{ source: 'skubik-pricing', plan: p.name.toLowerCase() }} className="s-price-cta">{p.cta}</Link>
              )}
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

// ---- Affiliate strip ----
function SAffiliateStrip() {
  const ref = useReveal();
  return (
    <section className="s-aff s-reveal" ref={ref} data-screen-label="08b Afiliados">
      <div className="s-container">
        <div className="s-aff-card">
          <div className="s-aff-text">
            <div className="s-aff-eyebrow">Programa de afiliados</div>
            ¿No es para ti, pero conoces a quién podría servirle? Gana <strong>hasta 20% cada mes</strong> recomendando Skubik.
          </div>
          <Link to="/skubik/afiliados" className="s-aff-cta">
            Quiero unirme →
          </Link>
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
        <h2>Empieza <em>gratis</em> hoy.</h2>
        <p>10 minutos para configurarlo. 14 días para probar. Sin tarjeta. Sin compromiso. Si no funciona, te ayudamos a migrar tus datos a donde quieras.</p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/register/beauty" state={{ source: 'skubik-landing' }} className="s-btn s-btn-primary">
            Prueba gratis 14 días →
          </Link>
          <a className="s-btn s-btn-ghost" href={D.brand.waMsg('Vamos.')} target="_blank" rel="noreferrer">
            {WA_ICON}
            {D.closure.cta}
          </a>
        </div>
      </div>
    </section>
  );
}

// ---- Footer ----
function SFoot({ D }) {
  return (
    <footer className="s-foot">
      <div className="s-container s-foot-inner">
        <span>SmartKubik · /belleza · <a href="/skubik/afiliados" style={{ color: 'var(--s-accent2)', textDecoration: 'none' }}>Programa de Afiliados</a></span>
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
      <SWebShowcase />
      <SBenefits D={D} />
      <SChat D={D} />
      <SHow D={D} />
      <SPricing D={D} />
      <SFAQ D={D} />
      <SAffiliateStrip />
      <SClose D={D} />
      <SFoot D={D} />
      <SWAFloat D={D} />
    </div>
  );
}
