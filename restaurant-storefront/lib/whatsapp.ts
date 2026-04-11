import { CartItemType, RestaurantConfig } from '@/types';

interface OrderData {
  orderRef: string;
  customerName: string;
  items: CartItemType[];
  total: number;
}

export function formatWhatsAppMessage(order: OrderData, config: RestaurantConfig): string {
  const { orderRef, customerName, items, total } = order;
  const restaurantName = config.restaurantName || 'Restaurante';
  const currency = config.currency || 'USD';
  const paymentInstructions = config.paymentInstructions || 'Coordina en este chat';

  const header = `🍕 NUEVO PEDIDO — ${restaurantName}
📋 Ref: ${orderRef}
TU PEDIDO:
`;

  const itemsList = items.map(item => {
    let text = `${item.quantity}x ${item.name} ($${item.final_price.toFixed(2)})\n`;

    const removals = item.customizations.filter(c => c.action === 'remove');
    const additions = item.customizations.filter(c => c.action === 'add');

    if (removals.length === 0 && additions.length === 0) {
      text += `✅ Base completa\n`;
    } else {
      if (removals.length > 0) {
        text += `❌ Sin: ${removals.map(r => r.name).join(', ')}\n`;
      }
      if (additions.length > 0) {
        additions.forEach(add => {
          const priceStr = add.price_delta > 0 ? ` (+$${add.price_delta.toFixed(2)})` : '';
          const qtyStr = add.quantity > 1 ? `${add.quantity}x ` : '';
          text += `➕ Extra: ${qtyStr}${add.name}${priceStr}\n`;
        });
      }
    }
    return text;
  }).join('\n');

  const footer = `━━━━━━━━━━━━━━━━
💰 TOTAL: $${total.toFixed(2)} ${currency}

DATOS DE PAGO:
${paymentInstructions}

📞 Envía tu comprobante a este mismo número.
Gracias, ${customerName}! 🙌`;

  return `${header}${itemsList}${footer}`;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}
