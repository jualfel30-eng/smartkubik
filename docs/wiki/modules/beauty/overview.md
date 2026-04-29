# Beauty y Servicios (Módulos Agrupados)

## ¿Qué es?

El grupo de módulos de Beauty/Servicios incluye todo lo necesario para salones de belleza, barberías, spas, clínicas, hoteles, y negocios basados en citas: sistema de reservas con disponibilidad en tiempo real, gestión de profesionales, paquetes de servicios, depósitos/pagos, galería de portafolio, reseñas, programa de lealtad, y notificaciones WhatsApp automáticas.

## Módulos Incluidos (4)

| Módulo | Endpoints | Función Principal |
|---|---|---|
| **Appointments** | ~30 (privados + públicos) | Sistema central de citas: CRUD, disponibilidad, depósitos, auditoría, series, grupos, bloqueos |
| **Beauty** | ~40 (privados + públicos) | Especialización beauty: bookings, servicios, profesionales, galería, reviews, loyalty, WhatsApp, waitlist |
| **Service Packages** | 7 | Paquetes de servicios con pricing dinámico (temporada, ocupación, tier) |
| **Hospitality Integrations** | 1+ | Webhooks PMS, sync calendario Google/Outlook |

## Lifecycle de una Reserva

```
Pending → Confirmed → In Progress → Completed
                                   → No-Show (penalidad)
         → Cancelled (refund según política)
```

## Funcionalidades Destacadas
- **Booking sin cuenta**: Clientes reservan solo con teléfono (público)
- **Disponibilidad inteligente**: Considera horario del profesional, breaks, servicios existentes, duración + buffers
- **Depósitos**: Registro con comprobante, aprobación/rechazo, integración contable
- **No-show policy**: Conteo de inasistencias, bloqueo automático, exigencia de depósito
- **WhatsApp automático**: Confirmación, recordatorio 24h, check-in QR, cancelación
- **Series/Recurrentes**: Citas semanales/mensuales para clientes frecuentes
- **A/B pricing**: Pricing dinámico por día de semana, temporada, canal, y tier de lealtad

## Permisos
- `appointments_read`, `appointments_write` — Para citas y servicios

## Feature Flags / Verticales
- Vertical `SERVICES` o `HOSPITALITY` habilita el grupo
- Profile keys: `barbershop-salon`, `clinic-spa`, `mechanic-shop`, `hospitality`

---

*Última actualización: 2026-04-28*
*Archivos: `modules/appointments/`, `modules/beauty/`, `modules/service-packages/`, `modules/hospitality-integrations/`*
