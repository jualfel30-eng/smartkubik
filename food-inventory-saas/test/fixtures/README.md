# Test Fixtures

Este directorio contiene datos de prueba para testing automatizado y manual.

## Estructura:

```
fixtures/
├── README.md (este archivo)
├── users-test-data.json          # Usuarios de prueba
├── products-test-data.json       # Productos de prueba
├── orders-test-data.json         # Órdenes de prueba
├── bank-statements.csv           # Extractos bancarios para import
└── ...
```

## Uso:

### En Tests Unitarios:

```typescript
import testUsers from '../fixtures/users-test-data.json';

describe('UsersService', () => {
  it('should create user', async () => {
    const userData = testUsers[0];
    const result = await service.create(userData);
    expect(result).toBeDefined();
  });
});
```

### En Tests Manuales:

1. Cargar datos desde fixtures en lugar de crearlos manualmente
2. Mantiene consistencia entre pruebas
3. Facilita reproducir bugs

## Convenciones:

- Archivos JSON para datos estructurados
- CSV para import/export
- Usar datos realistas pero anónimos
- No incluir datos sensibles (contraseñas reales, tokens, etc.)
