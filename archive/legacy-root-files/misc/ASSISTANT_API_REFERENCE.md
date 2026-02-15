# SmartKubik Assistant API Reference

Esta guía resume los endpoints y eventos disponibles para consultar el asistente de IA alimentado por la base de conocimiento.

## 1. Requisitos previos
- Haber configurado las credenciales de OpenAI y Pinecone en el panel de Super Admin.
- Contar con documentos cargados en el tenant de conocimiento (por defecto `smartkubik_docs`).
- Backend (`food-inventory-saas`) en ejecución (`npm run start:dev`).

## 2. Endpoint REST

```
POST /api/v1/super-admin/assistant/query
```

**Payload**
```json
{
  "tenantId": "smartkubik_docs",
  "question": "¿Cómo configuro el módulo de inventario?"
}
```

- `tenantId` (opcional): si se omite, se usa `smartkubik_docs`.
- `question` (obligatorio): pregunta en lenguaje natural.
- `topK` (opcional): cantidad de chunks recuperados del vector DB (default 5).

**Respuesta**
```json
{
  "data": {
    "tenantId": "smartkubik_docs",
    "answer": "…respuesta del asistente…",
    "sources": [
      {
        "source": "manual_inventario_v1.pdf",
        "snippet": "…frammento relevante…"
      }
    ]
  }
}
```

## 3. WebSocket Gateway

- Namespace: `/assistant`
- Evento de solicitud: `askAssistant`
- Evento de respuesta: `assistantResponse`
- Evento de error: `assistantError`

**Ejemplo con socket.io-client**
```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/assistant', {
  query: { tenantId: 'smartkubik_docs' },
  withCredentials: true,
});

socket.on('connect', () => {
  console.log('Conectado al asistente', socket.id);
  socket.emit('askAssistant', {
    question: '¿Cuál es el flujo de compras?',
    topK: 4,
  });
});

socket.on('assistantResponse', (payload) => {
  console.log('Respuesta IA', payload.answer, payload.sources);
});

socket.on('assistantError', (err) => {
  console.error('Error IA', err);
});
```

> Nota: si no se envía `tenantId` en `askAssistant`, se toma el valor definido en `query` o se usa `smartkubik_docs`.

## 4. Flujo sugerido en Super Admin
1. Cargar documentos en `Super Admin → Base de conocimiento`.
2. Probar la consulta vectorial (`Preguntar`).
3. Solicitar al asistente la respuesta contextualizada (`Asistente IA`).
4. Validar las fuentes adjuntas antes de compartir la respuesta al equipo/cliente.

## 5. Integraciones siguientes
- Conectar `AssistantService` con el flujo de WhatsApp/chat para respuestas automáticas por tenant.
- Permitir que cada tenant suba su propia base (`Settings → WhatsApp → Base de conocimiento`).
- Agregar permisos granulares para controlar qué acciones puede ejecutar la IA usando function calling.

