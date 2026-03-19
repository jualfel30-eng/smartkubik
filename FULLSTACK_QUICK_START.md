# ⚡ Fullstack Deploy - Quick Start (2 Minutes)

## 📝 Prerequisites (Do Once)

Your project needs this structure:

```
/your-project/
├── backend/          ← NestJS
│   ├── src/
│   ├── package.json
│   ├── .env          ← CRITICAL: Must exist
│   └── npm scripts: "build" + "start:prod"
│
└── frontend/         ← Next.js
    ├── src/
    ├── package.json
    ├── next.config.ts
    └── npm scripts: "build" + "start"
```

Check backend has these npm scripts:
```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main"
  }
}
```

Check frontend has these npm scripts:
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

---

## 🚀 Deploy in 2 Commands

### Command 1: Deploy (5-10 min depending on size)

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO

./deploy-fullstack-page.sh \
  /path/to/your/project \
  subdomain-name \
  3000 \
  3001
```

**Example:**
```bash
./deploy-fullstack-page.sh \
  /Users/jualfelsantamaria/Documents/pagina-inmobiliaria \
  pagina-inmobiliaria \
  3000 \
  3001
```

Wait for it to finish. You'll see:
```
🎉 FULLSTACK DEPLOYMENT SUCCESSFUL!
⚠️  NEXT STEPS - Enable Nginx:
Or use: ./enable-fullstack-nginx.sh pagina-inmobiliaria
```

### Command 2: Enable Nginx (30 seconds)

```bash
./enable-fullstack-nginx.sh pagina-inmobiliaria
```

Wait for:
```
✅ Site is live and accessible via HTTPS!
🌐 Your fullstack app is now live at:
  https://pagina-inmobiliaria.smartkubik.com
```

---

## ✅ That's it!

Your app is live at: **https://pagina-inmobiliaria.smartkubik.com**

- Frontend at `/` (homepage, pages, etc.)
- Backend at `/api/*` (API endpoints)
- Both on same domain (no CORS issues)

---

## 🔄 Update Your App

Make changes locally, then:

```bash
./deploy-fullstack-page.sh \
  /path/to/your/project \
  subdomain-name \
  3000 \
  3001
```

No need to run nginx script again. App updates automatically.

---

## 📊 Monitor Your App

```bash
# Check both processes are running
ssh deployer@178.156.182.177
pm2 list

# See logs
pm2 logs backend-pagina-inmobiliaria
pm2 logs frontend-pagina-inmobiliaria

# Restart if needed
pm2 restart backend-pagina-inmobiliaria
pm2 restart frontend-pagina-inmobiliaria
```

---

## 🚨 If Something Goes Wrong

1. **502 Bad Gateway** → Check `pm2 logs` to see what failed
2. **Cannot GET /api/...** → Backend crashed, check logs
3. **Frontend loads but API fails** → Check `.env` files have correct variables
4. **Port in use** → Use different ports in deploy command

---

## 📚 Need More Help?

- Full guide: [FULLSTACK_DEPLOY_GUIDE.md](./FULLSTACK_DEPLOY_GUIDE.md)
- Troubleshooting section covers common issues
- Server IP: 178.156.182.177
- Domain: *.smartkubik.com

---

**That's it! You're ready to deploy multiple client projects.** 🎉
