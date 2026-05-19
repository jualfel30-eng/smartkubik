import { Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import { dirname, join } from "path";

export interface StoredProofImage {
  url: string;
  storageKey: string;
}

export interface PaymentProofStorageAdapter {
  /**
   * Persist the optimized webp buffer for a single proof and return the
   * URL the customer/admin will use to display it.
   */
  save(input: {
    tenantId: string;
    paymentRequestId: string;
    proofId: string;
    buffer: Buffer;
  }): Promise<StoredProofImage>;

  /**
   * Best-effort delete. Implementations should not throw on missing keys —
   * the proof history is the source of truth, the file is just a cache.
   */
  delete(storageKey: string): Promise<void>;
}

/**
 * Default PR1 adapter: writes under the existing `uploads/` folder, which
 * `main.ts` already exposes via `app.use("/uploads", express.static(...))`.
 *
 * A Cloudflare R2 adapter implementing the same interface will land in a
 * follow-up — switching providers will only require swapping the
 * provider binding in PaymentRequestsModule.
 */
@Injectable()
export class LocalDiskPaymentProofStorageAdapter
  implements PaymentProofStorageAdapter
{
  private readonly logger = new Logger(LocalDiskPaymentProofStorageAdapter.name);

  // Relative to the process cwd at runtime (compiled dist sits next to
  // the uploads/ folder per main.ts).
  private readonly rootDir = join(process.cwd(), "uploads", "payment-proofs");
  private readonly urlPrefix = "/uploads/payment-proofs";

  async save({
    tenantId,
    paymentRequestId,
    proofId,
    buffer,
  }: {
    tenantId: string;
    paymentRequestId: string;
    proofId: string;
    buffer: Buffer;
  }): Promise<StoredProofImage> {
    const safeTenant = this.sanitizeSegment(tenantId);
    const safeRequest = this.sanitizeSegment(paymentRequestId);
    const safeProof = this.sanitizeSegment(proofId);

    const relativePath = `${safeTenant}/${safeRequest}/${safeProof}.webp`;
    const absolutePath = join(this.rootDir, relativePath);

    await fs.mkdir(dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer, { mode: 0o640 });

    const url = `${this.urlPrefix}/${relativePath}`;
    this.logger.debug(`Wrote payment proof to ${absolutePath} (${buffer.length} bytes)`);

    return {
      url,
      storageKey: relativePath,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const sanitized = this.sanitizeKey(storageKey);
    const absolutePath = join(this.rootDir, sanitized);

    try {
      await fs.unlink(absolutePath);
    } catch (err: any) {
      if (err?.code !== "ENOENT") {
        this.logger.warn(
          `Failed to delete payment proof at ${absolutePath}: ${err.message}`,
        );
      }
    }
  }

  // Reject any path-traversal attempts even though our inputs are server-
  // generated ObjectIds — defense in depth.
  private sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  private sanitizeKey(key: string): string {
    return key
      .split("/")
      .map((segment) => this.sanitizeSegment(segment))
      .join("/");
  }
}

/**
 * Public symbol other services inject. The module binds it to the
 * LocalDiskPaymentProofStorageAdapter today; the R2 adapter swap will
 * be a one-line provider change.
 */
export const PAYMENT_PROOF_STORAGE = Symbol("PAYMENT_PROOF_STORAGE");
