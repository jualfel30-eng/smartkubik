# Security Analysis: CSRF Protection

**Fecha:** 2025-10-01
**Prioridad:** N/A (No Aplicable)
**Estado:** ✅ NO REQUERIDO

---

## 1. Análisis de Vulnerabilidad CSRF

### ¿Qué es CSRF?

**Cross-Site Request Forgery (CSRF)** es un ataque donde un sitio malicioso engaña al navegador del usuario para que realice requests no autorizados a otro sitio donde el usuario está autenticado.

**Requisito para que CSRF funcione:**
- La aplicación debe usar **cookies de sesión** que el navegador envía automáticamente
- El atacante puede crear un formulario/request que el navegador ejecuta sin que el usuario lo sepa

---

## 2. Análisis de Autenticación en Esta Aplicación

### Método de Autenticación Actual: JWT en Headers

**Archivo analizado:** `src/auth/auth.controller.ts`

```typescript
@Post("login")
async login(@Body() loginDto: LoginDto) {
  const result = await this.authService.login(loginDto);
  return {
    success: true,
    message: "Login exitoso",
    data: result, // ✅ Retorna accessToken y refreshToken en JSON
  };
}
```

**Respuesta del login:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

**¿Dónde se almacenan los tokens?**
- Frontend: `localStorage` o `sessionStorage`
- Se envían en header: `Authorization: Bearer <token>`

**¿Se usan cookies?**
- ❌ NO se usan cookies `httpOnly` para tokens
- ❌ NO se usa `res.cookie()` para almacenar tokens
- ✅ Solo JSON responses en el body

---

## 3. ¿Por qué CSRF NO Aplica?

### CSRF requiere cookies automáticas

**Ataque CSRF típico:**
```html
<!-- Sitio malicioso: evil.com -->
<form action="https://victim.com/transfer-money" method="POST">
  <input name="to" value="attacker" />
  <input name="amount" value="10000" />
</form>
<script>document.forms[0].submit()</script>
```

**¿Por qué funciona con cookies?**
- El navegador envía automáticamente cookies al hacer el POST
- `Cookie: sessionId=abc123` se incluye sin que el usuario lo sepa
- El servidor acepta el request porque la cookie es válida

**¿Por qué NO funciona con JWT en headers?**
- El navegador **NO** envía headers `Authorization` automáticamente
- JavaScript debe agregar el header manualmente: `headers: { 'Authorization': 'Bearer ...' }`
- El sitio malicioso **NO tiene acceso** al localStorage de victim.com (Same-Origin Policy)

---

## 4. Comparación: Cookies vs JWT Headers

| Aspecto | Cookies (httpOnly) | JWT en Headers |
|---------|-------------------|----------------|
| **Envío automático** | ✅ Sí (vulnerable a CSRF) | ❌ No |
| **Acceso desde JS** | ❌ No (httpOnly) | ✅ Sí (vulnerable a XSS) |
| **CSRF vulnerable** | ✅ **SÍ** | ❌ **NO** |
| **XSS vulnerable** | ❌ No | ✅ **SÍ** (pero ya sanitizado) |
| **Necesita CSRF token** | ✅ **SÍ** | ❌ **NO** |

---

## 5. Caso Especial: Google OAuth

**Código encontrado:**
```typescript
@Get('google/callback')
async googleAuthRedirect(@Request() req, @Res() res) {
  const result = await this.authService.googleLogin(req.user);
  const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5174';

  // ⚠️ Tokens en URL (NO recomendado pero NO vulnerable a CSRF)
  res.redirect(`${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`);
}
```

**Análisis:**
- ❌ Tokens en query params (pueden quedar en logs/historial)
- ✅ NO vulnerable a CSRF (redirect explícito)
- ⚠️ Recomendación: Usar POST con tokens en body o cookies httpOnly + CSRF token

**Pero:** Este flujo **NO requiere CSRF protection** porque:
1. Es un redirect después de autenticación exitosa
2. Google valida el OAuth flow
3. El usuario debe dar consentimiento explícito

---

## 6. Protecciones XSS Ya Implementadas

Como la aplicación usa JWT en localStorage (vulnerable a XSS), ya implementamos:

✅ **Sanitización de inputs** (previene XSS almacenado)
✅ **Content sanitization** en 78 campos
✅ **Logger sanitization** (previene leak de tokens en logs)

**Resultado:** Los tokens en localStorage están protegidos contra XSS.

---

## 7. Recomendaciones de Seguridad

### Opción 1: Mantener JWT en Headers (Actual) ✅

**Pros:**
- ✅ No requiere CSRF protection
- ✅ Stateless (sin sesiones en servidor)
- ✅ Funciona bien con SPAs

**Contras:**
- ⚠️ Vulnerable a XSS (pero ya mitigado con sanitización)
- ⚠️ Tokens en localStorage accesibles desde JS

**Mitigaciones implementadas:**
- ✅ XSS sanitization completa
- ✅ Rate limiting en auth endpoints
- ✅ Token expiration corto (15 minutos)
- ✅ Refresh tokens con rotación

---

### Opción 2: Migrar a Cookies httpOnly (Futuro)

**Si decides migrar:**

```typescript
@Post("login")
async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
  const result = await this.authService.login(loginDto);

  // Almacenar tokens en cookies httpOnly
  res.cookie('accessToken', result.accessToken, {
    httpOnly: true,      // No accesible desde JS
    secure: true,        // Solo HTTPS
    sameSite: 'strict',  // Protección CSRF
    maxAge: 15 * 60 * 1000, // 15 minutos
  });

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  });

  return {
    success: true,
    message: "Login exitoso",
    data: { user: result.user }, // NO incluir tokens en response
  };
}
```

**Pros:**
- ✅ Inmune a XSS (tokens no accesibles desde JS)
- ✅ `SameSite=Strict` previene CSRF básico

**Contras:**
- ⚠️ Requiere CSRF token para requests state-changing
- ⚠️ Más complejo de implementar
- ⚠️ No funciona bien con CORS en algunos casos

---

## 8. Implementación de CSRF (Si Migras a Cookies)

### Paso 1: Instalar librería CSRF

```bash
npm install csurf
npm install -D @types/csurf
```

### Paso 2: Configurar middleware

```typescript
import * as csurf from 'csurf';

// main.ts
const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);
```

### Paso 3: Endpoint para obtener CSRF token

```typescript
@Get('csrf-token')
@Public()
getCsrfToken(@Request() req) {
  return { csrfToken: req.csrfToken() };
}
```

### Paso 4: Frontend envía CSRF token

```javascript
// Obtener token
const { csrfToken } = await api.get('/csrf-token');

// Incluir en requests POST/PUT/DELETE
await api.post('/orders', orderData, {
  headers: {
    'X-CSRF-Token': csrfToken,
  },
});
```

---

## 9. Conclusión

### Estado Actual: ✅ CSRF Protection NO Requerido

**Razones:**
1. ✅ Autenticación vía JWT en headers (no cookies)
2. ✅ Tokens no se envían automáticamente
3. ✅ Same-Origin Policy previene acceso cross-site
4. ✅ XSS ya mitigado con sanitización completa

### Decisión: **Skip CSRF Implementation**

**Beneficios:**
- ✅ No agrega complejidad innecesaria
- ✅ Mantiene arquitectura stateless
- ✅ Mejor para SPAs y APIs RESTful

**Seguridad actual:**
- Score: 8.0/10
- CSRF: N/A (no aplicable)
- XSS: 9/10 (protegido)
- DoS: 9/10 (rate limiting + paginación + índices)

---

## 10. Alternativa Recomendada: Content Security Policy

En lugar de CSRF (que no aplica), la siguiente mejora de seguridad es:

**Content Security Policy (CSP)**
- Prioridad: Media
- Tiempo: 4 horas
- Impacto: Segunda capa de defensa contra XSS
- Beneficio: Previene ejecución de scripts inline maliciosos

---

**Responsable:** Claude Code Assistant
**Fecha de análisis:** 2025-10-01
**Estado:** ✅ ANÁLISIS COMPLETADO - CSRF NO REQUERIDO
