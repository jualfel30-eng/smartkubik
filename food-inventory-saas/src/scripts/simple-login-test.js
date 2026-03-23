/**
 * Test simple de login
 */

const https = require('https');

const loginData = JSON.stringify({
  email: 'admin@earlyadopter.com',
  password: 'admin1234!'
});

const options = {
  hostname: 'api.smartkubik.com',
  port: 443,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('\n🔍 Intentando login...\n');
console.log('URL:', `https://${options.hostname}${options.path}`);
console.log('Body:', loginData);
console.log('');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  console.log('');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
    console.log('');

    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Login exitoso\n');
    } else {
      console.log('❌ Login falló\n');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error de conexión:', error);
});

req.write(loginData);
req.end();
