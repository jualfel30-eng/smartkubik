import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Confirmar pago',
  description: 'Sube tu comprobante de pago de forma segura.',
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Self-contained layout for the payment portal — bypasses the storefront's
 * `[domain]` wrapper because the portal is identified by signed token, not
 * by tenant subdomain. Lives at top-level `/pago/[token]` and is exempted
 * from the rewrite middleware.
 */
export default function PaymentPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 antialiased">
      {children}
    </div>
  );
}
