import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';

@Controller()
class DemoController {
  @Get()
  getHello() {
    return {
      success: true,
      message: 'Food Inventory SaaS API - Sistema de inventario alimentario para Venezuela',
      version: '1.0.0',
      environment: 'demo',
      timestamp: new Date().toISOString(),
      features: [
        'Gestión de productos perecederos con FEFO',
        'Inventario con lotes y fechas de vencimiento',
        'Órdenes con reservas atómicas',
        'CRM de clientes con segmentación',
        'Cálculo automático de IVA 16% e IGTF 3%',
        'Precios dinámicos por forma de pago',
        'Sistema multitenant con JWT',
        'API REST con documentación Swagger'
      ],
      architecture: {
        backend: 'NestJS + TypeScript',
        database: 'MongoDB con transacciones ACID',
        authentication: 'JWT multitenant',
        documentation: 'Swagger/OpenAPI',
        validation: 'class-validator + class-transformer'
      },
      venezuelanFeatures: {
        taxes: {
          iva: '16% automático',
          igtf: '3% para divisas y tarjetas'
        },
        payments: [
          'Efectivo VES (5% descuento)',
          'Tarjeta (3% recargo + IGTF)',
          'Transferencia VES',
          'Efectivo USD (+ IGTF)',
          'Transferencia USD (+ IGTF)',
          'Pago mixto'
        ],
        currency: 'VES/USD con tasa de cambio'
      },
      links: {
        documentation: '/api/docs',
        health: '/api/v1/health',
        endpoints: '/api/v1/demo/endpoints',
        schemas: '/api/v1/demo/schemas'
      }
    };
  }

  @Get('health')
  getHealth() {
    return {
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      services: {
        api: 'running',
        database: 'ready (MongoDB)',
        authentication: 'ready (JWT)',
        documentation: 'available at /api/docs'
      }
    };
  }

  @Get('demo/endpoints')
  getDemoEndpoints() {
    return {
      success: true,
      message: 'Endpoints disponibles en la arquitectura completa',
      endpoints: {
        auth: [
          'POST /api/v1/auth/login - Iniciar sesión',
          'POST /api/v1/auth/register - Registrar usuario',
          'POST /api/v1/auth/refresh - Renovar token',
          'GET /api/v1/auth/profile - Obtener perfil'
        ],
        products: [
          'GET /api/v1/products - Listar productos',
          'POST /api/v1/products - Crear producto',
          'GET /api/v1/products/:id - Obtener producto',
          'PATCH /api/v1/products/:id - Actualizar producto',
          'GET /api/v1/products/categories/list - Categorías'
        ],
        inventory: [
          'GET /api/v1/inventory - Listar inventario',
          'POST /api/v1/inventory/movements - Registrar movimiento',
          'POST /api/v1/inventory/reserve - Reservar stock',
          'POST /api/v1/inventory/release - Liberar reserva',
          'GET /api/v1/inventory/alerts/low-stock - Alertas'
        ],
        orders: [
          'GET /api/v1/orders - Listar órdenes',
          'POST /api/v1/orders - Crear orden',
          'GET /api/v1/orders/:id - Obtener orden',
          'PATCH /api/v1/orders/:id - Actualizar orden'
        ],
        customers: [
          'GET /api/v1/customers - Listar clientes',
          'POST /api/v1/customers - Crear cliente',
          'GET /api/v1/customers/:id - Obtener cliente',
          'PATCH /api/v1/customers/:id - Actualizar cliente'
        ],
        pricing: [
          'POST /api/v1/pricing/calculate - Calcular precios con impuestos venezolanos'
        ],
        payments: [
          'POST /api/v1/payments/add - Agregar pago',
          'POST /api/v1/payments/confirm - Confirmar pago',
          'GET /api/v1/payments/methods - Métodos disponibles'
        ]
      }
    };
  }

  @Get('demo/schemas')
  getSchemas() {
    return {
      success: true,
      message: 'Schemas de MongoDB implementados',
      schemas: {
        Product: {
          description: 'Productos con variantes, proveedores y configuración para alimentos perecederos',
          features: ['SKU único', 'Variantes múltiples', 'Proveedores', 'FEFO', 'Fechas de vencimiento']
        },
        Inventory: {
          description: 'Inventario con lotes, FEFO y reservas atómicas',
          features: ['Lotes con fechas', 'FEFO automático', 'Reservas temporales', 'Alertas', 'Ubicaciones']
        },
        Order: {
          description: 'Órdenes con cálculos venezolanos e items con lotes',
          features: ['IVA 16%', 'IGTF 3%', 'Reservas de inventario', 'Estados', 'Pagos múltiples']
        },
        Customer: {
          description: 'CRM completo con segmentación e historial',
          features: ['Segmentación', 'Interacciones', 'Métricas', 'Crédito', 'Múltiples contactos']
        },
        User: {
          description: 'Usuarios con roles y permisos granulares',
          features: ['Roles', 'Permisos por módulo', 'Multitenant', 'Bloqueo por intentos']
        },
        Tenant: {
          description: 'Configuración multitenant con límites y suscripciones',
          features: ['Configuración fiscal', 'Límites de uso', 'Suscripciones', 'Configuración regional']
        }
      }
    };
  }
}

// Controller adicional para la raíz sin prefijo
@Controller()
class RootController {
  @Get()
  getRoot() {
    return {
      success: true,
      message: '🚀 Food Inventory SaaS API - Bienvenido',
      description: 'Sistema de inventario alimentario para Venezuela',
      version: '1.0.0-demo',
      timestamp: new Date().toISOString(),
      navigation: {
        api: '/api/v1',
        documentation: '/api/docs',
        health: '/api/v1/health',
        endpoints: '/api/v1/demo/endpoints',
        schemas: '/api/v1/demo/schemas'
      },
      quickStart: [
        '1. Visita /api/docs para la documentación interactiva',
        '2. Prueba /api/v1/health para verificar el estado',
        '3. Explora /api/v1/demo/endpoints para ver todos los endpoints',
        '4. Revisa /api/v1/demo/schemas para los modelos de datos'
      ]
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [RootController, DemoController],
})
class DemoAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(DemoAppModule);

  // Middlewares
  app.use(helmet());
  app.use(compression());
  app.enableCors();

  // Global Pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // API Prefix solo para DemoController
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: '', method: 'GET' as any }]
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Food Inventory SaaS API - DEMO')
    .setDescription('Vista previa de la arquitectura del sistema de inventario alimentario para Venezuela')
    .setVersion('1.0.0-demo')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start Server
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Demo server running on: http://localhost:${port}`);
  console.log(`🏠 Home: http://localhost:${port}/`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${port}/api/v1/health`);
  console.log(`📋 Demo Endpoints: http://localhost:${port}/api/v1/demo/endpoints`);
}

bootstrap().catch(err => {
  console.error('Error starting demo server:', err);
});

