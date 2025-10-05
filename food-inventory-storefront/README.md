# Food Inventory Storefront

Storefront multi-tenant para el sistema de inventario de alimentos. Construido con Next.js 15, TypeScript y Tailwind CSS.

## 🚀 Características

- **Multi-tenant**: Cada tenant tiene su propia tienda personalizada
- **Templates**: Modern E-commerce y Modern Services
- **Theming dinámico**: Colores, logo y estilos personalizables por tenant
- **ISR (Incremental Static Regeneration)**: Caching inteligente para mejor performance
- **Carrito de compras**: Gestión completa del carrito con localStorage
- **Checkout**: Proceso de compra completo con validación de formularios
- **SEO optimizado**: Metadata dinámica por tenant
- **TypeScript**: Type-safety en todo el proyecto

## 📁 Estructura del Proyecto

```
food-inventory-storefront/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css             # Estilos globales
│   │   └── [domain]/               # Rutas dinámicas por dominio
│   │       ├── layout.tsx          # Layout con theme
│   │       ├── page.tsx            # Homepage
│   │       ├── error.tsx           # Error boundary
│   │       ├── not-found.tsx       # 404 page
│   │       ├── productos/
│   │       │   ├── page.tsx        # Listado de productos
│   │       │   ├── ProductsPageClient.tsx
│   │       │   └── [id]/
│   │       │       ├── page.tsx    # Detalle de producto
│   │       │       └── ProductDetailClient.tsx
│   │       ├── carrito/
│   │       │   ├── page.tsx        # Carrito de compras
│   │       │   └── CartPageClient.tsx
│   │       └── checkout/
│   │           ├── page.tsx        # Checkout
│   │           └── CheckoutPageClient.tsx
│   ├── templates/
│   │   ├── ModernEcommerce/        # Template E-commerce completo
│   │   │   ├── index.tsx
│   │   │   ├── types.ts
│   │   │   └── components/
│   │   │       ├── Header.tsx
│   │   │       ├── HeroSection.tsx
│   │   │       ├── ProductCard.tsx
│   │   │       ├── ProductsGrid.tsx
│   │   │       ├── FeaturedProducts.tsx
│   │   │       ├── CategoriesSection.tsx
│   │   │       ├── NewsletterSection.tsx
│   │   │       └── Footer.tsx
│   │   ├── ModernEcommerce.tsx     # Template legacy
│   │   └── ModernServices.tsx      # Template servicios
│   ├── lib/
│   │   ├── api.ts                  # API client
│   │   ├── utils.ts                # Utilidades
│   │   └── templateFactory.ts      # Factory de templates
│   ├── components/
│   │   └── ThemeProvider.tsx       # Provider de theme
│   ├── types/
│   │   └── index.ts                # TypeScript types globales
│   └── middleware.ts               # Middleware de Next.js
├── public/                         # Assets estáticos
├── INSTALLATION.md                 # Guía de instalación
└── README.md                       # Este archivo
```

## 🛠️ Stack Técnico

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: NestJS API en http://localhost:3000

## 🚀 Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Ya existe un archivo `.env.local` con la configuración por defecto:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3001
```

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

El storefront estará disponible en: **http://localhost:3001**

### 4. Probar con un dominio

Para probar el storefront:

1. Crea un storefront en el Admin Panel con un dominio (ej: "tienda-demo")
2. Accede a: `http://localhost:3001/tienda-demo`

## 📄 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo en puerto 3001
- `npm run build` - Construye la aplicación para producción
- `npm start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter
- `npm run type-check` - Verifica los tipos de TypeScript

## 🎨 Templates Disponibles

### Modern E-commerce
Template completo para tiendas online con:
- Header con navegación y carrito
- Hero section con CTAs
- Grid de productos destacados
- Sección de categorías
- Newsletter
- Footer con redes sociales

### Modern Services
Template para empresas de servicios (legacy)

## 🔌 APIs Utilizadas

### GET /api/v1/storefront/preview/:domain
Obtiene la configuración del storefront para un dominio.

### GET /api/v1/products
Obtiene productos con filtros y paginación.

### POST /api/v1/orders
Crea una nueva orden.

Ver `INSTALLATION.md` para más detalles sobre las APIs.

## 🎨 Personalización del Theme

El theme se aplica dinámicamente mediante CSS variables:

```css
:root {
  --primary-color: #fb923c;
  --secondary-color: #f97316;
}
```

Estas variables son configuradas por el tenant desde el Admin Panel.

## 📱 Responsive Design

El template es completamente responsive:
- **Mobile**: 1 columna
- **Tablet (md)**: 2 columnas
- **Desktop (lg)**: 3-4 columnas

## ⚡ Performance

- **ISR**: Revalidación automática cada 60s (config) y 5min (productos)
- **Image Optimization**: next/image con formatos AVIF y WebP
- **Code Splitting**: Automático por Next.js
- **CSS Variables**: Para theming dinámico sin re-renders

## 📚 Documentación Adicional

- Ver `INSTALLATION.md` para guía detallada de instalación y troubleshooting
- Ver `PROMPT-5-IMPLEMENTATION.md` y `PROMPT-6-IMPLEMENTATION.md` para historial de desarrollo

## 🔗 Estructura de URLs

- `/:domain` - Homepage de la tienda
- `/:domain/productos` - Catálogo de productos
- `/:domain/productos/:id` - Detalle de producto
- `/:domain/carrito` - Carrito de compras
- `/:domain/checkout` - Proceso de checkout

## 🚀 Deployment

### Vercel (Recomendado)
```bash
vercel
```

### Manual
```bash
npm run build
npm start
```

## 📝 Notas de Desarrollo

- El carrito se almacena en `localStorage`
- Las rutas utilizan el parámetro `[domain]` para identificar el tenant
- Server Components para páginas principales
- Client Components para interactividad (carrito, formularios, filtros)

## 📄 Licencia

Privado - Food Inventory SaaS
