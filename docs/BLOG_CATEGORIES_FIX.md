# Fix: Categorías del Blog no funcionan

## Problema Identificado

Aunque agregas categorías a los posts en Sanity, **no aparecen en el blog** y **no hay filtrado por categorías**.

## Análisis del Problema

Encontré **DOS problemas** después de hacer ingeniería inversa del código:

### ❌ Problema 1: Query incorrecto en BlogIndex.jsx

**El código busca `tags[]` pero el schema tiene `categories[]`**

**Schema de Sanity** ([sanity-studio/schemas/post.js:37-41](sanity-studio/schemas/post.js:37-41)):
```javascript
defineField({
  name: 'categories',        // ← Se llama "categories"
  title: 'Categories',
  type: 'array',
  of: [{type: 'reference', to: {type: 'category'}}],
}),
```

**Query en BlogIndex.jsx** ([BlogIndex.jsx:28-42](food-inventory-admin/src/pages/BlogIndex.jsx:28-42)):
```javascript
const query = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  mainImage{...},
  "authorName": author->name,
  publishedAt,
  body,
  "tags": tags[]->{_id, title}  // ❌ ERROR: busca "tags" que NO existe
}`;
```

**Consecuencia:**
- `post.tags` siempre es `undefined` o `[]`
- El filtrado por categoría no funciona (líneas 94-96)
- Los badges de categorías no se muestran

### ❌ Problema 2: Categorías hardcodeadas vs Dinámicas

**Las categorías del nav están HARDCODEADAS** ([BlogCategoryNav.jsx:14-51](food-inventory-admin/src/components/blog/BlogCategoryNav.jsx:14-51)):

```javascript
const categories = [
  {
    id: 'purchases-inventory',           // ← IDs inventados
    name: 'Compras, Inventarios y Costeo',
    icon: <Package className="w-4 h-4" />,
    color: 'bg-blue-500/10...'
  },
  {
    id: 'sales-orders',                  // ← No coinciden con Sanity
    name: 'Ventas y Órdenes',
    // ...
  },
  // ... más categorías hardcodeadas
];
```

**Pero en Sanity creas categorías dinámicamente con:**
- `title`: "Marketing Digital", "Gestión de Inventario", etc.
- `description`: Descripción de la categoría

**El problema:**
- Las categorías hardcodeadas NO coinciden con las de Sanity
- Cuando creas una categoría nueva en Sanity, NO aparece en el nav
- Los IDs hardcodeados (`'purchases-inventory'`) no existen en Sanity

## Solución Completa

Tienes **DOS opciones**:

### Opción A: Sincronizar categorías hardcodeadas con Sanity (MÁS RÁPIDO)

Esta opción mantiene las categorías hardcodeadas pero las sincroniza con Sanity.

**Paso 1:** Crear las categorías en Sanity con IDs específicos

Ve a Sanity Studio y crea estas categorías exactamente:

1. **Compras, Inventarios y Costeo**
   - Title: `Compras, Inventarios y Costeo`
   - Description: `Artículos sobre gestión de compras, inventarios y costeo`

2. **Ventas y Órdenes**
   - Title: `Ventas y Órdenes`
   - Description: `Artículos sobre ventas y gestión de órdenes`

3. **Finanzas y Contabilidad**
   - Title: `Finanzas y Contabilidad`
   - Description: `Artículos sobre finanzas y contabilidad`

4. **Operaciones y logística**
   - Title: `Operaciones y logística`
   - Description: `Artículos sobre operaciones y logística`

5. **CRM y posventa**
   - Title: `CRM y posventa`
   - Description: `Artículos sobre CRM y servicio posventa`

6. **Analítica y Reportes**
   - Title: `Analítica y Reportes`
   - Description: `Artículos sobre analítica y reportes`

7. **RRHH, Nómina y Productividad**
   - Title: `RRHH, Nómina y Productividad`
   - Description: `Artículos sobre recursos humanos, nómina y productividad`

**Paso 2:** Corregir el query en BlogIndex.jsx

Cambia `tags[]` por `categories[]`:

```javascript
// ANTES (❌ INCORRECTO):
const query = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  mainImage{
    asset->{
      _id,
      url
    }
  },
  "authorName": author->name,
  publishedAt,
  body,
  "tags": tags[]->{_id, title}  // ❌ tags no existe
}`;

// DESPUÉS (✅ CORRECTO):
const query = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  mainImage{
    asset->{
      _id,
      url
    }
  },
  "authorName": author->name,
  publishedAt,
  body,
  "categories": categories[]->{_id, title, description}  // ✅ categories existe
}`;
```

**Paso 3:** Actualizar el filtrado en BlogIndex.jsx

Cambia todas las referencias de `tags` a `categories`:

```javascript
// ANTES (❌ INCORRECTO):
useEffect(() => {
  const lowercasedSearchTerm = searchTerm.toLowerCase();
  let results = posts;

  // Filter by search term
  if (searchTerm) {
    results = results.filter(post =>
      post.title.toLowerCase().includes(lowercasedSearchTerm) ||
      post.excerpt.toLowerCase().includes(lowercasedSearchTerm) ||
      post.authorName.toLowerCase().includes(lowercasedSearchTerm) ||
      post.tags.some(tag => tag.title.toLowerCase().includes(lowercasedSearchTerm))  // ❌
    );
  }

  // Filter by category (if implemented in tags)
  if (activeCategory) {
    results = results.filter(post =>
      post.tags.some(tag => tag.title.toLowerCase().includes(activeCategory))  // ❌
    );
  }

  setFilteredPosts(results);
}, [searchTerm, activeCategory, posts]);

// DESPUÉS (✅ CORRECTO):
useEffect(() => {
  const lowercasedSearchTerm = searchTerm.toLowerCase();
  let results = posts;

  // Filter by search term
  if (searchTerm) {
    results = results.filter(post =>
      post.title.toLowerCase().includes(lowercasedSearchTerm) ||
      post.excerpt.toLowerCase().includes(lowercasedSearchTerm) ||
      post.authorName?.toLowerCase().includes(lowercasedSearchTerm) ||
      (post.categories && post.categories.some(cat => cat.title.toLowerCase().includes(lowercasedSearchTerm)))  // ✅
    );
  }

  // Filter by category title
  if (activeCategory) {
    // Buscar por título de categoría en lugar de ID
    results = results.filter(post =>
      post.categories && post.categories.some(cat =>
        cat.title.toLowerCase().includes(activeCategory.toLowerCase())  // ✅ Buscar por título
      )
    );
  }

  setFilteredPosts(results);
}, [searchTerm, activeCategory, posts]);
```

**Paso 4:** Actualizar BlogCategoryNav para usar títulos de categoría

```javascript
// Cambiar el handler para que use el TÍTULO de la categoría en lugar del ID
const handleCategoryChange = (categoryId) => {
  setActiveCategory(categoryId);
  setSearchParams({ category: categoryId });
};

// Y en BlogCategoryNav.jsx, cambiar los IDs a los títulos:
const categories = [
  {
    id: 'Compras, Inventarios y Costeo',  // ✅ Coincidir con Sanity
    name: 'Compras, Inventarios y Costeo',
    icon: <Package className="w-4 h-4" />,
    color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400'
  },
  {
    id: 'Ventas y Órdenes',  // ✅ Coincidir con Sanity
    name: 'Ventas y Órdenes',
    icon: <ShoppingCart className="w-4 h-4" />,
    color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400'
  },
  // ... etc
];
```

**Paso 5:** Actualizar el renderizado de badges

En BlogIndex.jsx, cambiar `tags` a `categories`:

```javascript
// ANTES (❌):
<div className="flex flex-wrap gap-1.5 mt-2">
  {post.tags && post.tags.slice(0, 2).map(tag => (
    <Badge key={tag._id} variant="secondary" className="text-xs py-0 px-2">{tag.title}</Badge>
  ))}
</div>

// DESPUÉS (✅):
<div className="flex flex-wrap gap-1.5 mt-2">
  {post.categories && post.categories.slice(0, 2).map(category => (
    <Badge key={category._id} variant="secondary" className="text-xs py-0 px-2">
      {category.title}
    </Badge>
  ))}
</div>
```

### Opción B: Cargar categorías dinámicamente desde Sanity (MÁS FLEXIBLE)

Esta opción hace fetch de las categorías desde Sanity en tiempo real.

**Ventajas:**
- Crear categorías nuevas en Sanity sin tocar código
- Más flexible y dinámico
- Una sola fuente de verdad (Sanity)

**Desventajas:**
- Requiere más cambios en el código
- Pierdes los iconos personalizados por categoría
- Necesitas definir colores en Sanity o usar colores aleatorios

**Implementación:**

```javascript
// En BlogCategoryNav.jsx
import { useEffect, useState } from 'react';
import { sanityClient } from '@/lib/sanity';

const BlogCategoryNav = ({ onCategoryChange, onSearch, activeCategory }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const query = `*[_type == "category"] {
          _id,
          title,
          description
        }`;
        const result = await sanityClient.fetch(query);
        setCategories(result);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // El resto del código...
  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          {categories.map((category) => (
            <Button
              key={category._id}
              variant="ghost"
              size="sm"
              onClick={() => onCategoryChange && onCategoryChange(category.title)}
              className={`transition-all duration-200 ${
                activeCategory === category.title ? 'ring-2 ring-primary' : ''
              }`}
            >
              <span className="ml-2 text-xs font-medium">{category.title}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## Recomendación

**Te recomiendo la Opción A** (sincronizar hardcodeadas) porque:

1. ✅ Es más rápido de implementar (solo corregir el query y cambiar IDs)
2. ✅ Mantiene los iconos y colores personalizados
3. ✅ Menor riesgo de bugs
4. ✅ Mejor performance (no hace fetch extra)

## Pasos para Aplicar la Solución (Opción A)

1. **Crear las 7 categorías en Sanity Studio** con los títulos exactos mencionados arriba

2. **Actualizar BlogIndex.jsx** con los 3 cambios:
   - Query: cambiar `tags[]` por `categories[]`
   - Filtrado: cambiar `post.tags` por `post.categories`
   - Badges: cambiar `post.tags` por `post.categories`

3. **Actualizar BlogCategoryNav.jsx**:
   - Cambiar los `id` de las categorías a los títulos exactos

4. **Asignar categorías a tus posts en Sanity**:
   - Edita cada post
   - Selecciona una o más categorías
   - Publica

5. **Probar**:
   - Recargar el blog
   - Hacer clic en una categoría del nav
   - Verificar que se filtren los posts correctamente

## Archivos a Modificar

- ✅ `food-inventory-admin/src/pages/BlogIndex.jsx` (3 cambios)
- ✅ `food-inventory-admin/src/components/blog/BlogCategoryNav.jsx` (cambiar IDs)
- ✅ Sanity Studio: Crear las 7 categorías

## Resultado Esperado

Después de aplicar estos cambios:

1. ✅ Las categorías de Sanity se mostrarán en los posts como badges
2. ✅ Al hacer clic en una categoría del nav, se filtrarán los posts
3. ✅ Puedes asignar múltiples categorías a un post
4. ✅ Los posts sin categoría también funcionarán (no romperá)

## Notas Importantes

- Las categorías en Sanity son un **array**, un post puede tener múltiples categorías
- El filtrado busca si **alguna** de las categorías del post coincide con la categoría activa
- Si quieres agregar más categorías, solo agrega el botón en `BlogCategoryNav.jsx` y crea la categoría en Sanity con el mismo título
