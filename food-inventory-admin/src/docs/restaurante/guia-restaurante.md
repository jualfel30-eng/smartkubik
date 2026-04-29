---
title: "Guía Completa para Restaurantes: Mesas, Cocina, Reservaciones y Menú"
description: "Todo lo que necesitas saber para operar un restaurante con SmartKubik: mesas, pantalla de cocina, reservaciones, división de cuentas, lista de espera y análisis de menú."
category: "restaurante"
slug: "guia-restaurante"
keywords: ["restaurante", "mesas", "cocina", "KDS", "reservaciones", "menú", "división de cuentas", "lista de espera"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "15 min"
industry: "Restaurantes y Food Service"
problem: "Necesitas gestionar mesas, órdenes de cocina, reservaciones y analizar la rentabilidad de tu menú."
solution: "SmartKubik integra plano de planta, pantalla de cocina en tiempo real, reservaciones con disponibilidad, análisis de menú con IA, y división de cuentas."
quickAnswer: |
  Abrir mesa: Mesas → toca una mesa libre → agrega productos.
  Enviar a cocina: desde la mesa → "Enviar a Cocina".
  Cobrar: Mesa → "Cobrar" → divide cuenta si necesitas.
---

# Guía Completa para Restaurantes

## Plano de Mesas (`/restaurant/floor-plan`)

### Configurar mesas
1. Ve a **Mesas** en el menú lateral
2. Crea mesas indicando: número, sección (terraza, salón, barra), capacidad mínima y máxima
3. Arrastra para posicionar en el plano visual

### Operaciones diarias
- **Sentar clientes**: Selecciona mesa → "Sentar" → indica número de personas → se asigna el mesero
- **Transferir mesa**: Si el cliente quiere cambiar, mueve su orden a otra mesa
- **Combinar mesas**: Para grupos grandes, une 2+ mesas (una queda como "padre")
- **Limpiar**: Al irse el cliente, marca "Limpiar" → vuelve a "Disponible" en 5 minutos automáticamente

### Estados de mesa
| Color | Estado | Significado |
|-------|--------|-------------|
| 🟢 Verde | Disponible | Lista para nuevos clientes |
| 🔴 Rojo | Ocupada | Clientes sentados, orden activa |
| 🟡 Amarillo | Reservada | Tiene reservación futura |
| 🔵 Azul | Limpiando | Esperando limpieza (5 min auto) |

---

## Pantalla de Cocina / KDS (`/restaurant/kitchen-display`)

La cocina recibe las órdenes en tiempo real apenas el mesero las confirma en el POS.

### Cómo funciona
1. El mesero crea una orden desde el POS y la confirma
2. Los items marcados como "Enviar a cocina" aparecen en el KDS
3. La cocina ve: número de orden, mesa, items con modificadores e instrucciones especiales
4. El cocinero toca cada item para marcar su progreso:
   - **Pendiente** → **Preparando** → **Listo** → **Servido**
5. Cuando todo está listo, hace "Bump" para completar la orden

### Funciones útiles
- **Marcar urgente**: Destaca una orden con prioridad ASAP
- **Asignar cocinero**: Indica quién prepara cada orden
- **Agregar items**: Si el cliente pide algo más después, se envía al KDS sin crear nueva orden
- **Estadísticas**: Tiempo promedio de preparación, órdenes completadas, tiempos de espera

---

## Reservaciones (`/restaurant/reservations`)

### Configurar disponibilidad
1. Ve a **Reservaciones → Configuración**
2. Define: horarios por día de la semana, duración de slots (ej: 90 min), buffer entre mesas
3. Indica tamaño máximo de grupo y cuántas reservaciones por slot
4. Activa auto-confirmación si quieres que se confirmen solas

### Gestionar reservaciones
- **Crear**: Cliente llama → registras nombre, teléfono, fecha, hora, personas
- **Confirmar**: Cambia de pendiente a confirmada
- **Sentar**: Al llegar el cliente, vincúlala a una mesa
- **No-show**: Si no llega, marca como no-show (libera la mesa)

### Disponibilidad inteligente
El sistema verifica automáticamente:
- ✅ El restaurante acepta reservaciones ese día
- ✅ El horario está dentro del turno activo
- ✅ No se excede el máximo de reservaciones por slot
- ✅ Hay mesas con capacidad suficiente

Si no hay disponibilidad, sugiere **horarios alternativos** (±30 min, ±1 hora).

---

## Ingeniería de Menú (`/restaurant/menu-engineering`)

Análisis de rentabilidad de tu menú usando la **Matriz BCG** con inteligencia artificial.

### Las 4 categorías
| Categoría | Popularidad | Rentabilidad | Acción recomendada |
|-----------|-------------|--------------|---------------------|
| ⭐ **Estrellas** | Alta | Alta | Mantener calidad, asegurar stock |
| 🐴 **Caballos de trabajo** | Alta | Baja | Reducir costos o subir precio gradualmente |
| 🧩 **Puzzles** | Baja | Alta | Promocionar más, mejorar visibilidad |
| 🐕 **Perros** | Baja | Baja | Considerar eliminar o reformular |

### Funciones de IA
- **Pronóstico de demanda**: Predice ventas futuras por producto
- **Optimización de precios**: Sugiere precios óptimos para maximizar margen
- **Sugerencias inteligentes**: Recomendaciones accionables por categoría (bundles, promociones, eliminaciones)

---

## División de Cuentas

Cuando un grupo quiere pagar por separado:

1. Abre la orden de la mesa
2. Selecciona **"Dividir cuenta"**
3. Elige el método:
   - **Partes iguales**: Divide entre N personas
   - **Por items**: Cada quien paga lo que pidió
   - **Personalizado**: Montos específicos por persona
4. Cada persona paga su parte individualmente
5. Cuando todas las partes están pagadas, la cuenta se cierra

---

## Lista de Espera

Cuando todas las mesas están ocupadas:

1. Agrega al cliente a la **lista de espera** (nombre, teléfono, personas)
2. El sistema estima el tiempo de espera basado en datos históricos
3. Cuando hay mesa disponible, notifica al cliente (SMS/WhatsApp)
4. Sienta al cliente desde la lista directamente a la mesa

---

## Problemas comunes

### "Las órdenes no aparecen en la cocina (KDS)"
Verifica que los productos tengan activado **"Enviar a cocina"** (campo `sendToKitchen` en el producto). Los productos con este campo desactivado no se envían al KDS.

### "No puedo crear reservaciones"
Revisa la **configuración de reservaciones**: ¿el restaurante tiene `acceptReservations` activado? ¿Los horarios están configurados para ese día de la semana?

### "La mesa dice 'Ocupada' pero no hay clientes"
Puede ser que la orden vinculada no se completó ni canceló. Ve a **Órdenes → Historial**, busca la orden de esa mesa, y complétala o cancélala.

### "¿Cómo configuro modificadores (extras, opciones)?"
Ve a la sección de **Modificadores** (si está habilitada). Crea un **grupo** (ej: "Extras de pizza") con opciones individuales (ej: "Extra queso +$2"). Luego vincula el grupo a los productos que aplican.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
