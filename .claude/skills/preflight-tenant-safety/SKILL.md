---
name: preflight-tenant-safety
description: Hook PreToolUse que escanea diffs propuestos a *.service.ts/*.schema.ts/*.controller.ts buscando patterns de bug recurrentes (queries sin tenantId, ObjectId vs String, soft-delete inconsistente, sequential numbers no atómicos). Warning + advice antes de aplicar el cambio.
trigger: hook PreToolUse Edit/Write
---

# preflight-tenant-safety

## Cuándo se invoca

Hook automático del harness, NO manualmente. Se dispara antes de ejecutar `Edit` o `Write` sobre archivos:

- `food-inventory-saas/src/modules/**/*.service.ts`
- `food-inventory-saas/src/modules/**/*.schema.ts`
- `food-inventory-saas/src/modules/**/*.controller.ts`

## Qué busca (patterns)

| Patrón detectado | Severidad | Pattern doc |
|---|---|---|
| `Model.find(\|findOne\|updateOne\|deleteOne)({ ... })` sin `tenantId` en el filtro | **alta** (bloquea) | tenant-isolation |
| `Model.findById(...)` (en modelos con tenantId) | media (warning) | tenant-isolation |
| Aggregation cuyo primer stage no es `$match` con `tenantId` | alta (bloquea) | tenant-isolation |
| `.find({ <campo_id>: <var> })` sin `$in` (cuando el campo está en lista de mixed-type) | media (warning) | objectid-vs-string |
| `Types.ObjectId(value)` sin guard `Types.ObjectId.isValid(value)` | media (warning) | objectid-vs-string |
| `{ isDeleted: false }` o `{ isActive: true }` literal (no `$ne`) | media (warning) | soft-delete-conventions |
| `countDocuments(...)` seguido de string concatenation que parece numeración | media (warning) | sequential-number-races |
| Schema con `required: true` añadido y sin `default` | baja (info) | legacy-required-fields |

Lista de campos mixed-type conocidos: `tenantId`, `productId`, `supplierId`, `customerId`, `warehouseId`, `userId`.

## Comportamiento

- **Severidad alta** → bloquea el Edit. El usuario debe ajustar el código o confirmar con razón explícita.
- **Severidad media** → warning con sugerencia. No bloquea, pero queda en log.
- **Severidad baja** → info, solo en log.

## Outputs

Anotaciones inline al flujo de Edit:

```
⚠️  preflight-tenant-safety detected:

[ALTA] line 142: query sin tenantId
  this.model.find({ status: 'active' })
  → Considera: this.model.find({ status: 'active', tenantId })
  → Pattern: docs/wiki/patterns/tenant-isolation.md

[MEDIA] line 89: ObjectId no validado
  new Types.ObjectId(req.params.id)
  → Considera: if (!Types.ObjectId.isValid(req.params.id)) throw new BadRequestException(...)
  → Pattern: docs/wiki/patterns/objectid-vs-string.md

Continuar? (responde "sí" para aplicar, "no" para ajustar)
```

## Configuración (en `.claude/settings.json`)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "if": "Edit(food-inventory-saas/src/modules/**/*.{service,schema,controller}.ts)",
            "command": "node .claude/skills/preflight-tenant-safety/scan.js",
            "timeout": 15
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "if": "Write(food-inventory-saas/src/modules/**/*.{service,schema,controller}.ts)",
            "command": "node .claude/skills/preflight-tenant-safety/scan.js",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

## Implementación sugerida (`scan.js`)

Stub: lee el diff propuesto desde stdin (formato hook), aplica regexes/AST simple para los patterns de la tabla, imprime hallazgos en formato anotado, exit 0 (warnings) o exit 2 (bloquea).

```js
// .claude/skills/preflight-tenant-safety/scan.js
const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
const newCode = input.tool_input.new_string || input.tool_input.content || '';

const findings = [];
const checks = [
  {
    severity: 'alta',
    pattern: /\.find(?:One|OneAnd\w+)?\(\s*\{(?![^}]*tenantId)[^}]*\}\s*\)/g,
    message: 'query sin tenantId',
    docLink: 'docs/wiki/patterns/tenant-isolation.md',
  },
  // ... más checks
];

for (const check of checks) {
  const matches = [...newCode.matchAll(check.pattern)];
  for (const m of matches) {
    findings.push({ ...check, snippet: m[0].slice(0, 80) });
  }
}

if (findings.length > 0) {
  for (const f of findings) {
    console.error(`[${f.severity.toUpperCase()}] ${f.message}\n  ${f.snippet}\n  → Pattern: ${f.docLink}`);
  }
  // exit 2 si hay severidad alta, 0 si solo warnings
  process.exit(findings.some((f) => f.severity === 'alta') ? 2 : 0);
}
process.exit(0);
```

## Roadmap

- v1: regex-based (rápido, ~80% precision).
- v2: AST-based con `ts-morph` (mayor precisión, soporta refactorings complejos).
- v3: integración con LSP del proyecto para sugerencias contextuales.
