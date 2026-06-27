import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { Connection, Types } from "mongoose";
import { getConnectionToken } from "@nestjs/mongoose";

/**
 * Script de seed para la vertical SALUD (health) - Demo
 *
 * Crea una clínica demo completa. La vertical health REUTILIZA el módulo beauty
 * (BeautyService + Professional + BeautyBooking); lo único que la distingue es
 * `storefrontConfig.templateType = 'health'`. Por eso el tenant se configura como
 * un tenant beauty (businessType/features) para que los endpoints públicos
 * (beauty-services, professionals, beauty-bookings) funcionen sin cambios.
 *
 * Ejecutar: npm run seed:health
 */

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection: Connection = app.get(getConnectionToken());

  console.log("🌱 Starting Health (Salud) Demo Seed...\n");

  try {
    const tenantId = await seedTenant(connection);
    console.log(`✅ Tenant created: ${tenantId}\n`);

    const adminUserId = await seedAdminUser(connection, tenantId);
    console.log(`✅ Admin user created: ${adminUserId}\n`);

    await seedStorefrontConfig(connection, tenantId);
    console.log("✅ Storefront config (templateType: health) created\n");

    const professionals = await seedProfessionals(
      connection,
      tenantId,
      adminUserId,
    );
    console.log(`✅ ${professionals.length} especialistas created\n`);

    const services = await seedServices(
      connection,
      tenantId,
      adminUserId,
      professionals,
    );
    console.log(`✅ ${services.length} servicios clínicos created\n`);

    console.log("\n🎉 Health Demo Seed completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Domain: salud-demo.smartkubik.com`);
    console.log(`   Especialistas: ${professionals.length}`);
    console.log(`   Servicios: ${services.length}`);
    console.log("\n🌐 Access:");
    console.log("   Storefront (prod): https://salud-demo.smartkubik.com");
    console.log(
      "   Storefront (local): http://localhost:3001/salud-demo.smartkubik.com",
    );
    console.log("   Admin: login con admin@saluddemo.com / demo123");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await app.close();
  }
}

async function seedTenant(connection: Connection) {
  const Tenant = connection.model("Tenant");

  let tenant = await Tenant.findOne({ slug: "salud-demo" });

  if (!tenant) {
    tenant = await Tenant.create({
      name: "Clínica Salud Demo",
      slug: "salud-demo",
      domain: "salud-demo.smartkubik.com",
      businessType: "beauty", // reusa el módulo beauty para reservas
      email: "contacto@saluddemo.com",
      phone: "+584241112233",
      address: "Av. Salud, Torre Médica, Piso 3, Consultorio 12",
      city: "Caracas",
      country: "Venezuela",
      isActive: true,
      plan: "premium",
      features: ["beauty", "whatsapp", "storefront"],
    });
  }

  return tenant._id.toString();
}

async function seedAdminUser(connection: Connection, tenantId: string) {
  const User = connection.model("User");

  let user = await User.findOne({ tenantId });

  if (!user) {
    user = await User.create({
      tenantId,
      email: "admin@saluddemo.com",
      password: "demo123", // hasheado por el schema
      firstName: "Admin",
      lastName: "Salud",
      role: "admin",
      isActive: true,
    });
  }

  return user._id.toString();
}

async function seedStorefrontConfig(connection: Connection, tenantId: string) {
  const StorefrontConfig = connection.model("StorefrontConfig");
  const oid = new Types.ObjectId(tenantId);

  await StorefrontConfig.deleteMany({ tenantId: { $in: [tenantId, oid] } });

  // NOTA: el storefront resuelve el tenant por el SLUG del subdominio (middleware),
  // así que `domain` debe ser el slug ('salud-demo'), no el dominio completo.
  // Y `tenantId` se guarda como STRING porque el flujo de beauty-bookings consulta
  // storefrontconfigs por tenantId string (ver beauty-bookings.service.ts).
  return await StorefrontConfig.create({
    tenantId,
    domain: "salud-demo",
    name: "Clínica Salud Demo",
    description:
      "Atención médica y estética con precisión y cuidado. Odontología, dermatología y medicina estética en un entorno de confianza.",
    theme: {
      primaryColor: "#C9A96E", // gold (clinic accent)
      secondaryColor: "#B8944F",
      accentColor: "#C9A96E",
      logo: "https://via.placeholder.com/200x80?text=Salud+Demo",
      bannerUrl:
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920&q=80",
    },
    templateType: "health",
    isActive: true,
    seo: {
      title: "Clínica Salud Demo - Tu salud con precisión y cuidado",
      description:
        "Odontología, dermatología y medicina estética. Agenda tu cita en línea.",
      keywords:
        "clínica, odontología, dermatología, medicina estética, citas, caracas",
    },
    contactInfo: {
      email: "contacto@saluddemo.com",
      phone: "+584241112233",
      whatsapp: "+584241112233",
      address: "Av. Salud, Torre Médica, Piso 3, Consultorio 12",
      city: "Caracas",
      country: "Venezuela",
      socialMedia: {
        instagram: "saluddemo",
        facebook: "saluddemo",
      },
    },
    beautyConfig: {
      enabled: true,
      businessHours: [
        {
          day: 1,
          dayName: "Lunes",
          isOpen: true,
          open: "08:00",
          close: "17:00",
        },
        {
          day: 2,
          dayName: "Martes",
          isOpen: true,
          open: "08:00",
          close: "17:00",
        },
        {
          day: 3,
          dayName: "Miércoles",
          isOpen: true,
          open: "08:00",
          close: "17:00",
        },
        {
          day: 4,
          dayName: "Jueves",
          isOpen: true,
          open: "08:00",
          close: "17:00",
        },
        {
          day: 5,
          dayName: "Viernes",
          isOpen: true,
          open: "08:00",
          close: "16:00",
        },
        {
          day: 6,
          dayName: "Sábado",
          isOpen: true,
          open: "09:00",
          close: "13:00",
        },
        {
          day: 0,
          dayName: "Domingo",
          isOpen: false,
          open: "00:00",
          close: "00:00",
        },
      ],
      paymentMethods: [
        {
          name: "Pago Móvil",
          isActive: true,
          details: "0424-1112233 - Banco Venezuela",
        },
        {
          name: "Transferencia Bancaria",
          isActive: true,
          details: "Cuenta Corriente 0102-xxxx-xxxx-xxxx",
        },
        { name: "Efectivo", isActive: true, details: "Bolívares o USD" },
        { name: "Zelle", isActive: true, details: "contacto@saluddemo.com" },
      ],
      bookingSettings: {
        slotDuration: 30,
        advanceBookingDays: 30,
        cancellationHours: 24,
        requiresDeposit: false,
        depositPercentage: 0,
        whatsappNotification: { enabled: true, mode: "auto" },
      },
      loyalty: {
        enabled: false,
        pointsPerService: 0,
        pointsValue: 0,
        rewardThreshold: 0,
      },
    },
  });
}

async function seedProfessionals(
  connection: Connection,
  tenantId: string,
  createdBy: string,
) {
  const Professional = connection.model("Professional");
  const tid = new Types.ObjectId(tenantId);

  await Professional.deleteMany({ tenantId: { $in: [tenantId, tid] } });

  const defaultSchedule = [
    {
      day: 1,
      start: "08:00",
      end: "17:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      isWorking: true,
    },
    {
      day: 2,
      start: "08:00",
      end: "17:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      isWorking: true,
    },
    {
      day: 3,
      start: "08:00",
      end: "17:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      isWorking: true,
    },
    {
      day: 4,
      start: "08:00",
      end: "17:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      isWorking: true,
    },
    {
      day: 5,
      start: "08:00",
      end: "16:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      isWorking: true,
    },
    { day: 6, start: "09:00", end: "13:00", isWorking: true },
    { day: 0, start: "09:00", end: "13:00", isWorking: false },
  ];

  const professionals = await Professional.insertMany([
    {
      tenantId: tid,
      createdBy,
      name: "Dra. Ana Restrepo",
      role: "Odontóloga",
      specialties: ["Odontología General", "Estética Dental", "Blanqueamiento"],
      bio: "Odontóloga con más de 12 años de experiencia en estética y rehabilitación oral.",
      avatar:
        "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80",
      schedule: defaultSchedule,
      isActive: true,
    },
    {
      tenantId: tid,
      createdBy,
      name: "Dr. Luis Mendoza",
      role: "Dermatólogo",
      specialties: ["Dermatología Clínica", "Dermatología Estética", "Láser"],
      bio: "Especialista en salud de la piel y tratamientos dermatológicos avanzados.",
      avatar:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80",
      schedule: defaultSchedule,
      isActive: true,
    },
    {
      tenantId: tid,
      createdBy,
      name: "Dra. Carla Ruiz",
      role: "Medicina Estética",
      specialties: ["Medicina Estética", "Toxina Botulínica", "Rellenos"],
      bio: "Médico estético enfocada en resultados naturales y bienestar del paciente.",
      avatar:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80",
      schedule: defaultSchedule,
      isActive: true,
    },
  ]);

  return professionals;
}

async function seedServices(
  connection: Connection,
  tenantId: string,
  createdBy: string,
  professionals: any[],
) {
  const BeautyService = connection.model("BeautyService");
  const tid = new Types.ObjectId(tenantId);

  await BeautyService.deleteMany({ tenantId: { $in: [tenantId, tid] } });

  const anaId = professionals[0]._id;
  const luisId = professionals[1]._id;
  const carlaId = professionals[2]._id;

  const img = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80`;

  const services = await BeautyService.insertMany([
    // Odontología — Dra. Ana
    {
      tenantId: tid,
      createdBy,
      name: "Consulta y Limpieza Dental",
      category: "Odontología",
      description:
        "Evaluación odontológica completa más limpieza y profilaxis.",
      duration: 45,
      bufferBefore: 0,
      bufferAfter: 15,
      price: { amount: 40, currency: "USD" },
      professionals: [anaId],
      isActive: true,
      images: [img("photo-1606811841689-23dfddce3e95")],
      benefits: [
        "Evaluación clínica completa por especialista",
        "Eliminación de placa y sarro",
        "Prevención de caries y enfermedad periodontal",
        "Sonrisa más limpia y aliento fresco",
      ],
      addons: [
        {
          name: "Aplicación de Flúor",
          price: 10,
          duration: 10,
          isActive: true,
        },
      ],
    },
    {
      tenantId: tid,
      createdBy,
      name: "Blanqueamiento Dental",
      category: "Odontología",
      description:
        "Blanqueamiento profesional en consultorio para una sonrisa más brillante.",
      duration: 60,
      bufferBefore: 0,
      bufferAfter: 15,
      price: { amount: 120, currency: "USD" },
      professionals: [anaId],
      isActive: true,
      images: [img("photo-1588776814546-1ffcf47267a5")],
      benefits: [
        "Resultados visibles desde la primera sesión",
        "Procedimiento seguro supervisado por odontólogo",
        "Esmalte protegido con desensibilización",
      ],
      beforeAfter: [
        {
          before: img("photo-1581585095857-3c1d3d3a3f3b"),
          after: img("photo-1606811971618-4486d14f3f99"),
          label: "Resultado típico tras una sesión",
        },
      ],
      addons: [],
    },
    // Dermatología — Dr. Luis
    {
      tenantId: tid,
      createdBy,
      name: "Consulta Dermatológica",
      category: "Dermatología",
      description:
        "Evaluación de la piel, diagnóstico y plan de tratamiento personalizado.",
      duration: 30,
      bufferBefore: 0,
      bufferAfter: 10,
      price: { amount: 50, currency: "USD" },
      professionals: [luisId],
      isActive: true,
      images: [img("photo-1576091160550-2173dba999ef")],
      addons: [],
    },
    {
      tenantId: tid,
      createdBy,
      name: "Limpieza Facial Profunda",
      category: "Dermatología",
      description:
        "Limpieza facial con extracción e hidratación, supervisada por dermatólogo.",
      duration: 60,
      bufferBefore: 0,
      bufferAfter: 15,
      price: { amount: 70, currency: "USD" },
      professionals: [luisId, carlaId],
      isActive: true,
      images: [img("photo-1570172619644-dfd03ed5d881")],
      addons: [
        {
          name: "Mascarilla Antioxidante",
          price: 20,
          duration: 15,
          isActive: true,
        },
      ],
    },
    // Medicina Estética — Dra. Carla
    {
      tenantId: tid,
      createdBy,
      name: "Toxina Botulínica (zona)",
      category: "Medicina Estética",
      description:
        "Aplicación de toxina botulínica por zona para suavizar líneas de expresión.",
      duration: 45,
      bufferBefore: 0,
      bufferAfter: 15,
      price: { amount: 180, currency: "USD" },
      professionals: [carlaId],
      isActive: true,
      images: [img("photo-1512290923902-8a9f81dc236c")],
      addons: [],
    },
    {
      tenantId: tid,
      createdBy,
      name: "Control Médico Estético",
      category: "Medicina Estética",
      description:
        "Consulta de seguimiento y valoración de tratamientos estéticos.",
      duration: 30,
      bufferBefore: 0,
      bufferAfter: 10,
      price: { amount: 35, currency: "USD" },
      professionals: [carlaId],
      isActive: true,
      images: [img("photo-1551601651-2a8555f1a136")],
      addons: [],
    },
  ]);

  return services;
}

bootstrap();
