---
title: "Guía de Marketing: Campañas, Promociones, Cupones y Lealtad"
description: "Cómo crear campañas multi-canal, configurar promociones y cupones, gestionar el programa de lealtad, y usar triggers automáticos."
category: "marketing-docs"
slug: "guia-marketing"
keywords: ["marketing", "campañas", "promociones", "cupones", "lealtad", "WhatsApp", "email"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "10 min"
industry: "Todas"
problem: "Necesitas atraer y retener clientes con campañas, descuentos y un programa de fidelización."
solution: "SmartKubik ofrece campañas multi-canal, 5 tipos de promociones, cupones con validación completa, programa de lealtad con tiers, y automatización con triggers."
quickAnswer: |
  1. Ve a Marketing → Nueva Campaña
  2. Selecciona canal (WhatsApp, email, SMS)
  3. Configura audiencia y mensaje
  4. Promociones: Marketing → Promociones → configura descuento y condiciones
---

# Guía de Marketing

## Campañas (`/marketing` → Campañas)

### Crear una campaña
1. Ve a **Marketing** → pestaña **Campañas**
2. Haz clic en **"+ Nueva Campaña"**
3. Configura:
   - **Canal**: Email, SMS, WhatsApp, o Push
   - **Asunto y contenido** del mensaje
   - **Audiencia**: Filtra por tier de lealtad, tipo de cliente, ubicación, historial de compras, productos comprados, días desde última compra
4. El sistema estima el **alcance** (cuántos clientes recibirán el mensaje)
5. **Lanza** la campaña o prográmala para después

### Métricas de campaña
Después de lanzar, puedes ver:
- **Enviados** / **Entregados** / **Abiertos** / **Clicados** / **Convertidos**
- **ROI** de la campaña (ingresos atribuidos vs. costo)
- **Funnel**: Enviado → Abierto → Clic → Conversión

---

## Promociones (`/marketing` → Promociones)

### 5 tipos de promociones

| Tipo | Ejemplo | Configuración |
|------|---------|---------------|
| **% de descuento** | 20% en toda la tienda | Porcentaje + tope máximo |
| **Monto fijo** | $5 de descuento | Monto fijo |
| **Compra X lleva Y** | 2×1 en bebidas | Cantidad compra, cantidad gratis |
| **Precios por volumen** | 10+ = 10%, 50+ = 20% | Tiers de cantidad |
| **Bundle/Combo** | Combo almuerzo $8.99 | Productos específicos |

### Restricciones configurables
- Productos/categorías que aplican (o excluyen)
- Días y horarios específicos (ej: solo fines de semana, 10AM-5PM)
- Límite de usos (total y por cliente)
- Monto mínimo de compra
- Tipo de cliente (todos, nuevos, por tier)
- Combinable con cupones u otras promociones

> **Auto-apply**: Si activas esta opción, la promoción se aplica automáticamente en el checkout sin que el cliente haga nada.

---

## Cupones (`/marketing` → Cupones)

### Crear un cupón
1. Ve a **Marketing** → pestaña **Cupones**
2. Indica: código (único), tipo de descuento (% o fijo), valor
3. Configura: fecha de validez, usos máximos, productos aplicables
4. Comparte el código con tus clientes

### Validación automática
Al ingresar el código en el checkout, el sistema verifica:
- ✅ Código existe y está activo
- ✅ Dentro del rango de fechas
- ✅ No excede usos máximos
- ✅ Monto de compra cumple el mínimo
- ✅ Productos del carrito aplican
- ✅ Cliente no excede su límite individual

---

## Programa de Lealtad (`/marketing` → Lealtad)

### Cómo funcionan los puntos
- Se **ganan** automáticamente con cada compra (configurable: puntos por dólar)
- Se **canjean** por descuento en futuras compras (configurable: valor por punto)
- Tienen **expiración** opcional (ej: 365 días)

### Tiers automáticos
Los clientes se clasifican automáticamente basado en un score que combina: qué tan reciente fue su última compra (50%), con qué frecuencia compra (30%), y cuánto gasta (20%).

| Tier | Descuento automático |
|------|---------------------|
| Diamante | 18% |
| Oro | 12% |
| Plata | 7% |
| Bronce | 3% |
| Explorador | 0% |

---

## Triggers Automáticos (`/marketing` → Triggers)

Los triggers ejecutan campañas automáticamente cuando algo pasa:

| Trigger | Ejemplo |
|---------|---------|
| **Carrito abandonado** | "¡Olvidaste algo! Tu carrito te espera" |
| **Milestone de compra** | "¡Felicidades por tu compra #10!" |
| **Upgrade de tier** | "¡Subiste a Oro! Ahora tienes 12% de descuento" |
| **Cumpleaños** | "¡Feliz cumpleaños! Te regalamos un 20% de descuento" |
| **Inactividad** | "Te extrañamos — vuelve con 15% off" |

Cada trigger tiene: cooldown (no enviar más de 1 por semana), límite por cliente, y delay configurable.

---

## Problemas comunes

### "La promoción no se aplica automáticamente"
Verifica que `autoApply` esté **activado** en la configuración de la promoción. También verifica que el cliente y los productos cumplan todas las restricciones (fecha, horario, monto mínimo, etc.).

### "El cupón me dice 'inválido'"
Revisa: ¿el código está escrito correctamente (mayúsculas)? ¿Está dentro del rango de fechas? ¿No se excedió el máximo de usos? ¿El monto de compra cumple el mínimo?

### "¿Cómo sé cuántos puntos tiene un cliente?"
En el CRM, abre el perfil del cliente → verás su tier, score de lealtad, y puntos acumulados. También puedes consultar por teléfono desde el endpoint de loyalty.

### "El descuento por tier no se aplica en la venta"
El descuento por tier se aplica como un descuento general al momento del checkout. Verifica que el módulo de lealtad esté activo y que el cliente tenga un tier asignado.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
