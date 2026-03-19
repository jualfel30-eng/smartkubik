# 🚀 SmartKubik Fullstack Deploy Guide

Complete automated deployment system for fullstack applications (NestJS Backend + Next.js Frontend) to smartkubik.com subdomains.

---

## 📋 Quick Overview

| Component | Tech | Port | Role |
|-----------|------|------|------|
| **Frontend** | Next.js 14+ | Dynamic (3000, 3010, etc.) | UI, pages, SSR |
| **Backend** | NestJS | Dynamic (3001, 3011, etc.) | API, business logic |
| **Server** | Ubuntu 20.04+ | 178.156.182.177 | Production environment |
| **Routing** | Nginx | 443 SSL | Unified domain, /api/* → backend, /* → frontend |
| **Process Manager** | PM2 | - | Keeps both apps running 24/7 |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│ User Browser                                    │
│ https://pagina-inmobiliaria.smartkubik.com     │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────┐
│ Nginx Reverse Proxy (Port 443 SSL)              │
│                                                 │
│ /api/* → localhost:3001 (Backend NestJS)       │
│ /*     → localhost:3000 (Frontend Next.js)      │
└──────────────────┬──────────────────────────────┘
        │                          │
        ▼                          ▼
   localhost:3001            localhost:3000
   Backend NestJS            Frontend Next.js
   (PM2 Process)             (PM2 Process)
   dist/ + node_modules/     .next/ + node_modules/
```

### Why This Architecture?

✅ **Single domain** — Clients see only one URL
✅ **No CORS issues** — Backend and frontend on same origin
✅ **Cookie handling** — Authentication cookies work seamlessly
✅ **Scalable** — Easy to move backend to different server later
✅ **Professional** — Ports hidden from users, looks production-ready
✅ **Easy updates** — One deploy command for both apps

---

## 📁 Project Structure

Your local project must have this structure:

```
/Users/jualfelsantamaria/Documents/pagina-inmobiliaria/
├── backend/                          ← NestJS app
│   ├── src/
│   ├── dist/                         ← Build output
│   ├── package.json
│   ├── package-lock.json
│   ├── .env                          ← Backend env vars
│   └── [NestJS files]
│
└── frontend/                         ← Next.js app
    ├── src/
    ├── .next/                        ← Build output
    ├── public/
    ├── package.json
    ├── package-lock.json
    ├── next.config.ts
    ├── .env.local                    ← Frontend env vars
    └── [Next.js files]
```

**Critical:** Both `backend/` and `frontend/` directories MUST exist at the root level.

---

## 🎯 Step-by-Step Deployment

### Step 1: Prepare Your Local Project

Make sure both apps are ready:

```bash
# Backend should:
# - Have npm scripts: "build" and "start:prod"
# - Have a .env file with production variables
# - Not require any interactive input

# Frontend should:
# - Have npm scripts: "build" and "start"
# - Have a .env.local file (optional, for API_URL if needed)
# - Be fully built and testable locally
```

### Step 2: Run the Deploy Script

From the scripts directory:

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO

./deploy-fullstack-page.sh \
  /Users/jualfelsantamaria/Documents/pagina-inmobiliaria \
  pagina-inmobiliaria \
  3000 \
  3001
```

**Arguments:**
1. **Project Directory** — Absolute path to your project (with backend/ and frontend/)
2. **Subdomain** — What goes before .smartkubik.com (no dots, hyphens OK)
3. **Frontend Port** — Usually 3000 (must be different from backend)
4. **Backend Port** — Usually 3001 (must be different from frontend)

**What the script does:**
- ✅ Validates project structure
- ✅ Installs dependencies (if needed)
- ✅ Builds backend (NestJS compile TypeScript → dist/)
- ✅ Builds frontend (Next.js create optimized .next/)
- ✅ Uploads both to server via rsync
- ✅ Installs production dependencies on server
- ✅ Starts 2 PM2 processes
- ✅ Generates Nginx config
- ✅ Outputs next steps

**Expected output:**
```
🚀 SmartKubik Fullstack Deploy
Project: pagina-inmobiliaria
Subdomain: pagina-inmobiliaria.smartkubik.com
Frontend Port: 3000
Backend Port: 3001

📦 Building Backend (NestJS)...
✅ Backend built successfully

🎨 Building Frontend (Next.js)...
✅ Frontend built successfully

📤 Uploading Backend...
✅ Backend uploaded

📤 Uploading Frontend...
✅ Frontend uploaded

[... installation and PM2 setup ...]

🎉 FULLSTACK DEPLOYMENT SUCCESSFUL!

📊 Deployment Info:
  Remote Path: ~/smartkubik/pages/pagina-inmobiliaria
  Backend: backend-pagina-inmobiliaria (port 3001)
  Frontend: frontend-pagina-inmobiliaria (port 3000)

Public URL: https://pagina-inmobiliaria.smartkubik.com (requires nginx setup)

⚠️  NEXT STEPS - Enable Nginx:
Or use: ./enable-fullstack-nginx.sh pagina-inmobiliaria
```

### Step 3: Enable Nginx (Final Step)

```bash
./enable-fullstack-nginx.sh pagina-inmobiliaria
```

This:
- ✅ Copies Nginx config to sites-available
- ✅ Creates symlink in sites-enabled
- ✅ Tests Nginx configuration
- ✅ Reloads Nginx
- ✅ Verifies SSL certificate
- ✅ Your app is now LIVE

**Expected output:**
```
🌐 Enabling Nginx for Fullstack: pagina-inmobiliaria

🔍 Checking if nginx config exists...
✅ Config found

📋 Copying config to sites-available...
✅ Config copied

🔗 Creating symlink in sites-enabled...
✅ Symlink created

🧪 Testing nginx configuration...
✅ Nginx configuration is valid

♻️  Reloading nginx...
✅ Nginx reloaded successfully

✅ Site is live and accessible via HTTPS!

🌐 Your fullstack app is now live at:
  https://pagina-inmobiliaria.smartkubik.com
```

### Done! 🎉

Your app is now live at: **https://pagina-inmobiliaria.smartkubik.com**

---

## 📊 Server Directory Structure

After deployment, the server will have:

```
/home/deployer/smartkubik/pages/
└── pagina-inmobiliaria/
    ├── backend/
    │   ├── dist/                      ← Compiled NestJS
    │   ├── src/                       ← Source (for reference)
    │   ├── node_modules/              ← Production dependencies
    │   ├── package.json
    │   └── .env
    │
    ├── frontend/
    │   ├── .next/                     ← Compiled Next.js
    │   ├── public/                    ← Static assets
    │   ├── node_modules/              ← Production dependencies
    │   ├── package.json
    │   └── .env.local
    │
    └── [Nginx config in ~/smartkubik/nginx-configs/pages/pagina-inmobiliaria.conf]

PM2 Processes:
├── backend-pagina-inmobiliaria      (port 3001)
└── frontend-pagina-inmobiliaria     (port 3000)
```

---

## 🔄 Redeployment (Updates)

To update your app with new code:

```bash
# Make changes locally
git push origin main

# From deployment scripts directory:
./deploy-fullstack-page.sh \
  /Users/jualfelsantamaria/Documents/pagina-inmobiliaria \
  pagina-inmobiliaria \
  3000 \
  3001
```

The script will:
- ✅ Rebuild only changed files
- ✅ Upload new dist/ and .next/
- ✅ Reload PM2 processes (zero downtime)
- ✅ Keep both apps running

No need to run `enable-fullstack-nginx.sh` again (Nginx config doesn't change).

---

## 📚 Multiple Clients Example

Deploy the same code to different domains/ports:

```bash
# Client 1: Clínica Estética Lujo
./deploy-fullstack-page.sh \
  /Users/jualfelsantamaria/Documents/clinica-estetica \
  clinica-lujo \
  3000 \
  3001

./enable-fullstack-nginx.sh clinica-lujo
# Live at: https://clinica-lujo.smartkubik.com

# Client 2: Agencia Inmobiliaria
./deploy-fullstack-page.sh \
  /Users/jualfelsantamaria/Documents/pagina-inmobiliaria \
  pagina-inmobiliaria \
  3010 \
  3011

./enable-fullstack-nginx.sh pagina-inmobiliaria
# Live at: https://pagina-inmobiliaria.smartkubik.com

# Client 3: Boutique Hogar
./deploy-fullstack-page.sh \
  /Users/jualfelsantamaria/Documents/boutique-hogar \
  boutique-hogar \
  3020 \
  3021

./enable-fullstack-nginx.sh boutique-hogar
# Live at: https://boutique-hogar.smartkubik.com
```

Each client:
- ✅ Has separate ports (no conflicts)
- ✅ Has separate subdomain
- ✅ Has separate PM2 processes
- ✅ Has separate Nginx config
- ✅ Is completely isolated

---

## 🔧 Important Environment Variables

### Backend (.env)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=mongodb://...
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
CORS_ORIGIN=https://pagina-inmobiliaria.smartkubik.com
FRONTEND_URL=https://pagina-inmobiliaria.smartkubik.com
```

**Important:** `CORS_ORIGIN` must match your domain for CORS to work correctly.

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://pagina-inmobiliaria.smartkubik.com/api
NEXT_PUBLIC_APP_URL=https://pagina-inmobiliaria.smartkubik.com
NODE_ENV=production
```

**Important:** Use relative paths or absolute URLs to your domain.

---

## 🐛 Troubleshooting

### Issue: "502 Bad Gateway"

**Cause:** Backend or frontend not running.

**Fix:**
```bash
ssh deployer@178.156.182.177
pm2 list                                    # Check processes
pm2 logs backend-pagina-inmobiliaria       # View backend logs
pm2 logs frontend-pagina-inmobiliaria      # View frontend logs
pm2 restart backend-pagina-inmobiliaria    # Restart if needed
```

### Issue: "Cannot GET /api/..."

**Cause:** Nginx routing issue or backend not responding.

**Fix:**
```bash
# Test backend directly
curl http://localhost:3001/api/health

# Check Nginx config
sudo nginx -t

# View Nginx logs
sudo tail -50 /var/log/nginx/fullstack-pagina-inmobiliaria-error.log
```

### Issue: Frontend loads but API calls fail

**Cause:** CORS or API_URL misconfiguration.

**Fix:**
1. Check frontend `.env.local` has correct `NEXT_PUBLIC_API_URL`
2. Check backend `.env` has correct `CORS_ORIGIN` matching your domain
3. Restart both: `pm2 restart all`

### Issue: "Port already in use"

**Cause:** Another app using the same port.

**Fix:**
```bash
# Check what's using the port
lsof -i :3000   # or 3001, etc.

# Use different ports in the next deploy
./deploy-fullstack-page.sh /path project-name 3030 3031
```

### Issue: SSL certificate not working

**Cause:** Wildcard cert might not be configured.

**Fix:**
```bash
# Check cert
sudo ls -la /etc/letsencrypt/live/smartkubik.com/

# Should show:
# fullchain.pem
# privkey.pem
```

---

## 📋 Quick Reference Commands

```bash
# Deploy fullstack app
./deploy-fullstack-page.sh /path/to/project subdomain frontend-port backend-port

# Enable Nginx for subdomain
./enable-fullstack-nginx.sh subdomain

# SSH to server
ssh deployer@178.156.182.177

# Check PM2 processes
pm2 list

# View logs
pm2 logs [process-name]

# Restart a process
pm2 restart backend-subdomain
pm2 restart frontend-subdomain

# Stop a process
pm2 stop backend-subdomain

# Delete a process
pm2 delete backend-subdomain

# Save PM2 state
pm2 save

# View Nginx error log
sudo tail -100 /var/log/nginx/fullstack-subdomain-error.log

# Test Nginx
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check DNS
nslookup subdomain.smartkubik.com
```

---

## ✅ Deployment Checklist

Before deploying, ensure:

- [ ] Backend has `/api/health` endpoint (or adjust health check)
- [ ] Backend has `npm run build` script
- [ ] Backend has `npm run start:prod` script
- [ ] Backend .env file exists with correct variables
- [ ] Frontend has `npm run build` script
- [ ] Frontend has `npm run start` script
- [ ] Frontend .env.local has correct API_URL
- [ ] Both apps tested locally and work correctly
- [ ] No hardcoded localhost references in frontend
- [ ] Backend CORS configured for production domain
- [ ] SSH key configured for deployer user (usually already done)

---

## 🎯 Port Assignment Convention

To avoid conflicts when deploying multiple clients:

| Client | Frontend | Backend | Subdomain |
|--------|----------|---------|-----------|
| Project 1 | 3000 | 3001 | project-1 |
| Project 2 | 3010 | 3011 | project-2 |
| Project 3 | 3020 | 3021 | project-3 |
| Project 4 | 3030 | 3031 | project-4 |
| Project 5 | 3040 | 3041 | project-5 |

Follow this pattern to never have port conflicts.

---

## 🚨 Important Notes

1. **Backend .env** — Do NOT commit to git. Must be in `.gitignore`. Upload manually or via script.

2. **Frontend .env.local** — Optional. May be committed or excluded. Check your project setup.

3. **Ports** — Must be consecutive pairs (3000+3001, 3010+3011, etc.) and unique per client.

4. **Domains** — Subdomain must be unique. Once used, don't reuse without removing old config.

5. **SSL** — Wildcard certificate *.smartkubik.com already exists on server. All subdomains work automatically.

6. **Nginx reload** — Zero downtime. PM2 keeps apps running during reload.

7. **Logs** — Always check PM2 logs if something fails: `pm2 logs process-name`

---

## 📞 Support

If deployment fails:

1. Check the script output for specific error
2. SSH to server and check logs: `pm2 logs`
3. Verify project structure matches requirements
4. Ensure both apps work locally first

---

**Created:** 2026-03-03
**Version:** 1.0 (SmartKubik Fullstack Deploy System)
**Server:** 178.156.182.177
**Domain:** *.smartkubik.com (wildcard SSL)
