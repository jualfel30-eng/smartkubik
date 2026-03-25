# 📘 Guía de Migración a Producción - HKA Factory

Esta guía documenta el proceso completo para migrar la integración de HKA Factory del ambiente de demo a producción.

---

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Preguntas para HKA Factory Soporte](#preguntas-para-hka-factory-soporte)
3. [Configuración de Producción](#configuración-de-producción)
4. [Cambios en el Código](#cambios-en-el-código)
5. [Pruebas Pre-Producción](#pruebas-pre-producción)
6. [Despliegue](#despliegue)
7. [Monitoreo Post-Despliegue](#monitoreo-post-despliegue)
8. [Rollback](#rollback)

---

## 🔴 Prerrequisitos

Antes de migrar a producción, asegúrate de tener:

- [ ] **Empresa registrada legalmente** con RIF empresarial (J-XXXXXXXX-X)
- [ ] **Documentación fiscal completa** (RIF, registro mercantil, etc.)
- [ ] **Cuenta de producción en HKA Factory** (diferente a la cuenta demo)
- [ ] **Credenciales de producción** (API Key, Secret, etc.)
- [ ] **Numeraciones fiscales configuradas** en el portal de HKA Factory
- [ ] **Certificados SSL** activos en el dominio del webhook
- [ ] **Backup completo** de la base de datos de producción

---

## ✅ Respuestas Oficiales de HKA Factory Soporte

**Fecha**: 2026-03-23
**Fuente**: Soporte Técnico HKA Factory

### 🔴 Confirmaciones Críticas:

1. **✅ Descarga de PDF**:
   - **Endpoint**: `/api/DescargaArchivo` ✅ CORRECTO
   - **Estado**: Implementado y funcional

2. **✅ Consulta de Estado**:
   - **Endpoint**: `/api/EstadoDocumento` ✅ CORRECTO
   - **Formato del payload**:
   ```json
   {
     "serie": "",
     "tipoDocumento": "01",
     "numeroDocumento": "numero de documento a consultar"
   }
   ```
   - **Estado**: Implementado y funcional

3. **✅ Anulación**:
   - **Endpoint**: `/api/Anular` ✅ CORRECTO
   - **Estado**: Implementado y funcional

4. **✅ Envío de Email**:
   - **Respuesta oficial**: "HKA envía automáticamente, y también puede usar el endpoint para reenvío"
   - HKA envía el documento al cliente **automáticamente** al emitir
   - El endpoint `/api/Correo/Enviar` es para **reenvíos manuales**
   - **Estado**: Implementado correctamente

### 🟡 Configuraciones Importantes:

5. **❌ Webhooks**:
   - **Respuesta oficial**: "Actualmente no tenemos un webhook con esas características"
   - **Alternativa**: Usar endpoint `/api/EstadoDocumento` para consultar status
   - **Acción**: Webhook controller implementado como PLACEHOLDER para futuro
   - **Recomendación**: Implementar polling si se necesita monitoreo en tiempo real

6. **✅ Rate Limits**:
   - **Respuesta oficial**: "No hay un rate limit de peticiones"
   - **⚠️ IMPORTANTE para reenvío**: Si detecta documento ya enviado, puede rechazar
   - **Recomendación**: 30 segundos de delay entre reintentos de email
   - **Estado**: Documentado en código

7. **✅ Notas de Crédito/Débito**:
   - **Respuesta oficial**: "Sí existe un nodo que debe enviar donde se indica el documento afectado"
   - Ver documentación en Swagger para estructura exacta
   - **Estado**: Ya implementado en mapper (campos `SerieFacturaAfectada`, `NumeroFacturaAfectada`, etc.)

8. **✅ Reintentos**:
   - **Respuesta oficial**: "Siempre y cuando el número de documento no esté procesado en nuestro servicio, es un número totalmente válido"
   - **⚠️ IMPORTANTE**: Números deben ser **secuenciales**
   - **Estado**: Manejado correctamente en `ImprentaFailureService`

### 📚 Recursos Adicionales:

- **Swagger/API Docs**: https://demoemisionv2.thefactoryhka.com.ve/swagger/index.html
- **Estructuras JSON**: Ver ejemplos en Swagger
- **Soporte**: Contactar mediante portal HKA Factory

---

## ⚙️ Configuración de Producción

### 1. Obtener Credenciales de Producción

Contacta a HKA Factory y solicita:
- URL de producción (probablemente: `https://emisionv2.thefactoryhka.com.ve`)
- Token de Usuario (producción)
- Token Password (producción)
- RIF del emisor (empresa, formato: J-XXXXXXXX-X)
- Razón Social de la empresa

### 2. Configurar Variables de Entorno

Crea un archivo `.env.hka.production`:

```bash
# Configuración HKA Factory - PRODUCCIÓN
IMPRENTA_PROVIDER_MODE=hka-factory

# URL Base de HKA Factory (PRODUCCIÓN)
HKA_FACTORY_BASE_URL=https://emisionv2.thefactoryhka.com.ve

# Credenciales de API (Servicios Web) - PRODUCCIÓN
HKA_FACTORY_USUARIO=<TU_USUARIO_PRODUCCION>
HKA_FACTORY_CLAVE=<TU_CLAVE_PRODUCCION>

# Datos del Emisor (Empresa)
HKA_FACTORY_RIF_EMISOR=J-XXXXXXXX-X
HKA_FACTORY_RAZON_SOCIAL=Nombre Completo de tu Empresa C.A.

# Configuración Adicional
HKA_FACTORY_TIMEOUT=45000

# Webhook URL (para notificaciones de HKA)
HKA_FACTORY_WEBHOOK_URL=https://tudominio.com/webhooks/hka
```

### 3. Configurar Numeración en HKA Factory Portal

1. Ingresa al portal de HKA Factory con tu cuenta de producción
2. Ve a **Numeraciones** > **Crear Nueva Numeración**
3. Configura cada serie:
   - **Serie/Prefijo**: Ej: "F01" para facturas
   - **Tipo de Documento**: TODOS o específico (Factura, Nota Crédito, etc.)
   - **Rango**: Desde 1 hasta 999999 (o el rango que prefieras)
   - **Estado**: ACTIVO

4. Descarga el CSV de numeraciones para verificar
5. Anota el **prefijo/serie** exacto para configurar en tu sistema

### 4. Actualizar Series en Base de Datos

Actualiza las series (`DocumentSequence`) en tu base de datos MongoDB:

```javascript
db.documentsequences.updateOne(
  { type: 'invoice', isDefault: true },
  {
    $set: {
      'metadata.series': '', // Serie vacía o el prefijo según HKA
      'metadata.hkaConfigured': true
    }
  }
);
```

---

## 🔧 Cambios en el Código

### 1. Sin cambios en el código

La arquitectura está diseñada para usar variables de entorno, por lo que **NO necesitas cambiar código**. Solo asegúrate de que:

- ✅ El archivo `.env.hka.production` esté en el servidor
- ✅ El servidor cargue las variables correctas (usa `dotenv_config_path` si es necesario)
- ✅ PM2 o tu process manager esté configurado para usar el .env correcto

### 2. Configuración de PM2 (Recomendado)

Actualiza tu `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'smartkubik-api',
    script: 'dist/main.js',
    env_production: {
      NODE_ENV: 'production',
      // HKA Factory Production
      IMPRENTA_PROVIDER_MODE: 'hka-factory',
      HKA_FACTORY_BASE_URL: 'https://emisionv2.thefactoryhka.com.ve',
      HKA_FACTORY_USUARIO: process.env.HKA_FACTORY_USUARIO,
      HKA_FACTORY_CLAVE: process.env.HKA_FACTORY_CLAVE,
      HKA_FACTORY_RIF_EMISOR: process.env.HKA_FACTORY_RIF_EMISOR,
      HKA_FACTORY_RAZON_SOCIAL: process.env.HKA_FACTORY_RAZON_SOCIAL,
    },
  }],
};
```

### 3. Verificación de Webhook URL

Asegúrate de que tu servidor tenga:
- ✅ SSL/HTTPS activo (requerido para webhooks)
- ✅ Firewall configurado para permitir IPs de HKA Factory
- ✅ Endpoint `/webhooks/hka` accesible públicamente

---

## 🧪 Pruebas Pre-Producción

### Test 1: Validación de Configuración

```bash
# Desde el servidor de producción
cd /path/to/food-inventory-saas
npx ts-node -r dotenv/config scripts/test-hka-emission.ts dotenv_config_path=.env.hka.production
```

Verifica:
- ✅ Autenticación exitosa
- ✅ Token recibido
- ⚠️ **NO ejecutar emisión real** (usar flag `--dry-run` si implementas)

### Test 2: Emitir Documento de Prueba

**IMPORTANTE**: Este paso emite un documento fiscal real. Solo ejecutar UNA VEZ.

```bash
# Script modificado para emitir documento de prueba con valor mínimo
npm run test:hka:production
```

Verifica:
- ✅ Número de control asignado
- ✅ PDF descargable
- ✅ Email enviado (si configurado)
- ✅ Documento visible en portal HKA

### Test 3: Anulación de Prueba

Anula el documento de prueba:

```bash
curl -X POST https://tuapi.com/api/v1/billing/documents/{id}/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reason": "Documento de prueba"}'
```

Verifica:
- ✅ Anulación exitosa
- ✅ Estado actualizado en HKA
- ✅ Estado actualizado en tu BD

---

## 🚀 Despliegue

### Checklist Pre-Despliegue

- [ ] Backup de base de datos completado
- [ ] Variables de entorno verificadas
- [ ] Pruebas ejecutadas exitosamente
- [ ] Documentación de rollback lista
- [ ] Equipo notificado del despliegue
- [ ] Ventana de mantenimiento programada (si aplica)

### Pasos de Despliegue

1. **Backup de Seguridad**:
   ```bash
   mongodump --uri="mongodb://..." --out=/backup/pre-hka-production
   ```

2. **Actualizar Código**:
   ```bash
   cd /path/to/food-inventory-saas
   git pull origin main
   npm install
   npx nest build
   ```

3. **Actualizar Variables de Entorno**:
   ```bash
   cp .env.hka.production .env
   # O configura PM2 ecosystem
   ```

4. **Reiniciar Servicio**:
   ```bash
   pm2 reload smartkubik-api --update-env
   pm2 logs smartkubik-api --lines 100
   ```

5. **Verificar Health Check**:
   ```bash
   curl https://tuapi.com/api/v1/billing/imprenta/provider-info
   ```

   Respuesta esperada:
   ```json
   {
     "name": "hka-factory",
     "sandbox": false,
     "configured": true
   }
   ```

---

## 📊 Monitoreo Post-Despliegue

### Métricas a Monitorear (primeras 24 horas)

1. **Emisiones Exitosas**:
   ```bash
   # Ver logs de emisiones
   pm2 logs smartkubik-api | grep "Número de control asignado"
   ```

2. **Errores de Emisión**:
   ```bash
   # Ver fallos
   pm2 logs smartkubik-api | grep "Error emitiendo documento"
   ```

3. **Estado de Webhooks** (si configurado):
   ```bash
   # Ver webhooks recibidos
   pm2 logs smartkubik-api | grep "Webhook recibido"
   ```

4. **Queries en MongoDB**:
   ```javascript
   // Documentos emitidos hoy
   db.billingdocuments.find({
     status: 'issued',
     issueDate: { $gte: new Date('2026-03-23T00:00:00Z') }
   }).count();

   // Documentos con control number
   db.billingdocuments.find({
     controlNumber: { $exists: true, $ne: null }
   }).count();

   // Fallos de imprenta
   db.imprentafailures.find({
     createdAt: { $gte: new Date('2026-03-23T00:00:00Z') }
   });
   ```

### Alertas Críticas

Configura alertas para:
- ❌ **Fallos de emisión** > 10% de intentos
- ⏱️ **Timeouts** en requests a HKA > 30 segundos
- 🔒 **Errores de autenticación** (token expirado/inválido)
- 📉 **Caída del servicio** HKA Factory

---

## 🔄 Rollback

Si algo sale mal, ejecuta el rollback:

### Plan de Rollback

1. **Revertir a Mock Provider**:
   ```bash
   # Cambiar modo a mock en .env
   IMPRENTA_PROVIDER_MODE=mock

   # Reiniciar servicio
   pm2 reload smartkubik-api --update-env
   ```

2. **Restaurar Base de Datos** (solo si es crítico):
   ```bash
   mongorestore --uri="mongodb://..." /backup/pre-hka-production
   ```

3. **Notificar a Usuarios**:
   - Enviar comunicado sobre modo de emergencia
   - Explicar que documentos se emitirán sin control fiscal (temporal)

4. **Análisis Post-Mortem**:
   - Revisar logs completos
   - Identificar causa raíz
   - Documentar lecciones aprendidas

---

## 📞 Contactos de Soporte

### HKA Factory
- **Portal**: https://demoemisionv2.thefactoryhka.com.ve
- **Email**: soporte@thefactoryhka.com.ve
- **Teléfono**: [Solicitar a HKA]

### Equipo Interno
- **DevOps**: [Tu contacto]
- **Backend Lead**: [Tu contacto]
- **Product Owner**: [Tu contacto]

---

## 📚 Recursos Adicionales

- [Documentación HKA Factory](scripts/test-hka-emission.ts) - Script de prueba
- [API Reference](src/modules/billing/providers/hka-factory.provider.ts) - Provider implementation
- [Webhook Handler](src/modules/billing/webhooks/hka-webhook.controller.ts) - Webhook endpoint

---

## ✅ Checklist Final

Antes de considerar la migración completa:

- [ ] ✅ Primera factura real emitida exitosamente
- [ ] ✅ PDF descargado y verificado
- [ ] ✅ Email enviado al cliente
- [ ] ✅ Documento visible en portal HKA
- [ ] ✅ Anulación probada y funcional
- [ ] ✅ Nota de crédito emitida (si aplica)
- [ ] ✅ Webhooks recibidos (si configurado)
- [ ] ✅ Equipo capacitado en procedimientos
- [ ] ✅ Documentación actualizada
- [ ] ✅ Plan de contingencia validado

---

**Última actualización**: 2026-03-23
**Versión**: 1.0
**Autor**: Claude Code + Jualfel Santamaria
