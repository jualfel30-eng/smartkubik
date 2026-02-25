# 📚 Knowledge Base: Facturación Fiscal y SENIAT
*Guía Definitiva para Cumplimiento Fiscal, Retenciones e IGTF*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Facturación garantiza que tu negocio cumpla con las leyes tributarias de Venezuela (SENIAT). Transforma una simple "Orden de Venta" del POS en un documento legal o Factura Electrónica/Providencia que genera asientos contables reales y afecta tus libros de IVA.

---

## ❓ Casos de Uso (FAQ)
- **¿Qué es una Nota de Entrega y por qué no es una Factura Fiscal?**
- **¿Cómo registro que un cliente "Gran Contribuyente" me retuvo el 75% del IVA?**
- **¿Por qué el sistema me cobró 3% de IGTF automático?**

---

## 👟 Paso a Paso

### A. Entender los Tipos de Documento Comercial
Cuando completas un pago en el POS o Módulo de Ventas, el sistema te pedirá emitir un comprobante. Opciones comunes:
1. **Nota de Entrega (Delivery Note):** Es un control interno no fiscal (Ej. Para presupuestos o control interno de almacén). No debes usarlo para evitar pagar impuestos, ya que la ley lo prohíbe.
2. **Factura Fiscal (Invoice):** Es el documento legal (Factura formato Libre o Máquina Fiscal). Registra el IVA (16%), Exentos, o Tasas Reducidas (8%).
3. **Nota de Crédito (Credit Note):** Única forma legal de anular o devolver una Factura ya emitida al cliente.
4. **Nota de Débito (Debit Note):** Para cobrar recargos sobre una factura ya emitida.

### B. Emisión de Factura Fiscal (Máquina o Imprenta Autorizada)
1. Al "Pagar" en el POS, si tu sistema está conectado a una Impresora Fiscal (Ej. Bematech, Bixolon), el sistema generará automáticamente el Ticket Fiscal y grabará en la Nube el **Número de Factura Fiscal** físico que arrojó la máquina.
2. Si eres emisor de **Facturación Electrónica / Serie Libre**, el sistema tomará tu secuencia automatizada (Ej. Nro. 000105) y generará el PDF timbrado para imprimir o enviar por correo.

### C. Pago en Divisa Extranjera e IGTF (Impuesto a las Grandes Transacciones Financieras)
*La ley exige (a empresas designadas Sujetos Pasivos Especiales) cobrar un 3% a los pagos recibidos en dólares físicos.*

1. Cobra una orden de $10 en el Checkout.
2. Si seleccionas el Método de Pago: **"Efectivo Dólares (USD)"** o **"Zelle"**.
3. El sistema evaluará si tú eres Sujeto Especial:
   - Si lo eres, el carrito agregará automáticamente un `Recargo IGTF (3%)` al total de la deuda.
   - El cliente tendrá que pagar $10.30 (o pagar los $0.30 equivalentes en Bolívares usando la tasa BCV del día).

### D. Declaración de Retención de IVA por el "Cliente Especial"
*Si le vendes a Polar o Banesco, ellos no te pagarán el 100% de la factura. Te retendrán el IVA (75% o 100%) y te darán un "Comprobante de Retención".*

1. Navega a **Facturación / Contabilidad > Documentos Fiscales** (Invoices).
2. Busca la Factura del cliente especial que dice *Estado: Pendiente por Pagar*.
3. Haz clic en **"Registrar Retención / Pago"**.
4. Ingresa el **Número de Comprobante de Retención** físico o digital que te entregó el cliente (Suele empezar por el año/mes).
5. Indica el monto base retenido. El sistema matará esa porción de la deuda de la factura en "Cuentas por Cobrar" y la trasladará a tus activos de "Crédito Fiscal" en Contabilidad.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Conversión BCV Inmutable:** Según la providencia del SENIAT 0071, las facturas en moneda extranjera DEBEN mostrar su equivalente en Bolívares usando la tasa de cambio oficial del BCV del DÍA DE LA EMISIÓN. Si reimprimes una factura de hace 2 meses, el sistema usará la tasa histórica de ese día, no la de hoy, caso contrario alterarías tus libros contables históricos (Corrupción de datos).
- **Control de Secuencia Estricto:** Si el "Consecutivo de Factura" actual es la 100, la siguiente tiene que ser obligatoriamente la 101. El sistema bloqueará (`SequenceLock`) cualquier intento de saltarse números para prevenir multas del ente regulador.
- **Libros de Compra y Venta:** Toda Factura generada y recepcionada viaja automáticamente al Libro de IVA. Solo un contador con permisos especiales puede modificar dichos libros a fin de mes.

---
*SmartKubik Knowledge Base V1.03 - Facturación y SENIAT*
