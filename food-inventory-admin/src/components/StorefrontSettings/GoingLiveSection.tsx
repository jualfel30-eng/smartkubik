import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleIn, SPRING, DUR, EASE, tapScale } from '../../lib/motion';
import { triggerCelebration } from '../../hooks/use-celebration';
import Celebration, { useCelebration } from '../Celebration';
import { toast } from 'sonner';
import {
  Rocket, Copy, Check, MessageCircle, Share2, Globe, ExternalLink,
} from 'lucide-react';

interface GoingLiveSectionProps {
  isActive: boolean;
  domain?: string;
  onActivate: () => Promise<any>;
  onDeactivate: () => Promise<any>;
  saving: boolean;
}

export function GoingLiveSection({ isActive, domain, onActivate, onDeactivate, saving }: GoingLiveSectionProps) {
  const [activating, setActivating] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const { celebrating, stop } = useCelebration();

  const siteUrl = domain ? `${domain}.smartkubik.com` : '';
  const fullUrl = `https://${siteUrl}`;

  const handleToggle = async () => {
    if (isActive) {
      // Deactivate — simple
      await onDeactivate();
      setShowSharePanel(false);
      toast.success('Sitio desactivado');
      return;
    }

    // Activate — ceremony!
    setActivating(true);

    // Stage 1: Anticipation (500ms pause)
    await new Promise((r) => setTimeout(r, 500));

    // Stage 2: Save
    const result = await onActivate();
    setActivating(false);

    if (result?.success !== false) {
      // Stage 3: Celebration!
      triggerCelebration();
      setShowSharePanel(true);
      toast.success('Tu sitio web esta en vivo!');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success('Enlace copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`Ya puedes reservar tu cita conmigo! ${fullUrl}`)}`;

  return (
    <div className="space-y-5 relative">
      {/* Celebration overlay */}
      <Celebration active={celebrating} onComplete={stop} />

      {/* Current status */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div>
          <p className="text-sm font-medium text-gray-200">Estado de tu sitio</p>
          {domain && (
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{siteUrl}</p>
          )}
        </div>

        {/* Toggle */}
        <motion.button
          whileTap={tapScale}
          onClick={handleToggle}
          disabled={saving || activating}
          className={`
            relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50
            ${isActive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {activating ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Publicando...
            </span>
          ) : isActive ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              En vivo
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Publicar sitio
            </span>
          )}
        </motion.button>
      </div>

      {/* Live badge + URL (when active) */}
      <AnimatePresence>
        {isActive && domain && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15"
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">Tu sitio esta en vivo</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-gray-300 font-mono bg-white/[0.04] px-3 py-1.5 rounded-lg truncate">
                {fullUrl}
              </code>
              <motion.button
                whileTap={tapScale}
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-xs text-gray-300 hover:bg-white/[0.1] transition-colors flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado' : 'Copiar'}
              </motion.button>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-xs text-gray-300 hover:bg-white/[0.1] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share panel (appears after going live) */}
      <AnimatePresence>
        {showSharePanel && (
          <motion.div
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-5 rounded-xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-white/[0.08]"
          >
            <h3 className="text-sm font-semibold text-gray-100 mb-1">Comparte tu nuevo sitio</h3>
            <p className="text-xs text-gray-400 mb-4">
              Cualquier persona con este enlace puede ver tus servicios
            </p>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-600/20 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Compartir por WhatsApp
              </a>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-300 text-xs font-medium hover:bg-white/[0.08] transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copiar enlace
              </button>
            </div>

            <button
              onClick={() => setShowSharePanel(false)}
              className="mt-3 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deactivated hint */}
      {!isActive && (
        <p className="text-xs text-gray-500 text-center">
          Tu sitio no es visible al publico hasta que lo publiques
        </p>
      )}
    </div>
  );
}
