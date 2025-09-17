// This is the Data Transfer Object (DTO) that the backend expects for creating an order.
// It is defined in `src/dto/order.dto.ts`.

export class CreateOrderItemDto {
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  costPrice: number;
  unitPrice: number;
  totalPrice: number;
  ivaAmount: number;
  igtfAmount: number;
  finalPrice: number;
  status: string;
}

export class CreateOrderDto {
  customerId: string;
  customerName: string;
  items: CreateOrderItemDto[];
  subtotal: number;
  ivaTotal: number;
  igtfTotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  channel?: string; // 'online' | 'phone' | 'whatsapp' | 'in_store'
  type?: string; // 'retail' | 'wholesale' | 'b2b'
  notes?: string;
  autoReserve?: boolean;
}
