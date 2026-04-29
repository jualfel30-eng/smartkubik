# Auth, Users, Roles — Mapa de Conexiones

> Auth es importado por ~30 módulos vía forwardRef.
> Última actualización: 2026-04-28

---

## Diagrama

```mermaid
flowchart TD
    subgraph AUTH["🔐 Auth + Users + Roles"]
        LOGIN["Login/Tokens"]
        GUARDS["Guards"]
        ROLES_SVC["Roles Service"]
        PERMS_SVC["Permissions Service"]
    end

    subgraph IMPORTAN["~30 módulos que importan Auth"]
        PROD["Products"]
        INV["Inventory"]
        ORD["Orders"]
        PURCH["Purchases"]
        CUST["Customers"]
        SUPP["Suppliers"]
        ACCT["Accounting"]
        ETC["...y 23 más"]
    end

    subgraph SALIDA["A quién llama Auth"]
        ROLES_MOD["Roles Module"]
        MAIL["📧 Mail Module"]
        PERMS_MOD["Permissions Module"]
        MEMBERS["Memberships Module"]
    end

    IMPORTAN -->|"forwardRef → AuthModule"| GUARDS
    LOGIN --> ROLES_MOD
    LOGIN --> MAIL
    LOGIN --> PERMS_MOD
    LOGIN --> MEMBERS
```

---

## Conexiones de Entrada

| Quién importa Auth | Propósito |
|---|---|
| **~30 módulos** (Products, Inventory, Orders, Purchases, Suppliers, Accounting, BankAccounts, Appointments, BOM, etc.) | Todos usan `JwtAuthGuard`, `TenantGuard`, `PermissionsGuard` via `AuthModule` forwardRef |
| **Onboarding** | Crea usuario inicial + rol admin + membership |
| **SuperAdmin** | Impersonación, gestión global de usuarios |

---

## Conexiones de Salida

| Auth llama a | Propósito |
|---|---|
| **RolesModule** | Carga role con permissions para token |
| **PermissionsModule** | Lista permisos disponibles para defaults |
| **MailModule** | Envía emails de invitación/verificación |
| **MembershipsModule** | Busca memberships activas para multi-tenant |

---

*Última actualización: 2026-04-28*
