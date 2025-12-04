# Estructura del Storefront - Guía de Referencia

**Fecha**: 3 de Diciembre, 2024
**Propósito**: Evitar confusión sobre dónde modificar el código del storefront

---

## 🎯 Problema Resuelto

Anteriormente existía **código duplicado** que causaba confusión constante sobre dónde hacer modificaciones al header del storefront.

### ❌ ANTES (Problema)

```
/templates/
  ├── ModernEcommerce.tsx          ← Tenía HEADER INLINE (100+ líneas duplicadas)
  └── ModernEcommerce/
      └── components/
          └── Header.tsx             ← Componente reutilizable
```

**Resultado**: Modificar `Header.tsx` NO afectaba la homepage porque usaba el header inline.

### ✅ AHORA (Solución)

```
/templates/
  ├── ModernEcommerce.tsx          ← Usa componente <Header>
  └── ModernEcommerce/
      └── components/
          └── Header.tsx             ← ÚNICA fuente de verdad
```

**Resultado**: Modificar `Header.tsx` afecta **TODAS** las páginas del storefront.

---

## 📁 Estructura de Directorios Principal

```
/FOOD-INVENTORY-SAAS-COMPLETO/
├── food-inventory-saas/          ← Backend (NestJS, puerto 3000)
├── food-inventory-admin/         ← Admin Panel (React, puerto 3002)
├── food-inventory-storefront/    ← Storefront (Next.js, puerto 3001)
└── smartkubik-blog/              ← Proyecto Sanity CMS (blog, NO parte del storefront)
```

---

## 🔍 ¿Dónde Modificar el Storefront?

### 1. Header (Navegación, Logo, Usuario, Tema)

**Archivo**: `/food-inventory-storefront/src/templates/ModernEcommerce/components/Header.tsx`

Este componente se usa en:
- ✅ Homepage (`/[domain]`)
- ✅ Productos (`/[domain]/productos`)
- ✅ Carrito (`/[domain]/carrito`)
- ✅ Checkout (`/[domain]/checkout`)
- ✅ Detalle de producto (`/[domain]/productos/[id]`)

**Cambios aquí afectan TODO el storefront**.

### 2. Template Homepage

**Archivo**: `/food-inventory-storefront/src/templates/ModernEcommerce.tsx`

Contiene:
- Hero section
- Features section
- Products grid
- Contact section
- Importa y usa `<Header>` component

### 3. Footer

**Archivo**: `/food-inventory-storefront/src/templates/ModernEcommerce/components/Footer.tsx`

### 4. Otros Componentes Reutilizables

```
/templates/ModernEcommerce/components/
├── Header.tsx              ← Navegación principal
├── Footer.tsx              ← Pie de página
├── ProductCard.tsx         ← Card individual de producto
├── ProductsGrid.tsx        ← Grid de productos
├── HeroSection.tsx         ← Hero de homepage
├── FeaturedProducts.tsx    ← Productos destacados
├── CategoriesSection.tsx   ← Sección de categorías
└── NewsletterSection.tsx   ← Sección de newsletter
```

---

## 🚫 Archivos que NO Debes Modificar

### ❌ `/templates/ModernEcommerce/index.tsx`

Este archivo **NO SE USA** actualmente. El template real es:
- ✅ `/templates/ModernEcommerce.tsx` (archivo raíz)

### ❌ `smartkubik-blog/`

Es un proyecto completamente separado (Sanity CMS para blog). No tiene relación con el storefront.

---

## 🔧 Cómo Hacer Cambios Comunes

### Agregar un nuevo item al menú

**Archivo**: [Header.tsx:55-59](../food-inventory-storefront/src/templates/ModernEcommerce/components/Header.tsx#L55-L59)

```typescript
const navigation = [
  { name: 'Inicio', href: `/${domain}` },
  { name: 'Productos', href: `/${domain}/productos` },
  { name: 'Contacto', href: `/${domain}#contacto` },
  { name: 'Nuevo', href: `/${domain}/nuevo` }, // ← Agregar aquí
];
```

### Cambiar el estilo del header

**Archivo**: [Header.tsx:62](../food-inventory-storefront/src/templates/ModernEcommerce/components/Header.tsx#L62)

Modificar la línea del `<header>`:
```typescript
<header className={`sticky top-0 z-50 shadow-sm ${isDarkMode ? '...' : '...'}`}>
```

### Agregar funcionalidad al menú de usuario

**Archivo**: [Header.tsx:106-129](../food-inventory-storefront/src/templates/ModernEcommerce/components/Header.tsx#L106-L129)

Agregar nuevo item dentro del dropdown:
```typescript
<Link
  href={`/${domain}/nueva-pagina`}
  className={`block px-4 py-2 text-sm ${isDarkMode ? '...' : '...'}`}
  onClick={() => setShowUserMenu(false)}
>
  Nueva Opción
</Link>
```

---

## 📝 Reglas de Oro

1. **Header**: Siempre modificar `Header.tsx` component, NUNCA inline en templates
2. **Componentes**: Si se usa en más de una página, crear component reutilizable
3. **DRY**: No duplicar código, usar componentes
4. **Single Source of Truth**: Un componente, múltiples usos

---

## 🐛 Si Algo No Funciona

### Cambios en Header no se ven en la homepage

**Causa**: Probablemente estás modificando `/templates/ModernEcommerce/index.tsx` (archivo NO usado)

**Solución**: Modificar `/templates/ModernEcommerce/components/Header.tsx`

### Cambios solo se ven en algunas páginas

**Causa**: Algunas páginas podrían no estar usando el componente Header

**Solución**: Verificar que la página importe y use `<Header>`:
```typescript
import { Header } from '@/templates/ModernEcommerce/components/Header';

// En el JSX:
<Header config={config} domain={domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
```

---

## 📚 Archivos de Referencia

- [Header Component](../food-inventory-storefront/src/templates/ModernEcommerce/components/Header.tsx)
- [ModernEcommerce Template](../food-inventory-storefront/src/templates/ModernEcommerce.tsx)
- [Template Factory](../food-inventory-storefront/src/lib/templateFactory.ts)

---

**Última actualización**: 3 de Diciembre, 2024
**Mantenido por**: Equipo de Desarrollo
