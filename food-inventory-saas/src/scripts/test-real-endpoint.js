/**
 * Script para probar el endpoint real de suppliers
 * Simula exactamente lo que hace el frontend
 */

const https = require('https');

// Proveedor de Tiendas Broas
const customerId = '68efecbe4a214ead0bc41cea'; // Aceite AL REEF
const tenantId = '68d55e4b764d359fed186e47';

// Token de autenticación (necesitarás obtenerlo de broas.admon@gmail.com)
// Por ahora, déjame mostrar cómo sería la request

console.log('\n🔍 Testing real endpoint...\n');
console.log('URL:', `https://api.smartkubik.com/api/v1/suppliers/${customerId}`);
console.log('Method: GET');
console.log('Headers:');
console.log('  Authorization: Bearer <token>');
console.log('  Content-Type: application/json');
console.log('\n');

console.log('Expected response:');
console.log(JSON.stringify({
  _id: customerId,
  isVirtual: true,
  customerId: customerId,
  name: "Aceite AL REEF",
  supplierNumber: "CRM-CLI-000007",
  paymentSettings: {
    acceptedPaymentMethods: ["efectivo"],
    acceptsCredit: false,
    defaultCreditDays: 0,
    requiresAdvancePayment: false,
    advancePaymentPercentage: 0
  }
}, null, 2));

console.log('\n⚠️  Si paymentSettings está vacío o undefined, el problema está en el backend.');
console.log('⚠️  Si paymentSettings tiene datos pero no se cargan en el frontend, el problema está en ComprasManagement.jsx\n');
