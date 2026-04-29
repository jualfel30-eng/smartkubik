---
title: "Guía Completa para Salones de Belleza: Citas, Profesionales y Clientes"
description: "Todo para operar un salón con SmartKubik: agendar citas, gestionar profesionales, depósitos, programa de lealtad, y notificaciones automáticas por WhatsApp."
category: "salon"
slug: "guia-salon-belleza"
keywords: ["salón", "belleza", "citas", "agenda", "profesional", "WhatsApp", "depósito", "no-show"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "12 min"
industry: "Beauty y Servicios"
problem: "Necesitas gestionar citas, profesionales, disponibilidad, pagos y notificaciones para tu salón."
solution: "SmartKubik ofrece un sistema completo de reservas con disponibilidad en tiempo real, WhatsApp automático, depósitos, programa de lealtad, y gestión de no-shows."
quickAnswer: |
  Crear cita: Agenda → clic en hora libre → selecciona cliente y servicio → confirma.
  Agregar profesional: Equipo → Nuevo Profesional → configura horarios.
  Notificar por WhatsApp: se envía automáticamente al confirmar la cita.
---

# Guía Completa para Salones de Belleza

## Agendar una Cita (`/appointments`)

### Desde el panel de administración
1. Ve a **Citas** en el menú lateral
2. Haz clic en **"+ Nueva Cita"**
3. Selecciona el **servicio** (ej: Corte de cabello, Tinte, Manicure)
4. Selecciona el **profesional** (o deja "Cualquiera disponible")
5. Elige **fecha y hora** — solo se muestran los horarios disponibles
6. Ingresa los datos del **cliente** (nombre, teléfono)
7. Confirma

### Desde la tienda online (el cliente reserva solo)
1. El cliente visita tu página de reservas (ej: `tusalon.smartkubik.com/beauty/reservar`)
2. Selecciona servicios y addons
3. Elige profesional (ve perfil y portafolio)
4. Selecciona fecha y hora disponible
5. Ingresa nombre y teléfono
6. Recibe confirmación por WhatsApp automáticamente

> **No necesita crear cuenta** — solo con el teléfono puede reservar.

---

## Gestionar Profesionales (`/resources`)

1. Ve a **Profesionales** (o "Recursos" según tu perfil)
2. **Crea profesional**: nombre, avatar, especialidades, ubicación
3. **Configura horario**: horas de trabajo por día de la semana
4. **Configura breaks**: Almuerzo, descansos personales
5. **Vincula servicios**: Qué servicios puede realizar cada profesional

El sistema solo muestra horarios disponibles considerando: horario del profesional, breaks, citas existentes, y duración del servicio + buffers.

---

## Servicios y Paquetes

### Crear un servicio
- Ve a **Servicios** → "Nuevo Servicio"
- Indica: nombre, duración (minutos), precio, categoría
- Configura buffers (tiempo antes y después para preparación)
- Opcionalmente agrega **addons** (ej: tratamiento extra +$10)

### Crear un paquete
- Un paquete combina múltiples servicios con precio especial
- El sistema calcula la duración total automáticamente
- Puede tener **pricing dinámico**: descuento por fin de semana, temporada, o tier de lealtad

---

## Depósitos y Pagos

### Cobrar depósito
1. Al crear la cita, indica que requiere depósito
2. El cliente paga (transferencia, pago móvil, etc.)
3. El cliente envía comprobante
4. Tú registras el depósito con el comprobante adjunto
5. Un administrador aprueba o rechaza

### Política de no-shows
- Si un cliente no se presenta, márcalo como **no-show**
- Después de N no-shows (configurable), el sistema:
  - Exige depósito obligatorio para futuras citas
  - Puede bloquear al cliente (blacklist)
- El cliente puede ver su estado vía el endpoint público de `client-status`

---

## Notificaciones por WhatsApp

El sistema envía automáticamente (si WhatsApp está configurado):

| Momento | Mensaje |
|---------|---------|
| Al reservar | "✅ Tu cita ha sido confirmada para [fecha] a las [hora]" |
| 24h antes | "📅 Recordatorio: mañana tienes cita a las [hora]" |
| Al cancelar | "❌ Tu cita ha sido cancelada" |
| Check-in | "👋 ¡Bienvenido/a! Tu profesional ha sido notificado" |

---

## Programa de Lealtad

- Los clientes acumulan **puntos** con cada cita completada
- Los puntos se canjean por descuentos
- Los tiers se asignan automáticamente:

| Tier | Descuento | Requisito |
|------|-----------|-----------|
| Explorador | 0% | Nuevo cliente |
| Bronce | 3% | Cliente frecuente |
| Plata | 7% | Compras regulares |
| Oro | 12% | Buen cliente |
| Diamante | 18% | VIP (top 5%) |

---

## Check-in con QR

1. Genera un código QR para tu local (se genera automáticamente)
2. El cliente escanea al llegar
3. El sistema marca `checkedInAt` y envía notificación push al profesional
4. "¡Tu cliente llegó!"

---

## Problemas comunes

### "No aparecen horarios disponibles para reservar"
**Causas posibles:**
- El profesional no tiene **horario configurado** para ese día → configúralo en Recursos
- El profesional tiene un **bloqueo** en ese horario (break, día libre)
- Ya hay citas que ocupan todo el horario disponible
- La duración del servicio + buffers no cabe en ningún slot

### "El cliente dice que no le llegó el WhatsApp"
Verifica en **Configuración → WhatsApp** que la integración esté activa. También verifica que el número del cliente esté en formato internacional (+58...).

### "¿Cómo cancelo todas las citas de un profesional que se enfermó?"
Crea un **bloqueo de recurso** para todo el día. Las citas existentes deberán reagendarse manualmente (o cancelarse una por una con notificación al cliente).

### "Un cliente con no-shows quiere reservar"
Si el cliente tiene `requiresDeposit=true`, solo podrá reservar si paga depósito primero. Si está en blacklist, no podrá reservar por el canal público — solo un admin puede crear la cita.

### "¿Puedo tener citas recurrentes (ej: corte cada 3 semanas)?"
Sí. Al crear la cita, activa **"Serie recurrente"** y configura la frecuencia. Se crean automáticamente las futuras ocurrencias.

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
