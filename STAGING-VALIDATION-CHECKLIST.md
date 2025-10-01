# Staging Validation Checklist - v2.0.0 Security Release

**Date:** 2025-10-01
**Environment:** Staging
**Tester:** _____________
**Duration:** ~2 hours

---

## 📋 Pre-Deployment Checks

### Build & Dependencies

- [ ] **Build passes locally**
  ```bash
  npm run build
  # Expected: webpack compiled successfully
  ```

- [ ] **All tests pass**
  ```bash
  npm run test:security
  # Expected: 73 tests passing
  ```

- [ ] **No critical npm audit issues**
  ```bash
  npm audit --audit-level=high
  # Expected: 0 high/critical vulnerabilities
  ```

- [ ] **Environment variables configured**
  - [ ] MONGODB_URI
  - [ ] JWT_SECRET
  - [ ] JWT_REFRESH_SECRET
  - [ ] CORS_ORIGIN
  - [ ] PORT

---

## 🚀 Deployment Steps

### 1. Database Backup

- [ ] **Backup staging database**
  ```bash
  mongodump --uri="<staging-mongodb-uri>" --out=backup-staging-$(date +%Y%m%d)
  ```
  - Backup location: _______________
  - Backup size: _______________

### 2. Deploy Application

- [ ] **Pull latest code**
  ```bash
  git checkout staging/security-improvements
  git pull origin staging/security-improvements
  ```

- [ ] **Install dependencies**
  ```bash
  npm ci
  ```

- [ ] **Build application**
  ```bash
  npm run build
  ```

- [ ] **Restart service**
  ```bash
  pm2 restart food-inventory-saas-staging
  # OR
  npm run start:prod
  ```

### 3. Health Check

- [ ] **Application started successfully**
  ```bash
  curl http://staging.yourapp.com/api/v1/health
  # Expected: { "status": "ok" }
  ```

- [ ] **Database connection established**
  - Check logs for MongoDB connection success

- [ ] **No errors in startup logs**
  ```bash
  pm2 logs food-inventory-saas-staging --lines 50
  ```

---

## 🔒 Security Feature Validation

### Rate Limiting Tests

#### Test 1: Login Rate Limit

- [ ] **Attempt 6 failed logins**
  ```bash
  # Attempt 1-5: Should get 401 Unauthorized
  curl -X POST http://staging.yourapp.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'

  # Attempt 6: Should get 429 Too Many Requests
  ```
  - Result: [ PASS / FAIL ]
  - Status code on 6th attempt: _____

#### Test 2: Rate Limit Headers

- [ ] **Check rate limit headers present**
  ```bash
  curl -I http://staging.yourapp.com/api/v1/products
  # Expected headers:
  # x-ratelimit-limit: 500
  # x-ratelimit-remaining: 499
  # x-ratelimit-reset: <timestamp>
  ```
  - Result: [ PASS / FAIL ]

---

### XSS Sanitization Tests

#### Test 3: Script Tag Removal

- [ ] **Try creating product with XSS payload**
  ```bash
  curl -X POST http://staging.yourapp.com/api/v1/products \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "<script>alert(1)</script>Product Name",
      "sku": "TEST-001",
      "price": 10,
      "cost": 5,
      "category": "Test"
    }'
  ```
  - Expected: Name stored as "Product Name" (script removed)
  - Actual result: _____________________
  - Result: [ PASS / FAIL ]

#### Test 4: Event Handler Removal

- [ ] **Try creating customer with event handler**
  ```bash
  curl -X POST http://staging.yourapp.com/api/v1/customers \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "<img src=x onerror=alert(1)>John",
      "lastName": "Doe",
      "email": "test@example.com",
      "customerType": "individual"
    }'
  ```
  - Expected: Name stored as "John" (HTML removed)
  - Actual result: _____________________
  - Result: [ PASS / FAIL ]

---

### Cross-Tenant Isolation Tests

#### Test 5: Create Two Tenants

- [ ] **Register Tenant A**
  ```bash
  curl -X POST http://staging.yourapp.com/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "tenantA@test.com",
      "password": "Test1234!",
      "firstName": "Tenant",
      "lastName": "A",
      "businessName": "Restaurant A",
      "businessType": "restaurant"
    }'
  ```
  - Token A: _____________________

- [ ] **Register Tenant B**
  ```bash
  curl -X POST http://staging.yourapp.com/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "tenantB@test.com",
      "password": "Test1234!",
      "firstName": "Tenant",
      "lastName": "B",
      "businessName": "Restaurant B",
      "businessType": "restaurant"
    }'
  ```
  - Token B: _____________________

#### Test 6: Create Product as Tenant A

- [ ] **Tenant A creates product**
  ```bash
  curl -X POST http://staging.yourapp.com/api/v1/products \
    -H "Authorization: Bearer <token-A>" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Tenant A Product",
      "sku": "TESTA-001",
      "price": 100,
      "cost": 50,
      "category": "Food"
    }'
  ```
  - Product ID: _____________________

#### Test 7: Tenant B Cannot Delete Tenant A's Product

- [ ] **Tenant B tries to delete Tenant A's product**
  ```bash
  curl -X DELETE http://staging.yourapp.com/api/v1/products/<product-id-from-test-6> \
    -H "Authorization: Bearer <token-B>"
  ```
  - Expected: 404 Not Found
  - Actual status: _____
  - Result: [ PASS / FAIL ]

#### Test 8: Tenant B Cannot See Tenant A's Products

- [ ] **Tenant B lists products**
  ```bash
  curl http://staging.yourapp.com/api/v1/products \
    -H "Authorization: Bearer <token-B>"
  ```
  - Expected: Empty array or only Tenant B's products
  - Contains Tenant A product: [ YES / NO ]
  - Result: [ PASS / FAIL ]

---

### CSP Header Validation

#### Test 9: CSP Header Present

- [ ] **Check CSP header in response**
  ```bash
  curl -I http://staging.yourapp.com/api/v1/health
  # Expected: Content-Security-Policy header present
  ```
  - CSP header value: _____________________
  - Result: [ PASS / FAIL ]

#### Test 10: Script-src Restrictive

- [ ] **Verify script-src directive**
  - Expected: `script-src 'self'` (no unsafe-inline, no wildcards)
  - Actual: _____________________
  - Result: [ PASS / FAIL ]

#### Test 11: Frame-ancestors Blocks Embedding

- [ ] **Verify frame-ancestors directive**
  - Expected: `frame-ancestors 'none'`
  - Actual: _____________________
  - Result: [ PASS / FAIL ]

---

### Security Monitoring Tests

#### Test 12: Security Metrics Endpoint

- [ ] **Get security metrics**
  ```bash
  curl http://staging.yourapp.com/api/v1/security-monitoring/metrics \
    -H "Authorization: Bearer <token>"
  ```
  - Response includes last24Hours stats: [ YES / NO ]
  - Result: [ PASS / FAIL ]

#### Test 13: CSP Violation Reporting

- [ ] **Test CSP report endpoint (public)**
  ```bash
  curl -X POST http://staging.yourapp.com/api/v1/security-monitoring/csp-report \
    -H "Content-Type: application/json" \
    -d '{
      "blocked-uri": "https://evil.com/script.js",
      "violated-directive": "script-src",
      "document-uri": "http://staging.yourapp.com/"
    }'
  ```
  - Response: 200 OK
  - Result: [ PASS / FAIL ]

---

## ⚡ Performance Tests

### Response Time Benchmarks

#### Test 14: Product List Performance

- [ ] **Measure response time**
  ```bash
  time curl http://staging.yourapp.com/api/v1/products \
    -H "Authorization: Bearer <token>"
  ```
  - Response time: _____ ms
  - Expected: <200ms
  - Result: [ PASS / FAIL ]

#### Test 15: Customer List with Pagination

- [ ] **Verify pagination works**
  ```bash
  curl "http://staging.yourapp.com/api/v1/customers?page=1&limit=10" \
    -H "Authorization: Bearer <token>"
  ```
  - Returns max 10 items: [ YES / NO ]
  - Response time: _____ ms
  - Result: [ PASS / FAIL ]

#### Test 16: Database Index Usage

- [ ] **Check MongoDB query plan**
  - Use MongoDB Compass or mongosh
  - Run explain() on a products query
  - Indexes used: [ YES / NO ]
  - Result: [ PASS / FAIL ]

---

## 🧪 Functional Tests

### Authentication & Authorization

#### Test 17: JWT Authentication Works

- [ ] **Login with valid credentials**
  ```bash
  curl -X POST http://staging.yourapp.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "valid@user.com",
      "password": "correct-password"
    }'
  ```
  - Returns accessToken: [ YES / NO ]
  - Returns refreshToken: [ YES / NO ]
  - Result: [ PASS / FAIL ]

#### Test 18: Protected Endpoints Require Auth

- [ ] **Access product without token**
  ```bash
  curl http://staging.yourapp.com/api/v1/products
  # Expected: 401 Unauthorized
  ```
  - Status code: _____
  - Result: [ PASS / FAIL ]

### CRUD Operations

#### Test 19: Create Product

- [ ] **Create product successfully**
  ```bash
  curl -X POST http://staging.yourapp.com/api/v1/products \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Product",
      "sku": "TEST-PROD-001",
      "price": 50,
      "cost": 25,
      "category": "Test Category"
    }'
  ```
  - Product created: [ YES / NO ]
  - Product ID: _____________________
  - Result: [ PASS / FAIL ]

#### Test 20: Update Product

- [ ] **Update product successfully**
  ```bash
  curl -X PUT http://staging.yourapp.com/api/v1/products/<product-id> \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"name": "Updated Product Name"}'
  ```
  - Product updated: [ YES / NO ]
  - Result: [ PASS / FAIL ]

#### Test 21: Delete Product (Soft Delete for Customers)

- [ ] **Delete product successfully**
  ```bash
  curl -X DELETE http://staging.yourapp.com/api/v1/products/<product-id> \
    -H "Authorization: Bearer <token>"
  ```
  - Product deleted: [ YES / NO ]
  - Result: [ PASS / FAIL ]

#### Test 22: Create Order

- [ ] **Create order with items**
  ```bash
  curl -X POST http://staging.yourapp.com/api/v1/orders \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{
      "customerId": "<customer-id>",
      "items": [{
        "productId": "<product-id>",
        "quantity": 5,
        "price": 50
      }],
      "paymentMethod": "cash"
    }'
  ```
  - Order created: [ YES / NO ]
  - Result: [ PASS / FAIL ]

---

## 📊 Monitoring & Logs

### Application Logs

#### Test 23: No Sensitive Data in Logs

- [ ] **Check logs for tokens/passwords**
  ```bash
  pm2 logs food-inventory-saas-staging --lines 200 | grep -i "token\|password\|secret"
  ```
  - Expected: "***REDACTED***" for sensitive fields
  - Found sensitive data: [ YES / NO ]
  - Result: [ PASS / FAIL ]

#### Test 24: Security Events Logged

- [ ] **Check audit logs for security events**
  ```bash
  # Query MongoDB directly
  db.auditlogs.find({ action: { $in: ['CSP_VIOLATION', 'RATE_LIMIT_EXCEEDED', 'AUTH_FAILED'] } }).limit(10)
  ```
  - Events found: [ YES / NO ]
  - Result: [ PASS / FAIL ]

---

## 🔍 Browser Testing (Frontend)

### CSP Enforcement in Browser

#### Test 25: Open Frontend Application

- [ ] **Navigate to frontend**
  - URL: http://staging-frontend.yourapp.com
  - Application loads: [ YES / NO ]

#### Test 26: Check Browser Console

- [ ] **Open DevTools Console (F12)**
  - No CSP violation errors: [ YES / NO ]
  - No inline script errors: [ YES / NO ]
  - Result: [ PASS / FAIL ]

#### Test 27: Login Flow

- [ ] **Complete login flow**
  - Login works: [ YES / NO ]
  - JWT stored in localStorage: [ YES / NO ]
  - Redirects to dashboard: [ YES / NO ]
  - Result: [ PASS / FAIL ]

---

## 🚨 Regression Tests

### Existing Functionality

#### Test 28: Existing Users Can Login

- [ ] **Login with existing user**
  - Email: _____________________
  - Login successful: [ YES / NO ]
  - Result: [ PASS / FAIL ]

#### Test 29: Existing Orders Accessible

- [ ] **Query existing orders**
  ```bash
  curl http://staging.yourapp.com/api/v1/orders \
    -H "Authorization: Bearer <token>"
  ```
  - Orders returned: [ YES / NO ]
  - Data integrity: [ OK / CORRUPTED ]
  - Result: [ PASS / FAIL ]

#### Test 30: Swagger UI Works

- [ ] **Access Swagger documentation**
  - URL: http://staging.yourapp.com/api/docs
  - Swagger loads: [ YES / NO ]
  - Can execute requests: [ YES / NO ]
  - Result: [ PASS / FAIL ]

---

## 📈 Final Validation

### Summary

- **Total Tests:** 30
- **Passed:** _____ / 30
- **Failed:** _____ / 30
- **Blocked:** _____ / 30

### Critical Issues Found

1. _________________________________________
2. _________________________________________
3. _________________________________________

### Non-Critical Issues Found

1. _________________________________________
2. _________________________________________

### Performance Metrics

| Metric | Value | Expected | Status |
|--------|-------|----------|--------|
| Average Response Time | ___ms | <200ms | [ PASS / FAIL ] |
| Memory Usage | ___MB | <500MB | [ PASS / FAIL ] |
| CPU Usage | ___% | <50% | [ PASS / FAIL ] |

---

## ✅ Sign-Off

### Staging Validation Result

- [ ] **APPROVED for Production** - All tests passed, no critical issues
- [ ] **APPROVED with NOTES** - Minor issues found, documented below
- [ ] **REJECTED** - Critical issues found, needs fixes before production

### Notes

___________________________________________________________________
___________________________________________________________________
___________________________________________________________________

### Approvals

- **Tester:** _______________ Date: ___________
- **Tech Lead:** _______________ Date: ___________
- **Security Review:** _______________ Date: ___________

---

## 🔄 Next Steps

### If Approved

1. [ ] Merge to main branch
2. [ ] Create production release tag
3. [ ] Schedule production deployment
4. [ ] Prepare production rollback plan
5. [ ] Notify team of deployment schedule

### If Rejected

1. [ ] Create GitHub issues for each critical bug
2. [ ] Prioritize fixes
3. [ ] Implement fixes
4. [ ] Re-run validation checklist
5. [ ] Schedule new validation session

---

**Checklist Version:** 1.0
**Last Updated:** 2025-10-01
**Template:** STAGING-VALIDATION-CHECKLIST.md
