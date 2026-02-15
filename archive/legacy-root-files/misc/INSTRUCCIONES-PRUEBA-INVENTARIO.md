# Instrucciones para Probar el Asistente de Inventario

## Requisitos Previos

1. **Backend corriendo en modo desarrollo:**
   ```bash
   cd food-inventory-saas
   npm run start:dev
   ```

2. **Tener productos en el inventario** con cantidades disponibles

3. **Tener `jq` instalado** (opcional, para formatear JSON):
   ```bash
   brew install jq
   ```

## Opción 1: Script Automático (Recomendado)

Ejecuta el script de prueba que creé:

```bash
cd /Users/jualfelsantamaria/Documents/Saas/V1.03/FOOD-INVENTORY-SAAS-COMPLETO
./test-inventory-assistant.sh
```

El script te pedirá:
1. Email y contraseña para hacer login
2. Nombre del producto a buscar
3. Ejecutará automáticamente todas las pruebas

## Opción 2: Pruebas Manuales con curl

### 1. Login y obtener token

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "TU_EMAIL",
    "password": "TU_PASSWORD"
  }' | jq '.'
```

Copia el `accessToken` de la respuesta.

### 2. Verificar configuración del asistente

```bash
TOKEN="TU_TOKEN_AQUI"

curl -X GET http://localhost:3000/api/v1/assistant/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
```

**Verifica que:**
- `aiAssistant.autoReplyEnabled` sea `true`
- `aiAssistant.capabilities.inventoryLookup` sea `true`

### 3. Probar búsqueda directa de inventario

```bash
curl -X POST http://localhost:3000/api/v1/assistant/test-inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productQuery": "aceite de coco",
    "limit": 5
  }' | jq '.'
```

**Esperado:**
- `ok: true`
- `matches: [...]` con productos encontrados
- Cada producto debe mostrar: `availableQuantity`, `reservedQuantity`, `totalQuantity`, `sellingPrice`, etc.

### 4. Probar el asistente completo

```bash
curl -X POST http://localhost:3000/api/v1/assistant/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "¿Cuántas unidades de aceite de coco tenemos disponibles?",
    "topK": 5
  }' | jq '.'
```

**Esperado:**
- `answer`: Respuesta con las cantidades específicas del inventario
- `usedTools: true`
- `sources: [...]` (puede estar vacío si solo usa inventario)

## Opción 3: Pruebas desde Postman

### Importar a Postman

1. Crea una nueva colección llamada "Test Inventario Asistente"

2. **Request 1: Login**
   - Method: `POST`
   - URL: `http://localhost:3000/api/v1/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "tu_email@example.com",
       "password": "tu_password"
     }
     ```
   - Guarda el `accessToken` en una variable de colección

3. **Request 2: Config**
   - Method: `GET`
   - URL: `http://localhost:3000/api/v1/assistant/config`
   - Headers: `Authorization: Bearer {{accessToken}}`

4. **Request 3: Test Inventory**
   - Method: `POST`
   - URL: `http://localhost:3000/api/v1/assistant/test-inventory`
   - Headers: `Authorization: Bearer {{accessToken}}`
   - Body (JSON):
     ```json
     {
       "productQuery": "aceite de coco",
       "limit": 5
     }
     ```

5. **Request 4: Chat**
   - Method: `POST`
   - URL: `http://localhost:3000/api/v1/assistant/chat`
   - Headers: `Authorization: Bearer {{accessToken}}`
   - Body (JSON):
     ```json
     {
       "question": "¿Cuántas unidades de aceite de coco tenemos disponibles?",
       "topK": 5
     }
     ```

## Interpretación de Logs

Mientras ejecutas las pruebas, observa los logs del backend. Deberías ver:

### ✅ Logs Exitosos

```
[ChatService] [DEBUG] Tenant XXX AI settings: {"autoReplyEnabled":true,"capabilities":{"inventoryLookup":true,...}}
[AssistantService] [DEBUG] Tenant XXX - Capabilities received: {"inventoryLookup":true,...}
[AssistantService] [DEBUG] inventoryLookup enabled: true
[AssistantService] [DEBUG] Attempting inventory bootstrap for question: "..."
[AssistantService] [DEBUG] Inventory query candidates: ["aceite de coco","aceite coco","coco"]
[AssistantService] [DEBUG] Executing inventory lookup for: "aceite de coco"
[AssistantService] [DEBUG] Inventory lookup result: {"ok":true,"matches":[{...}],...}
[AssistantService] [DEBUG] Bootstrap inventory data obtained, length: XXX
```

### ❌ Problemas Comunes

**Si ves:**
```
[AssistantService] [DEBUG] inventoryLookup enabled: false
```
→ La configuración no se guardó correctamente. Ve al frontend y activa el toggle.

**Si ves:**
```
[AssistantService] [DEBUG] No inventory query candidates found
```
→ El algoritmo no pudo extraer el nombre del producto de la pregunta. Intenta preguntas más directas.

**Si ves:**
```
[AssistantService] [DEBUG] No matches for candidate: "aceite de coco", ok=true, matches=0
```
→ No hay productos con ese nombre en el inventario. Verifica que existan productos.

## Troubleshooting

### El asistente no encuentra productos

1. Verifica que existan productos en la base de datos:
   ```bash
   # Conéctate a MongoDB y ejecuta:
   db.products.find({ name: /aceite/i }).pretty()
   db.inventories.find({ productName: /aceite/i }).pretty()
   ```

2. Verifica que los inventarios estén activos:
   ```javascript
   db.inventories.find({ isActive: { $ne: false } })
   ```

3. Prueba con términos más simples:
   - En vez de "aceite de coco", prueba solo "aceite"
   - En vez de "leche entera", prueba solo "leche"

### La configuración no se guarda

1. Verifica en MongoDB:
   ```javascript
   db.tenants.findOne({}, { aiAssistant: 1 })
   ```

2. Debería mostrar:
   ```json
   {
     "aiAssistant": {
       "autoReplyEnabled": true,
       "capabilities": {
         "inventoryLookup": true,
         ...
       }
     }
   }
   ```

### El asistente responde pero sin datos de inventario

Esto puede suceder si:
1. La pregunta no es clara (el modelo no reconoce que necesita consultar inventario)
2. Los candidatos de búsqueda no coinciden con ningún producto
3. Revisa los logs de `[DEBUG] Inventory query candidates` para ver qué términos se extrajeron

## Prueba con WhatsApp (después de verificar que funciona)

Una vez que las pruebas con curl/Postman funcionen:

1. Envía un mensaje a tu número de WhatsApp conectado:
   ```
   ¿Cuántas unidades de aceite de coco tenemos?
   ```

2. El asistente debería responder automáticamente con las cantidades

3. Revisa los logs del backend para ver el flujo completo

## Siguiente Paso

Si todo funciona correctamente:
1. Elimina los logs de `[DEBUG]` del código (opcional)
2. Despliega a producción
3. Prueba con clientes reales

Si algo no funciona:
1. Comparte los logs del backend
2. Comparte la respuesta del endpoint `/assistant/config`
3. Comparte la respuesta del endpoint `/assistant/test-inventory`
