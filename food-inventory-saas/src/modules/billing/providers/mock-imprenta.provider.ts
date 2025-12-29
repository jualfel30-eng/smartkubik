import {
  BaseImprentaProvider,
  ImprentaControlNumberRequest,
  ImprentaControlNumberResponse,
  ImprentaProviderConfig,
  ImprentaStatusResponse,
} from "./base-imprenta.provider";
import * as crypto from "crypto";

/**
 * Mock Imprenta Provider for development and testing
 * Simulates a real imprenta provider without external API calls
 */
export class MockImprentaProvider extends BaseImprentaProvider {
  private issuedDocuments: Map<
    string,
    { status: string; issuedAt: Date; metadata: any }
  > = new Map();

  constructor(config?: Partial<ImprentaProviderConfig>) {
    super({
      name: "Mock Imprenta Digital",
      apiUrl: "http://localhost:3000/mock",
      apiKey: "mock-api-key",
      rif: "J-000000000",
      companyName: "Imprenta Digital Mock S.A.",
      sandbox: true,
      ...config,
    });
    this.logger.log("🎭 Mock Imprenta Provider initialized");
  }

  async requestControlNumber(
    request: ImprentaControlNumberRequest,
  ): Promise<ImprentaControlNumberResponse> {
    this.logger.log(
      `📝 Mock: Requesting control number for document ${request.documentNumber}`,
    );

    // Simulate network delay (100-500ms)
    const delay = Math.random() * 400 + 100;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Simulate 5% failure rate (for testing retry logic)
    if (Math.random() < 0.05) {
      this.logger.warn("🔴 Mock: Simulating random failure");
      throw new Error("Mock Provider: Simulated network error");
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // Generate realistic control number format
    // Format: YEAR-MONTH-SEQUENCE (e.g., 2024-12-001234)
    const sequence = String(Math.floor(Math.random() * 999999) + 1).padStart(
      6,
      "0",
    );
    const controlNumber = `${year}-${month}-${sequence}`;

    // Generate hash of the document
    const hash = crypto
      .createHash("sha256")
      .update(
        `${request.documentId}${request.documentNumber}${controlNumber}${now.toISOString()}`,
      )
      .digest("hex");

    // Generate a simple QR code data URL (base64 SVG)
    const qrCode = this.generateMockQRCode(controlNumber, request.customerData?.rif);

    // Build verification URL
    const verificationUrl = this.buildVerificationUrl(
      controlNumber,
      this.config.rif,
    );

    // Store document status
    this.issuedDocuments.set(controlNumber, {
      status: "issued",
      issuedAt: now,
      metadata: {
        documentId: request.documentId,
        documentNumber: request.documentNumber,
        type: request.type,
        total: request.totals?.grandTotal,
        currency: request.totals?.currency,
      },
    });

    this.logger.log(
      `✅ Mock: Control number ${controlNumber} assigned successfully`,
    );

    return {
      controlNumber,
      provider: this.config.name,
      providerRif: this.config.rif,
      providerName: this.config.companyName,
      assignedAt: now,
      hash,
      verificationUrl,
      qrCode,
      success: true,
      metadata: {
        seriesId: request.seriesId,
        type: request.type,
        mode: "mock",
        processingTime: `${delay.toFixed(0)}ms`,
        documentNumber: request.documentNumber,
        total: request.totals?.grandTotal,
        currency: request.totals?.currency,
      },
    };
  }

  async queryStatus(controlNumber: string): Promise<ImprentaStatusResponse> {
    this.logger.log(`🔍 Mock: Querying status for ${controlNumber}`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const document = this.issuedDocuments.get(controlNumber);

    if (!document) {
      throw new Error(`Control number ${controlNumber} not found`);
    }

    return {
      controlNumber,
      status: document.status as any,
      details: document.metadata,
      updatedAt: document.issuedAt,
    };
  }

  async cancelDocument(
    controlNumber: string,
    reason?: string,
  ): Promise<boolean> {
    this.logger.log(`❌ Mock: Cancelling document ${controlNumber}`);

    const document = this.issuedDocuments.get(controlNumber);

    if (!document) {
      throw new Error(`Control number ${controlNumber} not found`);
    }

    if (document.status === "cancelled") {
      throw new Error(`Document ${controlNumber} is already cancelled`);
    }

    // Update status
    document.status = "cancelled";
    document.metadata.cancelledAt = new Date();
    document.metadata.cancellationReason = reason || "No reason provided";

    this.issuedDocuments.set(controlNumber, document);

    this.logger.log(`✅ Mock: Document ${controlNumber} cancelled successfully`);

    return true;
  }

  /**
   * Generate a mock QR code (base64 SVG)
   */
  private generateMockQRCode(
    controlNumber: string,
    customerRif?: string,
  ): string {
    // In a real implementation, this would generate an actual QR code
    // For mock, we return a simple SVG data URL
    const qrData = `${controlNumber}|${customerRif || ""}|${this.config.rif}`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" font-family="monospace" font-size="10" fill="black">
        ${controlNumber}
      </text>
      <text x="100" y="120" text-anchor="middle" font-family="monospace" font-size="8" fill="gray">
        Mock QR Code
      </text>
    </svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }

  /**
   * Clear all issued documents (for testing)
   */
  clearIssuedDocuments(): void {
    this.issuedDocuments.clear();
    this.logger.log("🗑️  Mock: All issued documents cleared");
  }

  /**
   * Get all issued documents (for testing/debugging)
   */
  getIssuedDocuments(): Map<string, any> {
    return this.issuedDocuments;
  }

  /**
   * Get statistics (for testing/debugging)
   */
  getStatistics(): {
    totalIssued: number;
    totalCancelled: number;
    documents: any[];
  } {
    const documents = Array.from(this.issuedDocuments.entries()).map(
      ([controlNumber, data]) => ({
        controlNumber,
        ...data,
      }),
    );

    return {
      totalIssued: documents.length,
      totalCancelled: documents.filter((d) => d.status === "cancelled").length,
      documents,
    };
  }
}
