/**
 * Pre-filled beauty service suggestions for onboarding screen 5.
 * Top 3 are pre-selected by default.
 * `icon` references a Lucide icon name.
 */

export const BEAUTY_SERVICES = [
  {
    id: 'corte_clasico',
    icon: 'Scissors',
    name: 'Corte Clásico',
    category: 'Cortes',
    price: 10,
    duration: 30,
    preSelected: true,
  },
  {
    id: 'barba_completa',
    icon: 'Scissors',
    name: 'Barba Completa',
    category: 'Barba',
    price: 8,
    duration: 20,
    preSelected: true,
  },
  {
    id: 'corte_barba',
    icon: 'Scissors',
    name: 'Corte + Barba',
    category: 'Cortes',
    price: 15,
    duration: 45,
    preSelected: true,
  },
  {
    id: 'tinte',
    icon: 'Palette',
    name: 'Tinte de Cabello',
    category: 'Colorimetría',
    price: 25,
    duration: 60,
    preSelected: false,
  },
  {
    id: 'masaje_capilar',
    icon: 'Hand',
    name: 'Masaje Capilar',
    category: 'Tratamientos',
    price: 12,
    duration: 15,
    preSelected: false,
  },
  {
    id: 'cejas',
    icon: 'Sparkles',
    name: 'Cejas',
    category: 'Depilación',
    price: 5,
    duration: 10,
    preSelected: false,
  },
];

export const PROFESSIONAL_COLORS = [
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#F97316', // orange
];
