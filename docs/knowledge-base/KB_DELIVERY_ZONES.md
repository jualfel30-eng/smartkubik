# 📚 Knowledge Base: Zonas de Reparto y Logística
*Cómo Trazar Polígonos de Reparto (Mapas) y Tarifar por Kilómetro*

## 📌 ¿Qué puedo hacer aquí?
El módulo de Envíos y Logística te permite definir exactamente a dónde entregas tus productos y cuánto cobras por ello. Funciona dibujando áreas geográficas (Polígonos) en un mapa de Google/Leaflet o estableciendo reglas de distancia desde tu sucursal.

---

## ❓ Casos de Uso (FAQ)
- **¿Cómo cobro más caro el envío si el cliente vive cruzando el río?**
- **¿Puedo enviar paquetes con una empresa externa como Zoom o MRW?**
- **¿Cómo bloqueo compras en línea de personas que viven fuera de mi zona de cobertura?**

---

## 👟 Paso a Paso

### A. Trazar una Zona de Reparto Local (Polígonos)
*Ideal para envíos en moto (Delivery) propios del negocio.*

1. Ve a **Logística > Zonas de Entrega (Delivery Zones)**.
2. Haz clic en **"Nueva Zona"**.
3. **Paso Geoespacial:** Aparecerá un mapa interactivo (centrado en la dirección de tu sucursal).
4. Usa el ratón para hacer clic y "dibujar" un polígono cerrado sobre el mapa (Ej. Dibuja un cuadrado alrededor del sector Este de la ciudad).
5. **Configuración de Tarifa:**
   - Ingresa un Nombre (Ej. "Zona Este").
   - Define el Costo Base de envío para las direcciones que caigan dentro de esta figura (Ej. *$3.00*).
   - *Opcional:* Permite "Envío Gratis" si la compra dentro de la zona supera los $50.
6. Haz clic en **"Guardar Zona"**.

### B. Configurar Proveedores de Envío Nacional
*Ideal cuando envías paquetes a otras ciudades a través de empresas como Tealca o MRW.*

1. Dirígete a **Logística > Proveedores de Envío (Shipping Providers)**.
2. Haz clic en **"Añadir Proveedor"**.
3. Selecciona el proveedor del catálogo (o crea uno genérico).
4. Agrega los métodos de envío que ofrecen:
   - "Envío Estándar Nacional (3-5 días)" -> Costo: $5.00.
   - "Envío Express (24H)" -> Costo: $10.00.
5. Puedes habilitar la opción de "Tracking" si planeas brindar a tus clientes un número de guía.
6. Guarda el Proveedor.

### C. ¿Qué experimenta el Cliente en tu Storefront?
1. Cuando tu cliente ingrese en tu Tienda Web (Storefront) e intente pagar (Checkout), el sistema de mapas le pedirá su dirección.
2. **Magia detrás de escena:** El sistema cruza las coordenadas geográficas (Latitud/Longitud) de su casa con los Polígonos que trazaste en el Paso A.
3. Si el cliente está "dentro" del polígono, el carrito sumará automáticamente los $3.00 de envío.
4. Si el cliente está "fuera" del mapa, el sistema le bloqueará la opción de "Delivery Local" y solo le mostrará las tarifas del "Envío Nacional" (MRW/Tealca).

---

## ⚠️ Reglas de Negocio y Advertencias
- **Superposición de Zonas (Overlapping):** Evita dibujar un Polígono A encima del Polígono B. Si las coordenadas de una casa caen en áreas donde las tarifas se cruzan, el sistema podría generar un error de cálculo o frustrar al cliente. Trata de dibujar fronteras claras.
- **Rutas de Manufactura (Confusión Frecuente):** En las opciones de Logística verás algo llamado "Ruteo" (Routing). Ten en cuenta que esto NO se refiere a las motos de los repartidores. En este ERP, *Routing* es un término industrial que se refiere al viaje que hace la materia prima dentro de una fábrica para convertirse en producto ensamblado (Módulo MRP).

---
*SmartKubik Knowledge Base V1.03 - Logística y Zonas de Entrega*
