# FASE 3: EXPANSIÓN INTERNACIONAL
## México, Colombia, USA, España

**Duración**: Variable por país (6-9 sprints cada uno)
**Fecha**: 14 de Noviembre de 2025
**Versión**: 1.0

---

## ÍNDICE

1. [Estrategia de Expansión](#estrategia-de-expansión)
2. [México](#méxico)
3. [Colombia](#colombia)
4. [USA](#usa)
5. [España](#españa)
6. [Checklist por País](#checklist-por-país)

---

## ESTRATEGIA DE EXPANSIÓN

### Orden Prioritario

```
1. México (3 sprints = 6 semanas)
   - Más cercano culturalmente a Venezuela
   - Normativa similar (IVA, retenciones)
   - Mercado grande (130M personas)

2. Colombia (3 sprints = 6 semanas)
   - Mercado andino
   - IVA + ReteFuente similar a Venezuela
   - Facturación electrónica obligatoria

3. USA (4 sprints = 8 semanas)
   - Más complejo (50 estados, diferentes sales tax)
   - Mercado premium
   - Compliance crítico (IRS)

4. España (3 sprints = 6 semanas)
   - Entrada a Europa
   - Normativa EU armonizada
   - IVA + modelos fiscales
```

### Recursos por País

Cada país requiere:
- **1 Backend Developer** (implementación)
- **1 Contador/Asesor Fiscal Local** (validación normativa)
- **0.5 QA** (testing)
- **Consultoría Legal** ($2,000-$5,000 one-time)

---

## MÉXICO

### Duración: 3 sprints (6 semanas)

### Impuestos a Implementar

#### 1. IVA (Impuesto al Valor Agregado)

**Tasas**:
- General: 16%
- Frontera: 8% (Baja California, etc.)
- Exento: 0% (alimentos básicos, medicinas)

**Implementación**:

```typescript
@Injectable()
export class MexicoTaxProvider implements ILocalizationProvider {
  getCountryCode(): string {
    return 'MX';
  }

  getTaxRules(): TaxRule[] {
    return [
      {
        condition: 'tenant.state in ["BCS", "BC", "SON", "CHH", "TAM", "NLE", "COA"]',
        action: { taxType: 'IVA', rate: 0.08 },  // Zona fronteriza
      },
      {
        condition: 'product.category in ["alimentos_basicos", "medicinas"]',
        action: { taxType: 'IVA', rate: 0.00 },  // Exento
      },
      {
        condition: 'true',
        action: { taxType: 'IVA', rate: 0.16 },  // General
      },
    ];
  }

  getWithholdingRules(): WithholdingRule[] {
    return [
      {
        applicableOn: 'purchase',
        condition: 'supplier.type === "persona_fisica" && service === "honorarios"',
        rate: 0.10,  // ISR 10% honorarios
        certificateRequired: true,
        declarationFrequency: 'monthly',
      },
      {
        applicableOn: 'purchase',
        condition: 'supplier.type === "persona_moral" && amount > 2000',
        rate: 0.0666,  // IVA 2/3 = 6.66%
        certificateRequired: true,
        declarationFrequency: 'monthly',
      },
    ];
  }

  async validateTaxId(taxId: string, taxType?: string): Promise<boolean> {
    // Validar RFC (Registro Federal de Contribuyentes)
    // Persona Física: CURP + homoclave (13 caracteres)
    // Persona Moral: 12 caracteres

    const personaFisicaRegex = /^[A-Z]{4}\d{6}[A-Z\d]{3}$/;
    const personaMoralRegex = /^[A-Z&Ñ]{3}\d{6}[A-Z\d]{3}$/;

    return personaFisicaRegex.test(taxId) || personaMoralRegex.test(taxId);
  }
}
```

#### 2. ISR (Impuesto Sobre la Renta)

**Retenciones**:
- Honorarios: 10%
- Arrendamiento: 10%
- Salarios: Tabla progresiva

**Implementación**:

```typescript
async calculateISRWithholding(
  amount: number,
  serviceType: string,
): Promise<number> {
  const rates = {
    honorarios: 0.10,
    arrendamiento: 0.10,
    fletes: 0.04,
  };

  return amount * (rates[serviceType] || 0);
}
```

#### 3. CFDI (Comprobante Fiscal Digital por Internet)

**Facturación Electrónica Obligatoria**

```typescript
interface CFDIData {
  version: '4.0';
  serie: string;
  folio: string;
  fecha: string;  // ISO 8601
  sello: string;  // Firma digital SAT
  noCertificado: string;
  certificado: string;
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };
  receptor: {
    rfc: string;
    nombre: string;
    usoCFDI: string;  // G01, G03, etc.
  };
  conceptos: Array<{
    claveProdServ: string;  // Catálogo SAT
    cantidad: number;
    claveUnidad: string;
    unidad: string;
    descripcion: string;
    valorUnitario: number;
    importe: number;
    impuestos: {
      traslados: Array<{ impuesto: '002'; tipoFactor: 'Tasa'; tasaOCuota: '0.160000'; importe: number }>;
    };
  }>;
  impuestos: {
    totalImpuestosTrasladados: number;
  };
  total: number;
}

@Injectable()
export class MexicoCFDIService {
  async generateCFDI(order: OrderDocument): Promise<string> {
    const cfdi: CFDIData = {
      version: '4.0',
      serie: 'A',
      folio: order.orderNumber,
      fecha: order.orderDate.toISOString(),
      // ... resto de campos

      conceptos: order.items.map(item => ({
        claveProdServ: item.product.satCode || '01010101',
        cantidad: item.quantity,
        claveUnidad: 'H87',  // Pieza
        unidad: 'Pieza',
        descripcion: item.product.name,
        valorUnitario: item.price,
        importe: item.quantity * item.price,
        impuestos: {
          traslados: [
            {
              impuesto: '002',  // IVA
              tipoFactor: 'Tasa',
              tasaOCuota: '0.160000',
              importe: item.ivaAmount,
            },
          ],
        },
      })),

      total: order.totalAmount,
    };

    // Generar XML
    const xml = this.buildCFDIXML(cfdi);

    // Timbrar con PAC (Proveedor Autorizado de Certificación)
    const timbrado = await this.stamWithPAC(xml);

    return timbrado.xml;
  }

  private async stamWithPAC(xml: string): Promise<{ xml: string; uuid: string }> {
    // Integración con PAC (ej: Finkok, SW Sapien, Facturama)
    // TODO: Implementar según PAC seleccionado
    throw new Error('PAC integration not implemented');
  }
}
```

### Reportes Fiscales

#### 1. DIOT (Declaración Informativa de Operaciones con Terceros)

```typescript
async generateDIOT(
  tenantId: string,
  year: number,
  month: number,
): Promise<Buffer> {
  const purchases = await this.purchaseModel
    .find({
      tenantId,
      date: {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0),
      },
    })
    .exec();

  const lines = purchases.map(purchase => [
    '03',  // Tipo de tercero (03 = Proveedor nacional)
    'RFC',  // Tipo de operación
    purchase.supplier.rfc,
    purchase.supplier.name.substring(0, 100),
    'MEX',  // País
    'N/A',  // Nacionalidad
    purchase.baseAmount.toFixed(2),
    purchase.ivaAmount.toFixed(2),
    '0.00',  // IVA retenido
    '0.00',  // IVA no acreditable
  ].join('|'));

  return Buffer.from(lines.join('\n'), 'utf-8');
}
```

### Checklist México

- [ ] IVA general 16% + frontera 8%
- [ ] Retenciones ISR (honorarios, arrendamiento)
- [ ] Retenciones IVA 2/3
- [ ] CFDI generación XML
- [ ] Timbrado con PAC
- [ ] Validación de RFC
- [ ] Reporte DIOT
- [ ] Declaración mensual IVA
- [ ] Tests con contador mexicano

---

## COLOMBIA

### Duración: 3 sprints (6 semanas)

### Impuestos a Implementar

#### 1. IVA

**Tasas**:
- General: 19%
- Reducido: 5%
- Exento: 0%

```typescript
@Injectable()
export class ColombiaTaxProvider implements ILocalizationProvider {
  getTaxRules(): TaxRule[] {
    return [
      {
        condition: 'product.category === "alimentos_procesados"',
        action: { taxType: 'IVA', rate: 0.05 },
      },
      {
        condition: 'product.category === "servicios_publicos"',
        action: { taxType: 'IVA', rate: 0.05 },
      },
      {
        condition: 'product.category in ["educacion", "salud"]',
        action: { taxType: 'IVA', rate: 0.00 },
      },
      {
        condition: 'true',
        action: { taxType: 'IVA', rate: 0.19 },
      },
    ];
  }

  async validateTaxId(taxId: string): Promise<boolean> {
    // Validar NIT (Número de Identificación Tributaria)
    // 9-10 dígitos + dígito de verificación

    const regex = /^\d{9,10}-\d$/;
    if (!regex.test(taxId)) {
      return false;
    }

    // Validar dígito de verificación
    const [number, dv] = taxId.split('-');
    return this.calculateNITCheckDigit(number) === parseInt(dv);
  }

  private calculateNITCheckDigit(nit: string): number {
    const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let sum = 0;

    for (let i = 0; i < nit.length; i++) {
      sum += parseInt(nit[nit.length - 1 - i]) * primes[i];
    }

    const remainder = sum % 11;
    return remainder > 1 ? 11 - remainder : remainder;
  }
}
```

#### 2. ReteFuente (Retención en la Fuente)

**Conceptos principales**:
- Servicios profesionales: 10%
- Honorarios: 11%
- Arrendamientos: 3.5%
- Compras: 2.5%

```typescript
getWithholdingRules(): WithholdingRule[] {
  return [
    {
      applicableOn: 'purchase',
      condition: 'service === "honorarios"',
      rate: 0.11,
      certificateRequired: true,
      declarationFrequency: 'monthly',
    },
    {
      applicableOn: 'purchase',
      condition: 'service === "servicios_profesionales"',
      rate: 0.10,
      certificateRequired: true,
      declarationFrequency: 'monthly',
    },
    {
      applicableOn: 'purchase',
      condition: 'service === "arrendamiento"',
      rate: 0.035,
      certificateRequired: true,
      declarationFrequency: 'monthly',
    },
  ];
}
```

#### 3. Facturación Electrónica DIAN

```typescript
interface FacturaElectronicaColombia {
  cude: string;  // Código Único de Documento Electrónico
  numeroFactura: string;
  fechaEmision: string;
  emisor: {
    nit: string;
    nombre: string;
    direccion: string;
  };
  adquirente: {
    nit: string;
    nombre: string;
  };
  items: Array<{
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    valorTotal: number;
    impuestos: Array<{
      tipo: 'IVA' | 'INC' | 'ICA';
      tarifa: number;
      valor: number;
    }>;
  }>;
  total: number;
  qr: string;  // Código QR DIAN
}

@Injectable()
export class ColombiaDIANService {
  async generateFacturaElectronica(order: OrderDocument): Promise<string> {
    // 1. Generar XML según especificación UBL 2.1
    const xml = this.buildUBL21(order);

    // 2. Firmar digitalmente
    const signed = await this.signWithDigitalCertificate(xml);

    // 3. Enviar a DIAN
    const response = await this.sendToDIAN(signed);

    return response.cude;
  }
}
```

### Checklist Colombia

- [ ] IVA 19% + reducido 5%
- [ ] ReteFuente (10 conceptos principales)
- [ ] ReteIVA
- [ ] ReteICA
- [ ] Facturación electrónica DIAN (UBL 2.1)
- [ ] Firma digital
- [ ] Validación NIT
- [ ] Certificados de retención
- [ ] Tests con contador colombiano

---

## USA

### Duración: 4 sprints (8 semanas)

### Complejidad

USA es el más complejo por:
- **50 estados** con diferentes sales tax
- **~10,000 jurisdicciones locales** (county, city)
- **Nexus** (presencia física/económica determina obligación)
- **Tax holidays** (días sin impuestos)
- **Product categories** con diferentes tasas

### Sales Tax por Estado

```typescript
@Injectable()
export class USATaxProvider implements ILocalizationProvider {
  getTaxRules(): TaxRule[] {
    return [
      // Alaska: No state sales tax, pero permite local
      {
        condition: 'tenant.state === "AK"',
        action: { taxType: 'Sales_Tax', rate: 0.00 },
      },

      // California: 7.25% base + local
      {
        condition: 'tenant.state === "CA"',
        action: { taxType: 'Sales_Tax', rate: 0.0725 },
      },

      // Texas: 6.25%
      {
        condition: 'tenant.state === "TX"',
        action: { taxType: 'Sales_Tax', rate: 0.0625 },
      },

      // New York: 4% state + local (NYC = 8.875% total)
      {
        condition: 'tenant.state === "NY" && tenant.county === "New York"',
        action: { taxType: 'Sales_Tax', rate: 0.08875 },
      },
      {
        condition: 'tenant.state === "NY"',
        action: { taxType: 'Sales_Tax', rate: 0.04 },
      },

      // ... 46 estados más
    ];
  }

  async calculateTax(
    amount: number,
    taxType: string,
    context: TaxCalculationContext,
  ): Promise<number> {
    // Obtener tenant para saber ubicación
    const tenant = await this.tenantModel.findById(context.tenantId).exec();

    // Usar servicio externo para calcular (ej: TaxJar, Avalara)
    if (process.env.USE_TAXJAR === 'true') {
      return this.calculateWithTaxJar(amount, tenant, context);
    }

    // Fallback: calcular con reglas locales
    return this.calculateLocal(amount, tenant);
  }

  private async calculateWithTaxJar(
    amount: number,
    tenant: any,
    context: TaxCalculationContext,
  ): Promise<number> {
    // Integración con TaxJar API
    const taxjar = require('taxjar')(process.env.TAXJAR_API_KEY);

    const tax = await taxjar.taxForOrder({
      from_country: 'US',
      from_zip: tenant.zip,
      from_state: tenant.state,
      to_country: 'US',
      to_zip: context.additionalData?.customer?.zip,
      to_state: context.additionalData?.customer?.state,
      amount: amount,
      shipping: 0,
    });

    return tax.tax.amount_to_collect;
  }

  async validateTaxId(taxId: string): Promise<boolean> {
    // Validar EIN (Employer Identification Number)
    // Format: XX-XXXXXXX

    const regex = /^\d{2}-\d{7}$/;
    return regex.test(taxId);
  }
}
```

### Nexus Management

```typescript
interface NexusRule {
  state: string;
  type: 'physical' | 'economic';
  threshold?: {
    revenue: number;  // $100,000 annual
    transactions: number;  // 200 transactions
  };
  effectiveDate: Date;
}

@Injectable()
export class NexusService {
  async hasNexus(
    tenantId: string,
    state: string,
    year: number,
  ): Promise<boolean> {
    // 1. Physical nexus: oficina, almacén, empleados
    const hasPhysical = await this.hasPhysicalNexus(tenantId, state);
    if (hasPhysical) return true;

    // 2. Economic nexus: ventas >$100k o >200 transacciones
    const sales = await this.orderModel.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          'customer.state': state,
          orderDate: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    if (sales.length === 0) return false;

    const { totalRevenue, totalTransactions } = sales[0];

    // Thresholds comunes (varía por estado)
    return totalRevenue > 100000 || totalTransactions > 200;
  }
}
```

### Form 1099 (Reportes IRS)

```typescript
interface Form1099 {
  payer: {
    ein: string;
    name: string;
    address: string;
  };
  payee: {
    ssn: string;  // o EIN
    name: string;
    address: string;
  };
  year: number;
  boxAmounts: {
    box1_rents?: number;
    box2_royalties?: number;
    box3_otherIncome?: number;
    box7_nonemployeeCompensation?: number;
  };
}

async generate1099(
  tenantId: string,
  year: number,
): Promise<Form1099[]> {
  // Obtener todos los pagos a contractors >$600
  const payments = await this.paymentModel.aggregate([
    {
      $match: {
        tenantId: new Types.ObjectId(tenantId),
        paymentDate: {
          $gte: new Date(year, 0, 1),
          $lte: new Date(year, 11, 31),
        },
        'payee.type': 'contractor',
      },
    },
    {
      $group: {
        _id: '$payeeId',
        totalPaid: { $sum: '$amount' },
      },
    },
    {
      $match: {
        totalPaid: { $gte: 600 },  // Threshold IRS
      },
    },
  ]);

  const forms: Form1099[] = [];

  for (const payment of payments) {
    // Generar Form 1099-NEC por cada payee
    forms.push({
      payer: {
        ein: tenant.ein,
        name: tenant.businessName,
        address: tenant.address,
      },
      payee: {
        ssn: payment.payee.ssn,
        name: payment.payee.name,
        address: payment.payee.address,
      },
      year,
      boxAmounts: {
        box1_nonemployeeCompensation: payment.totalPaid,
      },
    });
  }

  return forms;
}
```

### Checklist USA

- [ ] Sales tax para 50 estados
- [ ] Integración TaxJar o Avalara
- [ ] Nexus management
- [ ] Economic nexus tracking
- [ ] Tax holidays (opcional)
- [ ] Product exemptions por categoría
- [ ] Form 1099 generation
- [ ] Validación EIN
- [ ] Tests con CPA americano
- [ ] Compliance audit

---

## ESPAÑA

### Duración: 3 sprints (6 semanas)

### Impuestos a Implementar

#### 1. IVA

**Tasas**:
- General: 21%
- Reducido: 10% (alimentación, transporte)
- Superreducido: 4% (alimentos básicos, libros, medicinas)

```typescript
@Injectable()
export class SpainTaxProvider implements ILocalizationProvider {
  getTaxRules(): TaxRule[] {
    return [
      {
        condition: 'product.category in ["alimentos_basicos", "pan", "leche", "frutas"]',
        action: { taxType: 'IVA', rate: 0.04 },  // Superreducido
      },
      {
        condition: 'product.category in ["alimentacion", "agua", "medicinas", "libros"]',
        action: { taxType: 'IVA', rate: 0.10 },  // Reducido
      },
      {
        condition: 'true',
        action: { taxType: 'IVA', rate: 0.21 },  // General
      },
    ];
  }

  async validateTaxId(taxId: string): Promise<boolean> {
    // Validar NIF/CIF/NIE
    const nifRegex = /^[0-9]{8}[A-Z]$/;
    const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;
    const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/;

    if (nifRegex.test(taxId)) {
      return this.validateNIF(taxId);
    }

    if (nieRegex.test(taxId)) {
      return this.validateNIE(taxId);
    }

    if (cifRegex.test(taxId)) {
      return this.validateCIF(taxId);
    }

    return false;
  }

  private validateNIF(nif: string): boolean {
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const number = parseInt(nif.substring(0, 8));
    const letter = nif.charAt(8);
    return letters[number % 23] === letter;
  }
}
```

#### 2. IRPF (Retenciones)

**Tasas comunes**:
- Profesionales: 15%
- Artistas: 15%
- Alquileres: 19%

```typescript
getWithholdingRules(): WithholdingRule[] {
  return [
    {
      applicableOn: 'purchase',
      condition: 'supplier.type === "autonomo" && service === "profesional"',
      rate: 0.15,
      certificateRequired: true,
      declarationFrequency: 'quarterly',
    },
    {
      applicableOn: 'purchase',
      condition: 'service === "alquiler"',
      rate: 0.19,
      certificateRequired: true,
      declarationFrequency: 'quarterly',
    },
  ];
}
```

#### 3. Modelos Fiscales

```typescript
interface Modelo303 {
  ejercicio: number;
  periodo: string;  // '1T', '2T', '3T', '4T'
  ivaDevengado: {
    base: number;
    cuota: number;
  };
  ivaSoportado: {
    base: number;
    cuota: number;
  };
  resultado: number;  // A ingresar o a compensar
}

async generateModelo303(
  tenantId: string,
  year: number,
  quarter: number,
): Promise<Modelo303> {
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 3;

  // IVA devengado (ventas)
  const sales = await this.orderModel.aggregate([
    {
      $match: {
        tenantId: new Types.ObjectId(tenantId),
        orderDate: {
          $gte: new Date(year, startMonth, 1),
          $lt: new Date(year, endMonth, 1),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalBase: { $sum: '$subtotal' },
        totalIVA: { $sum: '$ivaTotal' },
      },
    },
  ]);

  // IVA soportado (compras)
  const purchases = await this.purchaseModel.aggregate([
    // Similar query
  ]);

  return {
    ejercicio: year,
    periodo: `${quarter}T`,
    ivaDevengado: {
      base: sales[0].totalBase,
      cuota: sales[0].totalIVA,
    },
    ivaSoportado: {
      base: purchases[0].totalBase,
      cuota: purchases[0].totalIVA,
    },
    resultado: sales[0].totalIVA - purchases[0].totalIVA,
  };
}
```

### Checklist España

- [ ] IVA 21% + reducido 10% + superreducido 4%
- [ ] IRPF retenciones (15%, 19%)
- [ ] Validación NIF/CIF/NIE
- [ ] Modelo 303 (IVA trimestral)
- [ ] Modelo 340 (Libro de facturas)
- [ ] Modelo 347 (Operaciones con terceros)
- [ ] Modelo 115 (Retenciones alquileres)
- [ ] Certificados de retención
- [ ] Tests con asesor fiscal español

---

## CHECKLIST POR PAÍS

### Pre-Implementación (Todos los Países)

- [ ] Contratar asesor fiscal local
- [ ] Investigar normativa vigente
- [ ] Obtener ejemplos de reportes oficiales
- [ ] Identificar APIs gubernamentales disponibles
- [ ] Estimar complejidad (sprints)

### Durante Implementación

- [ ] Crear LocalizationProvider
- [ ] Implementar getTaxRules()
- [ ] Implementar getWithholdingRules()
- [ ] Implementar validateTaxId()
- [ ] Implementar calculateTax()
- [ ] Implementar generateReport()
- [ ] Seed default configurations
- [ ] Tests unitarios 80%+
- [ ] Tests de integración
- [ ] Validación con asesor fiscal

### Post-Implementación

- [ ] Documentación completa
- [ ] Video tutorial para usuarios
- [ ] FAQ en idioma local
- [ ] Soporte dedicado primer mes
- [ ] Monitoreo de errores
- [ ] Feedback de primeros usuarios
- [ ] Ajustes según feedback
- [ ] Audit de compliance

### Mantenimiento Continuo

- [ ] Revisar cambios normativos trimestralmente
- [ ] Actualizar tasas si cambian
- [ ] Renovar certificados digitales anualmente
- [ ] Auditoría fiscal anual
- [ ] Training a equipo de soporte

---

## RECURSOS ADICIONALES

### APIs de Terceros Recomendadas

**USA**:
- TaxJar: https://www.taxjar.com/
- Avalara: https://www.avalara.com/
- Vertex: https://www.vertexinc.com/

**México**:
- PAC Finkok: https://www.finkok.com/
- SW Sapien: https://www.sw.com.mx/
- Facturama: https://www.facturama.mx/

**Colombia**:
- Carvajal: https://www.carvajaltecnologia.com/
- Andes SCD: https://andesscd.com.co/

**España**:
- AEAT (Agencia Tributaria): https://www.agenciatributaria.es/

### Consultorías Recomendadas

- **KPMG**: Auditoría fiscal internacional
- **Deloitte**: Compliance multi-país
- **PwC**: Tax advisory

---

**Fin de la Hoja de Ruta**

---

**Resumen de Documentos**:
1. [ROADMAP_FISCAL_MODULE_OVERVIEW.md](./ROADMAP_FISCAL_MODULE_OVERVIEW.md)
2. [ROADMAP_SCHEMAS_Y_DTOS.md](./ROADMAP_SCHEMAS_Y_DTOS.md)
3. [ROADMAP_FASE_1_VENEZUELA.md](./ROADMAP_FASE_1_VENEZUELA.md)
4. [ROADMAP_MIGRATION_PLAN.md](./ROADMAP_MIGRATION_PLAN.md)
5. [ROADMAP_TESTING_STRATEGY.md](./ROADMAP_TESTING_STRATEGY.md)
6. [ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md](./ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md)
7. [ROADMAP_FASE_3_EXPANSION.md](./ROADMAP_FASE_3_EXPANSION.md) ← Estás aquí
