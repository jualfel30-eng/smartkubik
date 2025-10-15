import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VectorDbService } from '../vector-db/vector-db.service';
import { v4 as uuidv4 } from 'uuid';
import { Document } from '@langchain/core/documents';
import { PDFParse } from 'pdf-parse';
import { KnowledgeBaseDocument, KnowledgeBaseDocumentDocument } from '../../schemas/knowledge-base-document.schema';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectModel(KnowledgeBaseDocument.name) private kbDocumentModel: Model<KnowledgeBaseDocumentDocument>,
    private readonly vectorDbService: VectorDbService,
  ) {}

  async addDocument(tenantId: string, file: Express.Multer.File, metadata: Record<string, any> = {}) {
    const { buffer, mimetype, size, originalname } = file;
    const source = metadata.source || originalname;
    
    this.logger.log(`Adding new document for tenant ${tenantId}. Source: ${source}`);

    const existingDoc = await this.kbDocumentModel.findOne({ tenantId, source }).exec();
    if (existingDoc) {
      throw new ConflictException(`Document with source '${source}' already exists for this tenant.`);
    }

    let text: string;
    let parser: PDFParse | undefined;

    if (mimetype === 'application/pdf') {
      try {
        parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        text = textResult.text;
      } catch (error) {
        this.logger.error('Failed to parse PDF file', error);
        throw new BadRequestException('Invalid or corrupt PDF file.');
      } finally {
        if (parser) {
          await parser.destroy();
        }
      }
    } else if (mimetype === 'text/plain') {
      text = buffer.toString('utf-8');
    } else {
      throw new BadRequestException(`Unsupported file type: ${mimetype}`);
    }

    if (!text || text.trim().length === 0) {
        throw new BadRequestException('Document is empty or contains no text.');
    }

    await this.processAndStoreText(tenantId, text, { ...metadata, source });

    const newKbDoc = new this.kbDocumentModel({
      tenantId,
      source,
      fileName: originalname,
      fileType: mimetype,
      fileSize: size,
    });
    await newKbDoc.save();
    
    this.logger.log(`Successfully saved document record for source '${source}'.`);
  }

  async deleteDocumentBySource(tenantId: string, source: string) {
    this.logger.log(`Deleting document with source '${source}' for tenant ${tenantId}`);
    
    await this.vectorDbService.deleteDocuments(source, tenantId);
    
    await this.kbDocumentModel.deleteOne({ tenantId, source }).exec();

    this.logger.log(`Successfully deleted document record for source '${source}'.`);
  }

  async listDocuments(tenantId: string): Promise<KnowledgeBaseDocument[]> {
    this.logger.log(`Listing documents for tenant ${tenantId}`);
    return this.kbDocumentModel.find({ tenantId }).sort({ createdAt: -1 }).exec();
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