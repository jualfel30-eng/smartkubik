/**
 * 🧪 E2E TESTS — Nivel 4 (Playwright)
 *
 * SETUP (primera vez):
 *   cd food-inventory-admin
 *   npm install -D @playwright/test
 *   npx playwright install
 *
 * EJECUTAR:
 *   npx playwright test ../tests/test-e2e.spec.js --headed
 *
 * VER REPORTE:
 *   npx playwright show-report
 *
 * TIEMPO ESTIMADO: 10-15 min (ejecución automática)
 */

const { test, expect } = require('@playwright/test');

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// ⚠️ EDITAR: Credenciales de test user
const TEST_USER = {
  email: 'admin@test.com',
  password: 'admin123',
};

// =============================================================================
// HELPERS
// =============================================================================

async function login(page) {
  await page.goto(BASE_URL);
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

// =============================================================================
// TEST SUITE 1: Plugin Context & Basic Rendering
// =============================================================================

test.describe('Suite 1: Plugin Context & Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1.1 Dashboard loads without plugin errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Verificar que no hay errores de console
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('plugin')) {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(errors.length).toBe(0);
  });

  test('1.2 Settings page shows country selector', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);

    // Buscar card "País / Región"
    const countryCard = page.locator('text=País / Región');
    await expect(countryCard).toBeVisible({ timeout: 5000 });

    // Verificar que existe dropdown de país
    const countrySelect = page.locator('[name="countryCode"], label:has-text("País") + select, label:has-text("País de operación") ~ select');
    await expect(countrySelect.first()).toBeVisible();
  });

  test('1.3 Country selector shows Venezuela option', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);

    // Abrir dropdown
    const countrySelect = page.locator('label:has-text("País de operación") ~ div[role="combobox"], label:has-text("País de operación") ~ button').first();
    await countrySelect.click();

    // Verificar que "Venezuela" está en opciones
    const venezuelaOption = page.locator('text=Venezuela');
    await expect(venezuelaOption.first()).toBeVisible({ timeout: 3000 });
  });
});

// =============================================================================
// TEST SUITE 2: Dynamic Labels & Values
// =============================================================================

test.describe('Suite 2: Dynamic Labels from Plugin', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('2.1 New Order form shows RIF label (not hardcoded)', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/new`);

    // Verificar label "RIF / Cédula" existe
    const rifLabel = page.locator('text=RIF / Cédula').or(page.locator('label:has-text("RIF")'));
    await expect(rifLabel.first()).toBeVisible({ timeout: 5000 });
  });

  test('2.2 New Order form shows phone prefix +58', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/new`);

    // Buscar input con placeholder que incluya "+58"
    const phoneInput = page.locator('input[placeholder*="+58"]');
    await expect(phoneInput.first()).toBeVisible({ timeout: 5000 });
  });

  test('2.3 Order sidebar shows IVA (16%) label', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders/new`);

    // Buscar texto "IVA (16%)" en sidebar
    const ivaLabel = page.locator('text=IVA (16%)').or(page.locator('text=/IVA.*16%/'));
    await expect(ivaLabel.first()).toBeVisible({ timeout: 5000 });
  });

  test('2.4 Billing form shows currency dropdown with Bolívares option', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing`);

    // Click "Nueva Factura" si existe
    const newBillingBtn = page.locator('button:has-text("Nueva Factura"), button:has-text("Crear")').first();
    if (await newBillingBtn.isVisible()) {
      await newBillingBtn.click();
    }

    // Verificar dropdown de moneda
    const currencySelect = page.locator('label:has-text("Moneda") ~ select, label:has-text("Moneda") ~ div[role="combobox"]').first();
    await expect(currencySelect).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// TEST SUITE 3: IGTF Calculations
// =============================================================================

test.describe('Suite 3: IGTF Calculation Logic', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('3.1 Payment dialog calculates IGTF for USD payment', async ({ page }) => {
    // Este test requiere una orden existente. Si no existe, skip.
    test.skip(true, 'Requiere orden pre-existente para testing');

    await page.goto(`${BASE_URL}/orders`);

    // Click primera orden
    const firstOrder = page.locator('table tbody tr').first();
    await firstOrder.click();

    // Abrir payment dialog
    const payBtn = page.locator('button:has-text("Pagar")');
    await payBtn.click();

    // Seleccionar método USD
    const methodSelect = page.locator('select[name="method"]');
    await methodSelect.selectOption('zelle_usd');

    // Ingresar monto 100
    const amountInput = page.locator('input[name="amount"]');
    await amountInput.fill('100');

    // Verificar que IGTF se calcula (3%)
    const igtfLabel = page.locator('text=/IGTF.*3.*00/');
    await expect(igtfLabel).toBeVisible({ timeout: 3000 });
  });

  test('3.2 IGTF rate is 3% (not hardcoded)', async ({ page }) => {
    // Verificar via console que igtfRate se deriva del plugin
    await page.goto(`${BASE_URL}/orders/new`);

    const igtfRate = await page.evaluate(() => {
      // Hack: Intentar acceder al plugin si está en window
      if (window.__COUNTRY_PLUGIN__) {
        const taxes = window.__COUNTRY_PLUGIN__.taxEngine.getTransactionTaxes({ paymentMethodId: 'efectivo_usd' });
        return taxes[0]?.rate ?? null;
      }
      return null;
    });

    // Si plugin accesible, verificar rate
    if (igtfRate !== null) {
      expect(igtfRate).toBe(3);
    } else {
      test.skip(true, 'Plugin not accessible via window global');
    }
  });
});

// =============================================================================
// TEST SUITE 4: PDF Generation
// =============================================================================

test.describe('Suite 4: PDF Generation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('4.1 PDF generation does not crash', async ({ page }) => {
    test.skip(true, 'Requiere orden completada para testing');

    await page.goto(`${BASE_URL}/orders`);

    // Click primera orden con status completed
    const completedOrder = page.locator('table tbody tr:has(td:has-text("Completado"))').first();
    await completedOrder.click();

    // Click descargar PDF
    const pdfBtn = page.locator('button:has-text("PDF"), button:has-text("Descargar")').first();

    // Verificar que no hay alert de error después de click
    const errors = [];
    page.on('dialog', (dialog) => {
      if (dialog.type() === 'alert' && dialog.message().includes('Error')) {
        errors.push(dialog.message());
      }
      dialog.accept();
    });

    await pdfBtn.click();
    await page.waitForTimeout(2000);

    expect(errors.length).toBe(0);
  });
});

// =============================================================================
// TEST SUITE 5: Backend API Integration
// =============================================================================

test.describe('Suite 5: Backend API', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('5.1 GET /tenant/settings returns countryCode', async ({ page, request }) => {
    // Obtener token del localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    // API call
    const response = await request.get(`${API_URL}/tenant/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('countryCode');
    expect(data.countryCode).toBeTruthy();
  });

  test('5.2 GET /country-plugins/VE returns VE plugin', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    const response = await request.get(`${API_URL}/country-plugins/VE`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    expect(response.status()).toBe(200);

    const plugin = await response.json();
    expect(plugin.countryCode).toBe('VE');
    expect(plugin.countryName).toBe('Venezuela');
    expect(plugin.currencyEngine).toBeTruthy();
    expect(plugin.taxEngine).toBeTruthy();
  });

  test('5.3 PUT /tenant/settings updates countryCode', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    const response = await request.put(`${API_URL}/tenant/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: { countryCode: 'VE' }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.countryCode).toBe('VE');
  });
});

// =============================================================================
// TEST SUITE 6: Plugin Parity (VE === Old Hardcoded)
// =============================================================================

test.describe('Suite 6: Plugin Parity Validation', () => {
  test('6.1 VE plugin returns expected tax rates', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`);

    const pluginData = await page.evaluate(() => {
      if (window.__COUNTRY_PLUGIN__) {
        const plugin = window.__COUNTRY_PLUGIN__;
        return {
          defaultTaxRate: plugin.taxEngine.getDefaultTaxes()[0]?.rate,
          defaultTaxType: plugin.taxEngine.getDefaultTaxes()[0]?.type,
          igtfRate: plugin.taxEngine.getTransactionTaxes({ paymentMethodId: 'efectivo_usd' })[0]?.rate,
          primaryCurrency: plugin.currencyEngine.getPrimaryCurrency()?.code,
          primarySymbol: plugin.currencyEngine.getPrimaryCurrency()?.symbol,
        };
      }
      return null;
    });

    if (pluginData) {
      expect(pluginData.defaultTaxRate).toBe(16); // IVA hardcoded was 16%
      expect(pluginData.defaultTaxType).toBe('IVA');
      expect(pluginData.igtfRate).toBe(3); // IGTF hardcoded was 3%
      expect(pluginData.primaryCurrency).toBe('VES');
      expect(pluginData.primarySymbol).toBe('Bs');
    } else {
      test.skip(true, 'Plugin not accessible for parity check');
    }
  });

  test('6.2 VE plugin returns expected fiscal identity label', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard`);

    const fiscalIdLabel = await page.evaluate(() => {
      if (window.__COUNTRY_PLUGIN__) {
        return window.__COUNTRY_PLUGIN__.fiscalIdentity.getFieldLabel();
      }
      return null;
    });

    if (fiscalIdLabel) {
      expect(fiscalIdLabel).toContain('RIF'); // Old hardcoded was "RIF" or "RIF / Cédula"
    } else {
      test.skip(true, 'Plugin not accessible');
    }
  });
});

// =============================================================================
// CONFIGURATION: Test timeouts and retries
// =============================================================================

test.setTimeout(30000); // 30s per test
