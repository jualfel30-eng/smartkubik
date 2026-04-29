# Módulos Complementarios (Prioridad 5)

## Resumen de todos los módulos complementarios del sistema.

> Última actualización: 2026-04-28

---

## 1. Storefront Management (~20 endpoints)

Gestiona la configuración del storefront público: temas, colores, logos, favicon, banner, dominio, SEO, galería, y configuraciones específicas por vertical (beauty no-show policies).

**Archivos**: `modules/storefront/`, `modules/storefront-config/`

---

## 2. Delivery & Drivers (~9 endpoints)

Gestión de envíos: cálculo de costos de delivery, tarifas por zona geográfica, portal de repartidores (reclamar órdenes, tracking GPS, completar con foto), historial de entregas.

**Archivos**: `modules/delivery/`, `modules/drivers/`

---

## 3. Analytics & Dashboard (~20+ endpoints)

KPIs de rendimiento, tendencias de ventas (diario/semanal/mensual), estado de inventario, métricas personalizadas, vistas guardadas, reportes de CxC aging, exportación de datos de hospitality.

**Archivos**: `modules/analytics/`, `modules/dashboard/`, `modules/reports/`

---

## 4. Notifications & Communication (~25+ endpoints)

Sistema multi-canal: notificaciones in-app (CRUD, preferencias, mark-as-read), web push (VAPID, suscripciones), email (Gmail OAuth, Outlook OAuth, Resend, SMTP con testing), WhatsApp Business API (incoming/outgoing via Whapi), sync de calendario Google/Outlook.

**Archivos**: `modules/notifications/`, `modules/notification-center/`, `modules/mail/`, `modules/whapi/`

---

## 5. AI & Intelligence (~7 endpoints)

Asistente conversacional con 40+ herramientas built-in (consulta inventario, órdenes, clientes, contabilidad, etc.), knowledge base con RAG (carga PDFs/TXT), base de datos vectorial para búsqueda semántica, inteligencia proactiva (notificaciones automáticas), configuración por tenant.

**Archivos**: `modules/assistant/`, `modules/openai/`, `modules/knowledge-base/`, `modules/vector-db/`, `modules/intelligence/`

---

## 6. Infrastructure (~20+ endpoints)

- **Health**: Health check + debug de token JWT
- **Uploads**: Gestión de archivos (Multer)
- **Data Import**: Importación masiva CSV/XLSX con mapping de columnas, presets, validación, ejecución async (BullMQ para >1000 filas), historial, rollback
- **Feature Flags**: Toggle de funcionalidades por tenant (1 endpoint público)
- **Audit Log**: Registro de todas las acciones (service-only, sin controller)
- **Security Monitoring**: Reportes CSP, métricas de seguridad, alertas

**Archivos**: `modules/health/`, `modules/uploads/`, `modules/data-import/`, `modules/feature-flags/`, `modules/audit-log/`, `modules/security-monitoring/`

---

## 7. Platform Management (~30+ endpoints)

- **Onboarding**: Registro de tenants (rate-limited), confirmación email, conversión trial→paid
- **Organizations**: Jerarquía multi-nivel (parent/subsidiary), gestión de miembros, aislamiento por ubicación
- **Subscription Plans**: CRUD de planes con límites por feature (super-admin only)
- **Super Admin**: Gestión global de tenants, impersonación de usuarios, enable/disable módulos, setup de AI assistant por tenant

**Archivos**: `modules/onboarding/`, `modules/organizations/`, `modules/subscription-plans/`, `modules/super-admin/`

---

## 8. Otros (~15 endpoints combinados)

- **Exchange Rate**: Tasas BCV en tiempo real (`modules/exchange-rate/`)
- **Fixed Assets**: Activos fijos y depreciación (`modules/fixed-assets/`)
- **Investments**: Gestión de inversiones (`modules/investments/`)
- **Liquidations**: Liquidaciones contables (`modules/liquidations/`)
- **Reviews / Ratings**: Reseñas de clientes y calificaciones (`modules/reviews/`, `modules/ratings/`)
- **Calendars / Activities / Reminders**: CRM avanzado — calendario con sync, actividades, recordatorios (`modules/calendars/`, `modules/activities/`, `modules/reminders/`)
- **Opportunities / Playbooks**: Pipeline de ventas avanzado (`modules/opportunities/`, `modules/opportunity-stages/`, `modules/playbooks/`)
- **Todos**: Tareas internas (`modules/todos/`)
- **Product Dedup**: Deduplicación de productos (`modules/product-dedup/`)
- **Locations / Business Locations**: Ubicaciones geográficas y sedes (`modules/locations/`, `modules/business-locations/`)
- **Unit Types / Unit Conversions**: Sistema de unidades de medida (`modules/unit-types/`, `modules/unit-conversions/`)
- **Consumables / Supplies**: Tipos especiales de productos (`modules/consumables/`, `modules/supplies/`)

---

*Última actualización: 2026-04-28*
