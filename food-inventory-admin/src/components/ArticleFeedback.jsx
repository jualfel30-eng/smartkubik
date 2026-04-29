import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, MessageCircle, Bot, CheckCircle } from 'lucide-react';
import { SPRING, DUR, EASE } from '../lib/motion';
import { trackEvent } from '../lib/analytics';

/**
 * ArticleFeedback — "Was this helpful?" + escalation options.
 * Appears at the bottom of every docs article.
 * Never a dead end — always a next step.
 */
export default function ArticleFeedback({ articleSlug, category }) {
  const [feedback, setFeedback] = useState(null); // 'yes' | 'no' | null
  const [showThankYou, setShowThankYou] = useState(false);

  const handleYes = () => {
    setFeedback('yes');
    setShowThankYou(true);
    trackEvent('docs_article_feedback', { slug: articleSlug, category, helpful: true });
    setTimeout(() => setShowThankYou(false), 3000);
  };

  const handleNo = () => {
    setFeedback('no');
    trackEvent('docs_article_feedback', { slug: articleSlug, category, helpful: false });
  };

  const handleEscalation = (method) => {
    trackEvent('docs_escalation', { method, fromArticle: articleSlug, category });
  };

  // WhatsApp support link — opens a pre-filled message
  const whatsappUrl = `https://wa.me/584121234567?text=${encodeURIComponent(
    `Hola, necesito ayuda con: ${articleSlug.replace(/-/g, ' ')}`
  )}`;

  return (
    <div className="border-t border-border mt-12 pt-8">
      <AnimatePresence mode="wait">
        {!feedback && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="text-center"
          >
            <p className="text-lg font-semibold text-foreground mb-4">
              ¿Te ayudó este artículo?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleYes}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-card text-foreground hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:border-emerald-700 dark:hover:text-emerald-400 transition-colors text-sm font-medium min-h-[48px]"
              >
                <ThumbsUp className="w-4 h-4" />
                Sí, me ayudó
              </button>
              <button
                onClick={handleNo}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-card text-foreground hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-950 dark:hover:border-red-700 dark:hover:text-red-400 transition-colors text-sm font-medium min-h-[48px]"
              >
                <ThumbsDown className="w-4 h-4" />
                No, necesito más ayuda
              </button>
            </div>
          </motion.div>
        )}

        {feedback === 'yes' && (
          <motion.div
            key="thanks"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SPRING.soft}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              ¡Gracias por tu feedback!
            </div>
          </motion.div>
        )}

        {feedback === 'no' && (
          <motion.div
            key="escalation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={SPRING.soft}
            className="text-center"
          >
            <p className="text-sm text-muted-foreground mb-4">
              Lamentamos que no haya sido suficiente. ¿Cómo prefieres obtener ayuda?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleEscalation('whatsapp')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium min-h-[48px] w-full sm:w-auto justify-center"
              >
                <MessageCircle className="w-4 h-4" />
                Hablar por WhatsApp
              </a>
              <a
                href="/app"
                onClick={() => handleEscalation('ai_assistant')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors text-sm font-medium min-h-[48px] w-full sm:w-auto justify-center"
              >
                <Bot className="w-4 h-4" />
                Preguntar al Asistente IA
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              WhatsApp: respuesta típica &lt; 5 minutos
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
