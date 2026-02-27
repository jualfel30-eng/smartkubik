const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
const payload = {
    sub: '68d55e4c764d359fed186e68',
    email: 'broastiendas@gmail.com',
    tenantId: '68d55e4b764d359fed186e47', // the correct tenantId
    role: { _id: '68d55e4c764d359fed186e66' } // the correct role
};

const token = jwt.sign(payload, JWT_SECRET);

const postData = JSON.stringify({
    items: [
        {
            SKU: 'Maiz Inflado Premium',
            NuevaCantidad: 5
        }
    ],
    reason: 'Ajuste test 2',
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/inventory/bulk-adjust',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`BODY: ${data}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
