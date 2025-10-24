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
]);

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
    ];

    if (capabilities.inventoryLookup) {
      instructions.push(
        "Cuando el usuario pregunte por disponibilidad, existencias, costos o alertas de un producto, DEBES llamar a la herramienta `get_inventory_status` antes de responder para confirmar la información.",
        "IMPORTANTE: Al mencionar productos del inventario, SIEMPRE incluye la marca si está disponible, junto con el nombre del producto. Ejemplo: 'Miel Savage' en lugar de solo 'Miel'. La marca es información valiosa para los clientes.",
        'Si necesitas confirmar variantes específicas (ej. talla, color, serial, ancho, edición), pasa esos criterios en el campo `attributes` de la herramienta `get_inventory_status` usando pares clave-valor como `{ "size": "38", "color": "azul" }`.',
      );
    }
    if (capabilities.schedulingLookup) {
      instructions.push(
        "Si el usuario solicita confirmar horarios o disponibilidad de servicios, DEBES llamar a la herramienta `check_service_availability` para ofrecer solo horarios realmente libres.",
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
            "Obtiene un resumen del inventario actual de un producto del tenant, incluyendo cantidades disponibles, reservadas y costos.",
          parameters: {
            type: "object",
            properties: {
              productQuery: {
                type: "string",
                description:
                  "Nombre, SKU o palabra clave del producto a consultar.",
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
            },
            required: ["productQuery"],
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
        `Bootstrap inventory lookup failed for tenant ${tenantId}: ${
          (error as Error).message
        }`,
      );
      return null;
    }
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
    const pattern =
      /(?:de|del|para|sobre)\s+([a-z0-9\s\-_.]+?)(?:\s+(?:hay|quedan|disponibles|tienen|tenemos|existen)|$)/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lowered))) {
      const term = match[1]?.trim();
      if (term?.length) {
        candidates.push(this.normalizeInventoryTerm(term));
      }
    }

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
      const lastTokens = tokens.slice(-3).join(" ");
      candidates.push(this.normalizeInventoryTerm(lastTokens));
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
    } = options;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Pregunta original: ${question}\n\nContexto documental disponible:\n${contextBlock}`,
      },
    ];

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
