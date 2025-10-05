# Theme Editor - Storefront Configuration System

Sistema completo de configuración de storefront para tu SaaS de inventario de alimentos.

## 📁 Estructura de Archivos Entregados

```
📦 Theme Editor
├── 📄 README.md (este archivo)
├── 📄 INSTALACION.md (guía detallada de instalación)
│
├── 🔧 Backend (NestJS)
│   ├── storefront-config.schema.ts
│   ├── create-storefront-config.dto.ts
│   ├── storefront-config.service.ts
│   ├── storefront-config.controller.ts
│   └── storefront-config.module.ts
│
└── 🎨 Frontend (React)
    └── StorefrontConfigView.jsx
```

## ✨ Características

### Backend
- ✅ Schema de MongoDB con validaciones completas
- ✅ 10 endpoints RESTful para gestión del storefront
- ✅ Validación de DTOs con class-validator
- ✅ Soporte para multi-tenancy
- ✅ Verificación de dominios únicos
- ✅ Upload de logo y favicon
- ✅ Métodos estáticos para búsquedas optimizadas

### Frontend
- ✅ Interfaz completa con 5 tabs de configuración
- ✅ Color pickers para tema personalizado
- ✅ Vista previa en tiempo real de colores
- ✅ Upload de logo y favicon con validación
- ✅ Verificación de disponibilidad de dominio
- ✅ Toggle para activar/desactivar storefront
- ✅ Editor de CSS personalizado
- ✅ Formulario completo de SEO
- ✅ Configuración de redes sociales
- ✅ Información de contacto
- ✅ Validaciones en tiempo real
- ✅ Feedback visual con toasts
- ✅ Responsive design con Tailwind CSS

## 🎯 Funcionalidades Implementadas

### 1. Configuración General
- Dominio personalizado (ej: `mi-tienda.smartkubik.com`)
- Verificación de disponibilidad de dominio
- Tipo de template (E-commerce / Servicios)
- Estado activo/inactivo del storefront

### 2. Personalización del Tema
- Color primario (con color picker)
- Color secundario (con color picker)
- Upload de logo (PNG/SVG, max 2MB)
- Upload de favicon (ICO/PNG, max 500KB)
- Vista previa en tiempo real

### 3. SEO
- Título (max 60 caracteres)
- Descripción (max 160 caracteres)
- Palabras clave (array)
- Contador de caracteres en tiempo real

### 4. Redes Sociales y Contacto
- Facebook URL
- Instagram handle
- WhatsApp número
- Email de contacto
- Teléfono
- Dirección física

### 5. Avanzado
- CSS personalizado con syntax highlighting
- Advertencias de seguridad

## 🔌 Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/v1/storefront/config` | Obtener configuración |
| `POST` | `/api/v1/storefront/config` | Crear/actualizar configuración |
| `PUT` | `/api/v1/storefront/theme` | Actualizar tema |
| `PUT` | `/api/v1/storefront/toggle` | Activar/desactivar |
| `PUT` | `/api/v1/storefront/custom-css` | Actualizar CSS |
| `POST` | `/api/v1/storefront/upload-logo` | Subir logo |
| `POST` | `/api/v1/storefront/upload-favicon` | Subir favicon |
| `DELETE` | `/api/v1/storefront/config` | Eliminar configuración |
| `GET` | `/api/v1/storefront/check-domain` | Verificar dominio |
| `GET` | `/api/v1/storefront/public/:domain` | Config pública |

## 🛠️ Stack Tecnológico

### Backend
- **Framework:** NestJS
- **Base de datos:** MongoDB con Mongoose
- **Validación:** class-validator + class-transformer
- **Autenticación:** JWT (JwtAuthGuard + TenantGuard)
- **Upload:** Multer (preparado para S3/Cloudinary)

### Frontend
- **Framework:** React 18
- **Build tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI)
- **Icons:** lucide-react
- **Notifications:** sonner
- **HTTP Client:** fetch API (wrapper personalizado)

## 📦 Dependencias

### Ya Instaladas en tu Proyecto
- ✅ `@radix-ui/react-*` (componentes de shadcn/ui)
- ✅ `lucide-react` (iconos)
- ✅ `sonner` (toasts)
- ✅ `react-hook-form` + `zod`
- ✅ `tailwindcss`

### No Necesitas Instalar Nada Adicional

## 🚀 Instalación Rápida

### Backend (5 minutos)

1. Copia los archivos a sus ubicaciones:
```bash
# Schema
cp storefront-config.schema.ts → src/schemas/

# Módulo completo
mkdir -p src/modules/storefront-config/dto
cp create-storefront-config.dto.ts → src/modules/storefront-config/dto/
cp storefront-config.service.ts → src/modules/storefront-config/
cp storefront-config.controller.ts → src/modules/storefront-config/
cp storefront-config.module.ts → src/modules/storefront-config/
```

2. Registra el módulo en `AppModule`:
```typescript
import { StorefrontConfigModule } from './modules/storefront-config/storefront-config.module';

@Module({
  imports: [
    // ...
    StorefrontConfigModule,
  ],
})
```

3. Reinicia el servidor:
```bash
npm run start:dev
```

### Frontend (2 minutos)

1. Copia el componente:
```bash
cp StorefrontConfigView.jsx → src/components/
```

2. Agrega la ruta en `App.jsx`:
```jsx
const StorefrontConfigView = lazy(() => import('@/components/StorefrontConfigView.jsx'));

<Route path="/storefront" element={<ProtectedRoute><StorefrontConfigView /></ProtectedRoute>} />
```

3. Agrega el enlace en tu navegación:
```jsx
<NavLink to="/storefront">
  <Globe className="mr-2 h-4 w-4" />
  Storefront
</NavLink>
```

4. Accede a: `http://localhost:5174/storefront`

## 📖 Documentación Completa

Ver `INSTALACION.md` para:
- Guía paso a paso detallada
- Ejemplos de peticiones a la API
- Configuración de upload de archivos (S3/Cloudinary)
- Troubleshooting
- Checklist de instalación

## 🎨 Capturas del Componente

El componente incluye:
- **Header:** Título, descripción y botones de acción
- **Card de Estado:** Toggle para activar/desactivar + indicador de dominio
- **Tabs de Configuración:**
  - General: Dominio + tipo de template
  - Tema: Colores + logo + favicon + vista previa
  - SEO: Título + descripción + keywords
  - Redes Sociales: Facebook + Instagram + WhatsApp + contacto
  - Avanzado: CSS personalizado
- **Botones de Acción:** Cancelar + Guardar

## 🔐 Seguridad

- ✅ Autenticación JWT requerida en todos los endpoints (excepto público)
- ✅ Tenant Guard para aislamiento multi-tenant
- ✅ Validación de DTOs con class-validator
- ✅ Validación de colores hex (#RRGGBB)
- ✅ Validación de tamaño de archivos (logo: 2MB, favicon: 500KB)
- ✅ Validación de tipos de archivo (solo imágenes)
- ✅ Dominios únicos por tenant
- ✅ Índices en MongoDB para performance

## 🧪 Testing

### Prueba Manual Rápida

1. **Crear configuración:**
   - Accede a `/storefront`
   - Completa el formulario
   - Click en "Guardar Cambios"
   - Verifica toast de éxito

2. **Verificar dominio:**
   - Ingresa un dominio
   - Click en el botón de búsqueda
   - Verifica disponibilidad

3. **Cambiar colores:**
   - Usa los color pickers
   - Observa la vista previa en tiempo real

4. **Activar storefront:**
   - Toggle el switch de activación
   - Verifica cambio de estado

5. **Subir logo:**
   - Click en "Subir Logo"
   - Selecciona una imagen
   - Verifica que se muestre

## 📊 Modelo de Datos

```typescript
StorefrontConfig {
  _id: ObjectId
  tenantId: ObjectId (ref: Tenant)
  isActive: boolean
  domain: string (unique per tenant)
  
  theme: {
    primaryColor: string (#RRGGBB)
    secondaryColor: string (#RRGGBB)
    logo?: string (URL)
    favicon?: string (URL)
  }
  
  templateType: 'ecommerce' | 'services'
  customCSS?: string
  
  seo: {
    title: string
    description?: string
    keywords: string[]
  }
  
  socialMedia: {
    facebook?: string
    instagram?: string
    whatsapp?: string
  }
  
  contactInfo: {
    email?: string
    phone?: string
    address?: string
  }
  
  createdAt: Date
  updatedAt: Date
}
```

## 🔄 Flujo de Trabajo

1. **Usuario accede al Theme Editor** → Carga configuración existente (o valores por defecto)
2. **Modifica campos** → Estado local se actualiza en tiempo real
3. **Vista previa de colores** → Se renderiza automáticamente
4. **Verifica dominio** → API valida disponibilidad
5. **Sube logo/favicon** → Archivos se suben y URL se guarda
6. **Guarda cambios** → POST a `/api/v1/storefront/config`
7. **Activa storefront** → PUT a `/api/v1/storefront/toggle`
8. **Storefront público** → Accesible vía dominio configurado

## 🌐 Próximos Pasos (Prompts 4-7)

Una vez instalado el Theme Editor, continúa con:

1. **Prompt 4:** Crear proyecto Next.js del storefront público
2. **Prompt 5:** Implementar templates (ecommerce/services)
3. **Prompt 6:** Conectar con productos del inventario
4. **Prompt 7:** Deploy y dominios personalizados

## 🤝 Soporte

Si encuentras algún problema:
1. Revisa `INSTALACION.md` → sección Troubleshooting
2. Verifica logs del backend (NestJS)
3. Verifica logs del frontend (consola del navegador)
4. Verifica que MongoDB esté corriendo
5. Verifica que el token JWT sea válido

## 📝 Notas Importantes

- El componente usa **JavaScript (.jsx)**, no TypeScript
- Sigue los patrones existentes de tu proyecto
- Compatible con tu stack actual (React + Vite + shadcn/ui)
- No requiere instalación de dependencias adicionales
- Listo para producción con validaciones completas

---

**Desarrollado siguiendo los patrones de tu proyecto Food Inventory SaaS**

**Stack:** NestJS + MongoDB + React + Vite + Tailwind CSS + shadcn/ui
