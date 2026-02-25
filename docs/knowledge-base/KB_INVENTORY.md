# 📚 Knowledge Base: Inventario y Almacenes
*Guía para Recibir Compras, Mover Lotes y Configurar Alertas*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Inventario es donde llevas el control físico de tus productos "Inventariables". Te permite registrar las compras (entradas), auditar tu stock existente, manejar códigos de lote y fechas de caducidad (si aplica), y mover productos entre diferentes sucursales o depósitos.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo registro la mercancía que acaba de llegar del proveedor?**
- **¿Cómo muevo inventario del Almacén Principal a la Tienda?**
- **¿Cómo el sistema me avisa si me estoy quedando sin stock?**

---

## 👟 Paso a Paso

### A. Registrar una Recepción de Mercancía (Entrada de Inventario)
*Usa este proceso cada vez que recibas una encomienda o factura de tu proveedor para actualizar tus cantidades y costos físicos.*

1. Navega en el menú principal a **Inventario > Almacenes** (o Recepciones).
2. Haz clic en **"Nueva Recepción"** (o "Registrar Movimiento -> Entrada").
3. Selecciona el **Almacén de Destino** (ej. "Depósito Central" o "Tienda Principal").
4. Busca y selecciona el/los Producto(s) que vas a ingresar.
5. Para cada producto, debes definir:
   - **Cantidad Recibida:** El número de unidades.
   - **Costo Unitario:** Cuánto te costó comprarlo. *(Nota: Esto actualizará el margen de ganancia en tus reportes).*
   - **Lote y Caducidad (Opcional):** Si manejas alimentos o medicinas, ingresa el número de lote y la fecha de vencimiento.
6. Agrega una Nota o Referencia (ej. "Factura #1234 Proveedor XYZ").
7. Haz clic en **"Procesar Entrada"**. El inventario "Disponible" aumentará inmediatamente.

### B. Mover Inventario entre Almacenes (Traslados)
*Si tienes más de una sucursal, debes registrar los envíos entre ellas para que cuadren las cuentas.*

1. Navega a **Inventario > Movimientos**.
2. Haz clic en **"Nuevo Traslado"**.
3. Selecciona:
   - **Almacén Origen:** De dónde sale la mercancía.
   - **Almacén Destino:** A dónde llega.
4. Escanea o busca los productos y especifica la cantidad a mover.
5. El sistema verificará que tengas suficiente *Cantidad Disponible* en el Origen. Si no, no te dejará continuar.
6. Haz clic en **"Procesar Traslado"**. 
7. *(Importante: El almacén origen descontará sus unidades al instante, y el destino registrará la entrada)*.

### C. Ajuste de Inventario (Mermas, Daños o Cuadre Físico)
*Cuando haces un conteo físico y notas que te falta (o sobra) un producto porque se perdió, dañó o regaló.*

1. Navega a **Inventario > Ajustes** (o Movimientos).
2. Haz clic en **"Nuevo Ajuste"**.
3. Selecciona el Almacén.
4. Tipo de Ajuste:
   - **Salida / Reducción:** (Inventario perdido, robado, merma, vencido).
   - **Entrada / Aumento:** (Apareció inventario oculto/sobrante).
5. Escoge el producto, la cantidad a ajustar y **escribe obligatoriamente el motivo del ajuste** para fines de auditoría gerencial.
6. Haz clic en **"Guardar Ajuste"**.

### D. Configurar Alertas de Bajo Stock
1. Navega a **Inventario > Catálogo > Productos**.
2. Edita un producto existente (pestaña Inventario).
3. Localiza el campo **"Cantidad Mínima" (Punto de Reorden)**.
4. Ingresa un número (ej. "5"). 
5. Cuando el stock real llegue a 5 unidades, el sistema generará una notificación automática avisándote que debes contactar al proveedor.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Stock Comprometido:** Si creas una Orden de Venta en el POS (pero no la has despachado), el inventario pasará a estado "Reservado" o "Comprometido". No podrás hacer un traslado de esas unidades comprometidas, aunque físicamente sigan en el almacén.
- **Costeo Ponderado:** Si compras un producto hoy a 10$ y mañana a 12$, el sistema calculará un costo promedio automático. Ajustar los costos manualmente por fuera de las entradas puede alterar tu rentabilidad.
- **Auditoría:** Todos los movimientos de inventario guardan la fecha, hora y el Nombre del Usuario que los ejecutó. No hay forma legal de borrar un historial de movimiento sin dejar rastro en el reporte (`AuditLog`).

---
*SmartKubik Knowledge Base V1.03 - Inventario y Almacenes*
