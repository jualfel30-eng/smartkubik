// Centralized documentation index with metadata
// This file maps all documentation articles for easy navigation and SEO
// Categories organized as a user-facing help center (8 groups, problem-oriented)

export const docsIndex = {
  inventario: {
    title: "Inventario y Productos",
    description: "Stock, productos, ajustes, lotes, alertas y conteos",
    icon: "Boxes",
    color: "emerald",
    articles: [
      {
        slug: "gestionar-productos",
        title: "Cómo Crear y Gestionar Productos",
        description: "Aprende a registrar productos, configurar variantes, precios, unidades de venta, y usar el escaneo de etiquetas con IA.",
        readTime: "10 min",
        keywords: ["productos", "variantes", "SKU", "crear producto", "catálogo", "escaneo etiqueta"],
        featured: true,
        quickAnswer: "1. Ve a Inventario → Productos\n2. Haz clic en \"Nuevo Producto\"\n3. Llena nombre, SKU, precio y categoría\n4. Agrega variantes si aplica\n5. Guarda el producto",
      },
      {
        slug: "control-de-stock",
        title: "Control de Stock: Ajustes, Lotes y Alertas",
        description: "Todo sobre el inventario: cómo ajustar cantidades, manejar lotes con vencimiento, configurar alertas de stock bajo, y hacer conteos masivos.",
        readTime: "12 min",
        keywords: ["inventario", "stock", "ajuste", "lotes", "vencimiento", "alertas", "conteo físico", "merma"],
        featured: true,
        quickAnswer: "1. Ve a Inventario → Inventario\n2. Busca el producto\n3. Haz clic en [+] o [-] junto a la cantidad\n4. Selecciona la razón del ajuste\n5. Confirma",
      },
      {
        slug: "problemas-inventario",
        title: "Problemas Comunes de Inventario y Cómo Resolverlos",
        description: "Soluciones a los problemas más frecuentes: stock que no cuadra, productos que no aparecen, alertas que no llegan, y más.",
        readTime: "6 min",
        keywords: ["problemas", "inventario", "stock no cuadra", "producto no aparece", "error", "solución"],
        featured: false,
        quickAnswer: "Stock no cuadra: Inventario → Conteo Físico → compara y ajusta.\nProducto no aparece: revisa filtros y categoría.\nAlertas no llegan: Configuración → Notificaciones → activa alertas de stock.",
      },
    ],
  },
  ventas: {
    title: "Ventas y Cobros",
    description: "POS, caja registradora, pagos, facturas y cierre de caja",
    icon: "ShoppingCart",
    color: "blue",
    articles: [
      {
        slug: "crear-ventas-pos",
        title: "Cómo Crear Ventas en el Punto de Venta (POS)",
        description: "Guía paso a paso para vender: buscar productos, escanear códigos, aplicar descuentos, cobrar con múltiples métodos, y generar factura.",
        readTime: "12 min",
        keywords: ["POS", "venta", "cobrar", "factura", "descuento", "pago", "punto de venta"],
        featured: true,
        quickAnswer: "1. Ve a Órdenes → Nueva Orden\n2. Busca o escanea el producto\n3. Ajusta cantidad y descuentos\n4. Presiona F4 o \"Cobrar\"\n5. Selecciona método de pago y confirma",
      },
      {
        slug: "caja-registradora",
        title: "Cómo Abrir, Usar y Cerrar la Caja Registradora",
        description: "Todo sobre el ciclo de la caja: apertura con conteo de billetes, movimientos durante el turno, y cierre con cuadre automático.",
        readTime: "8 min",
        keywords: ["caja registradora", "apertura", "cierre", "cuadre", "billetes", "denominaciones", "turno"],
        featured: false,
        quickAnswer: "Abrir: Caja → Abrir Caja → cuenta billetes → confirma.\nCerrar: Caja → Cerrar Caja → cuenta billetes → el sistema compara con ventas → confirma.",
      },
      {
        slug: "problemas-ventas",
        title: "Problemas Comunes de Ventas y Cómo Resolverlos",
        description: "Soluciones a: pagos que no se registran, IGTF incorrecto, orden que no se puede completar, caja que no cuadra, y más.",
        readTime: "6 min",
        keywords: ["problemas", "ventas", "pago", "IGTF", "caja", "error", "solución"],
        featured: false,
        quickAnswer: "Pago no registra: verifica que la caja esté abierta.\nIGTF incorrecto: revisa Configuración → Impuestos.\nCaja no cuadra: revisa movimientos manuales del turno.",
      },
    ],
  },
  compras: {
    title: "Compras y Proveedores",
    description: "Órdenes de compra, proveedores, recepción de mercancía",
    icon: "Truck",
    color: "purple",
    articles: [
      {
        slug: "ordenes-de-compra",
        title: "Cómo Crear y Recibir Órdenes de Compra",
        description: "Guía completa: crear una orden, seleccionar proveedor, agregar productos, configurar condiciones de pago, y recibir la mercancía.",
        readTime: "10 min",
        keywords: ["compras", "orden de compra", "proveedor", "recibir mercancía", "crédito", "adelanto"],
        featured: true,
        quickAnswer: "1. Ve a Compras → Nueva Orden\n2. Selecciona el proveedor\n3. Agrega productos y cantidades\n4. Configura condiciones de pago\n5. Envía la orden → cuando llegue, haz clic en \"Recibir\"",
      },
      {
        slug: "gestionar-proveedores",
        title: "Cómo Gestionar Proveedores",
        description: "Aprende a crear proveedores, vincular productos, configurar condiciones de pago, y revisar el historial de compras por proveedor.",
        readTime: "7 min",
        keywords: ["proveedores", "RIF", "condiciones de pago", "vincular productos", "historial"],
        featured: false,
        quickAnswer: "1. Ve a Proveedores → Nuevo Proveedor\n2. Llena nombre, RIF, contacto\n3. Configura condiciones de pago\n4. Para vincular productos: edita el producto → pestaña Proveedores",
      },
      {
        slug: "problemas-compras",
        title: "Problemas Comunes de Compras y Cómo Resolverlos",
        description: "Soluciones a: proveedor que no aparece, stock que no se actualiza al recibir, RIF inválido, y más.",
        readTime: "5 min",
        keywords: ["problemas", "compras", "proveedor no aparece", "stock", "RIF", "error", "solución"],
        featured: false,
        quickAnswer: "Proveedor no aparece: escribe mín. 2 caracteres en el buscador.\nStock no se actualiza: verifica que hayas hecho clic en \"Recibir\" la orden.\nRIF inválido: usa formato J-12345678 o V-12345678.",
      },
    ],
  },
  finanzas: {
    title: "Finanzas y Contabilidad",
    description: "Contabilidad, facturación, cuentas por pagar, bancos y retenciones",
    icon: "Calculator",
    color: "amber",
    articles: [
      {
        slug: "contabilidad-general",
        title: "Contabilidad: Plan de Cuentas, Asientos y Reportes",
        description: "Cómo funciona la contabilidad en SmartKubik: plan de cuentas, asientos automáticos, estados financieros, y períodos contables.",
        readTime: "12 min",
        keywords: ["contabilidad", "plan de cuentas", "asiento", "balance", "P&L", "período contable"],
        featured: true,
        quickAnswer: "1. Ve a Finanzas → Contabilidad\n2. El plan de cuentas viene preconfigurado\n3. Los asientos se generan automáticamente con cada venta/compra\n4. Para reportes: Finanzas → Reportes → selecciona Balance o Estado de Resultados",
      },
      {
        slug: "facturacion-fiscal",
        title: "Facturación Electrónica y Retenciones (IVA/ISLR)",
        description: "Cómo emitir facturas, notas de crédito/débito, gestionar retenciones de IVA e ISLR, y preparar la declaración de IVA.",
        readTime: "10 min",
        keywords: ["facturación", "factura", "IVA", "ISLR", "retención", "SENIAT", "nota de crédito"],
        featured: false,
        quickAnswer: "Emitir factura: al cobrar una venta, activa \"Generar factura\".\nRetención IVA: Finanzas → Retenciones → Nueva → selecciona factura.\nNota de crédito: desde la venta original → \"Nota de Crédito\".",
      },
      {
        slug: "cuentas-por-pagar",
        title: "Cuentas por Pagar y Cuentas Bancarias",
        description: "Cómo gestionar deudas con proveedores, registrar pagos, conciliar cuentas bancarias, y hacer transferencias entre cuentas.",
        readTime: "8 min",
        keywords: ["cuentas por pagar", "banco", "conciliación", "transferencia", "pago a proveedor"],
        featured: false,
        quickAnswer: "1. Ve a Finanzas → Cuentas por Pagar\n2. Verás todas las deudas pendientes\n3. Para pagar: selecciona la deuda → \"Registrar Pago\"\n4. Conciliar banco: Finanzas → Bancos → Conciliar",
      },
    ],
  },
  transferencias: {
    title: "Transferencias y Almacenes",
    description: "Mover mercancía entre almacenes o sedes",
    icon: "ArrowRightLeft",
    color: "cyan",
    articles: [
      {
        slug: "transferir-mercancia",
        title: "Cómo Transferir Mercancía entre Almacenes o Sedes",
        description: "Guía para crear, aprobar, despachar y recibir transferencias. Incluye modo PUSH, PULL, express, y cross-tenant.",
        readTime: "10 min",
        keywords: ["transferencia", "traslado", "almacén", "sede", "despacho", "recepción"],
        featured: false,
        quickAnswer: "1. Ve a Transferencias → Nueva Transferencia\n2. Selecciona almacén origen y destino\n3. Agrega productos y cantidades\n4. Guarda → Aprueba → Despacha\n5. En destino: \"Recibir\" la transferencia",
      },
      {
        slug: "problemas-transferencias",
        title: "Problemas Comunes de Transferencias y Cómo Resolverlos",
        description: "Soluciones a: despacho que falla, cantidades que no coinciden, producto que no aparece en el almacén destino.",
        readTime: "5 min",
        keywords: ["problemas", "transferencia", "despacho falla", "stock", "error", "solución"],
        featured: false,
        quickAnswer: "Despacho falla: verifica que haya stock suficiente en origen.\nCantidades no coinciden: revisa la unidad de medida seleccionada.\nProducto no aparece en destino: confirma que la transferencia fue recibida.",
      },
    ],
  },
  clientes: {
    title: "Clientes y CRM",
    description: "Contactos, pipeline de ventas y programa de lealtad",
    icon: "Users",
    color: "pink",
    articles: [
      {
        slug: "gestionar-clientes",
        title: "Cómo Gestionar Clientes, Proveedores y Contactos",
        description: "Todo sobre el CRM: crear contactos, tipos de cliente, pipeline de ventas, programa de lealtad, y seguimiento de interacciones.",
        readTime: "8 min",
        keywords: ["clientes", "CRM", "contactos", "proveedores", "lealtad", "pipeline"],
        featured: false,
        quickAnswer: "1. Ve a Clientes → Nuevo Cliente\n2. Llena nombre, teléfono, email, RIF\n3. Selecciona tipo: persona, empresa, o proveedor\n4. Para lealtad: Clientes → Programa de Lealtad → configura puntos",
      },
    ],
  },
  configuracion: {
    title: "Configuración",
    description: "Usuarios, roles, permisos, seguridad y ajustes del negocio",
    icon: "Settings",
    color: "slate",
    articles: [
      {
        slug: "usuarios-roles-permisos",
        title: "Cómo Gestionar Usuarios, Roles y Permisos",
        description: "Aprende a crear usuarios, asignar roles con permisos específicos, habilitar 2FA, y cambiar entre organizaciones.",
        readTime: "8 min",
        keywords: ["usuarios", "roles", "permisos", "seguridad", "2FA", "organización", "login"],
        featured: false,
        quickAnswer: "1. Ve a Configuración → Usuarios\n2. Haz clic en \"Nuevo Usuario\"\n3. Asigna un rol (Administrador, Vendedor, etc.)\n4. Los permisos se configuran por rol en Configuración → Roles",
      },
    ],
  },
  restaurante: {
    title: "Restaurantes",
    description: "Mesas, cocina (KDS), reservaciones, menú y división de cuentas",
    icon: "UtensilsCrossed",
    color: "orange",
    articles: [
      {
        slug: "guia-restaurante",
        title: "Guía Completa para Restaurantes: Mesas, Cocina, Reservaciones y Menú",
        description: "Todo lo que necesitas para operar un restaurante: mesas, pantalla de cocina, reservaciones, división de cuentas, lista de espera y análisis de menú.",
        readTime: "15 min",
        keywords: ["restaurante", "mesas", "cocina", "KDS", "reservaciones", "menú", "división de cuentas"],
        featured: true,
        quickAnswer: "Abrir mesa: Mesas → toca una mesa libre → agrega productos.\nEnviar a cocina: desde la mesa → \"Enviar a Cocina\".\nCobrar: Mesa → \"Cobrar\" → divide cuenta si necesitas.",
      },
    ],
  },
  salon: {
    title: "Salones y Servicios",
    description: "Citas, profesionales, disponibilidad, depósitos y WhatsApp",
    icon: "Scissors",
    color: "rose",
    articles: [
      {
        slug: "guia-salon-belleza",
        title: "Guía Completa para Salones de Belleza: Citas, Profesionales y Clientes",
        description: "Agendar citas, gestionar profesionales, depósitos, programa de lealtad, y notificaciones automáticas por WhatsApp.",
        readTime: "12 min",
        keywords: ["salón", "belleza", "citas", "profesional", "WhatsApp", "depósito", "no-show"],
        featured: true,
        quickAnswer: "Crear cita: Agenda → clic en hora libre → selecciona cliente y servicio → confirma.\nAgregar profesional: Equipo → Nuevo Profesional → configura horarios.\nNotificar por WhatsApp: se envía automáticamente al confirmar la cita.",
      },
    ],
  },
  produccion: {
    title: "Producción",
    description: "Recetas (BOM), órdenes de manufactura, calidad y mermas",
    icon: "Factory",
    color: "red",
    articles: [
      {
        slug: "guia-produccion",
        title: "Guía de Producción: Recetas, Órdenes de Manufactura y Control de Calidad",
        description: "Cómo definir recetas, crear órdenes de producción, planificar materiales (MRP), controlar calidad, y gestionar mermas.",
        readTime: "12 min",
        keywords: ["producción", "recetas", "BOM", "manufactura", "MRP", "calidad", "merma"],
        featured: false,
        quickAnswer: "1. Ve a Producción → Recetas → crea la receta con ingredientes\n2. Producción → Nueva Orden → selecciona receta y cantidad\n3. El sistema calcula materiales necesarios\n4. Completa la orden → stock del producto final se actualiza",
      },
    ],
  },
  rrhh: {
    title: "RRHH y Nómina",
    description: "Empleados, nómina, comisiones, propinas y turnos",
    icon: "UserCog",
    color: "indigo",
    articles: [
      {
        slug: "guia-nomina",
        title: "Guía de Nómina: Empleados, Corridas de Pago, Comisiones y Propinas",
        description: "Cómo gestionar empleados, ejecutar nómina, configurar comisiones y metas de ventas, distribuir propinas, y controlar turnos.",
        readTime: "12 min",
        keywords: ["nómina", "empleados", "comisiones", "propinas", "turnos", "metas", "bonos"],
        featured: false,
        quickAnswer: "1. Ve a RRHH → Empleados → registra al empleado\n2. Configura salario, comisiones y bonos\n3. Para correr nómina: RRHH → Nómina → Nueva Corrida\n4. Revisa el desglose y confirma el pago",
      },
    ],
  },
  "marketing-docs": {
    title: "Marketing",
    description: "Campañas, promociones, cupones y programa de lealtad",
    icon: "Megaphone",
    color: "violet",
    articles: [
      {
        slug: "guia-marketing",
        title: "Guía de Marketing: Campañas, Promociones, Cupones y Lealtad",
        description: "Cómo crear campañas, configurar promociones y cupones, gestionar lealtad, y usar triggers automáticos.",
        readTime: "10 min",
        keywords: ["marketing", "campañas", "promociones", "cupones", "lealtad", "WhatsApp"],
        featured: false,
        quickAnswer: "1. Ve a Marketing → Nueva Campaña\n2. Selecciona canal (WhatsApp, email, SMS)\n3. Configura audiencia y mensaje\n4. Promociones: Marketing → Promociones → configura descuento y condiciones",
      },
    ],
  },
  flujos: {
    title: "Flujos Completos",
    description: "Guías que explican procesos que cruzan varios módulos de punta a punta",
    icon: "ArrowRightLeft",
    color: "cyan",
    articles: [
      {
        slug: "compra-a-stock",
        title: "De Compra a Stock: El Flujo Completo",
        description: "Qué pasa desde que haces una orden de compra hasta que el producto aparece en tu inventario y se genera la cuenta por pagar.",
        readTime: "5 min",
        keywords: ["compra", "stock", "inventario", "proveedor", "recibir", "cuenta por pagar", "flujo"],
        featured: true,
        quickAnswer: "1. Creas la orden (Compras → Nueva)\n2. Apruebas (opcional)\n3. Marcas 'Recibido' cuando llega\n4. Automático: stock sube + proveedor se vincula + cuenta por pagar creada",
      },
      {
        slug: "ciclo-de-venta",
        title: "Ciclo de una Venta: De Producto a Cobro",
        description: "Qué pasa desde que el cliente elige un producto hasta que se cobra, se factura, se despacha y se descuenta del inventario.",
        readTime: "6 min",
        keywords: ["venta", "orden", "cobro", "factura", "inventario", "fulfillment", "flujo"],
        featured: true,
        quickAnswer: "1. Agrega productos al carrito\n2. Cobra (multi-método)\n3. Genera factura\n4. Sistema descuenta inventario y registra contabilidad",
      },
      {
        slug: "transferencia-completa",
        title: "Transferencia entre Almacenes: Paso a Paso",
        description: "El flujo completo de mover mercancía de un almacén a otro: crear, aprobar, despachar, y recibir.",
        readTime: "4 min",
        keywords: ["transferencia", "almacén", "despacho", "recibir", "sede", "flujo"],
        featured: false,
        quickAnswer: "1. Crear transferencia (origen→destino)\n2. Aprobar\n3. Despachar (descuenta origen - irreversible)\n4. Recibir en destino (suma stock)",
      },
    ],
  },
  recursos: {
    title: "Recursos Educativos",
    description: "Artículos educativos sobre ERP, inventario y mejores prácticas",
    icon: "GraduationCap",
    color: "gray",
    articles: [
      {
        slug: "que-es-erp",
        title: "¿Qué es un ERP y Por Qué tu Negocio lo Necesita en 2025?",
        description: "Guía completa sobre sistemas ERP: qué son, cómo funcionan, beneficios y cómo elegir el mejor ERP para PyMEs.",
        readTime: "12 min",
        keywords: ["qué es un ERP", "sistema ERP", "ERP para pymes", "software de gestión"],
        featured: true,
        quickAnswer: "Un ERP (Enterprise Resource Planning) es un software que integra todas las operaciones de tu negocio en un solo lugar: inventario, ventas, compras, finanzas y más. Reduce errores, ahorra tiempo y te da visibilidad total de tu negocio.",
      },
      {
        slug: "fifo-vs-fefo",
        title: "FIFO vs FEFO: Qué son, Diferencias y Cuál Usar en tu Negocio",
        description: "Guía completa sobre métodos FIFO y FEFO de rotación de inventario y cuál usar según tu industria.",
        readTime: "7 min",
        keywords: ["FIFO", "FEFO", "rotación de inventario", "control de caducidad"],
        featured: false,
        quickAnswer: "FIFO: lo primero que entra, primero que sale (ideal para retail).\nFEFO: lo primero que vence, primero que sale (ideal para alimentos/farma).\nSmartKubik soporta ambos: configúralo en Inventario → Configuración.",
      },
      {
        slug: "reducir-desperdicio-alimentos",
        title: "Cómo Reducir el Desperdicio de Alimentos en tu Restaurante hasta un 30%",
        description: "Descubre cómo SmartKubik ayuda a restaurantes a reducir el desperdicio de alimentos, controlar inventarios y aumentar rentabilidad.",
        readTime: "8 min",
        keywords: ["desperdicio de alimentos", "control de inventario restaurante", "reducir costos"],
        featured: false,
        quickAnswer: "1. Activa alertas de vencimiento en Inventario → Alertas\n2. Usa FEFO para rotar productos perecederos\n3. Revisa el reporte de mermas semanalmente\n4. Ajusta las cantidades de compra según el historial de ventas",
      },
      {
        slug: "control-inventario-tienda",
        title: "Control de Inventario para Tiendas y Supermercados: Guía Completa 2025",
        description: "Aprende cómo implementar un sistema ERP para controlar inventario en retail, reducir pérdidas y mejorar rotación.",
        readTime: "10 min",
        keywords: ["control de inventario retail", "sistema para tiendas", "ERP supermercado"],
        featured: false,
        quickAnswer: "1. Registra todos tus productos con SKU y código de barras\n2. Haz un conteo físico inicial\n3. Configura alertas de stock bajo\n4. Usa el escáner para entradas y salidas\n5. Revisa reportes de rotación mensualmente",
      },
      {
        slug: "gestion-almacen",
        title: "Gestión de Almacén y Logística: Cómo Optimizar tu Centro de Distribución",
        description: "Guía completa para optimizar la gestión de almacenes con WMS integrado. Mejora picking y reduce errores.",
        readTime: "9 min",
        keywords: ["gestión de almacén", "WMS", "centro de distribución"],
        featured: false,
        quickAnswer: "1. Configura almacenes y ubicaciones en Inventario → Almacenes\n2. Asigna productos a ubicaciones específicas\n3. Usa transferencias para mover mercancía entre almacenes\n4. Revisa el reporte de ocupación por almacén",
      },
    ],
  },
};

// "Lo más buscado" — hardcoded popular problems for the landing page
export const popularSearches = [
  { label: "Ajustar stock", query: "ajustar stock" },
  { label: "Crear una venta", query: "crear venta POS" },
  { label: "Cierre de caja", query: "cierre caja" },
  { label: "Agregar producto", query: "crear producto" },
  { label: "Crear orden de compra", query: "orden de compra" },
  { label: "Transferir mercancía", query: "transferir mercancía" },
  { label: "Facturación", query: "factura IVA" },
  { label: "Crear cita", query: "cita salón" },
];

// Grouped categories for the landing page (8 user-facing groups)
export const landingCategories = [
  { key: "inventario", label: "Inventario", icon: "Boxes", color: "emerald" },
  { key: "ventas", label: "Ventas y Cobros", icon: "ShoppingCart", color: "blue" },
  { key: "compras", label: "Compras", icon: "Truck", color: "purple" },
  { key: "finanzas", label: "Finanzas", icon: "Calculator", color: "amber" },
  { key: "configuracion", label: "Configuración", icon: "Settings", color: "slate" },
  { key: "restaurante", label: "Restaurantes", icon: "UtensilsCrossed", color: "orange" },
  { key: "salon", label: "Salones", icon: "Scissors", color: "rose" },
  { key: "recursos", label: "Recursos", icon: "GraduationCap", color: "gray" },
];

// Module-to-article mapping for contextual HelpButton
export const moduleHelpMap = {
  inventory: "inventario/control-de-stock",
  products: "inventario/gestionar-productos",
  orders: "ventas/crear-ventas-pos",
  cashRegister: "ventas/caja-registradora",
  purchases: "compras/ordenes-de-compra",
  suppliers: "compras/gestionar-proveedores",
  customers: "clientes/gestionar-clientes",
  accounting: "finanzas/contabilidad-general",
  invoicing: "finanzas/facturacion-fiscal",
  transfers: "transferencias/transferir-mercancia",
  users: "configuracion/usuarios-roles-permisos",
  restaurant: "restaurante/guia-restaurante",
  salon: "salon/guia-salon-belleza",
  production: "produccion/guia-produccion",
  payroll: "rrhh/guia-nomina",
  marketing: "marketing-docs/guia-marketing",
};

// Get all articles flattened
export const getAllArticles = () => {
  const articles = [];
  Object.keys(docsIndex).forEach((category) => {
    docsIndex[category].articles.forEach((article) => {
      articles.push({
        ...article,
        category,
        categoryTitle: docsIndex[category].title,
      });
    });
  });
  return articles;
};

// Get featured articles
export const getFeaturedArticles = () => {
  return getAllArticles().filter((article) => article.featured);
};

// Get article by slug
export const getArticleBySlug = (slug) => {
  const allArticles = getAllArticles();
  return allArticles.find((article) => article.slug === slug);
};

// Get articles by category
export const getArticlesByCategory = (category) => {
  return docsIndex[category]?.articles || [];
};

// Search articles — activates on 1+ character, returns quickAnswer when available
export const searchArticles = (query) => {
  if (!query || query.length < 1) return [];
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/).filter(Boolean);

  return getAllArticles()
    .map((article) => {
      const searchable = `${article.title} ${article.description} ${article.keywords.join(' ')}`.toLowerCase();
      // Score: count how many query words appear in the searchable text
      const matchCount = words.filter((w) => searchable.includes(w)).length;
      if (matchCount === 0) return null;
      return { ...article, _score: matchCount / words.length };
    })
    .filter(Boolean)
    .sort((a, b) => b._score - a._score);
};
