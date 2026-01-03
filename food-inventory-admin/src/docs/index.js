// Centralized documentation index with metadata
// This file maps all documentation articles for easy navigation and SEO

export const docsIndex = {
  restaurantes: {
    title: "Restaurantes y Food Service",
    description: "Soluciones ERP para restaurantes, cafeterías, food trucks y servicios de alimentos",
    icon: "UtensilsCrossed",
    color: "orange",
    articles: [
      {
        slug: "reducir-desperdicio-alimentos",
        title: "Cómo Reducir el Desperdicio de Alimentos en tu Restaurante hasta un 30%",
        description: "Descubre cómo SmartKubik ayuda a restaurantes a reducir el desperdicio de alimentos, controlar inventarios y aumentar rentabilidad.",
        readTime: "8 min",
        keywords: ["desperdicio de alimentos", "control de inventario restaurante", "reducir costos", "ERP restaurantes"],
        featured: true,
      },
    ],
  },
  retail: {
    title: "Retail y Comercio",
    description: "Sistemas de gestión para tiendas, supermercados, boutiques y comercio al por menor",
    icon: "Store",
    color: "blue",
    articles: [
      {
        slug: "control-inventario-tienda",
        title: "Control de Inventario para Tiendas y Supermercados: Guía Completa 2025",
        description: "Aprende cómo implementar un sistema ERP para controlar inventario en retail, reducir pérdidas y mejorar rotación.",
        readTime: "10 min",
        keywords: ["control de inventario retail", "sistema para tiendas", "ERP supermercado", "punto de venta"],
        featured: true,
      },
    ],
  },
  logistica: {
    title: "Logística y Almacenes",
    description: "Gestión de almacenes, centros de distribución y operaciones logísticas",
    icon: "Warehouse",
    color: "purple",
    articles: [
      {
        slug: "gestion-almacen",
        title: "Gestión de Almacén y Logística: Cómo Optimizar tu Centro de Distribución",
        description: "Guía completa para optimizar la gestión de almacenes con WMS integrado. Mejora picking y reduce errores.",
        readTime: "9 min",
        keywords: ["gestión de almacén", "WMS", "centro de distribución", "picking eficiente"],
        featured: true,
      },
    ],
  },
  servicios: {
    title: "Servicios",
    description: "Soluciones para hoteles, hospitales, escuelas y empresas de servicios",
    icon: "Briefcase",
    color: "green",
    articles: [],
  },
  manufactura: {
    title: "Manufactura",
    description: "ERP para producción, manufactura y gestión de órdenes de trabajo",
    icon: "Factory",
    color: "red",
    articles: [],
  },
  general: {
    title: "Guías Generales",
    description: "Conceptos, tutoriales y guías aplicables a todas las industrias",
    icon: "BookOpen",
    color: "gray",
    articles: [
      {
        slug: "que-es-erp",
        title: "¿Qué es un ERP y Por Qué tu Negocio lo Necesita en 2025?",
        description: "Guía completa sobre sistemas ERP: qué son, cómo funcionan, beneficios y cómo elegir el mejor ERP para PyMEs.",
        readTime: "12 min",
        keywords: ["qué es un ERP", "sistema ERP", "ERP para pymes", "software de gestión"],
        featured: true,
      },
      {
        slug: "fifo-vs-fefo",
        title: "FIFO vs FEFO: Qué son, Diferencias y Cuál Usar en tu Negocio",
        description: "Guía completa sobre métodos FIFO y FEFO de rotación de inventario y cuál usar según tu industria.",
        readTime: "7 min",
        keywords: ["FIFO", "FEFO", "rotación de inventario", "control de caducidad"],
        featured: true,
      },
    ],
  },
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

// Search articles
export const searchArticles = (query) => {
  const lowerQuery = query.toLowerCase();
  return getAllArticles().filter((article) => {
    return (
      article.title.toLowerCase().includes(lowerQuery) ||
      article.description.toLowerCase().includes(lowerQuery) ||
      article.keywords.some((keyword) => keyword.toLowerCase().includes(lowerQuery))
    );
  });
};
