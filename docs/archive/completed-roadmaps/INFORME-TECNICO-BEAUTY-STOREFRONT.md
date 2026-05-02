# INFORME TECNICO COMPLETO: Beauty Storefront Template
## SmartKubik SaaS - Guia para Reconstruccion Total

**Fecha**: 31 de marzo de 2026
**Objetivo**: Documento completo para que un AI o desarrollador reconstruya desde cero la pagina de Beauty/Barbershop Storefront con diseno premium de lujo, 100% funcional.

---

## TABLA DE CONTENIDOS

1. [Arquitectura General](#1-arquitectura-general)
2. [Stack Tecnologico](#2-stack-tecnologico)
3. [Rutas y Middleware](#3-rutas-y-middleware)
4. [APIs del Backend (Todos los Endpoints)](#4-apis-del-backend)
5. [Schemas de MongoDB](#5-schemas-de-mongodb)
6. [Flujo de Datos Completo](#6-flujo-de-datos-completo)
7. [Sistema de Dark Mode](#7-sistema-de-dark-mode)
8. [Paginas que Debe Tener](#8-paginas-que-debe-tener)
9. [Funcionalidades Requeridas](#9-funcionalidades-requeridas)
10. [Variables de Entorno](#10-variables-de-entorno)
11. [Deploy](#11-deploy)
12. [Referencia de Diseno Premium](#12-referencia-de-diseno-premium)

---

## 1. ARQUITECTURA GENERAL

```
food-inventory-storefront/          ← Next.js 15 App Router
├── src/
│   ├── app/
│   │   ├── [domain]/               ← Ruta dinamica por tenant
│   │   │   ├── page.tsx            ← Entry point (redirect a /beauty si templateType === 'beauty')
│   │   │   └── beauty/
│   │   │       ├── page.tsx        ← SERVER COMPONENT - Pagina principal del storefront
│   │   │       ├── reservar/
│   │   │       │   └── page.tsx    ← CLIENT COMPONENT - Wizard de reservas (5 pasos)
│   │   │       └── reserva/
│   │   │           └── [bookingNumber]/
│   │   │               └── page.tsx ← CLIENT COMPONENT - Confirmacion de reserva
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── api.ts                  ← getStorefrontConfig(domain)
│   │   └── beautyApi.ts            ← Todas las funciones de API de beauty
│   ├── templates/
│   │   └── BeautyStorefront/       ← AQUI VA TODO EL TEMPLATE
│   │       ├── BeautyStorefront.tsx ← Componente principal
│   │       ├── index.tsx           ← Barrel export
│   │       └── components/
│   │           ├── BeautyHero.tsx
│   │           ├── BeautyServices.tsx
│   │           ├── BeautyTeam.tsx
│   │           ├── BeautyGallery.tsx
│   │           ├── BeautyReviews.tsx
│   │           └── BeautyLocation.tsx
│   ├── types/
│   │   └── index.ts                ← StorefrontConfig type con templateType: 'beauty'
│   └── middleware.ts               ← Subdomain routing
```

### Multi-tenancy via subdominio
- Produccion: `{dominio}.smartkubik.com` → middleware extrae el subdominio como `domain`
- Local: `localhost:3001/{dominio}` → middleware extrae el primer segmento del path
- El middleware reescribe la URL a `/[domain]/...` para que Next.js lo maneje como ruta dinamica

---

## 2. STACK TECNOLOGICO

| Componente | Tecnologia | Version |
|------------|-----------|---------|
| Framework | Next.js (App Router) | 15.5.6 |
| React | React + React DOM | 19.0.0 |
| Lenguaje | TypeScript | 5.x |
| Estilos | Tailwind CSS | 3.4.1 |
| Iconos | lucide-react | 0.460.0 |
| Utilidades | clsx, tailwind-merge | 2.1.0, 2.2.0 |
| Backend | NestJS | (separado) |
| Base de datos | MongoDB Atlas | cluster0.mbtyprl.mongodb.net |
| Hosting | VPS con PM2 | 178.156.182.177 |
| Proxy | Nginx + Cloudflare | |

### Dependencias del storefront (package.json)
```json
{
  "dependencies": {
    "clsx": "^2.1.0",
    "lucide-react": "^0.460.0",
    "next": "^15.5.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

**NOTA**: El nuevo template puede agregar dependencias adicionales (GSAP, Framer Motion, Lenis, etc.) siempre que se instalen con `npm install`.

---

## 3. RUTAS Y MIDDLEWARE

### middleware.ts
```
Hostname: {dominio}.smartkubik.com
  → Extrae subdominio
  → Rewrite a /{dominio}/...
  → Agrega header x-domain

Localhost: localhost:3001/{dominio}/...
  → Extrae primer segmento del path
  → Rewrite a /{dominio}/...
```

### Rutas de la Beauty Template

| Ruta | Tipo | Descripcion |
|------|------|-------------|
| `/{domain}` | Server Component | Entry point — si `templateType === 'beauty'`, redirect a `/{domain}/beauty` |
| `/{domain}/beauty` | Server Component | Pagina principal del storefront |
| `/{domain}/beauty/reservar` | Client Component | Wizard de reservas (5 pasos) |
| `/{domain}/beauty/reservar?serviceId={id}` | Client Component | Pre-seleccionar un servicio |
| `/{domain}/beauty/reserva/{bookingNumber}` | Client Component | Confirmacion de reserva |

### URL publica en produccion
```
https://barberiasavage.smartkubik.com/         → redirect a /beauty
https://barberiasavage.smartkubik.com/beauty   → storefront principal
https://barberiasavage.smartkubik.com/beauty/reservar → wizard de reservas
https://barberiasavage.smartkubik.com/beauty/reserva/BBK-00001 → confirmacion
```

---

## 4. APIS DEL BACKEND

**Base URL**: `https://api.smartkubik.com/api/v1`

### 4.1 Storefront Config (obtener datos del tenant)

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/public/storefront/by-domain/{domain}` | GET | Config del storefront por dominio |

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "tenantId": {
      "_id": "string",
      "name": "Barberia Savage",
      "businessType": "Barberia / Peluqueria",
      "logo": "string",
      "contactInfo": { ... }
    },
    "domain": "barberiasavage",
    "isActive": true,
    "templateType": "beauty",
    "theme": {
      "primaryColor": "#D946EF",
      "secondaryColor": "#F97316",
      "logo": "string (url o base64)",
      "favicon": "string"
    },
    "seo": {
      "title": "string",
      "description": "string",
      "keywords": ["string"]
    },
    "socialMedia": {
      "facebook": "string",
      "instagram": "string",
      "whatsapp": "string"
    },
    "contactInfo": {
      "email": "string",
      "phone": "string",
      "address": {
        "street": "string",
        "city": "string",
        "state": "string",
        "postalCode": "string",
        "country": "string"
      }
    }
  }
}
```

### 4.2 Beauty Services

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/public/beauty-services/{tenantId}` | GET | Todos los servicios activos |
| `/public/beauty-services/{tenantId}/categories` | GET | Categorias unicas |
| `/public/beauty-services/{tenantId}/service/{id}` | GET | Un servicio especifico |
| `/public/beauty-services/{tenantId}/by-professional/{professionalId}` | GET | Servicios de un profesional |

**Respuesta de servicios** (array):
```json
[
  {
    "_id": "string",
    "name": "Corte Clasico",
    "category": "Cortes",
    "description": "Corte tradicional con tijera...",
    "duration": 30,
    "bufferBefore": 10,
    "bufferAfter": 10,
    "price": { "amount": 15, "currency": "USD" },
    "images": ["base64..."],
    "professionals": ["professionalId1", "professionalId2"],
    "addons": [
      { "name": "Lavado", "price": 5, "duration": 10, "isActive": true },
      { "name": "Masaje capilar", "price": 8, "duration": 15, "isActive": true }
    ],
    "requiresDeposit": false,
    "isActive": true,
    "sortOrder": 0,
    "tags": ["clasico", "popular"]
  }
]
```

### 4.3 Professionals

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/public/professionals/{tenantId}` | GET | Todos los profesionales activos |
| `/public/professionals/{tenantId}/professional/{id}` | GET | Un profesional |
| `/public/professionals/{tenantId}/by-services?serviceIds=id1,id2` | GET | Profesionales por servicio |

**Respuesta** (array):
```json
[
  {
    "_id": "string",
    "name": "Carlos El Pulpo Ramirez",
    "role": "Master Barber",
    "bio": "10 anos de experiencia...",
    "avatar": "base64 o url",
    "specialties": ["Degradados", "Diseno Capilar"],
    "instagram": "@elpulpobarber",
    "schedule": [
      { "day": 1, "start": "09:00", "end": "18:00", "breakStart": "12:00", "breakEnd": "13:00", "isWorking": true },
      { "day": 0, "start": "00:00", "end": "00:00", "isWorking": false }
    ],
    "isActive": true,
    "sortOrder": 0
  }
]
```

### 4.4 Disponibilidad y Reservas

| Endpoint | Metodo | Body | Descripcion |
|----------|--------|------|-------------|
| `/public/beauty-bookings/availability` | POST | `{ tenantId, date, serviceIds[], professionalId? }` | Horarios disponibles |
| `/public/beauty-bookings` | POST | `{ tenantId, client, services[], date, startTime, professionalId?, notes? }` | Crear reserva |
| `/public/beauty-bookings/booking-number/{bookingNumber}` | GET | - | Buscar reserva por codigo |

**Body para disponibilidad**:
```json
{
  "tenantId": "string",
  "date": "2026-04-15",
  "serviceIds": ["serviceId1", "serviceId2"],
  "professionalId": "string (opcional)"
}
```

**Respuesta de disponibilidad**:
```json
{
  "slots": [
    { "time": "09:00", "endTime": "09:45", "availableProfessional": "profId" },
    { "time": "09:30", "endTime": "10:15", "availableProfessional": "profId" },
    { "time": "10:00", "endTime": "10:45" }
  ]
}
```

**Body para crear reserva**:
```json
{
  "tenantId": "string",
  "client": {
    "name": "Juan Perez",
    "phone": "+584121234567"
  },
  "services": [
    { "service": "serviceId1", "addonNames": ["Lavado", "Masaje"] },
    { "service": "serviceId2", "addonNames": [] }
  ],
  "date": "2026-04-15",
  "startTime": "10:00",
  "professionalId": "string (opcional, null = sin preferencia)",
  "notes": "string (opcional, max 1000)"
}
```

**Respuesta de reserva creada**:
```json
{
  "_id": "string",
  "bookingNumber": "BBK-00042",
  "client": { "name": "Juan Perez", "phone": "+584121234567" },
  "professional": "professionalId",
  "professionalName": "Carlos El Pulpo Ramirez",
  "services": [
    {
      "service": "serviceId",
      "name": "Corte Clasico",
      "duration": 30,
      "price": 15,
      "addons": [
        { "name": "Lavado", "price": 5, "duration": 10 }
      ]
    }
  ],
  "date": "2026-04-15T00:00:00.000Z",
  "startTime": "10:00",
  "endTime": "10:45",
  "totalPrice": 20,
  "totalDuration": 40,
  "status": "pending",
  "paymentStatus": "unpaid",
  "whatsappNotifications": []
}
```

### 4.5 Galeria

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/public/beauty-gallery/{tenantId}` | GET | Items de galeria activos |
| `/public/beauty-gallery/{tenantId}/categories` | GET | Categorias de galeria |

**Respuesta** (array):
```json
[
  {
    "_id": "string",
    "image": "base64 string",
    "caption": "Degradado perfecto",
    "category": "Cortes",
    "tags": ["fade", "degradado"],
    "isActive": true,
    "sortOrder": 0
  }
]
```

**IMPORTANTE**: El campo se llama `image` (base64), NO `imageUrl`. El frontend actual usa `imageUrl` — esto es un mapeo que debe corregirse o adaptarse.

### 4.6 Reviews

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/public/beauty-reviews/{tenantId}` | GET | Reviews aprobadas |
| `/public/beauty-reviews/{tenantId}/average-rating` | GET | Rating promedio + distribucion |
| `/public/beauty-reviews` | POST | Enviar una review |

**Respuesta de reviews** (array):
```json
[
  {
    "_id": "string",
    "client": { "name": "Daniel Herrera", "phone": "+584129876543" },
    "rating": 5,
    "comment": "Excelente servicio...",
    "isApproved": true,
    "createdAt": "2026-03-25T00:00:00.000Z"
  }
]
```

**CRITICO**: La API retorna `client.name`, NO `clientName`. El frontend debe usar `review.client?.name`.

**Respuesta de average-rating**:
```json
{
  "averageRating": 4.7,
  "totalReviews": 23,
  "ratingDistribution": { "5": 15, "4": 5, "3": 2, "2": 1, "1": 0 }
}
```

### 4.7 Loyalty (Puntos de fidelidad)

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/public/beauty-loyalty/{tenantId}/balance?clientPhone=+584121234567` | GET | Balance de puntos |

**Respuesta**:
```json
{
  "points": 150,
  "totalEarned": 200,
  "totalRedeemed": 50,
  "totalVisits": 8,
  "lastVisit": "2026-03-20T00:00:00.000Z",
  "clientName": "Juan Perez"
}
```

---

## 5. SCHEMAS DE MONGODB

### Colecciones relevantes

| Coleccion | Descripcion |
|-----------|-------------|
| `beautyservices` | Servicios (cortes, barba, etc.) |
| `professionals` | Profesionales/barberos |
| `beautybookings` | Reservas |
| `beautygalleryitems` | Fotos de galeria |
| `beautyreviews` | Resenas de clientes |
| `beautyloyaltyrecords` | Puntos de fidelidad |
| `storefrontconfigs` | Configuracion del storefront |
| `tenants` | Datos del negocio |

### Schema BeautyService
```
tenantId: ObjectId (ref: Tenant) [indexed]
name: String (required)
category: String (required) [indexed]
description: String
duration: Number (min: 5, minutos)
bufferBefore: Number (default: 10)
bufferAfter: Number (default: 10)
price: { amount: Number, currency: enum(USD,VES,COP,EUR), displayText?: String }
images: [String] (base64, max 3)
professionals: [ObjectId] (ref: Professional)
addons: [{ name, description?, price, duration?, isActive }]
requiresDeposit: Boolean
depositType: enum(fixed, percentage)
depositAmount: Number
isActive: Boolean [indexed]
sortOrder: Number
color: String (hex)
tags: [String]
```

### Schema Professional
```
tenantId: ObjectId [indexed]
name: String (required)
role: String
bio: String
avatar: String (base64)
specialties: [String]
instagram: String
schedule: [{ day: 0-6, start: HH:MM, end: HH:MM, breakStart?, breakEnd?, isWorking }]
isActive: Boolean [indexed]
sortOrder: Number
```

### Schema BeautyBooking
```
tenantId: ObjectId [indexed]
bookingNumber: String (unique, formato: "BBK-00001") [indexed]
client: { name, phone (+intl format), email?, whatsapp? }
professional: ObjectId (ref: Professional)
professionalName: String (denormalizado)
services: [{ service: ObjectId, name, duration, price, addons: [{ name, price, duration }] }]
date: Date [indexed]
startTime: String (HH:MM)
endTime: String (HH:MM, calculado)
totalPrice: Number
totalDuration: Number
status: enum(pending, confirmed, completed, cancelled, no_show) [indexed]
paymentStatus: enum(unpaid, deposit_paid, paid) [indexed]
paymentMethod: String
amountPaid: Number
notes: String
whatsappNotifications: [{ type, sentAt, status, messageId?, error? }]
```

### Schema BeautyReview
```
tenantId: ObjectId [indexed]
booking: ObjectId (ref: BeautyBooking)
client: { name: String, phone: String }     ← IMPORTANTE: es client.name, NO clientName
professional: ObjectId (ref: Professional)
rating: Number (1-5)
comment: String
isApproved: Boolean [indexed]
```

### Schema BeautyGalleryItem
```
tenantId: ObjectId [indexed]
image: String (base64)                       ← IMPORTANTE: el campo es "image", no "imageUrl"
caption: String
professional: ObjectId
category: String [indexed]
tags: [String]
isActive: Boolean [indexed]
sortOrder: Number
```

---

## 6. FLUJO DE DATOS COMPLETO

### Pagina Principal (Server Component)

```
1. Next.js recibe request a /{domain}/beauty
2. page.tsx (SERVER) llama: getStorefrontConfig(domain)
   → GET /api/v1/public/storefront/by-domain/{domain}
   → Obtiene: config con tenantId, theme, contactInfo, seo, socialMedia

3. Extrae tenantId del config:
   tenantId = typeof config.tenantId === 'object' ? config.tenantId._id : config.tenantId

4. Fetch en paralelo:
   - getBeautyServices(tenantId)    → GET /api/v1/public/beauty-services/{tenantId}
   - getProfessionals(tenantId)     → GET /api/v1/public/professionals/{tenantId}
   - getBeautyGallery(tenantId)     → GET /api/v1/public/beauty-gallery/{tenantId}
   - getBeautyReviews(tenantId)     → GET /api/v1/public/beauty-reviews/{tenantId}

5. Mapea config a la forma esperada por BeautyStorefront:
   beautyConfig = {
     tenantId,
     name: config.tenantId?.name || config.seo?.title,
     description: config.seo?.description,
     logoUrl: config.theme?.logo,
     primaryColor: config.theme?.primaryColor,
     secondaryColor: config.theme?.secondaryColor,
     contactInfo: { email, phone, whatsapp, address (flatten), city, country, socialMedia }
   }

6. Renderiza: <BeautyStorefront config={beautyConfig} services={...} professionals={...} gallery={...} reviews={...} domain={domain} />
```

### Wizard de Reservas (Client Component)

```
1. Carga inicial (useEffect):
   - Fetch config por dominio
   - Valida templateType === 'beauty'
   - Fetch services + professionals en paralelo

2. Step 1: Usuario selecciona servicios (toggle checkbox) + addons opcionales
3. Step 2: Usuario elige profesional (opcional, default = "sin preferencia")
4. Step 3: Usuario selecciona fecha → triggers fetch de disponibilidad
   - POST /api/v1/public/beauty-bookings/availability
   - Body: { tenantId, date, serviceIds, professionalId? }
   - Response: { slots: [{ time, endTime, availableProfessional? }] }
   - Usuario selecciona horario

5. Step 4: Usuario ingresa datos (nombre, telefono, notas)
6. Step 5: Resumen → Confirmar
   - POST /api/v1/public/beauty-bookings
   - Body: { tenantId, client, services, date, startTime, professionalId?, notes? }
   - Response: booking con bookingNumber
   - Redirect a: /{domain}/beauty/reserva/{bookingNumber}
```

### Confirmacion (Client Component)

```
1. Fetch config por dominio
2. Fetch booking: GET /api/v1/public/beauty-bookings/booking-number/{bookingNumber}
3. Muestra detalles de la reserva
4. Acciones:
   - Agregar al calendario (genera archivo .ics)
   - Compartir por WhatsApp (abre wa.me con mensaje pre-formateado)
   - Contactar al negocio por WhatsApp
```

---

## 7. SISTEMA DE DARK MODE

### Persistencia
- **Key localStorage**: `'beauty-dark-mode'`
- **Valor**: `'true'` o `'false'` (string)
- Se lee en `useEffect` al montar cada pagina
- Se escribe en `localStorage.setItem` al togglear

### Interface ColorScheme
```typescript
export interface ColorScheme {
  bg: string;              // Background principal
  bgAlt: string;          // Background alternativo (secciones alternas)
  card: string;           // Background de tarjetas
  text: string;           // Texto principal
  textMuted: string;      // Texto secundario
  textLight: string;      // Texto terciario
  border: string;         // Bordes
  emptyStar: string;      // Color hex de estrella vacia
  waveFill: string;       // Color hex del SVG wave
  addonBg: string;        // Background de badges de addons
  placeholderGradient: string; // Gradient de placeholders
}
```

### Constantes exportadas
```typescript
export const LIGHT: ColorScheme = { ... }
export const DARK: ColorScheme = { ... }
```

Ambas se exportan desde `BeautyStorefront.tsx` y se importan en las paginas de reserva.

---

## 8. PAGINAS QUE DEBE TENER

### 8.1 Pagina Principal del Storefront
**Ruta**: `/{domain}/beauty`
**Tipo**: Server Component (SSR)

**Secciones**:
1. **Header sticky** con logo, navegacion, toggle dark mode, boton "Reservar Cita"
2. **Hero** con imagen/video de fondo, nombre del negocio, descripcion, CTAs
3. **Servicios** con filtro por categoria, tarjetas con imagen/precio/duracion/addons/boton reservar
4. **Equipo** con tarjetas de profesionales, foto, rol, especialidades, instagram
5. **Galeria** con grid de imagenes, lightbox modal al hacer click
6. **Resenas** con rating promedio, tarjetas de testimonios, estrellas
7. **Ubicacion/Contacto** con direccion, telefono, WhatsApp, horarios, metodos de pago, redes sociales
8. **Footer** con copyright y "Powered by SmartKubik"

### 8.2 Wizard de Reservas
**Ruta**: `/{domain}/beauty/reservar`
**Tipo**: Client Component

**5 pasos**:
1. Seleccion de servicios (con addons)
2. Seleccion de profesional (opcional)
3. Seleccion de fecha y hora (disponibilidad en tiempo real)
4. Datos del cliente (nombre, telefono, notas)
5. Confirmacion y resumen

**Elementos UI**:
- Indicador de progreso visual
- Total corriente visible durante todo el flujo
- Navegacion Atras/Siguiente
- Boton de confirmar con estado de loading
- Header con logo, dark mode toggle, boton volver

### 8.3 Confirmacion de Reserva
**Ruta**: `/{domain}/beauty/reserva/{bookingNumber}`
**Tipo**: Client Component

**Contenido**:
- Badge de exito con checkmark
- Codigo de reserva grande y visible
- Detalle completo: fecha, hora, servicios, profesional, precio total
- Botones de accion: Agregar al calendario (.ics), Compartir WhatsApp, Contactar negocio
- Info box con instrucciones
- Link para volver a servicios

---

## 9. FUNCIONALIDADES REQUERIDAS

### Funcionalidades Core
- [ ] Mostrar servicios del tenant con filtro por categoria
- [ ] Mostrar equipo de profesionales con sus especialidades
- [ ] Galeria de trabajos con lightbox
- [ ] Resenas de clientes con rating
- [ ] Informacion de contacto, horarios, metodos de pago
- [ ] Wizard de reservas completo (5 pasos)
- [ ] Consulta de disponibilidad en tiempo real
- [ ] Creacion de reservas
- [ ] Pagina de confirmacion con codigo de reserva
- [ ] Generacion de archivo .ics para calendario
- [ ] Compartir reserva por WhatsApp
- [ ] Contactar al negocio por WhatsApp
- [ ] Dark mode / Light mode con persistencia en localStorage

### Funcionalidades NO implementadas aun (opcionales para el futuro)
- [ ] Consulta de puntos de fidelidad (endpoint existe: `/public/beauty-loyalty/{tenantId}/balance`)
- [ ] Envio de reviews post-reserva (endpoint existe: `POST /public/beauty-reviews`)
- [ ] Pre-seleccion de servicio via query param `?serviceId=`
- [ ] Filtro de profesionales por servicios que ofrecen (endpoint existe)
- [ ] Rating promedio separado por profesional (endpoint existe)

---

## 10. VARIABLES DE ENTORNO

### .env.local (produccion)
```
NEXT_PUBLIC_API_URL=https://api.smartkubik.com
```

### .env.local (desarrollo)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**USO**: Todas las llamadas API usan:
```typescript
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/api/v1';
```

---

## 11. DEPLOY

### Build
```bash
cd food-inventory-storefront
npx next build
```

### Deploy a produccion
```bash
# Rsync del build al servidor
rsync -avz --delete .next/ deployer@178.156.182.177:~/smartkubik/storefront/.next/
rsync -avz package.json deployer@178.156.182.177:~/smartkubik/storefront/

# Reload PM2
ssh deployer@178.156.182.177 "cd ~/smartkubik/storefront && pm2 reload smartkubik-storefront"
```

El storefront corre en el puerto **3001** en produccion.

---

## 12. REFERENCIA DE DISENO PREMIUM

### Sitios de Referencia (Top 10)

1. **Gentlemen Barber Clubs** — gentlemen-barberclubs.de (parallax, gold on dark, brushstroke motifs)
2. **Blind Barber** — anniversary.blindbarber.com (storytelling editorial, timeline)
3. **Barber Surgeons Guild** — barbersurgeonsguild.com (monocromatico elegante)
4. **Murdock London** — murdocklondon.com (heritage, dark wood aesthetic)
5. **Truefitt & Hill** — truefittandhill.co.uk (clasico + moderno, heritage)
6. **Gentlemen's Tonic** — gentlemenstonic.com (minimalista, scroll animations)
7. **Pall Mall Barbers** — pallmallbarbers.nyc (heritage + responsive)
8. **Huckle The Barber** — hucklethebarber.com (editorial photography)
9. **UNOIT** — unoit.com.au (Webflow, clean, elegant transitions)
10. **Hammer & Nails** — hammerandnailsgrooming.com (bold, dark, membership UX)

### Paleta de Colores Premium para Barberias

```
Fondos:       #0A0A0A a #1A1A1A  (negro profundo)
Texto:        #FFFFFF a #F5F5F0  (blanco/crema)
Acento:       #C9A96E a #D4AF37  (dorado/brass)
Soporte:      #8B7355 a #6B5B3E  (marron cuero)
CTA:          #C41E3A a #8B0000  (borgona profundo)
```

**Por que funciona el tema oscuro**: Hace que las fotos resalten, crea atmosfera masculina y sofisticada, se asocia con exclusividad.

### Tipografia Premium

```
Headlines:   Serif (Playfair Display, Bodoni, Cormorant Garamond)
             48-120px, uppercase o title case
             Letter-spacing: 0.05em a 0.15em

Subtitulos:  Sans-serif, 14-18px, ALL CAPS
             Letter-spacing: 0.2em a 0.4em

Body:        Sans-serif (Inter, DM Sans, Lato)
             16-18px, line-height: 1.6-1.8

CTAs:        Sans-serif, 12-14px, ALL CAPS
             Letter-spacing: 0.15em a 0.3em
```

### Hero Section — Patrones Premium
1. **Video cinematico fullscreen** con overlay oscuro + logo centrado + "Reservar" CTA
2. **Foto full-bleed** con texto minimo sobre overlay
3. **Parallax multicapa** con texto emergiendo entre capas
4. **Solo tipografia** (headline masivo 80-150px sin imagen)

### Lo que diferencia "barato" de "premium"

| Aspecto | Barato | Premium |
|---------|--------|---------|
| Tipografia | 1-2 fuentes genericas, inconsistente | Serif para headlines + sans body, deliberado |
| Colores | 4+ colores brillantes | 2-3 oscuros/muted + 1 metalico |
| Fotos | Stock, inconsistentes, selfies | Editorial, consistentes, el equipo real |
| Espacio | Todo apretado, sin respirar | Padding generoso (80-120px entre secciones) |
| Hero | Carrusel de 3-5 slides | Una sola imagen/video poderosa |
| Animaciones | Ninguna o instantaneas | Suaves, eased (300-800ms), scroll-triggered |
| Navegacion | Menu con 8+ items | 4-5 items max, header transparente/minimal |
| Servicios | Lista con bullets y precios | Cards con imagenes, descripcion, CTA |
| Galeria | Album random de Facebook | Masonry curado con filtros, fondo oscuro |
| Reservas | "Llamanos" o formulario tosco | Wizard integrado en 2-3 clicks |

### 10 Senales Instantaneas de "Premium"
1. Custom cursor o elementos reactivos al cursor
2. Smooth scroll con inercia (Lenis)
3. Animacion de carga con logo de marca
4. Reveal de secciones por scroll con stagger
5. Tipografia serif para headlines a 60px+
6. Color dorado/brass sobre fondo oscuro
7. Fotos del equipo en blanco y negro, color al hover
8. Boton "Reservar" siempre visible (sticky/floating)
9. Galeria con fotografia consistente y de calidad editorial
10. Textura sutil de grano/noise (agrega profundidad tactil)

### Stack Recomendado para Premium
```
Framework:    Next.js 15 (App Router) — ya instalado
Styling:      Tailwind CSS + CSS custom para detalles luxury
Animation:    GSAP (ScrollTrigger, SplitText) + Framer Motion
Smooth Scroll: Lenis
Fuentes:      Google Fonts (Playfair Display + Inter o DM Sans)
```

---

## RESUMEN EJECUTIVO

Este documento contiene TODA la informacion necesaria para reconstruir el Beauty Storefront desde cero:

1. **Stack**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
2. **APIs**: 20+ endpoints publicos documentados con request/response exactos
3. **DB**: 7 colecciones con schemas completos
4. **Flujo**: Server Component → fetch config + datos → render componentes
5. **Reservas**: Wizard de 5 pasos con disponibilidad en tiempo real
6. **Dark Mode**: localStorage con key `beauty-dark-mode`
7. **Deploy**: Build Next.js → rsync → PM2 reload en puerto 3001
8. **Diseno**: Referencia completa de 10 sitios premium + reglas de diseno

La pagina actual tiene todas las funcionalidades trabajando correctamente. El problema es exclusivamente de **diseno visual** — necesita verse como una pagina de barberia/salon de lujo premium, no como un template generico con colores cambiados.

**Archivos que se deben reescribir** (mantener misma estructura de rutas):
- `src/templates/BeautyStorefront/BeautyStorefront.tsx` + todos sus componentes
- `src/app/[domain]/beauty/page.tsx` (mapeo de datos)
- `src/app/[domain]/beauty/reservar/page.tsx` (wizard completo)
- `src/app/[domain]/beauty/reserva/[bookingNumber]/page.tsx` (confirmacion)
- `src/lib/beautyApi.ts` (NO cambiar — ya funciona correctamente)
- `src/lib/api.ts` (NO cambiar — ya funciona correctamente)
