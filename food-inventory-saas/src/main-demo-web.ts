import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import helmet from 'helmet';
import * as compression from 'compression';

@Controller('api/v1')
class ApiController {
  @Get()
  getApiInfo() {
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
          features: ['SKU único', 'Variantes múltiples', 'Proveedores', 'FEFO', 'Fechas de vencimiento'],
          example: {
            name: 'Arroz Diana 1kg',
            sku: 'ARR-DIANA-1KG',
            category: 'Granos',
            brand: 'Diana',
            isPerishable: false,
            variants: [
              { size: '1kg', price: 2.50, stock: 100 }
            ]
          }
        },
        Inventory: {
          description: 'Inventario con lotes, FEFO y reservas atómicas',
          features: ['Lotes con fechas', 'FEFO automático', 'Reservas temporales', 'Alertas', 'Ubicaciones'],
          example: {
            productId: '507f1f77bcf86cd799439011',
            lotNumber: 'LOT-2025-001',
            expirationDate: '2025-12-31',
            quantity: 50,
            location: 'A1-B2-C3'
          }
        },
        Order: {
          description: 'Órdenes con cálculos venezolanos e items con lotes',
          features: ['IVA 16%', 'IGTF 3%', 'Reservas de inventario', 'Estados', 'Pagos múltiples'],
          example: {
            orderNumber: 'ORD-2509-000001',
            customerId: '507f1f77bcf86cd799439012',
            items: [
              { productId: '507f1f77bcf86cd799439011', quantity: 2, unitPrice: 2.50 }
            ],
            subtotal: 5.00,
            ivaTotal: 0.80,
            totalAmount: 5.80
          }
        }
      }
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
  ],
  controllers: [ApiController],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for demo
  }));
  app.use(compression());
  app.enableCors();

  // Global Pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

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
  console.log(`🌐 Vista Previa Web: http://localhost:${port}/`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${port}/api/v1/health`);
}

bootstrap().catch(err => {
  console.error('Error starting demo server:', err);
});

