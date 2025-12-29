import { Logger } from "@nestjs/common";

export interface ImprentaControlNumberRequest {
  documentId: string;
  tenantId: string;
  seriesId: string;
  documentNumber: string;
  type: string;
  xmlContent?: string;
  customerData?: {
    name: string;
    rif: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  totals?: {
    subtotal: number;
    taxes: { type: string; rate: number; amount: number }[];
    grandTotal: number;
    currency: string;
  };
  metadata?: Record<string, any>;
}

export interface ImprentaControlNumberResponse {
  controlNumber: string;
  provider: string;
  providerRif?: string;
  providerName?: string;
  assignedAt: Date;
  metadata?: Record<string, any>;
  hash?: string;
  verificationUrl?: string;
  qrCode?: string;
  success: boolean;
  errorMessage?: string;
}

export interface ImprentaStatusResponse {
  controlNumber: string;
  status: "pending" | "issued" | "rejected" | "cancelled";
  details?: Record<string, any>;
  updatedAt: Date;
}

export interface ImprentaProviderConfig {
  name: string;
  apiUrl: string;
  apiKey: string;
  rif?: string;
  companyName?: string;
  sandbox?: boolean;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  webhookUrl?: string;
  customHeaders?: Record<string, string>;
  customPayload?: Record<string, any>;
}

/**
 * Base abstract class for all Imprenta Digital providers
 * Implement this class to create a new provider integration
 */
export abstract class BaseImprentaProvider {
  protected readonly logger: Logger;
  protected config: ImprentaProviderConfig;

  constructor(config: ImprentaProviderConfig) {
    this.logger = new Logger(this.constructor.name);
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      sandbox: false,
      ...config,
    };
  }

  /**
   * Request a control number from the imprenta provider
   */
  abstract requestControlNumber(
    request: ImprentaControlNumberRequest,
  ): Promise<ImprentaControlNumberResponse>;

  /**
   * Query the status of a previously issued document
   */
  abstract queryStatus(controlNumber: string): Promise<ImprentaStatusResponse>;

  /**
   * Cancel a document (if supported by provider)
   */
  abstract cancelDocument?(
    controlNumber: string,
    reason?: string,
  ): Promise<boolean>;

  /**
   * Validate provider configuration
   */
  validateConfig(): boolean {
    if (!this.config.apiUrl) {
      this.logger.error("Missing API URL in provider configuration");
      return false;
    }
    if (!this.config.apiKey) {
      this.logger.error("Missing API Key in provider configuration");
      return false;
    }
    return true;
  }

  /**
   * Get provider information
   */
  getProviderInfo(): {
    name: string;
    sandbox: boolean;
    configured: boolean;
  } {
    return {
      name: this.config.name,
      sandbox: this.config.sandbox || false,
      configured: this.validateConfig(),
    };
  }

  /**
   * Helper method for retrying requests
   */
  protected async retryRequest<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= (this.config.maxRetries || 3); attempt++) {
      try {
        this.logger.log(
          `${operationName}: Attempt ${attempt}/${this.config.maxRetries}`,
        );
        const result = await operation();
        this.logger.log(`${operationName}: Success on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `${operationName}: Failed attempt ${attempt}/${this.config.maxRetries}`,
          error.message,
        );

        if (attempt < (this.config.maxRetries || 3)) {
          const delay = (this.config.retryDelay || 1000) * attempt; // Exponential backoff
          this.logger.log(
            `${operationName}: Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(
      `${operationName}: All ${this.config.maxRetries} attempts failed`,
      lastError?.stack,
    );
    throw lastError;
  }

  /**
   * Build verification URL (SENIAT format)
   */
  protected buildVerificationUrl(
    controlNumber: string,
    rif?: string,
  ): string {
    // Standard SENIAT verification URL format
    const baseUrl = "https://contribuyente.seniat.gob.ve/BuscadorNacionalFE/";
    if (rif && controlNumber) {
      return `${baseUrl}?rif=${rif}&control=${controlNumber}`;
    }
    return baseUrl;
  }
}
