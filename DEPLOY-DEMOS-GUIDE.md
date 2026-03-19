# SmartKubik Demo Pages — Deployment Guide

## Quick Reference

| Demo | Subdominio | Backend Port | Frontend Port | DB | Estado |
|------|-----------|-------------|--------------|-----|--------|
| Hotel | hotel.smartkubik.com | 5010 | 5011 | MongoDB Atlas | ✅ Deployed |
| Inmobiliaria | inmobiliaria.smartkubik.com | 5001 | 5002 | MongoDB Atlas | ✅ Deployed |
| Restaurante | restaurante.smartkubik.com | 5012 | 5013 | **PostgreSQL** | ⏳ Needs PG DB |
| Autopartes | autopartes.smartkubik.com | 5014 | 5015 | MongoDB Atlas | ⏳ Ready |
| Clínica | clinica.smartkubik.com | 5016 | 5017 | MongoDB Atlas | ⏳ Ready |
| Retail Ropa | ropa.smartkubik.com | 5018 | 5019 | TBD | ❌ Not created |

**Server:** `deployer@178.156.182.177`
**MongoDB Atlas Cluster:** `cluster0.2qhm0wl.mongodb.net` (user: `jualfel30_db_user`)
**DNS:** Wildcard `*.smartkubik.com` → Cloudflare proxy → VPS

---

## How to Deploy a Demo

### Prerequisites per project
Each project needs 3 files in its root:
- `.deploy.env` — deploy configuration (subdomain, ports, commands)
- `backend/.env.production` — production backend environment
- `frontend/.env.production` — production frontend environment

All 3 files are already created for: Autopartes, Clínica, Restaurante.

### Step 1: Deploy

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO

# Autopartes (MongoDB — ready to go)
./deploy-demo-fullstack.sh /Users/jualfelsantamaria/Documents/Autopartes

# Clínica (MongoDB — ready to go)
./deploy-demo-fullstack.sh "/Users/jualfelsantamaria/Documents/Página de clínica"

# Restaurante (⚠️ needs PostgreSQL DB first — see section below)
./deploy-demo-fullstack.sh /Users/jualfelsantamaria/Documents/Restaurante
```

### Step 2: Enable Nginx

```bash
ssh deployer@178.156.182.177
sudo cp ~/smartkubik/nginx-configs/demos/SUBDOMAIN.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/SUBDOMAIN.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 3: Seed data (optional)

```bash
./deploy-demo-fullstack.sh /path/to/project --seed
# or manually:
ssh deployer@178.156.182.177 "cd ~/smartkubik/demos/SUBDOMAIN/backend && SEED_CMD"
```

### Deploy with flags

```bash
# Skip rebuild (reuse existing dist/.next)
./deploy-demo-fullstack.sh /path/to/project --skip-build

# Skip nginx config generation
./deploy-demo-fullstack.sh /path/to/project --skip-nginx

# Run seed after deploy
./deploy-demo-fullstack.sh /path/to/project --seed

# Combine flags
./deploy-demo-fullstack.sh /path/to/project --skip-build --seed
```

---

## Project-Specific Notes

### Autopartes (TorqueParts)
- **Stack:** Next.js + Express + MongoDB
- **Entry:** `node dist/app.js`
- **Seed:** `node dist/seed/seed.js`
- **Ready:** Yes, just run the deploy command

### Clínica
- **Stack:** Next.js + NestJS + MongoDB
- **Entry:** `node dist/main` (NestJS)
- **Build:** `nest build` (via `npm run build`)
- **Seed:** Built into the NestJS app (runs on startup or via endpoint)
- **Ready:** Yes, just run the deploy command

### Restaurante
- **Stack:** Next.js + Express + **PostgreSQL**
- **Entry:** `node dist/index.js`
- **Seed:** `node dist/db/seed.js`
- **⚠️ Blocker:** PostgreSQL is NOT installed on the VPS
- **Solution:** Create a free PostgreSQL database on one of:
  - [Neon](https://neon.tech) — 0.5 GB free
  - [Supabase](https://supabase.com) — 500 MB free
  - [ElephantSQL](https://www.elephantsql.com) — 20 MB free (tiny)
- **After creating the DB:** Update `DATABASE_URL` in `Restaurante/backend/.env.production`

### Hotel (already deployed)
- **Stack:** Next.js + Express + MongoDB
- **Custom script:** `deploy-hotel.sh` in the Hotel directory
- **Ports:** 5010 (API), 5011 (frontend)

### Inmobiliaria (already deployed)
- **Stack:** Next.js + NestJS + MongoDB
- **PM2 names:** `backend-pagina-inmobiliaria`, `frontend-pagina-inmobiliaria`

---

## .deploy.env Format

```bash
# Required
DEMO_SUBDOMAIN=myapp          # subdomain.smartkubik.com
BACKEND_PORT=5014              # Express/NestJS port
FRONTEND_PORT=5015             # Next.js port
BACKEND_START_CMD="node dist/index.js"  # PM2 start command
BACKEND_BUILD_CMD="npm run build"

# Optional
FRONTEND_DIR=frontend          # default: frontend
BACKEND_DIR=backend            # default: backend
FRONTEND_BUILD_CMD="npm run build"  # default: npm run build
SEED_CMD="node dist/seed.js"  # run with --seed flag
```

---

## Port Allocation Map

```
Port Range    Service
──────────────────────────────────
3000          SmartKubik API (NestJS)
3001          SmartKubik Storefront (Next.js)
3032          SmartKubik Blog
5001-5002     Demo: Inmobiliaria
5010-5011     Demo: Hotel
5012-5013     Demo: Restaurante
5014-5015     Demo: Autopartes
5016-5017     Demo: Clínica
5018-5019     Demo: Retail Ropa (future)
5020+         Available for new demos
```

---

## Troubleshooting

```bash
# Check all demo PM2 processes
ssh deployer@178.156.182.177 "pm2 list | grep demo-"

# View logs for a specific demo
ssh deployer@178.156.182.177 "pm2 logs demo-autopartes-api --lines 50"

# Restart a demo
ssh deployer@178.156.182.177 "pm2 restart demo-autopartes-api demo-autopartes-frontend"

# Check Nginx config
ssh deployer@178.156.182.177 "sudo nginx -t"

# Test from server
ssh deployer@178.156.182.177 "curl -s http://localhost:5014/api | head -50"
```

---

## Claude Prompt for New Demos

Use this prompt when starting a new Claude session to deploy a demo:

```
Necesito hacer deploy de la demo de [NOMBRE] como subdominio de smartkubik.com.

El proyecto está en: /Users/jualfelsantamaria/Documents/[DIRECTORIO]
El script genérico está en: /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO/deploy-demo-fullstack.sh

El proyecto ya tiene:
- .deploy.env (config de deploy)
- backend/.env.production (env de producción)
- frontend/.env.production (env de producción)

Pasos:
1. Revisa los archivos de config por si necesitan ajustes
2. Ejecuta: ./deploy-demo-fullstack.sh /path/to/project
3. Habilita Nginx en el servidor
4. Si tiene seed, ejecútalo
5. Verifica que funcione en https://SUBDOMAIN.smartkubik.com

Server: deployer@178.156.182.177
MongoDB Atlas: cluster0.2qhm0wl.mongodb.net (user: jualfel30_db_user, pass: CwtX4zlKi68AwGyx)
```
