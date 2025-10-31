# Seguridad y Compliance – Vertical Hospitality

## Controles de acceso
- **2FA TOTP + códigos de respaldo:** `auth.service.ts` valida códigos TOTP (vía `speakeasy`) o códigos de respaldo antes de emitir tokens cuando `twoFactorEnabled` está activo para el usuario. Los campos `twoFactorSecret`, `twoFactorBackupCodes` y `twoFactorLastVerifiedAt` se almacenan en la colección `users`; se documenta rotación periódica y cifrado a nivel de base de datos administrado por DevOps.
- **Bloqueo por intentos fallidos:** se conserva la lógica de `loginAttempts`/`lockUntil` para mitigar fuerza bruta; el desbloqueo requiere intervención de soporte.

## Auditoría y trazabilidad
- **Bitácora dedicada:** `appointment-audit.service.ts` registra cada creación, actualización, cancelación o eliminación de citas. Los eventos se consultan vía `GET /appointments/:id/audit` y se muestran en el front (`AppointmentsManagement.jsx`).
- **Metadatos de calendario:** al sincronizar con Google/Outlook se guardan `googleEventId`, `outlookEventId`, `icsPayload` y `lastSyncAt` dentro de `metadata.calendar` para auditoría cruzada.

## Protección de datos sensibles
- **Borrado seguro de logs:** la guía de runbook incluye eliminación controlada en caso de solicitudes GDPR/HIPAA. Los registros de auditoría pueden filtrarse por `tenantId` y purgarse con scripts de mantenimiento.
- **Depósitos y comprobantes:** los links a comprobantes se almacenan de forma firmada (`proofUrl` opcional). Los archivos subidos se restringen a los buckets privados definidos en DevOps.
- **Retención mínima:** se documentó que los eventos de auditoría y notificaciones deben conservarse 18 meses; posteriores purgas requieren aprobación de compliance.

## Procedimientos operativos
- **Checklist GDPR/HIPAA:** disponible en `docs/verticals/hospitality-playbook.md`, incluye verificación de consentimiento, derecho al olvido y flujos de data subject requests.
- **Runbook de incidentes:** `docs/comms/hospitality-notifications-runbook.md` y `docs/comms/hospitality-notifications-load-test.md` fueron actualizados para incluir puntos de contacto, pasos de rollback y evidencias requeridas.
