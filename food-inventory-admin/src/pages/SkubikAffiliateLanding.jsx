import React, { useState, useEffect, useRef } from 'react';

// ════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════

const D = {
  brand: {
    name: 'SmartKubik',
    whatsapp: '584120402324',
    waMsg: (text) => `https://wa.me/584120402324?text=${encodeURIComponent(text)}`,
  },

  hero: {
    eyebrow: 'Programa de afiliados · Skubik Belleza',
    title: 'Gana dinero recomendando el software que ya usan tus amigas.',
    subtitle: 'Refiere salones, barberías y spas a Skubik. Por cada negocio que se quede, tú cobras el 20% de su plan — todos los meses, sin límite.',
    stats: [
      { value: '20%', label: 'Comisión recurrente' },
      { value: '$7–$19', label: 'Por salón al mes' },
      { value: '∞', label: 'Sin tope de referidos' },
    ],
    primaryCTA: 'Quiero ser afiliada',
    secondaryCTA: 'Ya soy afiliada → Panel',
    microcopy: 'Sin inversión · Sin cuota mínima · Cobras cada mes',
  },

  howItWorks: {
    title: 'Así de simple funciona.',
    steps: [
      { n: '1', t: 'Compartes tu link', d: 'Te damos un link único. Lo compartes por WhatsApp, Instagram o como quieras. Sin límite.' },
      { n: '2', t: 'El salón se registra', d: 'La dueña del salón prueba Skubik gratis 14 días. Si le gusta (y le va a gustar), elige un plan.' },
      { n: '3', t: 'Tú cobras cada mes', d: 'El 20% de lo que pague ese salón te llega a ti. Cada mes. Mientras siga usando Skubik.' },
    ],
  },

  commission: {
    title: 'Tu comisión no es un pago único. Es un ingreso recurrente.',
    subtitle: 'Cada salón que refieras te genera comisión mensual automática. No una vez — todos los meses.',
    plans: [
      { name: 'Solo', price: 15, commission: 3 },
      { name: 'Estudio', price: 35, commission: 7, featured: true },
      { name: 'Salón', price: 65, commission: 13 },
      { name: 'Multi', price: 95, commission: 19 },
    ],
  },

  calculator: {
    title: 'Haz las cuentas.',
    subtitle: 'Mueve el slider. ¿Cuántas dueñas de salón conoces?',
  },

  personas: {
    title: '¿Para quién es esto?',
    subtitle: 'Si conoces gente en el mundo de la belleza, esto es para ti.',
    items: [
      { icon: '✂️', title: 'Estilistas que ya usan Skubik', desc: 'Recomiéndalo a colegas. Ya sabes que funciona — ahora gana por compartirlo.' },
      { icon: '📦', title: 'Proveedoras de productos de belleza', desc: 'Ya visitas salones cada semana. Agrega Skubik a tu portafolio de soluciones.' },
      { icon: '📊', title: 'Consultoras de negocios', desc: 'Ayudas salones a crecer. Skubik es la herramienta que complementa tu asesoría.' },
      { icon: '📱', title: 'Influencers de belleza', desc: 'Tu audiencia confía en ti. Recomienda algo que de verdad les cambia el negocio.' },
    ],
  },

  faq: {
    title: 'Preguntas frecuentes',
    items: [
      { q: '¿Cómo me pagan?', a: 'Por transferencia bancaria, Pago Móvil, Zelle o Binance. Tú eliges el método. Pagamos los primeros 5 días de cada mes.' },
      { q: '¿Cuándo empiezo a cobrar?', a: 'Cuando tu referido termina los 14 días de prueba y elige un plan de pago. A partir de ahí, cobras el 20% de su plan cada mes.' },
      { q: '¿Necesito experiencia en ventas?', a: 'No. Solo necesitas conocer dueñas de salón. Compartes tu link, ellas prueban gratis, y si se quedan, tú cobras. Sin presión, sin cuotas.' },
      { q: '¿Puedo referir desde otro país?', a: 'Sí. Skubik funciona en toda Latinoamérica. Puedes referir salones en cualquier país donde operemos.' },
      { q: '¿Qué pasa si el salón cancela?', a: 'Dejas de cobrar la comisión de ese salón. Pero tus otros referidos activos siguen generando ingresos.' },
      { q: '¿Hay límite de referidos?', a: 'No. Puedes referir 5, 50 o 500 salones. No hay tope. Mientras más refieras, más ganas.' },
      { q: '¿Cuánto cuesta participar?', a: 'Nada. Cero. No pagas nada por ser afiliada. Nosotros te damos el link y tú ganas por cada salón que se quede.' },
      { q: '¿Puedo ver mis ganancias en tiempo real?', a: 'Sí. Tienes un panel donde ves tus referidos, sus estados (prueba/activo) y tus comisiones acumuladas.' },
    ],
  },

  closure: {
    title: 'Tu próximo ingreso recurrente empieza con un link.',
    subtitle: 'Escríbenos hoy. En 5 minutos tienes tu link y puedes empezar.',
    cta: 'Quiero mi link de afiliada',
  },
};

// ════════════════════════════════════════════════════════
// CSS
// ════════════════════════════════════════════════════════

const AFFILIATE_STYLES = `
:root {
  --s-bg: #0b0a09; --s-bg2: #141210; --s-fg: #f5efe3;
  --s-muted: #8a8275; --s-dim: #4a443b; --s-accent: #ff5a2c;
  --s-accent2: #d0ff3a; --s-green: #25d366;
  --s-line: rgba(245,239,227,0.08); --s-card: rgba(245,239,227,0.03);
}
.skubik-page * { box-sizing: border-box; margin: 0; padding: 0; }
html.skubik-page-active { scroll-behavior: smooth; }
html.skubik-page-active, body.skubik-page-active { background: var(--s-bg); color: var(--s-fg); font-family: 'Inter Tight', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
body.skubik-page-active { cursor: none; overflow-x: clip; }
@media (hover: none) { body.skubik-page-active { cursor: auto; } }

/* Cursor */
.s-cursor { position: fixed; width: 10px; height: 10px; border-radius: 50%; background: var(--s-accent); pointer-events: none; z-index: 9999; mix-blend-mode: difference; transition: transform 0.15s ease, width 0.2s, height 0.2s; transform: translate(-50%,-50%); }
.s-cursor.hover { width: 60px; height: 60px; background: var(--s-fg); }
.s-cursor-ring { position: fixed; width: 40px; height: 40px; border: 1px solid var(--s-fg); border-radius: 50%; pointer-events: none; z-index: 9998; mix-blend-mode: difference; transform: translate(-50%,-50%); transition: transform 0.4s cubic-bezier(0.2,0.8,0.2,1); opacity: 0.5; }

/* Progress */
.s-progress { position: fixed; top: 0; left: 0; right: 0; height: 2px; background: transparent; z-index: 100; pointer-events: none; }
.s-progress-bar { height: 100%; background: var(--s-accent); width: 0%; transition: width 0.08s linear; }

/* Nav */
.sa-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 60; padding: 18px 32px; display: flex; justify-content: space-between; align-items: center; backdrop-filter: blur(14px); background: rgba(11,10,9,0.6); border-bottom: 1px solid var(--s-line); }
.sa-nav-logo { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; letter-spacing: -0.02em; display: flex; align-items: center; gap: 10px; }
.sa-nav-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--s-accent2); animation: sa-pulse 2s ease-in-out infinite; }
@keyframes sa-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
.sa-nav-logo-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-accent2); letter-spacing: 0.15em; text-transform: uppercase; margin-left: 4px; }
.sa-nav-links { display: flex; gap: 24px; }
.sa-nav-links a { color: var(--s-muted); text-decoration: none; transition: color 0.2s; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
.sa-nav-links a:hover { color: var(--s-fg); }
@media (max-width: 720px) { .sa-nav-links { display: none; } }

/* Shared */
.sa-container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
@media (max-width: 480px) { .sa-container { padding: 0 20px; } }
.sa-container-narrow { max-width: 960px; margin: 0 auto; padding: 0 32px; }
@media (max-width: 480px) { .sa-container-narrow { padding: 0 20px; } }
.skubik-page h1, .skubik-page h2, .skubik-page h3 { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.03em; line-height: 0.98; }
.sa-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.22em; color: var(--s-accent2); display: inline-flex; align-items: center; gap: 10px; }
.sa-eyebrow::before { content: ''; width: 24px; height: 1px; background: var(--s-accent2); }
.sa-btn { display: inline-flex; align-items: center; gap: 10px; padding: 16px 26px; border-radius: 99px; font-weight: 600; font-size: 15px; text-decoration: none; border: 1px solid transparent; cursor: none; transition: all 0.25s cubic-bezier(0.2,0.8,0.2,1); }
.sa-btn-primary { background: var(--s-accent2); color: var(--s-bg); }
.sa-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(208,255,58,0.25); }
.sa-btn-ghost { background: transparent; color: var(--s-fg); border-color: var(--s-line); }
.sa-btn-ghost:hover { border-color: var(--s-fg); }
.sa-wa-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--s-green); color: #fff; text-decoration: none; border-radius: 99px; font-weight: 600; font-size: 13px; border: none; cursor: none; transition: transform 0.2s; }
.sa-wa-btn:hover { transform: translateY(-1px); }

/* Hero */
.sa-hero { min-height: 100vh; padding: 140px 0 80px; position: relative; overflow: hidden; }
.sa-hero-grid-bg { position: absolute; inset: 0; background-image: linear-gradient(var(--s-line) 1px, transparent 1px), linear-gradient(90deg, var(--s-line) 1px, transparent 1px); background-size: 80px 80px; opacity: 0.5; mask: radial-gradient(ellipse at center top, #000 0%, transparent 70%); }
.sa-hero-inner { position: relative; max-width: 820px; }
.sa-hero h1 { font-size: clamp(42px, 7vw, 88px); margin: 24px 0 28px; }
.sa-hero h1 em { font-style: italic; color: var(--s-accent2); }
.sa-hero-word { display: inline-block; opacity: 0; transform: translateY(40px); transition: opacity 0.7s cubic-bezier(0.2,0.8,0.2,1), transform 0.7s cubic-bezier(0.2,0.8,0.2,1); }
.sa-hero-word.in { opacity: 1; transform: none; }
.sa-hero-sub { font-size: 18px; line-height: 1.55; color: var(--s-muted); max-width: 600px; margin-bottom: 40px; }
.sa-hero-cta { display: flex; gap: 14px; flex-wrap: wrap; }
.sa-hero-micro { margin-top: 18px; font-size: 12px; color: var(--s-muted); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em; }
.sa-hero-stats { display: flex; gap: 32px; margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--s-line); flex-wrap: wrap; }
.sa-hero-stat-val { font-family: 'Fraunces', serif; font-size: 36px; font-style: italic; color: var(--s-accent2); }
.sa-hero-stat-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; }
.sa-hero-hint { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.2em; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.sa-hero-hint-line { width: 1px; height: 40px; background: linear-gradient(to bottom, var(--s-muted), transparent); animation: sa-hintScroll 2s ease-in-out infinite; }
@keyframes sa-hintScroll { 0% { transform: translateY(-10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(10px); opacity: 0; } }

/* How */
.sa-how { padding: 120px 0; background: var(--s-bg2); border-top: 1px solid var(--s-line); border-bottom: 1px solid var(--s-line); }
.sa-how-head { text-align: center; margin-bottom: 60px; }
.sa-how-head h2 { font-size: clamp(36px, 5vw, 64px); margin: 20px 0; }
.sa-how-head h2 em { font-style: italic; color: var(--s-accent2); }
.sa-how-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1080px; margin: 0 auto; }
@media (max-width: 820px) { .sa-how-steps { grid-template-columns: 1fr; } }
.sa-how-step { background: var(--s-bg); border: 1px solid var(--s-line); border-radius: 20px; padding: 36px 28px; }
.sa-how-step-n { font-family: 'Fraunces', serif; font-size: 72px; font-style: italic; color: var(--s-accent2); line-height: 1; margin-bottom: 20px; }
.sa-how-step h3 { font-size: 22px; margin-bottom: 10px; }
.sa-how-step p { color: var(--s-muted); font-size: 14px; line-height: 1.55; }
.sa-how-arrow { display: none; }
@media (min-width: 821px) { .sa-how-arrow { display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--s-accent2); } }

/* Commission */
.sa-commission { padding: 120px 0; }
.sa-commission-head { max-width: 780px; margin-bottom: 60px; }
.sa-commission-head h2 { font-size: clamp(36px, 5vw, 64px); margin: 20px 0; }
.sa-commission-head h2 em { font-style: italic; color: var(--s-accent2); }
.sa-commission-head p { color: var(--s-muted); font-size: 17px; line-height: 1.6; margin-top: 14px; }
.sa-commission-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 900px) { .sa-commission-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .sa-commission-grid { grid-template-columns: 1fr; } }
.sa-commission-card { background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 20px; padding: 28px 22px; text-align: center; transition: all 0.3s; }
.sa-commission-card:hover { border-color: var(--s-muted); transform: translateY(-4px); }
.sa-commission-card.featured { border-color: var(--s-accent2); background: linear-gradient(180deg, rgba(208,255,58,0.08) 0%, var(--s-bg2) 50%); }
.sa-commission-card-plan { font-family: 'Fraunces', serif; font-size: 22px; font-style: italic; margin-bottom: 6px; }
.sa-commission-card-price { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--s-muted); margin-bottom: 16px; }
.sa-commission-card-earn { font-family: 'Fraunces', serif; font-size: 48px; font-style: italic; color: var(--s-accent2); }
.sa-commission-card-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }
.sa-commission-badge { display: inline-block; margin-bottom: 12px; padding: 4px 10px; background: var(--s-accent2); color: var(--s-bg); border-radius: 99px; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }

/* Calculator */
.sa-calc { padding: 120px 0; background: var(--s-bg2); border-top: 1px solid var(--s-line); border-bottom: 1px solid var(--s-line); }
.sa-calc-head { text-align: center; margin-bottom: 50px; }
.sa-calc-head h2 { font-size: clamp(36px, 5vw, 64px); margin: 20px 0; }
.sa-calc-head h2 em { font-style: italic; color: var(--s-accent2); }
.sa-calc-head p { color: var(--s-muted); font-size: 17px; }
.sa-calc-box { background: var(--s-bg); border: 1px solid var(--s-line); border-radius: 24px; padding: 40px; max-width: 720px; margin: 0 auto; }
.sa-calc-slider-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.sa-calc-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--s-muted); }
.sa-calc-val { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--s-fg); font-size: 14px; }
.sa-calc-box input[type=range] { width: 100%; -webkit-appearance: none; height: 6px; background: var(--s-line); border-radius: 99px; outline: none; margin: 8px 0 32px; }
.sa-calc-box input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; background: var(--s-accent2); border-radius: 50%; cursor: none; border: 3px solid var(--s-bg); box-shadow: 0 0 0 2px var(--s-accent2); }
.sa-calc-box input[type=range]::-moz-range-thumb { width: 24px; height: 24px; background: var(--s-accent2); border-radius: 50%; border: 3px solid var(--s-bg); }
.sa-calc-results { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 500px) { .sa-calc-results { grid-template-columns: 1fr; } }
.sa-calc-result { padding: 24px; border-radius: 16px; text-align: center; }
.sa-calc-result.monthly { background: rgba(208,255,58,0.08); border: 1px solid rgba(208,255,58,0.2); }
.sa-calc-result.annual { background: rgba(255,90,44,0.08); border: 1px solid rgba(255,90,44,0.2); }
.sa-calc-result-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--s-muted); margin-bottom: 8px; }
.sa-calc-result-val { font-family: 'Fraunces', serif; font-size: 52px; font-weight: 400; font-variant-numeric: tabular-nums; }
.sa-calc-result.monthly .sa-calc-result-val { color: var(--s-accent2); }
.sa-calc-result.annual .sa-calc-result-val { color: var(--s-accent); }
.sa-calc-result-sub { font-size: 13px; color: var(--s-muted); margin-top: 6px; }
.sa-calc-note { text-align: center; margin-top: 24px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; }

/* Personas */
.sa-personas { padding: 120px 0; }
.sa-personas-head { margin-bottom: 60px; max-width: 780px; }
.sa-personas-head h2 { font-size: clamp(36px, 5vw, 64px); margin: 20px 0; }
.sa-personas-head h2 em { font-style: italic; color: var(--s-accent2); }
.sa-personas-head p { color: var(--s-muted); font-size: 17px; line-height: 1.6; }
.sa-personas-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 700px) { .sa-personas-grid { grid-template-columns: 1fr; } }
.sa-persona-card { background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 20px; padding: 28px 24px; transition: all 0.3s; }
.sa-persona-card:hover { border-color: var(--s-muted); transform: translateY(-3px); }
.sa-persona-icon { font-size: 32px; margin-bottom: 16px; }
.sa-persona-card h3 { font-size: 20px; margin-bottom: 8px; }
.sa-persona-card p { color: var(--s-muted); font-size: 14px; line-height: 1.55; }

/* FAQ */
.sa-faq { padding: 120px 0; }
.sa-faq-head { margin-bottom: 50px; }
.sa-faq-head h2 { font-size: clamp(36px, 5vw, 64px); margin: 20px 0; }
.sa-faq-head h2 em { font-style: italic; color: var(--s-accent2); }
.sa-faq-list { display: flex; flex-direction: column; }
.sa-faq-item { border-top: 1px solid var(--s-line); padding: 22px 0; cursor: none; transition: all 0.3s; }
.sa-faq-item:last-child { border-bottom: 1px solid var(--s-line); }
.sa-faq-item:hover { padding-left: 14px; }
.sa-faq-item.open { padding-left: 14px; }
.sa-faq-q { display: flex; justify-content: space-between; align-items: center; gap: 20px; font-family: 'Fraunces', serif; font-size: clamp(18px, 2.5vw, 26px); font-weight: 400; }
.sa-faq-q-n { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); margin-right: 12px; }
.sa-faq-plus { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--s-line); display: flex; align-items: center; justify-content: center; color: var(--s-muted); transition: all 0.3s; flex-shrink: 0; }
.sa-faq-item.open .sa-faq-plus { background: var(--s-accent2); border-color: var(--s-accent2); color: var(--s-bg); transform: rotate(45deg); }
.sa-faq-a { max-height: 0; overflow: hidden; transition: all 0.4s cubic-bezier(0.2,0.8,0.2,1); color: var(--s-muted); font-size: 16px; line-height: 1.6; max-width: 720px; }
.sa-faq-item.open .sa-faq-a { max-height: 200px; padding-top: 14px; }

/* Closure */
.sa-close { padding: 160px 0 120px; text-align: center; position: relative; overflow: hidden; }
.sa-close-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(208,255,58,0.12) 0%, transparent 60%); pointer-events: none; }
.sa-close h2 { font-size: clamp(48px, 8vw, 112px); letter-spacing: -0.035em; line-height: 0.92; position: relative; }
.sa-close h2 em { font-style: italic; color: var(--s-accent2); }
.sa-close p { font-size: 18px; color: var(--s-muted); margin: 30px auto; max-width: 500px; line-height: 1.5; position: relative; }
.sa-close .sa-btn { margin-top: 14px; padding: 20px 36px; font-size: 16px; position: relative; }

/* Footer */
.sa-foot { padding: 40px 0; border-top: 1px solid var(--s-line); font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; }
.sa-foot-inner { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.sa-foot a { color: var(--s-accent2); text-decoration: none; }
.sa-foot a:hover { color: var(--s-fg); }

/* WA floating */
.sa-wa-float { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: var(--s-green); color: #fff; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 10px 30px rgba(37,211,102,0.35); z-index: 90; transition: transform 0.2s; }
.sa-wa-float:hover { transform: scale(1.08); }

/* Reveal */
.sa-reveal { opacity: 0; transform: translateY(40px); transition: all 0.8s cubic-bezier(0.2,0.8,0.2,1); }
.sa-reveal.in { opacity: 1; transform: none; }
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

// ════════════════════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════════════════════

const WA_SVG = <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2.6 1 3.1.8 3.7.8.6-.1 1.8-.7 2-1.5.2-.7.2-1.4.2-1.5-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 00-8.5 15.3L2 22l4.9-1.3A10 10 0 1012 2z"/></svg>;
const WA_LG = <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2.6 1 3.1.8 3.7.8.6-.1 1.8-.7 2-1.5.2-.7.2-1.4.2-1.5-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 00-8.5 15.3L2 22l4.9-1.3A10 10 0 1012 2z"/></svg>;

function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    let rx = 0, ry = 0, dx = 0, dy = 0;
    const move = (e) => { dx = e.clientX; dy = e.clientY; if (dotRef.current) dotRef.current.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)`; };
    const tick = () => { rx += (dx - rx) * 0.15; ry += (dy - ry) * 0.15; if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(tick); };
    window.addEventListener('mousemove', move); tick();
    const over = (e) => { if (e.target.closest('a,button,input,.sa-faq-item,.sa-persona-card')) dotRef.current?.classList.add('hover'); };
    const out = () => dotRef.current?.classList.remove('hover');
    document.addEventListener('mouseover', over); document.addEventListener('mouseout', out);
    return () => { window.removeEventListener('mousemove', move); document.removeEventListener('mouseover', over); document.removeEventListener('mouseout', out); };
  }, []);
  return <><div className="s-cursor-ring" ref={ringRef}/><div className="s-cursor" ref={dotRef}/></>;
}

function Progress() {
  const p = useScrollProgress();
  return <div className="s-progress"><div className="s-progress-bar" style={{ width: `${p*100}%` }}/></div>;
}

// ---- Nav ----
function ANav() {
  return (
    <nav className="sa-nav">
      <div className="sa-nav-logo">
        <span className="sa-nav-logo-dot"></span>
        <a href="/skubik" style={{ color: 'inherit', textDecoration: 'none' }}>SmartKubik</a>
        <span className="sa-nav-logo-tag">/ afiliados</span>
      </div>
      <div className="sa-nav-links">
        <a href="#como-funciona">Cómo funciona</a>
        <a href="#comisiones">Comisiones</a>
        <a href="#faq">FAQ</a>
      </div>
      <a href={D.brand.waMsg('Quiero ser afiliada de Skubik.')} target="_blank" rel="noreferrer" className="sa-wa-btn">{WA_SVG} Unirme</a>
    </nav>
  );
}

// ---- Hero ----
function HeroHeadline({ title }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);
  const words = title.split(' ');
  return (
    <h1>
      {words.map((w, i) => {
        const em = w.includes('dinero') || w.includes('amigas');
        return (
          <span className={`sa-hero-word ${mounted ? 'in' : ''}`} key={i} style={{ transitionDelay: `${0.08 + i * 0.05}s` }}>
            {em ? <em>{w}&nbsp;</em> : <>{w}&nbsp;</>}
          </span>
        );
      })}
    </h1>
  );
}

function AHero() {
  return (
    <section className="sa-hero">
      <div className="sa-hero-grid-bg"></div>
      <div className="sa-container sa-hero-inner">
        <span className="sa-eyebrow">{D.hero.eyebrow}</span>
        <HeroHeadline title={D.hero.title} />
        <p className="sa-hero-sub">{D.hero.subtitle}</p>
        <div className="sa-hero-cta">
          <a className="sa-btn sa-btn-primary" href={D.brand.waMsg('Quiero ser afiliada de Skubik.')} target="_blank" rel="noreferrer">{WA_SVG} {D.hero.primaryCTA}</a>
          <a className="sa-btn sa-btn-ghost" href="/skubik/panel">{D.hero.secondaryCTA}</a>
        </div>
        <div className="sa-hero-micro">{D.hero.microcopy}</div>
        <div className="sa-hero-stats">
          {D.hero.stats.map((s, i) => (
            <div key={i}>
              <div className="sa-hero-stat-val">{s.value}</div>
              <div className="sa-hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="sa-hero-hint"><span>Scroll</span><span className="sa-hero-hint-line"></span></div>
    </section>
  );
}

// ---- How It Works ----
function AHow() {
  const ref = useReveal();
  return (
    <section className="sa-how sa-reveal" ref={ref} id="como-funciona">
      <div className="sa-container">
        <div className="sa-how-head">
          <span className="sa-eyebrow">Cómo funciona</span>
          <h2>Así de <em>simple</em> funciona.</h2>
        </div>
        <div className="sa-how-steps">
          {D.howItWorks.steps.map((s, i) => (
            <div className="sa-how-step" key={i}>
              <div className="sa-how-step-n">0{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Commission Structure ----
function ACommission() {
  const ref = useReveal();
  return (
    <section className="sa-commission sa-reveal" ref={ref} id="comisiones">
      <div className="sa-container">
        <div className="sa-commission-head">
          <span className="sa-eyebrow">Comisiones</span>
          <h2>{D.commission.title.split('.')[0]}. <em>{D.commission.title.split('.')[1]}.</em></h2>
          <p>{D.commission.subtitle}</p>
        </div>
        <div className="sa-commission-grid">
          {D.commission.plans.map(p => (
            <div key={p.name} className={`sa-commission-card ${p.featured ? 'featured' : ''}`}>
              {p.featured && <div className="sa-commission-badge">★ Más común</div>}
              <div className="sa-commission-card-plan">{p.name}</div>
              <div className="sa-commission-card-price">Plan ${p.price}/mes</div>
              <div className="sa-commission-card-earn">${p.commission}</div>
              <div className="sa-commission-card-label">Tú ganas / mes</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Earnings Calculator ----
function ACalculator() {
  const ref = useReveal();
  const [salons, setSalons] = useState(10);
  const avgPlan = 35;
  const rate = 0.20;
  const monthly = Math.round(salons * avgPlan * rate);
  const annual = monthly * 12;

  return (
    <section className="sa-calc sa-reveal" ref={ref}>
      <div className="sa-container">
        <div className="sa-calc-head">
          <span className="sa-eyebrow">Calculadora</span>
          <h2>Haz las <em>cuentas.</em></h2>
          <p>{D.calculator.subtitle}</p>
        </div>
        <div className="sa-calc-box">
          <div className="sa-calc-slider-row">
            <span className="sa-calc-label">Salones referidos</span>
            <span className="sa-calc-val">{salons} salones</span>
          </div>
          <input type="range" min={1} max={50} step={1} value={salons} onChange={e => setSalons(+e.target.value)} />
          <div className="sa-calc-results">
            <div className="sa-calc-result monthly">
              <div className="sa-calc-result-label">Ganas al mes</div>
              <div className="sa-calc-result-val">${monthly}</div>
              <div className="sa-calc-result-sub">recurrente, cada mes</div>
            </div>
            <div className="sa-calc-result annual">
              <div className="sa-calc-result-label">Ganas al año</div>
              <div className="sa-calc-result-val">${annual.toLocaleString('es-VE')}</div>
              <div className="sa-calc-result-sub">sin referir uno más</div>
            </div>
          </div>
          <div className="sa-calc-note">Basado en plan Estudio ($35/mes) · 20% comisión</div>
        </div>
      </div>
    </section>
  );
}

// ---- Personas ----
function APersonas() {
  const ref = useReveal();
  return (
    <section className="sa-personas sa-reveal" ref={ref}>
      <div className="sa-container">
        <div className="sa-personas-head">
          <span className="sa-eyebrow">Para ti</span>
          <h2>¿Para quién <em>es esto?</em></h2>
          <p>{D.personas.subtitle}</p>
        </div>
        <div className="sa-personas-grid">
          {D.personas.items.map((p, i) => (
            <div key={i} className="sa-persona-card">
              <div className="sa-persona-icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- FAQ ----
function AFAQ() {
  const ref = useReveal();
  const [open, setOpen] = useState(0);
  return (
    <section className="sa-faq sa-reveal" ref={ref} id="faq">
      <div className="sa-container-narrow">
        <div className="sa-faq-head">
          <span className="sa-eyebrow">FAQ</span>
          <h2>Preguntas <em>frecuentes.</em></h2>
        </div>
        <div className="sa-faq-list">
          {D.faq.items.map((f, i) => (
            <div key={i} className={`sa-faq-item ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? -1 : i)}>
              <div className="sa-faq-q">
                <div><span className="sa-faq-q-n">Q.0{i + 1}</span>{f.q}</div>
                <div className="sa-faq-plus">+</div>
              </div>
              <div className="sa-faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Closure ----
function AClose() {
  const ref = useReveal();
  return (
    <section className="sa-close sa-reveal" ref={ref}>
      <div className="sa-close-bg"></div>
      <div className="sa-container">
        <h2>Tu próximo ingreso<br/>empieza con un <em>link.</em></h2>
        <p>{D.closure.subtitle}</p>
        <a className="sa-btn sa-btn-primary" href={D.brand.waMsg('Quiero mi link de afiliada.')} target="_blank" rel="noreferrer">{WA_SVG} {D.closure.cta}</a>
      </div>
    </section>
  );
}

function AFoot() {
  return (
    <footer className="sa-foot">
      <div className="sa-container sa-foot-inner">
        <span>SmartKubik · <a href="/skubik">/skubik</a> · <a href="/skubik/afiliados">/afiliados</a></span>
        <span>© 2026 · Caracas · +58 412 040 2324</span>
      </div>
    </footer>
  );
}

function AWAFloat() {
  return <a className="sa-wa-float" href={D.brand.waMsg('Hola, quiero ser afiliada.')} target="_blank" rel="noreferrer">{WA_LG}</a>;
}

// ════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════

export default function SkubikAffiliateLanding() {
  useEffect(() => {
    const styleId = 'skubik-affiliate-styles';
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = AFFILIATE_STYLES;
    document.head.appendChild(style);

    const fontId = 'skubik-beauty-fonts';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId; link.rel = 'stylesheet'; link.href = FONT_URL;
      document.head.appendChild(link);
    }

    document.body.classList.add('skubik-page-active');
    document.documentElement.classList.add('skubik-page-active');
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
      <ANav />
      <AHero />
      <AHow />
      <ACommission />
      <ACalculator />
      <APersonas />
      <AFAQ />
      <AClose />
      <AFoot />
      <AWAFloat />
    </div>
  );
}
