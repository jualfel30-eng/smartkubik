# ✅ Fullstack Pre-Deploy Checklist

Use this checklist before deploying any fullstack application.

---

## 🏗️ Project Structure

- [ ] Project has `/backend` directory
- [ ] Project has `/frontend` directory
- [ ] No other directories at root level will affect build
- [ ] Backend has `package.json`
- [ ] Frontend has `package.json`

---

## 📦 Backend (NestJS)

### npm scripts
- [ ] Backend has `npm run build` script
- [ ] Backend has `npm run start:prod` script
- [ ] Test locally: `npm run build` works without errors
- [ ] Test locally: `npm run start:prod` starts without errors

### Environment Variables
- [ ] Backend has `.env` file (or will be uploaded separately)
- [ ] `.env` file has all required variables
- [ ] `.env` file is in `.gitignore` (not committed)
- [ ] Check sample variables:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT` value (will be overridden by deploy script, but good to have)
  - [ ] Database connection strings
  - [ ] API keys / secrets
  - [ ] `CORS_ORIGIN=https://YOUR-SUBDOMAIN.smartkubik.com` (CRITICAL)
  - [ ] `JWT_SECRET` (random, secure value)

### API Health
- [ ] Backend has health check endpoint
  - [ ] `GET /health` (preferred)
  - [ ] OR `GET /api/health`
  - [ ] Returns HTTP 200

### Dependencies
- [ ] No global npm packages assumed
- [ ] All dependencies in `package.json` or `package-lock.json`
- [ ] Test locally: `npm ci` installs without errors

### Build Output
- [ ] `npm run build` creates `dist/` folder
- [ ] `dist/main.js` or equivalent entry point exists
- [ ] No TypeScript errors on build

---

## 🎨 Frontend (Next.js)

### npm scripts
- [ ] Frontend has `npm run build` script
- [ ] Frontend has `npm run start` script
- [ ] Test locally: `npm run build` works without errors
- [ ] Test locally: `npm run start` starts without errors

### Environment Variables
- [ ] Frontend has `.env.local` file (or build without it)
- [ ] Check sample variables:
  - [ ] `NEXT_PUBLIC_API_URL=https://YOUR-SUBDOMAIN.smartkubik.com/api`
  - [ ] `NEXT_PUBLIC_APP_URL=https://YOUR-SUBDOMAIN.smartkubik.com`
  - [ ] `NODE_ENV=production`

### Configuration
- [ ] `next.config.ts` exists and is valid
- [ ] No hardcoded `localhost` in code
- [ ] No hardcoded port numbers (except in .env)
- [ ] Output is `standalone` or `export` (check your config)

### Dependencies
- [ ] All dependencies in `package.json` or `package-lock.json`
- [ ] Test locally: `npm ci` installs without errors

### Build Output
- [ ] `npm run build` creates `.next/` folder
- [ ] `.next/` folder is complete and valid
- [ ] No build warnings (check logs)

### Assets
- [ ] `public/` folder exists (even if empty)
- [ ] All images/fonts referenced in code are in `public/`
- [ ] No broken image references

---

## 🔗 Integration

### CORS
- [ ] Backend `CORS_ORIGIN` matches your subdomain
- [ ] Backend allows credentials: `credentials: true`
- [ ] Frontend API requests include `credentials: 'include'`

### API Endpoints
- [ ] Backend API endpoints use `/api/` prefix
- [ ] Frontend calls use correct API URL from `.env`
- [ ] No API calls to hardcoded `localhost`
- [ ] Test API calls locally before deploying

### Authentication
- [ ] JWT tokens work correctly
- [ ] Token expiration is set
- [ ] Refresh token mechanism exists (if needed)
- [ ] Logout clears tokens properly

---

## 🖥️ Local Testing

- [ ] Backend starts: `npm run build && npm run start:prod`
- [ ] Frontend starts: `npm run build && npm run start`
- [ ] Frontend loads on `http://localhost:3000`
- [ ] Backend API responds on `http://localhost:3001` (or your port)
- [ ] Frontend can call backend API
- [ ] No console errors in browser
- [ ] No errors in backend logs
- [ ] All main features work locally

---

## 📋 Deployment Information

Before running deploy script, gather:

- [ ] Full path to project directory
  ```
  /Users/jualfelsantamaria/Documents/pagina-inmobiliaria
  ```

- [ ] Subdomain name (no spaces, hyphens OK)
  ```
  pagina-inmobiliaria
  ```

- [ ] Frontend port number (usually 3000)
  ```
  3000
  ```

- [ ] Backend port number (usually 3001)
  ```
  3001
  ```

- [ ] Command ready to run:
  ```bash
  ./deploy-fullstack-page.sh \
    /Users/jualfelsantamaria/Documents/pagina-inmobiliaria \
    pagina-inmobiliaria \
    3000 \
    3001
  ```

---

## 🚀 Ready to Deploy?

Once all checks pass:

1. Run: `./deploy-fullstack-page.sh [args]`
2. Wait for "DEPLOYMENT SUCCESSFUL"
3. Run: `./enable-fullstack-nginx.sh [subdomain]`
4. Check: `https://YOUR-SUBDOMAIN.smartkubik.com`

---

## ❓ Questions Before Deploying?

Check:
1. [FULLSTACK_QUICK_START.md](./FULLSTACK_QUICK_START.md) — 2-minute overview
2. [FULLSTACK_DEPLOY_GUIDE.md](./FULLSTACK_DEPLOY_GUIDE.md) — Complete guide
3. Troubleshooting section in the guide

---

**Date:** 2026-03-03
**Version:** 1.0
**Status:** Ready to use
