import { describe, it, expect } from 'vitest';
import { parseScaleBarcode } from './scale-barcode';

const cfg = {
  enabled: true,
  prefix: '2',
  pluLength: 5,
  priceLength: 5,
  priceDecimals: 2,
};

describe('parseScaleBarcode', () => {
  it('parsea PLU y precio de una etiqueta de balanza válida', () => {
    // 2 | 76536 | 01230 | 4(check) → PLU 76536, precio 12.30
    expect(parseScaleBarcode('276536012304', cfg)).toEqual({
      scaleCode: '76536',
      price: 12.3,
    });
  });

  it('devuelve null si la config está deshabilitada', () => {
    expect(parseScaleBarcode('276536012304', { ...cfg, enabled: false })).toBeNull();
  });

  it('devuelve null si no matchea el prefijo (código normal)', () => {
    expect(parseScaleBarcode('7591234567890', cfg)).toBeNull();
  });

  it('devuelve null si el código es muy corto', () => {
    expect(parseScaleBarcode('2765', cfg)).toBeNull();
  });

  it('devuelve null para códigos no numéricos', () => {
    expect(parseScaleBarcode('ABC-123', cfg)).toBeNull();
  });

  it('respeta priceDecimals (0 → precio entero)', () => {
    // precio 01230 con 0 decimales = 1230
    expect(parseScaleBarcode('276536012304', { ...cfg, priceDecimals: 0 })).toEqual({
      scaleCode: '76536',
      price: 1230,
    });
  });

  it('soporta prefijo de 2 dígitos y otras longitudes', () => {
    // prefijo 20, PLU 4, precio 6 (2 dec): 20 | 1234 | 005075 | C
    const cfg2 = { enabled: true, prefix: '20', pluLength: 4, priceLength: 6, priceDecimals: 2 };
    expect(parseScaleBarcode('20123400507' + '5', cfg2)).toEqual({
      scaleCode: '1234',
      price: 50.75,
    });
  });
});
