import { useNavigate } from 'react-router-dom';
import {
  Store, Clock, DollarSign, Scissors, Package, Bell, MessageCircle,
  Link as LinkIcon, Users, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { listItem, STAGGER } from '@/lib/motion';
import haptics from '@/lib/haptics';

const SECTIONS = [
  {
    title: 'General',
    items: [
      { id: 'business', label: 'Datos del negocio', icon: Store, to: '/settings?section=business' },
      { id: 'hours', label: 'Horarios de atencion', icon: Clock, to: '/settings?section=hours' },
      { id: 'payments', label: 'Monedas y metodos de pago', icon: DollarSign, to: '/settings?section=payments' },
    ],
  },
  {
    title: 'Servicios',
    items: [
      { id: 'services', label: 'Servicios y precios', icon: Scissors, to: '/services' },
      { id: 'packages', label: 'Paquetes de servicios', icon: Package, to: '/service-packages' },
    ],
  },
  {
    title: 'Notificaciones',
    items: [
      { id: 'push', label: 'Push y recordatorios', icon: Bell, to: '/settings?section=notifications' },
      { id: 'whatsapp', label: 'WhatsApp automatico', icon: MessageCircle, to: '/settings?section=whatsapp' },
    ],
  },
  {
    title: 'Avanzado',
    items: [
      { id: 'integrations', label: 'Integraciones', icon: LinkIcon, to: '/settings?section=integrations' },
      { id: 'users', label: 'Usuarios y permisos', icon: Users, to: '/settings?section=users' },
    ],
  },
];

export default function MobileSettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold">Configuracion</h1>
      </div>

      {/* Sections */}
      <motion.div
        className="flex-1 overflow-y-auto mobile-scroll px-4 py-4 space-y-6 pb-24"
        initial="initial"
        animate="animate"
        variants={STAGGER(0.06, 0.05)}
      >
        {SECTIONS.map((section) => (
          <motion.section key={section.title} variants={listItem}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>
            <div className="bg-card rounded-[var(--mobile-radius-lg)] border border-border overflow-hidden divide-y divide-border">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { haptics.tap(); navigate(item.to); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left no-tap-highlight
                               active:bg-muted transition-colors"
                  >
                    <Icon size={18} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </motion.section>
        ))}
      </motion.div>
    </div>
  );
}
