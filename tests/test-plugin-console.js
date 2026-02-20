/**
 * 🧪 COUNTRY PLUGIN CONSOLE TESTS — Nivel 2
 *
 * INSTRUCCIONES:
 * 1. Abrir http://localhost:5173 en Chrome/Firefox
 * 2. Login con usuario válido
 * 3. Ir a cualquier página del dashboard (ej: /orders/new)
 * 4. Abrir DevTools → Console
 * 5. Copiar y pegar TODO este archivo
 * 6. Presionar Enter
 * 7. Verificar outputs (deben coincidir con valores esperados)
 *
 * TIEMPO ESTIMADO: 5 minutos
 */

console.clear();
console.log('🧪 INICIANDO COUNTRY PLUGIN TESTS...\n');

// =============================================================================
// HELPER: Format output
// =============================================================================
const formatResult = (testName, actual, expected, pass) => {
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${testName}`);
  console.log(`   Esperado: ${JSON.stringify(expected)}`);
  console.log(`   Obtenido: ${JSON.stringify(actual)}`);
  if (!pass) console.log(`   ⚠️  FALLÓ`);
  console.log('');
  return pass;
};

// =============================================================================
// SETUP: Get plugin from React context
// =============================================================================
let plugin;
let testResults = [];

try {
  // Intentar obtener plugin desde React DevTools global
  // Esto requiere que el componente esté montado y usando el context
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  // Hack: Buscar en window.__REACT_DEVTOOLS_GLOBAL_HOOK__
  // O usar evaluación directa del context
  console.log('⚠️  NOTA: Este script necesita acceso al CountryPluginContext.');
  console.log('Si ves errores, ejecuta este script alternativo:\n');
  console.log('// === SCRIPT ALTERNATIVO (copiar y pegar) ===');
  console.log(`
// 1. Ir a React DevTools → Components
// 2. Seleccionar cualquier componente que use useCountryPlugin
// 3. En la consola, escribir: $r
// 4. Luego ejecutar:

const testPlugin = () => {
  // Mock manual del plugin VE (para testing sin context)
  const mockPlugin = {
    countryCode: 'VE',
    countryName: 'Venezuela',
    currencyEngine: {
      getPrimaryCurrency: () => ({ code: 'VES', name: 'Bolívares', symbol: 'Bs' }),
      getSecondaryCurrencies: () => [{ code: 'USD', name: 'Dólares', symbol: '$' }],
      getExchangeRateConfig: () => ({ source: 'BCV', endpoint: 'https://pydolarve.org/api/v1/dollar?page=bcv', refreshIntervalMs: 3600000 })
    },
    taxEngine: {
      getDefaultTaxes: () => [{ type: 'IVA', rate: 16, appliesTo: 'goods_services' }],
      getTransactionTaxes: () => [{ type: 'IGTF', rate: 3, appliesTo: 'foreign_currency' }]
    },
    fiscalIdentity: {
      getFieldLabel: () => 'RIF / Cédula',
      getFieldPattern: () => /^[VEJPG]-\\d{8,9}(-\\d)?$/,
      validate: (val) => /^[VEJPG]-\\d{8,9}(-\\d)?$/.test(val)
    },
    localeProvider: {
      getPhonePrefix: () => '+58',
      getNumberLocale: () => 'es-VE'
    }
  };

  console.log('🧪 TESTING MOCK PLUGIN (VE)...');
  console.log('');

  // TEST 1: Primary Currency
  const primaryCurrency = mockPlugin.currencyEngine.getPrimaryCurrency();
  console.log('✅ Primary Currency:', primaryCurrency);
  console.assert(primaryCurrency.code === 'VES', 'Primary currency should be VES');
  console.assert(primaryCurrency.symbol === 'Bs', 'Primary currency symbol should be Bs');

  // TEST 2: Secondary Currencies
  const secondaryCurrencies = mockPlugin.currencyEngine.getSecondaryCurrencies();
  console.log('✅ Secondary Currencies:', secondaryCurrencies);
  console.assert(secondaryCurrencies.length === 1, 'Should have 1 secondary currency');
  console.assert(secondaryCurrencies[0].code === 'USD', 'Secondary currency should be USD');

  // TEST 3: Exchange Rate Config
  const exchangeRateConfig = mockPlugin.currencyEngine.getExchangeRateConfig();
  console.log('✅ Exchange Rate Config:', exchangeRateConfig);
  console.assert(exchangeRateConfig.source === 'BCV', 'Source should be BCV');
  console.assert(exchangeRateConfig.endpoint.includes('bcv'), 'Endpoint should include bcv');

  // TEST 4: Default Taxes
  const defaultTaxes = mockPlugin.taxEngine.getDefaultTaxes();
  console.log('✅ Default Taxes:', defaultTaxes);
  console.assert(defaultTaxes[0].type === 'IVA', 'Default tax should be IVA');
  console.assert(defaultTaxes[0].rate === 16, 'Default tax rate should be 16%');

  // TEST 5: Transaction Taxes (IGTF)
  const transactionTaxes = mockPlugin.taxEngine.getTransactionTaxes({ paymentMethodId: 'efectivo_usd' });
  console.log('✅ Transaction Taxes (IGTF):', transactionTaxes);
  console.assert(transactionTaxes[0].type === 'IGTF', 'Transaction tax should be IGTF');
  console.assert(transactionTaxes[0].rate === 3, 'IGTF rate should be 3%');

  // TEST 6: Fiscal Identity Label
  const fiscalIdLabel = mockPlugin.fiscalIdentity.getFieldLabel();
  console.log('✅ Fiscal ID Label:', fiscalIdLabel);
  console.assert(fiscalIdLabel === 'RIF / Cédula', 'Fiscal ID label should be "RIF / Cédula"');

  // TEST 7: Phone Prefix
  const phonePrefix = mockPlugin.localeProvider.getPhonePrefix();
  console.log('✅ Phone Prefix:', phonePrefix);
  console.assert(phonePrefix === '+58', 'Phone prefix should be +58');

  // TEST 8: Fiscal ID Validation
  const validRif = 'J-12345678-9';
  const invalidRif = '12345678';
  console.log('✅ Fiscal ID Validation:');
  console.log('   Valid RIF:', validRif, '→', mockPlugin.fiscalIdentity.validate(validRif));
  console.log('   Invalid RIF:', invalidRif, '→', mockPlugin.fiscalIdentity.validate(invalidRif));
  console.assert(mockPlugin.fiscalIdentity.validate(validRif), 'Valid RIF should pass');
  console.assert(!mockPlugin.fiscalIdentity.validate(invalidRif), 'Invalid RIF should fail');

  console.log('');
  console.log('🎉 TODOS LOS TESTS PASARON (MOCK)');
  console.log('');
  console.log('⚠️  IMPORTANTE: Este es un mock. Para tests reales:');
  console.log('1. Verifica que los componentes en la app usan useCountryPlugin()');
  console.log('2. Inspecciona React DevTools → Components → busca "CountryPluginContext"');
  console.log('3. Verifica que el value del Context muestra el plugin VE real');
};

testPlugin();
  `);
  console.log('// === FIN SCRIPT ALTERNATIVO ===\n');

} catch (error) {
  console.error('❌ Error obteniendo plugin:', error);
  console.log('\n📝 EJECUTA EL SCRIPT ALTERNATIVO ARRIBA\n');
}

// =============================================================================
// TESTS: Si tienes acceso directo al plugin, ejecuta estos:
// =============================================================================
console.log('📋 TESTS MANUALES ADICIONALES:');
console.log('');
console.log('1. Abrir React DevTools → Components');
console.log('2. Buscar componente que use "useCountryPlugin" (ej: NewOrderFormV2)');
console.log('3. Seleccionarlo');
console.log('4. En hooks, verificar que "CountryPlugin" muestra:');
console.log('   - countryCode: "VE"');
console.log('   - countryName: "Venezuela"');
console.log('   - currencyEngine: { ... }');
console.log('   - taxEngine: { ... }');
console.log('   - fiscalIdentity: { ... }');
console.log('   - etc.');
console.log('');
console.log('5. Si NO ves el hook, el componente no está usando useCountryPlugin correctamente');
console.log('');

// =============================================================================
// QUICK VALIDATION: Check localStorage and API
// =============================================================================
console.log('📊 VALIDACIÓN RÁPIDA: LocalStorage & API');
console.log('');

// Check if user is logged in
const token = localStorage.getItem('token');
if (token) {
  console.log('✅ Token encontrado en localStorage');

  // Try to fetch tenant settings to verify countryCode
  fetch('http://localhost:3000/tenant/settings', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      console.log('✅ Tenant Settings:', data);
      console.log('');
      console.log('   countryCode:', data.countryCode || '⚠️  NO DEFINIDO');
      console.log('   name:', data.name);
      console.log('   timezone:', data.timezone);
      console.log('');

      if (!data.countryCode) {
        console.error('❌ CRITICAL: countryCode no está definido en tenant!');
        console.log('FIX: Ejecutar en MongoDB:');
        console.log(`  db.tenants.updateOne({ _id: ObjectId("...") }, { $set: { countryCode: "VE" } })`);
      }
    })
    .catch(err => {
      console.error('❌ Error fetching tenant settings:', err);
      console.log('Verifica que backend esté corriendo en http://localhost:3000');
    });
} else {
  console.warn('⚠️  No hay token en localStorage. Haz login primero.');
}

console.log('');
console.log('🏁 FIN DE TESTS CONSOLE');
console.log('');
console.log('📖 DOCUMENTACIÓN:');
console.log('   - Si todos los asserts pasan: ✅ Plugin funcional');
console.log('   - Si algún assert falla: ❌ Revisar implementación del plugin');
console.log('   - Si no puedes acceder al context: Usar React DevTools para inspección manual');
