/**
 * Testimonials data — centralized so it can be reused across
 * FoundersPage, Landing, Storefront, etc.
 */

const testimonials = [
  {
    id: 1,
    name: 'María González',
    role: 'Dueña',
    business: 'Panadería La Espiga',
    vertical: 'restaurant',
    avatar: null, // placeholder — will use initials
    quote:
      'Antes perdía 3 horas al día revisando inventario en cuadernos. Ahora todo está en el sistema y sé exactamente qué producir cada mañana.',
    metric: '3h/día ahorradas',
  },
  {
    id: 2,
    name: 'Carlos Mendoza',
    role: 'Gerente General',
    business: 'MiniMarket Express',
    vertical: 'retail',
    avatar: null,
    quote:
      'La merma bajó un 40% en el primer mes. El análisis predictivo nos dice qué pedir antes de quedarnos sin stock.',
    metric: '40% menos merma',
  },
  {
    id: 3,
    name: 'Ana Rodríguez',
    role: 'Administradora',
    business: 'Restaurante Sabor Criollo',
    vertical: 'restaurant',
    avatar: null,
    quote:
      'Mis meseros toman pedidos desde el celular y la comanda llega directo a cocina. Cero errores, clientes felices.',
    metric: '0 errores en comandas',
  },
  {
    id: 4,
    name: 'Roberto Díaz',
    role: 'Fundador',
    business: 'FreshBox Delivery',
    vertical: 'retail',
    avatar: null,
    quote:
      'Integrar WhatsApp con el inventario fue un game-changer. Los clientes piden por WhatsApp y el sistema actualiza todo automáticamente.',
    metric: '+60% pedidos online',
  },
  {
    id: 5,
    name: 'Luisa Herrera',
    role: 'Propietaria',
    business: 'Café Aromático',
    vertical: 'restaurant',
    avatar: null,
    quote:
      'Como cliente fundadora, pago menos de la mitad y tengo acceso directo al equipo. Cualquier duda me la resuelven en minutos.',
    metric: '51% ahorro vitalicio',
  },
];

export default testimonials;
