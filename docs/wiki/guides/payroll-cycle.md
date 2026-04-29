# Guía Cross-Módulo: Ciclo de Nómina

> Flujo: Configurar estructura → Registrar empleados → Ejecutar corrida → Aprobar → Pagar → Asiento contable.
> Módulos: PayrollStructures, PayrollEmployees, PayrollRuns, Commissions, Tips, Shifts, Accounting, Payments.
> Última actualización: 2026-04-28

---

## Diagrama del Ciclo

```mermaid
flowchart TD
    subgraph CONFIG["⚙️ Configuración (una vez)"]
        STRUCT["1. Crear Estructura de Nómina<br/>(conceptos: devengos, deducciones, aportes)"]
        EMP["2. Registrar Empleados<br/>(perfil + contrato + estructura)"]
        COMM["3. Configurar Comisiones<br/>(planes + asignación)"]
        TIPS_R["4. Configurar Distribución de Propinas<br/>(regla: equitativo/horas/ventas)"]
    end

    subgraph DAILY["📅 Operación Diaria"]
        SHIFT["Empleados hacen clock in/out"]
        SALES["Ventas generan comisiones"]
        TIPS_D["POS registra propinas por orden"]
    end

    subgraph RUN["💼 Corrida de Nómina (mensual/quincenal)"]
        CREATE["5. Crear corrida<br/>(seleccionar período + empleados)"]
        CALC["6. Sistema calcula:<br/>• Salario base<br/>• Horas extra (de Shifts)<br/>• Comisiones aprobadas<br/>• Propinas del período<br/>• Bonos por metas<br/>• Deducciones legales"]
        REVIEW["7. Revisar desglose por empleado"]
        APPROVE["8. Aprobar corrida"]
        PAY["9. Generar archivo bancario + Pagar"]
        ACCT["10. Asiento contable automático"]
    end

    CONFIG --> DAILY
    DAILY --> RUN
    STRUCT --> CREATE
    EMP --> CREATE
    SHIFT --> CALC
    SALES --> CALC
    TIPS_D --> CALC
    COMM --> CALC
    CREATE --> CALC --> REVIEW --> APPROVE --> PAY --> ACCT
```

## Detalle por Fase

### Configuración Inicial

**Estructura de Nómina**: Define qué conceptos aplican a cada tipo de empleado
- **Devengos**: Salario base, bonificación de alimentación, horas extra, bono de transporte
- **Deducciones**: IVSS (empleado), paro forzoso, ISLR, anticipos
- **Aportes patronales**: IVSS (patronal), FAOV, INCE, LOTTT
- Las estructuras se asignan por rol/departamento/tipo de contrato

**Empleados**: Cada empleado necesita perfil + contrato activo
- El perfil se crea desde un contacto del CRM (tipo "empleado")
- El contrato define: salario, tipo (fijo/temporal), frecuencia de pago, estructura asignada

### Operación Diaria (datos que alimentan la nómina)

| Fuente | Dato | Cómo se registra |
|--------|------|-------------------|
| **Shifts** | Horas trabajadas | Clock in/out diario |
| **Orders** | Comisiones por venta | Auto-calculadas por orden → aprobación manual |
| **POS** | Propinas | Registradas en cada orden al cobrar |
| **Goals** | Bonos por meta | Auto-detectados al cerrar período de meta |
| **Absences** | Ausencias/permisos | Solicitud → aprobación por supervisor |

### Ejecución de Corrida

1. **Crear**: Selecciona período y empleados. El sistema matchea la estructura de nómina correcta para cada empleado.
2. **Calcular**: Suma devengos (salario + comisiones + tips + bonos) - deducciones (legales + anticipos)
3. **Revisar**: Desglose por empleado con cada concepto detallado
4. **Aprobar**: Manager revisa y confirma
5. **Pagar**: Genera archivo bancario (TXT/CSV) + marca comisiones y bonos como pagados
6. **Contabilizar**: Asiento automático (DR Gastos Nómina, CR CxP/Banco)

### Corridas Especiales
- **Aguinaldo**: Bono anual basado en salario y tiempo de servicio
- **Liquidación**: Cálculo de prestaciones al terminar relación laboral
- **Bono extra**: Pago único fuera del ciclo regular

---

*Última actualización: 2026-04-28*
