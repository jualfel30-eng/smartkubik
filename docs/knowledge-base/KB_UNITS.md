# 📚 Knowledge Base: Unidades y Conversiones
*Cómo Configurar Unidades de Medida y sus Equivalencias*

## 📌 ¿Qué puedo hacer aquí?
Este módulo es vital si compras insumos al mayor y los vendes al detal (ej. Compras un saco de 50 Kg de harina, pero vendes pizzas de 200 gramos). Aquí configuras las reglas matemáticas para que el inventario se descuente correctamente sin importar cómo empaquetas o preparas tus productos.

---

## ❓ Casos de Uso (FAQ)
- **¿Qué hago si compro por "Cajas" pero vendo por "Unidades"?**
- **¿Cómo le digo al sistema que un Litro son 1000 mililitros?**
- **¿Por qué necesito una Unidad Base y Unidades Derivadas?**

---

## 👟 Paso a Paso

### A. Entendiendo "Tipos de Unidades" vs "Conversiones"
- **TIPO DE UNIDAD (Unit Type):** Es la familia universal de la medida. Ej: Peso, Volumen, Longitud.
- **UNIDAD DE CONVERSIÓN (Unit Conversion):** Es la regla específica para tu producto. Ej: "Para el producto *Cerveza XYZ*, 1 Caja = 24 Botellas".

### B. Crear un Tipo de Unidad (Medidas Estándar)
*Nota: El sistema ya trae configuradas las medidas estándar (Kg, Gr, Litros), pero puedes crear las tuyas propias (Ej. "Porciones", "Baldes").*

1. Navega a **Configuración > Unidades de Medida** (o Tipo de Unidad).
2. Haz clic en **"Nuevo Tipo de Unidad"**.
3. Selecciona la categoría global (Ej. Volumen, Empaque).
4. Define tu **Unidad Base**: Esta debe ser la medida más pequeña en la que consumes o vendes. (Ej. Para peso, la unidad base suele ser el *Gramo*, no el *Kilo*).
5. Crea las reglas hacia arriba. Ejemplo si tu base es Gramo (gr):
   - Kilogramo (Kg) = Equivalencia: 1000.
   - Saco = Equivalencia: 50000 (Si el saco trae 50kg).
6. Haz clic en **"Guardar"**.

### C. Configurar una Conversión Específica a un Producto (Cajas a Unidades)
*Este es el caso más común en inventario. Compras Cajas, vendes Unidades sueltas.*

1. Navega a **Inventario > Catálogo > Productos**.
2. Edita el producto deseado (Ej. *Refresco Lata 355ml*).
3. Localiza la pestaña o sección de **"Unidades y Conversiones"**.
4. Define la **Unidad de Inventario (Unidad Base):** Generalmente será "Unidad" (Ej. 1 lata).
5. Define la **Unidad de Compra:** Generalmente será "Caja" o "Display".
6. Establece el **Factor de Conversión**:
   - *Regla:* "1 [Unidad de Compra] contiene X [Unidades de Inventario]".
   - *Ejemplo:* 1 Caja contiene 24 Unidades. A la inversa, equivale a que multiplicas por 24.
7. Guarda los cambios del producto.

### D. ¿Qué pasa ahora cuando hago una compra o una venta?
- **Al Comprar (Entrada):** Cuando vayas al módulo de Recepciones e ingreses "5 Cajas" de Refresco, el sistema multiplicará automáticamente 5 x 24 y sumará **120 unidades** a tu inventario real.
- **Al Vender (Punto de Venta):** Cuando un cliente compre 1 Refresco, el sistema descontará 1 unidad. Te quedarán 119 unidades en stock (o matemáticamente: 4 Cajas y 19 latas).

---

## ⚠️ Reglas de Negocio y Advertencias
- **No cambies la Unidad Base:** Si ya tienes inventario registrado de un producto en "Unidades", cambiar su unidad base a "Kilos" causará un colapso matemático en los saldos históricos de la base de datos.
- **Operaciones de Cocina (Consumibles):** En los ingredientes y recetas (BOM), siempre utiliza la **Unidad de Consumo**. Por ejemplo, puedes comprar Carne por Kilo, guardarla por Kilo, pero tu receta de Hamburguesa consumirá "200 gramos". El factor de conversión se encargará del resto (descontará 0.200 Kg).
- **Consistencia de Categoría:** El sistema te impedirá lógicamente tratar de convertir Peso en Volumen (Ej. Gramos a Litros) a menos que manejes densidades (que actualmente no es soportado de forma estandarizada).

---
*SmartKubik Knowledge Base V1.03 - Unidades y Conversiones*
