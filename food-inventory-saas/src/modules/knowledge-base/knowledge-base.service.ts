import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { VectorDbService } from "../vector-db/vector-db.service";
import { v4 as uuidv4 } from "uuid";
import { Document } from "@langchain/core/documents";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  KnowledgeBaseDocument,
  KnowledgeBaseDocumentDocument,
} from "../../schemas/knowledge-base-document.schema";

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectModel(KnowledgeBaseDocument.name)
    private kbDocumentModel: Model<KnowledgeBaseDocumentDocument>,
    private readonly vectorDbService: VectorDbService,
  ) {}

  async addDocument(
    tenantId: string,
    file: Express.Multer.File,
    metadata: Record<string, any> = {},
  ) {
    const { buffer, mimetype, size, originalname } = file;
    const source = metadata.source || originalname;

    this.logger.log(
      `Adding new document for tenant ${tenantId}. Source: ${source}`,
    );

    const existingDoc = await this.kbDocumentModel
      .findOne({ tenantId, source })
      .exec();
    if (existingDoc) {
      this.logger.log(
        `Existing document for source '${source}' found. Replacing previous data.`,
      );
      await this.deleteDocumentBySource(tenantId, source);
    }

    let text: string;
    let parser: PDFParse | undefined;

    if (mimetype === "application/pdf") {
      try {
        parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        text = textResult.text;
      } catch (error) {
        this.logger.error("Failed to parse PDF file", error);
        throw new BadRequestException("Invalid or corrupt PDF file.");
      } finally {
        if (parser) {
          await parser.destroy();
        }
      }
    } else if (mimetype === "text/plain") {
      text = buffer.toString("utf-8");
    } else {
      throw new BadRequestException(`Unsupported file type: ${mimetype}`);
    }

    if (!text || text.trim().length === 0) {
      throw new BadRequestException("Document is empty or contains no text.");
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

    this.logger.log(
      `Successfully saved document record for source '${source}'.`,
    );
  }

  async deleteDocumentBySource(tenantId: string, source: string) {
    this.logger.log(
      `Deleting document with source '${source}' for tenant ${tenantId}`,
    );

    await this.vectorDbService.deleteDocuments(source, tenantId);

    await this.kbDocumentModel.deleteOne({ tenantId, source }).exec();

    this.logger.log(
      `Successfully deleted document record for source '${source}'.`,
    );
  }

  async listDocuments(tenantId: string): Promise<KnowledgeBaseDocument[]> {
    this.logger.log(`Listing documents for tenant ${tenantId}`);
    return this.kbDocumentModel
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async queryKnowledgeBase(
    tenantId: string,
    queryText: string,
    nResults: number = 5,
    minScore = 0.75,
  ) {
    this.logger.log(`Querying knowledge base for tenant ${tenantId}`);
    const results = await this.vectorDbService.similaritySearchWithScore(
      queryText,
      nResults,
      tenantId,
    );

    const normalized = results.map(([document, score]) => ({
      document,
      score,
    }));

    const similarityCandidates = normalized.filter(
      ({ score }) => score >= 0 && score <= 1,
    );
    const distanceCandidates = normalized.filter(({ score }) => score > 1);

    let filtered: Array<{ document: Document; score: number }> = [];

    if (similarityCandidates.length) {
      filtered = similarityCandidates.filter(({ score }) => score >= minScore);
    } else if (distanceCandidates.length) {
      const distanceThreshold = 1 - minScore;
      filtered = distanceCandidates.filter(
        ({ score }) => score <= distanceThreshold,
      );
    }

    if (!filtered.length) {
      this.logger.warn(
        `Similarity threshold not met for query "${queryText}" (tenant: ${tenantId}). Returning top ${normalized.length} hits without filtering.`,
      );
      return normalized;
    }

    return filtered;
  }

  private async processAndStoreText(
    tenantId: string,
    text: string,
    metadata: Record<string, any>,
  ) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 900,
      chunkOverlap: 120,
    });

    const chunks = await splitter.splitText(text);
    this.logger.log(`Split text into ${chunks.length} chunks.`);

    const uploadedAt = new Date().toISOString();

    const documents = chunks.map(
      (chunk, index) =>
        new Document({
          pageContent: chunk,
          metadata: {
            ...metadata,
            tenantId,
            chunkIndex: index,
            chunkId: uuidv4(),
            uploadedAt,
          },
        }),
    );

    await this.vectorDbService.addDocuments(documents);

    this.logger.log(
      `Successfully processed and stored ${documents.length} chunks for tenant ${tenantId}.`,
    );
  }
}
