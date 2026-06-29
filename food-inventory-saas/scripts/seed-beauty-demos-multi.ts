import "dotenv/config";
import mongoose, { Types } from "mongoose";

/**
 * Seed multi-demo para el vertical Beauty (standalone, mongoose directo).
 *
 * Crea (idempotentemente) 3 storefronts de demostración usados por el landing de
 * skubik (sección "Tu web propia"): studiobella, nailsbysophie, sparenacer.
 * Cada uno queda accesible en https://<slug>.smartkubik.com (el middleware del
 * storefront extrae el subdominio y busca storefrontconfigs.domain == "<slug>").
 *
 * NO usa NestFactory: el bootstrap completo de AppModule cuelga en esta máquina
 * (colas/gateways). Conecta a Mongo directo y escribe con colecciones raw,
 * replicando EXACTAMENTE la forma de los documentos del demo vivo `savabarberia`:
 *   - storefrontconfigs.tenantId  → STRING (hex del ObjectId)
 *   - professionals/beautyservices/beautygalleryitems/beautyreviews.tenantId → ObjectId
 *   - storefrontconfigs.domain     → el subdominio (slug), NO el dominio completo
 *   - hero name = seo.title (tenantId string no popula); paymentMethods = string[]
 *
 * Imágenes: URLs reales de Unsplash (CDN) verificadas (HTTP 200).
 *
 * IDEMPOTENTE y ACOTADO POR TENANT: localiza el demo por storefrontconfigs.domain,
 * reusa su tenantId si existe, y los deleteMany filtran por el tenantId del demo.
 * NUNCA toca colecciones globales ni otros tenants.
 *
 * Ejecutar: npm run seed:beauty-demos
 * ⚠️ El .env apunta a la Mongo de PRODUCCIÓN (cluster Atlas, DB `test`).
 */

const SYSTEM_AUTHOR = new Types.ObjectId(); // satisface createdBy (ref no forzado al escribir)

const img = (id: string, w = 1200, q = 80) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;

const SCHEDULE = [
  { day: 0, start: "09:00", end: "18:00", isWorking: false },
  { day: 1, start: "09:00", end: "19:00", isWorking: true },
  { day: 2, start: "09:00", end: "19:00", isWorking: true },
  { day: 3, start: "09:00", end: "19:00", isWorking: true },
  { day: 4, start: "09:00", end: "19:00", isWorking: true },
  { day: 5, start: "09:00", end: "20:00", isWorking: true },
  { day: 6, start: "09:00", end: "18:00", isWorking: true },
];

const BUSINESS_HOURS = [
  { day: 0, open: "00:00", close: "00:00", isOpen: false },
  { day: 1, open: "09:00", close: "19:00", isOpen: true },
  { day: 2, open: "09:00", close: "19:00", isOpen: true },
  { day: 3, open: "09:00", close: "19:00", isOpen: true },
  { day: 4, open: "09:00", close: "19:00", isOpen: true },
  { day: 5, open: "09:00", close: "20:00", isOpen: true },
  { day: 6, open: "09:00", close: "18:00", isOpen: true },
];

const BOOKING_SETTINGS = {
  slotDuration: 30,
  maxAdvanceBookingDays: 30,
  minAdvanceBookingHours: 2,
  whatsappNotification: { enabled: false, mode: "disabled" },
};

interface ServiceSeed {
  name: string;
  category: string;
  description: string;
  duration: number;
  price: number;
  proIdx: number[];
  requiresDeposit?: boolean;
  depositAmount?: number;
  addons?: Array<{ name: string; price: number; duration: number }>;
}
interface ProSeed {
  name: string;
  role: string;
  specialties: string[];
  bio: string;
  avatar: string;
  instagram?: string;
}
interface GallerySeed {
  title: string;
  description: string;
  category: string;
  image: string;
}
interface ReviewSeed {
  name: string;
  phone: string;
  rating: number;
  comment: string;
  daysAgo: number;
}

interface DemoConfig {
  slug: string;
  name: string;
  businessType: string;
  description: string;
  keywords: string[];
  city: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  theme: { primaryColor: string; secondaryColor: string; bannerUrl: string };
  professionals: ProSeed[];
  services: ServiceSeed[];
  gallery: GallerySeed[];
  reviews: ReviewSeed[];
}

const DEMOS: DemoConfig[] = [
  // ───────────────────────── Studio Bella (salón premium) ─────────────────────────
  {
    slug: "studiobella",
    name: "Studio Bella",
    businessType: "Salón de Belleza",
    description:
      "El arte de sentirte radiante. Color de autor, cortes y tratamientos en el corazón de la ciudad.",
    keywords: [
      "salon de belleza",
      "peluqueria",
      "balayage",
      "color",
      "caracas",
      "studio bella",
    ],
    city: "Caracas",
    phone: "+584141112233",
    whatsapp: "+584141112233",
    instagram: "studiobella",
    theme: {
      primaryColor: "#C9A663",
      secondaryColor: "#8B7355",
      bannerUrl: img("1560066984-138dadb4c035", 1600),
    },
    professionals: [
      {
        name: "Valentina Rojas",
        role: "Estilista Senior",
        specialties: ["Corte", "Color", "Balayage"],
        bio: "Más de 12 años creando color a medida y cortes que realzan tu rostro.",
        avatar: img("1494790108377-be9c29b29330", 400),
        instagram: "@valentina.studiobella",
      },
      {
        name: "Daniela Méndez",
        role: "Colorista",
        specialties: ["Mechas", "Babylights", "Tratamientos"],
        bio: "Especialista en colorimetría y técnicas de iluminación natural.",
        avatar: img("1438761681033-6461ffad8d80", 400),
      },
    ],
    services: [
      {
        name: "Corte & Brushing",
        category: "Cabello",
        description: "Corte personalizado con lavado, secado y peinado.",
        duration: 60,
        price: 30,
        proIdx: [0, 1],
        addons: [{ name: "Tratamiento Hidratante", price: 15, duration: 20 }],
      },
      {
        name: "Balayage",
        category: "Color",
        description:
          "Iluminación a mano alzada con transiciones naturales. Incluye tratamiento.",
        duration: 150,
        price: 90,
        proIdx: [0, 1],
        requiresDeposit: true,
        depositAmount: 30,
      },
      {
        name: "Mechas Babylights",
        category: "Color",
        description: "Mechas finas para un rubio luminoso y multidimensional.",
        duration: 120,
        price: 75,
        proIdx: [1],
      },
      {
        name: "Tratamiento de Keratina",
        category: "Tratamientos",
        description:
          "Alisado y nutrición profunda. Resultados duraderos sin frizz.",
        duration: 180,
        price: 110,
        proIdx: [0],
        requiresDeposit: true,
        depositAmount: 40,
      },
      {
        name: "Color Raíz",
        category: "Color",
        description: "Retoque de raíz para mantener tu color impecable.",
        duration: 75,
        price: 40,
        proIdx: [0, 1],
      },
      {
        name: "Peinado de Evento",
        category: "Peinado",
        description:
          "Recogido o semirecogido profesional para ocasiones especiales.",
        duration: 60,
        price: 45,
        proIdx: [0],
        requiresDeposit: true,
        depositAmount: 15,
      },
    ],
    gallery: [
      {
        title: "Balayage miel",
        description: "Color a mano alzada con transiciones suaves",
        category: "Color",
        image: img("1595476108010-b4d1f102b1b1", 800),
      },
      {
        title: "Rubio ceniza",
        description: "Iluminación fría y luminosa",
        category: "Color",
        image: img("1521590832167-7bcbfaa6381f", 800),
      },
      {
        title: "Corte bob texturizado",
        description: "Corte moderno con movimiento",
        category: "Cabello",
        image: img("1562322140-8baeececf3df", 800),
      },
      {
        title: "Recogido de novia",
        description: "Peinado elegante para tu gran día",
        category: "Peinado",
        image: img("1633681926022-84c23e8cb2d6", 800),
      },
    ],
    reviews: [
      {
        name: "Andreína Lugo",
        phone: "+584141000001",
        rating: 5,
        comment:
          "Valentina entendió justo el rubio que quería. Quedé feliz, súper recomendado.",
        daysAgo: 6,
      },
      {
        name: "María José Pérez",
        phone: "+584141000002",
        rating: 5,
        comment:
          "El mejor balayage que me he hecho en Caracas. Ambiente precioso.",
        daysAgo: 12,
      },
      {
        name: "Gabriela Torres",
        phone: "+584141000003",
        rating: 4,
        comment: "Excelente atención y resultado. Volveré sin duda.",
        daysAgo: 20,
      },
    ],
  },
  // ───────────────────────── Nails by Sophie (nail studio) ─────────────────────────
  {
    slug: "nailsbysophie",
    name: "Nails by Sophie",
    businessType: "Nail Studio",
    description:
      "Manos perfectas, todos los días. Nail art, esmaltado permanente y diseños de autor.",
    keywords: [
      "uñas",
      "nail art",
      "manicure",
      "pedicure",
      "esmaltado permanente",
      "caracas",
      "nails by sophie",
    ],
    city: "Caracas",
    phone: "+584142223344",
    whatsapp: "+584142223344",
    instagram: "nailsbysophie",
    theme: {
      primaryColor: "#EC4899",
      secondaryColor: "#BE185D",
      bannerUrl: img("1604654894610-df63bc536371", 1600),
    },
    professionals: [
      {
        name: "Sophie Castro",
        role: "Nail Artist",
        specialties: ["Nail Art", "Acrílicas", "Diseños"],
        bio: "Apasionada del detalle. Cada diseño es una pieza única hecha para ti.",
        avatar: img("1500648767791-00dcc994a43e", 400),
        instagram: "@sophie.nails",
      },
      {
        name: "Andrea Luna",
        role: "Manicurista",
        specialties: ["Manicure", "Pedicure", "Gel"],
        bio: "Especialista en cuidado de manos y pies con acabados impecables.",
        avatar: img("1573496359142-b8d87734a5a2", 400),
      },
    ],
    services: [
      {
        name: "Manicure Clásica",
        category: "Uñas",
        description: "Limado, cutículas y esmaltado. Incluye hidratación.",
        duration: 40,
        price: 15,
        proIdx: [0, 1],
        addons: [{ name: "Esmaltado Permanente", price: 8, duration: 15 }],
      },
      {
        name: "Esmaltado Permanente",
        category: "Uñas",
        description: "Color de larga duración con brillo de salón por semanas.",
        duration: 50,
        price: 22,
        proIdx: [0, 1],
      },
      {
        name: "Nail Art Premium",
        category: "Uñas",
        description: "Diseños personalizados, pedrería y detalles a mano.",
        duration: 75,
        price: 30,
        proIdx: [0],
      },
      {
        name: "Pedicure Spa",
        category: "Uñas",
        description:
          "Exfoliación, masaje y esmaltado. Relájate de pies a cabeza.",
        duration: 60,
        price: 25,
        proIdx: [1],
      },
      {
        name: "Uñas Acrílicas",
        category: "Uñas",
        description:
          "Extensión y modelado acrílico con el largo y forma que quieras.",
        duration: 90,
        price: 40,
        proIdx: [0],
      },
      {
        name: "Baño en Gel",
        category: "Uñas",
        description:
          "Refuerzo en gel para uñas naturales fuertes y brillantes.",
        duration: 55,
        price: 28,
        proIdx: [0, 1],
      },
    ],
    gallery: [
      {
        title: "French moderno",
        description: "Clásico reinventado",
        category: "Uñas",
        image: img("1607779097040-26e80aa78e66", 800),
      },
      {
        title: "Nail art floral",
        description: "Diseño pintado a mano",
        category: "Uñas",
        image: img("1632345031435-8727f6897d53", 800),
      },
      {
        title: "Tonos nude",
        description: "Elegancia minimalista",
        category: "Uñas",
        image: img("1604902396830-aca29e19b067", 800),
      },
      {
        title: "Diseño con pedrería",
        description: "Detalles que brillan",
        category: "Uñas",
        image: img("1519014816548-bf5fe059798b", 800),
      },
    ],
    reviews: [
      {
        name: "Valeria Ríos",
        phone: "+584142000001",
        rating: 5,
        comment:
          "Sophie es una artista. Mis uñas duraron perfectas más de 3 semanas.",
        daysAgo: 4,
      },
      {
        name: "Carla Domínguez",
        phone: "+584142000002",
        rating: 5,
        comment: "Súper detallista y puntual. El nail art quedó increíble.",
        daysAgo: 9,
      },
      {
        name: "Patricia Gómez",
        phone: "+584142000003",
        rating: 5,
        comment: "El mejor lugar para uñas en la ciudad. Recomendadísimo.",
        daysAgo: 16,
      },
    ],
  },
  // ───────────────────────── Spa Renacer (spa wellness) ─────────────────────────
  {
    slug: "sparenacer",
    name: "Spa Renacer",
    businessType: "Spa & Wellness",
    description:
      "Tu pausa, tu santuario. Masajes, faciales y rituales de bienestar para reconectar.",
    keywords: [
      "spa",
      "masajes",
      "facial",
      "bienestar",
      "relajación",
      "aromaterapia",
      "caracas",
      "spa renacer",
    ],
    city: "Caracas",
    phone: "+584143334455",
    whatsapp: "+584143334455",
    instagram: "sparenacer",
    theme: {
      primaryColor: "#6B9166",
      secondaryColor: "#3A5A3A",
      bannerUrl: img("1540555700478-4be289fbecef", 1600),
    },
    professionals: [
      {
        name: "Lucía Herrera",
        role: "Terapeuta",
        specialties: [
          "Masaje relajante",
          "Descontracturante",
          "Piedras calientes",
        ],
        bio: "Terapeuta certificada enfocada en aliviar tensión y restaurar energía.",
        avatar: img("1507003211169-0a1dd7228f2d", 400),
        instagram: "@lucia.renacer",
      },
      {
        name: "Camila Soto",
        role: "Esteticista",
        specialties: ["Faciales", "Exfoliación", "Aromaterapia"],
        bio: "Especialista en rituales faciales y cuidado de la piel personalizado.",
        avatar: img("1580489944761-15a19d654956", 400),
      },
    ],
    services: [
      {
        name: "Masaje Relajante",
        category: "Masajes",
        description:
          "Masaje corporal de 60 min para liberar tensión y calmar la mente.",
        duration: 60,
        price: 45,
        proIdx: [0],
      },
      {
        name: "Masaje Descontracturante",
        category: "Masajes",
        description: "Presión terapéutica enfocada en zonas de contractura.",
        duration: 60,
        price: 55,
        proIdx: [0],
      },
      {
        name: "Facial Hidratante",
        category: "Faciales",
        description: "Limpieza profunda, exfoliación y mascarilla nutritiva.",
        duration: 60,
        price: 50,
        proIdx: [1],
        requiresDeposit: true,
        depositAmount: 15,
      },
      {
        name: "Ritual de Aromaterapia",
        category: "Bienestar",
        description:
          "Masaje con aceites esenciales para equilibrio cuerpo-mente.",
        duration: 75,
        price: 65,
        proIdx: [0, 1],
      },
      {
        name: "Exfoliación Corporal",
        category: "Bienestar",
        description:
          "Renueva tu piel con exfoliación y hidratación de cuerpo completo.",
        duration: 50,
        price: 40,
        proIdx: [1],
      },
      {
        name: "Día de Spa",
        category: "Bienestar",
        description:
          "Experiencia de 3 horas: masaje, facial y ritual de relajación.",
        duration: 180,
        price: 120,
        proIdx: [0, 1],
        requiresDeposit: true,
        depositAmount: 40,
      },
    ],
    gallery: [
      {
        title: "Masaje relajante",
        description: "Libera la tensión del día",
        category: "Masajes",
        image: img("1544161515-4ab6ce6db874", 800),
      },
      {
        title: "Sala de tratamientos",
        description: "Un ambiente para desconectar",
        category: "Bienestar",
        image: img("1519823551278-64ac92734fb1", 800),
      },
      {
        title: "Ritual de aromaterapia",
        description: "Aceites esenciales para reconectar",
        category: "Bienestar",
        image: img("1571019613454-1cb2f99b2d8b", 800),
      },
      {
        title: "Facial revitalizante",
        description: "Piel renovada y luminosa",
        category: "Faciales",
        image: img("1600334129128-685c5582fd35", 800),
      },
    ],
    reviews: [
      {
        name: "Roberto Vásquez",
        phone: "+584143000001",
        rating: 5,
        comment:
          "Salí renovado. El masaje descontracturante de Lucía es excelente.",
        daysAgo: 5,
      },
      {
        name: "Isabel Mora",
        phone: "+584143000002",
        rating: 5,
        comment: "El facial dejó mi piel increíble. Un oasis de paz, volveré.",
        daysAgo: 11,
      },
      {
        name: "Fernando Silva",
        phone: "+584143000003",
        rating: 4,
        comment:
          "Muy buena atención y ambiente. El día de spa vale cada minuto.",
        daysAgo: 18,
      },
    ],
  },
];

async function seedOneDemo(db: mongoose.mongo.Db, demo: DemoConfig) {
  const now = new Date();
  const tenants = db.collection("tenants");
  const storefrontconfigs = db.collection("storefrontconfigs");
  const professionals = db.collection("professionals");
  const beautyservices = db.collection("beautyservices");
  const gallery = db.collection("beautygalleryitems");
  const reviews = db.collection("beautyreviews");

  // 1) Tenant — idempotente: reusa por slug (o por config previa con cualquiera de las
  //    dos formas de domain de runs anteriores).
  const existingTenant =
    (await tenants.findOne({ slug: demo.slug })) ||
    (await (async () => {
      const cfg = await storefrontconfigs.findOne({
        domain: { $in: [demo.slug, `${demo.slug}.smartkubik.com`] },
      });
      return cfg
        ? await tenants.findOne({
            _id: new Types.ObjectId(String(cfg.tenantId)),
          })
        : null;
    })());
  let tenantOid: Types.ObjectId;
  if (existingTenant) {
    tenantOid = existingTenant._id as Types.ObjectId;
    await tenants.updateOne(
      { _id: tenantOid },
      {
        $set: {
          name: demo.name,
          slug: demo.slug,
          businessType: demo.businessType,
          vertical: "SERVICES",
          isActive: true,
          updatedAt: now,
        },
      },
    );
  } else {
    const t = await tenants.insertOne({
      name: demo.name,
      slug: demo.slug,
      businessType: demo.businessType,
      vertical: "SERVICES",
      isActive: true,
      subscriptionPlan: "premium",
      status: "active",
      contactInfo: {
        phone: demo.phone,
        address: { city: demo.city, country: "Venezuela" },
      },
      createdAt: now,
      updatedAt: now,
    });
    tenantOid = t.insertedId as unknown as Types.ObjectId;
  }
  const tenantStr = tenantOid.toString();

  // 2) StorefrontConfig — tenantId como STRING (como savabarberia). Limpia configs
  //    previas por ambas formas de domain y por tenantId (string u ObjectId de runs viejos).
  await storefrontconfigs.deleteMany({
    $or: [
      { domain: { $in: [demo.slug, `${demo.slug}.smartkubik.com`] } },
      { tenantId: { $in: [tenantStr, tenantOid] } },
    ],
  });
  await storefrontconfigs.insertOne({
    tenantId: tenantStr,
    domain: demo.slug,
    name: demo.name,
    isActive: true,
    templateType: "beauty",
    theme: {
      primaryColor: demo.theme.primaryColor,
      secondaryColor: demo.theme.secondaryColor,
      bannerUrl: demo.theme.bannerUrl,
    },
    seo: {
      title: demo.name,
      description: demo.description,
      keywords: demo.keywords,
    },
    socialMedia: { instagram: demo.instagram, whatsapp: demo.whatsapp },
    contactInfo: {
      email: `contacto@${demo.slug}.smartkubik.com`,
      phone: demo.phone,
      address: {
        street: "Av. Principal",
        city: demo.city,
        country: "Venezuela",
      },
    },
    beautyConfig: {
      enabled: true,
      businessHours: BUSINESS_HOURS,
      bookingSettings: BOOKING_SETTINGS,
      paymentMethods: ["cash", "card", "transfer"],
      loyalty: { enabled: false },
    },
    createdAt: now,
    updatedAt: now,
  });

  // 3) Professionals — tenantId como ObjectId
  await professionals.deleteMany({ tenantId: { $in: [tenantOid, tenantStr] } });
  const proResult = await professionals.insertMany(
    demo.professionals.map((p, i) => ({
      tenantId: tenantOid,
      createdBy: SYSTEM_AUTHOR,
      name: p.name,
      role: p.role,
      bio: p.bio,
      specialties: p.specialties,
      avatar: p.avatar,
      instagram: p.instagram,
      images: [],
      serviceIds: [],
      schedule: SCHEDULE,
      isActive: true,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    })),
  );
  const proIds = Object.values(proResult.insertedIds) as Types.ObjectId[];

  // 4) BeautyServices
  await beautyservices.deleteMany({
    tenantId: { $in: [tenantOid, tenantStr] },
  });
  await beautyservices.insertMany(
    demo.services.map((s, i) => ({
      tenantId: tenantOid,
      createdBy: SYSTEM_AUTHOR,
      name: s.name,
      category: s.category,
      description: s.description,
      duration: s.duration,
      bufferBefore: 0,
      bufferAfter: 15,
      price: { amount: s.price, currency: "USD" },
      professionals: s.proIdx.map((idx) => proIds[idx]),
      images: [],
      addons: (s.addons ?? []).map((a) => ({ ...a, isActive: true })),
      requiresDeposit: !!s.requiresDeposit,
      depositType: "fixed",
      depositAmount: s.depositAmount ?? 0,
      maxAdvanceBooking: 30,
      minAdvanceBooking: 2,
      maxSimultaneous: 1,
      tags: [],
      isActive: true,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    })),
  );

  // 5) Gallery — usa title/description (forma del demo vivo)
  await gallery.deleteMany({ tenantId: { $in: [tenantOid, tenantStr] } });
  await gallery.insertMany(
    demo.gallery.map((g, i) => ({
      tenantId: tenantOid,
      createdBy: SYSTEM_AUTHOR,
      title: g.title,
      caption: g.title,
      description: g.description,
      category: g.category,
      image: g.image,
      professional: proIds[0],
      isPinned: i === 0,
      isActive: true,
      tags: [],
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    })),
  );

  // 6) Reviews
  await reviews.deleteMany({ tenantId: { $in: [tenantOid, tenantStr] } });
  await reviews.insertMany(
    demo.reviews.map((r) => ({
      tenantId: tenantOid,
      createdBy: SYSTEM_AUTHOR,
      client: { name: r.name, phone: r.phone },
      rating: r.rating,
      comment: r.comment,
      isApproved: true,
      createdAt: new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000),
    })),
  );

  return {
    tenantStr,
    pros: proIds.length,
    services: demo.services.length,
    gallery: demo.gallery.length,
    reviews: demo.reviews.length,
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI no está definido en el .env");

  console.log(
    "🌱 Seed multi-demo Beauty (standalone) → studiobella, nailsbysophie, sparenacer\n",
  );
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db!;
  console.log(`Conectado a DB: ${mongoose.connection.name}\n`);

  try {
    for (const demo of DEMOS) {
      console.log(`→ ${demo.name} (${demo.slug})...`);
      const r = await seedOneDemo(db, demo);
      console.log(
        `  ✅ tenant=${r.tenantStr} | https://${demo.slug}.smartkubik.com | ${r.pros} pros · ${r.services} servicios · ${r.gallery} galería · ${r.reviews} reseñas\n`,
      );
    }
    console.log("🎉 Listo. Verifica:");
    for (const d of DEMOS) console.log(`   https://${d.slug}.smartkubik.com`);
  } finally {
    await mongoose.disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  });
