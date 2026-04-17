import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store, Clock, DollarSign, Scissors, Package, Bell, MessageCircle,
  Link as LinkIcon, Users, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { listItem, STAGGER, DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import MobileSettingsSkeleton from './MobileSettingsSkeleton';

const MobileSettingsBusiness = lazy(() => import('./MobileSettingsBusiness.jsx'));
const MobileSettingsHours = lazy(() => import('./MobileSettingsHours.jsx'));
const MobileSettingsPayments = lazy(() => import('./MobileSettingsPayments.jsx'));
const MobileSettingsNotifications = lazy(() => import('./MobileSettingsNotifications.jsx'));
const MobileSettingsWhatsApp = lazy(() => import('./MobileSettingsWhatsApp.jsx'));
const MobileSettingsUsers = lazy(() => import('./MobileSettingsUsers.jsx'));

const SECTION_COMPONENTS = {
  business: MobileSettingsBusiness,
  hours: MobileSettingsHours,
  payments: MobileSettingsPayments,
  notifications: MobileSettingsNotifications,
  whatsapp: MobileSettingsWhatsApp,
  users: MobileSettingsUsers,
};

const SECTIONS = [
  {
    title: 'General',
    items: [
      { id: 'business', label: 'Datos del negocio', icon: Store },
      { id: 'hours', label: 'Horarios de atencion', icon: Clock },
      { id: 'payments', label: 'Monedas y metodos de pago', icon: DollarSign },
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
      { id: 'notifications', label: 'Push y recordatorios', icon: Bell },
      { id: 'whatsapp', label: 'WhatsApp automatico', icon: MessageCircle },
    ],
  },
  {
    title: 'Avanzado',
    items: [
      { id: 'integrations', label: 'Integraciones', icon: LinkIcon, to: '/settings?section=integrations' },
      { id: 'users', label: 'Usuarios y permisos', icon: Users },
    ],
  },
];

const slideIn = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0, transition: { duration: DUR.base, ease: EASE.out } },
  exit: { opacity: 0, x: -30, transition: { duration: DUR.fast, ease: EASE.out } },
};

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState(null);

  const handleItemTap = (item) => {
    haptics.tap();
    if (item.to) {
      navigate(item.to);
    } else if (SECTION_COMPONENTS[item.id]) {
      setSelectedSection(item.id);
    }
  };

  // Render sub-page when a section is selected
  if (selectedSection && SECTION_COMPONENTS[selectedSection]) {
    const Component = SECTION_COMPONENTS[selectedSection];
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedSection}
          variants={slideIn}
          initial="initial"
          animate="animate"
          exit="exit"
          className="h-full"
        >
          <Suspense fallback={
            <div className="flex flex-col h-full bg-background">
              <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
                <div className="h-6 w-40 bg-muted animate-pulse rounded" />
              </div>
              <MobileSettingsSkeleton />
            </div>
          }>
            <Component onBack={() => setSelectedSection(null)} />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Render hub
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold">Configuracion</h1>
      </div>

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
                    onClick={() => handleItemTap(item)}
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
