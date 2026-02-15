const http = require('http');

// Datos mock para diferentes tenants
const mockData = {
  // Tenant con template de E-commerce
  'tienda-ejemplo.localhost': {
    tenantId: 'tenant-ecommerce-001',
    name: 'Tienda de Alimentos Premium',
    description: 'Los mejores productos alimenticios de Venezuela',
    logo: 'https://via.placeholder.com/150/0066cc/ffffff?text=Tienda+Premium',
    template: 'modern-ecommerce',
    theme: {
      primaryColor: '#0066cc',
      secondaryColor: '#00aaff',
      fontFamily: 'Inter, sans-serif'
    },
    products: [
      {
        _id: 'prod-001',
        name: 'Harina de Maíz Premium',
        description: 'Harina de maíz precocida de la más alta calidad',
        price: 5.50,
        image: 'https://via.placeholder.com/400x300/ffcc00/333333?text=Harina+Ma%C3%ADz',
        category: 'Granos',
        stock: 100
      },
      {
        _id: 'prod-002',
        name: 'Aceite de Girasol',
        description: 'Aceite vegetal 100% puro',
        price: 8.75,
        image: 'https://via.placeholder.com/400x300/ff9900/ffffff?text=Aceite',
        category: 'Aceites',
        stock: 50
      },
      {
        _id: 'prod-003',
        name: 'Arroz Blanco',
        description: 'Arroz de grano largo, primera calidad',
        price: 3.25,
        image: 'https://via.placeholder.com/400x300/cccccc/333333?text=Arroz',
        category: 'Granos',
        stock: 200
      },
      {
        _id: 'prod-004',
        name: 'Pasta Larga',
        description: 'Pasta tipo espagueti, 500g',
        price: 2.50,
        image: 'https://via.placeholder.com/400x300/ffdd66/333333?text=Pasta',
        category: 'Pastas',
        stock: 150
      },
      {
        _id: 'prod-005',
        name: 'Azúcar Refinada',
        description: 'Azúcar blanca refinada, 1kg',
        price: 4.00,
        image: 'https://via.placeholder.com/400x300/ffffff/999999?text=Az%C3%BAcar',
        category: 'Endulzantes',
        stock: 80
      },
      {
        _id: 'prod-006',
        name: 'Café Molido',
        description: 'Café 100% arábica, tostado y molido',
        price: 12.50,
        image: 'https://via.placeholder.com/400x300/663300/ffffff?text=Caf%C3%A9',
        category: 'Bebidas',
        stock: 60
      }
    ],
    contactInfo: {
      phone: '+58 412-1234567',
      email: 'contacto@tiendapremium.com',
      address: 'Caracas, Venezuela'
    }
  },
  
  // Tenant con template de Servicios
  'salon-belleza.localhost': {
    tenantId: 'tenant-services-001',
    name: 'Salón de Belleza Elegance',
    description: 'Transformamos tu belleza con estilo y profesionalismo',
    logo: 'https://via.placeholder.com/150/ff6699/ffffff?text=Elegance',
    template: 'modern-services',
    theme: {
      primaryColor: '#ff6699',
      secondaryColor: '#ff99cc',
      fontFamily: 'Playfair Display, serif'
    },
    services: [
      {
        _id: 'serv-001',
        name: 'Corte de Cabello',
        description: 'Corte profesional adaptado a tu estilo personal',
        image: 'https://via.placeholder.com/400x300/ff6699/ffffff?text=Corte',
        category: 'Cabello'
      },
      {
        _id: 'serv-002',
        name: 'Coloración',
        description: 'Tintes y mechas con productos de alta calidad',
        image: 'https://via.placeholder.com/400x300/cc3366/ffffff?text=Color',
        category: 'Cabello'
      },
      {
        _id: 'serv-003',
        name: 'Manicure & Pedicure',
        description: 'Cuidado completo de manos y pies',
        image: 'https://via.placeholder.com/400x300/ff99cc/333333?text=Manicure',
        category: 'Uñas'
      },
      {
        _id: 'serv-004',
        name: 'Tratamiento Facial',
        description: 'Limpieza profunda y rejuvenecimiento facial',
        image: 'https://via.placeholder.com/400x300/ffccdd/333333?text=Facial',
        category: 'Estética'
      },
      {
        _id: 'serv-005',
        name: 'Maquillaje Profesional',
        description: 'Maquillaje para eventos especiales',
        image: 'https://via.placeholder.com/400x300/ff3366/ffffff?text=Maquillaje',
        category: 'Estética'
      },
      {
        _id: 'serv-006',
        name: 'Masaje Relajante',
        description: 'Masajes terapéuticos para tu bienestar',
        image: 'https://via.placeholder.com/400x300/9966cc/ffffff?text=Masaje',
        category: 'Spa'
      }
    ],
    team: [
      {
        name: 'María González',
        role: 'Estilista Senior',
        photo: 'https://via.placeholder.com/200/ff6699/ffffff?text=MG',
        bio: '15 años de experiencia en estilismo profesional'
      },
      {
        name: 'Carlos Pérez',
        role: 'Especialista en Color',
        photo: 'https://via.placeholder.com/200/cc3366/ffffff?text=CP',
        bio: 'Experto en técnicas de coloración avanzada'
      },
      {
        name: 'Ana Rodríguez',
        role: 'Esteticista',
        photo: 'https://via.placeholder.com/200/ff99cc/333333?text=AR',
        bio: 'Certificada en tratamientos faciales y corporales'
      }
    ],
    socialMedia: {
      instagram: 'https://instagram.com/salonelegance',
      facebook: 'https://facebook.com/salonelegance',
      whatsapp: '584121234567'
    },
    contactInfo: {
      phone: '+58 412-7654321',
      email: 'info@salonelegance.com',
      address: 'Av. Principal, Centro Comercial Plaza, Local 15, Caracas'
    }
  }
};

const server = http.createServer((req, res) => {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parsear la URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Endpoint para obtener configuración del storefront
  if (url.pathname.startsWith('/api/v1/storefront/')) {
    const domain = url.pathname.split('/').pop();
    
    console.log(`[Mock API] Request for domain: ${domain}`);
    
    // Buscar datos por dominio
    let data = mockData[domain];
    
    // Si no encuentra el dominio exacto, usar el primer tenant como default
    if (!data) {
      console.log(`[Mock API] Domain not found, using default e-commerce template`);
      data = mockData['tienda-ejemplo.localhost'];
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }
  
  // Endpoint de salud
  if (url.pathname === '/api/v1/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Mock API is running' }));
    return;
  }
  
  // Lista de dominios disponibles
  if (url.pathname === '/api/v1/storefront/list') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      domains: Object.keys(mockData),
      message: 'Available test domains'
    }));
    return;
  }
  
  // 404 para otras rutas
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   - GET /api/v1/health`);
  console.log(`   - GET /api/v1/storefront/list`);
  console.log(`   - GET /api/v1/storefront/{domain}`);
  console.log(`\n🏪 Available test domains:`);
  Object.keys(mockData).forEach(domain => {
    const data = mockData[domain];
    console.log(`   - ${domain} (${data.template})`);
  });
  console.log(`\n✨ Ready to serve storefront data!\n`);
});
