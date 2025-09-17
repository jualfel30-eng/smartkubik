// This is the payload object that the frontend is sending to the backend when creating an order.
// It is constructed in the `createOrder` function in `src/components/OrdersManagement-Fixed.jsx`.

interface FrontendOrderItem {
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
  status: string; // 'pending'
}

interface FrontendOrderPayload {
  orderNumber: string; // e.g., "ORD-12345" - Generated on the frontend
  customerId: string;
  customerName: string;
  items: FrontendOrderItem[];
  subtotal: number;
  ivaTotal: number;
  igtfTotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string; // 'pending'
  notes?: string;
  channel: string; // 'in_store'
  type: string; // 'retail'
  createdBy: string; // user._id
}
