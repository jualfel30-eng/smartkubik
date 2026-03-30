# Beauty Module - Seed Script

## Descripción

Script para crear un salón de belleza demo completo con datos de prueba.

## Qué crea el seed

### 1. Tenant Demo
- **Nombre**: Salón Belleza Premium
- **Slug**: `belleza-demo`
- **Domain**: `belleza-demo.smartkubik.com`
- **Plan**: premium

### 2. Storefront Config
- **beautyConfig habilitado**: ✅
- **Business Hours**: Lun-Vie 9:00-19:00, Sáb 9:00-18:00, Dom cerrado
- **Métodos de pago**: Pago Móvil, Transferencia, Efectivo, Zelle
- **WhatsApp**: Modo auto habilitado
- **Loyalty**: Programa de puntos activo

### 3. Profesionales (3)
- **María González** - Estilista Senior
  - Especialidades: Corte, Color, Tratamientos
  - Horario: Lun-Sáb con break 13:00-14:00

- **Carlos Ramírez** - Barbero Profesional
  - Especialidades: Corte Caballero, Barba, Afeitado Clásico

- **Laura Pérez** - Especialista en Uñas
  - Especialidades: Manicure, Pedicure, Nail Art

### 4. Servicios (9)
Categorías: Cabello, Barbería, Uñas, Tratamientos, Peinado

**Ejemplos**:
- Corte de Cabello Dama - $25 USD (45 min)
- Color Completo - $60 USD (90 min)
- Alisado Brasileño - $120 USD (180 min)
- Corte Caballero - $15 USD (30 min)
- Manicure Clásica - $12 USD (40 min)

Muchos servicios incluyen **addons** (tratamientos extra, esmaltado, etc.)

### 5. Galería (3 items)
- Balayage Rubio Natural
- Corte Moderno Caballero
- Nail Art Elegante

### 6. Reseñas (3)
- Ana Rodríguez: ⭐⭐⭐⭐⭐ (Corte)
- Pedro Martínez: ⭐⭐⭐⭐⭐ (Barbería)
- Gabriela Sánchez: ⭐⭐⭐⭐⭐ (Uñas)

## Cómo ejecutar

```bash
cd food-inventory-saas
npm run seed:beauty
```

## Verificar que funcionó

```bash
# MongoDB Shell
mongosh "mongodb+srv://..."
use test
db.tenants.findOne({ slug: "belleza-demo" })
db.beautysservices.countDocuments({ tenantId: ObjectId("...") })
db.professionals.countDocuments({ tenantId: ObjectId("...") })
```

## Acceder al storefront

Una vez ejecutado el seed:

**Local**:
```
http://localhost:3001/belleza-demo.smartkubik.com/beauty
```

**Producción** (si el backend está en producción):
```
https://belleza-demo.smartkubik.com/beauty
```

## Limpiar datos de prueba

Si quieres empezar de cero:

```bash
# Eliminar el tenant y todo su contenido
npm run clear-tenant -- --tenantId="TENANT_ID_HERE"
```

## Próximos pasos

Una vez ejecutado el seed, puedes:
1. Probar el storefront (Fase 3)
2. Crear reservas desde el frontend
3. Recibir WhatsApp de confirmación (si tienes WHAPI_MASTER_TOKEN configurado)
4. Ver las reservas en el admin (Fase 4)

## Troubleshooting

### Error: "Tenant already exists"
El seed verifica si el tenant existe antes de crearlo. Si existe, lo reutiliza.

### Error: "Cannot find module '@nestjs/schedule'"
```bash
npm install @nestjs/schedule
```

### Error: "Model not found"
Verifica que BeautyModule esté registrado en app.module.ts

### Error de conexión a MongoDB
Verifica tu archivo `.env`:
```
MONGODB_URI=mongodb+srv://...
```
