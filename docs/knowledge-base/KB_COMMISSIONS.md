# 📚 Knowledge Base: Comisiones y Propinas
*Cómo Configurar Reglas de Propinas y Comisiones a Colaboradores*

## 📌 ¿Qué puedo hacer aquí?
Este módulo te permite automatizar los incentivos de tu equipo de trabajo. Ya no tienes que sacar cuentas a mano el viernes por la noche; el sistema puede calcular qué porcentaje de propinas (Tips) o comisiones de venta le toca a cada mesero, cajero o estilista según su rendimiento o reglas establecidas.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo le doy el 5% de comisión al vendedor cada vez que venda un producto específico?**
- **¿Cómo reparto las propinas de una mesa entre el mesero y el cocinero (Tronco)?**
- **¿Puedo comisionar en base a la ganancia de la factura y no sobre el total de la venta?**

---

## 👟 Paso a Paso

### A. Crear un Plan de Comisiones para Vendedores
*Ideal para negocios de retail o proveedores de servicios donde los empleados ganan sobre sus ventas individuales.*

1. Navega a **RRHH / Configuración > Planes de Comisión**.
2. Haz clic en **"Nuevo Plan"**.
3. Nombra el Plan (Ej. *Comisión Especial Vendedores Junio*).
4. Elige la Base de Cálculo:
   - **Sobre las Ventas Brutas:** (Ej. 5% de lo facturado).
   - **Sobre el Margen de Ganancia:** El sistema resta el costo del producto primero, y paga comisión solo de la utilidad.
5. Selecciona el Tipo de Tasa:** Porcentaje (Ej. 5%) o Monto Fijo (Ej. $2 por cada venta).
6. **Bono o Meta (Opcional):** Puedes poner una condición "Si vende más de $1000 este mes".
7. Haz clic en **Guardar**. Luego, asigna al empleado específico este plan en su perfil (`EmployeeProfile`).

### B. Configurar Reglas de Propinas Compartidas (Tronco/Tip Splitting)
*Ideal para Restaurantes. Un cliente deja $10 de propina; el mesero se lleva $7 y la cocina $3.*

1. Navega a **Restaurante / Configuración > Reglas de Distribución de Propinas**.
2. Haz clic en **"Nueva Regla"**.
3. Selecciona el Pool (Fondo) de Propinas activo para la sucursal.
4. Agrega los "Roles" que participarán:
   - Rol A: *Restaurante_Mesero* -> Porcentaje: **70%**.
   - Rol B: *Restaurante_Cocinero* -> Porcentaje: **30%**.
5. *Condición:* Puedes indicar que los cocineros solo reciban propina de las mesas que superen las 2 horas de servicio, o hacerlo universal.
6. Guarda la regla. Al final del turno (en la Lectura Z), el sistema generará el reporte **Tips Report** con los montos exactos para cada empleado.

### C. Pago de las Comisiones (Liquidación)
*El mesero tiene $50 acumulados de propina en la semana.*

1. Ve a **RRHH > Liquidaciones (Liquidation Run)**.
2. Crea una "Corrida de Liquidación" para las fechas deseadas.
3. El sistema sumará todas las facturas procesadas por el empleado y le aplicará el plan de comisión activo.
4. Verás una tabla resumen y podrás emitir una "Cuenta por Pagar" o "Pago" (Pasando esos $50 al módulo de Contabilidad para que se reflejen en la caja).

---

## ⚠️ Reglas de Negocio y Advertencias
- **Descuentos Afectan Comisiones:** Si un empleado otorga un descuento del 100% (invitación de la casa) a una factura, su comisión será de $0. El sistema calcula las comisiones **post-descuento**, protegiendo la rentabilidad del negocio.
- **Facturas Anuladas / Devoluciones:** Si hoy un mesero genera una comisión de $5 y la cobra en efectivo al final del día... pero **mañana** el cliente devuelve el producto (Refund), el sistema registrará un saldo negativo de comisiones (-$5) para ese mesero. Esa deuda se descontará automáticamente en su próximo turno o quincena.
- **Registro del Cajero:** Para que las comisiones funcionen en Retail, el usuario que hace login en el Punto de Venta (User ID) debe ser la misma persona designada como "Vendedor". Si los empleados prestan contraseñas, las comisiones se asignarán erróneamente.

---
*SmartKubik Knowledge Base V1.03 - Comisiones y Propinas*
