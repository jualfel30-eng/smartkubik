# 🔍 Smoke Tests Checklist — Nivel 1 (Manual)

**Tiempo estimado:** 15-20 minutos
**Pre-requisito:** Sistema corriendo (backend + frontend)

---

## ✅ TEST 1: Login y Dashboard básico

**Pasos:**
1. Abrir http://localhost:5173
2. Login con credenciales válidas
3. Esperar carga del dashboard

**Verificar:**
- [ ] No hay errores en console (DevTools → Console)
- [ ] Dashboard carga completamente
- [ ] No hay warnings de "plugin undefined"
- [ ] Sidebar muestra opciones de menú

**Si falla:**
- Verificar que `CountryPluginContext` wraps `<App>` en `main.jsx`
- Revisar console para error específico

---

## ✅ TEST 2: Settings → Selector de país

**Pasos:**
1. Ir a `/settings` (Configuración)
2. Buscar card "País / Región"
3. Abrir dropdown de país

**Verificar:**
- [ ] Card "País / Región" existe y es visible
- [ ] Dropdown muestra "Venezuela (VE)" como opción
- [ ] Dropdown NO está vacío
- [ ] Texto de ayuda menciona "moneda, impuestos y métodos de pago"

**Si falla:**
- Verificar que `SettingsPage.jsx` tiene el selector agregado (Phase 4)
- Verificar que `getAvailableCountries()` retorna array no vacío

---

## ✅ TEST 3: Crear orden nueva → Labels dinámicos

**Pasos:**
1. Ir a `/orders/new` (Nueva Orden)
2. Scroll hasta sección "Datos del Cliente"
3. Observar labels de campos

**Verificar:**
- [ ] Label dice "RIF / Cédula *" (NO hardcoded como "RIF")
- [ ] Placeholder de teléfono muestra "+58 412 1234567"
- [ ] Sidebar derecha muestra "IVA (16%):" (dinámico desde plugin)
- [ ] NO hay console errors sobre `useCountryPlugin`

**Si falla:**
- Verificar que `NewOrderFormV2.jsx` importa `useCountryPlugin` (Phase 5)
- Revisar que `fiscalIdLabel` y `phonePrefix` se derivan del plugin

---

## ✅ TEST 4: Payment Dialog → Cálculo IGTF

**Pasos:**
1. Desde orden nueva, agregar 1 producto cualquiera
2. Hacer click en "Crear Orden"
3. Abrir dialog de pago (si no se abre automático, buscar botón "Pagar")
4. Seleccionar método de pago en USD (ej: "Zelle", "Efectivo USD")
5. Ingresar monto: `100`

**Verificar:**
- [ ] Label muestra "IGTF (3%):" (NO hardcoded)
- [ ] Cálculo automático muestra: `$3.00` (100 × 0.03)
- [ ] Si cambias a método VES, IGTF desaparece
- [ ] Si regresas a USD, IGTF reaparece con cálculo correcto

**Si falla:**
- Verificar que `PaymentDialogV2.jsx` usa `igtfRate` derivado del plugin (Phase 7)
- Revisar console para errores de cálculo

---

## ✅ TEST 5: Billing Drawer → Crear factura

**Pasos:**
1. Ir a `/billing` (Facturación)
2. Click "Nueva Factura"
3. Observar formulario

**Verificar:**
- [ ] Dropdown de moneda muestra opciones correctas ("Bolívares (VES)", "Dólares (USD)")
- [ ] Label de impuesto dice "IVA (16%)" (dinámico)
- [ ] Label fiscal dice "RIF / Cédula *" (NO hardcoded como solo "RIF")
- [ ] Campo de tasa de cambio menciona "BCV" (NO hardcoded, viene de plugin)

**Si falla:**
- Verificar que `BillingDrawer.jsx` tiene plugin wiring (Phase 3)
- Verificar que `BillingCreateForm.jsx` tiene plugin wiring (Phase 4)

---

## ✅ TEST 6: Generar PDF → Dual-currency display

**Pasos:**
1. Desde orden existente con pago completo
2. Click botón "Descargar PDF" o "Imprimir"
3. Abrir PDF generado

**Verificar:**
- [ ] PDF se genera sin errores (no alert de error)
- [ ] Totales muestran formato dual: `"IVA: $16.00 / Bs 584.00"` (ejemplo con tasa 36.5)
- [ ] Labels dicen "IVA:" y "IGTF:" (NO hardcoded)
- [ ] Símbolo de moneda primaria es "Bs" (para VE)

**Si falla:**
- Verificar que `pdfGenerator.js` importa `resolvePlugin` (Phase 6)
- Revisar console para errores durante generación
- Verificar que `tenantSettings.countryCode` existe en DB

---

## 📊 Resultados Finales

**Passing:** ____ / 6 tests
**Failing:** ____ / 6 tests

### Si 6/6 pasan: ✅ Sistema básico funcional

### Si 4-5/6 pasan: ⚠️ Revisar tests fallidos, probablemente fixes rápidos

### Si <4/6 pasan: 🚨 Problema estructural, revisar logs y console errors

---

## 🐛 Debugging Tips

**Console errors comunes:**
```javascript
// Error: useCountryPlugin must be used within CountryPluginProvider
// Fix: Verificar que <CountryPluginProvider> wraps <App> en main.jsx

// Error: Cannot read property 'getPrimaryCurrency' of undefined
// Fix: Plugin no se está resolviendo, verificar registry.js

// Error: countryCode is undefined
// Fix: Ejecutar migration en DB para agregar countryCode: 'VE' a tenants
```

**Network errors comunes:**
```bash
# GET /country-plugins/VE → 404
# Fix: Backend CountryPluginModule no está registrado en app.module.ts

# GET /tenant/settings → countryCode null
# Fix: Schema tiene el campo pero DB no tiene datos, correr migration
```
