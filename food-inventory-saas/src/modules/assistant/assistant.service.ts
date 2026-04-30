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
  action?: string;
  data?: any;
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
    role: "user" | "assistant";
    content: string;
    timestamp?: Date;
  }>;
  user?: UserDocument | null;
  mode?: "tenant" | "super-admin" | "owner";
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
    role: "user" | "assistant";
    content: string;
    timestamp?: Date;
  }>;
  user?: UserDocument | null;
  maxTokens?: number;
}

interface AgentRunResult {
  answer: string;
  usedTools: boolean;
  lastToolResult?: Record<string, any>;
  lastToolName?: string;
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
  "ahorrar",
  "outlet",
  // Purchase Intent Keywords (to trigger proactive upselling)
  "quiero",
  "dame",
  "llevo",
  "llevar",
  "comprar",
  "encargar",
  "pedir",
  "ordenar",
  "anotar",
  "agrega",
  "añade",
  "suma",
];

import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly openaiService: OpenaiService,
    private readonly assistantToolsService: AssistantToolsService,
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
  ) { }

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
      user,
      mode = "tenant",
    } = params;

    // Convertir tenantId a string si es ObjectId
    const tenantIdStr =
      typeof tenantId === "string" ? tenantId : tenantId?.toString();

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

    const isSuperAdmin = mode === "super-admin";
    const isOwner = mode === "owner";

    const capabilities: AssistantCapabilities = {
      ...DEFAULT_CAPABILITIES,
      ...(aiSettings?.capabilities || {}),
    };

    this.logger.log(
      `[DEBUG] Tenant ${tenantIdStr} - Mode: ${mode} - Capabilities received: ${JSON.stringify(capabilities)}`,
    );

    // ─── Knowledge Base Targets ──────────────────────────────────────
    const knowledgeTargets = isSuperAdmin
      ? Array.from(new Set(["smartkubik_growth", "smartkubik_docs"].filter(Boolean)))
      : this.buildKnowledgeTargets(knowledgeBaseTenantId, capabilities.knowledgeBaseEnabled);

    const contextHits = knowledgeTargets.length
      ? await this.gatherKnowledgeBaseContexts(knowledgeTargets, question, topK)
      : [];

    this.logger.debug(
      `Assistant query for tenant ${tenantIdStr}. Mode: ${mode}. Knowledge targets: ${knowledgeTargets.join(", ") || "none"}.`,
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

    // ─── Tool Definitions ────────────────────────────────────────────
    const toolDefinitions = isSuperAdmin
      ? this.buildSuperAdminToolDefinitions()
      : isOwner
        ? this.buildOwnerToolDefinitions(capabilities)
        : this.buildToolDefinitions(capabilities, user);
    const hasTools = toolDefinitions.length > 0;

    const bootstrapSections: string[] = [];
    let bootstrapUsedTools = false;

    if (conversationSummary?.trim()) {
      bootstrapSections.push(
        `## Resumen conversación reciente\n${conversationSummary.trim()}`,
      );
    }

    // ─── Tenant-only bootstraps (inventory, promotions) ──────────────
    if (!isSuperAdmin) {
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
        const promotionsBootstrap =
          await this.bootstrapPromotionsContext(tenantIdStr);
        if (promotionsBootstrap) {
          bootstrapSections.push(promotionsBootstrap);
          bootstrapUsedTools = true;
        }
      }
    }

    if (!documents.length && !hasTools) {
      this.logger.warn(
        `No context documents or tools available for tenant ${tenantIdStr}. Returning fallback response.`,
      );
      return this.buildFallbackResponse();
    }

    // ─── System Prompt ───────────────────────────────────────────────
    let systemPrompt: string;
    if (isSuperAdmin) {
      systemPrompt = this.buildSuperAdminSystemPrompt();
    } else if (isOwner) {
      systemPrompt = this.buildOwnerSystemPrompt(user);
    } else {
      const tenantSettings = await this.tenantModel.findById(tenantIdStr).select('settings.paymentMethods').lean();
      systemPrompt = this.buildSystemPrompt(capabilities, tenantSettings?.settings?.paymentMethods, user);
    }

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
      user,
      maxTokens: isSuperAdmin ? 1200 : isOwner ? 1000 : 600,
    });

    const answer = agentResult.answer?.trim();
    if (!answer) {
      this.logger.warn(
        `Assistant did not produce an answer for tenant ${tenantIdStr}. Returning fallback.`,
      );
      return this.buildFallbackResponse();
    }

    const action = agentResult.lastToolName === 'create_order' && agentResult.lastToolResult?.ok ? 'order_created' : undefined;
    const data = agentResult.lastToolName === 'create_order' && agentResult.lastToolResult?.ok ? { orderId: agentResult.lastToolResult.orderId } : undefined;

    this.logger.log(`[DEBUG] Assistant Answer Analysis: tool=${agentResult.lastToolName}, ok=${agentResult.lastToolResult?.ok}, action=${action}`);

    return {
      answer,
      sources: documents.map((doc) => ({
        source: (doc.metadata?.source as string) || "desconocido",
        snippet: this.buildSnippet(doc),
      })),
      usedFallback: false,
      usedTools: bootstrapUsedTools || agentResult.usedTools,
      action,
      data,
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

  private buildSystemPrompt(capabilities: AssistantCapabilities, paymentMethods: any[] = [], user?: UserDocument | null): string {
    if (user) {
      return this.buildEmployeeSystemPrompt(user, capabilities);
    }
    const enabledPaymentMethodsList = paymentMethods?.filter(m => m.enabled) || [];

    // Format list for general acceptance
    const enabledPaymentMethods = enabledPaymentMethodsList
      .map(m => m.name)
      .join(", ") || "Efectivo, Zelle, Transferencia";

    // Format detailed instructions for the AI to answer "Where do I pay?"
    const paymentDetailsConfig = enabledPaymentMethodsList.map(m => {
      let detailsText = `${m.name}: `;
      if (m.details) {
        const d = m.details;
        const parts: string[] = [];
        if (d.bank) parts.push(`Banco: ${d.bank}`);
        if (d.accountNumber) parts.push(`Cuenta: ${d.accountNumber}`);
        if (d.accountName) parts.push(`Titular: ${d.accountName}`);
        if (d.email) parts.push(`Email: ${d.email}`);
        if (d.phoneNumber) parts.push(`Tlf: ${d.phoneNumber}`);
        if (d.cid) parts.push(`ID/RIF: ${d.cid}`);
        detailsText += parts.join(", ");
      }
      if (m.instructions) {
        detailsText += ` (${m.instructions})`;
      }
      return detailsText;
    }).join("\n- ");

    const instructions: string[] = [
      "Eres el asistente operativo oficial de SmartKubik.",
      "Debes responder siempre en español, con precisión, de forma concisa y PERSUASIVA.",
      "Solo puedes utilizar información verificada: fragmentos del contexto proporcionado y resultados de las herramientas autorizadas.",
      "Si la información disponible no es concluyente, indica claramente que no puedes confirmarla.",
      "Incluye detalles numéricos (cantidades, montos, horarios) solo cuando los hayas verificado.",

      "💡 SUGERENCIAS INTELIGENTES: Si confirmas un producto, puedes sugerir amablemente un complemento lógico o mencionar si existe alguna oferta relevante, pero hazlo de forma natural y sin ser invasivo.",

      "🧠 USO DE CONTEXTO: Recuerda lo que el usuario ha mencionado anteriormente (productos, preferencias) para no preguntar lo obvio. Si dice 'quiero eso', asume que se refiere a lo último discutido.",

      "🔄 FLUJO DE CONVERSACIÓN NATURAL:",
      "1. Ayuda al cliente a encontrar lo que busca.",
      "2. Confirma los productos (precio y cantidad). Solo ofrece promociones si realmente existen.",
      "3. Cuando el cliente esté listo, pide los datos necesarios para la orden (Nombre, ID, Pago, Entrega).",
      "4. Muestra un resumen claro antes de crear la orden.",
      "5. Crea la orden y despídete amablemente.",

      "🛒 DATOS REQUERIDOS: Nombre y Apellido, Cédula/RIF, Método de Pago, Método de Entrega. Solo pídelos cuando vayas a cerrar la venta.",
      `💳 MÉTODOS DE PAGO: [${enabledPaymentMethods}]. Info: \n- ${paymentDetailsConfig}`,
      "📍 DELIVERY: Si elige delivery, sugiere compartir la ubicación por WhatsApp.",

      "🔧 USO DE HERRAMIENTAS:",
      "- `create_order`: Úsala SOLO cuando el cliente haya confirmado el resumen final.",
      "- `get_inventory_status`: Úsala para verificar precios y stock. Lee la descripción para diferenciar productos.",
      "- `list_active_promotions`: Úsala si el cliente pregunta por ofertas o si es muy relevante para el producto que está comprando.",

      "📦 STOCK: Solo menciona cantidades si quedan pocas unidades (escasez).",
      "🚫 CONFIDENCIAL: Nunca reveles costos internos.",
    ];

    if (capabilities.schedulingLookup) {
      instructions.push(
        "📅 RESERVAS: Si el usuario pide reservar servicios (no productos), usa `check_service_availability` para ver huecos y `create_service_booking` para confirmar. Pide Nombre, Email, Teléfono.",
        "Para cambios, usa `modify_service_booking`. Para cancelar, `cancel_service_booking`.",
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

  private buildEmployeeSystemPrompt(user: UserDocument, capabilities: AssistantCapabilities): string {
    const instructions: string[] = [
      `Eres el ASISTENTE INTERNO de SmartKubik, asignado al empleado ${user.firstName} ${user.lastName}.`,
      "Tu objetivo es ayudar al empleado a gestionar la operación del negocio de manera eficiente.",
      "Identifícate siempre como sistema operativo, NO como vendedor.",

      "PROTOCOLOS DE RESPUESTA:",
      `1. SALUDO: Si el usuario saluda (Hola, Buenos días), RESPONDE SIEMPRE: 'Hola ${user.firstName}, modo operativo activado. ¿Qué consulta de inventario o sistema necesitas?'`,
      "2. NO uses frases como 'estoy para servirle' o 'bienvenido a Savage'. Sé técnico y directo.",

      "TIENES PERMISO PARA:",
      "1. Revelar información interna (stock exacto, ubicaciones, pero NO costos a menos que se pida explícitamente).",
      "2. Crear órdenes directas sin tanta ceremonia de ventas.",
      "3. Asistir en tareas administrativas.",

      "TONO Y ESTILO:",
      "- Profesional, directo y eficiente.",
      "- No uses lenguaje de ventas ni persuasión.",
      "- Ve al grano con los datos.",

      "HERRAMIENTAS:",
      "- `get_inventory_status`: Úsala para consultas de stock rápidas.",
      "- `create_order`: El empleado puede dictar órdenes rápidas.",
      "- `list_active_promotions`: Para informar al empleado qué promos están activas hoy.",
    ];
    return instructions.join(" ");
  }

  // ─── Super-Admin (CGO) System Prompt ─────────────────────────────
  private buildSuperAdminSystemPrompt(): string {
    const instructions: string[] = [
      "Eres el CHIEF GROWTH OFFICER (CGO) virtual de SmartKubik, la plataforma ERP SaaS multi-tenant para PyMEs en Venezuela y Latinoamérica.",
      "Tu rol es ser el asesor estratégico de negocio del equipo fundador. Respondes SIEMPRE en español, de forma directa, con datos cuando los tengas, y con mentalidad de crecimiento.",

      "ÁREAS DE EXPERTISE:",
      "1. ESTRATEGIA SaaS: pricing, unit economics, LTV/CAC, product-market fit, modelo freemium → paid.",
      "2. ADQUISICIÓN DE TENANTS: funnel de registro, conversión trial-to-paid, canales de adquisición, partnerships, programa de Clientes Fundadores.",
      "3. RETENCIÓN Y EXPANSIÓN: churn analysis, health scores, upsell/cross-sell, feature adoption, NPS.",
      "4. MARKETING Y CONTENIDO: content marketing, SEO, redes sociales (Instagram, TikTok, Facebook), calendario editorial, brand positioning.",
      "5. VENTAS DIRECTAS: visitas presenciales, WhatsApp 1-a-1, grupos de Facebook de gremios, boca a boca, referidos.",
      "6. MERCADO VENEZOLANO: regulaciones, dolarización parcial, métodos de pago locales (Pago Móvil, Binance/USDT, efectivo USD, transferencia bancaria), hiperinflación, desconfianza del gasto, cultura de relaciones > marca.",
      "7. MÉTRICAS Y DATA: interpretar funnel metrics, tenant health scores, MRR, ARR, churn rate, CAC payback.",

      "CONTEXTO CLAVE DE SMARTKUBIK:",
      "- Planes: Fundamental ($39/mes), Crecimiento ($99/mes), Expansión ($149/mes). Los precios base NO se modifican — son el ancla para el descuento de Fundadores.",
      "- Programa de Clientes Fundadores en /fundadores: hasta 51% de descuento DE POR VIDA para los primeros 90 clientes. TODO CTA de conversión apunta a /fundadores.",
      "- Plan Starter gratuito (freemium con límites) como puerta de entrada.",
      "- Free trial de 14 días sin tarjeta de crédito.",
      "- Follow-up automático por WhatsApp post-trial (secuencia día 0-14).",
      "- El target son PyMEs venezolanas tech-resistant, donde WhatsApp es el centro de todo y el boca a boca es el canal #1.",
      "- Solo founder, presupuesto limitado (<$200/mes marketing), máximo 2-3 horas/día para growth.",

      "PROTOCOLOS:",
      "- Cuando tengas datos del funnel o health scores, úsalos para fundamentar recomendaciones concretas.",
      "- Si no tienes datos suficientes, indica qué métricas se necesitan y sugiere cómo obtenerlas.",
      "- Prioriza acciones de alto impacto y bajo esfuerzo (quick wins) para un solo founder.",
      "- Siempre conecta las recomendaciones con el objetivo de crecimiento: llenar los 90 cupos de Fundadores.",
      "- Puedes y debes ser proactivo sugiriendo ideas, incluso si no se preguntaron directamente.",
      "- Usa el framework ICE (Impact, Confidence, Ease) cuando priorices acciones.",

      "HERRAMIENTAS DISPONIBLES:",
      "- `get_funnel_metrics`: Métricas del funnel de registro (tenants registrados, confirmados, activos, pagantes, trials expirando, breakdown por plan).",
      "- `get_tenant_health_scores`: Health scores de tenants activos para identificar riesgo de churn o candidatos a upsell.",
      "- `get_platform_metrics`: Métricas globales de la plataforma (total tenants, total usuarios).",
      "Usa estas herramientas proactivamente cuando la pregunta involucre datos reales del negocio.",

      "FORMATO DE RESPUESTA: Sé estructurado. Usa listas, tablas simples y secciones claras. Máximo 3-4 párrafos por respuesta a menos que se pida un análisis profundo.",
    ];
    return instructions.join(" ");
  }

  // ─── Super-Admin Tool Definitions ────────────────────────────────
  private buildSuperAdminToolDefinitions(): ChatCompletionTool[] {
    return [
      {
        type: "function",
        function: {
          name: "get_funnel_metrics",
          description:
            "Obtiene métricas del funnel de adquisición de SmartKubik: tenants registrados, confirmados, activos, pagantes, trials, trials a punto de expirar (7d), registros recientes (7d y 30d), y breakdown por plan de suscripción. Úsala para responder preguntas sobre cómo va el funnel, la adquisición, o el estado general del negocio.",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_tenant_health_scores",
          description:
            "Calcula health scores para tenants activos. Cada score incluye: perfil (completitud de datos), adopción (productos, órdenes, usuarios, módulos), actividad (órdenes recientes, productos cargados), y plan (tipo de suscripción). Úsala para identificar tenants en riesgo de churn (score bajo), candidatos a upsell (score alto en plan bajo), o para obtener un panorama general de la salud de la base de clientes.",
          parameters: {
            type: "object",
            properties: {
              limit: {
                type: "integer",
                description:
                  "Número máximo de tenants a evaluar (1-50). Por defecto 20.",
                minimum: 1,
                maximum: 50,
              },
              sortBy: {
                type: "string",
                enum: ["total_asc", "total_desc"],
                description:
                  "Ordenar por health score total. 'total_asc' para los peores primero (riesgo de churn), 'total_desc' para los mejores primero. Por defecto 'total_desc'.",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_platform_metrics",
          description:
            "Obtiene métricas globales de alto nivel de la plataforma SmartKubik: total de tenants registrados y total de usuarios. Úsala para preguntas sobre el tamaño o crecimiento general de la plataforma.",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
    ];
  }

  private buildToolDefinitions(
    capabilities: AssistantCapabilities,
    user?: UserDocument | null,
  ): ChatCompletionTool[] {
    const tools: ChatCompletionTool[] = [];

    // --- DOCUMENTACIÓN DE AYUDA (disponible para todos) ---
    tools.push({
      type: "function",
      function: {
        name: "search_help_docs",
        description:
          "Busca en la documentación de ayuda de SmartKubik para encontrar guías paso a paso, soluciones a problemas comunes, y explicaciones de cómo usar cada función del sistema. OBLIGATORIO usar esta herramienta cuando el usuario pregunta: '¿cómo hago X?', '¿dónde está X?', 'no puedo hacer X', 'no funciona X', 'cómo se configura X', o cualquier pregunta sobre cómo usar el software. La documentación cubre: inventario, ventas, POS, compras, proveedores, contabilidad, facturación, transferencias, CRM, configuración, restaurantes, salones de belleza, producción, marketing, nómina, y más.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Término de búsqueda en lenguaje natural. Ejemplos: 'ajustar stock', 'crear orden de compra', 'cierre de caja', 'agregar profesional', 'no me deja completar la orden'. Usa las mismas palabras que el usuario.",
            },
          },
          required: ["query"],
        },
      },
    });

    // --- HERRAMIENTAS ADMINISTRATIVAS (Solo Empleados) ---
    if (user) {
      tools.push({
        type: "function",
        function: {
          name: "get_business_kpis",
          description: "Obtiene un reporte COMPLETO de métricas de negocio: 1) Snapshot en tiempo real (Ventas Hoy, Ordenes, Stock, Alertas). 2) Analítica Avanzada (Tendencia de Ventas vs mes anterior, Top Categorías, Rendimiento de Equipo/Mejores Vendedores, Ingresos vs Gastos). 3) Productos Top Selling y Rotación. Úsala para responder CUALQUIER pregunta sobre el estado del negocio, tendencias, finanzas o rendimiento.",
          parameters: {
            type: "object",
            properties: {}, // No params needed
          }
        }
      });
    }

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
                  'Filtros de atributos para la variante (por ejemplo { "size": "38", "color": "azul" }).',
              },
              quantity: {
                oneOf: [{ type: "number" }, { type: "string" }],
                description:
                  'Cantidad solicitada en número o texto (ej. 0.5, "250 g").',
              },
              unit: {
                type: "string",
                description:
                  'Unidad solicitada (ej. "g", "kg", "lb"). Si no se indica se detecta desde el texto.',
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
                description:
                  "Número máximo de promociones a listar (1-10). Por defecto 5.",
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
          },
        },
      });

      tools.push({
        type: "function",
        function: {
          name: "create_order",
          description:
            "Crea una orden de compra para un cliente (nuevo o existente) con los productos especificados.",
          parameters: {
            type: "object",
            properties: {
              customer: {
                type: "object",
                description: "Datos del cliente. Si es nuevo, intentar obtener nombre y teléfono/rif.",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  rif: { type: "string" },
                  email: { type: "string" },
                },
                required: ["name", "rif"],
              },
              customerId: {
                type: "string",
                description: "ID del cliente si ya existe y se conoce (opcional).",
              },
              paymentMethod: {
                type: "string",
                description: "Método de pago confirmado por el cliente (ej: efectivo, zelle, pagomovil, punto).",
              },
              items: {
                type: "array",
                description: "Lista de productos a comprar.",
                items: {
                  type: "object",
                  properties: {
                    productId: {
                      type: "string",
                      description: "ID del producto (ObjectId) O Nombre/SKU del producto si no se tiene el ID exacto. El sistema buscará coincidencias.",
                    },
                    quantity: {
                      type: "number",
                      description: "Cantidad a comprar.",
                    },
                    variantId: {
                      type: "string",
                      description: "ID de la variante (opcional).",
                    },
                  },
                  required: ["productId", "quantity"],
                },
              },
              deliveryMethod: {
                type: "string",
                enum: ["pickup", "delivery", "store"],
                description: "Método de entrega. Por defecto pickup.",
              },
              notes: {
                type: "string",
                description: "Notas adicionales para la orden.",
              },
            },
            required: ["customer", "items", "paymentMethod", "deliveryMethod"],
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

  // ─── Owner System Prompt ──────────────────────────────────────────
  private buildOwnerSystemPrompt(user?: UserDocument | null): string {
    const ownerName = user ? `${user.firstName}` : 'jefe';
    const instructions: string[] = [
      `Eres el ASISTENTE OPERATIVO PERSONAL de ${ownerName}, dueno/administrador de este negocio en SmartKubik.`,
      "Tu objetivo es ser la mano derecha del dueno: ejecutar cualquier operacion que necesite, dar reportes, crear registros, y sugerir mejoras — todo via WhatsApp, en espanol, con tuteo.",
      "",
      "CAPACIDADES:",
      "1. CONSULTAR: inventario, productos, proveedores, clientes, ordenes, recetas, transferencias, KPIs del negocio.",
      "2. CREAR: productos, proveedores, recetas, ordenes de compra, ajustes de inventario.",
      "3. MODIFICAR: actualizar productos, proveedores, inventario.",
      "4. ANALIZAR: propuestas de compra estrategicas, alertas de stock, patrones de venta, rendimiento de proveedores.",
      "",
      "PROTOCOLO DE ESCRITURA (OBLIGATORIO):",
      "- Para CUALQUIER operacion que modifique datos (crear, editar, eliminar), SIEMPRE:",
      "  1. Resume la accion que vas a ejecutar con todos los datos",
      "  2. Indica que el usuario debe CONFIRMAR antes de ejecutar",
      "  3. NO ejecutes la herramienta directamente — usa el prefijo 'CONFIRMACION_REQUERIDA:' en tu respuesta",
      "  4. Incluye un resumen claro: que se va a crear/modificar, con que datos",
      "",
      "PROTOCOLO DE LECTURA:",
      "- Para consultas (listar, buscar, ver detalles), ejecuta directamente sin pedir confirmacion.",
      "",
      "TONO:",
      "- Directo, eficiente, sin rodeos. Nada de lenguaje de ventas.",
      "- Muestra TODOS los datos relevantes: costos, margenes, cantidades exactas, precios.",
      "- Si algo falta o hay un error, dilo claramente.",
      "- Sugiere mejoras cuando veas oportunidades (stock bajo, proveedores lentos, productos sin rotacion).",
      "",
      "HERRAMIENTAS DISPONIBLES:",
      "- `get_inventory_status`: Buscar productos y ver stock, precios, costos.",
      "- `list_active_promotions`: Ver promociones activas.",
      "- `get_business_kpis`: Metricas del negocio (ventas, ordenes, tendencias, top productos).",
      "- `list_inventory`: Listado rapido de inventario.",
      "- `create_supplier`: Crear un proveedor nuevo.",
      "- `get_suppliers`: Listar/buscar proveedores.",
      "- `create_product`: Crear un producto nuevo.",
      "- `get_products_list`: Listar/buscar productos.",
      "- `update_product`: Actualizar datos de un producto.",
      "- `add_inventory`: Agregar stock a un producto.",
      "- `adjust_inventory`: Ajustar cantidad de inventario.",
      "- `bulk_add_inventory`: Agregar inventario masivo (multiples productos).",
      "- `get_inventory_alerts`: Ver alertas de inventario (stock bajo, por vencer).",
      "- `create_purchase_order`: Crear orden de compra a proveedor.",
      "- `get_purchase_orders`: Listar ordenes de compra.",
      "- `generate_purchase_proposal`: Generar propuesta de compra estrategica basada en consumo y stock.",
      "- `create_recipe`: Crear receta / ficha tecnica.",
      "- `get_recipes`: Listar recetas.",
      "- `get_customers`: Listar/buscar clientes.",
      "- `get_orders_list`: Listar ordenes de venta.",
      "- `get_transfer_orders`: Listar ordenes de transferencia.",
      "- `get_daily_summary`: Resumen del dia (ventas, ordenes, alertas).",
      "- `create_order`: Crear una orden de venta.",
      "- `check_service_availability`: Verificar disponibilidad de servicios.",
      "- `create_service_booking`: Crear cita/reserva.",
      "",
      "FORMATO: Responde de forma estructurada. Usa listas y numeros para que sea facil de leer en WhatsApp. Maximo 1000 caracteres por mensaje a menos que se pida detalle.",
    ];
    return instructions.join("\n");
  }

  // ─── Owner Tool Definitions ───────────────────────────────────────
  private buildOwnerToolDefinitions(capabilities: AssistantCapabilities): ChatCompletionTool[] {
    // Owner gets ALL tenant tools plus CRUD tools
    const tools = this.buildToolDefinitions(capabilities, { firstName: 'Owner' } as any);

    // --- CRUD Tools for Owner ---
    tools.push(
      {
        type: "function",
        function: {
          name: "create_supplier",
          description: "Crea un nuevo proveedor en el sistema. Requiere confirmacion del usuario.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nombre del proveedor" },
              rif: { type: "string", description: "RIF o cedula del proveedor (ej: J-12345678, V-12345678)" },
              contactName: { type: "string", description: "Nombre de la persona de contacto" },
              contactPhone: { type: "string", description: "Telefono de contacto" },
              contactEmail: { type: "string", description: "Email de contacto" },
              categories: { type: "array", items: { type: "string" }, description: "Categorias de productos que suministra" },
            },
            required: ["name"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_suppliers",
          description: "Lista o busca proveedores del negocio.",
          parameters: {
            type: "object",
            properties: {
              search: { type: "string", description: "Texto para buscar por nombre, RIF, o categoria" },
              limit: { type: "integer", description: "Maximo de resultados (1-20)", minimum: 1, maximum: 20 },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_product",
          description: "Crea un nuevo producto en el catalogo. Requiere confirmacion del usuario.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nombre del producto" },
              sku: { type: "string", description: "SKU (se genera automaticamente si no se provee)" },
              price: { type: "number", description: "Precio de venta (USD)" },
              cost: { type: "number", description: "Costo del producto (USD)" },
              category: { type: "string", description: "Categoria del producto" },
              unit: { type: "string", description: "Unidad de medida (ej: kg, unidad, litro)" },
              brand: { type: "string", description: "Marca del producto" },
            },
            required: ["name", "price"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_products_list",
          description: "Lista o busca productos del catalogo con precios, costos y stock.",
          parameters: {
            type: "object",
            properties: {
              search: { type: "string", description: "Texto para buscar por nombre, SKU, marca o categoria" },
              category: { type: "string", description: "Filtrar por categoria" },
              limit: { type: "integer", description: "Maximo de resultados (1-30)", minimum: 1, maximum: 30 },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "update_product",
          description: "Actualiza datos de un producto existente. Requiere confirmacion del usuario.",
          parameters: {
            type: "object",
            properties: {
              productName: { type: "string", description: "Nombre o SKU del producto a actualizar" },
              newPrice: { type: "number", description: "Nuevo precio de venta (USD)" },
              newCost: { type: "number", description: "Nuevo costo (USD)" },
              newName: { type: "string", description: "Nuevo nombre" },
              newCategory: { type: "string", description: "Nueva categoria" },
            },
            required: ["productName"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "add_inventory",
          description: "Agrega stock de un producto al inventario. Requiere confirmacion del usuario.",
          parameters: {
            type: "object",
            properties: {
              productName: { type: "string", description: "Nombre o SKU del producto" },
              quantity: { type: "number", description: "Cantidad a agregar" },
              cost: { type: "number", description: "Costo unitario (USD)" },
              lotNumber: { type: "string", description: "Numero de lote (opcional)" },
              expirationDate: { type: "string", description: "Fecha de vencimiento ISO 8601 (opcional)" },
            },
            required: ["productName", "quantity"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "adjust_inventory",
          description: "Ajusta la cantidad de inventario de un producto (correccion, merma, conteo). Requiere confirmacion.",
          parameters: {
            type: "object",
            properties: {
              productName: { type: "string", description: "Nombre o SKU del producto" },
              newQuantity: { type: "number", description: "Nueva cantidad total" },
              reason: { type: "string", description: "Razon del ajuste (merma, conteo fisico, correccion, etc.)" },
            },
            required: ["productName", "newQuantity", "reason"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "bulk_add_inventory",
          description: "Agrega inventario de multiples productos a la vez. Requiere confirmacion.",
          parameters: {
            type: "object",
            properties: {
              items: {
                type: "array",
                description: "Lista de productos con cantidad y costo a agregar",
                items: {
                  type: "object",
                  properties: {
                    productName: { type: "string", description: "Nombre o SKU" },
                    quantity: { type: "number", description: "Cantidad" },
                    cost: { type: "number", description: "Costo unitario USD" },
                  },
                  required: ["productName", "quantity"],
                },
              },
            },
            required: ["items"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_inventory_alerts",
          description: "Obtiene alertas de inventario: productos con stock bajo, por vencer, vencidos, o sin movimiento.",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "create_purchase_order",
          description: "Crea una orden de compra a un proveedor. Requiere confirmacion.",
          parameters: {
            type: "object",
            properties: {
              supplierName: { type: "string", description: "Nombre del proveedor" },
              items: {
                type: "array",
                description: "Productos a comprar",
                items: {
                  type: "object",
                  properties: {
                    productName: { type: "string", description: "Nombre o SKU del producto" },
                    quantity: { type: "number", description: "Cantidad a comprar" },
                    costPrice: { type: "number", description: "Precio de compra unitario (USD)" },
                  },
                  required: ["productName", "quantity"],
                },
              },
              notes: { type: "string", description: "Notas para la orden de compra" },
            },
            required: ["supplierName", "items"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_purchase_orders",
          description: "Lista ordenes de compra con filtros de estado.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Filtrar por estado: pending, approved, received, all", enum: ["pending", "approved", "received", "all"] },
              limit: { type: "integer", description: "Maximo de resultados", minimum: 1, maximum: 20 },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "generate_purchase_proposal",
          description: "Analiza stock actual, tasa de consumo (30 dias) y lead times de proveedores para generar una propuesta de compra estrategica. Agrupa por proveedor.",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "create_recipe",
          description: "Crea una receta / ficha tecnica para un producto. Requiere confirmacion.",
          parameters: {
            type: "object",
            properties: {
              productName: { type: "string", description: "Producto para el que se crea la receta" },
              name: { type: "string", description: "Nombre de la receta" },
              components: {
                type: "array",
                description: "Ingredientes de la receta",
                items: {
                  type: "object",
                  properties: {
                    ingredientName: { type: "string", description: "Nombre del ingrediente (debe existir como producto)" },
                    quantity: { type: "number", description: "Cantidad necesaria" },
                    unit: { type: "string", description: "Unidad de medida" },
                  },
                  required: ["ingredientName", "quantity"],
                },
              },
              yield: { type: "number", description: "Rendimiento de la receta (cuantas porciones/unidades produce)" },
            },
            required: ["productName", "components"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_recipes",
          description: "Lista las recetas / fichas tecnicas del negocio.",
          parameters: {
            type: "object",
            properties: {
              search: { type: "string", description: "Buscar por nombre de receta o producto" },
              limit: { type: "integer", description: "Maximo de resultados", minimum: 1, maximum: 20 },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_customers",
          description: "Lista o busca clientes del negocio.",
          parameters: {
            type: "object",
            properties: {
              search: { type: "string", description: "Buscar por nombre, telefono, email o RIF" },
              limit: { type: "integer", description: "Maximo de resultados", minimum: 1, maximum: 20 },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_orders_list",
          description: "Lista ordenes de venta recientes con totales y estado.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Filtrar por estado" },
              dateFrom: { type: "string", description: "Fecha inicio ISO 8601" },
              dateTo: { type: "string", description: "Fecha fin ISO 8601" },
              limit: { type: "integer", description: "Maximo de resultados", minimum: 1, maximum: 30 },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_transfer_orders",
          description: "Lista ordenes de transferencia entre almacenes/sucursales.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Filtrar por estado" },
              limit: { type: "integer", description: "Maximo de resultados", minimum: 1, maximum: 20 },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_daily_summary",
          description: "Resumen operativo del dia: ventas, ordenes, productos top, alertas de inventario, ordenes de compra pendientes.",
          parameters: { type: "object", properties: {} },
        },
      },
    );

    return tools;
  }

  // ─── Execute Confirmed Action (called from ChatService after button press) ─
  async executeConfirmedAction(
    tenantId: string,
    actionType: string,
    payload: Record<string, any>,
    userId?: string,
  ): Promise<{ message: string; data?: any }> {
    this.logger.log(`Executing confirmed action: ${actionType} for tenant ${tenantId}`);
    const user = userId ? { _id: userId, tenantId } as any : undefined;

    try {
      const result = await this.assistantToolsService.executeTool(
        tenantId,
        actionType,
        payload,
        user,
      );
      return {
        message: result?.summary || result?.message || '✅ Accion completada exitosamente.',
        data: result,
      };
    } catch (error) {
      throw new Error(`Error ejecutando ${actionType}: ${(error as Error).message}`);
    }
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

        this.logger.log(`[DEBUG] Executing inventory lookup for: "${trimmed}"`);
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

        const formatAttributes = (
          attributes: Record<string, any> | undefined,
        ) =>
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
              const formatted = formatAttributes(
                match.attributeCombination.attributes,
              );
              return formatted ? ` | Atributos: ${formatted}` : "";
            }
            const formattedVariant = formatAttributes(match.variantAttributes);
            return formattedVariant
              ? ` | Atributos variante: ${formattedVariant}`
              : "";
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
        `Bootstrap inventory lookup failed for tenant ${tenantId}: ${(error as Error).message
        }`,
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
    return PROMOTION_KEYWORDS.some((keyword) => normalized.includes(keyword));
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
        if (
          originalLabel &&
          discountedLabel &&
          originalLabel !== discountedLabel
        ) {
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

        return `(${index + 1}) ${promo.productName}${promo.brand ? ` (${promo.brand})` : ""
          }${priceSegment ? ` → ${priceSegment}` : ""}${discountSegment ? ` ${discountSegment}` : ""
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
        candidates.push(
          this.normalizeInventoryTerm(tokens.slice(-2).join(" ")),
        );
      }
      if (tokens.length >= 3) {
        candidates.push(
          this.normalizeInventoryTerm(tokens.slice(-3).join(" ")),
        );
      }
      if (tokens.length >= 4) {
        candidates.push(
          this.normalizeInventoryTerm(tokens.slice(-4).join(" ")),
        );
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
      user,
      maxTokens: configuredMaxTokens = 600,
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
    let lastToolResult: Record<string, any> | undefined;
    let lastToolName: string | undefined;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const response = await this.openaiService.createChatCompletion({
        messages,
        tools,
        model: preferredModel,
        temperature: 0.2,
        maxTokens: configuredMaxTokens,
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
            user,
          );
          usedTools = true;
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
          lastToolResult = toolResult;
          lastToolName = functionCall.name;
        }
        continue;
      }

      if (message.content?.trim()) {
        return { answer: message.content.trim(), usedTools, lastToolResult, lastToolName };
      }

      this.logger.debug(
        `Iteration ${iteration} completed without answer or tool calls.`,
      );
    }

    return { answer: "", usedTools, lastToolResult, lastToolName };
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
