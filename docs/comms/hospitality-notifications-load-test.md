# Guía de Pruebas de Carga – Cola de Recordatorios Hospitality

Esta guía describe cómo ejecutar y documentar la prueba de carga (objetivo 1.000 mensajes/h) sobre la cola `appointment-reminders`.

## 1. Preparación
1. **Entorno:** usar `staging-hospitality` con Redis dedicado y workers desplegados.
2. **Variables de entorno:**
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`.
   - `LOAD_TEST_TENANT_ID` con el tenant demo hotelero.
3. **Credenciales:** validar en Vault tokens de Whapi y Twilio (evitar throttling cambiando a sandbox si es necesario).
4. **Herramientas:**
   - Script `scripts/hospitality-notification-load-test.ts`.
   - BullBoard (`/admin/queues`) para monitoreo en tiempo real.
   - Grafana dashboard `Hospitality – Notifications`.

## 2. Ejecución del script
```bash
cd food-inventory-saas
npx ts-node -r dotenv/config scripts/hospitality-notification-load-test.ts --tenant=hotel-demo --count=1000 --batch=200
```
- Alternativa: `npm run load-test:hospitality-notifications -- --tenant=hotel-demo --count=1000 --batch=200`.
- **dry-run:** añadir `--dryRun=true` para validar configuración sin encolar jobs.
- **Batch:** ajustar `--batch` según capacidad (recomendado 200 para evitar picos de memoria).

El script genera jobs con plantillas alternadas (`hospitality_reminder_24h`, `hospitality_followup`) y marca `metadata.loadTest=true` para facilitar la trazabilidad.

## 3. Métricas a capturar
- Tiempo total (`durationMs`) y throughput (`mensajes/seg`).
- En BullBoard: latencia promedio, jobs en progreso, errores.
- En Grafana: paneles `Queue Latency` y `Delivery Failures` antes/durante/después.
- En logs (`notifications.service`): errores HTTP de Whapi/Twilio y reintentos.

Registrar los resultados en la tabla de control:

| Fecha | Tenant | Total jobs | Duración | Throughput | Errores | Observaciones |
|-------|--------|------------|----------|------------|---------|---------------|
| 2025-01-09 | hotel-demo | 1.000 | 12m 05s | 1.38 msg/s | 0 | Cola estable, sin throttling |

## 4. Criterios de aceptación
- Envío de 1.000 mensajes en < 60 min.
- Latencia promedio < 90s, máximo < 180s.
- < 1% de fallas con reintento automático exitoso.
- Documentación de incidentes (si ocurren) en el runbook.

## 5. Post-mortem y seguimiento
- Adjuntar reporte en `docs/comms/hospitality-notifications-load-test.md` (agregar nuevas filas a la tabla).
- Crear ticket en Jira si la cola supera el SLA.
- Revisar tokens y límites de proveedor si hubo throttling.

Mantén la tabla actualizada cada vez que se ejecute la prueba.
