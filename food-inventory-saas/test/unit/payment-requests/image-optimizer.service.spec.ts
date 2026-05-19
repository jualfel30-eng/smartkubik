import { BadRequestException } from "@nestjs/common";
import sharp from "sharp";
import { ImageOptimizerService } from "../../../src/modules/payment-requests/services/image-optimizer.service";

/**
 * Generates a deterministic JPEG buffer with embedded EXIF metadata so we
 * can assert it's stripped on the output. We use Sharp to build the source
 * so we don't depend on test fixture files.
 */
async function makeJpegWithExif(width = 2000, height = 1200): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .withMetadata({
      exif: {
        IFD0: {
          // Add an obvious EXIF tag we'll look for in the output
          Software: "ImageOptimizerSpec",
          Copyright: "test-fixture",
        },
      },
    })
    .jpeg()
    .toBuffer();
}

describe("ImageOptimizerService", () => {
  const service = new ImageOptimizerService();

  describe("validateMagicBytes", () => {
    it("accepts JPEG (FF D8 FF)", () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00]);
      expect(() => service.validateMagicBytes(buf)).not.toThrow();
    });

    it("accepts PNG signature", () => {
      const buf = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]);
      expect(() => service.validateMagicBytes(buf)).not.toThrow();
    });

    it("accepts WebP (RIFF .... WEBP)", () => {
      const buf = Buffer.from(
        "RIFF" + "\x00\x00\x00\x00" + "WEBP" + "more",
        "binary",
      );
      expect(() => service.validateMagicBytes(buf)).not.toThrow();
    });

    it("rejects PDFs masquerading as images", () => {
      // "%PDF-1.7" + filler — well-formed file, wrong type
      const fake = Buffer.from("%PDF-1.7\n%anything", "binary");
      expect(() => service.validateMagicBytes(fake)).toThrow(BadRequestException);
    });

    it("rejects executables / random binary garbage", () => {
      const garbage = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // Windows PE
      expect(() => service.validateMagicBytes(garbage)).toThrow(
        BadRequestException,
      );
    });

    it("rejects empty buffers", () => {
      expect(() => service.validateMagicBytes(Buffer.alloc(0))).toThrow(
        BadRequestException,
      );
    });

    it("rejects oversize buffers (>10MB raw)", () => {
      // Allocate a 11MB buffer starting with JPEG magic so only the
      // size check should fail
      const oversize = Buffer.alloc(11 * 1024 * 1024);
      oversize[0] = 0xff;
      oversize[1] = 0xd8;
      oversize[2] = 0xff;
      expect(() => service.validateMagicBytes(oversize)).toThrow(
        BadRequestException,
      );
    });
  });

  describe("optimize", () => {
    it("returns webp output bytes < input bytes and produces a stable SHA-256 hash", async () => {
      const input = await makeJpegWithExif(2400, 1600);
      const out = await service.optimize(input);

      expect(out.mime).toBe("image/webp");
      expect(out.buffer.length).toBeLessThan(input.length);
      expect(out.hash).toMatch(/^[a-f0-9]{64}$/);

      // Same input → same hash
      const second = await service.optimize(input);
      expect(second.hash).toBe(out.hash);
    });

    it("resizes to max width 1600 (never upscales)", async () => {
      const big = await makeJpegWithExif(3200, 1800);
      const out = await service.optimize(big);
      expect(out.width).toBeLessThanOrEqual(1600);

      // Verify Sharp can re-read it
      const meta = await sharp(out.buffer).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBeLessThanOrEqual(1600);

      // No upscale for small input
      const small = await sharp({
        create: { width: 400, height: 300, channels: 3, background: "#fff" },
      })
        .jpeg()
        .toBuffer();
      const smallOut = await service.optimize(small);
      expect(smallOut.width).toBeLessThanOrEqual(400);
    });

    it("strips EXIF metadata", async () => {
      const input = await makeJpegWithExif();
      const out = await service.optimize(input);

      const meta = await sharp(out.buffer).metadata();
      // After our pipeline, exif/xmp/iptc should all be absent
      expect(meta.exif).toBeUndefined();
      expect(meta.iptc).toBeUndefined();
      expect(meta.xmp).toBeUndefined();
    });

    it("rejects non-image input early via magic-byte gate", async () => {
      await expect(
        service.optimize(Buffer.from("not an image", "utf8")),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
