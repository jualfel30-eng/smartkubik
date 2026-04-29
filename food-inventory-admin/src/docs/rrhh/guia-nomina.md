---
title: "Guía de Nómina: Empleados, Corridas de Pago, Comisiones y Propinas"
description: "Cómo gestionar empleados, ejecutar nómina, configurar comisiones y metas de ventas, distribuir propinas, y controlar turnos."
category: "rrhh"
slug: "guia-nomina"
keywords: ["nómina", "empleados", "comisiones", "propinas", "turnos", "metas", "bonos"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "12 min"
industry: "Todas"
problem: "Necesitas pagar a tus empleados correctamente, gestionar comisiones por ventas, distribuir propinas, y controlar asistencia."
solution: "SmartKubik integra nómina con estructuras configurables, comisiones automáticas por venta, distribución de propinas, metas con bonos, y control de turnos."
quickAnswer: |
  1. Ve a RRHH → Empleados → registra al empleado
  2. Configura salario, comisiones y bonos
  3. Para correr nómina: RRHH → Nómina → Nueva Corrida
  4. Revisa el desglose y confirma el pago
---

# Guía de Nómina, Comisiones y Propinas

## Empleados (`/payroll/employees`)

### Crear un empleado
1. Ve a **Recursos Humanos → Gestión de Equipo**
2. Haz clic en **"+ Nuevo Empleado"**
3. Llena: nombre, cédula, cargo, departamento, fecha de ingreso
4. Crea su **contrato**: salario, tipo (fijo/temporal), frecuencia de pago, estructura de nómina
5. El sistema genera un número de empleado (EMP-XXXXXX)

> **Nota**: Un empleado se crea a partir de un contacto del CRM. Si el contacto no existe, se crea automáticamente.

---

## Ejecutar Nómina (`/payroll/runs`)

### Paso a paso
1. Ve a **Recursos Humanos → Nómina**
2. Haz clic en **"+ Nueva Corrida"**
3. Selecciona el **período** (mes, quincena, o custom)
4. Selecciona empleados (o todos)
5. El sistema **calcula automáticamente**:
   - Devengos: salario base, horas extra, bonos aprobados, comisiones aprobadas, propinas
   - Deducciones: IVSS, paro forzoso, ISLR, anticipos
   - Aportes patronales: IVSS patronal, FAOV, INCE
6. Revisa los resultados
7. **Aprueba** la corrida
8. **Genera archivo bancario** (TXT/CSV para tu banco)
9. **Marca como pagada**

### Estados de la corrida
| Estado | Significado | Puedes hacer |
|--------|-------------|--------------|
| Borrador | Recién creada | Editar, recalcular |
| Calculada | Números listos | Revisar, agregar ajustes |
| Aprobada | Manager aprobó | Generar archivo banco, pagar |
| Pagada | Dinero transferido | Solo consultar |

### Corridas especiales
- **Aguinaldo**: Bono anual (configurable)
- **Liquidación**: Cálculo de prestaciones al terminar relación laboral
- **Bonificación extra**: Pago único fuera de la nómina regular

---

## Comisiones (`/commissions`)

### Configurar un plan de comisiones
1. Ve a **Comisiones** en el menú
2. Crea un **plan**: nombre, tipo (fijo por venta, % del monto, escalonado)
3. **Asigna** empleados al plan

### ¿Cómo se calculan?
- Cada vez que un empleado cierra una **venta**, el sistema calcula la comisión automáticamente
- La comisión queda como "Pendiente" hasta que un supervisor la **aprueba**
- Las comisiones aprobadas se incluyen automáticamente en la próxima **corrida de nómina**

### Metas de ventas
1. Crea una **meta**: monto objetivo, período, empleados que aplican
2. El sistema trackea automáticamente el progreso con cada venta
3. Al alcanzar la meta, se genera un **bono** automáticamente
4. El bono pasa por aprobación → incluido en nómina

---

## Propinas (`/tips`)

### Configurar distribución
1. Ve a **Propinas** → "Reglas de distribución"
2. Crea una regla:
   - **Equitativo**: Divide en partes iguales
   - **Por horas**: Proporcional a horas trabajadas
   - **Por ventas**: Proporcional al monto vendido
   - **Porcentaje fijo**: X% para cada rol
   - **Monto fijo**: $X por persona

### ¿Cómo se registran?
Las propinas se registran en el POS al cobrar cada orden (el cajero indica el monto o %). Al final del período, se distribuyen según la regla activa y se exportan a nómina.

---

## Turnos (`/fichar`)

### Clock In / Clock Out
1. El empleado va a **Fichar** (o usa el botón "Iniciar Turno" en el header)
2. Se registra la hora de entrada
3. Al terminar, hace clock out
4. El turno queda registrado con duración calculada

### Programar turnos
1. El manager crea turnos en **borrador** (día, hora inicio/fin, empleado)
2. **Publica** los turnos → los empleados los ven en su agenda
3. Al hacer clock-in, si hay un turno publicado para hoy, se vincula automáticamente

---

## Problemas comunes

### "La nómina no incluye las comisiones del mes"
Las comisiones deben estar **aprobadas** antes de crear la corrida. Si las apruebas después, haz clic en "Recalcular" en la corrida (solo funciona si no está aprobada aún).

### "Un empleado no aparece en la nómina"
Verifica que tenga un **contrato activo** con fecha de inicio anterior al período de la corrida. Empleados sin contrato o con contrato inactivo no se incluyen.

### "Las propinas no se distribuyeron"
Las propinas se distribuyen **manualmente** con el botón "Distribuir". No es automático — el manager decide cuándo ejecutar la distribución del período.

### "¿Puedo editar una nómina ya pagada?"
No. Una vez marcada como "Pagada" es inmutable. Si necesitas corregir, crea una corrida de ajuste (concepto de ajuste positivo o negativo).

### "El archivo bancario sale con formato incorrecto"
El formato depende del banco seleccionado. Verifica en la configuración de nómina que el banco correcto esté seleccionado.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
