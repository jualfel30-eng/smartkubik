import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ImprentaFailure } from "../../schemas/imprenta-failure.schema";

type ControlNumberResponse = {
  controlNumber: string;
  provider: string;
  assignedAt: Date;
  metadata?: Record<string, any>;
  hash?: string;
  verificationUrl?: string;
};

type ControlNumberRequest = {
  documentId: string;
  tenantId: string;
  seriesId: string;
  documentNumber: string;
  type: string;
  payload?: Record<string, any>;
};

@Injectable()
export class ImprentaDigitalProvider {
  private readonly logger = new Logger(ImprentaDigitalProvider.name);
  private readonly maxAttempts = 3;
  private readonly retryDelayMs = 1000;
  private readonly defaultProvider = "imprenta-externa";

  constructor(
    @InjectModel(ImprentaFailure.name)
    private imprentaFailureModel: Model<ImprentaFailure>,
  ) {}

  // Mock inicial: reemplazar con integración real al proveedor autorizado
  async requestControlNumber(
    payload: ControlNumberRequest,
  ): Promise<ControlNumberResponse> {
    const mode = process.env.IMPRENTA_PROVIDER_MODE || "mock";
    if (mode === "mock") {
      this.logger.log(
        `Mock imprenta request for doc ${payload.documentNumber} tenant ${payload.tenantId}`,
      );
      const now = new Date();
      return {
        controlNumber: `CTRL-${payload.documentNumber}`,
        provider: "mock-imprenta",
        assignedAt: now,
        metadata: { seriesId: payload.seriesId, type: payload.type, mode },
        hash: `mock-hash-${payload.documentId}`,
      };
    }

    // Placeholder de integración real; ajustar URL/headers según proveedor
    const imprentaUrl = process.env.IMPRENTA_PROVIDER_URL;
    const apiKey = process.env.IMPRENTA_PROVIDER_API_KEY;
    const providerName =
      process.env.IMPRENTA_PROVIDER_NAME || this.defaultProvider;
    let payloadTemplate: Record<string, any> | null = null;
    if (process.env.IMPRENTA_PAYLOAD_TEMPLATE) {
      try {
        payloadTemplate = JSON.parse(process.env.IMPRENTA_PAYLOAD_TEMPLATE);
      } catch (e) {
        this.logger.warn(
          "IMPRENTA_PAYLOAD_TEMPLATE inválida, usando payload directo",
        );
      }
    }
    let headersTemplate: Record<string, any> = {};
    if (process.env.IMPRENTA_HEADERS_TEMPLATE) {
      try {
        headersTemplate = JSON.parse(process.env.IMPRENTA_HEADERS_TEMPLATE);
      } catch (e) {
        this.logger.warn(
          "IMPRENTA_HEADERS_TEMPLATE inválida, usando headers por defecto",
        );
      }
    }
    if (!imprentaUrl || !apiKey) {
      this.logger.warn(
        "IMPRENTA_PROVIDER_URL/API_KEY no configurados; usando mock.",
      );
      return this.requestControlNumber({ ...payload, documentNumber: payload.documentNumber });
    }

    let lastError: any;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const response = await axios.post(
          `${imprentaUrl}/control-number`,
          payloadTemplate
            ? {
                ...payloadTemplate,
                documentId: payload.documentId,
                seriesId: payload.seriesId,
                documentNumber: payload.documentNumber,
                type: payload.type,
                data: payload.payload,
              }
            : {
                documentId: payload.documentId,
                seriesId: payload.seriesId,
                documentNumber: payload.documentNumber,
                type: payload.type,
                data: payload.payload,
              },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              ...headersTemplate,
            },
          },
        );
        const data = response.data || {};
        return {
          controlNumber: data.controlNumber,
          provider: data.provider || providerName,
          assignedAt: data.assignedAt ? new Date(data.assignedAt) : new Date(),
          metadata: data.metadata,
          hash: data.hash,
          verificationUrl: data.verificationUrl,
        };
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `Intento ${attempt}/${this.maxAttempts} fallido solicitando número de control`,
        );
        if (attempt < this.maxAttempts) {
          await new Promise((res) => setTimeout(res, this.retryDelayMs));
        }
      }
    }
    this.logger.error("Error solicitando número de control", lastError?.stack);
    await this.imprentaFailureModel.create({
      tenantId: payload.tenantId,
      documentId: payload.documentId,
      seriesId: payload.seriesId,
      request: payload,
      attempts: this.maxAttempts,
      error: {
        message: lastError?.message,
        stack: lastError?.stack,
        response: lastError?.response?.data,
      },
    });
    throw lastError;
  }
}
