import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { SuperAdminService } from "../super-admin/super-admin.service";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private openai: OpenAI | null = null;
  private _embeddings: OpenAIEmbeddings | null = null;
  private embeddingsConfig: { model: string; dimensions?: number } | null =
    null;
  private chatModelCache: string | null = null;
  private chatModelFetchedAt = 0;

  constructor(private readonly superAdminService: SuperAdminService) {}

  private async initialize(requestedDimensions?: number) {
    const apiKeySetting =
      await this.superAdminService.getSetting("OPENAI_API_KEY");
    const apiKey = apiKeySetting?.value;

    if (!apiKey) {
      this.logger.error(
        "OPENAI_API_KEY is not configured in Super Admin settings.",
      );
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const embeddingModelSetting = await this.superAdminService.getSetting(
      "OPENAI_EMBEDDING_MODEL",
    );
    const dimensionSetting = await this.superAdminService.getSetting(
      "OPENAI_EMBEDDING_DIMENSIONS",
    );

    const resolvedModel = (
      embeddingModelSetting?.value || "text-embedding-3-small"
    ).trim();
    const rawDimension = dimensionSetting?.value?.trim();
    const parsedDimension = rawDimension ? Number(rawDimension) : undefined;
    const configuredDimensions =
      parsedDimension !== undefined &&
      Number.isFinite(parsedDimension) &&
      parsedDimension > 0
        ? parsedDimension
        : undefined;
    const previousDimensions = this.embeddingsConfig?.dimensions;
    const finalDimensions = Number.isFinite(configuredDimensions)
      ? configuredDimensions
      : requestedDimensions !== undefined
        ? requestedDimensions
        : previousDimensions;

    if (
      this.openai &&
      this._embeddings &&
      this.embeddingsConfig &&
      this.embeddingsConfig.model === resolvedModel &&
      this.embeddingsConfig.dimensions === finalDimensions
    ) {
      return;
    }

    this.logger.log(
      `Initializing OpenAI clients (model=${resolvedModel}${finalDimensions ? `, dimensions=${finalDimensions}` : ""}).`,
    );

    this.openai = new OpenAI({ apiKey });

    const embeddingOptions: {
      openAIApiKey: string;
      modelName: string;
      model: string;
      dimensions?: number;
    } = {
      openAIApiKey: apiKey,
      modelName: resolvedModel,
      model: resolvedModel,
    };

    if (finalDimensions !== undefined) {
      if (resolvedModel.startsWith("text-embedding-3")) {
        embeddingOptions.dimensions = finalDimensions;
      } else if (finalDimensions !== undefined) {
        this.logger.warn(
          `Embedding model '${resolvedModel}' does not support custom dimensions. Ignoring requested dimension '${finalDimensions}'.`,
        );
      }
    }

    this._embeddings = new OpenAIEmbeddings(embeddingOptions);
    this.embeddingsConfig = {
      model: resolvedModel,
      dimensions: embeddingOptions.dimensions,
    };
    this.logger.log("OpenAI clients initialized successfully.");
  }

  public async getEmbeddings(dimensions?: number): Promise<OpenAIEmbeddings> {
    await this.initialize(dimensions);
    return this._embeddings!;
  }

  async getChatCompletion(prompt: string, context: string): Promise<string> {
    const response = await this.createChatCompletion({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: context },
      ],
    });
    return response.choices?.[0]?.message?.content || "";
  }

  async createChatCompletion(options: {
    messages: ChatCompletionMessageParam[];
    tools?: ChatCompletionTool[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    await this.initialize();
    try {
      const model = await this.resolveChatModel(options.model);
      return await this.openai!.chat.completions.create({
        model,
        messages: options.messages,
        tools: options.tools,
        tool_choice: options.tools?.length ? "auto" : undefined,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 600,
      });
    } catch (error) {
      this.logger.error("Failed to get chat completion", error);
      if (error instanceof OpenAI.APIError && error.status === 401) {
        throw new Error(
          "Invalid OpenAI API Key. Please check your configuration.",
        );
      }
      throw new Error("Failed to get chat completion.");
    }
  }

  private async resolveChatModel(preferredModel?: string): Promise<string> {
    if (preferredModel?.trim()) {
      return preferredModel.trim();
    }

    const now = Date.now();
    if (!this.chatModelCache || now - this.chatModelFetchedAt > 5 * 60 * 1000) {
      const setting =
        await this.superAdminService.getSetting("OPENAI_CHAT_MODEL");
      this.chatModelCache = setting?.value?.trim() || "gpt-4o";
      this.chatModelFetchedAt = now;
    }

    return this.chatModelCache;
  }
}
