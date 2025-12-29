import {
  BaseImprentaProvider,
  ImprentaControlNumberRequest,
  ImprentaControlNumberResponse,
  ImprentaProviderConfig,
  ImprentaStatusResponse,
} from "./base-imprenta.provider";
import axios, { AxiosInstance } from "axios";

/**
 * Generic HTTP Imprenta Provider
 * Can be configured to work with most REST API-based imprenta providers
 */
export class GenericHttpImprentaProvider extends BaseImprentaProvider {
  private axiosInstance: AxiosInstance;

  constructor(config: ImprentaProviderConfig) {
    super(config);

    // Create axios instance with default configuration
    this.axiosInstance = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...config.customHeaders,
      },
    });

    this.logger.log(
      `🌐 Generic HTTP Provider initialized for ${config.name}`,
    );
  }

  async requestControlNumber(
    request: ImprentaControlNumberRequest,
  ): Promise<ImprentaControlNumberResponse> {
    if (!this.validateConfig()) {
      throw new Error("Invalid provider configuration");
    }

    return this.retryRequest(async () => {
      // Build the payload
      const payload = this.buildRequestPayload(request);

      this.logger.log(
        `📤 Sending control number request to ${this.config.name}`,
      );

      // Make the request
      const response = await this.axiosInstance.post(
        "/control-number",
        payload,
      );

      // Parse and transform the response
      return this.parseControlNumberResponse(response.data, request);
    }, "requestControlNumber");
  }

  async queryStatus(controlNumber: string): Promise<ImprentaStatusResponse> {
    return this.retryRequest(async () => {
      this.logger.log(
        `🔍 Querying status for control number: ${controlNumber}`,
      );

      const response = await this.axiosInstance.get(
        `/status/${controlNumber}`,
      );

      return this.parseStatusResponse(response.data);
    }, "queryStatus");
  }

  async cancelDocument(
    controlNumber: string,
    reason?: string,
  ): Promise<boolean> {
    return this.retryRequest(async () => {
      this.logger.log(`❌ Cancelling document: ${controlNumber}`);

      await this.axiosInstance.post(`/cancel/${controlNumber}`, {
        reason: reason || "Cancellation requested",
      });

      this.logger.log(`✅ Document ${controlNumber} cancelled successfully`);
      return true;
    }, "cancelDocument");
  }

  /**
   * Build the request payload
   * Can be overridden for provider-specific formats
   */
  protected buildRequestPayload(
    request: ImprentaControlNumberRequest,
  ): Record<string, any> {
    const basePayload = {
      documentId: request.documentId,
      documentNumber: request.documentNumber,
      seriesId: request.seriesId,
      type: request.type,
      tenantId: request.tenantId,
      xmlContent: request.xmlContent,
      customer: request.customerData,
      totals: request.totals,
      metadata: request.metadata,
      webhookUrl: this.config.webhookUrl,
    };

    // Merge with custom payload template if provided
    if (this.config.customPayload) {
      return {
        ...this.config.customPayload,
        ...basePayload,
      };
    }

    return basePayload;
  }

  /**
   * Parse the control number response
   * Can be overridden for provider-specific formats
   */
  protected parseControlNumberResponse(
    data: any,
    request: ImprentaControlNumberRequest,
  ): ImprentaControlNumberResponse {
    // Default parsing - adjust based on actual provider response format
    return {
      controlNumber: data.controlNumber || data.control_number || data.numero_control,
      provider: this.config.name,
      providerRif: data.providerRif || this.config.rif,
      providerName: data.providerName || this.config.companyName,
      assignedAt: data.assignedAt
        ? new Date(data.assignedAt)
        : new Date(),
      metadata: data.metadata || data,
      hash: data.hash || data.hash_sha256,
      verificationUrl:
        data.verificationUrl ||
        data.verification_url ||
        this.buildVerificationUrl(data.controlNumber, this.config.rif),
      qrCode: data.qrCode || data.qr_code,
      success: true,
    };
  }

  /**
   * Parse the status response
   * Can be overridden for provider-specific formats
   */
  protected parseStatusResponse(data: any): ImprentaStatusResponse {
    return {
      controlNumber: data.controlNumber || data.control_number,
      status: this.normalizeStatus(data.status || data.estado),
      details: data.details || data,
      updatedAt: data.updatedAt
        ? new Date(data.updatedAt)
        : new Date(),
    };
  }

  /**
   * Normalize status values from different providers
   */
  protected normalizeStatus(
    status: string,
  ): "pending" | "issued" | "rejected" | "cancelled" {
    const statusLower = status?.toLowerCase();

    if (
      statusLower?.includes("emitid") ||
      statusLower?.includes("issued") ||
      statusLower?.includes("aprobad")
    ) {
      return "issued";
    }
    if (
      statusLower?.includes("rechazad") ||
      statusLower?.includes("rejected") ||
      statusLower?.includes("error")
    ) {
      return "rejected";
    }
    if (
      statusLower?.includes("anulad") ||
      statusLower?.includes("cancelled") ||
      statusLower?.includes("cancel")
    ) {
      return "cancelled";
    }
    return "pending";
  }

  /**
   * Set custom endpoint paths
   */
  setEndpoints(endpoints: {
    controlNumber?: string;
    status?: string;
    cancel?: string;
  }): void {
    // This would require refactoring to use configurable endpoints
    // For now, endpoints are hardcoded in the methods
    this.logger.log("Custom endpoints:", endpoints);
  }
}
