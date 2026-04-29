import { HelpCircle } from 'lucide-react';
import { moduleHelpMap } from '../docs/index';

/**
 * HelpButton — Contextual help link for in-app modules.
 * Renders a subtle "?" icon that links to the relevant docs article.
 * The HIGHEST-IMPACT change: connects help to the context where the problem occurs.
 *
 * Usage:
 *   <HelpButton module="inventory" />
 *   <HelpButton articlePath="inventario/control-de-stock" label="Ayuda con stock" />
 */
export default function HelpButton({ module, articlePath, label, className = '' }) {
  const path = articlePath || moduleHelpMap[module];
  if (!path) return null;

  const href = `/docs/${path}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors ${className}`}
      title={label || '¿Necesitas ayuda?'}
    >
      <HelpCircle className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label || '¿Necesitas ayuda?'}</span>
    </a>
  );
}
