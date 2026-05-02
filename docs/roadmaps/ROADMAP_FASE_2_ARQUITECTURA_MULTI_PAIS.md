# FASE 2: ARQUITECTURA MULTI-PAÍS
## Sistema de Localizaciones

**Duración**: 4 sprints (8 semanas)
**Fecha**: 14 de Noviembre de 2025
**Versión**: 1.0

---

## ÍNDICE

1. [Objetivos de la Fase](#objetivos-de-la-fase)
2. [Arquitectura de Localizaciones](#arquitectura-de-localizaciones)
3. [Sistema de Plugins Fiscales](#sistema-de-plugins-fiscales)
4. [Wizard de Configuración](#wizard-de-configuración)
5. [API de Gestión Fiscal](#api-de-gestión-fiscal)
6. [Migración de Datos](#migración-de-datos)

---

## OBJETIVOS DE LA FASE

### Qué Construiremos

✅ **Sistema de Localizaciones**
- Plugin architecture para agregar países sin tocar código core
- Cada país es un plugin independiente con sus reglas
- Hot-swappable: cambiar localización sin restart

✅ **TaxConfiguration Engine Avanzado**
- Reglas complejas: condicionales, rangos, escalas
- Validación automática según normativa del país
- Versionado de configuraciones (cambios de ley)

✅ **Wizard de Setup**
- Onboarding guiado para nuevos países
- Auto-detección de país por tenant
- Templates precargados por industria

✅ **API de Gestión**
- CRUD completo de configuraciones fiscales
- Simulador de impuestos (preview antes de guardar)
- Importar/exportar configuraciones

✅ **Data Migration Tools**
- Migrar de Venezuela legacy a nuevo sistema
- Convertir configuraciones entre países
- Rollback automático

---

## ARQUITECTURA DE LOCALIZACIONES

### Concepto: Plugin per Country

Cada país es un módulo NestJS separado que implementa una interfaz común.

```
src/
├── modules/
│   ├── tax/                    # Core (agnóstico de país)
│   │   ├── tax.module.ts
│   │   ├── tax.service.ts
│   │   └── interfaces/
│   │       └── localization.interface.ts  # ⭐ Contrato
│   │
│   └── localizations/          # ⭐ Localizaciones por país
│       ├── localization.module.ts
│       ├── localization.factory.ts  # Factory pattern
│       │
│       ├── venezuela/
│       │   ├── venezuela.module.ts
│       │   ├── venezuela-tax.provider.ts
│       │   ├── venezuela-withholding.provider.ts
│       │   ├── venezuela-reports.provider.ts
│       │   └── validators/
│       │       ├── rif.validator.ts
│       │       └── control-number.validator.ts
│       │
│       ├── mexico/
│       │   ├── mexico.module.ts
│       │   ├── mexico-tax.provider.ts
│       │   ├── mexico-cfdi.provider.ts
│       │   └── validators/
│       │       └── rfc.validator.ts
│       │
│       ├── colombia/
│       │   ├── colombia.module.ts
│       │   └── ...
│       │
│       └── usa/
│           ├── usa.module.ts
│           └── ...
```

### LocalizationInterface

**Archivo**: `src/modules/tax/interfaces/localization.interface.ts`

```typescript
export interface TaxRule {
  condition: string;  // Expresión evaluable: "amount > 1000 && customerType === 'J'"
  action: {
    taxType: string;
    rate: number;
    exemptions?: string[];
  };
}

export interface WithholdingRule {
  applicableOn: 'purchase' | 'sale' | 'both';
  condition: string;
  rate: number;
  certificateRequired: boolean;
  declarationFrequency: 'monthly' | 'quarterly' | 'annual';
}

export interface ReportFormat {
  name: string;
  fileType: 'txt' | 'xml' | 'json' | 'pdf';
  structure: Record<string, any>;  // JSON Schema del formato
  validator: (data: any) => boolean;
}

export interface ILocalizationProvider {
  /**
   * Código ISO del país
   */
  getCountryCode(): string;

  /**
   * Nombre del país
   */
  getCountryName(): string;

  /**
   * Reglas de impuestos aplicables
   */
  getTaxRules(): TaxRule[];

  /**
   * Reglas de retenciones
   */
  getWithholdingRules(): WithholdingRule[];

  /**
   * Formatos de reportes oficiales
   */
  getReportFormats(): ReportFormat[];

  /**
   * Valida un número de identificación fiscal
   */
  validateTaxId(taxId: string, taxType?: string): Promise<boolean>;

  /**
   * Calcula impuesto según reglas del país
   */
  calculateTax(
    amount: number,
    taxType: string,
    context: TaxCalculationContext,
  ): Promise<number>;

  /**
   * Genera reporte en formato oficial
   */
  generateReport(
    reportType: string,
    data: any,
    format: 'txt' | 'xml' | 'pdf',
  ): Promise<Buffer>;

  /**
   * Seed de configuraciones default
   */
  seedDefaultConfigurations(tenantId: string, userId: string): Promise<void>;
}

export interface TaxCalculationContext {
  tenantId: string;
  customerId?: string;
  supplierId?: string;
  productCategory?: string;
  transactionDate: Date;
  additionalData?: Record<string, any>;
}
```

### VenezuelaProvider Implementation

**Archivo**: `src/modules/localizations/venezuela/venezuela-tax.provider.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ILocalizationProvider, TaxRule, WithholdingRule } from '../../tax/interfaces/localization.interface';

@Injectable()
export class VenezuelaTaxProvider implements ILocalizationProvider {
  private readonly logger = new Logger(VenezuelaTaxProvider.name);

  getCountryCode(): string {
    return 'VE';
  }

  getCountryName(): string {
    return 'Venezuela';
  }

  getTaxRules(): TaxRule[] {
    return [
      {
        condition: 'product.category === "alimentos_basicos"',
        action: {
          taxType: 'IVA',
          rate: 0.08,  // IVA reducido
        },
      },
      {
        condition: 'product.category === "medicinas"',
        action: {
          taxType: 'IVA',
          rate: 0.08,
        },
      },
      {
        condition: 'true',  // Default rule
        action: {
          taxType: 'IVA',
          rate: 0.16,  // IVA general
        },
      },
      {
        condition: 'payment.currency === "USD"',
        action: {
          taxType: 'IGTF',
          rate: 0.03,
          exemptions: ['customer.isGovernment', 'customer.isDiplomatic'],
        },
      },
    ];
  }

  getWithholdingRules(): WithholdingRule[] {
    return [
      {
        applicableOn: 'purchase',
        condition: 'supplier.taxType === "J" && amount > 1000',
        rate: 0.75,  // 75% del IVA
        certificateRequired: true,
        declarationFrequency: 'monthly',
      },
      {
        applicableOn: 'purchase',
        condition: 'supplier.taxType === "V" && service === "professional"',
        rate: 1.00,  // 100% del IVA
        certificateRequired: true,
        declarationFrequency: 'monthly',
      },
    ];
  }

  getReportFormats(): ReportFormat[] {
    return [
      {
        name: 'Libro de Ventas',
        fileType: 'txt',
        structure: {
          header: ['RIF', 'PERIODO'],
          detail: [
            'TIPO_TRANS',
            'NUM_FACTURA',
            'NUM_CONTROL',
            'FECHA',
            'TIPO_DOC',
            'NUM_DOC',
            'NOMBRE',
            'TOTAL',
            'BASE_IMPONIBLE',
            'MONTO_EXENTO',
            'IVA',
            'ALICUOTA',
          ],
          footer: ['TOTALES'],
        },
        validator: (data) => {
          // Validar formato SENIAT
          return data.header.length === 2 && data.detail.length > 0;
        },
      },
      {
        name: 'Declaración IVA (Forma 30)',
        fileType: 'xml',
        structure: {
          // Estructura XML de Forma 30
        },
        validator: (data) => true,
      },
    ];
  }

  async validateTaxId(taxId: string, taxType?: string): Promise<boolean> {
    // Validar RIF venezolano
    const regex = /^[VEJPG]-\d{8,9}-\d$/;
    if (!regex.test(taxId)) {
      return false;
    }

    // TODO: Validar contra API de SENIAT (si está disponible)
    return true;
  }

  async calculateTax(
    amount: number,
    taxType: string,
    context: TaxCalculationContext,
  ): Promise<number> {
    this.logger.debug(`Calculating ${taxType} for amount ${amount}`);

    // Evaluar reglas
    const rules = this.getTaxRules();
    for (const rule of rules) {
      if (this.evaluateCondition(rule.condition, context)) {
        if (rule.action.taxType === taxType) {
          const taxAmount = amount * rule.action.rate;
          this.logger.debug(`Applied rule: ${rule.condition}, tax: ${taxAmount}`);
          return Math.round(taxAmount * 100) / 100;
        }
      }
    }

    return 0;
  }

  async generateReport(
    reportType: string,
    data: any,
    format: 'txt' | 'xml' | 'pdf',
  ): Promise<Buffer> {
    if (reportType === 'sales_book' && format === 'txt') {
      return this.generateSalesBookTXT(data);
    }

    throw new Error(`Report ${reportType} in format ${format} not supported`);
  }

  async seedDefaultConfigurations(tenantId: string, userId: string): Promise<void> {
    // Ya implementado en TaxConfigurationService.seedVenezuelaDefaults()
    this.logger.log(`Seeding Venezuela defaults for tenant ${tenantId}`);
  }

  private evaluateCondition(condition: string, context: TaxCalculationContext): boolean {
    // Evaluación segura de condiciones
    // TODO: Usar una librería como expr-eval o crear un parser simple
    // Por ahora, condiciones hardcodeadas
    if (condition === 'true') return true;

    // Ejemplo simplificado
    if (condition.includes('product.category')) {
      const category = context.additionalData?.product?.category;
      if (condition.includes('alimentos_basicos')) {
        return category === 'alimentos_basicos';
      }
    }

    return false;
  }

  private generateSalesBookTXT(data: any): Buffer {
    // Implementación existente de SalesBookService
    // Mover lógica aquí
    const lines = [];
    // ... generar TXT
    return Buffer.from(lines.join('\n'), 'utf-8');
  }
}
```

### LocalizationFactory

**Archivo**: `src/modules/localizations/localization.factory.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { ILocalizationProvider } from '../tax/interfaces/localization.interface';
import { VenezuelaTaxProvider } from './venezuela/venezuela-tax.provider';
import { MexicoTaxProvider } from './mexico/mexico-tax.provider';
import { ColombiaTaxProvider } from './colombia/colombia-tax.provider';
import { USATaxProvider } from './usa/usa-tax.provider';

@Injectable()
export class LocalizationFactory {
  private providers: Map<string, ILocalizationProvider> = new Map();

  constructor(
    private venezuelaProvider: VenezuelaTaxProvider,
    private mexicoProvider: MexicoTaxProvider,
    private colombiaProvider: ColombiaTaxProvider,
    private usaProvider: USATaxProvider,
  ) {
    // Registrar providers
    this.providers.set('VE', venezuelaProvider);
    this.providers.set('MX', mexicoProvider);
    this.providers.set('CO', colombiaProvider);
    this.providers.set('US', usaProvider);
  }

  getProvider(countryCode: string): ILocalizationProvider {
    const provider = this.providers.get(countryCode.toUpperCase());
    if (!provider) {
      throw new NotFoundException(`Localization for country ${countryCode} not found`);
    }
    return provider;
  }

  getSupportedCountries(): string[] {
    return Array.from(this.providers.keys());
  }

  registerProvider(countryCode: string, provider: ILocalizationProvider): void {
    this.providers.set(countryCode.toUpperCase(), provider);
  }
}
```

### Uso en TaxCalculationService

**Modificar**: `src/modules/tax/tax-calculation.service.ts`

```typescript
@Injectable()
export class TaxCalculationService {
  constructor(
    // ... existentes
    private localizationFactory: LocalizationFactory,
  ) {}

  async calculateAllTaxes(
    dto: CalculateTaxDto,
    tenantId: string,
    countryCode: string = 'VE',  // Default Venezuela
  ): Promise<TaxCalculationResultDto> {
    // Obtener provider del país
    const provider = this.localizationFactory.getProvider(countryCode);

    // Usar lógica del provider
    const taxAmount = await provider.calculateTax(
      dto.amount,
      dto.taxType,
      {
        tenantId,
        customerId: dto.customerId,
        transactionDate: new Date(dto.transactionDate || Date.now()),
        additionalData: dto.additionalData,
      },
    );

    return {
      totalTaxAmount: taxAmount,
      totalBaseAmount: dto.amount,
      totalAmount: dto.amount + taxAmount,
      breakdown: [
        {
          taxType: dto.taxType,
          taxCode: `${countryCode}-${dto.taxType}`,
          taxName: `${dto.taxType} (${provider.getCountryName()})`,
          baseAmount: dto.amount,
          taxRate: taxAmount / dto.amount,
          taxAmount,
          taxConfigurationId: null,
        },
      ],
      warnings: [],
      exemptions: [],
    };
  }
}
```

---

## SISTEMA DE PLUGINS FISCALES

### Cómo Agregar un Nuevo País (10 pasos)

#### 1. Crear estructura del plugin

```bash
mkdir -p src/modules/localizations/spain
cd src/modules/localizations/spain

# Crear archivos base
touch spain.module.ts
touch spain-tax.provider.ts
touch spain-withholding.provider.ts
touch spain-reports.provider.ts
```

#### 2. Implementar SpainTaxProvider

```typescript
@Injectable()
export class SpainTaxProvider implements ILocalizationProvider {
  getCountryCode(): string {
    return 'ES';
  }

  getCountryName(): string {
    return 'España';
  }

  getTaxRules(): TaxRule[] {
    return [
      {
        condition: 'product.category === "alimentos"',
        action: { taxType: 'IVA', rate: 0.04 },  // Superreducido
      },
      {
        condition: 'product.category === "libros"',
        action: { taxType: 'IVA', rate: 0.04 },
      },
      {
        condition: 'product.category === "transporte"',
        action: { taxType: 'IVA', rate: 0.10 },  // Reducido
      },
      {
        condition: 'true',
        action: { taxType: 'IVA', rate: 0.21 },  // General
      },
    ];
  }

  getWithholdingRules(): WithholdingRule[] {
    return [
      {
        applicableOn: 'purchase',
        condition: 'service === "professional" && supplier.type === "freelancer"',
        rate: 0.15,  // IRPF 15%
        certificateRequired: true,
        declarationFrequency: 'quarterly',
      },
    ];
  }

  // ... implementar resto de métodos
}
```

#### 3. Crear SpainModule

```typescript
@Module({
  imports: [TaxModule],
  providers: [
    SpainTaxProvider,
    SpainWithholdingProvider,
    SpainReportsProvider,
  ],
  exports: [SpainTaxProvider],
})
export class SpainModule {}
```

#### 4. Registrar en LocalizationFactory

```typescript
// En localization.factory.ts constructor:
this.providers.set('ES', spainProvider);
```

#### 5. Seed default configurations

```typescript
async seedDefaultConfigurations(tenantId: string, userId: string): Promise<void> {
  const configs = [
    {
      country: 'ES',
      taxType: 'IVA',
      code: 'ES-IVA-GENERAL',
      name: 'IVA General 21%',
      rate: 0.21,
      // ...
    },
    {
      country: 'ES',
      taxType: 'IVA',
      code: 'ES-IVA-REDUCIDO',
      name: 'IVA Reducido 10%',
      rate: 0.10,
      // ...
    },
    // ...
  ];

  // Crear en base de datos
  for (const config of configs) {
    await taxConfigService.create(config, userId, tenantId);
  }
}
```

#### 6. Implementar validación de NIF

```typescript
async validateTaxId(taxId: string, taxType?: string): Promise<boolean> {
  // NIF: 12345678A
  // NIE: X1234567A
  // CIF: A12345678

  const regex = /^[A-Z]?\d{7,8}[A-Z]$/;
  if (!regex.test(taxId)) {
    return false;
  }

  // Validar dígito de control
  return this.validateNIFCheckDigit(taxId);
}

private validateNIFCheckDigit(nif: string): boolean {
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const number = nif.match(/\d+/)[0];
  const letter = nif.match(/[A-Z]/)[0];
  return letters[parseInt(number) % 23] === letter;
}
```

#### 7. Implementar generación de reportes

```typescript
async generateReport(
  reportType: string,
  data: any,
  format: 'txt' | 'xml' | 'pdf',
): Promise<Buffer> {
  if (reportType === 'modelo_303' && format === 'xml') {
    return this.generateModelo303XML(data);
  }

  if (reportType === 'modelo_340' && format === 'txt') {
    return this.generateModelo340TXT(data);
  }

  throw new Error(`Report ${reportType} not supported`);
}
```

#### 8. Tests

```typescript
describe('SpainTaxProvider', () => {
  it('should calculate IVA general 21%', async () => {
    const amount = await provider.calculateTax(100, 'IVA', {
      tenantId: 't1',
      transactionDate: new Date(),
    });

    expect(amount).toBe(21);
  });

  it('should validate NIF correctly', async () => {
    expect(await provider.validateTaxId('12345678A')).toBe(false); // Invalid
    expect(await provider.validateTaxId('12345678Z')).toBe(true);  // Valid
  });
});
```

#### 9. Documentación

```markdown
# España Localization

## Supported Taxes
- IVA: 21% (General), 10% (Reducido), 4% (Superreducido)
- IRPF: 15% (Freelancers)

## Reports
- Modelo 303: Declaración IVA trimestral
- Modelo 340: Libro de facturas
- Modelo 347: Operaciones con terceros

## Validation
- NIF: Natural person (12345678Z)
- NIE: Foreign resident (X1234567A)
- CIF: Company (A12345678)
```

#### 10. Activar en producción

```typescript
// Registrar provider
localizationFactory.registerProvider('ES', new SpainTaxProvider());

// Seed para nuevos tenants españoles
if (tenant.country === 'ES') {
  await spainProvider.seedDefaultConfigurations(tenant._id, user._id);
}
```

---

## WIZARD DE CONFIGURACIÓN

### Setup Wizard UI Flow

```
┌────────────────────────────────────────────────────────┐
│  STEP 1: Selección de País                             │
│  ────────────────────────────────────────────────────  │
│  ¿En qué país opera tu negocio?                        │
│  [ ] Venezuela 🇻🇪                                      │
│  [ ] México 🇲🇽                                         │
│  [ ] Colombia 🇨🇴                                       │
│  [ ] USA 🇺🇸                                            │
│  [ ] España 🇪🇸                                         │
│                                                        │
│  [Siguiente >]                                         │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  STEP 2: Información Fiscal                            │
│  ────────────────────────────────────────────────────  │
│  RIF/NIF de tu empresa: [_______________]              │
│  Razón Social: [_________________________]            │
│  ¿Eres agente de retención? ( ) Sí  (•) No           │
│  Régimen fiscal: [▼ General         ]                 │
│                                                        │
│  [< Atrás]  [Siguiente >]                             │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  STEP 3: Configuración de Impuestos                   │
│  ────────────────────────────────────────────────────  │
│  Hemos precargado estas tasas para Venezuela:         │
│                                                        │
│  ✓ IVA General 16%                                    │
│  ✓ IVA Reducido 8% (alimentos/medicinas)             │
│  ✓ IGTF 3% (transacciones en USD)                    │
│  ✓ Retención IVA 75% (personas jurídicas)            │
│  ✓ Retención IVA 100% (profesionales)                │
│                                                        │
│  [Editar configuraciones]  [Usar defaults]            │
│                                                        │
│  [< Atrás]  [Finalizar >]                             │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  STEP 4: Confirmación                                  │
│  ────────────────────────────────────────────────────  │
│  ¡Todo listo! ✓                                        │
│                                                        │
│  País: Venezuela 🇻🇪                                   │
│  RIF: J-12345678-9                                     │
│  Configuraciones: 5 impuestos activados               │
│                                                        │
│  [Ir al Dashboard]                                     │
└────────────────────────────────────────────────────────┘
```

### Backend Endpoint

**Archivo**: `src/modules/tax/tax-setup-wizard.controller.ts`

```typescript
@Controller('tax/setup-wizard')
export class TaxSetupWizardController {
  @Get('countries')
  async getSupportedCountries() {
    const countries = this.localizationFactory.getSupportedCountries();
    return {
      success: true,
      data: countries.map(code => ({
        code,
        name: this.localizationFactory.getProvider(code).getCountryName(),
      })),
    };
  }

  @Post('initialize')
  async initializeSetup(
    @Body() dto: InitializeSetupDto,
    @Request() req,
  ) {
    const { country, rif, businessName, isRetentionAgent, taxRegime } = dto;

    // 1. Actualizar tenant
    await this.tenantModel.updateOne(
      { _id: req.user.tenantId },
      {
        $set: {
          country,
          'taxInfo.rif': rif,
          'taxInfo.businessName': businessName,
          'taxInfo.isRetentionAgent': isRetentionAgent,
          'taxInfo.taxRegime': taxRegime,
        },
      },
    );

    // 2. Seed configuraciones default
    const provider = this.localizationFactory.getProvider(country);
    await provider.seedDefaultConfigurations(req.user.tenantId, req.user._id);

    // 3. Activar feature flags
    await this.tenantModel.updateOne(
      { _id: req.user.tenantId },
      {
        $set: {
          'featureFlags.useNewTaxModule': true,
        },
      },
    );

    return { success: true, message: 'Tax setup completed' };
  }

  @Get('preview')
  async previewConfigurations(
    @Query('country') country: string,
  ) {
    const provider = this.localizationFactory.getProvider(country);
    const rules = provider.getTaxRules();
    const withholdings = provider.getWithholdingRules();

    return {
      success: true,
      data: {
        taxRules: rules,
        withholdingRules: withholdings,
      },
    };
  }
}
```

---

## API DE GESTIÓN FISCAL

### Endpoints de Administración

```typescript
@Controller('tax/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaxAdminController {
  /**
   * Lista todas las configuraciones fiscales
   */
  @Get('configurations')
  @Permissions('tax_config_read')
  async listConfigurations(
    @Query() query: ListTaxConfigsDto,
    @Request() req,
  ) {
    const configs = await this.taxConfigService.findAll(req.user.tenantId, {
      country: query.country,
      taxType: query.taxType,
      isActive: query.isActive,
    });

    return { success: true, data: configs };
  }

  /**
   * Crea nueva configuración fiscal
   */
  @Post('configurations')
  @Permissions('tax_config_create')
  async createConfiguration(
    @Body() dto: CreateTaxConfigurationDto,
    @Request() req,
  ) {
    const config = await this.taxConfigService.create(
      dto,
      req.user._id,
      req.user.tenantId,
    );

    return { success: true, data: config };
  }

  /**
   * Simula cálculo de impuestos
   */
  @Post('simulate')
  @Permissions('tax_config_read')
  async simulateTax(
    @Body() dto: SimulateTaxDto,
    @Request() req,
  ) {
    const result = await this.taxCalculationService.calculateAllTaxes(
      dto,
      req.user.tenantId,
    );

    return {
      success: true,
      data: result,
      message: 'This is a simulation. No data was saved.',
    };
  }

  /**
   * Exporta configuraciones fiscales
   */
  @Get('export')
  @Permissions('tax_config_read')
  async exportConfigurations(
    @Query('format') format: 'json' | 'yaml',
    @Request() req,
  ) {
    const configs = await this.taxConfigService.findAll(req.user.tenantId);

    if (format === 'json') {
      return {
        success: true,
        data: configs,
        filename: `tax-configs-${Date.now()}.json`,
      };
    }

    // Convert to YAML
    const yaml = jsyaml.dump(configs);
    return {
      success: true,
      data: yaml,
      filename: `tax-configs-${Date.now()}.yaml`,
    };
  }

  /**
   * Importa configuraciones fiscales
   */
  @Post('import')
  @Permissions('tax_config_create')
  async importConfigurations(
    @Body() dto: ImportTaxConfigsDto,
    @Request() req,
  ) {
    let configs;

    if (dto.format === 'json') {
      configs = JSON.parse(dto.data);
    } else if (dto.format === 'yaml') {
      configs = jsyaml.load(dto.data);
    }

    const created = [];
    for (const config of configs) {
      try {
        const result = await this.taxConfigService.create(
          config,
          req.user._id,
          req.user.tenantId,
        );
        created.push(result);
      } catch (error) {
        this.logger.error(`Error importing config ${config.code}:`, error.message);
      }
    }

    return {
      success: true,
      data: {
        imported: created.length,
        total: configs.length,
      },
    };
  }
}
```

---

## MIGRACIÓN DE DATOS

### Migrar de Sistema Legacy a Multi-País

**Script**: `scripts/migrate-to-multi-country.ts`

```typescript
async function migrateToMultiCountry() {
  const tenants = await tenantModel.find({}).exec();

  for (const tenant of tenants) {
    const country = tenant.country || 'VE'; // Default Venezuela

    // 1. Crear configuraciones del país
    const provider = localizationFactory.getProvider(country);
    await provider.seedDefaultConfigurations(tenant._id.toString(), tenant.ownerId.toString());

    // 2. Migrar TaxTransactions existentes
    const taxTransactions = await taxTransactionModel.find({ tenantId: tenant._id }).exec();

    for (const tx of taxTransactions) {
      // Asignar configuración correcta
      const config = await taxConfigService.getActiveConfiguration(
        tenant._id.toString(),
        tx.taxType,
        tx.taxDate,
      );

      if (config) {
        tx.taxConfigurationId = config._id;
        tx.taxCode = config.code;
        await tx.save();
      }
    }

    console.log(`✅ Migrated tenant: ${tenant.name} (${country})`);
  }

  console.log('✅ All tenants migrated');
}
```

---

## CRITERIOS DE ACEPTACIÓN

- [ ] LocalizationInterface definida y documentada
- [ ] VenezuelaProvider implementado completamente
- [ ] LocalizationFactory funciona con 2+ países
- [ ] Wizard de setup genera configuraciones correctas
- [ ] API de admin CRUD completo
- [ ] Simulador de impuestos funciona
- [ ] Importar/exportar configuraciones OK
- [ ] Migración de datos legacy exitosa
- [ ] Tests de integración pasan 100%
- [ ] Documentación completa por país

---

**Siguiente**: [ROADMAP_FASE_3_EXPANSION.md](./ROADMAP_FASE_3_EXPANSION.md)
