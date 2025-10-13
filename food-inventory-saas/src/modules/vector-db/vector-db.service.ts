import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OpenaiService } from '../openai/openai.service';

@Injectable()
export class VectorDbService implements OnModuleInit {
  private readonly logger = new Logger(VectorDbService.name);
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: OpenAIEmbeddings;

  constructor(private readonly openaiService: OpenaiService) {}

  async onModuleInit() {
    // The initialization of the vector store is now lazy and happens on first use,
    // because it depends on the embeddings model which itself is initialized lazily.
    this.logger.log('VectorDbService initialized. Vector store will be created on first use.');
  }

  private async ensureVectorStoreInitialized(): Promise<void> {
    if (this.vectorStore) {
      return;
    }
    this.logger.log('First use: Initializing MemoryVectorStore...');
    this.embeddings = await this.openaiService.getEmbeddings();
    this.vectorStore = new MemoryVectorStore(this.embeddings);
    this.logger.log('MemoryVectorStore initialized.');
  }

  async addDocuments(documents: Document[]) {
    await this.ensureVectorStoreInitialized();
    await this.vectorStore!.addDocuments(documents);
    this.logger.log(`Added ${documents.length} documents to in-memory vector store.`);
  }

  async similaritySearch(query: string, k: number, tenantId: string) {
    await this.ensureVectorStoreInitialized();
    
    const filter = (doc: Document) => {
      return doc.metadata.tenantId === tenantId;
    };

    return this.vectorStore!.similaritySearch(query, k, filter);
  }
}
