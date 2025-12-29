import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ImprentaFailure } from "../../schemas/imprenta-failure.schema";
import { ImprentaProviderFactory } from "./providers/imprenta-provider.factory";
import {
  ImprentaControlNumberRequest,
  ImprentaControlNumberResponse,
  ImprentaStatusResponse,
} from "./providers/base-imprenta.provider";

// Legacy types for backwards compatibility
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

/**
 * Main Imprenta Digital Provider Service
 * Delegates to the configured provider implementation (Mock, Generic HTTP, Custom)
 * Handles failure tracking and provides high-level API
 */
@Injectable()
export class ImprentaDigitalProvider {
  private readonly logger = new Logger(ImprentaDigitalProvider.name);

  constructor(
    @InjectModel(ImprentaFailure.name)
    private imprentaFailureModel: Model<ImprentaFailure>,
    private readonly providerFactory: ImprentaProviderFactory,
  ) {
    this.logger.log("🚀 Imprenta Digital Provider initialized");
  }

  /**
   * Request a control number from the imprenta provider
   *
   * @deprecated Use requestControlNumberV2 for new implementations
   */
  async requestControlNumber(
    payload: ControlNumberRequest,
  ): Promise<ControlNumberResponse> {
    // Convert legacy format to new format
    const request: ImprentaControlNumberRequest = {
      documentId: payload.documentId,
      tenantId: payload.tenantId,
      seriesId: payload.seriesId,
      documentNumber: payload.documentNumber,
      type: payload.type,
      metadata: payload.payload,
    };

    const response = await this.requestControlNumberV2(request);

    // Convert response back to legacy format
    return {
      controlNumber: response.controlNumber,
      provider: response.provider,
      assignedAt: response.assignedAt,
      metadata: response.metadata,
      hash: response.hash,
      verificationUrl: response.verificationUrl,
    };
  }

  /**
   * Request a control number from the imprenta provider (V2)
   */
  async requestControlNumberV2(
    payload: ImprentaControlNumberRequest,
  ): Promise<ImprentaControlNumberResponse> {
    const provider = this.providerFactory.getProvider();

    this.logger.log(
      `📝 Requesting control number for document ${payload.documentNumber} (${payload.type})`,
    );

    try {
      const response = await provider.requestControlNumber(payload);

      this.logger.log(
        `✅ Control number obtained: ${response.controlNumber} from ${response.provider}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `❌ Failed to obtain control number for document ${payload.documentNumber}`,
        error.stack,
      );

      // Log failure to database for retry/audit purposes
      await this.logFailure(payload, error);

      throw error;
    }
  }

  /**
   * Query the status of a document
   */
  async queryStatus(controlNumber: string): Promise<ImprentaStatusResponse> {
    const provider = this.providerFactory.getProvider();

    this.logger.log(`🔍 Querying status for control number: ${controlNumber}`);

    try {
      const response = await provider.queryStatus(controlNumber);

      this.logger.log(
        `✅ Status retrieved: ${response.status} for ${controlNumber}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `❌ Failed to query status for ${controlNumber}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cancel a document (if supported by provider)
   */
  async cancelDocument(
    controlNumber: string,
    reason?: string,
  ): Promise<boolean> {
    const provider = this.providerFactory.getProvider();

    if (!provider.cancelDocument) {
      throw new Error(
        `Provider ${provider.getProviderInfo().name} does not support document cancellation`,
      );
    }

    this.logger.log(`❌ Cancelling document: ${controlNumber}`);

    try {
      const success = await provider.cancelDocument(controlNumber, reason);

      if (success) {
        this.logger.log(`✅ Document ${controlNumber} cancelled successfully`);
      }

      return success;
    } catch (error) {
      this.logger.error(
        `❌ Failed to cancel document ${controlNumber}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get provider information
   */
  getProviderInfo(): {
    name: string;
    sandbox: boolean;
    configured: boolean;
  } {
    return this.providerFactory.getProviderInfo();
  }

  /**
   * Log a failure to the database
   */
  private async logFailure(
    payload: ImprentaControlNumberRequest,
    error: any,
  ): Promise<void> {
    try {
      await this.imprentaFailureModel.create({
        tenantId: payload.tenantId,
        documentId: payload.documentId,
        seriesId: payload.seriesId,
        request: payload as any,
        attempts: 1,
        error: {
          message: error?.message || "Unknown error",
          stack: error?.stack,
          response: error?.response?.data,
        },
      });

      this.logger.log(
        `📝 Failure logged to database for document ${payload.documentId}`,
      );
    } catch (dbError) {
      this.logger.error(
        "Failed to log failure to database",
        dbError.stack,
      );
    }
  }

  /**
   * Get failed requests for a tenant (for retry/monitoring)
   */
  async getFailedRequests(tenantId: string, limit = 100) {
    return this.imprentaFailureModel
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Retry a failed request
   */
  async retryFailedRequest(failureId: string): Promise<ImprentaControlNumberResponse> {
    const failure = await this.imprentaFailureModel.findById(failureId).exec();

    if (!failure) {
      throw new Error(`Failure record ${failureId} not found`);
    }

    this.logger.log(`🔄 Retrying failed request ${failureId}`);

    try {
      const response = await this.requestControlNumberV2(
        failure.request as ImprentaControlNumberRequest,
      );

      // Delete the failure record on success
      await this.imprentaFailureModel.findByIdAndDelete(failureId).exec();

      this.logger.log(`✅ Retry successful for ${failureId}`);

      return response;
    } catch (error) {
      // Update attempts count
      await this.imprentaFailureModel
        .findByIdAndUpdate(failureId, {
          $inc: { attempts: 1 },
          $set: {
            lastAttempt: new Date(),
            error: {
              message: error?.message,
              stack: error?.stack,
              response: error?.response?.data,
            },
          },
        })
        .exec();

      throw error;
    }
  }
}
