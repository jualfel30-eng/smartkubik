---
name: deploy-saas
description: Orquesta deploy a producción Hetzner con pre-deploy checks (lint, typecheck, test), backup remoto, rsync, pm2 reload y smoke tests post-deploy. Rollback automático si falla. Reemplaza el deploy manual disperso (pre-deploy.sh + simple-deploy.sh + rsync + pm2 a mano).
trigger: /deploy-saas <admin|saas|storefront|all> [--dry-run] [--skip-tests] [--tenant <slug>]
---

# deploy-saas

## Cuándo invocar

- Tienes cambios listos para producción y quieres deployear con confianza.
- Después de un fix crítico que necesita salir rápido pero no quieres saltarte validaciones.
- Para validar pre-deploy sin tocar prod (`--dry-run`).

## Inputs

- **`target`** (requerido): `admin` | `saas` | `storefront` | `all`.
- (opcional) `--dry-run` — ejecuta pre-deploy checks pero NO hace rsync ni reload.
- (opcional) `--skip-tests` — solo para emergencias documentadas. Pide confirmación explícita.
- (opcional) `--tenant <slug>` — tenant para smoke test post-deploy (default: `earlyadopter`).
- (opcional) `--no-backup` — solo si el cambio es 100% reversible y muy puntual. Pide confirmación.

## Lo que hace

### Fase 1: Pre-deploy checks

Para el target elegido:

- `npm run lint` — debe pasar sin errors.
- `npm run build` (typecheck + bundle) — debe pasar sin warnings críticos.
- `npm test` (saas: jest unit; admin: build prod sin warnings).
- `git status` debe estar limpio (todos los cambios committeados).
- `git log origin/main..HEAD` — muestra commits a deployear (visibility).

Si algo falla → aborta con reporte. NO continúa.

### Fase 2: Backup remoto

```bash
ssh deployer@178.156.182.177 "tar -czf ~/backups/api-$(date +%Y%m%d-%H%M).tar.gz /home/deployer/smartkubik/api/dist"
```

(Adaptado por target: para admin, backup de `dist/` admin.)

### Fase 3: Rsync

- **saas**: `rsync dist/ deployer@178.156.182.177:/home/deployer/smartkubik/api/dist/`
- **admin**: `rsync dist/ deployer@178.156.182.177:~/smartkubik/food-inventory-admin/dist/`
- **storefront**: rsync al path de Next correspondiente.

### Fase 4: PM2 reload (solo saas)

```bash
ssh deployer@178.156.182.177 "pm2 reload smartkubik-api"
```

(admin y storefront no requieren reload — nginx sirve estáticos.)

### Fase 5: Smoke tests

Contra el tenant especificado (`--tenant`, default `earlyadopter`):

1. `GET /api/v1/health` → 200.
2. `POST /api/v1/auth/login` con credenciales de smoke test (env `SMOKE_EMAIL`, `SMOKE_PASSWORD`) → 200 + accessToken.
3. `GET /api/v1/products?limit=1` con token → 200 + items array.
4. `GET /api/v1/customers?customerType=supplier&search=a` → 200.
5. (admin) `curl https://app.smartkubik.com` → 200 + HTML contiene `<div id="root">`.

Si cualquier smoke falla → fase 6.

### Fase 6: Rollback (solo si smoke falla)

```bash
ssh deployer@178.156.182.177 "tar -xzf ~/backups/api-<timestamp>.tar.gz -C / && pm2 reload smartkubik-api"
```

Reporta error detallado al usuario.

## Outputs

- Log timestampeado en `scripts/_deploys/<target>-<timestamp>.log`.
- Resumen en stdout:
  ```
  ✓ Pre-deploy checks (lint, build, test, git)
  ✓ Remote backup created: api-20260502-1842.tar.gz
  ✓ Rsync (1.2 MB transferred, 8 files)
  ✓ PM2 reload (uptime reset)
  ✓ Smoke tests (5/5 passed in 3.2s)
  Deploy completed in 2m 14s
  ```
- Si rollback: log adicional con razón del fallo.

## Side effects

- Modifica producción (NO en `--dry-run`).
- Crea backup remoto en `~/backups/`.
- Reload PM2 (zero-downtime, pero hay un blip de 1-2s).
- Logs locales en `scripts/_deploys/`.

## Guardrails

- **Refuse** si `MONGODB_URI` o credenciales remotas no están configuradas.
- **Refuse** si la branch no es `main` o no está al día con origin/main (a menos que `--force-branch`).
- `--skip-tests` requiere confirmación explícita y se loguea con razón.
- Smoke tests jamás se ejecutan contra cuenta admin de producción real, solo contra cuenta dedicada de smoke (`SMOKE_EMAIL`).

## Configuración requerida (env vars)

```
DEPLOY_HOST=deployer@178.156.182.177
DEPLOY_API_PATH=/home/deployer/smartkubik/api/dist
DEPLOY_ADMIN_PATH=/home/deployer/smartkubik/food-inventory-admin/dist
PROD_API_URL=https://api.smartkubik.com
PROD_APP_URL=https://app.smartkubik.com
SMOKE_EMAIL=smoke-test@smartkubik.com
SMOKE_PASSWORD=<vault>
SMOKE_TENANT_SLUG=earlyadopter
```

(Estos van en `.env.deploy` gitignored, NO en `.env` general.)

## Verificación

```bash
# Tras un deploy exitoso
curl https://api.smartkubik.com/api/v1/health
curl -I https://app.smartkubik.com
ssh deployer@178.156.182.177 "pm2 list"
```
