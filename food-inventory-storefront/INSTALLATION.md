# Guía de Instalación - Food Inventory Storefront

## Requisitos Previos

- Node.js 18.x o superior
- npm o yarn
- Backend NestJS corriendo en `http://localhost:3000`

## Pasos de Instalación

### 1. Navegar al directorio del proyecto

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/food-inventory-storefront
```

### 2. Instalar dependencias

```bash
npm install
```

O si prefieres yarn:

```bash
yarn install
```

### 3. Configurar variables de entorno

Ya existe un archivo `.env.local` con la configuración por defecto:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

Si necesitas cambiar la URL del backend, edita este archivo.

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

El storefront estará disponible en: **http://localhost:3001**

### 5. Probar con un dominio

Para probar el storefront, necesitas:

1. **Crear un storefront en el Admin Panel** con un dominio (ej: "tienda-demo")
2. **Acceder a**: `http://localhost:3001/tienda-demo`

## Estructura de URLs

- `http://localhost:3001/[domain]` - Homepage de la tienda
- `http://localhost:3001/[domain]/productos` - Catálogo de productos
- `http://localhost:3001/[domain]/productos/[id]` - Detalle de producto
- `http://localhost:3001/[domain]/carrito` - Carrito de compras
- `http://localhost:3001/[domain]/checkout` - Proceso de checkout

## Verificación de Instalación

### 1. Verificar que el backend está corriendo

```bash
curl http://localhost:3000/api/v1/storefront/preview/tu-dominio
```

Debe retornar la configuración del storefront.

### 2. Verificar que Next.js está compilando correctamente

Al ejecutar `npm run dev`, deberías ver:

```
✓ Ready in 2.5s
○ Local:        http://localhost:3001
```

### 3. Abrir en el navegador

Navega a `http://localhost:3001/[tu-dominio]` donde `[tu-dominio]` es el dominio que configuraste en el Admin Panel.

## Troubleshooting

### Error: "Cannot find module"

```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 3001 is already in use"

Cambia el puerto en `package.json`:

```json
"dev": "next dev -p 3002"
```

### Error: "Tienda no encontrada"

Verifica que:
1. El backend está corriendo
2. El dominio existe en la base de datos
3. El storefront está activo (`isActive: true`)

### Errores de CORS

Si tienes problemas de CORS, verifica que el backend tenga configurado:

```typescript
// En main.ts del backend
app.enableCors({
  origin: 'http://localhost:3001',
  credentials: true,
});
```

### Imágenes no cargan

Si las imágenes de productos no cargan:

1. Verifica que las URLs en la base de datos sean válidas
2. Agrega los dominios a `next.config.js`:

```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'tu-dominio-de-imagenes.com',
    },
  ],
}
```

## Build para Producción

### 1. Construir la aplicación

```bash
npm run build
```

### 2. Iniciar en modo producción

```bash
npm start
```

### 3. Variables de entorno para producción

Crea un archivo `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://tu-api.com
NODE_ENV=production
```

## Deployment

### Vercel (Recomendado)

1. Instalar Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Configurar variables de entorno en el dashboard de Vercel

### Docker

1. Crear Dockerfile:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

2. Build y run:
```bash
docker build -t storefront .
docker run -p 3001:3001 -e NEXT_PUBLIC_API_URL=http://localhost:3000 storefront
```

## Próximos Pasos

1. ✅ Instalar dependencias
2. ✅ Configurar variables de entorno
3. ✅ Iniciar servidor de desarrollo
4. ✅ Crear un storefront en el Admin Panel
5. ✅ Probar el template Modern E-commerce
6. 🔄 Personalizar colores y logo desde el Admin Panel
7. 🔄 Agregar productos al inventario
8. 🔄 Probar el flujo completo de compra

## Soporte

Para problemas o preguntas:
- Revisa la documentación en `README.md`
- Verifica los logs del backend y frontend
- Inspecciona la consola del navegador para errores

## Notas Importantes

- El carrito se almacena en `localStorage` del navegador
- Los datos se cachean con ISR (60s para config, 5min para productos)
- Para ver cambios inmediatos, usa `router.refresh()` o recarga la página
- En desarrollo, Next.js puede tardar en la primera carga mientras compila
