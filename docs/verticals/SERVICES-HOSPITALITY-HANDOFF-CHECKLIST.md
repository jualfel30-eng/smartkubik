# Servicios & Hotelería – Checklist de Cierre (Fases 4 y 5)

## 1. Documentación final
- ✅ Roadmap actualizado (`docs/verticals/SERVICES-HOSPITALITY-ROADMAP.md`).
- ✅ Estado de implementación (`docs/verticals/SERVICES-HOSPITALITY-IMPLEMENTATION-STATUS.md`).
- ✅ Playbook comercial y de enablement (`docs/verticals/hospitality-playbook.md`).
- ✅ Playbook de soporte (`docs/support/hospitality-support-playbook.md`).

## 2. Scripts y migraciones
- ✅ `npm run db:migrate:hospitality-hand-off` para aplicar banderas de módulos, defaults de políticas y backfill de loyalty.
- ✅ `scripts/hospitality-notification-load-test.ts` para validación de colas BullMQ.
- ✅ `scripts/migrate-tenants-vertical.ts` (histórico) para garantizar `verticalProfile.key = hospitality`.

## 3. Pruebas E2E y QA
- ✅ Suite conversacional `test/e2e/assistant.e2e.spec.ts` (create/modify/cancel).
- ✅ Exportaciones `/reports/appointments/export` con generación CSV/PDF.
- ✅ Tests manuales de dashboard (`HospitalityOperationsDashboard.jsx`) con floor plan en vivo.

## 4. Seguridad y compliance
- ✅ 2FA con TOTP y backup codes (implementación sin dependencias externas, ver `AuthService.verifyTotpCode`).
- ✅ Auditoría de citas (`appointment-audit.service.ts`) expuesta en el backoffice.
- ✅ Política actualizada (`docs/security/hospitality.md`).

## 5. Materiales comerciales
- ✅ Sales kit (`docs/verticals/hospitality-sales-kit.md`).
- ✅ Demo narrativa en playbook comercial.
- ✅ Métricas clave documentadas (sección 5 del playbook).

## 6. Handoff operativo
- ✅ Runbook de notificaciones y opt-out (`docs/comms/hospitality-notifications-runbook.md`).
- ✅ Checklist de carga (`docs/comms/hospitality-notifications-load-test.md`).
- ✅ Canal `#hospitality-oncall` + rotación documentada en playbook de soporte.

## 7. Checklist de cliente final
1. `enabledModules` con appointments/resources/service-packages activos.
2. Tokens Whapi cargados (`Tenant.whapiToken`).
3. Integraciones PMS y calendario validadas (salud en `/hospitality/integrations/pms/health`).
4. Reportes exportados y compartidos con el cliente.
5. Sesión de enablement entregada + material comercial compartido.

> _Resultado:_ con todos los elementos marcados como completos, las Fases 4 y 5 quedan oficialmente cerradas y el vertical hospitality está listo para hand-off comercial y operativo.

