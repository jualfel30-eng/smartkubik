# 🚀 Quick Start - Deploy tu Primera Demo en 5 Minutos

## TL;DR - Comandos Rápidos

```bash
# 1. Permisos
chmod +x deploy-demo-page.sh enable-demo-nginx.sh manage-demos.sh

# 2. Deploy demo
./deploy-demo-page.sh ../path/to/demo restaurante-casa-pepe 5001

# 3. Activar Nginx
./enable-demo-nginx.sh restaurante-casa-pepe

# 4. Verificar
./manage-demos.sh list
```

✅ Demo live en: `https://restaurante-casa-pepe.smartkubik.com`

---

## 📋 Escenarios Reales

### Escenario 1: Página de Restaurante (React + Vite)

Tu directorio:
```
/Users/jualfelsantamaria/Documents/clientes-demos/
└── restaurante-casa-pepe/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    └── .env.restaurante
```

**Paso 1: Configurar variables de entorno**
```bash
cd /Users/jualfelsantamaria/Documents/clientes-demos/restaurante-casa-pepe
cp ../FOOD-INVENTORY-SAAS-COMPLETO/demo-templates/.env.example .env.restaurante
```

**Edita `.env.restaurante`:**
```env
VITE_DEMO_NAME=restaurante-casa-pepe
VITE_BUSINESS_NAME=Casa Pepe Restaurante
VITE_BUSINESS_TAGLINE=Sabor auténtico desde 1985
VITE_BRAND_PRIMARY_COLOR=#c0392b
VITE_CONTACT_PHONE=+1-555-987-6543
VITE_CONTACT_WHATSAPP=+15559876543
VITE_PROMO_BANNER_TEXT=🔥 Oferta especial: Página web completa - Cliente no finalizó pago
VITE_PROMO_ORIGINAL_PRICE=2500
VITE_PROMO_DISCOUNTED_PRICE=1250
VITE_SMARTKUBIK_PITCH=Integra esta web con SmartKubik: inventario + POS + reportes automáticos
VITE_SHOW_SMARTKUBIK_BANNER=true
```

**Paso 2: Build y deploy**
```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO

./deploy-demo-page.sh \
  /Users/jualfelsantamaria/Documents/clientes-demos/restaurante-casa-pepe \
  restaurante-casa-pepe \
  5001
```

**Paso 3: Activar Nginx**
```bash
./enable-demo-nginx.sh restaurante-casa-pepe
```

**Resultado:**
- ✅ Demo online en `https://restaurante-casa-pepe.smartkubik.com`
- ✅ PM2 process: `demo-restaurante-casa-pepe` (puerto 5001)
- ✅ Auto-restart si crashea
- ✅ SSL automático (wildcard cert)

---

### Escenario 2: Cafetería con Next.js

**Directorio:**
```
/Users/jualfelsantamaria/Documents/clientes-demos/
└── cafeteria-dulce-aroma/
    ├── package.json
    ├── next.config.js
    ├── app/
    └── .env.local
```

**Deploy:**
```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO

# Next.js detectado automáticamente
./deploy-demo-page.sh \
  /Users/jualfelsantamaria/Documents/clientes-demos/cafeteria-dulce-aroma \
  cafeteria-dulce-aroma \
  5002

./enable-demo-nginx.sh cafeteria-dulce-aroma
```

**Resultado:**
- ✅ `https://cafeteria-dulce-aroma.smartkubik.com`
- ✅ SSR/SSG automático de Next.js
- ✅ Puerto 5002

---

### Escenario 3: Deploy Múltiple (3 demos de una vez)

Tienes 3 páginas listas para deploy:

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO

# Demo 1: Restaurante
./deploy-demo-page.sh ../clientes-demos/restaurante-casa-pepe restaurante-casa-pepe 5001 &

# Demo 2: Cafetería
./deploy-demo-page.sh ../clientes-demos/cafeteria-dulce-aroma cafeteria-dulce-aroma 5002 &

# Demo 3: Panadería
./deploy-demo-page.sh ../clientes-demos/panaderia-el-trigal panaderia-el-trigal 5003 &

# Espera a que terminen
wait

# Activa Nginx para todas
./enable-demo-nginx.sh restaurante-casa-pepe
./enable-demo-nginx.sh cafeteria-dulce-aroma
./enable-demo-nginx.sh panaderia-el-trigal

# Verifica todas
./manage-demos.sh list
```

---

## 🔄 Workflow: Update de Demo Existente

Cliente pide cambios en la demo:

```bash
# 1. Edita localmente tu demo
cd /Users/jualfelsantamaria/Documents/clientes-demos/restaurante-casa-pepe
# ... haces cambios en el código ...

# 2. Redeploy (MISMO comando que deploy inicial)
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO

./deploy-demo-page.sh \
  /Users/jualfelsantamaria/Documents/clientes-demos/restaurante-casa-pepe \
  restaurante-casa-pepe \
  5001

# NO necesitas enable-demo-nginx.sh de nuevo
# El script detecta que existe y hace reload automático
```

**Qué pasa:**
- ✅ Build nuevo local
- ✅ Archivos viejos borrados (rsync --delete)
- ✅ PM2 reload (0 downtime)
- ✅ Cambios visibles inmediatamente

---

## 📊 Monitoreo de Demos

### Ver todas las demos activas

```bash
./manage-demos.sh list
```

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Deployed Demo Pages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBDOMAIN                      STATUS     PORT            URL
───────────────────────────────────────────────────────────────
restaurante-casa-pepe          online     5001            https://restaurante-casa-pepe.smartkubik.com
cafeteria-dulce-aroma          online     5002            https://cafeteria-dulce-aroma.smartkubik.com
panaderia-el-trigal            online     5003            https://panaderia-el-trigal.smartkubik.com
```

### Ver logs en tiempo real

```bash
./manage-demos.sh logs restaurante-casa-pepe
```

Útil para debugging. Presiona `Ctrl+C` para salir.

### Pausar una demo temporalmente

```bash
./manage-demos.sh stop restaurante-casa-pepe
```

La demo deja de servir pero los archivos quedan intactos. Para reactivar:

```bash
./manage-demos.sh start restaurante-casa-pepe
```

---

## 🎨 Personalización por Cliente

### Opción 1: Variables de Entorno (Recomendado)

**`.env.restaurante`**
```env
VITE_BUSINESS_NAME=Casa Pepe
VITE_BRAND_PRIMARY_COLOR=#c0392b
VITE_PROMO_DISCOUNTED_PRICE=1250
```

**`vite.config.js`**
```js
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Carga el .env específico
  const env = loadEnv(mode, process.cwd());

  return {
    define: {
      'import.meta.env.VITE_BUSINESS_NAME': JSON.stringify(env.VITE_BUSINESS_NAME),
      // ... otras vars
    },
  };
});
```

**Build:**
```bash
# Usa el .env específico
cp .env.restaurante .env.local
npm run build

# Deploy
./deploy-demo-page.sh . restaurante-casa-pepe 5001
```

### Opción 2: Build Scripts en package.json

```json
{
  "scripts": {
    "build": "vite build",
    "build:restaurante": "cp .env.restaurante .env.local && vite build",
    "build:cafeteria": "cp .env.cafeteria .env.local && vite build",
    "build:panaderia": "cp .env.panaderia .env.local && vite build"
  }
}
```

**Deploy:**
```bash
npm run build:restaurante
./deploy-demo-page.sh . restaurante-casa-pepe 5001
```

---

## 🎯 Estrategia de "Remate"

### Componente de Banner de Oferta

```jsx
// src/components/PromoBanner.jsx
import { demoConfig, formatPrice, trackDemoEvent } from '../DemoConfig';

export default function PromoBanner() {
  if (!demoConfig.promo.enabled) return null;

  return (
    <div className="promo-banner bg-red-600 text-white py-4 px-6 mb-8 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold">{demoConfig.promo.bannerText}</p>
          <p className="text-sm opacity-90">{demoConfig.promo.urgencyText}</p>
        </div>
        <div className="text-right">
          <p className="text-sm line-through opacity-75">
            {formatPrice(demoConfig.promo.originalPrice)}
          </p>
          <p className="text-3xl font-bold">
            {formatPrice(demoConfig.promo.discountedPrice)}
          </p>
        </div>
      </div>
      <button
        onClick={() => {
          trackDemoEvent('promo_cta_click', {
            price: demoConfig.promo.discountedPrice,
          });
          window.location.href = 'https://smartkubik.com/contact';
        }}
        className="mt-4 bg-white text-red-600 px-6 py-2 rounded-full font-bold"
      >
        ¡Quiero aprovechar esta oferta! 🔥
      </button>
    </div>
  );
}
```

### SmartKubik Upsell Section

```jsx
// src/components/SmartKubikUpsell.jsx
import { demoConfig, getSmartKubikUrl, trackDemoEvent } from '../DemoConfig';

export default function SmartKubikUpsell() {
  if (!demoConfig.smartkubik.showBanner) return null;

  const features = {
    inventory: '📦 Control de Inventario en Tiempo Real',
    pos: '💳 Sistema de Punto de Venta',
    reports: '📊 Reportes y Análisis Automáticos',
    analytics: '📈 Dashboard de Analytics',
    'multi-branch': '🏢 Multi-sucursales',
  };

  return (
    <section className="smartkubik-upsell bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold mb-6">
          🚀 Lleva tu negocio al siguiente nivel
        </h2>
        <p className="text-xl mb-8">{demoConfig.smartkubik.pitch}</p>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {demoConfig.smartkubik.features.map((featureKey) => (
            <div
              key={featureKey}
              className="bg-white/10 backdrop-blur-sm p-4 rounded-lg"
            >
              <p className="text-lg">{features[featureKey]}</p>
            </div>
          ))}
        </div>

        {demoConfig.smartkubik.discountCode && (
          <div className="bg-yellow-400 text-gray-900 p-4 rounded-lg mb-6 text-center">
            <p className="font-bold">
              🎁 Código de descuento exclusivo:{' '}
              <span className="text-2xl">{demoConfig.smartkubik.discountCode}</span>
            </p>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              trackDemoEvent('smartkubik_learn_more');
              window.location.href = getSmartKubikUrl('/pricing');
            }}
            className="bg-white text-blue-600 px-8 py-3 rounded-full font-bold text-lg hover:scale-105 transition"
          >
            Ver Planes y Precios
          </button>
          <button
            onClick={() => {
              trackDemoEvent('smartkubik_contact');
              window.location.href = 'https://smartkubik.com/contact';
            }}
            className="bg-transparent border-2 border-white px-8 py-3 rounded-full font-bold text-lg hover:bg-white/10 transition"
          >
            Contactar Ventas
          </button>
        </div>
      </div>
    </section>
  );
}
```

**En tu App.jsx:**
```jsx
import PromoBanner from './components/PromoBanner';
import SmartKubikUpsell from './components/SmartKubikUpsell';

function App() {
  return (
    <>
      <PromoBanner />
      <HeroSection />
      <FeaturesSection />
      <SmartKubikUpsell />
      <ContactSection />
    </>
  );
}
```

---

## 📈 Tracking de Conversión

### Setup Google Analytics

**1. Agrega GA en `index.html`:**
```html
<!-- index.html -->
<head>
  <!-- ... -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX', {
      custom_map: {
        dimension1: 'demo_name',
        dimension2: 'demo_tracking_id',
      }
    });
  </script>
</head>
```

**2. Usa trackDemoEvent:**
```jsx
import { trackDemoEvent } from './DemoConfig';

function CTAButton() {
  return (
    <button onClick={() => {
      trackDemoEvent('cta_click', {
        button_location: 'hero',
        button_text: 'Contactar',
      });
      window.location.href = 'https://smartkubik.com/contact';
    }}>
      Contactar Ahora
    </button>
  );
}
```

### Eventos Importantes a Trackear

```jsx
// Pageview
trackDemoEvent('page_view');

// CTA clicks
trackDemoEvent('cta_primary_click');
trackDemoEvent('cta_contact_click');

// Promo banner
trackDemoEvent('promo_banner_view');
trackDemoEvent('promo_cta_click', { price: 1250 });

// SmartKubik upsell
trackDemoEvent('smartkubik_banner_view');
trackDemoEvent('smartkubik_cta_click');

// WhatsApp
trackDemoEvent('whatsapp_click', { source: 'contact_section' });

// Form submission
trackDemoEvent('contact_form_submit', {
  name: formData.name,
  email: formData.email,
});
```

---

## ✅ Checklist Pre-Deploy

Antes de cada deploy, verifica:

- [ ] `package.json` existe y tiene script `build`
- [ ] `npm install` y `npm run build` funcionan localmente
- [ ] Variables de entorno configuradas (`.env.*`)
- [ ] Puerto no está en uso (checa con `./manage-demos.sh list`)
- [ ] Subdominio único (no duplicado)
- [ ] Assets (imágenes, logos) incluidos en `/public` o `/assets`
- [ ] Google Analytics ID configurado (opcional)
- [ ] DNS wildcard ya configurado (solo primera vez)

---

## 🚨 Troubleshooting Rápido

### "Demo no responde (502 Bad Gateway)"
```bash
ssh deployer@178.156.182.177 "pm2 restart demo-restaurante-casa-pepe"
```

### "Ver logs en tiempo real"
```bash
./manage-demos.sh logs restaurante-casa-pepe
```

### "Puerto ya en uso"
```bash
# Usa otro puerto
./deploy-demo-page.sh ../mi-demo mi-demo 5004  # en vez de 5001
```

### "Cambios no se ven"
```bash
# Hard refresh navegador
# Mac: Cmd + Shift + R
# Windows: Ctrl + Shift + R

# O limpiar caché Nginx
ssh deployer@178.156.182.177 "sudo systemctl reload nginx"
```

---

## 🎓 Próximos Pasos

1. **Lee el README completo:** [DEMO-PAGES-DEPLOYMENT.md](./DEMO-PAGES-DEPLOYMENT.md)
2. **Personaliza tus demos:** Usa las variables de entorno
3. **Configura tracking:** Setup GA para ver conversiones
4. **Prueba el flujo completo:** Deploy una demo de prueba primero

---

¡Listo para deployar tus demos! 🚀

Si tienes problemas, revisa los logs con `./manage-demos.sh logs <subdomain>`
