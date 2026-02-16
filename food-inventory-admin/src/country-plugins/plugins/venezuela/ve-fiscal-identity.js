const RIF_PATTERN = /^([JVEGP])-?(\d{8})-?(\d)$/i;

export const veFiscalIdentity = {
  getIdTypes() {
    return [
      { code: 'J', name: 'Jurídica', pattern: /^J-?\d{8}-?\d$/, example: 'J-12345678-9' },
      { code: 'V', name: 'Venezolano', pattern: /^V-?\d{8}-?\d?$/, example: 'V-12345678-0' },
      { code: 'E', name: 'Extranjero', pattern: /^E-?\d{8}-?\d?$/, example: 'E-12345678-0' },
      { code: 'G', name: 'Gobierno', pattern: /^G-?\d{8}-?\d$/, example: 'G-12345678-9' },
      { code: 'P', name: 'Pasaporte', pattern: /^P-?\d{8}-?\d?$/, example: 'P-12345678-0' },
    ];
  },

  validate(taxId, type) {
    if (!taxId || typeof taxId !== 'string') {
      return { valid: false, error: 'Tax ID is required' };
    }
    const cleaned = taxId.trim().toUpperCase();
    const match = cleaned.match(RIF_PATTERN);
    if (!match) {
      return { valid: false, error: 'Invalid RIF format. Expected: X-12345678-9' };
    }
    const rifType = match[1];
    if (type && rifType !== type.toUpperCase()) {
      return { valid: false, error: `Expected type ${type}, got ${rifType}` };
    }
    return { valid: true, type: rifType };
  },

  format(taxId) {
    const parsed = this.parse(taxId);
    return parsed.formatted;
  },

  parse(rawInput) {
    const cleaned = rawInput.trim().toUpperCase().replace(/[^JVEGP0-9]/g, '');
    const typeChar = cleaned[0];
    const digits = cleaned.slice(1);
    const number = digits.slice(0, 8);
    const checkDigit = digits.length > 8 ? digits.slice(8, 9) : '';
    return {
      type: typeChar,
      number,
      checkDigit: checkDigit || undefined,
      formatted: checkDigit ? `${typeChar}-${number}-${checkDigit}` : `${typeChar}-${number}`,
    };
  },

  getFieldLabel() {
    return 'RIF';
  },
};
