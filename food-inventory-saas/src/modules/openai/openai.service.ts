import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { SuperAdminService } from '../super-admin/super-admin.service';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private openai: OpenAI | null = null;
  private _embeddings: OpenAIEmbeddings | null = null;
  private embeddingsConfig: { model: string; dimensions?: number } | null = null;

  constructor(private readonly superAdminService: SuperAdminService) {}

  private async initialize(requestedDimensions?: number) {
    const apiKeySetting = await this.superAdminService.getSetting('OPENAI_API_KEY');
    const apiKey = apiKeySetting?.value;

    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not configured in Super Admin settings.');
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const embeddingModelSetting = await this.superAdminService.getSetting('OPENAI_EMBEDDING_MODEL');
    const dimensionSetting = await this.superAdminService.getSetting('OPENAI_EMBEDDING_DIMENSIONS');

    const resolvedModel = (embeddingModelSetting?.value || 'text-embedding-3-small').trim();
    const rawDimension = dimensionSetting?.value?.trim();
    const parsedDimension = rawDimension ? Number(rawDimension) : undefined;
    const configuredDimensions =
      parsedDimension !== undefined && Number.isFinite(parsedDimension) && parsedDimension > 0
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
      `Initializing OpenAI clients (model=${resolvedModel}${finalDimensions ? `, dimensions=${finalDimensions}` : ''}).`,
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
      if (resolvedModel.startsWith('text-embedding-3')) {
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
    this.logger.log('OpenAI clients initialized successfully.');
  }

  public async getEmbeddings(dimensions?: number): Promise<OpenAIEmbeddings> {
    await this.initialize(dimensions);
    return this._embeddings!;
  }

  async getChatCompletion(prompt: string, context: string): Promise<string> {
    await this.initialize();
    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: context },
        ],
      });
      return response.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('Failed to get chat completion', error);
      if (error instanceof OpenAI.APIError && error.status === 401) {
        throw new Error('Invalid OpenAI API Key. Please check your configuration.');
      }
      throw new Error('Failed to get chat completion.');
    }
  }
}
