# 🧪 Guía de Ejecución de Tests - Proyecto Internacionalización

**Objetivo:** Verificar que el sistema de plugins CountryPlugin funciona correctamente end-to-end.

---

## ⚙️ Pre-requisitos

1. **Sistema corriendo:**
   ```bash
   # Terminal 1: Backend
   cd food-inventory-saas
   npm run dev
   # Debe escuchar en http://localhost:3000

   # Terminal 2: Frontend
   cd food-inventory-admin
   npm run dev
   # Debe escuchar en http://localhost:5173
   ```

2. **Usuario de prueba:**
   - Email: `tu-email@test.com`
   - Password: `tu-password`
   - Tenant con `countryCode: 'VE'` (default)

3. **Token de autenticación:**
   - Login manual → DevTools → Application → Local Storage → copiar `token`
   - O ejecutar `localStorage.getItem('token')` en console

---

## 📋 Orden de Ejecución Recomendado

### **FASE 1: Smoke Tests (15-20 min) — CRÍTICO**
```bash
# Sigue el checklist manual paso a paso
open tests/test-smoke-checklist.md
```
**¿Por qué primero?** Detecta problemas básicos de runtime antes de tests automáticos.

### **FASE 2: Plugin Console Tests (5 min) — CRÍTICO**
```bash
# 1. Abrir http://localhost:5173 en Chrome/Firefox
# 2. Login
# 3. DevTools → Console → pegar contenido de:
cat tests/test-plugin-console.js
# 4. Ejecutar y verificar outputs
```
**¿Por qué?** Valida que el plugin se resuelve correctamente en todos los contextos.

### **FASE 3: API Tests (10 min) — CRÍTICO**
```bash
# 1. Obtener token (ver arriba)
# 2. Editar test-api.sh línea 4 con tu token
# 3. Ejecutar:
cd tests
chmod +x test-api.sh
./test-api.sh
```
**¿Por qué?** Verifica que el backend sirve los datos correctamente.

### **FASE 4: E2E Automatizado (1-2 horas) — OPCIONAL**
```bash
# Setup (primera vez)
cd food-inventory-admin
npm install -D @playwright/test
npx playwright install

# Ejecutar tests
npx playwright test ../tests/test-e2e.spec.js --headed

# Ver reporte
npx playwright show-report
```
**¿Por qué?** Automatización completa, útil para CI/CD y regresiones futuras.

---

## ✅ Criterios de Aceptación

### **Must Pass (bloqueantes):**
- ✅ Smoke tests: 6/6 checks pasan
- ✅ Plugin console: Todos los outputs correctos (VE, 16%, 3%, "Bs", "RIF")
- ✅ API tests: `GET /tenant/settings` incluye `countryCode: "VE"`
- ✅ API tests: `GET /country-plugins/VE` retorna plugin VE

### **Nice to Have (no bloqueantes):**
- ✅ E2E tests: 80%+ pasan
- ⚠️  Algunos tests E2E pueden fallar por timing o data específica

---

## 🚨 Si algo falla:

### **Plugin no se resuelve (console errors):**
```
Error: Cannot read property 'getPrimaryCurrency' of undefined
```
**Fix:** Verificar que `CountryPluginContext` wraps `<App>` en `main.jsx`

### **Backend 500 errors:**
```
GET /country-plugins/VE → 500
```
**Fix:** Verificar que `CountryPluginModule` está en `app.module.ts` imports

### **countryCode undefined:**
```
GET /tenant/settings → { countryCode: null }
```
**Fix:** Ejecutar migration manual:
```javascript
// En MongoDB Compass o shell:
db.tenants.updateMany(
  { countryCode: { $exists: false } },
  { $set: { countryCode: 'VE' } }
)
```

---

## 📊 Logs recomendados

Durante testing, monitorear:
```bash
# Backend logs
tail -f food-inventory-saas/logs/*.log

# Frontend DevTools console
# Filtrar por: "plugin", "country", "tax", "currency"
```

---

## 🎯 Próximos pasos después de tests

1. **Si todos pasan:** Sistema listo para producción ✅
2. **Si fallan <3:** Fix rápido, re-test
3. **Si fallan >3:** Investigación profunda requerida

**Contacto de soporte:** Este test suite fue generado por Claude Sonnet 4.5 durante el proyecto de internacionalización.
