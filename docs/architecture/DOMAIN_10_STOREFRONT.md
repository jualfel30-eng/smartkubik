# Domain 10: Storefront (E-commerce B2C/B2B)

## 📌 Visión General
Este es el "Headless Canvas" del sistema. Provee la capa de configuración, estilos y endpoints públicos (`/public/`) para que cada Inquilino (Tenant) despliegue una tienda en línea o catálogo digital completamente funcional (ej. con su propio estilo, colores y links de redes), inyectando el inventario y validando la identidad del cliente (integración Dominio 1 y Dominio 4).

## 🗄️ Data Layer (Esquemas de Base de Datos)
La persistencia aquí no transacciona dinero directamente, sino configuración estética y retroalimentación de clientes:

- **`StorefrontConfig`** (`storefront-config.schema.ts`): El núcleo visual del E-commerce por Tenant. Almacena el dominio asociado (`domain`), la paleta de colores (`primaryColor`, `secondaryColor`), tipo de plantilla (`ecommerce`, `services`), metas SEO globales (`seo.title`, `seo.description`) e integración fuerte para desviar tráfico al WhatsApp del Tenant configurando plantillas de mensajes automáticas.
- **`SocialLink`** (`social-link.schema.ts`): Repositorio de links de RRSS (`url`, `icon`, `label`) con trazabilidad UTM (`utmCampaign`) para pintar el footer de las tiendas.
- **`Review`** (`review.schema.ts`): Motor de feedback de los clientes del Storefront (`customerId`). Permite calificar (`rating` 1-5), dejar comentarios, y lo más crucial, realizar *Sentiment Analysis* (positivo/negativo) y vincular la reseña directamente a un `orderId` o `reservationId` para garantizar que la reseña proviene de una compra verificada (`isVerified`).

## ⚙️ Backend (API Layer)
La API expone la configuración en dos vías distintas, privada para el Admin y pública para React:

- **`/modules/storefront/`**:
  - `storefront.controller.ts`: Permite a los dueños del Tenant modificar los estilos, el SEO y aprobar/ocultar los `Reviews` (`isPublic: false`).
  - `storefront-public.controller.ts` (`7.1KB`): El puente sagrado. Estos endpoints (`@Public()`) son consumidos por la aplicación Frontend E-commerce. Respondiendo al subdominio (ej: `elarabito.smartkubik.com`), consulta el `StorefrontConfig` asociado a ese dominio en BDD y devuelve toda la UI (colores, banners, links) para que React haga el rendering.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **Gestión de Dominios (DNS)**: `StorefrontConfig` usa un campo `domain: string`. A nivel de base de datos esto está bien, pero a nivel de Infraestructura (Nginx/AWS), apuntar automáticamente un CNAME de un cliente (ej. `www.mitienda.com`) hacia el SaaS requiere integración automatizada con el proveedor de DNS (Route53, Cloudflare) o certificados SSL Wildcard automatizados que no se aprecian implementados en este repositorio local de monolite backend NestJS.
2. **Review Source Híbrido**: El schema de `Review` soporta orígenes externos (`google`, `tripadvisor`). Sin embargo, no hay CRON jobs ni integraciones obvias en la rama `/modules/storefront/` que hagan *scrapping* o conecten APIs de Google Places para traer esas reseñas al ERP. De ser manual, el admin tendría que copiar y pegar las reviews.

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- Confirmar el flujo de despliegue DNS de los clientes (Custom Domains) a nivel NGINX.
- Expandir el `storefront-public.controller.ts` para que incluya lógicas fuertes de caché (Redis), ya que una tienda con alto tráfico golpearía MongoDB por la paleta de colores en cada page refresh del frontend de E-commerce.
