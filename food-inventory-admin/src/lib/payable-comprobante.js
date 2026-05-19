const PAYMENT_METHOD_LABELS = {
  transferencia_usd: 'Transferencia USD',
  transferencia_ves: 'Transferencia VES',
  efectivo_usd: 'Efectivo USD',
  efectivo_ves: 'Efectivo VES',
  zelle: 'Zelle',
  pago_movil: 'Pago Móvil',
  pos: 'POS',
  tarjeta: 'Tarjeta de Crédito/Débito',
};

const TYPE_LABELS = {
  purchase_order: 'Orden de Compra',
  service_payment: 'Pago de Servicio',
  utility_bill: 'Servicio Básico',
  payroll: 'Nómina',
  other: 'Otro',
};

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getTotalAmount(lines) {
  return (lines || []).reduce((s, l) => s + Number(l.amount || 0), 0);
}

export function generateComprobanteHTML(payable, payments = []) {
  const total = getTotalAmount(payable.lines);
  const paidAmount = payable.paidAmount || 0;
  const balance = total - paidAmount;
  const isPaid = payable.status === 'paid';

  const linesRows = (payable.lines || []).map(l => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${l.description || 'Sin descripción'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${fmt(l.amount)}</td>
    </tr>
  `).join('');

  const paymentRows = payments.length
    ? payments.map(p => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${fmtDate(p.date)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${PAYMENT_METHOD_LABELS[p.method] || p.method || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${p.reference || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#059669;">${fmt(p.amount)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="4" style="padding:10px 8px;text-align:center;color:#9ca3af;">Sin registros de pago individuales</td></tr>`;

  const selloColor = isPaid ? '#059669' : '#d97706';
  const selloText = isPaid ? 'PAGADO' : 'PARCIAL';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Comprobante — ${payable.payableNumber || 'Factura'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1f2937; background: #fff; }
  .page { max-width: 700px; margin: 0 auto; padding: 40px 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
  .brand { font-size: 22px; font-weight: 800; color: #1f2937; letter-spacing: -0.5px; }
  .brand span { color: #f97316; }
  .doc-meta { text-align: right; }
  .doc-meta .number { font-size: 15px; font-weight: 700; }
  .doc-meta .date { font-size: 11px; color: #6b7280; margin-top: 3px; }
  .sello { display: inline-block; border: 2.5px solid ${selloColor}; color: ${selloColor}; font-size: 18px; font-weight: 900; letter-spacing: 4px; padding: 4px 14px; border-radius: 4px; margin-top: 6px; transform: rotate(-3deg); }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
  .party-block { background: #f9fafb; border-radius: 8px; padding: 14px 16px; }
  .party-block .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 6px; }
  .party-block .name { font-size: 15px; font-weight: 700; }
  .party-block .sub { font-size: 12px; color: #4b5563; margin-top: 2px; }
  section { margin-bottom: 24px; }
  section h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #f3f4f6; }
  thead th { padding: 8px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
  thead th:last-child { text-align: right; }
  .totals { background: #f9fafb; border-radius: 8px; padding: 14px 16px; }
  .totals .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
  .totals .row.total { font-size: 15px; font-weight: 800; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 6px; }
  .totals .row.paid { color: #059669; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">Smart<span>Kubik</span></div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Comprobante de Pago</div>
    </div>
    <div class="doc-meta">
      <div class="number">${payable.payableNumber || 'N/A'}</div>
      <div class="date">Emitida: ${fmtDate(payable.issueDate)}</div>
      ${payable.dueDate ? `<div class="date">Vence: ${fmtDate(payable.dueDate)}</div>` : ''}
      <div class="sello">${selloText}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-block">
      <div class="label">Beneficiario / Proveedor</div>
      <div class="name">${payable.payeeName || '—'}</div>
      <div class="sub">${TYPE_LABELS[payable.type] || payable.type || '—'}</div>
    </div>
    <div class="party-block">
      <div class="label">Resumen</div>
      <div class="sub" style="margin-top:4px;">Total: <strong>${fmt(total)}</strong></div>
      <div class="sub">Pagado: <strong style="color:#059669">${fmt(paidAmount)}</strong></div>
      ${balance > 0.01 ? `<div class="sub">Saldo: <strong style="color:#d97706">${fmt(balance)}</strong></div>` : ''}
    </div>
  </div>

  <section>
    <h2>Líneas del Gasto</h2>
    <table>
      <thead><tr><th>Descripción</th><th style="text-align:right">Monto</th></tr></thead>
      <tbody>${linesRows}</tbody>
      <tfoot>
        <tr>
          <td style="padding:8px;font-weight:700;text-align:right;">Total</td>
          <td style="padding:8px;font-weight:800;text-align:right;">${fmt(total)}</td>
        </tr>
      </tfoot>
    </table>
  </section>

  <section>
    <h2>Pagos Realizados</h2>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Método</th>
          <th>Referencia</th>
          <th style="text-align:right">Monto</th>
        </tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>
  </section>

  <div class="totals">
    <div class="row"><span>Total factura</span><span>${fmt(total)}</span></div>
    <div class="row paid"><span>Total pagado</span><span>${fmt(paidAmount)}</span></div>
    ${balance > 0.01 ? `<div class="row total"><span>Saldo pendiente</span><span style="color:#d97706">${fmt(balance)}</span></div>` : `<div class="row total"><span>Estado</span><span style="color:#059669">✓ PAGADO COMPLETAMENTE</span></div>`}
  </div>

  ${payable.notes ? `<section style="margin-top:20px;"><h2>Notas</h2><p style="font-size:13px;color:#4b5563;font-style:italic;">${payable.notes}</p></section>` : ''}

  <div class="footer">
    Generado por SmartKubik · ${new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}
  </div>
</div>
</body>
</html>`;
}
