# docs/archive/legacy-deploy/

Guías de deploy heredadas (octubre 2025) que fueron **reemplazadas** por el sistema actual `FULLSTACK_DEPLOY_*` (marzo 2026). Se conservan como referencia histórica de cómo evolucionó el proceso de deploy del proyecto.

## Cuándo consultar

- Querés entender por qué se diseñó así el deploy actual
- Estás haciendo arqueología de cambios de infraestructura
- Necesitás referencia de comandos viejos de Hetzner/SSL/subdomain setup

## Cuándo NO consultar

- Para deployar HOY → ver `FULLSTACK_DEPLOY_INDEX.md` en raíz del proyecto
- Para validaciones pre-deploy → `FULLSTACK_PREDEPLOY_CHECKLIST.md`
- Para SSL setup actual → `SSL-WILDCARD-GUIDE.md`

## Documentos archivados

| Archivo | Tema | Reemplazado por |
|---|---|---|
| `DEMO-PAGES-DEPLOYMENT.md` | Deploy de páginas demo | `QUICK-START-DEMOS.md` |
| `DEPLOY-DEMOS-GUIDE.md` | Guía de deploy demos | `QUICK-START-DEMOS.md` |
| `DEPLOYMENT-CHECKLIST.md` | Checklist pre-deploy viejo (oct 2025) | `FULLSTACK_PREDEPLOY_CHECKLIST.md` |
| `DEPLOYMENT-GUIDE-HETZNER.md` | Setup completo Hetzner (1004 L, oct 2025) | `FULLSTACK_DEPLOY_GUIDE.md` |
| `SAFE-DEPLOY-GUIDE.md` | Best practices de safe deploy | Absorbido en `FULLSTACK_DEPLOY_GUIDE.md` |
| `SUBDOMAIN-SETUP-GUIDE.md` | Setup de subdominios | Cubierto por `SSL-WILDCARD-GUIDE.md` + nginx-configs/ |
