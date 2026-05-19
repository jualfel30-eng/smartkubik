import { ShieldCheck } from 'lucide-react';

interface PortalHeaderProps {
  tenantName?: string;
  logoUrl?: string;
}

/**
 * Top bar: tenant identity (logo or name) on the left, "Pago seguro" badge
 * on the right. Both are static — server component.
 *
 * Logo is rendered with next/image when it's a remote URL, falling back to
 * the tenant name when missing. The badge serves as a trust signal that
 * also doubles as visual feedback that this is a real portal (not a
 * phishing page hosted on the storefront domain).
 */
export default function PortalHeader({
  tenantName,
  logoUrl,
}: PortalHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {logoUrl ? (
          // Unoptimized — we don't control which remote origins host tenant
          // logos, and per-tenant next.config remotePatterns would balloon.
          // The logo is small + already optimized server-side by the admin.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={tenantName || ''}
            className="h-9 w-auto max-w-[120px] rounded object-contain"
          />
        ) : (
          <span className="truncate text-sm font-medium uppercase tracking-wide text-slate-300">
            {tenantName || 'SmartKubik'}
          </span>
        )}
      </div>

      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/[0.07] px-2.5 py-1 text-xs font-medium text-emerald-300">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Pago seguro
      </span>
    </header>
  );
}
