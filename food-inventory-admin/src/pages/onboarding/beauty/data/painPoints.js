/**
 * Pain point definitions for beauty onboarding.
 * Each entry drives screen 1 (selection) and screen 2 (personalized outcome).
 * `icon` references a Lucide icon name — imported in the step component.
 */

export const PAIN_POINTS = [
  {
    key: 'whatsapp_citas',
    icon: 'MessageCircle',
    label: 'Citas por WhatsApp a las 11pm',
    outcome: 'Capturar citas 24/7 sin contestar WhatsApp a las 11pm',
    roiAmount: 250,
  },
  {
    key: 'no_shows',
    icon: 'UserX',
    label: 'Clientes que no llegan (no-show)',
    outcome: 'Eliminar no-shows con recordatorios automáticos',
    roiAmount: 500,
  },
  {
    key: 'comisiones',
    icon: 'Calculator',
    label: 'Calcular comisiones a mano',
    outcome: 'Calcular comisiones en 0 segundos — no más calculadora',
    roiAmount: 150,
  },
  {
    key: 'ingresos',
    icon: 'TrendingDown',
    label: 'No sé cuánto gané realmente hoy',
    outcome: 'Ver tus ingresos en tiempo real, por profesional y servicio',
    roiAmount: 200,
  },
  {
    key: 'clientes_desaparecen',
    icon: 'UserMinus',
    label: 'Clientes que desaparecen',
    outcome: 'Detectar clientes inactivos y traerlos de vuelta',
    roiAmount: 100,
  },
  {
    key: 'producto_desaparece',
    icon: 'PackageX',
    label: 'Producto que desaparece',
    outcome: 'Control de inventario en tiempo real — nada se pierde',
    roiAmount: 80,
  },
];
