# 📚 Knowledge Base: Caja y Turnos (POS)
*Cómo Abrir, Cuadrar y Cerrar Turnos de Caja (Z-Read)*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Sesiones de Caja (Cash Register) es el control financiero de tu tienda física o restaurante. Te asegura que todo el dinero en efectivo que ingresa (o sale) durante la jornada cuadre perfectamente con las ventas registradas por el cajero, previniendo robos o pérdidas matemáticas.

---

## ❓ Casos de Uso (FAQ)
- **¿Qué es el "Fondo de Caja" al abrir el turno?**
- **¿Cómo registro si saqué dinero de la caja para pagar un delivery?**
- **¿Qué es el Cuadre Ciego o Lectura Z (Z-Read)?**

---

## 👟 Paso a Paso

### A. Abrir un Turno de Caja (Iniciando el día)
*Nadie puede procesar una venta en el Punto de Venta (POS) si no tiene una sesión de caja abierta.*

1. Ingresa a la pantalla principal del **Punto de Venta (POS)**.
2. Si es tu primera conexión del día, el sistema te pedirá automáticamente **"Abrir Sesión de Caja"**.
3. Ingresa el **Fondo Acumulado (Opening Balance):** Este es el dinero en efectivo con el que estás empezando el día (el "sencillo" para dar vuelto).
4. *Opcional:* Puedes ingresar el conteo detallado por denominación (Ej. 5 billetes de $1, 2 billetes de $5).
5. Haz clic en **"Abrir Caja"**. Ahora puedes empezar a facturar.

### B. Retiros o Ingresos de Efectivo Manuales (Cash Drops / Pay Outs)
*Útil cuando sacas dinero de la caja para pagar un "gasto hormiga" o cuando guardas exceso de efectivo en la caja fuerte por seguridad.*

1. Dentro de tu sesión activa del Punto de Venta, ve al menú **"Movimientos de Caja"** (o "Cash Management").
2. Selecciona el tipo de movimiento:
   - **Retiro (Pay Out):** Sacaste dinero. Ej: "Pago para el hielo o agua potable".
   - **Ingreso (Pay In):** Entró dinero no proveniente de una venta. Ej: "El gerente dejó $50 más para dar vuelto".
   - **Depósito de Seguridad (Drop):** Trasladar dinero a la caja fuerte del local.
3. Ingresa el **Monto** exacto y una **Razón** (obligatoria).
4. Haz clic en **"Guardar Movimiento"**.

### C. Cuadrar y Cerrar el Turno (Lectura Z)
*Al final de la jornada laboral o cuando cambias de cajero.*

1. Navega en el menú del POS y selecciona **"Cerrar Sesión / Cuadre de Caja"**.
2. **Cuadre Ciego:** El sistema te pedirá que cuentes e ingreses cuánto dinero físico REAL tienes en la gaveta, *antes de mostrarte cuánto deberías tener*.
   - Ingresa cuánto tienes en Efectivo (Bolívares y Dólares).
   - Ingresa los comprobantes físicos (vouchers) de Tarjetas de Débito/Crédito y Zelle.
3. Haz clic en **"Declarar Montos"**.
4. ¡El momento de la verdad! El sistema mostrará la **Reconciliación**:
   - *Esperado:* Lo que el sistema sumó en el día.
   - *Declarado:* Lo que tú contaste.
   - *Diferencia:* Si hay un sobrante o faltante.
5. Agrega una **Nota de Cierre** explicando el descuadre (si lo hubo).
6. Haz clic en **"Cerrar Turno Definitivamente"**.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Un Usuario, Una Caja:** El sistema no permite que dos usuarios tengan abierta la misma sesión de caja al mismo tiempo por razones de responsabilidad financiera.
- **Multimoneda (USD/VES):** Durante el cuadre, debes ser muy preciso al separar el efectivo en dólares del efectivo en bolívares. Mezclarlos generará descuadres irreconciliables debido a la tasa de cambio local.
- **Auditoría Gerencial:** Los cajeros no pueden editar ni borrar sesiones cerradas. Solo un Gerente o Administrador puede acceder al historial de **"Lecturas Z"** para revisar los cierres históricos en la sección de reportes.

---
*SmartKubik Knowledge Base V1.03 - Sesiones de Caja*
