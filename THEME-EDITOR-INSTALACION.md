# Instalación del Theme Editor - Storefront Config

Este documento explica cómo instalar y configurar el sistema completo del Theme Editor para tu SaaS.

## 📦 Archivos Generados

### Backend (NestJS)
1. `storefront-config.schema.ts` - Schema de MongoDB
2. `create-storefront-config.dto.ts` - DTOs de validación
3. `storefront-config.service.ts` - Lógica de negocio
4. `storefront-config.controller.ts` - Endpoints de la API
5. `storefront-config.module.ts` - Módulo de NestJS

### Frontend (React)
6. `StorefrontConfigView.jsx` - Componente principal del Theme Editor

---

## 🚀 Instalación del Backend

### Paso 1: Copiar el Schema

Copia el archivo `storefront-config.schema.ts` a:
```
/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src/schemas/storefront-config.schema.ts
```

### Paso 2: Crear carpeta del módulo

Crea la carpeta del módulo storefront:
```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas/src
mkdir -p modules/storefront-config/dto
```

### Paso 3: Copiar archivos del módulo

Copia los archivos a la carpeta del módulo:

**DTOs:**
```
create-storefront-config.dto.ts → src/modules/storefront-config/dto/create-storefront-config.dto.ts
```

**Service:**
```
storefront-config.service.ts → src/modules/storefront-config/storefront-config.service.ts
```

**Controller:**
```
storefront-config.controller.ts → src/modules/storefront-config/storefront-config.controller.ts
```

**Module:**
```
storefront-config.module.ts → src/modules/storefront-config/storefront-config.module.ts
```

### Paso 4: Registrar el módulo en AppModule

Edita `src/app.module.ts` y agrega:

```typescript
import { StorefrontConfigModule } from './modules/storefront-config/storefront-config.module';

@Module({
  imports: [
    // ... otros módulos
    StorefrontConfigModule, // ← Agregar aquí
  ],
})
export class AppModule {}
```

### Paso 5: Verificar que el backend esté corriendo

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas
npm run start:dev
```

Deberías ver en la consola:
```
[Nest] Mapped {/api/v1/storefront/config, GET}
[Nest] Mapped {/api/v1/storefront/config, POST}
[Nest] Mapped {/api/v1/storefront/theme, PUT}
...
```

---

## 🎨 Instalación del Frontend

### Paso 1: Copiar el componente

Copia `StorefrontConfigView.jsx` a:
```
/Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin/src/components/StorefrontConfigView.jsx
```

### Paso 2: Verificar dependencias

Todas las dependencias ya están instaladas en tu proyecto:
- ✅ `@radix-ui/react-*` (shadcn/ui components)
- ✅ `lucide-react` (iconos)
- ✅ `sonner` (toast notifications)
- ✅ `react-hook-form` + `zod` (ya instalados)

**No necesitas instalar nada adicional.**

### Paso 3: Agregar ruta en App.jsx

Edita `src/App.jsx` y agrega la ruta:

```jsx
import { lazy } from 'react';

// Lazy load del componente
const StorefrontConfigView = lazy(() => import('@/components/StorefrontConfigView.jsx'));

function App() {
  return (
    <Routes>
      {/* ... otras rutas */}
      
      <Route 
        path="/storefront" 
        element={
          <ProtectedRoute>
            <StorefrontConfigView />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}
```

### Paso 4: Agregar enlace en el menú de navegación

Edita tu componente de navegación (sidebar/navbar) y agrega:

```jsx
<NavLink to="/storefront">
  <Globe className="mr-2 h-4 w-4" />
  Storefront
</NavLink>
```

### Paso 5: Verificar que el frontend esté corriendo

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-admin
npm run dev
```

Accede a: `http://localhost:5174/storefront`

---

## 🧪 Pruebas de las APIs

### Usando Thunder Client / Postman

**1. Obtener configuración (GET)**
```
GET http://localhost:3000/api/v1/storefront/config
Headers:
  Authorization: Bearer {tu_token_jwt}
```

**2. Crear/Actualizar configuración (POST)**
```
POST http://localhost:3000/api/v1/storefront/config
Headers:
  Authorization: Bearer {tu_token_jwt}
  Content-Type: application/json

Body:
{
  "domain": "mi-tienda.smartkubik.com",
  "isActive": false,
  "templateType": "ecommerce",
  "theme": {
    "primaryColor": "#FB923C",
    "secondaryColor": "#F97316"
  },
  "seo": {
    "title": "Mi Tienda Online",
    "description": "Los mejores productos",
    "keywords": ["tienda", "productos"]
  },
  "socialMedia": {
    "facebook": "https://facebook.com/mitienda",
    "instagram": "@mitienda",
    "whatsapp": "+584121234567"
  },
  "contactInfo": {
    "email": "contacto@mitienda.com",
    "phone": "+584121234567",
    "address": "Caracas, Venezuela"
  }
}
```

**3. Activar/Desactivar storefront (PUT)**
```
PUT http://localhost:3000/api/v1/storefront/toggle
Headers:
  Authorization: Bearer {tu_token_jwt}
  Content-Type: application/json

Body:
{
  "isActive": true
}
```

**4. Verificar disponibilidad de dominio (GET)**
```
GET http://localhost:3000/api/v1/storefront/check-domain?domain=mi-tienda.smartkubik.com
Headers:
  Authorization: Bearer {tu_token_jwt}
```

---

## 📋 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/storefront/config` | Obtener configuración del tenant |
| POST | `/api/v1/storefront/config` | Crear/actualizar configuración |
| PUT | `/api/v1/storefront/theme` | Actualizar solo tema |
| PUT | `/api/v1/storefront/toggle` | Activar/desactivar storefront |
| PUT | `/api/v1/storefront/custom-css` | Actualizar CSS personalizado |
| POST | `/api/v1/storefront/upload-logo` | Subir logo |
| POST | `/api/v1/storefront/upload-favicon` | Subir favicon |
| DELETE | `/api/v1/storefront/config` | Eliminar configuración |
| GET | `/api/v1/storefront/check-domain` | Verificar disponibilidad de dominio |
| GET | `/api/v1/storefront/public/:domain` | Obtener config pública (sin auth) |

---

## 🔧 Configuración Adicional

### Subida de Archivos (Logo y Favicon)

Los endpoints de upload actualmente retornan URLs de ejemplo. Debes implementar la lógica de subida a S3/CloudStorage:

**Opción 1: AWS S3**
```bash
npm install @aws-sdk/client-s3 multer-s3
```

**Opción 2: Cloudinary**
```bash
npm install cloudinary multer-storage-cloudinary
```

Luego actualiza los métodos `uploadLogo` y `uploadFavicon` en el controller.

### Variables de Entorno

Agrega a tu `.env`:
```env
# Storefront
STOREFRONT_BASE_URL=http://localhost:3001
STOREFRONT_CDN_URL=https://cdn.smartkubik.com

# AWS S3 (si usas S3)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
AWS_REGION=us-east-1
```

---

## ✅ Checklist de Instalación

### Backend
- [ ] Schema copiado a `src/schemas/storefront-config.schema.ts`
- [ ] Carpeta `src/modules/storefront-config` creada
- [ ] DTOs copiados a `src/modules/storefront-config/dto/`
- [ ] Service, Controller y Module copiados
- [ ] Módulo registrado en `AppModule`
- [ ] Backend corriendo sin errores
- [ ] Endpoints visibles en logs de Nest

### Frontend
- [ ] Componente copiado a `src/components/StorefrontConfigView.jsx`
- [ ] Ruta agregada en `App.jsx`
- [ ] Enlace agregado en navegación
- [ ] Frontend corriendo sin errores
- [ ] Componente accesible en `/storefront`

### Pruebas
- [ ] GET `/api/v1/storefront/config` funciona
- [ ] POST `/api/v1/storefront/config` crea configuración
- [ ] Formulario guarda cambios correctamente
- [ ] Toggle de activación funciona
- [ ] Verificación de dominio funciona
- [ ] Vista previa de colores se actualiza

---

## 🐛 Troubleshooting

### Error: "No se encontró configuración del storefront"
**Solución:** Es normal la primera vez. Crea una configuración desde el formulario.

### Error: "Este dominio ya está en uso"
**Solución:** Usa otro dominio o verifica que no haya duplicados en la BD.

### Error: "Cannot find module '@/components/ui/...'
**Solución:** Verifica que los componentes de shadcn/ui estén instalados:
```bash
npx shadcn-ui@latest add button card input label switch tabs textarea select alert
```

### Error de CORS
**Solución:** Verifica que el backend tenga CORS habilitado para `http://localhost:5174`

---

## 📚 Próximos Pasos

Una vez que el Theme Editor esté funcionando, puedes continuar con:

1. **Prompt 4:** Crear el proyecto Next.js del storefront público
2. **Prompt 5:** Implementar el sistema de templates (ecommerce/services)
3. **Prompt 6:** Conectar el storefront con los productos del inventario
4. **Prompt 7:** Deploy y configuración de dominios personalizados

---

## 💡 Notas Importantes

- El componente usa **JavaScript (.jsx)**, no TypeScript
- Sigue los patrones existentes de tu proyecto
- Usa `fetchApi` de `src/lib/api.js` para todas las peticiones
- Los toasts usan `sonner` (ya instalado)
- Los iconos son de `lucide-react`
- Los componentes UI son de `shadcn/ui`

---

¿Necesitas ayuda? Revisa los logs del backend y frontend para identificar errores específicos.
