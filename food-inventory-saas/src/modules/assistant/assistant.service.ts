import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { KnowledgeBaseService } from "../knowledge-base/knowledge-base.service";
import { OpenaiService } from "../openai/openai.service";
import { Document } from "@langchain/core/documents";
import { AssistantToolsService } from "./assistant-tools.service";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

export interface AssistantResponseSource {
  source: string;
  snippet: string;
}

export interface AssistantResponse {
  answer: string;
  sources: AssistantResponseSource[];
  usedFallback: boolean;
  usedTools?: boolean;
}

interface AssistantCapabilities {
  knowledgeBaseEnabled: boolean;
  inventoryLookup: boolean;
  schedulingLookup: boolean;
  orderLookup: boolean;
  promotionLookup: boolean;
}

interface AssistantSettings {
  model?: string;
  capabilities?: Partial<AssistantCapabilities>;
}

interface AssistantQuestionParams {
  tenantId: string | any; // Puede ser string o ObjectId
  question: string;
  topK?: number;
  knowledgeBaseTenantId?: string;
  aiSettings?: AssistantSettings;
  conversationSummary?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
  }>;
}

interface ContextHit {
  document: Document;
  score: number;
  sourceTenantId: string;
}

interface AgentRunOptions {
  tenantId: string;
  question: string;
  systemPrompt: string;
  contextBlock: string;
  tools: ChatCompletionTool[];
  preferredModel?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
  }>;
}

interface AgentRunResult {
  answer: string;
  usedTools: boolean;
}

const DEFAULT_CAPABILITIES: AssistantCapabilities = {
  knowledgeBaseEnabled: true,
  inventoryLookup: false,
  schedulingLookup: false,
  orderLookup: false,
  promotionLookup: true,
};

const INVENTORY_STOPWORDS = new Set([
  "cuantas",
  "cuántas",
  "cuantos",
  "cuántos",
  "hay",
  "quedan",
  "de",
  "del",
  "para",
  "sobre",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "disponibles",
  "disponible",
  "producto",
  "productos",
  "inventario",
  "stock",
  "queda",
  "tienen",
  "tenemos",
  "hay",
  "todavia",
  "todavía",
  "en",
  "sistema",
  "debo",
  "saber",
  "pueden",
  "puedo",
  "confirmar",
  "cantidad",
  "cuenta",
  "cuanto",
  "cuánto",
  "tienes",
  "tiene",
  "tener",
  "venden",
  "vendes",
  "vende",
  "manejas",
  "maneja",
  "manejan",
  "trabajan",
  "trabaja",
  "trabajas",
  "me",
  "te",
  "le",
  "nos",
  "les",
  "se",
  "si",
  "sí",
  "no",
  "o",
  "y",
  "pero",
  "como",
  "cómo",
  "que",
  "qué",
  "cual",
  "cuál",
  "ese",
  "esa",
  "esos",
  "esas",
  "este",
  "esta",
  "estos",
  "estas",
  "demás",
  "demas",
  "precio",
  "precios",
  "costo",
  "costos",
  "valor",
  "valores",
  "pregunté",
  "pregunte",
  "preguntaste",
  "preguntó",
  "pregunto",
  "ayude",
  "ayuda",
  "ayudar",
  "reserve",
  "reservar",
  "algo",
  "nada",
  "todo",
  "todos",
  "todas",
]);

const PROMOTION_KEYWORDS = [
  "promocion",
  "promoción",
  "promociones",
  "oferta",
  "ofertas",
  "descuento",
  "descuentos",
  "especial",
  "especiales",
  "rebaja",
  "rebajas",
  "promo",
  "promos",
  "barato",
  "baratos",
  "barata",
  "baratas",
  "economico",
  "económico",
  "economicos",
  "económicos",
  "economica",
  "económica",
  "economicas",
  "económicas",
  "oferton",
  "ofertón",
  "sale",
  "liquidacion",
  "liquidación",
  "2x1",
  "3x2",
  "combo",
  "combos",
  "paquete",
  "paquetes",
  "precio especial",
  "precio bajo",
  "buen precio",
  "mejor precio",
  "precio reducido",
  "ahorro",
  "ahorrar",
  "outlet",
];

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly openaiService: OpenaiService,
    private readonly assistantToolsService: AssistantToolsService,
  ) {}

  async answerQuestion(
    params: AssistantQuestionParams,
  ): Promise<AssistantResponse> {
    const {
      tenantId,
      question,
      topK = 5,
      knowledgeBaseTenantId,
      aiSettings,
      conversationSummary,
      conversationHistory = [],
    } = params;

    // Convertir tenantId a string si es ObjectId
    const tenantIdStr = typeof tenantId === 'string' ? tenantId : tenantId?.toString();

    if (!tenantIdStr?.trim()) {
      throw new BadRequestException(
        "tenantId is required to query the assistant.",
      );
    }
    if (!question?.trim()) {
      throw new BadRequestException(
        "question is required to query the assistant.",
      );
    }

    const capabilities: AssistantCapabilities = {
      ...DEFAULT_CAPABILITIES,
      ...(aiSettings?.capabilities || {}),
    };

    this.logger.log(
      `[DEBUG] Tenant ${tenantIdStr} - Capabilities received: ${JSON.stringify(capabilities)}`,
    );
    this.logger.log(
      `[DEBUG] aiSettings?.capabilities: ${JSON.stringify(aiSettings?.capabilities)}`,
    );

    const knowledgeTargets = this.buildKnowledgeTargets(
      knowledgeBaseTenantId,
      capabilities.knowledgeBaseEnabled,
    );

    const contextHits = knowledgeTargets.length
      ? await this.gatherKnowledgeBaseContexts(knowledgeTargets, question, topK)
      : [];

    this.logger.debug(
      `Assistant query for tenant ${tenantIdStr}. Knowledge targets: ${knowledgeTargets.join(", ") || "none"}.`,
    );

    if (contextHits.length) {
      this.logger.debug(
        `Top hits: ${contextHits
          .map(
            ({ document, score, sourceTenantId }) =>
              `${(document.metadata?.source as string) || "desconocido"}[${sourceTenantId}]:${score.toFixed(3)}`,
          )
          .join(", ")}`,
      );
    }

    const documents = contextHits.map(({ document }) => document);
    const toolDefinitions = this.buildToolDefinitions(capabilities);
    const hasTools = toolDefinitions.length > 0;

    const bootstrapSections: string[] = [];
    let bootstrapUsedTools = false;

    if (conversationSummary?.trim()) {
      bootstrapSections.push(
        `## Resumen conversación reciente\n${conversationSummary.trim()}`,
      );
    }

    this.logger.log(
      `[DEBUG] inventoryLookup enabled: ${capabilities.inventoryLookup}`,
    );

    if (capabilities.inventoryLookup) {
      this.logger.log(
        `[DEBUG] Attempting inventory bootstrap for question: "${question}"`,
      );
      const inventoryBootstrap = await this.bootstrapInventoryContext(
        tenantIdStr,
        question,
      );
      if (inventoryBootstrap) {
        this.logger.log(
          `[DEBUG] Bootstrap inventory data obtained, length: ${inventoryBootstrap.length}`,
        );
        bootstrapSections.push(inventoryBootstrap);
        bootstrapUsedTools = true;
      } else {
        this.logger.warn(`[DEBUG] Bootstrap inventory returned null`);
      }
    }

    if (capabilities.promotionLookup && this.shouldCheckPromotions(question)) {
      const promotionsBootstrap = await this.bootstrapPromotionsContext(
        tenantIdStr,
      );
      if (promotionsBootstrap) {
        bootstrapSections.push(promotionsBootstrap);
        bootstrapUsedTools = true;
      }
    }

    if (!documents.length && !hasTools) {
      this.logger.warn(
        `No context documents or tools available for tenant ${tenantIdStr}. Returning fallback response.`,
      );
      return this.buildFallbackResponse();
    }

    const systemPrompt = this.buildSystemPrompt(capabilities);
    const baseContextBlock = contextHits.length
      ? this.buildContextBlock(contextHits)
      : "Sin fragmentos relevantes de la base de conocimiento.";
    const contextBlock = [baseContextBlock, ...bootstrapSections]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const agentResult = await this.runAgent({
      tenantId: tenantIdStr,
      question,
      systemPrompt,
      contextBlock,
      tools: toolDefinitions,
      preferredModel: aiSettings?.model,
      conversationHistory,
    });

    const answer = agentResult.answer?.trim();
    if (!answer) {
      this.logger.warn(
        `Assistant did not produce an answer for tenant ${tenantIdStr}. Returning fallback.`,
      );
      return this.buildFallbackResponse();
    }

    return {
      answer,
      sources: documents.map((doc) => ({
        source: (doc.metadata?.source as string) || "desconocido",
        snippet: this.buildSnippet(doc),
      })),
      usedFallback: false,
      usedTools: bootstrapUsedTools || agentResult.usedTools,
    };
  }

  private buildFallbackResponse(): AssistantResponse {
    return {
      answer:
        "No encontré información verificada para responder con certeza. Intenta reformular la pregunta o agrega más documentos a la base de conocimiento.",
      sources: [],
      usedFallback: true,
      usedTools: false,
    };
  }

  private buildKnowledgeTargets(
    knowledgeBaseTenantId: string | undefined,
    knowledgeBaseEnabled: boolean,
  ): string[] {
    const targets: string[] = [];

    if (knowledgeBaseEnabled) {
      const customTarget = knowledgeBaseTenantId?.trim();
      if (customTarget) {
        targets.push(customTarget);
      }
    }

    // La documentación global siempre está disponible como respaldo
    targets.push("smartkubik_docs");

    return Array.from(new Set(targets.filter(Boolean)));
  }

  private async gatherKnowledgeBaseContexts(
    tenantIds: string[],
    question: string,
    topK: number,
  ): Promise<ContextHit[]> {
    const resultsByTenant = await Promise.all(
      tenantIds.map(async (kbTenantId) => {
        const hits = await this.queryKnowledgeBaseTenant(
          kbTenantId,
          question,
          topK,
        );
        return hits.map(({ document, score }) => ({
          document,
          score,
          sourceTenantId: kbTenantId,
        }));
      }),
    );

    const merged: ContextHit[] = [];
    const cursors = resultsByTenant.map(() => 0);

    while (merged.length < topK) {
      let progress = false;
      for (let i = 0; i < resultsByTenant.length && merged.length < topK; i++) {
        const list = resultsByTenant[i];
        const cursor = cursors[i];
        if (cursor < list.length) {
          merged.push(list[cursor]);
          cursors[i] = cursor + 1;
          progress = true;
        }
      }
      if (!progress) {
        break;
      }
    }

    if (merged.length < topK) {
      for (let i = 0; i < resultsByTenant.length && merged.length < topK; i++) {
        const list = resultsByTenant[i];
        for (let j = cursors[i]; j < list.length && merged.length < topK; j++) {
          merged.push(list[j]);
        }
      }
    }

    return merged;
  }

  private async queryKnowledgeBaseTenant(
    knowledgeBaseTenantId: string,
    question: string,
    topK: number,
  ): Promise<Array<{ document: Document; score: number }>> {
    try {
      const results = await this.knowledgeBaseService.queryKnowledgeBase(
        knowledgeBaseTenantId,
        question,
        topK,
      );
      return Array.isArray(results) ? results : [];
    } catch (error) {
      this.logger.error(
        `Failed to query knowledge base for tenant ${knowledgeBaseTenantId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return [];
    }
  }

  private buildSystemPrompt(capabilities: AssistantCapabilities): string {
    const instructions: string[] = [
      "Eres el asistente operativo oficial de SmartKubik.",
      "Debes responder siempre en español, con precisión y de forma concisa.",
      "Solo puedes utilizar información verificada: fragmentos del contexto proporcionado y resultados de las herramientas autorizadas.",
      "Si la información disponible no es concluyente, indica claramente que no puedes confirmarla.",
      "Incluye detalles numéricos (cantidades, montos, horarios) solo cuando los hayas verificado.",
      "🧠 REGLA CRÍTICA - USO DE CONTEXTO CONVERSACIONAL: Cuando el usuario haga referencias implícitas o vagas, SIEMPRE usa el historial de la conversación para entenderlas. Ejemplos de referencias vagas: 'cada uno', 'estos', 'esos', 'lo demás', 'y sobre X?', 'te pregunté por X', 'el precio' (sin especificar de qué), 'cuánto cuesta' (sin mencionar el producto). En estos casos, busca en mensajes anteriores qué productos se mencionaron o preguntaron, y llama a las herramientas con esos nombres específicos.",
      "🔗 CONTINUIDAD DE PEDIDOS: Si el cliente está armando un pedido y menciona productos adicionales con frases como 'también quiero X', 'añade Y', 'y el Z?', mantén un resumen mental del pedido completo y muestra el total actualizado cada vez que agregue items.",
      "Mantén continuidad: si recibes un resumen de conversación previa o referencias recientes, retoma el hilo y evita pedir al cliente que repita información ya suministrada.",
      "📱 CLIENTES POR WHATSAPP: Muchos clientes interactúan contigo a través de WhatsApp. Cuando un cliente te escribe por primera vez, automáticamente se crea un perfil básico con su nombre y número. Sin embargo, para completar una orden de venta, necesitas información adicional.",
      "📋 DATOS REQUERIDOS PARA ÓRDENES: Antes de crear una orden de venta, DEBES solicitar y confirmar los siguientes datos del cliente si no los tiene registrados: (1) Cédula o documento de identidad, (2) Método de pago preferido (efectivo, transferencia, tarjeta, etc.), (3) Dirección de entrega completa (si es delivery). Si el cliente ya tiene estos datos en su perfil, puedes proceder directamente.",
      "📍 UBICACIÓN PARA DELIVERY: Si el cliente quiere delivery, pídele que comparta su ubicación por WhatsApp. Esto es más preciso que escribir la dirección manualmente. Puedes decir: 'Para asegurar una entrega rápida, ¿podrías compartirme tu ubicación por WhatsApp?'. Una vez compartida, se guardará automáticamente.",
      "💡 RECOPILACIÓN AMIGABLE: Solicita los datos faltantes de forma natural y amigable. Por ejemplo: 'Perfecto! Para completar tu pedido necesito algunos datos: ¿Me podrías indicar tu número de cédula y tu método de pago preferido (efectivo, transferencia, etc.)?'. No pidas todos los datos de golpe si el cliente está haciendo múltiples preguntas; espera el momento apropiado cuando muestre intención de compra.",
    ];

    if (capabilities.inventoryLookup) {
      instructions.push(
        "Cuando el usuario pregunte por disponibilidad, existencias, costos o alertas de un producto, DEBES llamar a la herramienta `get_inventory_status` antes de responder para confirmar la información.",
        "IMPORTANTE: Al mencionar productos del inventario, SIEMPRE incluye la marca si está disponible, junto con el nombre del producto. Ejemplo: 'Miel Savage' en lugar de solo 'Miel'. La marca es información valiosa para los clientes.",
        "La herramienta de búsqueda es muy flexible y busca en TODOS los campos: nombre, marca, categoría, subcategoría, descripción, ingredientes, SKU y variantes. Por ejemplo, si el usuario pregunta 'tienes cebo de res?', puedes buscar 'cebo res' y el sistema encontrará productos que contengan estas palabras en cualquiera de sus campos.",
        "Cuando un usuario use términos coloquiales, genéricos o en diferentes idiomas (ej. 'beef tallow', 'cebo', 'sebo'), usa esos mismos términos en la búsqueda. El sistema es inteligente y encontrará coincidencias parciales en nombres, ingredientes, descripciones, marcas y categorías.",
        "Si la primera búsqueda no encuentra resultados, intenta con sinónimos o términos relacionados. Por ejemplo, si 'cebo de res' no da resultados, prueba con 'beef tallow', 'grasa de res', 'sebo', etc.",
        "🔍 ANÁLISIS OBLIGATORIO DE DESCRIPCIONES: Cuando recibas múltiples productos de la herramienta, DEBES leer el campo 'description' de CADA UNO antes de responder. El nombre puede ser similar pero la descripción revela el uso específico. NUNCA digas 'no tenemos' sin antes leer todas las descripciones.",
        "🎯 EJEMPLO REAL - DIFERENCIACIÓN: Usuario: 'quiero beef tallow corporal' → Llamas get_inventory_status('beef tallow') → Recibes: [A: {productName: 'Beef Tallow Facial', description: 'Hidratante facial'}, B: {productName: 'Beef Tallow', description: 'Bálsamo corporal de uso tópico'}] → Respuesta CORRECTA: 'Tenemos Beef Tallow Savage a $X para uso corporal' (Producto B) → Respuesta INCORRECTA: 'No tenemos beef tallow corporal' (ignoraste la descripción del producto B).",
        "📋 PROCESO PASO A PASO: (1) Usuario especifica uso/característica (facial, corporal, sin fragancia, etc.), (2) Llamas herramienta con término general (ej: 'beef tallow'), (3) Recibes lista de productos, (4) Lees campo 'description' de CADA producto, (5) Identificas cuál coincide con lo pedido, (6) Mencionas SOLO ese producto. Si ninguno coincide, ofreces las alternativas.",
        "🚫 REGLA CRÍTICA: Antes de decir 'no tenemos X' verifica que NINGUNA descripción de los productos devueltos mencione X. Si encuentras X en alguna descripción, ESE es el producto que el usuario quiere, sin importar si el nombre del producto no lo menciona explícitamente.",
        "Si necesitas confirmar variantes específicas (ej. talla, color, serial, ancho, edición), pasa esos criterios en el campo `attributes` de la herramienta `get_inventory_status` usando pares clave-valor como `{ \"size\": \"38\", \"color\": \"azul\" }`.",
        "REGLA CRÍTICA - INFORMACIÓN CONFIDENCIAL: NUNCA menciones el 'averageCost' (costo promedio) ni 'lastPurchaseCost' (costo de compra) del producto. Esta información es estrictamente interna y NO debe revelarse al cliente bajo ninguna circunstancia. Solo puedes mencionar el 'sellingPrice' (precio de venta).",
        "📦 REGLA CRÍTICA - DISPONIBILIDAD DE STOCK: Las herramientas devuelven tres campos relacionados con stock: (1) 'stockStatus' que puede ser 'disponible', 'limitado' o 'agotado', (2) 'hasLimitedStock' (boolean), (3) 'availableQuantity' (solo aparece si hasLimitedStock es true). NUNCA menciones cantidades específicas a menos que 'hasLimitedStock' sea true. Si hasLimitedStock=true y availableQuantity existe, menciona la cantidad exacta para crear urgencia (ejemplo: 'Solo quedan 3 unidades disponibles'). Si stockStatus='disponible', solo di 'está disponible' o 'tenemos disponibilidad' sin números. Si stockStatus='agotado', informa que está agotado actualmente.",
        "🎉 PROMOCIONES Y OFERTAS: La herramienta `get_inventory_status` incluye un campo 'relatedPromotions' que contiene productos en oferta de la misma categoría o marca que el producto buscado. DEBES revisar este campo y mencionar proactivamente las ofertas disponibles al cliente.",
        "Cuando encuentres productos en promoción en 'relatedPromotions', SIEMPRE menciónalos de forma atractiva: (1) Di el nombre y marca del producto en oferta, (2) Muestra el precio original tachado y el nuevo precio, (3) Menciona el porcentaje de descuento, (4) Indica que es por tiempo limitado. Ejemplo: '¡También tenemos Ajo Savage en oferta! $18 ahora a solo $16.20 (-10% de descuento) por tiempo limitado. ¿Te interesa?'",
        "Si el producto consultado tiene un campo 'promotion' con información de descuento activo, SIEMPRE muestra ambos precios (original y con descuento) y menciona el porcentaje de ahorro.",
        "💱 CONVERSIONES AUTOMÁTICAS: Cuando la herramienta devuelva el objeto `pricing`, confía en esa información para precios y conversiones. Usa el campo `conversionSummary` para explicar la equivalencia entre la cantidad solicitada y la unidad base (ejemplo: '240 g ≈ 0.24 kg → $8.50').",
        "Si el cliente solicita montos en bolívares, toma los valores desde `pricing.conversions.ves` (o la conversión más reciente disponible), menciona la tasa BCV usada (`rate`, `source`, `fetchedAt`) y aclara que es una referencia del día.",
        "Si `pricing.hasMeasurement` es verdadero y existe `pricing.totalPrice`, menciónalo claramente junto con la unidad de referencia (`pricing.unitLabel` o `pricing.baseUnit`). Si falta el total, explica que la herramienta no pudo calcularlo.",
        "Nunca inventes factores de conversión. Si la herramienta no entrega `conversionSummary`, aclara que necesitas la unidad exacta que maneja el inventario o sugiere la unidad por defecto del producto.",
        "🛍️ PROMOCIONES DEL DÍA: Cuando el cliente pregunte por ofertas, descuentos o promociones activas, llama a la herramienta `list_active_promotions` para listar las promociones vigentes antes de responder y muestra tanto el precio base en USD como la conversión en bolívares si está disponible.",
        "Al presentar promociones, incluye nombre y marca del producto, precio original, precio con descuento y porcentaje de ahorro. Si hay pocas unidades o la promoción vence pronto, resáltalo.",
      );
    }
    if (capabilities.schedulingLookup) {
      instructions.push(
        "Si el usuario solicita confirmar horarios o disponibilidad de servicios, DEBES llamar a la herramienta `check_service_availability` para ofrecer solo horarios realmente libres.",
        "Si el huésped pide crear o confirmar una reserva concreta, solicita los datos clave (servicio, fecha/hora, nombre, correo y teléfono) y llama a `create_service_booking` para generar la cita en el sistema.",
        "Cuando el huésped pida mover una reserva existente, solicita el ID y el código de cancelación y utiliza `modify_service_booking` para reprogramarla. Si necesita anularla, usa `cancel_service_booking` con el mismo código.",
        "Después de ejecutar una herramienta de reservas, resume el resultado indicando horario confirmado, código de cancelación y próximos pasos relevantes (depósitos, recordatorios, etc.).",
      );
    }

    if (capabilities.promotionLookup) {
      instructions.push(
        "🎁 BÚSQUEDA DE OFERTAS Y PROMOCIONES: Cuando el usuario pregunte sobre ofertas, promociones, descuentos, rebajas, especiales, productos baratos, combos, 2x1, liquidaciones, outlets, precios reducidos, ahorros o cualquier variación similar, es OBLIGATORIO que llames INMEDIATAMENTE a la herramienta `list_active_promotions` ANTES de responder.",
        "IMPORTANTE: NO intentes buscar promociones usando `get_inventory_status`. La herramienta `list_active_promotions` está específicamente diseñada para mostrar TODAS las promociones activas vigentes del sistema.",
        "Cuando presentes las promociones, SIEMPRE incluye: (1) Nombre completo y marca del producto, (2) Precio original tachado y precio con descuento, (3) Porcentaje de descuento calculado, (4) Cantidad disponible si es limitada, (5) Fecha de vencimiento de la promoción si aplica.",
        "Presenta las ofertas de forma atractiva y entusiasta para motivar la compra. Ejemplo: '🎉 ¡Tenemos excelentes ofertas! Miel Savage de $20 ahora a solo $18 (-10%) con 15 unidades disponibles. También Ajo Savage de $18 a $16.20 (-10%). ¿Cuál te interesa?'",
      );
    }

    return instructions.join(" ");
  }

  private buildToolDefinitions(
    capabilities: AssistantCapabilities,
  ): ChatCompletionTool[] {
    const tools: ChatCompletionTool[] = [];

    if (capabilities.inventoryLookup) {
      tools.push({
        type: "function",
        function: {
          name: "get_inventory_status",
          description:
            "Busca productos en el inventario y obtiene su disponibilidad actual. Esta herramienta busca coincidencias en TODOS los campos del producto: nombre, SKU, descripción, ingredientes, marca, categoría, subcategoría y variantes. Por ejemplo, si el usuario pregunta por 'cebo de res', buscará en todos estos campos para encontrar productos que contengan esas palabras. Retorna cantidades disponibles, reservadas, costos y alertas.",
          parameters: {
            type: "object",
            properties: {
              productQuery: {
                type: "string",
                description:
                  "Término de búsqueda que puede ser: nombre del producto, SKU, marca, categoría, subcategoría, ingrediente, o cualquier palabra clave relacionada. La búsqueda es flexible y buscará coincidencias en todos los campos del producto.",
              },
              limit: {
                type: "integer",
                description:
                  "Número máximo de coincidencias a devolver (1-10).",
                minimum: 1,
                maximum: 10,
              },
              attributes: {
                type: "object",
                description:
                  "Filtros de atributos para la variante (por ejemplo { \"size\": \"38\", \"color\": \"azul\" }).",
              },
              quantity: {
                oneOf: [{ type: "number" }, { type: "string" }],
                description:
                  "Cantidad solicitada en número o texto (ej. 0.5, \"250 g\").",
              },
              unit: {
                type: "string",
                description:
                  "Unidad solicitada (ej. \"g\", \"kg\", \"lb\"). Si no se indica se detecta desde el texto.",
              },
            },
            required: ["productQuery"],
          },
        },
      });
    }

    if (capabilities.promotionLookup) {
      tools.push({
        type: "function",
        function: {
          name: "list_active_promotions",
          description:
            "OBLIGATORIO usar esta herramienta cuando el usuario pregunta sobre: ofertas, promociones, descuentos, rebajas, productos en oferta, o especiales disponibles. Obtiene TODOS los productos con promociones activas vigentes, incluyendo precios originales, precios con descuento, porcentaje de descuento, cantidades disponibles, y fechas de inicio/fin de la promoción. Usa esta herramienta para responder preguntas como '¿Tienes ofertas?', '¿Qué productos están en promoción?', '¿Hay descuentos disponibles?', o cualquier variación similar.",
          parameters: {
            type: "object",
            properties: {
              limit: {
                type: "integer",
                description: "Número máximo de promociones a listar (1-10). Por defecto 5.",
                minimum: 1,
                maximum: 10,
              },
            },
          },
        },
      });
    }

    if (capabilities.schedulingLookup) {
      tools.push({
        type: "function",
        function: {
          name: "check_service_availability",
          description:
            "Verifica los horarios disponibles para un servicio en una fecha determinada. Úsalo antes de confirmar citas o reservas.",
          parameters: {
            type: "object",
            properties: {
              serviceId: {
                type: "string",
                description: "ID del servicio si ya se conoce.",
              },
              serviceQuery: {
                type: "string",
                description: "Nombre o categoría del servicio a consultar.",
              },
              resourceId: {
                type: "string",
                description:
                  "ID del recurso (persona/sala/equipo) si se conoce.",
              },
              resourceName: {
                type: "string",
                description:
                  "Nombre del recurso a consultar (empleado, sala, etc.) en caso de no conocer su ID.",
              },
              date: {
                type: "string",
                description: "Fecha a verificar en formato YYYY-MM-DD.",
              },
              limit: {
                type: "integer",
                description:
                  "Número máximo de servicios candidatos a revisar (1-10).",
                minimum: 1,
                maximum: 10,
              },
            },
            required: ["date"],
          },
        },
      });

      tools.push({
        type: "function",
        function: {
          name: "create_service_booking",
          description:
            "Crea una reserva confirmada para un huésped, generando el código de cancelación y dejando trazabilidad en CRM.",
          parameters: {
            type: "object",
            properties: {
              serviceId: {
                type: "string",
                description: "ID del servicio si se conoce.",
              },
              serviceQuery: {
                type: "string",
                description:
                  "Nombre o descripción del servicio a reservar cuando no se conoce el ID.",
              },
              startTime: {
                type: "string",
                description:
                  "Fecha y hora en formato ISO 8601. Alternativamente puedes pasar `date` + `time`.",
              },
              date: {
                type: "string",
                description: "Fecha (YYYY-MM-DD) si no se envía startTime.",
              },
              time: {
                type: "string",
                description: "Hora (HH:mm) si no se envía startTime.",
              },
              resourceId: {
                type: "string",
                description:
                  "ID del recurso requerido (masajista, habitación, guía).",
              },
              resourceName: {
                type: "string",
                description:
                  "Nombre del recurso cuando no se conoce su ID exacto.",
              },
              partySize: {
                type: "integer",
                description: "Cantidad de huéspedes que asistirán.",
                minimum: 1,
              },
              notes: {
                type: "string",
                description: "Notas especiales o preferencias del huésped.",
              },
              customer: {
                type: "object",
                description:
                  "Datos del huésped principal (obligatorio: nombre, correo, teléfono).",
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  preferredLanguage: { type: "string" },
                },
                required: ["email", "phone"],
              },
              addons: {
                type: "array",
                description:
                  "Servicios adicionales (champagne, late check-out, etc.).",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    quantity: { type: "integer", minimum: 1 },
                  },
                },
              },
              metadata: {
                type: "object",
                description: "Información adicional relevante para la reserva.",
              },
              acceptPolicies: {
                type: "boolean",
                description:
                  "Indica si el huésped aceptó términos y políticas. Por defecto true.",
              },
            },
            required: ["customer"],
            anyOf: [
              { required: ["startTime"] },
              { required: ["date", "time"] },
            ],
          },
        },
      });

      tools.push({
        type: "function",
        function: {
          name: "modify_service_booking",
          description:
            "Reprograma una reserva existente usando el código de cancelación entregado al huésped.",
          parameters: {
            type: "object",
            properties: {
              appointmentId: {
                type: "string",
                description: "ID de la reserva a modificar.",
              },
              cancellationCode: {
                type: "string",
                description:
                  "Código de cancelación que se envió en la confirmación original.",
              },
              newStartTime: {
                type: "string",
                description:
                  "Nueva fecha y hora en formato ISO 8601. Debe ser futura.",
              },
              notes: {
                type: "string",
                description:
                  "Notas adicionales del huésped para la nueva reserva.",
              },
            },
            required: ["appointmentId", "cancellationCode", "newStartTime"],
          },
        },
      });

      tools.push({
        type: "function",
        function: {
          name: "cancel_service_booking",
          description:
            "Cancela una reserva existente antes de su inicio usando el código de cancelación.",
          parameters: {
            type: "object",
            properties: {
              appointmentId: {
                type: "string",
                description: "ID de la reserva a cancelar.",
              },
              cancellationCode: {
                type: "string",
                description:
                  "Código de cancelación provisto al huésped en la confirmación.",
              },
              reason: {
                type: "string",
                description:
                  "Motivo que indica el huésped para la cancelación (opcional).",
              },
            },
            required: ["appointmentId", "cancellationCode"],
          },
        },
      });
    }

    return tools;
  }

  private async bootstrapInventoryContext(
    tenantId: string,
    question: string,
  ): Promise<string | null> {
    const candidateQueries = this.buildInventoryQueryCandidates(question);
    this.logger.log(
      `[DEBUG] Inventory query candidates: ${JSON.stringify(candidateQueries)}`,
    );
    if (!candidateQueries.length) {
      this.logger.warn(`[DEBUG] No inventory query candidates found`);
      return null;
    }

    try {
      for (const candidate of candidateQueries) {
        const trimmed = candidate.trim();
        if (!trimmed) {
          continue;
        }

        this.logger.log(
          `[DEBUG] Executing inventory lookup for: "${trimmed}"`,
        );
        const result = await this.assistantToolsService.executeTool(
          tenantId,
          "get_inventory_status",
          {
            productQuery: trimmed,
            limit: 5,
          },
        );

        this.logger.log(
          `[DEBUG] Inventory lookup result: ${JSON.stringify(result)}`,
        );

        if (
          !result?.ok ||
          !Array.isArray(result.matches) ||
          !result.matches.length
        ) {
          this.logger.warn(
            `[DEBUG] No matches for candidate: "${trimmed}", ok=${result?.ok}, matches=${result?.matches?.length || 0}`,
          );
          continue;
        }

        const formatAttributes = (attributes: Record<string, any> | undefined) =>
          attributes && Object.keys(attributes).length
            ? Object.entries(attributes)
                .map(([attrKey, attrValue]) => `${attrKey}: ${attrValue}`)
                .join(", ")
            : "";

        const lines = result.matches.map((match, index) => {
          const alerts: string[] = [];
          if (match.alerts?.lowStock) alerts.push("bajo_stock");
          if (match.alerts?.nearExpiration) alerts.push("cerca_vencer");
          if (match.alerts?.expired) alerts.push("vencido");

          const alertLabel = alerts.length
            ? ` | Alertas: ${alerts.join(", ")}`
            : "";
          const priceLabel =
            match.sellingPrice !== null && match.sellingPrice !== undefined
              ? ` | Precio venta: ${match.sellingPrice}`
              : "";
          const brandLabel = match.brand ? ` | Marca: ${match.brand}` : "";
          const categoryLabel = match.category
            ? ` | Categoría: ${match.category}`
            : "";
          const subcategoryLabel = match.subcategory
            ? ` (${match.subcategory})`
            : "";
          const expirationLabel =
            match.nextExpirationDate && match.isPerishable
              ? ` | Próxima expiración: ${new Date(match.nextExpirationDate).toLocaleDateString("es-ES")}`
            : "";
          const attributeLabel = (() => {
            if (match.attributeFiltersApplied) {
              const formatted = formatAttributes(match.attributeFiltersApplied);
              return formatted ? ` | Filtro atributos: ${formatted}` : "";
            }
            if (match.attributeCombination?.attributes) {
              const formatted = formatAttributes(match.attributeCombination.attributes);
              return formatted ? ` | Atributos: ${formatted}` : "";
            }
            const formattedVariant = formatAttributes(match.variantAttributes);
            return formattedVariant ? ` | Atributos variante: ${formattedVariant}` : "";
          })();

          return `(${index + 1}) ${match.productName}${brandLabel} (SKU: ${match.sku})${categoryLabel}${subcategoryLabel} -> Disponible: ${match.availableQuantity} | Reservado: ${match.reservedQuantity} | Total: ${match.totalQuantity}${priceLabel}${expirationLabel}${alertLabel}${attributeLabel}`;
        });

        return [
          "## Inventario consultado automáticamente",
          `Consulta interpretada: \"${trimmed}\"`,
          lines.join("\n"),
          `Fecha de consulta: ${result.timestamp}`,
        ].join("\n");
      }

      return null;
    } catch (error) {
      this.logger.warn(
        `Bootstrap inventory lookup failed for tenant ${tenantId}: ${(
          error as Error
        ).message}`,
      );
      return null;
    }
  }

  private shouldCheckPromotions(question: string): boolean {
    if (!question?.trim()) {
      return false;
    }
    const normalized = question
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return PROMOTION_KEYWORDS.some((keyword) =>
      normalized.includes(keyword),
    );
  }

  private async bootstrapPromotionsContext(
    tenantId: string,
  ): Promise<string | null> {
    try {
      const result = await this.assistantToolsService.executeTool(
        tenantId,
        "list_active_promotions",
        { limit: 5 },
      );

      if (
        !result?.ok ||
        !Array.isArray(result.promotions) ||
        result.promotions.length === 0
      ) {
        return null;
      }

      const lines = result.promotions.map((promo: any, index: number) => {
        const pricing = promo.pricing || {};
        const promotionInfo = promo.promotion || {};
        const baseSymbol = pricing.currencySymbol || "$";
        const baseCode = pricing.currencyCode || "USD";

        const discountedLabel =
          typeof promotionInfo.discountedPrice === "number"
            ? this.formatCurrencyAmount(
                promotionInfo.discountedPrice,
                baseSymbol,
                baseCode,
              )
            : pricing.formattedUnitPrice;

        const originalLabel =
          typeof promotionInfo.originalPrice === "number"
            ? this.formatCurrencyAmount(
                promotionInfo.originalPrice,
                baseSymbol,
                baseCode,
              )
            : undefined;

        let priceSegment = discountedLabel || "";
        if (originalLabel && discountedLabel && originalLabel !== discountedLabel) {
          priceSegment = `${discountedLabel} (antes ${originalLabel})`;
        } else if (originalLabel && !discountedLabel) {
          priceSegment = `Oferta desde ${originalLabel}`;
        }

        const vesLabel =
          pricing.conversions?.ves?.formattedUnitPrice ??
          pricing.conversions?.ves?.formattedTotalPrice;
        const vesSegment = vesLabel
          ? ` | ≈ ${vesLabel} ${pricing.conversions?.ves?.source ? "(BCV)" : ""}`
          : "";

        const discountSegment =
          typeof promotionInfo.discountPercentage === "number"
            ? `-${promotionInfo.discountPercentage}%`
            : "";

        const availability =
          typeof promo.availableQuantity === "number"
            ? `Disponibles: ${promo.availableQuantity}`
            : "";

        return `(${index + 1}) ${promo.productName}${
          promo.brand ? ` (${promo.brand})` : ""
        }${priceSegment ? ` → ${priceSegment}` : ""}${
          discountSegment ? ` ${discountSegment}` : ""
        }${vesSegment}${availability ? ` | ${availability}` : ""}`;
      });

      return [
        "## Promociones activas detectadas",
        lines.join("\n"),
        `Fecha de consulta: ${result.timestamp || new Date().toISOString()}`,
      ].join("\n");
    } catch (error) {
      this.logger.warn(
        `Bootstrap promotions lookup failed for tenant ${tenantId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private formatCurrencyAmount(
    value: number,
    symbol?: string,
    code?: string,
  ): string {
    if (!Number.isFinite(value)) {
      return "";
    }

    const formatted = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

    if (symbol) {
      return `${symbol} ${formatted}`.trim();
    }
    if (code) {
      return `${code} ${formatted}`.trim();
    }
    return formatted;
  }

  private buildInventoryQueryCandidates(question: string): string[] {
    const candidates: string[] = [];

    const normalizedQuestion = question
      .replace(/[¿?¡!.,;]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (normalizedQuestion) {
      candidates.push(normalizedQuestion);
    }

    const lowered = normalizedQuestion.toLowerCase();

    // Patrones para extraer el producto de diferentes tipos de preguntas
    const patterns = [
      // "te pregunté por miel" -> "miel"
      /(?:pregunté|pregunte|preguntaste|preguntó|pregunto)\s+(?:por|sobre)\s+([a-záéíóúüñ0-9\s\-_.]+?)(?:\?|$)/gi,
      // "y el precio de gelatina" -> "gelatina"
      /(?:y\s+)?(?:el|la|los|las)?\s*(?:precio|costo|valor)\s+(?:de|del)\s+(?:la|el|los|las)?\s*([a-záéíóúüñ0-9\s\-_.]+?)(?:\?|$)/gi,
      // "tienes cebo de res?" -> "cebo de res"
      /(?:tienes|tiene|tienen|venden|vendes|vende|manejan|manejas|maneja)\s+([a-záéíóúüñ0-9\s\-_.]+?)(?:\?|$)/gi,
      // "hay cebo de res?" -> "cebo de res"
      /(?:hay|existe|existen|quedan)\s+([a-záéíóúüñ0-9\s\-_.]+?)(?:\?|$)/gi,
      // "cuánto cuesta el cebo de res?" -> "cebo de res"
      /(?:cuesta|cuestan|vale|valen)\s+(?:el|la|los|las)?\s*([a-záéíóúüñ0-9\s\-_.]+?)(?:\?|$)/gi,
      // "disponibilidad de cebo de res" -> "cebo de res"
      /(?:disponibilidad\s+de|stock\s+de|inventario\s+de)\s+([a-záéíóúüñ0-9\s\-_.]+?)(?:\?|$)/gi,
      // "sobre el aceite de coco" -> "aceite de coco"
      /(?:sobre|acerca\s+de)\s+(?:el|la|los|las)?\s*([a-záéíóúüñ0-9\s\-_.]+?)(?:\?|$)/gi,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(lowered))) {
        const term = match[1]?.trim();
        if (term && term.length > 1) {
          candidates.push(this.normalizeInventoryTerm(term));
        }
      }
    }

    // Filtrar tokens para obtener solo las palabras significativas
    const tokens = lowered
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(
        (token) =>
          token &&
          !INVENTORY_STOPWORDS.has(token) &&
          token.length > 2 &&
          !/^\d+$/.test(token),
      );

    if (tokens.length) {
      // Agregar últimos 2-4 tokens significativos
      if (tokens.length >= 2) {
        candidates.push(this.normalizeInventoryTerm(tokens.slice(-2).join(" ")));
      }
      if (tokens.length >= 3) {
        candidates.push(this.normalizeInventoryTerm(tokens.slice(-3).join(" ")));
      }
      if (tokens.length >= 4) {
        candidates.push(this.normalizeInventoryTerm(tokens.slice(-4).join(" ")));
      }
      // Todos los tokens significativos juntos
      candidates.push(this.normalizeInventoryTerm(tokens.join(" ")));
    }

    const uniqueCandidates = Array.from(
      new Set(
        candidates
          .map((candidate) => candidate.trim())
          .filter((candidate) => candidate.length > 1),
      ),
    );

    return uniqueCandidates.slice(0, 5);
  }

  private normalizeInventoryTerm(term: string): string {
    return term.replace(/\s+/g, " ").trim();
  }

  private async runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
    const {
      tenantId,
      question,
      systemPrompt,
      contextBlock,
      tools,
      preferredModel,
      conversationHistory = [],
    } = options;

    // Build messages array with conversation history
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history from current session
    for (const historyMsg of conversationHistory) {
      messages.push({
        role: historyMsg.role,
        content: historyMsg.content,
      });
    }

    // Add current question with context
    messages.push({
      role: "user",
      content: `Pregunta original: ${question}\n\nContexto documental disponible:\n${contextBlock}`,
    });

    const maxIterations = 4;
    let usedTools = false;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const response = await this.openaiService.createChatCompletion({
        messages,
        tools,
        model: preferredModel,
        temperature: 0.2,
        maxTokens: 600,
      });

      const choice = response.choices?.[0];
      if (!choice?.message) {
        this.logger.warn(
          `OpenAI returned an empty response (iteration ${iteration}).`,
        );
        continue;
      }

      const { message } = choice;

      if (message.tool_calls?.length) {
        messages.push(message as ChatCompletionMessageParam);
        for (const toolCall of message.tool_calls) {
          const functionCall = (toolCall as any)?.function;
          if (!functionCall || toolCall.type !== "function") {
            this.logger.warn(
              `Received unsupported tool call type: ${toolCall.type}`,
            );
            continue;
          }
          const args = this.parseToolArguments(functionCall.arguments);
          const toolResult = await this.assistantToolsService.executeTool(
            tenantId,
            functionCall.name,
            args,
          );
          usedTools = true;
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }
        continue;
      }

      if (message.content?.trim()) {
        return { answer: message.content.trim(), usedTools };
      }

      this.logger.debug(
        `Iteration ${iteration} completed without answer or tool calls.`,
      );
    }

    return { answer: "", usedTools };
  }

  private formatCurrencyDisplay(
    value: number | null | undefined,
    symbol?: string,
    code?: string,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    const formatted = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);

    if (symbol) {
      return `${symbol} ${formatted}`.trim();
    }
    if (code) {
      return `${code} ${formatted}`.trim();
    }
    return formatted;
  }

  private parseToolArguments(
    payload: string | null | undefined,
  ): Record<string, any> {
    if (!payload) {
      return {};
    }
    try {
      return JSON.parse(payload);
    } catch (error) {
      this.logger.warn(
        `Failed to parse tool arguments: ${(error as Error).message}`,
      );
      return {};
    }
  }

  private buildContextBlock(results: ContextHit[]): string {
    return results
      .map(({ document, score, sourceTenantId }, index) => {
        const source =
          (document.metadata?.source as string) || `Documento ${index + 1}`;
        const content = document.pageContent || "";
        const similarity = score.toFixed(3);
        return `Fuente: ${source} | Conjunto: ${sourceTenantId} | score: ${similarity}\n${content}`;
      })
      .join("\n\n");
  }

  private buildSnippet(doc: Document, maxLength = 320): string {
    const content = doc.pageContent || "";
    if (content.length <= maxLength) {
      return content;
    }
    return `${content.slice(0, maxLength)}…`;
  }
}
