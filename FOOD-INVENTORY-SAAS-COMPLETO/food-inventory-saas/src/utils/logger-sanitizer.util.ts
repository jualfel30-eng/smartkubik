/**
 * Utility para sanitizar datos sensibles en logs
 *
 * Uso:
 * ```typescript
 * this.logger.log(`User data: ${JSON.stringify(LoggerSanitizer.sanitize(userData))}`);
 * ```
 */
export class LoggerSanitizer {
  /**
   * Lista de campos sensibles que deben ser redactados
   */
  private static readonly SENSITIVE_FIELDS = [
    // Autenticación y tokens
    'password',
    'currentPassword',
    'newPassword',
    'oldPassword',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'resetToken',
    'verificationToken',
    'jwt',
    'bearer',
    'authorization',

    // Datos de pago
    'creditCard',
    'cardNumber',
    'cvv',
    'cvc',
    'pin',
    'accountNumber',
    'routingNumber',

    // Secretos y claves
    'secret',
    'apiKey',
    'apiSecret',
    'privateKey',
    'secretKey',
    'encryptionKey',

    // Sesión y cookies
    'cookie',
    'session',
    'sessionId',

    // Datos personales sensibles (opcional, depende de regulaciones)
    // 'ssn', // Social Security Number
    // 'taxId', // Puede contener información sensible
  ];

  /**
   * Sanitiza un objeto recursivamente, reemplazando valores sensibles
   *
   * @param data - Objeto, array o valor primitivo a sanitizar
   * @returns Copia sanitizada del dato
   */
  static sanitize(data: any): any {
    // Null o undefined
    if (data === null || data === undefined) {
      return data;
    }

    // Tipos primitivos (string, number, boolean)
    if (typeof data !== 'object') {
      return data;
    }

    // Arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    // Objetos
    const sanitized: any = {};

    for (const key in data) {
      if (!data.hasOwnProperty(key)) {
        continue;
      }

      // Verificar si el campo es sensible
      if (this.isSensitiveField(key)) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof data[key] === 'object') {
        // Recursivamente sanitizar objetos anidados
        sanitized[key] = this.sanitize(data[key]);
      } else {
        // Mantener valor original si no es sensible
        sanitized[key] = data[key];
      }
    }

    return sanitized;
  }

  /**
   * Verifica si un nombre de campo es sensible
   *
   * @param fieldName - Nombre del campo a verificar
   * @returns true si el campo es sensible
   */
  private static isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();

    return this.SENSITIVE_FIELDS.some((sensitiveField) => {
      return lowerFieldName.includes(sensitiveField.toLowerCase());
    });
  }

  /**
   * Sanitiza un string que puede contener JSON
   * Útil para logs de requests/responses
   *
   * @param text - Texto que puede contener JSON
   * @returns Texto sanitizado
   */
  static sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    try {
      // Intentar parsear como JSON
      const parsed = JSON.parse(text);
      const sanitized = this.sanitize(parsed);
      return JSON.stringify(sanitized);
    } catch {
      // No es JSON, buscar patterns sensibles en texto plano
      let sanitizedText = text;

      // Redactar patterns comunes de tokens
      sanitizedText = sanitizedText.replace(
        /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/gi,
        'Bearer ***REDACTED***'
      );

      // Redactar patterns de passwords en URLs
      sanitizedText = sanitizedText.replace(
        /password=[^&\s]*/gi,
        'password=***REDACTED***'
      );

      // Redactar patterns de tokens en URLs
      sanitizedText = sanitizedText.replace(
        /token=[^&\s]*/gi,
        'token=***REDACTED***'
      );

      return sanitizedText;
    }
  }

  /**
   * Sanitiza headers HTTP
   *
   * @param headers - Objeto de headers HTTP
   * @returns Headers sanitizados
   */
  static sanitizeHeaders(headers: any): any {
    if (!headers || typeof headers !== 'object') {
      return headers;
    }

    const sanitized: any = { ...headers };

    // Headers sensibles comunes
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
    ];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '***REDACTED***';
      }
      // También buscar case-insensitive
      const lowerHeader = header.toLowerCase();
      for (const key in sanitized) {
        if (key.toLowerCase() === lowerHeader) {
          sanitized[key] = '***REDACTED***';
        }
      }
    }

    return sanitized;
  }

  /**
   * Crea un mensaje de log seguro
   *
   * @param message - Mensaje base
   * @param data - Datos a incluir (serán sanitizados)
   * @returns String formateado y sanitizado
   */
  static createLogMessage(message: string, data?: any): string {
    if (!data) {
      return message;
    }

    const sanitized = this.sanitize(data);
    return `${message} ${JSON.stringify(sanitized)}`;
  }
}
