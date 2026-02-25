# 📚 Knowledge Base: Catálogo y Productos
*Guía para Crear Productos, Variantes y Categorías*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Catálogo es el corazón de tu negocio. Aquí podrás registrar todo lo que vendes (o produces), organizarlo por categorías y crear variantes (como "Talla" o "Sabor") para mantener tu punto de venta (POS) y tienda en línea limpios y fáciles de navegar.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo agrego un producto nuevo al sistema?**
- **¿Cómo creo opciones para un mismo producto (ej. Refresco Pequeño, Mediano, Grande)?**
- **¿Cómo agrupo mis productos para que aparezcan juntos en el menú o tienda?**

---

## 👟 Paso a Paso

### A. Crear una Categoría Nueva
*Antes de crear productos, es recomendable tener "carpetas" (categorías) para organizarlos.*

1. Navega en el menú principal a **Inventario > Catálogo > Categorías**.
2. Haz clic en el botón superior derecho **"Nueva Categoría"**.
3. Completa los campos obligatorios:
   - **Nombre:** (Ej. *Bebidas*, *Pizzas*, *Ferretería*).
   - **Categoría Padre (Opcional):** Si quieres que "Refrescos" esté dentro de "Bebidas", selecciona la categoría principal aquí.
4. Sube una imagen representativa y haz clic en **"Guardar"**.

### B. Crear un Producto Simple
1. Navega a **Inventario > Catálogo > Productos**.
2. Haz clic en **"Nuevo Producto"**.
3. En la pestaña **Información General**:
   - Ingresa el **Nombre**, **SKU** (Código de barra o identificador único) y elige la **Categoría**.
   - Define el Tipo de Producto:
     - *Físico/Inventariable:* Si quieres llevar control de stock.
     - *Servicio:* Si es mano de obra o intangible (no descuenta inventario).
4. En la pestaña **Precios y Unidades**:
   - Establece la **Unidad de Manejo** (Ej. Unidad, Kg, Litro).
   - Ingresa el **Costo** base y el **Precio de Venta**. Configura los impuestos (IVA) si aplican.
5. Haz clic en **"Guardar Producto"**.

### C. Crear un Producto con Variantes (Opciones Múltiples)
Si vendes "Camisetas" en tallas S, M, L y colores Rojo, Azul, no crees 6 productos distintos. Crea variantes:

1. Crea o Edita un producto (Siguiendo el paso B).
2. Ve a la pestaña **Variantes**.
3. Activa la opción **"Este producto tiene múltiples opciones"**.
4. Haz clic en **"Añadir Opción"**:
   - **Nombre de Opción:** "Talla" -> **Valores:** S, M, L.
   - **Nombre de Opción:** "Color" -> **Valores:** Rojo, Azul.
5. El sistema generará todas las combinaciones posibles automáticamente (ej. *Camiseta Talla M, Color Azul*).
6. Asigna un **SKU único y un Precio distinto (si aplica)** a cada fila generada.
7. Haz clic en **"Guardar y Actualizar Variantes"**.

---

## ⚠️ Reglas de Negocio y Advertencias
- **Bloqueos de SKU:** No puedes usar el mismo código SKU para dos productos distintos. Debe ser alfanumérico y único.
- **Cambio de Tipo:** Una vez que un producto es marcado como "Servicio", no puede convertirse en "Inventariable" si ya tiene ventas asociadas.
- **Borrado Lógico:** Si eliminas un producto que ya fue vendido históricamente, no desaparecerá de tus reportes financieros viejos (para mantener la legalidad contable); solo se ocultará de tu punto de venta actual (quedará archivado).

---
*SmartKubik Knowledge Base V1.03 - Catálogo y Productos*
