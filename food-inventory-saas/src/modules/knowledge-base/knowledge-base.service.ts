import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { VectorDbService } from '../vector-db/vector-db.service';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { Document } from '@langchain/core/documents';

// Use require for pdf-parse due to module interoperability issues
const pdf = require('pdf-parse');

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private readonly vectorDbService: VectorDbService,
  ) {}

  async addDocument(tenantId: string, fileBuffer: Buffer, mimetype: string, metadata: Record<string, any> = {}) {
    this.logger.log(`Adding new document for tenant ${tenantId}. Mimetype: ${mimetype}`);
    let text: string;

    if (mimetype === 'application/pdf') {
      try {
        const data = await pdf(fileBuffer);
        text = data.text;
      } catch (error) {
        this.logger.error('Failed to parse PDF file', error);
        throw new BadRequestException('Invalid or corrupt PDF file.');
      }
    } else if (mimetype === 'text/plain') {
      text = fileBuffer.toString('utf-8');
    } else {
      throw new BadRequestException(`Unsupported file type: ${mimetype}`);
    }

    if (!text || text.trim().length === 0) {
        throw new BadRequestException('Document is empty or contains no text.');
    }

    await this.processAndStoreText(tenantId, text, metadata);
  }

  async queryKnowledgeBase(tenantId: string, queryText: string, nResults: number = 5) {
    this.logger.log(`Querying knowledge base for tenant ${tenantId}`);
    return this.vectorDbService.similaritySearch(queryText, nResults, tenantId);
  }

  private async processAndStoreText(tenantId: string, text: string, metadata: Record<string, any>) {
    const chunks = this.splitTextIntoChunks(text);
    this.logger.log(`Split text into ${chunks.length} chunks.`);

    const documents = chunks.map(chunk => new Document({
      pageContent: chunk,
      metadata: {
        ...metadata,
        tenantId, // Crucial for data isolation
        id: uuidv4(),
      }
    }));

    await this.vectorDbService.addDocuments(documents);

    this.logger.log(`Successfully processed and stored ${documents.length} chunks for tenant ${tenantId}.`);
  }

  private splitTextIntoChunks(text: string, maxChunkSize = 1000, overlap = 100): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + maxChunkSize, text.length);
      chunks.push(text.slice(i, end));
      i += maxChunkSize - overlap;
      if (i >= text.length) break;
    }
    return chunks;
  }
}