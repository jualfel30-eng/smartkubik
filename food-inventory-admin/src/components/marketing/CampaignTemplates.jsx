import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  UserX,
  Diamond,
  Sparkles,
  Gift,
  RefreshCcw,
  Target,
  Zap
} from 'lucide-react';

/**
 * CampaignTemplates - Predefined campaign use cases for Product Affinity Marketing
 *
 * Provides quick-start templates for common marketing scenarios:
 * - Win-back campaigns
 * - Cross-sell campaigns
 * - VIP product nurture
 * - Product launch
 * - Loyalty rewards
 */

const TEMPLATES = [
  {
    id: 'winback',
    name: 'Win-back Campaign',
    icon: RefreshCcw,
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    badgeColor: 'bg-orange-500 text-white',
    description: 'Recupera clientes que solían comprar un producto específico',
    example: 'Clientes que compraron Hamburguesa Premium hace 60+ días',
    channel: 'email',
    benefits: ['Reactiva clientes inactivos', 'Aumenta frecuencia de compra', 'ROI alto'],
    template: {
      name: 'Win-back: [Nombre del Producto]',
      description: 'Campaña para recuperar clientes que compraron este producto pero no lo han vuelto a comprar recientemente',
      channel: 'email',
      subject: '¡Te extrañamos! 🎁 Vuelve y obtén 15% de descuento',
      message: 'Hola {nombre},\n\nNotamos que solías disfrutar de nuestro [Producto]. ¡Queremos verte de nuevo!\n\nComo agradecimiento, te ofrecemos un 15% de descuento en tu próxima compra de [Producto].\n\n¿Qué dices? ¿Nos damos una segunda oportunidad?\n\nSaludos,\nEl equipo',
      targetSegment: {
        // User will select product and configure days
        maxDaysSinceLastProductPurchase: 60,
        minPurchaseCount: 1,
      }
    }
  },
  {
    id: 'crosssell',
    name: 'Cross-sell Campaign',
    icon: UserX,
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    badgeColor: 'bg-purple-500 text-white',
    description: 'Ofrece productos complementarios a clientes existentes',
    example: 'Clientes que compraron café pero nunca probaron el postre especial',
    channel: 'whatsapp',
    benefits: ['Aumenta ticket promedio', 'Mejora experiencia del cliente', 'Descubre nuevas preferencias'],
    template: {
      name: 'Cross-sell: [Producto Nuevo]',
      description: 'Presenta productos complementarios a clientes que nunca los han probado',
      channel: 'whatsapp',
      message: '¡Hola {nombre}! 👋\n\nVimos que disfrutas de nuestro [Producto A]. ¿Sabías que [Producto B] combina perfectamente?\n\n🎁 Pruébalo hoy con 20% de descuento.\n\n¿Te animas?',
      targetSegment: {
        // User will select: productIds (what they bought) and excludeProductIds (what they haven't)
      }
    }
  },
  {
    id: 'vip-nurture',
    name: 'VIP Product Nurture',
    icon: Diamond,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    badgeColor: 'bg-blue-500 text-white',
    description: 'Recompensa a tus mejores clientes que aman ciertos productos',
    example: 'Top 20% de clientes que compraron Sushi Premium 5+ veces',
    channel: 'email',
    benefits: ['Fortalece lealtad VIP', 'Aumenta LTV', 'Genera embajadores de marca'],
    template: {
      name: 'VIP Nurture: [Producto]',
      description: 'Campaña exclusiva para clientes top que son fanáticos de un producto específico',
      channel: 'email',
      subject: '💎 Eres VIP: Acceso anticipado a [Producto Especial]',
      message: 'Estimado/a {nombre},\n\nComo uno de nuestros clientes más valiosos y fanático de [Producto], queremos ofrecerte algo especial.\n\n🌟 Acceso anticipado a nuestra nueva variación de [Producto]\n💎 10% de descuento permanente en [Producto]\n🎁 Delivery gratuito en tu próximo pedido\n\nGracias por ser parte de nuestra familia VIP.\n\nCon aprecio,\nEl equipo',
      targetSegment: {
        tiers: ['diamante', 'oro'],
        minPurchaseCount: 5,
      }
    }
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    icon: Sparkles,
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    badgeColor: 'bg-green-500 text-white',
    description: 'Anuncia nuevos productos a la audiencia correcta',
    example: 'Clientes que nunca probaron la nueva línea vegana',
    channel: 'email',
    benefits: ['Genera expectativa', 'Alcance dirigido', 'Maximiza adopción inicial'],
    template: {
      name: 'Lanzamiento: [Nuevo Producto]',
      description: 'Introduce un nuevo producto a clientes que aún no lo han probado',
      channel: 'email',
      subject: '🚀 ¡Nuevo! [Producto] - Sé de los primeros en probarlo',
      message: 'Hola {nombre},\n\n¡Tenemos noticias emocionantes!\n\nAcabamos de lanzar [Nuevo Producto], creado especialmente para clientes como tú que disfrutan de [Categoría].\n\n🎉 Oferta de lanzamiento: 25% de descuento en tu primer pedido\n⏰ Solo por tiempo limitado\n\n¿Listo/a para ser de los primeros en probarlo?\n\nSaludos,\nEl equipo',
      targetSegment: {
        // User will select excludeProductIds (new product) to target customers who haven't tried it
        tiers: ['diamante', 'oro', 'plata'],
      }
    }
  },
  {
    id: 'loyalty-reward',
    name: 'Loyalty Reward',
    icon: Gift,
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    badgeColor: 'bg-yellow-500 text-white',
    description: 'Premia a clientes frecuentes de productos específicos',
    example: 'Top 5% que compran regularmente productos premium',
    channel: 'sms',
    benefits: ['Aumenta retención', 'Genera sorpresa y deleite', 'Fortalece conexión emocional'],
    template: {
      name: 'Recompensa de Lealtad: [Producto]',
      description: 'Reconoce y recompensa a clientes que compran frecuentemente ciertos productos',
      channel: 'sms',
      message: '¡{nombre}, eres increíble! 🎉\n\nPor ser uno de nuestros clientes más fieles de [Producto], te regalamos:\n\n🎁 1 [Producto] GRATIS en tu próximo pedido\n\nCódigo: LOYAL2025\nVálido hasta: [fecha]\n\n¡Gracias por tu preferencia! 💙',
      targetSegment: {
        tiers: ['diamante'],
        minPurchaseCount: 10,
      }
    }
  },
  {
    id: 'reactivation',
    name: 'Customer Reactivation',
    icon: Zap,
    color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    badgeColor: 'bg-red-500 text-white',
    description: 'Reactiva clientes que no han comprado en mucho tiempo',
    example: 'Clientes que no compran hace 90+ días pero solían comprar frecuentemente',
    channel: 'email',
    benefits: ['Recupera clientes perdidos', 'Bajo costo de adquisición', 'Segunda oportunidad de engagement'],
    template: {
      name: 'Reactivación: ¡Te extrañamos!',
      description: 'Campaña para clientes inactivos que solían ser compradores frecuentes',
      channel: 'email',
      subject: '😢 Te extrañamos, {nombre}! Vuelve con 30% de descuento',
      message: 'Hola {nombre},\n\nHa pasado un tiempo desde tu última visita y te extrañamos mucho.\n\nComo gesto especial para darte la bienvenida de vuelta:\n\n🎁 30% de descuento en tu próximo pedido\n🚀 Delivery gratis\n⭐ Acceso a nuestros nuevos productos\n\nCódigo: WELCOME-BACK\n\n¿Qué tal si nos damos otra oportunidad?\n\nCon cariño,\nEl equipo',
      targetSegment: {
        maxDaysSinceLastVisit: 90,
        minVisitCount: 3,
        tiers: ['oro', 'plata'],
      }
    }
  },
];

export default function CampaignTemplates({ onSelectTemplate }) {
  const handleTemplateClick = (template) => {
    onSelectTemplate(template.template);
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold dark:text-gray-100 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Plantillas de Campaña
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Selecciona una plantilla predefinida para comenzar rápidamente
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleTemplateClick(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${template.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge className={template.badgeColor}>{template.channel.toUpperCase()}</Badge>
                </div>
                <CardTitle className="text-base dark:text-gray-100">{template.name}</CardTitle>
                <CardDescription className="dark:text-gray-400 text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  <span className="font-medium">Ejemplo:</span> {template.example}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Beneficios:</p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {template.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  size="sm"
                  className="w-full dark:bg-blue-600 dark:hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateClick(template);
                  }}
                >
                  Usar Plantilla
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>💡 Tip:</strong> Las plantillas son puntos de partida. Después de seleccionar una,
          personaliza el mensaje, los productos específicos y los filtros de audiencia según tus necesidades.
        </p>
      </div>
    </div>
  );
}
