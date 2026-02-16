export interface PaymentMethodField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'phone';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface PaymentMethodDefinition {
  id: string;
  name: string;
  currency: string;
  category: 'cash' | 'transfer' | 'mobile' | 'card' | 'gateway' | 'mixed';
  igtfApplicable: boolean;
  fields: PaymentMethodField[];
}

export interface PaymentGateway {
  id: string;
  name: string;
  type: 'stripe' | 'paypal' | 'mercadopago' | 'binance';
}

export interface PaymentEngine {
  getAvailableMethods(): PaymentMethodDefinition[];
  triggersAdditionalTax(methodId: string): boolean;
  getMethodFields(methodId: string): PaymentMethodField[];
  supportsGlobalGateways(): boolean;
  getGlobalGateways(): PaymentGateway[];
}
