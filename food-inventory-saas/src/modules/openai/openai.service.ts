import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { SuperAdminService } from '../super-admin/super-admin.service';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private openai: OpenAI | null = null;
  private _embeddings: OpenAIEmbeddings | null = null;

  constructor(private readonly superAdminService: SuperAdminService) {}

  private async initialize() {
    if (this.openai && this._embeddings) {
      return; // Already initialized
    }

    this.logger.log('Initializing OpenAI clients...');
    const apiKeySetting = await this.superAdminService.getSetting('OPENAI_API_KEY');
    const apiKey = apiKeySetting?.value;

    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not configured in Super Admin settings.');
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    this.openai = new OpenAI({ apiKey });
    this._embeddings = new OpenAIEmbeddings({ openAIApiKey: apiKey, modelName: 'text-embedding-ada-002' });
    this.logger.log('OpenAI clients initialized successfully.');
  }

  public async getEmbeddings(): Promise<OpenAIEmbeddings> {
    await this.initialize();
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