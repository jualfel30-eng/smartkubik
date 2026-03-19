# 📚 Fullstack Deploy System - Complete Index

Welcome! You now have a complete automated deployment system for fullstack applications.

---

## 🎯 Quick Navigation

### 🚀 **I want to deploy NOW**
→ Go to: [FULLSTACK_QUICK_START.md](./FULLSTACK_QUICK_START.md)
- 2-minute quick start guide
- Just 2 commands to deploy

### 📚 **I want to understand everything**
→ Go to: [FULLSTACK_DEPLOY_GUIDE.md](./FULLSTACK_DEPLOY_GUIDE.md)
- Complete architecture explained
- Step-by-step walkthrough
- Multiple examples
- Troubleshooting section
- All commands reference

### ✅ **I want to verify my project is ready**
→ Go to: [FULLSTACK_PREDEPLOY_CHECKLIST.md](./FULLSTACK_PREDEPLOY_CHECKLIST.md)
- Backend checklist
- Frontend checklist
- Integration checklist
- Deployment info checklist

---

## 📦 What You Have

### Scripts (in this directory)

| Script | Purpose | When to use |
|--------|---------|------------|
| `deploy-fullstack-page.sh` | Deploy backend + frontend | Every time you update your app |
| `enable-fullstack-nginx.sh` | Activate Nginx for subdomain | Once per subdomain |

### Documentation (in this directory)

| File | Purpose |
|------|---------|
| `FULLSTACK_QUICK_START.md` | 2-minute deployment guide |
| `FULLSTACK_DEPLOY_GUIDE.md` | Complete comprehensive guide |
| `FULLSTACK_PREDEPLOY_CHECKLIST.md` | Pre-deployment verification |
| `FULLSTACK_DEPLOY_INDEX.md` | This file (navigation hub) |

---

## 🏗️ Architecture Overview

```
Your Local Machine
    ↓ (git push / file changes)
    ↓
Two Commands:
    1. ./deploy-fullstack-page.sh       (build & upload)
    2. ./enable-fullstack-nginx.sh      (activate)
    ↓
Production Server (178.156.182.177)
    ├── Backend NestJS (port 3001)
    ├── Frontend Next.js (port 3000)
    └── Nginx (unifies both on one domain)
    ↓
User accesses: https://pagina-inmobiliaria.smartkubik.com
    ├── / → Frontend
    └── /api/* → Backend
```

---

## 🚀 Typical Workflow

### First-Time Setup

1. **Prepare your project**
   - Ensure backend/ and frontend/ directories exist
   - Check all npm scripts work locally
   - Create `.env` files with production variables

2. **Deploy**
   ```bash
   ./deploy-fullstack-page.sh /path project 3000 3001
   ```

3. **Activate**
   ```bash
   ./enable-fullstack-nginx.sh project
   ```

4. **Verify**
   ```bash
   Open: https://project.smartkubik.com
   ```

### Updates (Redeployment)

1. **Make changes locally**
   - Update backend or frontend code
   - Test locally
   - Commit to git

2. **Deploy again** (same command as before)
   ```bash
   ./deploy-fullstack-page.sh /path project 3000 3001
   ```

3. **Done** ✅
   - No need to run nginx script again
   - Zero downtime, apps reload automatically

---

## 📋 File Structure Expected

Your project needs this structure:

```
/Users/jualfelsantamaria/Documents/your-project/
├── backend/              ← NestJS app
│   ├── src/
│   ├── dist/             ← Created by: npm run build
│   ├── package.json
│   ├── .env              ← MUST exist with production vars
│   └── scripts:
│       ├── build
│       └── start:prod
│
└── frontend/             ← Next.js app
    ├── src/
    ├── .next/            ← Created by: npm run build
    ├── public/
    ├── package.json
    ├── .env.local        ← Optional, for API_URL etc
    └── scripts:
        ├── build
        └── start
```

---

## 🎯 Example: Deploy Your First Project

### Project Details
- **Project**: Página Inmobiliaria
- **Location**: `/Users/jualfelsantamaria/Documents/Página inmobiliaria`
- **Subdomain**: `pagina-inmobiliaria`
- **Frontend Port**: 3000
- **Backend Port**: 3001

### Step 1: Prepare
```bash
# Navigate to your project
cd /Users/jualfelsantamaria/Documents/Página\ inmobiliaria

# Verify structure
ls -la
# Should show: backend/, frontend/

# Verify backend is ready
cd backend
npm run build          # Test build
npm run start:prod     # Test start (Ctrl+C to stop)

# Verify frontend is ready
cd ../frontend
npm run build          # Test build
npm run start          # Test start (Ctrl+C to stop)

cd ../..
```

### Step 2: Deploy
```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO

./deploy-fullstack-page.sh \
  /Users/jualfelsantamaria/Documents/Página\ inmobiliaria \
  pagina-inmobiliaria \
  3000 \
  3001
```

Watch the output until you see: `🎉 FULLSTACK DEPLOYMENT SUCCESSFUL!`

### Step 3: Activate Nginx
```bash
./enable-fullstack-nginx.sh pagina-inmobiliaria
```

Watch the output until you see: `🌐 Your fullstack app is now live at:`

### Step 4: Visit Your Site
```
https://pagina-inmobiliaria.smartkubik.com
```

---

## 🔧 Key Decisions & Why

| Decision | Chosen | Why |
|----------|--------|-----|
| **Unified Domain** | Yes | Single URL, no CORS issues, professional |
| **Ports Hidden** | Yes | Behind Nginx, users don't see them |
| **PM2 Management** | 2 processes | Backend & frontend run independently |
| **SSL/HTTPS** | Automatic | Wildcard cert covers all subdomains |
| **Reverse Proxy** | Nginx | `/api/*` → backend, `/*` → frontend |

---

## 📊 Server Information

| Component | Value |
|-----------|-------|
| **Server IP** | 178.156.182.177 |
| **Server User** | deployer |
| **Domain** | *.smartkubik.com |
| **SSL Certificate** | Wildcard (all subdomains) |
| **Process Manager** | PM2 |
| **Web Server** | Nginx |
| **App Location** | /home/deployer/smartkubik/pages/ |
| **Config Location** | /home/deployer/smartkubik/nginx-configs/pages/ |

---

## 🚨 Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| **502 Bad Gateway** | `ssh deployer@178.156.182.177` then `pm2 logs` |
| **Port already in use** | Use different ports (3010/3011, 3020/3021, etc.) |
| **Cannot find config** | Run `deploy-fullstack-page.sh` before `enable-fullstack-nginx.sh` |
| **API calls fail** | Check `CORS_ORIGIN` in backend `.env` |
| **Frontend shows old version** | Clear browser cache, then refresh |

---

## 📞 Support & References

### Documentation
- **Quick Start**: [FULLSTACK_QUICK_START.md](./FULLSTACK_QUICK_START.md)
- **Full Guide**: [FULLSTACK_DEPLOY_GUIDE.md](./FULLSTACK_DEPLOY_GUIDE.md)
- **Checklist**: [FULLSTACK_PREDEPLOY_CHECKLIST.md](./FULLSTACK_PREDEPLOY_CHECKLIST.md)

### Quick Commands
```bash
# SSH to server
ssh deployer@178.156.182.177

# Monitor processes
pm2 list

# View logs
pm2 logs [process-name]

# Restart
pm2 restart [process-name]

# Check Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Troubleshooting
See "Troubleshooting" section in [FULLSTACK_DEPLOY_GUIDE.md](./FULLSTACK_DEPLOY_GUIDE.md)

---

## ✅ Deployment Checklist

Before deploying each project:

- [ ] Read: [FULLSTACK_PREDEPLOY_CHECKLIST.md](./FULLSTACK_PREDEPLOY_CHECKLIST.md)
- [ ] Complete all checks
- [ ] Run deploy script
- [ ] Run enable-nginx script
- [ ] Test your live site

---

## 🎯 Next Steps

### If you're deploying "Página Inmobiliaria" now:
1. Read: [FULLSTACK_QUICK_START.md](./FULLSTACK_QUICK_START.md)
2. Use the example in this file
3. Deploy in 2 commands
4. Check: https://pagina-inmobiliaria.smartkubik.com

### If you're deploying other clients:
1. Follow the same pattern
2. Use different subdomains
3. Use different ports (3000/3001, 3010/3011, 3020/3021, etc.)
4. Each project is completely isolated

### If something goes wrong:
1. Check logs: `pm2 logs`
2. Read troubleshooting: [FULLSTACK_DEPLOY_GUIDE.md](./FULLSTACK_DEPLOY_GUIDE.md)
3. Verify project structure matches requirements

---

## 📈 What You Can Now Do

✅ Deploy unlimited fullstack applications
✅ Use the same domain (smartkubik.com) for all projects
✅ Each project gets its own subdomain
✅ Each project runs independently
✅ Update any project without affecting others
✅ Automated SSL/HTTPS for all
✅ Zero-downtime deployments
✅ Complete process monitoring with PM2

---

## 🎉 You're All Set!

You now have a production-grade deployment system for:
- NestJS backends
- Next.js frontends
- Unified domain routing
- Multiple client projects
- Automated SSL/TLS

**Start with**: [FULLSTACK_QUICK_START.md](./FULLSTACK_QUICK_START.md)

---

**System Version:** 1.0
**Created:** 2026-03-03
**Status:** Production Ready
