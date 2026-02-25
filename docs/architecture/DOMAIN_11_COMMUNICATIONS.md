# Domain 11: Communications & AI (Comunicaciones y Omnicanalidad)

## 📌 Visión General
Este dominio encapsula cómo el sistema se comunica con el exterior (Email y primordialmente WhatsApp) y consigo mismo (Notificaciones internas). Actúa como el motor muscular de ejecución para las reglas dictaminadas por el Dominio 4 (CRM & Marketing).

## 🗄️ Data Layer (Esquemas de Base de Datos)
La persistencia refleja un sistema orientado a eventos asíncronos:

- **`Notification`** (`notification.schema.ts`): Centro neurálgico para alertas "In-App". Categoriza sus disparos (`sales`, `inventory`, `system`) y almacena el estado de lectura (`isRead`). Crucialmente, trackea si la notificación in-app también debía salir por otros canales (`emailSent`, `whatsappSent`).
- **`WhatsAppTemplate`** (`whatsapp-template.schema.ts`): Un espejo del sistema de aprovisionamiento de Meta Cloud API. Guarda el status formal (`draft`, `pending`, `approved`, `rejected`), el identificador de Meta (`metaTemplateId`), y serializa la estructura estricta impuesta por WhatsApp con `TemplateHeader`, `TemplateBody` y variables `{{1}}`.
- **`Playbook`** y **`PlaybookExecution`** (`playbook.schema.ts`): Motor de automatización secuencial. Define recetas (`PlaybookStep`) del tipo "Cuando un Trato (Opportunity) entre a etapa 'Negociación', Espera 2 días, y envía el WhatsAppTemplate X". La ejecución separa el plan de la corrida real (`status: executing`, `scheduledFor`) garantizando idempotencia.
- **`MessageActivity`** (`message-activity.schema.ts`): Bitácora en forma de feed de red social (`kind: 'message' | 'email' | 'meeting'`). Relaciona al cliente, la oportunidad asociada, y si el mensaje fue entrante o saliente para mostrar el historial en el CRM.

## ⚙️ Backend (API Layer)
Interesantemente, este dominio no posee carpetas propias:
- **No existen `/modules/communications/` ni `/modules/ai/`**.
- Sin embargo, toda la carga operativa recae sobre el **Módulo de Marketing** (`/modules/marketing/`), específicamente en:
  - `whatsapp.service.ts` (`25KB`): Que probablemente consume la API oficial de Meta o de un tercero (Twilio/Messagebird/Whapi).
  - `template.service.ts` y `workflow.service.ts`: Que orquestan la lectura de los `Playbook` y `WhatsAppTemplate` y despachan los mensajes.

## ⚠️ Deuda Técnica y Code Smells Detectados

1. **Naming Falso de Subdominio (AI)**: A pesar de que la documentación original (`SMARTKUBIK_ANALISIS_COMPLETO_2025.md`) lo listaba como "Communications & AI", una revisión de los esquemas en producción revela cero referencias a vectores, embeddings, llamadas a modelos LLM, o parámetros de inteligencia artificial. No existen tablas como `PromptHistory`, `AIInteraction`, etc. El término "AI" parece ser un artefacto residual del roadmap futuro o del pitch de ventas.
2. **Fuerte Acoplamiento con Marketing**: Al no existir `/modules/communications/`, los controladores y servicios que despachan mensajes transaccionales (como "Su orden ha sido despachada") viven en el módulo de Marketing. Esto rompe Single Responsibility si Marketing de repente se apaga o falla intentando enviar miles de newsletters en batch, bloqueando la cola de mensajes transaccionales urgentes.
3. **Escalabilidad de Cola de Mensajes (Queuing)**: Los esquemas `PlaybookExecution` indican que habrá tareas en segundo plano (`scheduledFor`). Si el sistema utiliza `setTimeout` de NodeJS en lugar de un Message Broker real (Redis BullMQ/RabbitMQ), los envíos programados se perderán irremediablemente cada vez que el servidor backend se reinicie (y es conocido que ocurren reinicios con pm2 o docker).

---

**Siguientes Pasos Recomendados (Roadmap a futuro):**
- **Extraer `CommunicationsModule`**: Sacar `whatsapp.service.ts` y el motor de correos electrónicos fuera del Módulo de Marketing y crear un servicio genérico e independiente que sea inyectado en *Orders*, *Marketing* y *HR*.
- **Desmitificar AI**: A menos que la IA de OpenAI esté ofuscada y corriendo Serverless, eliminar el sufijo "& AI" del nombramiento hasta que se lance la feature con esquemas reales.
