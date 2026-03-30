import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

/**
 * Script de seed para Beauty Module - Demo
 * Crea un salón de belleza completo con datos de prueba
 *
 * Ejecutar: npm run seed:beauty
 */

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection: Connection = app.get(getConnectionToken());

  console.log('🌱 Starting Beauty Demo Seed...\n');

  try {
    // 1. Crear/obtener tenant de prueba
    const tenantId = await seedTenant(connection);
    console.log(`✅ Tenant created: ${tenantId}\n`);

    // 2. Crear/obtener usuario administrador
    const adminUserId = await seedAdminUser(connection, tenantId);
    console.log(`✅ Admin user created: ${adminUserId}\n`);

    // 3. Crear storefront config con beautyConfig
    await seedStorefrontConfig(connection, tenantId);
    console.log('✅ Storefront config created\n');

    // 4. Crear profesionales
    const professionals = await seedProfessionals(connection, tenantId, adminUserId);
    console.log(`✅ ${professionals.length} professionals created\n`);

    // 5. Crear servicios de belleza
    const services = await seedBeautyServices(
      connection,
      tenantId,
      adminUserId,
      professionals,
    );
    console.log(`✅ ${services.length} beauty services created\n`);

    // 6. Crear galería de trabajos
    await seedGallery(connection, tenantId, adminUserId);
    console.log('✅ Gallery items created\n');

    // 7. Crear reseñas de ejemplo
    await seedReviews(connection, tenantId, services);
    console.log('✅ Reviews created\n');

    console.log('\n🎉 Beauty Demo Seed completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Domain: belleza-demo.smartkubik.com`);
    console.log(`   Services: ${services.length}`);
    console.log(`   Professionals: ${professionals.length}`);
    console.log('\n🌐 Access:');
    console.log('   Storefront: http://localhost:3001/belleza-demo.smartkubik.com/beauty');
    console.log('   Admin: http://localhost:3000 (login required)');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

async function seedTenant(connection: Connection) {
  const Tenant = connection.model('Tenant');

  // Verificar si ya existe
  let tenant = await Tenant.findOne({ slug: 'belleza-demo' });

  if (!tenant) {
    tenant = await Tenant.create({
      name: 'Salón Belleza Premium',
      slug: 'belleza-demo',
      domain: 'belleza-demo.smartkubik.com',
      businessType: 'beauty',
      email: 'contacto@bellezapremium.com',
      phone: '+584241234567',
      address: 'Av. Principal, Centro Comercial Plaza Mayor, Local 15',
      city: 'Caracas',
      country: 'Venezuela',
      isActive: true,
      plan: 'premium',
      features: ['beauty', 'whatsapp', 'storefront'],
    });
  }

  return tenant._id.toString();
}

async function seedAdminUser(connection: Connection, tenantId: string) {
  const User = connection.model('User');

  // Buscar un usuario existente del tenant o crear uno de demo
  let user = await User.findOne({ tenantId });

  if (!user) {
    // Crear usuario demo (la contraseña será hasheada por el schema)
    user = await User.create({
      tenantId,
      email: 'admin@bellezapremium.com',
      password: 'demo123', // Esto debe ser hasheado por el schema
      firstName: 'Admin',
      lastName: 'Demo',
      role: 'admin',
      isActive: true,
    });
  }

  return user._id.toString();
}

async function seedStorefrontConfig(connection: Connection, tenantId: string) {
  const StorefrontConfig = connection.model('StorefrontConfig');

  // Eliminar config anterior si existe
  await StorefrontConfig.deleteOne({ tenantId });

  return await StorefrontConfig.create({
    tenantId,
    domain: 'belleza-demo.smartkubik.com',
    name: 'Salón Belleza Premium',
    description:
      'Tu destino de belleza en Caracas. Especialistas en cortes modernos, color, tratamientos y más.',
    theme: {
      primaryColor: '#D946EF', // Purple/magenta
      secondaryColor: '#F97316', // Orange
      accentColor: '#EC4899',
      logo: 'https://via.placeholder.com/200x80?text=Belleza+Premium',
    },
    templateType: 'beauty',
    isActive: true,
    seo: {
      title: 'Salón Belleza Premium - Tu destino de belleza en Caracas',
      description: 'Especialistas en cortes modernos, color, tratamientos capilares y más. Reserva tu cita online.',
      keywords: 'salon de belleza, peluqueria, caracas, venezuela, cortes, color, tratamientos',
    },
    contactInfo: {
      email: 'contacto@bellezapremium.com',
      phone: '+584241234567',
      whatsapp: '+584241234567',
      address: 'Av. Principal, Centro Comercial Plaza Mayor, Local 15',
      city: 'Caracas',
      country: 'Venezuela',
      socialMedia: {
        instagram: 'bellezapremiumccs',
        facebook: 'bellezapremium',
      },
    },
    beautyConfig: {
      enabled: true,
      businessHours: [
        {
          day: 1,
          dayName: 'Lunes',
          isOpen: true,
          open: '09:00',
          close: '19:00',
        },
        {
          day: 2,
          dayName: 'Martes',
          isOpen: true,
          open: '09:00',
          close: '19:00',
        },
        {
          day: 3,
          dayName: 'Miércoles',
          isOpen: true,
          open: '09:00',
          close: '19:00',
        },
        {
          day: 4,
          dayName: 'Jueves',
          isOpen: true,
          open: '09:00',
          close: '19:00',
        },
        {
          day: 5,
          dayName: 'Viernes',
          isOpen: true,
          open: '09:00',
          close: '20:00',
        },
        {
          day: 6,
          dayName: 'Sábado',
          isOpen: true,
          open: '09:00',
          close: '18:00',
        },
        {
          day: 0,
          dayName: 'Domingo',
          isOpen: false,
          open: '00:00',
          close: '00:00',
        },
      ],
      paymentMethods: [
        {
          name: 'Pago Móvil',
          isActive: true,
          details: '0424-1234567 - Banco Venezuela',
        },
        {
          name: 'Transferencia Bancaria',
          isActive: true,
          details: 'Cuenta Corriente 0102-xxxx-xxxx-xxxx',
        },
        { name: 'Efectivo', isActive: true, details: 'Bolívares o USD' },
        {
          name: 'Zelle',
          isActive: true,
          details: 'contacto@bellezapremium.com',
        },
      ],
      bookingSettings: {
        slotDuration: 30,
        advanceBookingDays: 30,
        cancellationHours: 24,
        requiresDeposit: false,
        depositPercentage: 0,
        whatsappNotification: {
          enabled: true,
          mode: 'auto',
        },
      },
      loyalty: {
        enabled: true,
        pointsPerService: 10,
        pointsValue: 0.1,
        rewardThreshold: 100,
      },
    },
  });
}

async function seedProfessionals(connection: Connection, tenantId: string, createdBy: string) {
  const Professional = connection.model('Professional');

  // Eliminar profesionales anteriores
  await Professional.deleteMany({ tenantId });

  const defaultSchedule = [
    {
      day: 1,
      start: '09:00',
      end: '19:00',
      breakStart: '13:00',
      breakEnd: '14:00',
      isWorking: true,
    },
    {
      day: 2,
      start: '09:00',
      end: '19:00',
      breakStart: '13:00',
      breakEnd: '14:00',
      isWorking: true,
    },
    {
      day: 3,
      start: '09:00',
      end: '19:00',
      breakStart: '13:00',
      breakEnd: '14:00',
      isWorking: true,
    },
    {
      day: 4,
      start: '09:00',
      end: '19:00',
      breakStart: '13:00',
      breakEnd: '14:00',
      isWorking: true,
    },
    {
      day: 5,
      start: '09:00',
      end: '20:00',
      breakStart: '13:00',
      breakEnd: '14:00',
      isWorking: true,
    },
    {
      day: 6,
      start: '09:00',
      end: '18:00',
      isWorking: true,
    },
    {
      day: 0,
      start: '09:00',
      end: '18:00',
      isWorking: false,
    },
  ];

  const professionals = await Professional.insertMany([
    {
      tenantId,
      createdBy,
      name: 'María González',
      role: 'Estilista Senior',
      specialties: ['Corte', 'Color', 'Tratamientos'],
      bio: 'Con 10+ años de experiencia en colorimetría y técnicas avanzadas de corte.',
      avatar: 'https://via.placeholder.com/200x200?text=Maria',
      instagram: '@mariagstyle',
      schedule: defaultSchedule,
      isActive: true,
    },
    {
      tenantId,
      createdBy,
      name: 'Carlos Ramírez',
      role: 'Barbero Profesional',
      specialties: ['Corte Caballero', 'Barba', 'Afeitado Clásico'],
      bio: 'Especialista en cortes clásicos y modernos para caballeros.',
      avatar: 'https://via.placeholder.com/200x200?text=Carlos',
      schedule: defaultSchedule,
      isActive: true,
    },
    {
      tenantId,
      createdBy,
      name: 'Laura Pérez',
      role: 'Especialista en Uñas',
      specialties: ['Manicure', 'Pedicure', 'Nail Art'],
      bio: 'Experta en diseños de uñas y técnicas de esmaltado permanente.',
      avatar: 'https://via.placeholder.com/200x200?text=Laura',
      schedule: defaultSchedule,
      isActive: true,
    },
  ]);

  return professionals;
}

async function seedBeautyServices(
  connection: Connection,
  tenantId: string,
  createdBy: string,
  professionals: any[],
) {
  const BeautyService = connection.model('BeautyService');

  // Eliminar servicios anteriores
  await BeautyService.deleteMany({ tenantId });

  const allProfessionalsIds = professionals.map((p) => p._id);
  const mariaId = professionals[0]._id;
  const carlosId = professionals[1]._id;
  const lauraId = professionals[2]._id;

  const services = await BeautyService.insertMany([
    // Servicios de María (Estilista)
    {
      tenantId,
      createdBy,
      name: 'Corte de Cabello Dama',
      category: 'Cabello',
      description:
        'Corte personalizado según tu estilo. Incluye lavado y secado.',
      duration: 45,
      bufferBefore: 0,
      bufferAfter: 15,
      price: { amount: 25, currency: 'USD' },
      professionals: [mariaId],
      isActive: true,
      images: [],
      addons: [
        {
          name: 'Tratamiento Hidratante',
          price: 15,
          duration: 20,
          isActive: true,
        },
      ],
    },
    {
      tenantId,
      createdBy,
      name: 'Color Completo',
      category: 'Cabello',
      description:
        'Aplicación de color global. Incluye pre-tratamiento y acondicionador.',
      duration: 90,
      bufferBefore: 0,
      bufferAfter: 30,
      price: { amount: 60, currency: 'USD' },
      professionals: [mariaId],
      isActive: true,
      images: [],
      addons: [
        { name: 'Mechas', price: 40, duration: 60, isActive: true },
        {
          name: 'Tratamiento Anti-Quiebre',
          price: 20,
          duration: 15,
          isActive: true,
        },
      ],
    },
    {
      tenantId,
      createdBy,
      name: 'Alisado Brasileño',
      category: 'Tratamientos',
      description:
        'Alisado progresivo con keratina. Resultados duraderos.',
      duration: 180,
      bufferBefore: 15,
      bufferAfter: 30,
      price: { amount: 120, currency: 'USD' },
      professionals: [mariaId],
      isActive: true,
      images: [],
      requiresDeposit: true,
      depositAmount: 40,
    },

    // Servicios de Carlos (Barbero)
    {
      tenantId,
      createdBy,
      name: 'Corte Caballero',
      category: 'Barbería',
      description: 'Corte moderno o clásico. Incluye lavado y styling.',
      duration: 30,
      bufferBefore: 0,
      bufferAfter: 15,
      price: { amount: 15, currency: 'USD' },
      professionals: [carlosId],
      isActive: true,
      images: [],
      addons: [
        { name: 'Arreglo de Barba', price: 8, duration: 15, isActive: true },
        {
          name: 'Afeitado Clásico',
          price: 12,
          duration: 20,
          isActive: true,
        },
      ],
    },
    {
      tenantId,
      createdBy,
      name: 'Barba + Bigote',
      category: 'Barbería',
      description: 'Perfilado y arreglo completo de barba y bigote.',
      duration: 25,
      bufferBefore: 0,
      bufferAfter: 10,
      price: { amount: 10, currency: 'USD' },
      professionals: [carlosId],
      isActive: true,
      images: [],
    },

    // Servicios de Laura (Uñas)
    {
      tenantId,
      createdBy,
      name: 'Manicure Clásica',
      category: 'Uñas',
      description: 'Limado, cutículas, esmaltado. Incluye hidratación.',
      duration: 40,
      bufferBefore: 0,
      bufferAfter: 10,
      price: { amount: 12, currency: 'USD' },
      professionals: [lauraId],
      isActive: true,
      images: [],
      addons: [
        {
          name: 'Esmaltado Permanente',
          price: 8,
          duration: 15,
          isActive: true,
        },
        { name: 'Nail Art Básico', price: 10, duration: 20, isActive: true },
      ],
    },
    {
      tenantId,
      createdBy,
      name: 'Pedicure Spa',
      category: 'Uñas',
      description:
        'Pedicure completo con exfoliación, masaje y esmaltado.',
      duration: 60,
      bufferBefore: 0,
      bufferAfter: 15,
      price: { amount: 20, currency: 'USD' },
      professionals: [lauraId],
      isActive: true,
      images: [],
    },

    // Servicios combinados (disponibles con varios profesionales)
    {
      tenantId,
      createdBy,
      name: 'Peinado para Evento',
      category: 'Peinado',
      description: 'Peinado profesional para eventos especiales.',
      duration: 60,
      bufferBefore: 15,
      bufferAfter: 15,
      price: { amount: 35, currency: 'USD' },
      professionals: [mariaId],
      isActive: true,
      images: [],
      requiresDeposit: true,
      depositAmount: 15,
    },
  ]);

  return services;
}

async function seedGallery(connection: Connection, tenantId: string, createdBy: string) {
  const BeautyGalleryItem = connection.model('BeautyGalleryItem');

  await BeautyGalleryItem.deleteMany({ tenantId });

  return await BeautyGalleryItem.insertMany([
    {
      tenantId,
      createdBy,
      title: 'Balayage Rubio Natural',
      category: 'Cabello',
      image: 'https://via.placeholder.com/400x600?text=Balayage',
      description: 'Técnica de color con transiciones naturales',
      isPinned: true,
      order: 1,
    },
    {
      tenantId,
      createdBy,
      title: 'Corte Moderno Caballero',
      category: 'Barbería',
      image: 'https://via.placeholder.com/400x600?text=Corte+Hombre',
      description: 'Fade profesional con detalle en la línea',
      isPinned: true,
      order: 2,
    },
    {
      tenantId,
      createdBy,
      title: 'Nail Art Elegante',
      category: 'Uñas',
      image: 'https://via.placeholder.com/400x600?text=Nail+Art',
      description: 'Diseño minimalista con detalles dorados',
      isPinned: false,
      order: 3,
    },
  ]);
}

async function seedReviews(
  connection: Connection,
  tenantId: string,
  services: any[],
) {
  const BeautyReview = connection.model('BeautyReview');

  await BeautyReview.deleteMany({ tenantId });

  return await BeautyReview.insertMany([
    {
      tenantId,
      client: {
        name: 'Ana Rodríguez',
        phone: '+584241111111',
      },
      rating: 5,
      comment:
        'Excelente servicio! María es muy profesional y el corte quedó perfecto.',
      isApproved: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
    },
    {
      tenantId,
      client: {
        name: 'Pedro Martínez',
        phone: '+584242222222',
      },
      rating: 5,
      comment: 'Carlos es el mejor barbero de Caracas. Súper recomendado!',
      isApproved: true,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      tenantId,
      client: {
        name: 'Gabriela Sánchez',
        phone: '+584243333333',
      },
      rating: 5,
      comment:
        'Me encantó el manicure. Laura tiene un talento increíble para el nail art.',
      isApproved: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]);
}

bootstrap();
