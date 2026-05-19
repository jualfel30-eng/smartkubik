import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import sharp from "sharp";

export interface OptimizedImage {
  buffer: Buffer;
  hash: string;
  bytes: number;
  width: number;
  height: number;
  mime: "image/webp";
}

/**
 * Magic-byte signatures for the formats we accept. Trusting the extension
 * or the multipart Content-Type alone is unsafe — a malicious client can
 * upload anything labelled .jpg. We validate the first bytes of the buffer.
 */
const IMAGE_SIGNATURES: Array<{
  name: string;
  matches: (buf: Buffer) => boolean;
}> = [
  // JPEG: FF D8 FF
  {
    name: "jpeg",
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  {
    name: "png",
    matches: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  // WebP: "RIFF" .... "WEBP"
  {
    name: "webp",
    matches: (b) =>
      b.length >= 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
  // HEIC/HEIF (iPhone defaults): ISO base media file with "ftypheic" / "ftypheix" / "ftyphevc" / "ftypmif1" at offset 4
  {
    name: "heic",
    matches: (b) => {
      if (b.length < 12) return false;
      const brand = b.toString("ascii", 4, 12);
      return (
        brand.startsWith("ftypheic") ||
        brand.startsWith("ftypheix") ||
        brand.startsWith("ftyphevc") ||
        brand.startsWith("ftypmif1") ||
        brand.startsWith("ftypmsf1")
      );
    },
  },
];

/**
 * Sharp pipeline turning whatever the customer uploaded into a privacy-safe,
 * bandwidth-friendly webp. The original buffer is discarded — we never
 * persist EXIF metadata (location, device, etc.) or full-resolution images.
 */
@Injectable()
export class ImageOptimizerService {
  private readonly logger = new Logger(ImageOptimizerService.name);

  // 10MB raw upload limit before optimization. The controller's
  // FileInterceptor enforces this too — this is a defense-in-depth check.
  private readonly MAX_RAW_BYTES = 10 * 1024 * 1024;
  private readonly TARGET_MAX_WIDTH = 1600;
  private readonly WEBP_QUALITY = 80;

  validateMagicBytes(buffer: Buffer): void {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BadRequestException("Imagen vacía o inválida");
    }

    if (buffer.length > this.MAX_RAW_BYTES) {
      throw new BadRequestException(
        "La imagen supera el tamaño máximo permitido (10MB)",
      );
    }

    const matched = IMAGE_SIGNATURES.find((sig) => sig.matches(buffer));
    if (!matched) {
      throw new BadRequestException(
        "Formato de imagen no soportado. Sube una foto en JPG, PNG, WebP o HEIC.",
      );
    }
  }

  async optimize(input: Buffer): Promise<OptimizedImage> {
    this.validateMagicBytes(input);

    try {
      const pipeline = sharp(input, { failOn: "error" })
        .rotate() // apply EXIF orientation BEFORE we strip metadata
        .resize({
          width: this.TARGET_MAX_WIDTH,
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality: this.WEBP_QUALITY });

      // .withMetadata is NOT called → Sharp drops EXIF/IPTC/XMP by default.
      const { data, info } = await pipeline.toBuffer({
        resolveWithObject: true,
      });

      const hash = createHash("sha256").update(data).digest("hex");

      this.logger.debug(
        `Optimized image: ${info.width}x${info.height}, ${data.length} bytes, hash=${hash.substring(0, 8)}…`,
      );

      return {
        buffer: data,
        hash,
        bytes: data.length,
        width: info.width,
        height: info.height,
        mime: "image/webp",
      };
    } catch (err) {
      this.logger.error(`Sharp optimization failed: ${err.message}`);
      throw new BadRequestException(
        "No fue posible procesar la imagen. Toma otra foto e inténtalo de nuevo.",
      );
    }
  }
}
