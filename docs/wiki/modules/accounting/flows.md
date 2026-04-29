# Contabilidad — Flujos de Operación

> Última actualización: 2026-04-28

---

## Flujo 1: Declaración de IVA (Forma 30)

```mermaid
sequenceDiagram
    participant U as 👤 Contador
    participant DS as 📄 IvaDeclarationService
    participant PBS as 📗 PurchaseBookService
    participant SBS as 📘 SalesBookService
    participant BS as 📄 BillingService
    participant DB as 🗄️ MongoDB

    U->>DS: POST /iva-declaration/calculate { month, year }

    rect rgb(230, 245, 230)
        Note over DS,BS: 1. Auto-sincronizar facturas
        DS->>BS: Busca BillingDocs emitidos en el período
        BS-->>DS: Documentos de facturación
        DS->>SBS: syncFromBillingDocument() para cada uno
        SBS->>DB: Crea/actualiza entradas en Sales Book
    end

    rect rgb(230, 230, 245)
        Note over DS,PBS: 2. Validar libros
        DS->>PBS: validateBook(month, year)
        DS->>SBS: validateBook(month, year)
    end

    rect rgb(245, 245, 230)
        Note over DS: 3. Calcular
        DS->>PBS: getBookByPeriod(month, year)
        PBS-->>DS: Entradas de compras + IVA
        DS->>SBS: getBookByPeriod(month, year)
        SBS-->>DS: Entradas de ventas + IVA

        DS->>DS: débitoFiscal = Σ salesIvaAmount
        DS->>DS: créditoFiscal = Σ purchasesIvaAmount<br/>+ ivaRetenidoEnVentas<br/>+ saldoCréditoAnterior
        DS->>DS: ivaPorPagar = max(0, débito - crédito)
        DS->>DS: saldoCrédito = max(0, crédito - débito)
    end

    DS->>DB: Guarda declaración (status=calculated)
    DS-->>U: Declaración con totales

    Note over U,DB: Después...
    U->>DS: PUT /:id/file
    DS->>DS: Genera XML SENIAT
    DS->>DB: status → filed

    U->>DS: PUT /:id/payment { reference, date }
    DS->>DB: status → paid
```

---

## Flujo 2: Asientos Automáticos (desde otros módulos)

```mermaid
flowchart TD
    subgraph TRIGGERS["Eventos que generan asientos"]
        SALE["🛍️ Venta creada"]
        PAYMENT["💳 Pago recibido"]
        PURCHASE["🛒 Compra recibida"]
        PAY_CXP["💰 Pago de CxP"]
        PAYROLL["👔 Nómina ejecutada"]
        WASTE["🗑️ Merma registrada"]
        BILLING["📄 Factura emitida"]
        DEPOSIT["📅 Depósito de cita"]
    end

    subgraph ENTRIES["Asientos automáticos"]
        JE_SALE["DR CxC 1102<br/>CR Ventas 4101<br/>CR IVA 2102"]
        JE_PAY["DR Caja 1101<br/>CR CxC 1102"]
        JE_PURCH["DR Inventario 1103<br/>CR CxP 2101"]
        JE_CXP["DR CxP 2101<br/>CR Caja 1101"]
        JE_PAYROLL["DR Gastos Nómina<br/>CR CxP/Banco"]
        JE_WASTE["DR Mermas 5103<br/>CR Inventario 1103"]
        JE_BILL["DR CxC 1102<br/>CR Ventas 4101<br/>CR IVA 2102<br/>(en VES)"]
        JE_DEPOSIT["DR Banco<br/>CR Anticipos 2103"]
    end

    SALE --> JE_SALE
    PAYMENT --> JE_PAY
    PURCHASE --> JE_PURCH
    PAY_CXP --> JE_CXP
    PAYROLL --> JE_PAYROLL
    WASTE --> JE_WASTE
    BILLING -->|"evento: billing.document.issued"| JE_BILL
    DEPOSIT --> JE_DEPOSIT
```

---

## Flujo 3: Retención de IVA

```mermaid
sequenceDiagram
    participant U as 👤 Contador
    participant WS as 📋 IvaWithholdingService
    participant AS as 💰 AccountingService
    participant DB as 🗄️ MongoDB

    U->>WS: POST /iva-withholding (draft)
    WS->>WS: Genera RET-IVA-2026-000042
    WS->>DB: Guarda (status=draft)

    U->>WS: PUT /:id/post
    WS->>AS: findOrCreateAccount("2101", "CxP")
    WS->>AS: findOrCreateAccount("2104", "IVA Retenido")
    WS->>AS: Crea JournalEntry:
    Note over WS,AS: DR CxP (2101) → withholdingAmount<br/>CR IVA Retenido (2104) → withholdingAmount
    WS->>DB: status → posted, journalEntryId

    opt Fin de mes
        U->>WS: GET /export/arc/{month}/{year}
        WS->>WS: Genera formato tab-separated SENIAT
        WS->>DB: Marca exportedToARC = true
        WS-->>U: Archivo ARC para SENIAT
    end
```

---

## Flujo 4: Cierre de Período Contable

```mermaid
stateDiagram-v2
    [*] --> open : Crear período
    open --> closed : close() — calcula revenue/expenses/netIncome, crea asiento de cierre
    closed --> open : reopen() — reabre para ajustes
    closed --> locked : lock() — inmutable, no se puede reabrir
    locked --> closed : unlock() — solo admin
```

```mermaid
sequenceDiagram
    participant U as 👤 Contador
    participant PS as 📅 PeriodService
    participant AS as 💰 AccountingService
    participant DB as 🗄️ MongoDB

    U->>PS: POST /periods/close { periodId }
    PS->>DB: Carga JournalEntries del período
    PS->>PS: totalRevenue = Σ créditos en cuentas 4xx
    PS->>PS: totalExpenses = Σ débitos en cuentas 5xx
    PS->>PS: netIncome = totalRevenue - totalExpenses
    PS->>AS: Crea asiento de cierre:
    Note over PS,AS: DR Ingresos (4xx) → totalRevenue<br/>CR Gastos (5xx) → totalExpenses<br/>Diferencia → Resultado (399)
    PS->>DB: status → closed, closingEntryId
```

---

## Flujo 5: Sync Facturación → Libro de Ventas IVA

```mermaid
flowchart TD
    BILL["Factura emitida<br/>(billing.document.issued)"] --> LISTENER["BillingAccountingListener"]
    
    LISTENER --> JE["Crea Journal Entry<br/>(en VES)"]
    LISTENER --> SYNC["SalesBookService<br/>.syncFromBillingDocument()"]
    
    SYNC --> CHECK{"¿Ya existe entrada<br/>para esta factura?"}
    CHECK -->|"No"| CREATE["Crea nueva entrada"]
    CHECK -->|"Sí"| UPDATE["Actualiza existente"]
    
    CREATE --> CURRENCY{"¿Moneda original?"}
    CURRENCY -->|"USD"| CONVERT["Convierte a VES<br/>con exchangeRate<br/>Guarda ambos montos"]
    CURRENCY -->|"VES"| DIRECT["Usa montos directos"]
    
    CONVERT --> VALIDATE["Valida IVA:<br/>ivaAmount ≈ baseAmount × ivaRate%<br/>(tolerancia: 2 VES)"]
    DIRECT --> VALIDATE
    
    VALIDATE --> SAVE["Guarda en IvaSalesBook<br/>status=confirmed"]
```

---

*Última actualización: 2026-04-28*
