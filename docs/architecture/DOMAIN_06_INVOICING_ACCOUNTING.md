# Domain 6: Invoicing & Accounting (Facturación y Contabilidad)

## 📌 Visión General
El dominio financiero de SmartKubik está fuertemente tropicalizado para la realidad tributaria venezolana. Más que un contable genérico, está diseñado como un ERP fiscal que emite facturas a través de Imprentas Digitales autorizadas por el SENIAT, maneja complejas retenciones de IVA/ISLR, IGTF, y genera libros de compra/venta y borradores de declaraciones definitivas.

## 🗄️ Data Layer (Esquemas de Base de Datos)
La persistencia refleja un alto rigor contable de partida doble y auditoría fiscal:

- **`ChartOfAccounts`** (`chart-of-accounts.schema.ts`): Catálogo de Cuentas (Plan Único de Cuentas). Define la jerarquía contable (Activo, Pasivo, Patrimonio, Ingreso, Gasto) con capacidad de identificar el comportamiento del costo (`costBehavior`: fixed, variable) y la liquidez (`liquidityClass`).
- **`JournalEntry`** (`journal-entry.schema.ts`): Asientos de Diario. Registra el debe (`debit`) y el haber (`credit`) de cada transacción usando el modelo tradicional de partida doble, vinculado a cuentas del `ChartOfAccounts`. Los asientos se marcan como `isAutomatic` si fueron disparados por módulos como ventas o nómina.
- **`BillingDocument`** (`billing-document.schema.ts`): Cúspide de la facturación. Almacena las "Facturas", "Notas de Crédito" y "Notas de Débito". Contiene un bloque específico para la factura electrónica (`seniat.xmlHash`) y otro para las retenciones sufridas (`withheldIvaPercentage`, `withholdingCertificate`).
- **`IvaDeclaration`** (`iva-declaration.schema.ts`): Es el "Borrador de la Forma 30". Consolida mensualmente el débito fiscal (ventas), crédito fiscal (compras), retenciones, excedentes anteriores, y calcula multas o intereses, llevando el documento por estados como "calculado", "presentado" y "pagado".
- **`Payable`** (`payable.schema.ts`): Cuentas por Pagar. Maneja las obligaciones financieras hacia proveedores (`supplier`) o empleados (`employee`), y rastrea los pagos parciales o totales (`paymentRecords`) cruzados contra métodos bancarios.

## ⚙️ Backend (API Layer)
El procesamiento contable y fiscal está fuertemente separado en dos sub-módulos autónomos:

- **`Billing Module`**:
  - `billing.service.ts` (`38KB`): Orquestador general de emisión de documentos.
  - `imprenta-digital.provider.ts`: Integración crucial (posiblemente SOAP/REST) con un proveedor de Imprenta Digital autorizado para obtener el `controlNumber` y el `verificationUrl`.
  - `invoice-pdf.service.ts` y `sales-book-pdf.service.ts`: Motores de rendering para emitir la factura visual (PDF) y el Libro de Ventas legal que exige la providencia 0071.
  - `redis-lock.service.ts`: Asegura que el número de correlativo de factura (`DocumentSequence`) no sufra condiciones de carrera (Race Conditions) si el sistema emite muchas facturas simultáneamente.
- **`Accounting Module`**:
  - `accounting.service.ts` (`44KB`): Responsable de generar y cuadrar los asientos contables de forma automática.
  - Contiene directorios `listeners/` y `services/` estructurados con segregación de responsabilidades. Escucha eventos (ej: `PAYABLE_CREATED`, `ORDER_PAID`) para asentar la contabilidad sin bloquear los procesos de cara al cliente.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **Acoplamiento de Tasa BCV Histórica**: En `BillingDocument`, el esquema guarda `totalsVes`, pero la facturación legal exige mostrar el valor en la moneda de curso legal "al momento de emitirse/pagarse". Si existe disparidad temporal entre la Orden (Dominio 3) y la Factura (Dominio 6), no está del todo claro en los esquemas cómo el sistema maneja la diferencia en diferencial cambiario sin romper el cuadre contable.
2. **Complejidad Imprenta vs SENIAT API**: `BillingDocument` tiene dos objetos paralelos: `taxInfo` (con `controlNumber` de Imprenta Digital, modelo actual predominante) y `seniat` (con `xmlHash` genérico de Factura Electrónica pura, que aún no es un estándar total para todo tipo de negocios). Mantener ambos bloques sugiere una transición o un soporte mixto, que añade peso a la estructura y a la lógica de validación.
3. **Múltiples Módulos de Documentación en PDF**: Hay un `invoice-pdf.service.ts` dedicado. Un patrón más limpio habría sido aislar todo el sistema de reportes (PDFs genéricos, Facturas, Libros, Recibos de Nómina) en un Dominio/Módulo de "Documents o Reporting" en lugar de tener integraciones de Puppeteer/PDFKit dispersas en Billing.

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- Auditar el `redis-lock.service.ts` para confirmar su fiabilidad en el consumo masivo de correlativos, vital para prevenir saltos de control fiscal penalizados por el SENIAT.
- Unificar la centralización de diferenciales cambiarios en un middleware que procese *JournalEntries* automáticos por "Ganancia/Pérdida en cambio" cada vez que un `Payable` en Divisas se paga días después de emitido a otra tasa.
