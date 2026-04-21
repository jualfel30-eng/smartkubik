import React, { useState, useEffect, useRef, useCallback } from 'react';

// ════════════════════════════════════════════════════════
// MOCK DATA (replace with API calls later)
// ════════════════════════════════════════════════════════

const MOCK_AFFILIATE = {
  name: 'María González',
  code: 'MARIA2026',
  referralLink: 'https://smartkubik.com/skubik?ref=MARIA2026',
  earnings: { thisMonth: 147, allTime: 892.50, pending: 35 },
  referrals: [
    { id: 1, name: 'Studio Bella', status: 'active', plan: 'Estudio', planPrice: 35, joinDate: '2026-01-15', monthlyCommission: 7, totalEarned: 21 },
    { id: 2, name: 'Barbería Don Pedro', status: 'active', plan: 'Solo', planPrice: 15, joinDate: '2026-02-03', monthlyCommission: 3, totalEarned: 6 },
    { id: 3, name: 'Nails & Lashes VIP', status: 'active', plan: 'Salón', planPrice: 65, joinDate: '2026-03-20', monthlyCommission: 13, totalEarned: 13 },
    { id: 4, name: 'Spa Renacer', status: 'trial', plan: 'Estudio', planPrice: 35, joinDate: '2026-04-10', monthlyCommission: 0, totalEarned: 0 },
    { id: 5, name: 'Peluquería La Reina', status: 'active', plan: 'Estudio', planPrice: 35, joinDate: '2026-03-01', monthlyCommission: 7, totalEarned: 14 },
  ],
  history: [
    { month: 'Abril 2026', amount: 30, status: 'pending', details: '5 salones activos' },
    { month: 'Marzo 2026', amount: 27, status: 'paid', details: '4 salones activos' },
    { month: 'Febrero 2026', amount: 10, status: 'paid', details: '2 salones activos' },
    { month: 'Enero 2026', amount: 7, status: 'paid', details: '1 salón activo' },
  ],
};

// ════════════════════════════════════════════════════════
// CSS
// ════════════════════════════════════════════════════════

const PANEL_STYLES = `
:root {
  --s-bg: #0b0a09; --s-bg2: #141210; --s-fg: #f5efe3;
  --s-muted: #8a8275; --s-dim: #4a443b; --s-accent: #ff5a2c;
  --s-accent2: #d0ff3a; --s-green: #25d366;
  --s-line: rgba(245,239,227,0.08); --s-card: rgba(245,239,227,0.03);
}
.skubik-page * { box-sizing: border-box; margin: 0; padding: 0; }
html.skubik-page-active, body.skubik-page-active { background: var(--s-bg); color: var(--s-fg); font-family: 'Inter Tight', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
body.skubik-page-active { overflow-x: clip; }
.skubik-page h1, .skubik-page h2, .skubik-page h3 { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.03em; line-height: 1.1; }

/* Panel layout */
.sp-panel { max-width: 520px; margin: 0 auto; min-height: 100vh; padding-bottom: env(safe-area-inset-bottom, 24px); }

/* Header */
.sp-header { position: sticky; top: 0; z-index: 50; padding: 16px 20px; display: flex; align-items: center; gap: 12px; background: rgba(11,10,9,0.85); backdrop-filter: blur(14px); border-bottom: 1px solid var(--s-line); }
.sp-header-back { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--s-line); background: transparent; color: var(--s-fg); display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 18px; transition: all 0.2s; flex-shrink: 0; }
.sp-header-back:hover { background: var(--s-bg2); border-color: var(--s-muted); }
.sp-header-title { flex: 1; font-family: 'Fraunces', serif; font-size: 18px; font-weight: 500; }
.sp-header-code { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--s-accent2); padding: 4px 10px; border: 1px solid rgba(208,255,58,0.3); border-radius: 99px; text-transform: uppercase; letter-spacing: 0.1em; }

/* Content */
.sp-content { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

/* Cards */
.sp-card { background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 20px; padding: 24px 20px; }
.sp-card-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--s-muted); margin-bottom: 8px; }

/* Earnings card */
.sp-earnings { text-align: center; padding: 32px 20px; }
.sp-earnings-big { font-family: 'Fraunces', serif; font-size: 64px; font-weight: 400; color: var(--s-accent2); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; line-height: 1; }
.sp-earnings-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--s-muted); margin-top: 8px; }
.sp-earnings-row { display: flex; justify-content: center; gap: 32px; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--s-line); }
.sp-earnings-sub-val { font-family: 'Fraunces', serif; font-size: 24px; font-style: italic; color: var(--s-fg); }
.sp-earnings-sub-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--s-muted); margin-top: 2px; }

/* Referral link card */
.sp-link-display { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--s-muted); background: var(--s-bg); border: 1px solid var(--s-line); border-radius: 12px; padding: 12px 14px; margin: 12px 0; word-break: break-all; line-height: 1.5; }
.sp-link-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sp-link-btn { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; border-radius: 14px; border: none; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.sp-link-btn:active { transform: scale(0.97); }
.sp-link-btn.copy { background: var(--s-bg); border: 1px solid var(--s-line); color: var(--s-fg); }
.sp-link-btn.copy:hover { border-color: var(--s-muted); }
.sp-link-btn.copy.copied { background: rgba(208,255,58,0.12); border-color: var(--s-accent2); color: var(--s-accent2); }
.sp-link-btn.whatsapp { background: var(--s-green); color: #fff; }
.sp-link-btn.whatsapp:hover { opacity: 0.9; }

/* Section titles */
.sp-section-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 400; margin-bottom: 12px; padding: 0 4px; }

/* Tabs filter */
.sp-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.sp-tab { padding: 8px 16px; border-radius: 99px; font-size: 13px; font-weight: 500; border: 1px solid var(--s-line); background: transparent; color: var(--s-muted); cursor: pointer; transition: all 0.2s; }
.sp-tab:active { transform: scale(0.97); }
.sp-tab.active { background: var(--s-accent2); color: var(--s-bg); border-color: var(--s-accent2); }

/* Referral cards */
.sp-referral { background: var(--s-bg2); border: 1px solid var(--s-line); border-radius: 16px; padding: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; transition: all 0.2s; }
.sp-referral + .sp-referral { margin-top: 10px; }
.sp-referral-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
.sp-referral-meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sp-referral-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
.sp-referral-badge.active { background: rgba(208,255,58,0.12); color: var(--s-accent2); }
.sp-referral-badge.trial { background: rgba(255,90,44,0.12); color: var(--s-accent); }
.sp-referral-earn { text-align: right; flex-shrink: 0; }
.sp-referral-earn-val { font-family: 'Fraunces', serif; font-size: 22px; font-style: italic; color: var(--s-accent2); }
.sp-referral-earn-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.sp-referral-trial-note { font-size: 12px; color: var(--s-muted); font-style: italic; margin-top: 6px; }

/* History */
.sp-history-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--s-line); }
.sp-history-item:last-child { border-bottom: none; }
.sp-history-month { font-weight: 500; font-size: 14px; }
.sp-history-details { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-muted); margin-top: 2px; }
.sp-history-right { text-align: right; }
.sp-history-amount { font-family: 'Fraunces', serif; font-size: 20px; font-style: italic; }
.sp-history-amount.paid { color: var(--s-accent2); }
.sp-history-amount.pending { color: var(--s-muted); }
.sp-history-status { display: inline-flex; align-items: center; gap: 4px; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
.sp-history-status.paid { color: var(--s-accent2); }
.sp-history-status.pending { color: var(--s-muted); }

/* Empty state */
.sp-empty { text-align: center; padding: 60px 20px; }
.sp-empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
.sp-empty-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.sp-empty-desc { font-size: 14px; color: var(--s-muted); line-height: 1.5; max-width: 280px; margin: 0 auto 20px; }
.sp-empty-cta { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 24px; background: var(--s-green); color: #fff; border: none; border-radius: 14px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none; }
.sp-empty-cta:active { transform: scale(0.97); }

/* Show more */
.sp-show-more { display: block; width: 100%; padding: 12px; background: transparent; border: 1px solid var(--s-line); border-radius: 12px; color: var(--s-muted); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
.sp-show-more:hover { border-color: var(--s-muted); color: var(--s-fg); }

/* Footer link */
.sp-footer { text-align: center; padding: 32px 20px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--s-dim); }
.sp-footer a { color: var(--s-muted); text-decoration: none; }
.sp-footer a:hover { color: var(--s-fg); }
`;

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';

const WA_SVG = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2.6 1 3.1.8 3.7.8.6-.1 1.8-.7 2-1.5.2-.7.2-1.4.2-1.5-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 00-8.5 15.3L2 22l4.9-1.3A10 10 0 1012 2z"/></svg>;

// ════════════════════════════════════════════════════════
// HOOKS
// ════════════════════════════════════════════════════════

function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);
  return { copied, copy };
}

// ════════════════════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════════════════════

function PanelHeader({ affiliate }) {
  return (
    <header className="sp-header">
      <a href="/skubik/afiliados" className="sp-header-back">←</a>
      <div className="sp-header-title">Panel de Afiliado</div>
      <div className="sp-header-code">{affiliate.code}</div>
    </header>
  );
}

function EarningsSummaryCard({ earnings }) {
  return (
    <div className="sp-card sp-earnings">
      <div className="sp-card-label">Ganancias este mes</div>
      <div className="sp-earnings-big">${earnings.thisMonth}</div>
      <div className="sp-earnings-label">Comisiones de abril 2026</div>
      <div className="sp-earnings-row">
        <div>
          <div className="sp-earnings-sub-val">${earnings.allTime}</div>
          <div className="sp-earnings-sub-label">Total histórico</div>
        </div>
        <div>
          <div className="sp-earnings-sub-val">${earnings.pending}</div>
          <div className="sp-earnings-sub-label">Pendiente de pago</div>
        </div>
      </div>
    </div>
  );
}

function ReferralLinkCard({ link, code }) {
  const { copied, copy } = useClipboard();
  const waMsg = `¡Hola! Prueba Skubik para tu salón. Agenda online, cobro de señas, y cero plantones. 14 días gratis:\n${link}`;

  return (
    <div className="sp-card">
      <div className="sp-card-label">Tu link de referido</div>
      <div className="sp-link-display">{link}</div>
      <div className="sp-link-actions">
        <button className={`sp-link-btn copy ${copied ? 'copied' : ''}`} onClick={() => copy(link)}>
          {copied ? '✓ Copiado' : '📋 Copiar link'}
        </button>
        <a className="sp-link-btn whatsapp" href={`https://wa.me/?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noreferrer">
          {WA_SVG} WhatsApp
        </a>
      </div>
    </div>
  );
}

function ReferralsList({ referrals }) {
  const [filter, setFilter] = useState('all');
  const active = referrals.filter(r => r.status === 'active');
  const trial = referrals.filter(r => r.status === 'trial');
  const filtered = filter === 'active' ? active : filter === 'trial' ? trial : referrals;

  return (
    <div>
      <div className="sp-section-title">Tus referidos</div>
      <div className="sp-tabs">
        <button className={`sp-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos ({referrals.length})</button>
        <button className={`sp-tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Activos ({active.length})</button>
        <button className={`sp-tab ${filter === 'trial' ? 'active' : ''}`} onClick={() => setFilter('trial')}>En prueba ({trial.length})</button>
      </div>
      {filtered.length === 0 ? (
        <div className="sp-card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--s-muted)', fontSize: 14 }}>
          No hay referidos en esta categoría
        </div>
      ) : (
        filtered.map(r => (
          <div key={r.id} className="sp-referral">
            <div>
              <div className="sp-referral-name">{r.name}</div>
              <div className="sp-referral-meta">
                <span className={`sp-referral-badge ${r.status}`}>
                  {r.status === 'active' ? '● Activo' : '◐ En prueba'}
                </span>
                <span>{r.plan} · ${r.planPrice}/mes</span>
              </div>
              <div className="sp-referral-meta" style={{ marginTop: 4 }}>
                Desde {new Date(r.joinDate).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              {r.status === 'trial' && (
                <div className="sp-referral-trial-note">Comisión activa cuando elija un plan</div>
              )}
            </div>
            <div className="sp-referral-earn">
              <div className="sp-referral-earn-val">{r.monthlyCommission > 0 ? `$${r.monthlyCommission}` : '—'}</div>
              <div className="sp-referral-earn-label">{r.monthlyCommission > 0 ? '/mes' : 'pendiente'}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CommissionHistory({ history }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? history : history.slice(0, 3);

  return (
    <div>
      <div className="sp-section-title">Historial de comisiones</div>
      <div className="sp-card">
        {visible.map((h, i) => (
          <div key={i} className="sp-history-item">
            <div>
              <div className="sp-history-month">{h.month}</div>
              <div className="sp-history-details">{h.details}</div>
            </div>
            <div className="sp-history-right">
              <div className={`sp-history-amount ${h.status}`}>${h.amount}</div>
              <div className={`sp-history-status ${h.status}`}>
                {h.status === 'paid' ? '✓ Pagado' : '◷ Pendiente'}
              </div>
            </div>
          </div>
        ))}
      </div>
      {history.length > 3 && !showAll && (
        <button className="sp-show-more" onClick={() => setShowAll(true)}>Ver todo ({history.length} meses)</button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="sp-empty">
      <div className="sp-empty-icon">🔗</div>
      <div className="sp-empty-title">Aún no tienes referidos</div>
      <div className="sp-empty-desc">Comparte tu link con dueñas de salón y empieza a ganar comisiones recurrentes.</div>
      <a className="sp-empty-cta" href={`https://wa.me/?text=${encodeURIComponent('Prueba Skubik para tu salón — agenda online y cobro de señas: https://smartkubik.com/skubik')}`} target="_blank" rel="noreferrer">
        {WA_SVG} Compartir por WhatsApp
      </a>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════

export default function SkubikAffiliatePanel() {
  const data = MOCK_AFFILIATE;
  const hasReferrals = data.referrals.length > 0;

  useEffect(() => {
    const styleId = 'skubik-panel-styles';
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = PANEL_STYLES;
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
    <div className="skubik-page sp-panel">
      <PanelHeader affiliate={data} />
      <div className="sp-content">
        <EarningsSummaryCard earnings={data.earnings} />
        <ReferralLinkCard link={data.referralLink} code={data.code} />
        {hasReferrals ? (
          <>
            <ReferralsList referrals={data.referrals} />
            <CommissionHistory history={data.history} />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
      <div className="sp-footer">
        <a href="/skubik/afiliados">Programa de Afiliados</a> · <a href="/skubik">Skubik</a>
        <div style={{ marginTop: 8 }}>SmartKubik © 2026</div>
      </div>
    </div>
  );
}
