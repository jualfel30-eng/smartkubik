#!/usr/bin/env node
/**
 * preflight-tenant-safety
 *
 * Hook PreToolUse para Edit/Write sobre *.service.ts/*.schema.ts/*.controller.ts.
 * Escanea el contenido propuesto buscando patterns de bug recurrentes.
 *
 * Exit codes:
 *   0 — no findings o solo info/warning
 *   2 — findings de severidad alta (bloquea el Edit)
 *
 * Documentación: ./SKILL.md
 */

const fs = require('fs');

let input;
try {
  input = JSON.parse(fs.readFileSync(0, 'utf-8'));
} catch (err) {
  // Si no recibe input válido, no bloquea (no romper el flujo).
  process.exit(0);
}

const newCode =
  input?.tool_input?.new_string ||
  input?.tool_input?.content ||
  '';

const filePath = input?.tool_input?.file_path || '';

if (!newCode) process.exit(0);
if (!filePath.match(/\.(service|schema|controller)\.ts$/)) process.exit(0);

const checks = [
  {
    severity: 'alta',
    pattern: /\.(?:find|findOne|updateOne|updateMany|deleteOne|deleteMany)\(\s*\{(?:(?!tenantId)[^{}]|\{[^{}]*\})*\}\s*[,)]/g,
    message: 'query sin tenantId en el filtro',
    docLink: 'docs/wiki/patterns/tenant-isolation.md',
    suggest: 'añade `tenantId` al filtro o documenta por qué es seguro omitirlo (super-admin, endpoint público).',
  },
  {
    severity: 'media',
    pattern: /\.findById\(/g,
    message: 'findById en modelo que probablemente tiene tenantId',
    docLink: 'docs/wiki/patterns/tenant-isolation.md',
    suggest: 'usa `findOne({ _id: id, tenantId })` para evitar lectura cross-tenant.',
  },
  {
    severity: 'media',
    pattern: /new\s+Types\.ObjectId\(([^)]+)\)/g,
    message: 'ObjectId construido sin validación previa',
    docLink: 'docs/wiki/patterns/objectid-vs-string.md',
    suggest: 'añade `if (!Types.ObjectId.isValid(value)) throw new BadRequestException(...)`.',
  },
  {
    severity: 'media',
    pattern: /\{\s*isDeleted:\s*false\s*\}/g,
    message: 'filtro `isDeleted: false` no matchea documentos con `isDeleted: undefined`',
    docLink: 'docs/wiki/patterns/soft-delete-conventions.md',
    suggest: 'usa `{ isDeleted: { $ne: true } }`.',
  },
  {
    severity: 'media',
    pattern: /\{\s*isActive:\s*true\s*\}/g,
    message: 'filtro `isActive: true` no matchea documentos legacy sin el campo',
    docLink: 'docs/wiki/patterns/soft-delete-conventions.md',
    suggest: 'usa `{ isActive: { $ne: false } }`.',
  },
  {
    severity: 'media',
    pattern: /countDocuments\([^)]*\)[\s\S]{0,80}padStart/g,
    message: 'parece numeración secuencial usando countDocuments (no atómico)',
    docLink: 'docs/wiki/patterns/sequential-number-races.md',
    suggest: 'usa estrategia MAX+1 (findOne sort -1) o contador atómico dedicado.',
  },
];

const findings = [];

for (const check of checks) {
  const matches = [...newCode.matchAll(check.pattern)];
  for (const m of matches) {
    const upToMatch = newCode.slice(0, m.index);
    const lineNum = upToMatch.split('\n').length;
    const snippet = m[0].replace(/\s+/g, ' ').slice(0, 100);
    findings.push({
      severity: check.severity,
      line: lineNum,
      message: check.message,
      snippet,
      docLink: check.docLink,
      suggest: check.suggest,
    });
  }
}

if (findings.length === 0) process.exit(0);

const sevOrder = { alta: 0, media: 1, baja: 2 };
findings.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || a.line - b.line);

console.error('');
console.error(`⚠️  preflight-tenant-safety — ${findings.length} hallazgo(s) en ${filePath}:`);
console.error('');
for (const f of findings) {
  const tag = `[${f.severity.toUpperCase()}]`;
  console.error(`${tag} línea ~${f.line}: ${f.message}`);
  console.error(`    ${f.snippet}`);
  console.error(`    → ${f.suggest}`);
  console.error(`    → Pattern: ${f.docLink}`);
  console.error('');
}

const hasHigh = findings.some((f) => f.severity === 'alta');
process.exit(hasHigh ? 2 : 0);
