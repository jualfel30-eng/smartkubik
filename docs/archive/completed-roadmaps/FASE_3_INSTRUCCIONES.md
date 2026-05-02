# FASE 3 - Storefront Beauty: Instrucciones de Ejecución

**Estado**: 50% completado
**Fecha**: 29 de Marzo, 2026

---

## ✅ Completado

### 1. Script de Seed
- ✅ Archivo: `/food-inventory-saas/scripts/seed-beauty-demo.ts`
- ✅ Comando agregado: `npm run seed:beauty`
- ✅ README: `/food-inventory-saas/scripts/README-BEAUTY-SEED.md`
- ✅ BeautyModule registrado en `app.module.ts`

### 2. Datos que crea el seed
- ✅ 1 tenant demo: "Salón Belleza Premium"
- ✅ Storefront config con beautyConfig completo
- ✅ 3 profesionales con horarios
- ✅ 9 servicios de belleza con precios y addons
- ✅ 3 items de galería
- ✅ 3 reseñas aprobadas

---

## 🚧 Pendiente de Implementar

### 3. Template BeautyStorefront (Next.js)
**Ubicación**: `/food-inventory-storefront/src/templates/BeautyStorefront/`

**Archivos a crear**:
```
/src/templates/BeautyStorefront/
  ├── index.tsx                 (exportar todo)
  ├── BeautyStorefront.tsx      (template principal)
  └── components/
      ├── BeautyHero.tsx
      ├── BeautyServices.tsx
      ├── BeautyTeam.tsx
      ├── BeautyGallery.tsx
      ├── BeautyReviews.tsx
      └── BeautyLocation.tsx
```

### 4. Rutas Beauty en Next.js
**Ubicación**: `/food-inventory-storefront/src/app/[domain]/beauty/`

**Archivos a crear**:
```
/app/[domain]/beauty/
  ├── page.tsx                  (homepage del salón - Server Component)
  ├── layout.tsx                (layout con tema beauty)
  ├── reservar/
  │   ├── page.tsx              (flujo de booking)
  │   └── components/
  │       ├── BeautyBookingFlow.tsx
  │       ├── StepServices.tsx
  │       ├── StepProfessional.tsx
  │       ├── StepDateTime.tsx
  │       ├── StepClientInfo.tsx
  │       └── StepSummary.tsx
  └── reserva/
      └── [bookingNumber]/
          └── page.tsx          (confirmación)
```

### 5. API Client
**Ubicación**: `/food-inventory-storefront/src/lib/beautyApi.ts`

**Funciones a implementar**:
```typescript
export async function getBeautyServices(tenantId: string)
export async function getProfessionals(tenantId: string)
export async function getAvailability(data: AvailabilityRequest)
export async function createBeautyBooking(data: BookingData)
export async function getBeautyGallery(tenantId: string)
export async function getBeautyReviews(tenantId: string)
export async function getBookingByNumber(bookingNumber: string)
```

---

## 📋 Pasos para Ejecutar (Tú mismo)

### Paso 1: Ejecutar el Seed

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-saas

# Asegurarte de que el backend tenga la variable de entorno
cat .env | grep MONGODB_URI

# Ejecutar seed
npm run seed:beauty
```

**Output esperado**:
```
🌱 Starting Beauty Demo Seed...
✅ Tenant created: 65f7a8b9c4d5e6f7g8h9i0j1
✅ Storefront config created
✅ 3 professionals created
✅ 9 beauty services created
✅ Gallery items created
✅ Reviews created

🎉 Beauty Demo Seed completed successfully!

📋 Summary:
   Tenant ID: 65f7a8b9c4d5e6f7g8h9i0j1
   Domain: belleza-demo.smartkubik.com
   Services: 9
   Professionals: 3

🌐 Access:
   Storefront: http://localhost:3001/belleza-demo.smartkubik.com/beauty
   Admin: http://localhost:3000 (login required)
```

### Paso 2: Verificar en MongoDB

```bash
mongosh "mongodb+srv://..."
use test
db.tenants.findOne({ slug: "belleza-demo" })
db.beautyservices.countDocuments()
db.professionals.countDocuments()
db.storefrontconfigs.findOne({ "beautyConfig.enabled": true })
```

### Paso 3: Iniciar Backend (si no está corriendo)

```bash
cd food-inventory-saas
npm run start:dev
```

Verificar que cargó BeautyModule:
```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] BeautyModule dependencies initialized
[NestSchedule] Adding 1 tasks from BeautyBookingsJobsService
```

### Paso 4: Iniciar Storefront (si no está corriendo)

```bash
cd food-inventory-storefront
npm run dev
```

---

## 🧪 Testing Manual (Una vez implementado Fase 3 completa)

### 1. Ver Homepage del Salón
```
http://localhost:3001/belleza-demo.smartkubik.com/beauty
```

**Debe mostrar**:
- Hero con nombre "Salón Belleza Premium"
- Grid de 9 servicios con precios
- Sección de 3 profesionales
- Galería de trabajos
- Reseñas de clientes
- Botón "Reservar Cita"

### 2. Flujo de Booking
```
http://localhost:3001/belleza-demo.smartkubik.com/beauty/reservar
```

**Pasos del flujo**:
1. **Seleccionar servicios**: Ver grid, seleccionar múltiples, ver addons
2. **Seleccionar profesional**: Ver profesionales disponibles + opción "Sin preferencia"
3. **Seleccionar fecha/hora**: Calendario + slots disponibles (usa algoritmo backend)
4. **Datos del cliente**: Nombre + teléfono (WhatsApp)
5. **Resumen**: Total, duración, método de pago

**Submit** → POST `/api/v1/public/beauty-bookings`
→ Crear reserva + Enviar WhatsApp automático
→ Redirect a `/beauty/reserva/BBK-00001`

### 3. Página de Confirmación
```
http://localhost:3001/belleza-demo.smartkubik.com/beauty/reserva/BBK-00001
```

**Debe mostrar**:
- ✅ "Reserva Confirmada"
- Código: BBK-00001
- Servicios, profesional, fecha, hora
- "Te enviamos un WhatsApp de confirmación"
- Botón "Agregar al Calendario" (.ics file)
- Métodos de pago

### 4. Verificar WhatsApp (si tienes WHAPI_MASTER_TOKEN)

El cliente debe recibir en WhatsApp (+584241234567):
```
¡Hola [Nombre]! 👋

Tu reserva en *Salón Belleza Premium* ha sido confirmada:

💈 *Servicios:*
• Corte de Cabello Dama

👤 *Profesional:* María González
📅 *Fecha:* Lunes 31 de Marzo
🕐 *Hora:* 14:00
⏱️ *Duración:* 60 min
💰 *Total:* $25.00

*Métodos de pago aceptados:*
• Pago Móvil: 0424-1234567 - Banco Venezuela
• Transferencia Bancaria: ...
• Efectivo: Bolívares o USD
• Zelle: contacto@bellezapremium.com

📍 *Dirección:* Av. Principal, Centro Comercial Plaza Mayor, Local 15

Tu código de reserva es: *BBK-00001*

Si necesitas reprogramar o cancelar, responde a este mensaje.

— Salón Belleza Premium
Reserva gestionada por SmartKubik
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'BeautyModule'"
**Causa**: BeautyModule no está registrado en app.module.ts
**Solución**: Ya está resuelto ✅

### Error: "Tenant not found"
**Causa**: No ejecutaste el seed
**Solución**: `npm run seed:beauty`

### Error: "Port 3000 already in use"
**Causa**: Backend ya corriendo
**Solución**: Usar el puerto del backend running o matar el proceso

### Error: "WHAPI_MASTER_TOKEN not configured"
**Causa**: No tienes token de Whapi en `.env`
**Solución**:
- Modo auto: Agregar `WHAPI_MASTER_TOKEN=tu_token` al .env
- Modo manual: Las notificaciones se registran pero no se envían (ok para testing)

### Storefront muestra "404 - Not Found"
**Causa**: Rutas `/beauty/*` no creadas aún
**Solución**: Implementar Fase 3 completa (pendiente)

---

## 📈 Próximos Pasos

Una vez completada la Fase 3, continuar con:

### Fase 4: Panel Admin
- CRUD de servicios de belleza
- CRUD de profesionales
- Dashboard de reservas
- Configuración de horarios
- Gestión de WhatsApp

### Fase 5: Testing y Pulido
- Tests unitarios del algoritmo de disponibilidad
- Tests E2E del flujo de booking
- Responsive mobile
- Performance optimization

---

## 💡 Notas Importantes

1. **Production DB es `test`** (no `food-inventory-saas`)
2. El seed es **idempotente** - puedes ejecutarlo múltiples veces
3. Los profesionales tienen **horarios reales** (Lun-Sáb con breaks)
4. Los servicios tienen **buffers** (tiempo de limpieza entre clientes)
5. El algoritmo de disponibilidad **ya está implementado** en el backend ✅
6. WhatsApp se envía automáticamente si `mode: 'auto'` y token configurado

---

## 🔗 Enlaces Útiles

- **Prompt original adaptado**: `/SMARTKUBIK_BEAUTY_STOREFRONT_PROMPT_ADAPTED.md`
- **Fase 1 completada**: `/FASE_1_COMPLETADA.md`
- **Fase 2 completada**: `/FASE_2_WHATSAPP_COMPLETADA.md`
- **Documentación WhatsApp**: `/food-inventory-saas/src/modules/beauty/WHATSAPP_INTEGRATION.md`
- **Seed README**: `/food-inventory-saas/scripts/README-BEAUTY-SEED.md`

---

**¿Qué hacer ahora?**

1. Ejecutar el seed: `npm run seed:beauty`
2. Verificar que funcionó: Check MongoDB + logs
3. Pedirme que continúe implementando el Storefront (templates + rutas + API client)

¡Listo para probar cuando esté completo!
