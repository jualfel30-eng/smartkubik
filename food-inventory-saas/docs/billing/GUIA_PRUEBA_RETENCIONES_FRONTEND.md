# Guía de Prueba: Módulo de Retenciones Fiscales (Frontend)

## 📋 Tabla de Contenidos

- [Integración Completada](#integración-completada)
- [Prerrequisitos](#prerrequisitos)
- [Paso 1: Crear Series de Retenciones](#paso-1-crear-series-de-retenciones)
- [Paso 2: Verificar Facturas](#paso-2-verificar-facturas)
- [Paso 3: Acceder al Módulo](#paso-3-acceder-al-módulo)
- [Paso 4: Crear Retención IVA](#paso-4-crear-retención-iva)
- [Paso 5: Crear Retención ISLR](#paso-5-crear-retención-islr)
- [Paso 6: Emitir Retenciones](#paso-6-emitir-retenciones)
- [Troubleshooting](#troubleshooting)

---

## Integración Completada

Se han realizado las siguientes modificaciones en el frontend:

### ✅ Archivos Creados

```
food-inventory-admin/src/components/billing/
├── WithholdingManagement.jsx  (~700 líneas)
├── WithholdingIvaForm.jsx     (~400 líneas)
└── WithholdingIslrForm.jsx    (~500 líneas)
```

### ✅ Modificaciones en App.jsx

**Línea ~213:** Import lazy del componente
```jsx
const WithholdingManagement = lazy(() => import('@/components/billing/WithholdingManagement.jsx'));
```

**Línea ~1202:** Ruta agregada
```jsx
<Route path="billing/retenciones" element={<WithholdingManagement />} />
```

**Línea ~528:** Enlace en sidebar (dentro de Contabilidad General)
```jsx
{ name: 'Retenciones Fiscales', href: 'billing/retenciones', icon: Receipt, permission: 'billing_read' }
```

### 🔄 Reiniciar el Frontend

Para aplicar los cambios:

```bash
cd food-inventory-admin

# Si el servidor está corriendo, detenerlo (Ctrl+C) y volver a ejecutar:
npm run dev
```

---

## Prerrequisitos

### 1. Backend Corriendo

El backend debe estar ejecutándose en `http://localhost:3000`:

```bash
cd food-inventory-saas
npm run start:dev
```

### 2. Autenticación

Debes estar autenticado con un usuario que tenga permiso `billing_read`.

### 3. Base de Datos

Asegúrate de tener:
- Al menos un tenant configurado
- Al menos una factura emitida
- Series de documentos (se crearán en el siguiente paso)

---

## Paso 1: Crear Series de Retenciones

Las series son necesarias para generar números de documentos secuenciales.

### Opción A: Via API (Recomendado)

```bash
# Obtener token de autenticación
export TOKEN="tu_token_jwt_aqui"

# Crear serie de retenciones IVA
curl -X POST http://localhost:3000/api/v1/document-sequences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "retention-iva",
    "prefix": "RET-IVA",
    "nextNumber": 1,
    "description": "Retenciones IVA"
  }'

# Crear serie de retenciones ISLR
curl -X POST http://localhost:3000/api/v1/document-sequences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "retention-islr",
    "prefix": "RET-ISLR",
    "nextNumber": 1,
    "description": "Retenciones ISLR"
  }'
```

### Opción B: Via Frontend (Módulo de Series)

1. Navega a: **Contabilidad General > Series de Facturación**
2. Click en **"Nueva Serie"**
3. Configurar serie IVA:
   - Tipo: `retention-iva`
   - Prefijo: `RET-IVA`
   - Próximo número: `1`
   - Descripción: `Retenciones IVA`
4. Repetir para serie ISLR:
   - Tipo: `retention-islr`
   - Prefijo: `RET-ISLR`
   - Próximo número: `1`
   - Descripción: `Retenciones ISLR`

### Verificar Series Creadas

```bash
# Listar todas las series
curl -X GET "http://localhost:3000/api/v1/document-sequences" \
  -H "Authorization: Bearer $TOKEN"

# Deberías ver las series creadas en el response
```

---

## Paso 2: Verificar Facturas

El módulo de retenciones requiere facturas emitidas para poder crear retenciones sobre ellas.

### Verificar Facturas Existentes

```bash
# Listar facturas emitidas
curl -X GET "http://localhost:3000/api/v1/billing?status=issued" \
  -H "Authorization: Bearer $TOKEN"
```

### Crear Factura de Prueba (Si es necesario)

**Via Frontend:**

1. Navega a: **Contabilidad General > Facturación Electrónica**
2. Click en **"Nueva Factura"**
3. Completar datos:
   - Cliente: Seleccionar o crear
   - Productos/Servicios
   - Calcular totales
4. Click en **"Guardar y Emitir"**

**Via API:**

```bash
curl -X POST http://localhost:3000/api/v1/billing \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "CLIENTE PRUEBA RETENCIONES",
      "taxId": "J-999999999",
      "email": "cliente@test.com",
      "address": "Caracas, Venezuela"
    },
    "items": [
      {
        "description": "Producto Test",
        "quantity": 10,
        "unitPrice": 100,
        "taxCode": "G",
        "taxRate": 16
      }
    ],
    "documentType": "invoice",
    "issueDate": "2024-03-23"
  }'
```

**Resultado esperado:**
- Subtotal: $1,000.00
- IVA (16%): $160.00
- Total: $1,160.00

---

## Paso 3: Acceder al Módulo

### Via Sidebar

1. Inicia sesión en el admin
2. En el sidebar, expande: **Contabilidad General**
3. Click en: **Retenciones Fiscales**

![Ubicación en Sidebar](../../assets/retenciones-sidebar.png)

### Via URL Directa

```
http://localhost:5173/billing/retenciones
```

### Lo que Deberías Ver

**Dashboard de Retenciones** con:

✅ **4 Cards de Estadísticas:**
- Total IVA Retenido (azul)
- Total ISLR Retenido (verde)
- Borradores (gris)
- Emitidas (verde)

✅ **Tabla de Retenciones:**
- Filtros: Tipo (Todas/IVA/ISLR) y Estado (Todos/Borrador/Emitida)
- Columnas: Documento, Tipo, Beneficiario, Fecha, Monto, Estado, Nro. Control, Acciones

✅ **Botones de Acción:**
- "Nueva Retención IVA"
- "Nueva Retención ISLR"
- "Actualizar"

---

## Paso 4: Crear Retención IVA

### 4.1 Abrir Formulario

Click en **"Nueva Retención IVA"**

Se abrirá un modal con el formulario de creación.

### 4.2 Completar Formulario

#### Sección 1: Documento Afectado

1. **Factura:** Seleccionar una factura de la lista
   - Se mostrará una vista previa con:
     - Número de documento
     - Cliente
     - RIF
     - Subtotal e IVA

#### Sección 2: Configuración de Retención

2. **Porcentaje de Retención:**
   - `75%` - Para contribuyentes ordinarios calificados
   - `100%` - Para contribuyentes no calificados

3. **Serie:** Seleccionar `RET-IVA` (creada en Paso 1)

4. **Fecha de Operación:** Seleccionar fecha (default: hoy)

5. **Notas (Opcional):** Cualquier observación adicional

#### Sección 3: Vista Previa del Cálculo

Se mostrará automáticamente:

```
Base Imponible:         $1,000.00
IVA (16%):             $  160.00
Porcentaje de Retención:     75%
─────────────────────────────────
Monto a Retener:        $  120.00
```

### 4.3 Crear Retención

Click en **"Crear Retención IVA"**

**Resultado esperado:**
- Toast de confirmación: "Retención IVA creada exitosamente"
- El modal se cierra
- La tabla se actualiza mostrando la nueva retención
- Estado: **Borrador**
- Número de documento: **RET-IVA-0001**

---

## Paso 5: Crear Retención ISLR

### 5.1 Abrir Formulario

Click en **"Nueva Retención ISLR"**

### 5.2 Completar Formulario

#### Sección 1: Documento Afectado

1. **Factura:** Seleccionar una factura (puede ser la misma o diferente)

#### Sección 2: Concepto ISLR

2. **Concepto:** Seleccionar uno del catálogo

**Conceptos disponibles:**

| Código | Descripción | Tasa |
|--------|-------------|------|
| S-01 | Honorarios profesionales no mercantiles | 3% |
| S-02 | Servicios de publicidad y propaganda | 3% |
| S-03 | Alquileres de bienes inmuebles | 3% |
| S-04 | Servicios profesionales independientes | 3% |
| S-05 | Consultoría técnica, financiera o administrativa | 5% |
| S-06 | Servicios de ingeniería, arquitectura y similares | 5% |
| S-07 | Comisiones por ventas | 3% |
| S-08 | Arrendamiento de equipos | 3% |
| P-01 | Compra de productos agrícolas | 2% |
| P-02 | Compra de productos alimenticios | 2% |
| P-03 | Compra de bienes muebles | 1% |
| P-04 | Compra de materias primas | 1% |

**Ejemplo:** Seleccionar `S-04 - Servicios profesionales independientes (3%)`

Se mostrará un alert informativo con los detalles del concepto.

3. **Porcentaje:** Se llena automáticamente (editable si necesitas ajustar)

4. **Sustraendo:** Dejar en 0 (o ingresar monto si aplica)

5. **Serie:** Seleccionar `RET-ISLR`

6. **Fecha de Operación:** Seleccionar fecha

7. **Notas (Opcional):** Observaciones

#### Vista Previa del Cálculo

```
Base Imponible:         $1,000.00
Retención (3%):        $   30.00
Sustraendo:            $    0.00
─────────────────────────────────
Monto a Retener:        $   30.00
```

### 5.3 Crear Retención

Click en **"Crear Retención ISLR"**

**Resultado esperado:**
- Toast: "Retención ISLR creada exitosamente"
- Nueva fila en la tabla
- Estado: **Borrador**
- Número: **RET-ISLR-0001**

---

## Paso 6: Emitir Retenciones

### 6.1 Modo Draft (Sin HKA)

En modo **Borrador**, las retenciones están creadas pero NO tienen número de control de SENIAT.

**Acciones disponibles:**
- ✅ Ver detalle (icono ojo)
- ❌ Descargar PDF (aún no disponible)
- ✅ Emitir (botón "Emitir")

### 6.2 Emitir a HKA Factory (Con Credenciales)

**IMPORTANTE:** Esta funcionalidad requiere:
1. Credenciales HKA Factory demo configuradas en `.env`
2. Backend con acceso a Internet
3. Proveedor de imprenta configurado en el tenant

**Para emitir:**

1. Ubicar la retención en estado "Borrador"
2. Click en botón **"Emitir"**
3. Se mostrará:
   - Toast loading: "Emitiendo retención a HKA Factory..."
   - El proceso puede tardar 10-30 segundos

**Si es exitoso:**
- Toast success: "Retención emitida exitosamente"
- Estado cambia a: **Emitida**
- Se asigna: **Número de Control** (ej: `01-12345678`)
- Aparece botón **"PDF"**

**Si falla:**
- Toast error con el mensaje de error
- Estado permanece en "Borrador"
- Revisar logs del backend para detalles

### 6.3 Descargar PDF

Una vez emitida:

1. Click en botón **"PDF"**
2. Se descarga automáticamente: `RET-IVA-0001.pdf` o `RET-ISLR-0001.pdf`

**El PDF debe contener:**
- ✅ Encabezado con logo SmartKubik
- ✅ Número de documento
- ✅ Número de control (asignado por HKA)
- ✅ Datos del emisor (quien retiene)
- ✅ Datos del beneficiario (a quien se retiene)
- ✅ Detalles del cálculo
- ✅ Totales
- ✅ Notas (si existen)

### 6.4 Ver Detalle

Click en el icono **ojo** para abrir el modal de detalle.

**Modal muestra:**
- Tipo (badge IVA o ISLR)
- Estado (badge)
- Número de control
- Fecha de operación
- Información del beneficiario
- Detalles del cálculo (IVA o ISLR)
- Notas

---

## Troubleshooting

### Error: "No hay series de retenciones configuradas"

**Causa:** No se han creado las series `retention-iva` o `retention-islr`

**Solución:** Seguir [Paso 1: Crear Series](#paso-1-crear-series-de-retenciones)

---

### Error: "No hay facturas registradas"

**Causa:** No existen facturas con status `issued` en el sistema

**Solución:** Seguir [Paso 2: Verificar Facturas](#paso-2-verificar-facturas)

---

### Error: "Error al cargar retenciones"

**Posibles causas:**
1. Backend no está corriendo
2. Error de autenticación (token expirado)
3. Error en endpoint del backend

**Solución:**
```bash
# 1. Verificar que el backend está corriendo
curl http://localhost:3000/health

# 2. Verificar autenticación
# Revisar en DevTools > Application > Local Storage > accessToken

# 3. Revisar logs del backend
# Buscar errores en la consola donde corre `npm run start:dev`
```

---

### Error al emitir: "Error al emitir retención"

**Posibles causas:**
1. No hay credenciales HKA configuradas
2. Credenciales inválidas
3. Sin conexión a Internet
4. Tenant sin proveedor de imprenta configurado

**Solución:**

**1. Verificar credenciales HKA:**
```bash
cd food-inventory-saas
cat .env.demo

# Debe contener:
# HKA_FACTORY_BASE_URL=https://demoemisionv2.thefactoryhka.com.ve
# HKA_FACTORY_USUARIO=usuario_demo
# HKA_FACTORY_CLAVE=clave_demo
# HKA_FACTORY_RIF_EMISOR=J-123456789
```

**2. Ejecutar script de validación:**
```bash
npm run setup:hka-demo
```

**3. Revisar logs del backend:**
Buscar errores relacionados con HKA Factory.

---

### PDF no se descarga

**Posibles causas:**
1. La retención no está en estado `issued`
2. Error en generación de PDF
3. Bloqueador de pop-ups del navegador

**Solución:**
1. Verificar que el estado sea "Emitida"
2. Revisar consola del navegador (F12)
3. Permitir descargas automáticas en el navegador

---

### Error: "Cannot read property 'ivaRetention' of null"

**Causa:** Datos corruptos o retención mal formada

**Solución:**
```bash
# Verificar estructura de la retención en la DB
mongo
use food-inventory-saas
db.withholdingdocuments.findOne({ _id: ObjectId("ID_AQUI") })

# Debe tener structure:
# - type: "iva" o "islr"
# - ivaRetention: { ... } (si type es "iva")
# - islrRetention: { ... } (si type es "islr")
```

---

### Cálculo incorrecto

**IVA:**
- Base Imponible = Subtotal de la factura
- IVA = Base × Tasa IVA (16%)
- Retención = IVA × Porcentaje (75% o 100%)

**ISLR:**
- Base Imponible = Subtotal de la factura
- Retención = (Base × Porcentaje) - Sustraendo
- Sustraendo puede ser 0

**Verificar:**
1. Que la factura tenga totales correctos
2. Que el porcentaje sea el correcto
3. Revisar cálculo en la vista previa antes de crear

---

## Checklist de Prueba Completa

- [ ] Backend corriendo en puerto 3000
- [ ] Frontend corriendo en puerto 5173
- [ ] Autenticado con usuario válido
- [ ] Serie `RET-IVA` creada
- [ ] Serie `RET-ISLR` creada
- [ ] Al menos 1 factura emitida disponible
- [ ] Navegar a "Retenciones Fiscales" desde sidebar
- [ ] Ver dashboard con 4 cards de estadísticas
- [ ] Crear retención IVA exitosamente
- [ ] Verificar cálculo automático de IVA
- [ ] Retención IVA aparece en tabla con estado "Borrador"
- [ ] Crear retención ISLR exitosamente
- [ ] Seleccionar concepto del catálogo
- [ ] Verificar cálculo automático de ISLR
- [ ] Retención ISLR aparece en tabla
- [ ] Ver detalle de retención IVA (modal)
- [ ] Ver detalle de retención ISLR (modal)
- [ ] Filtrar por tipo (IVA/ISLR/Todas)
- [ ] Filtrar por estado (Borrador/Emitida)
- [ ] Stats se actualizan correctamente
- [ ] (Opcional con HKA) Emitir retención IVA
- [ ] (Opcional con HKA) Recibir número de control
- [ ] (Opcional con HKA) Estado cambia a "Emitida"
- [ ] (Opcional con HKA) Descargar PDF
- [ ] (Opcional con HKA) PDF contiene número de control

---

## Próximos Pasos

Una vez completadas las pruebas del frontend:

### Opción 1: Obtener Credenciales HKA Demo

Contactar a HKA Factory para obtener credenciales de ambiente demo y poder probar el flujo completo de emisión.

### Opción 2: Implementar Funcionalidades Avanzadas (Parte C)

- C1. **Implementar IGTF** - Impuesto a las Grandes Transacciones Financieras
- C2. **Query estado documentos** - Consultar estado en HKA Factory
- C3. **Anulación de retenciones** - Permitir anular retenciones emitidas
- C4. **Descarga PDF desde HKA** - Obtener PDF directamente desde HKA

### Opción 3: Deploy a Producción

- Configurar `.env.production` con credenciales productivas
- Migrar base de datos de producción
- Configurar proveedor de imprenta en tenants productivos
- Ejecutar smoke tests

---

## Soporte

Si encuentras algún problema durante las pruebas:

1. **Revisar logs del backend:**
   ```bash
   # En la terminal donde corre el backend
   # Buscar mensajes de error relacionados con withholding
   ```

2. **Revisar consola del navegador:**
   ```
   F12 > Console
   # Buscar errores de API o componentes
   ```

3. **Verificar network requests:**
   ```
   F12 > Network > Filter: withholding
   # Revisar requests/responses del API
   ```

4. **Consultar documentación:**
   - [Integración HKA](./INTEGRACION_HKA_RETENCIONES.md)
   - [Certificación HKA](./CERTIFICACION_HKA_RETENCIONES.md)
   - [Plan Fase 7](./FASE_7_PLAN_RETENCIONES_COMPLETO.md)

---

**Versión:** 1.0
**Última actualización:** Marzo 2024
**Mantenido por:** Equipo SmartKubik
