import { Injectable, Logger, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OpenaiService } from '../openai/openai.service';
import { SuperAdminService } from '../super-admin/super-admin.service';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';

const PINECONE_INDEX_NAME = 'smartkubik-kb';

@Injectable()
export class VectorDbService implements OnModuleInit {
  private readonly logger = new Logger(VectorDbService.name);
  private pineconeClient: Pinecone | null = null;
  private vectorStore: PineconeStore | null = null;
  private embeddings: OpenAIEmbeddings;
  private indexDimension: number | null = null;

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly superAdminService: SuperAdminService,
  ) {}

  async onModuleInit() {
    this.logger.log('VectorDbService initialized. Pinecone client will be created on first use.');
  }

  private async ensureVectorStoreInitialized(): Promise<void> {
    if (this.vectorStore && this.pineconeClient) {
      return;
    }
    this.logger.log('First use: Initializing Pinecone client and vector store...');

    const apiKeySetting = await this.superAdminService.getSetting('PINECONE_API_KEY');
    const environmentSetting = await this.superAdminService.getSetting('PINECONE_ENVIRONMENT');

    const apiKey = apiKeySetting?.value;
    const environment = environmentSetting?.value;

    if (!apiKey || !environment) {
      this.logger.error('Pinecone API Key or Environment is not configured in Super Admin settings.');
      throw new InternalServerErrorException('Pinecone is not configured.');
    }

    this.pineconeClient = new Pinecone({ apiKey });
    const pineconeIndex = this.pineconeClient.Index(PINECONE_INDEX_NAME);
    const indexDescription = await this.pineconeClient.describeIndex(PINECONE_INDEX_NAME);
    const indexDimension = indexDescription.dimension;

    if (!indexDimension || Number.isNaN(Number(indexDimension))) {
      this.logger.error(`Unable to determine dimension for Pinecone index '${PINECONE_INDEX_NAME}'.`);
      throw new InternalServerErrorException('Pinecone index dimension is not available.');
    }

    this.indexDimension = Number(indexDimension);
    this.logger.log(`Using Pinecone index '${PINECONE_INDEX_NAME}' with dimension ${this.indexDimension}.`);

    this.embeddings = await this.openaiService.getEmbeddings(this.indexDimension);

    // Use 'as any' to bypass the type incompatibility issue between different package versions
    this.vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, { pineconeIndex: pineconeIndex as any });
    
    this.logger.log('Pinecone client and vector store initialized successfully.');
  }

  async addDocuments(documents: Document[]) {
    await this.ensureVectorStoreInitialized();
    await this.vectorStore!.addDocuments(documents);
    this.logger.log(`Added ${documents.length} documents to Pinecone index '${PINECONE_INDEX_NAME}'.`);
  }

  async similaritySearch(query: string, k: number, tenantId: string) {
    await this.ensureVectorStoreInitialized();
    
    const filter = {
      tenantId: { '$eq': tenantId },
    };

    return this.vectorStore!.similaritySearch(query, k, filter);
  }

  async similaritySearchWithScore(query: string, k: number, tenantId: string) {
    await this.ensureVectorStoreInitialized();

    const filter = {
      tenantId: { '$eq': tenantId },
    };

    return this.vectorStore!.similaritySearchWithScore(query, k, filter);
  }

  async deleteDocuments(source: string, tenantId: string): Promise<void> {
    await this.ensureVectorStoreInitialized();
    this.logger.log(`Deleting documents from source '${source}' for tenant '${tenantId}'...`);

    const index = this.pineconeClient!.Index(PINECONE_INDEX_NAME);
    
    await index.deleteMany({
      source: source,
      tenantId: tenantId,
    });

    this.logger.log(`Successfully initiated deletion for source '${source}'.`);
  }
}
