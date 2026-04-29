# Clientes y CRM — Mapa de Conexiones

> Última actualización: 2026-04-28

---

## Conexiones de Entrada

| Módulo | Cómo usa Customers | Contexto |
|---|---|---|
| **Orders** | `customerId` en cada orden | Vincula venta al cliente |
| **Purchases** | `supplierId` → Customer (type=supplier) | Proveedor de la compra |
| **Suppliers** | `customerId` → Customer | Perfil dual: Supplier referencia Customer |
| **Appointments** | `customerId` en cada cita | Cliente que reserva |
| **Storefront** | `POST /customers/auth/register` | Registro de cliente online |
| **Loyalty** | `syncTierFromScore()` | Sincroniza tier calculado |
| **TransactionHistory** | `recordCustomerTransaction()` | Historial de compras |
| **Marketing** | `recipients[]` → Customer IDs | Campañas dirigidas |
| **Promotions/Coupons** | `excludedCustomers[]` | Exclusiones de marketing |
| **Payroll** | `customerId` en EmployeeProfile | Empleado como contacto |
| **WhatsApp** | `whatsappNumber` lookup | Identifica cliente por teléfono |

---

## Conexiones de Salida

| Función | Módulo destino | Contexto |
|---|---|---|
| `create()` (type=supplier) | **Supplier (modelo)** | Auto-crea perfil Supplier |
| `create()` (type=employee) | **EmployeeProfile (modelo)** | Auto-crea perfil de empleado |
| `findAll()` | **Order, PurchaseOrder, Appointment (modelos)** | Aggregation para métricas |
| `calculateCustomerTiers()` | **LoyaltyService** | Sincroniza tier |
| Auth storefront | **JWT (independiente)** | Genera token tipo "customer" |

---

## Dependencias Circulares

| Par | Razón |
|---|---|
| Customers ↔ **Auth** | Auth valida usuarios, Customers tiene auth propia |
| Customers ↔ **Orders** | Customers muestra historial, Orders referencia customerId |

---

*Última actualización: 2026-04-28*
