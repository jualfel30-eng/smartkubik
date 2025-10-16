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
  usedFallback: boolean;
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

    const results = await this.safeQueryKnowledgeBase(tenantId, question, topK);
    this.logger.debug(
      `Top hits for tenant ${tenantId}: ${results
        .map(({ document, score }) => `${(document.metadata?.source as string) || 'desconocido'}:${score.toFixed(3)}`)
        .join(', ')}`,
    );

    const documents = results.map(({ document }) => document);

    if (!documents.length) {
      this.logger.warn(`No context documents found for tenant ${tenantId}. Returning fallback response.`);
      return {
        answer:
          'No encontré información relevante en la base de conocimiento para responder. Intenta con otra pregunta o agrega más documentos.',
        sources: [],
        usedFallback: true,
      };
    }

    const systemPrompt =
      'Eres el asistente oficial de SmartKubik. Debes responder en español, con precisión y de forma concisa. Usa únicamente la información provista en el contexto. Si el contexto no tiene la respuesta, reconoce explícitamente que no puedes responder.';

    const contextBlock = this.buildContextBlock(results);
    const userMessage = `Pregunta: ${question}\n\nContexto:\n${contextBlock}`;
    const answer = await this.openaiService.getChatCompletion(systemPrompt, userMessage);

    return {
      answer,
      sources: documents.map((doc) => ({
        source: (doc.metadata?.source as string) || 'desconocido',
        snippet: this.buildSnippet(doc),
      })),
      usedFallback: false,
    };
  }

  private async safeQueryKnowledgeBase(
    tenantId: string,
    question: string,
    topK: number,
  ): Promise<Array<{ document: Document; score: number }>> {
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

  private buildContextBlock(results: Array<{ document: Document; score: number }>): string {
    return results
      .map(({ document, score }, index) => {
        const source = (document.metadata?.source as string) || `Documento ${index + 1}`;
        const content = document.pageContent || '';
        const similarity = score.toFixed(3);
        return `Fuente: ${source} (score: ${similarity})\n${content}`;
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
