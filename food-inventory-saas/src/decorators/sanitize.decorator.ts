import { Transform } from "class-transformer";
import * as sanitizeHtml from "sanitize-html";

/**
 * Decorator para sanitizar strings y prevenir XSS
 *
 * Uso:
 * ```typescript
 * export class CreateCustomerDto {
 *   @IsString()
 *   @IsNotEmpty()
 *   @SanitizeString()
 *   name: string;
 * }
 * ```
 *
 * Esto elimina todos los tags HTML y scripts maliciosos.
 */
export function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value !== "string") {
      return value;
    }

    // Eliminar todos los tags HTML y scripts
    const sanitized = sanitizeHtml(value, {
      allowedTags: [], // No permitir ningún tag HTML
      allowedAttributes: {}, // No permitir ningún atributo
      disallowedTagsMode: "discard", // Eliminar tags no permitidos completamente
    });

    // Trim whitespace
    return sanitized.trim();
  });
}

/**
 * Decorator para sanitizar strings pero permitir saltos de línea
 * Útil para campos de texto largo como descripciones o notas
 *
 * Uso:
 * ```typescript
 * export class CreateProductDto {
 *   @IsString()
 *   @IsOptional()
 *   @SanitizeText()
 *   description?: string;
 * }
 * ```
 */
export function SanitizeText() {
  return Transform(({ value }) => {
    if (typeof value !== "string") {
      return value;
    }

    // Eliminar tags HTML pero preservar saltos de línea
    const sanitized = sanitizeHtml(value, {
      allowedTags: [], // No permitir ningún tag HTML
      allowedAttributes: {},
      disallowedTagsMode: "discard",
    });

    // Trim solo espacios al inicio/final, preservar \n
    return sanitized.replace(/^\s+|\s+$/g, "");
  });
}

/**
 * Decorator para sanitizar arrays de strings
 *
 * Uso:
 * ```typescript
 * export class CreateProductDto {
 *   @IsArray()
 *   @IsString({ each: true })
 *   @SanitizeStringArray()
 *   tags: string[];
 * }
 * ```
 */
export function SanitizeStringArray() {
  return Transform(({ value }) => {
    if (!Array.isArray(value)) {
      return value;
    }

    return value.map((item) => {
      if (typeof item !== "string") {
        return item;
      }

      const sanitized = sanitizeHtml(item, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: "discard",
      });

      return sanitized.trim();
    });
  });
}
