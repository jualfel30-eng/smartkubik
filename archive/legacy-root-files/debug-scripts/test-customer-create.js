// Test crear customer tipo employee
const fetch = require('node-fetch');

async function test() {
  const payload = {
    name: "Test Employee",
    email: "test@example.com",
    phone: "+584121234567",
    customerType: "employee",
    addresses: [{
      type: "shipping",
      street: "Calle Falsa 123",
      city: "Caracas",
      state: "Miranda",
      country: "Venezuela",
      isDefault: true
    }],
    taxInfo: {
      taxId: "V12345678",
      taxType: "V"
    }
  };

  console.log('Payload a enviar:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/v1/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Necesitarás un token real
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('\nStatus:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
