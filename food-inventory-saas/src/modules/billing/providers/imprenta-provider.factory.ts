import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseImprentaProvider, ImprentaProviderConfig } from "./base-imprenta.provider";
import { MockImprentaProvider } from "./mock-imprenta.provider";
import { GenericHttpImprentaProvider } from "./generic-http-imprenta.provider";

export type ImprentaProviderType = "mock" | "generic-http" | "custom";

/**
 * Factory for creating Imprenta Provider instances
 * Manages provider configuration and instantiation
 */
@Injectable()
export class ImprentaProviderFactory {
  private readonly logger = new Logger(ImprentaProviderFactory.name);
  private providerInstance: BaseImprentaProvider | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the configured imprenta provider instance
   */
  getProvider(): BaseImprentaProvider {
    if (this.providerInstance) {
      return this.providerInstance;
    }

    const providerType = this.getProviderType();
    const config = this.buildProviderConfig();

    this.logger.log(`🏭 Creating imprenta provider: ${providerType}`);

    switch (providerType) {
      case "mock":
        this.providerInstance = new MockImprentaProvider(config);
        break;

      case "generic-http":
        this.providerInstance = new GenericHttpImprentaProvider(config);
        break;

      case "custom":
        // Here you can add custom provider implementations
        // For example: new CustomVendorImprentaProvider(config)
        this.logger.warn(
          "Custom provider type specified but not implemented, falling back to mock",
        );
        this.providerInstance = new MockImprentaProvider(config);
        break;

      default:
        this.logger.warn(
          `Unknown provider type: ${providerType}, using mock provider`,
        );
        this.providerInstance = new MockImprentaProvider(config);
    }

    return this.providerInstance;
  }

  /**
   * Determine the provider type from environment configuration
   */
  private getProviderType(): ImprentaProviderType {
    const mode = this.configService.get<string>("IMPRENTA_PROVIDER_MODE", "mock");

    if (mode === "mock" || mode === "development") {
      return "mock";
    }

    if (mode === "generic-http" || mode === "http" || mode === "api") {
      return "generic-http";
    }

    return mode as ImprentaProviderType;
  }

  /**
   * Build provider configuration from environment variables
   */
  private buildProviderConfig(): ImprentaProviderConfig {
    const name =
      this.configService.get<string>("IMPRENTA_PROVIDER_NAME") ||
      "Imprenta Digital";

    const apiUrl = this.configService.get<string>("IMPRENTA_PROVIDER_URL");
    const apiKey = this.configService.get<string>("IMPRENTA_PROVIDER_API_KEY");

    const rif = this.configService.get<string>("IMPRENTA_PROVIDER_RIF");
    const companyName = this.configService.get<string>(
      "IMPRENTA_PROVIDER_COMPANY_NAME",
    );

    const sandbox =
      this.configService.get<string>("IMPRENTA_PROVIDER_SANDBOX") === "true";

    const timeout = parseInt(
      this.configService.get<string>("IMPRENTA_PROVIDER_TIMEOUT", "30000"),
      10,
    );

    const maxRetries = parseInt(
      this.configService.get<string>("IMPRENTA_PROVIDER_MAX_RETRIES", "3"),
      10,
    );

    const retryDelay = parseInt(
      this.configService.get<string>("IMPRENTA_PROVIDER_RETRY_DELAY", "1000"),
      10,
    );

    const webhookUrl = this.configService.get<string>(
      "IMPRENTA_PROVIDER_WEBHOOK_URL",
    );

    // Parse custom headers if provided
    let customHeaders: Record<string, string> | undefined;
    const headersJson = this.configService.get<string>(
      "IMPRENTA_HEADERS_TEMPLATE",
    );
    if (headersJson) {
      try {
        customHeaders = JSON.parse(headersJson);
      } catch (e) {
        this.logger.warn(
          "Failed to parse IMPRENTA_HEADERS_TEMPLATE, ignoring",
        );
      }
    }

    // Parse custom payload template if provided
    let customPayload: Record<string, any> | undefined;
    const payloadJson = this.configService.get<string>(
      "IMPRENTA_PAYLOAD_TEMPLATE",
    );
    if (payloadJson) {
      try {
        customPayload = JSON.parse(payloadJson);
      } catch (e) {
        this.logger.warn(
          "Failed to parse IMPRENTA_PAYLOAD_TEMPLATE, ignoring",
        );
      }
    }

    const config: ImprentaProviderConfig = {
      name,
      apiUrl: apiUrl || "http://localhost:3000/mock",
      apiKey: apiKey || "mock-api-key",
      rif,
      companyName,
      sandbox,
      timeout,
      maxRetries,
      retryDelay,
      webhookUrl,
      customHeaders,
      customPayload,
    };

    this.logger.log(`📋 Provider config:`, {
      name: config.name,
      apiUrl: config.apiUrl,
      sandbox: config.sandbox,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      hasWebhook: !!config.webhookUrl,
    });

    return config;
  }

  /**
   * Reset the provider instance (useful for testing or reconfiguration)
   */
  resetProvider(): void {
    this.logger.log("🔄 Resetting provider instance");
    this.providerInstance = null;
  }

  /**
   * Get provider info without creating an instance
   */
  getProviderInfo(): {
    type: ImprentaProviderType;
    name: string;
    sandbox: boolean;
    configured: boolean;
  } {
    const type = this.getProviderType();
    const config = this.buildProviderConfig();

    return {
      type,
      name: config.name,
      sandbox: config.sandbox || false,
      configured: !!(config.apiUrl && config.apiKey),
    };
  }
}
