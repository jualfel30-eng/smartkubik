import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { OpenaiService } from '../openai/openai.service';
import { Document } from '@langchain/core/documents';

export interface AssistantResponseSource {
  source: string;
  snippet: string;
}

export interface AssistantResponse {
  answer: string;
  sources: AssistantResponseSource[];
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly openaiService: OpenaiService,
  ) {}

  async answerQuestion(tenantId: string, question: string, topK = 5): Promise<AssistantResponse> {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId is required to query the assistant.');
    }
    if (!question?.trim()) {
      throw new BadRequestException('question is required to query the assistant.');
    }

    this.logger.debug(`Assistant query received for tenant ${tenantId}.`);

    const documents = await this.safeQueryKnowledgeBase(tenantId, question, topK);

    if (!documents.length) {
      this.logger.warn(`No context documents found for tenant ${tenantId}. Returning fallback response.`);
      return {
        answer:
          'No encontré información relevante en la base de conocimiento para responder. Intenta con otra pregunta o agrega más documentos.',
        sources: [],
      };
    }

    const systemPrompt =
      'Eres el asistente oficial de SmartKubik. Debes responder en español, con precisión y de forma concisa. Usa únicamente la información provista en el contexto. Si el contexto no tiene la respuesta, reconoce explícitamente que no puedes responder.';

    const contextBlock = this.buildContextBlock(documents);
    const userMessage = `Pregunta: ${question}\n\nContexto:\n${contextBlock}`;
    const answer = await this.openaiService.getChatCompletion(systemPrompt, userMessage);

    return {
      answer,
      sources: documents.map((doc) => ({
        source: (doc.metadata?.source as string) || 'desconocido',
        snippet: this.buildSnippet(doc),
      })),
    };
  }

  private async safeQueryKnowledgeBase(tenantId: string, question: string, topK: number): Promise<Document[]> {
    try {
      const results = await this.knowledgeBaseService.queryKnowledgeBase(tenantId, question, topK);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      this.logger.error(
        `Failed to query knowledge base for tenant ${tenantId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new BadRequestException('No se pudo consultar la base de conocimiento. Verifica la configuración.');
    }
  }

  private buildContextBlock(documents: Document[]): string {
    return documents
      .map((doc, index) => {
        const source = (doc.metadata?.source as string) || `Documento ${index + 1}`;
        const content = doc.pageContent || '';
        return `Fuente: ${source}\n${content}`;
      })
      .join('\n\n');
  }

  private buildSnippet(doc: Document, maxLength = 320): string {
    const content = doc.pageContent || '';
    if (content.length <= maxLength) {
      return content;
    }
    return `${content.slice(0, maxLength)}…`;
  }
}
