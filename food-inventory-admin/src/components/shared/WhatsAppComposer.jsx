import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Save, X, FileText, MessageCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { SPRING } from '@/lib/motion';

// ─── Template storage ───────────────────────────────────────────────

const WA_TEMPLATES_KEY = 'sk:wa-templates';

function loadWaTemplates() {
  try {
    return JSON.parse(localStorage.getItem(WA_TEMPLATES_KEY) || '[]');
  } catch { return []; }
}

function saveWaTemplate(template) {
  const templates = loadWaTemplates();
  templates.unshift({ text: template, createdAt: Date.now() });
  localStorage.setItem(WA_TEMPLATES_KEY, JSON.stringify(templates.slice(0, 10)));
}

// ─── Send via Whapi API (fallback to wa.me) ─────────────────────────

async function sendWhatsAppMessage(phone, message, customerId) {
  const cleanPhone = phone?.replace(/\D/g, '');
  if (!cleanPhone) return { success: false, error: 'No phone' };

  try {
    const res = await fetchApi('/whatsapp/send/text', {
      method: 'POST',
      body: JSON.stringify({
        to: cleanPhone,
        message,
        customerId: customerId || undefined,
      }),
    });
    return { success: true, deliveryId: res?.data?.deliveryId };
  } catch (err) {
    console.warn('Whapi API failed, falling back to wa.me:', err.message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    return { success: false, fallback: true };
  }
}

// ─── Default templates ──────────────────────────────────────────────

function buildDefaultTemplates(contact, context) {
  const name = contact.name || 'Cliente';

  // Appointment context — include service/date/time
  if (context?.serviceName && context?.startTime) {
    const service = context.serviceName;
    const time = new Date(context.startTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(context.startTime).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return [
      { label: 'Confirmación', text: `Hola ${name}, te confirmamos tu cita de ${service} para el ${date} a las ${time}. ¡Te esperamos!` },
      { label: 'Recordatorio', text: `Hola ${name}, te recordamos que tienes cita de ${service} hoy a las ${time}. ¡Te esperamos!` },
      { label: 'Reagendamiento', text: `Hola ${name}, necesitamos reagendar tu cita de ${service}. ¿Qué horario te funciona?` },
    ];
  }

  // Generic CRM context — general messages
  return [
    { label: 'Saludo', text: `Hola ${name}, ¿cómo estás? Te escribimos desde nuestro negocio. ¿En qué podemos ayudarte?` },
    { label: 'Seguimiento', text: `Hola ${name}, hace tiempo que no nos visitas. ¡Te esperamos pronto! ¿Quieres agendar una cita?` },
    { label: 'Promoción', text: `Hola ${name}, tenemos una promoción especial para ti. ¡Escríbenos para más detalles!` },
  ];
}

// ─── WhatsAppComposer ───────────────────────────────────────────────

/**
 * Reusable WhatsApp messaging UI.
 * Shows template selection, custom message input, and sends via Whapi API.
 *
 * @param {object} contact - { name, phone, _id } — the recipient
 * @param {object} [context] - Optional appointment context { serviceName, startTime } for richer templates
 * @param {function} [onClose] - Called when composer should close
 */
export default function WhatsAppComposer({ contact, context, onClose }) {
  const [mode, setMode] = useState('select'); // 'select' | 'custom' | 'sent'
  const [customText, setCustomText] = useState('');
  const [sending, setSending] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const defaultTemplates = useMemo(() => buildDefaultTemplates(contact, context), [contact, context]);

  useEffect(() => {
    setSavedTemplates(loadWaTemplates());
  }, []);

  const phone = contact.phone;
  const cleanPhone = phone?.replace(/\D/g, '');

  const handleSend = async (text) => {
    if (!text.trim() || sending) return;
    setSending(true);
    const result = await sendWhatsAppMessage(phone, text, contact._id);
    setSending(false);

    if (result.success) {
      toast.success('Mensaje enviado por WhatsApp', {
        description: contact.name,
        action: cleanPhone ? {
          label: 'Ver conversación',
          onClick: () => window.open(`https://wa.me/${cleanPhone}`, '_blank'),
        } : undefined,
        duration: 6000,
      });
      setMode('sent');
    } else if (result.fallback) {
      toast.info('Mensaje abierto en WhatsApp Web', {
        description: 'La API no respondió. Se abrió WhatsApp Web como alternativa.',
      });
      onClose?.();
    } else {
      toast.error('No se pudo enviar el mensaje');
    }
  };

  const handleSaveTemplate = () => {
    if (!customText.trim()) return;
    saveWaTemplate(customText.trim());
    setSavedTemplates(loadWaTemplates());
    toast.success('Plantilla guardada');
  };

  // No phone
  if (!phone) {
    return (
      <div className="p-3 space-y-2">
        <p className="text-xs text-muted-foreground text-center">
          {contact.name || 'Este contacto'} no tiene teléfono registrado.
        </p>
        <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    );
  }

  // Post-send
  if (mode === 'sent') {
    return (
      <div className="p-3 space-y-3 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING.bouncy}>
          <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto" />
        </motion.div>
        <p className="text-xs font-medium">Mensaje enviado a {contact.name}</p>
        <div className="space-y-1.5">
          <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5 text-emerald-500 border-emerald-500/30"
            onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}>
            <MessageCircle className="h-3.5 w-3.5" /> Ver conversación
          </Button>
          <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  // Custom mode
  if (mode === 'custom') {
    return (
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium">Mensaje personalizado</p>
        <Textarea
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder={`Escribe tu mensaje para ${contact.name}...`}
          className="text-xs min-h-[80px] resize-none"
          autoFocus
        />
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => handleSend(customText)}
            disabled={!customText.trim() || sending}>
            <Send className="h-3 w-3" /> {sending ? 'Enviando...' : 'Enviar'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleSaveTemplate}
            disabled={!customText.trim()} title="Guardar como plantilla">
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setMode('select')}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Template selection
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Enviar WhatsApp</p>
        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-primary"
          onClick={() => { setMode('custom'); setCustomText(''); }}>
          <FileText className="h-2.5 w-2.5 mr-0.5" /> Personalizado
        </Button>
      </div>

      <div className="space-y-1">
        {defaultTemplates.map((t, i) => (
          <button key={i} type="button" onClick={() => handleSend(t.text)} disabled={sending}
            className="w-full text-left px-2.5 py-2 rounded-md border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-colors text-xs disabled:opacity-50">
            <span className="font-medium text-foreground">{t.label}</span>
            <p className="text-muted-foreground line-clamp-1 mt-0.5">{t.text}</p>
          </button>
        ))}
      </div>

      {savedTemplates.length > 0 && (
        <>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider pt-1">Guardadas</p>
          <div className="space-y-1">
            {savedTemplates.slice(0, 3).map((t, i) => (
              <button key={i} type="button" onClick={() => handleSend(t.text)} disabled={sending}
                className="w-full text-left px-2.5 py-1.5 rounded-md border border-border/20 hover:border-primary/40 hover:bg-primary/5 transition-colors text-xs text-muted-foreground line-clamp-2 disabled:opacity-50">
                {t.text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
