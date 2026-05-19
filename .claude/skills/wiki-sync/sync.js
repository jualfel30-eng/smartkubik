#!/usr/bin/env node
/**
 * wiki-sync v2
 *
 * Hook PostToolUse Bash (matcher git commit). Corre DESPUÉS de
 * scripts/wiki-change-detector.sh. Mientras el detector sólo apunta el
 * módulo y los archivos, este script enriquece la entrada pendiente con
 * findings concretos extraídos del diff:
 *
 *   - endpoints HTTP añadidos/eliminados
 *   - métodos públicos de service nuevos
 *   - campos DTO añadidos (@ApiProperty / @ApiPropertyOptional)
 *   - props de schema añadidas (@Prop)
 *   - sugerencia de docs a actualizar (basada en system-map §4)
 *
 * El bloque enriquecido se anexa al final de docs/wiki/.pending-reviews.md
 * bajo el tag <!-- wiki-sync:enrichment -->. El detector v1 sigue corriendo
 * antes y crea la entrada base; v2 sólo agrega contexto.
 *
 * NO modifica archivos del wiki. NO commitea. NO pregunta.
 * Costo: cero (sin LLM). Tiempo: <1s.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = (() => {
  try { return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim(); }
  catch { process.exit(0); }
})();

const PENDING_FILE = path.join(REPO_ROOT, 'docs/wiki/.pending-reviews.md');

function gitShow(args) {
  try { return execSync(`git ${args}`, { encoding: 'utf-8', cwd: REPO_ROOT }); }
  catch { return ''; }
}

const changedFiles = gitShow('show --stat --name-only --pretty=format: HEAD')
  .split('\n').map((s) => s.trim()).filter(Boolean);

const MODULE_RE = /^food-inventory-saas\/src\/modules\/([^/]+)\/.+\.(controller|service|schema|dto)\.ts$/;
// DTOs/schemas globales (carpetas src/dto y src/schemas). El módulo se infiere por nombre de archivo.
const GLOBAL_RE = /^food-inventory-saas\/src\/(dto|schemas)\/([a-z][a-zA-Z0-9-]*)\.(dto|schema|entity)\.ts$/;
// Heurística mínima: singular → módulo wiki. Si falta una entrada, el archivo se reporta como módulo `<basename>` (revisable a mano).
const SINGULAR_TO_MODULE = {
  product: 'products', order: 'orders', customer: 'customers-crm', purchase: 'purchases',
  supplier: 'purchases', invoice: 'billing', payment: 'payments', tenant: 'auth-users-roles',
  user: 'auth-users-roles', role: 'auth-users-roles', warehouse: 'transfers',
  inventory: 'inventory', 'inventory-movement': 'inventory',
};

const moduleFiles = changedFiles.filter((f) => MODULE_RE.test(f) || GLOBAL_RE.test(f));

if (moduleFiles.length === 0) process.exit(0);

const commitHash = gitShow('rev-parse --short HEAD').trim();
const commitMsg = gitShow('log -1 --pretty=format:%s').trim();

function moduleOf(file) {
  const m1 = file.match(MODULE_RE);
  if (m1) return m1[1];
  const m2 = file.match(GLOBAL_RE);
  if (m2) return SINGULAR_TO_MODULE[m2[2]] || m2[2];
  return null;
}

const byModule = new Map();
for (const f of moduleFiles) {
  const mod = moduleOf(f);
  if (!mod) continue;
  if (!byModule.has(mod)) byModule.set(mod, []);
  byModule.get(mod).push(f);
}

// Parsing helpers — heurísticos, no AST. Suficiente para 90% de los casos.
const HTTP_DECORATORS = /@(Get|Post|Put|Patch|Delete)\((['"`])([^'"`]*)\2/g;
const PUBLIC_METHOD = /^\+\s{2}(?:async\s+)?([a-zA-Z][a-zA-Z0-9]*)\s*\(/;
const PRIVATE_METHOD = /^\+\s{2}private\s+/;
const API_PROPERTY = /@(ApiProperty|ApiPropertyOptional)\s*\(/;
const SCHEMA_PROP = /@Prop\s*\(/;

function diffFor(file) {
  return gitShow(`show HEAD -- "${file}"`);
}

function extractEndpoints(diff) {
  const added = new Set();
  const removed = new Set();
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      let m;
      const re = new RegExp(HTTP_DECORATORS.source, 'g');
      while ((m = re.exec(line)) !== null) added.add(`${m[1].toUpperCase()} ${m[3] || '/'}`);
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      let m;
      const re = new RegExp(HTTP_DECORATORS.source, 'g');
      while ((m = re.exec(line)) !== null) removed.add(`${m[1].toUpperCase()} ${m[3] || '/'}`);
    }
  }
  // Sólo reportar diferencias netas
  const net = (set, other) => [...set].filter((x) => !other.has(x));
  return { added: net(added, removed), removed: net(removed, added) };
}

function extractServiceMethods(diff) {
  const added = [];
  for (const line of diff.split('\n')) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (PRIVATE_METHOD.test(line)) continue;
    const m = line.match(PUBLIC_METHOD);
    if (m && !['if', 'for', 'while', 'switch', 'catch', 'return'].includes(m[1])) {
      added.push(m[1]);
    }
  }
  return [...new Set(added)];
}

function countDecorators(diff, regex) {
  let added = 0, removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++') && regex.test(line)) added++;
    else if (line.startsWith('-') && !line.startsWith('---') && regex.test(line)) removed++;
  }
  return { added, removed };
}

const findings = [];
for (const [mod, files] of byModule.entries()) {
  const modFinding = { module: mod, controllers: [], services: [], dtos: [], schemas: [] };
  for (const f of files) {
    const diff = diffFor(f);
    if (!diff) continue;

    if (f.endsWith('.controller.ts')) {
      const eps = extractEndpoints(diff);
      if (eps.added.length || eps.removed.length) {
        modFinding.controllers.push({ file: f, ...eps });
      }
    } else if (f.endsWith('.service.ts')) {
      const methods = extractServiceMethods(diff);
      if (methods.length) modFinding.services.push({ file: f, methods });
    } else if (f.endsWith('.dto.ts')) {
      const props = countDecorators(diff, API_PROPERTY);
      if (props.added || props.removed) modFinding.dtos.push({ file: f, ...props });
    } else if (f.endsWith('.schema.ts')) {
      const props = countDecorators(diff, SCHEMA_PROP);
      if (props.added || props.removed) modFinding.schemas.push({ file: f, ...props });
    }
  }
  if (modFinding.controllers.length || modFinding.services.length ||
      modFinding.dtos.length || modFinding.schemas.length) {
    findings.push(modFinding);
  }
}

if (findings.length === 0) process.exit(0);

// Construir bloque enriquecido en formato markdown
const lines = [];
lines.push('');
lines.push(`<!-- wiki-sync:enrichment commit=${commitHash} -->`);
lines.push(`### 🤖 wiki-sync v2 — análisis de \`${commitHash}\``);
lines.push('');
lines.push(`> ${commitMsg}`);
lines.push('');

for (const f of findings) {
  lines.push(`**Módulo \`${f.module}\`**`);
  lines.push('');

  if (f.controllers.length) {
    for (const c of f.controllers) {
      if (c.added.length) lines.push(`- 🆕 Endpoints: ${c.added.map((e) => `\`${e}\``).join(', ')}`);
      if (c.removed.length) lines.push(`- 🗑️ Endpoints removidos: ${c.removed.map((e) => `\`${e}\``).join(', ')}`);
    }
  }
  if (f.services.length) {
    const allMethods = f.services.flatMap((s) => s.methods);
    if (allMethods.length) {
      lines.push(`- 🆕 Métodos service nuevos: ${allMethods.map((m) => `\`${m}()\``).join(', ')}`);
    }
  }
  if (f.dtos.length) {
    for (const d of f.dtos) {
      const dtoFile = path.basename(d.file);
      const parts = [];
      if (d.added) parts.push(`+${d.added}`);
      if (d.removed) parts.push(`-${d.removed}`);
      lines.push(`- 📝 DTO \`${dtoFile}\`: campos ${parts.join('/')} (revisar @ApiProperty)`);
    }
  }
  if (f.schemas.length) {
    for (const s of f.schemas) {
      const schemaFile = path.basename(s.file);
      const parts = [];
      if (s.added) parts.push(`+${s.added}`);
      if (s.removed) parts.push(`-${s.removed}`);
      lines.push(`- 🗂️ Schema \`${schemaFile}\`: props ${parts.join('/')} (revisar @Prop)`);
    }
  }

  lines.push('');
  lines.push('  **Docs sugeridos a actualizar**:');
  const docsBase = `docs/wiki/modules/${f.module}`;
  if (f.controllers.length) lines.push(`  - [ ] \`${docsBase}/api-reference.md\``);
  if (f.services.length) lines.push(`  - [ ] \`${docsBase}/functions.md\``);
  if (f.dtos.length) {
    lines.push(`  - [ ] \`${docsBase}/api-reference.md\` (request body)`);
    lines.push(`  - [ ] \`docs/wiki/system-map.md\` §1.x (contrato del módulo)`);
  }
  if (f.schemas.length) lines.push(`  - [ ] \`${docsBase}/data-model.md\``);
  lines.push('');
}

lines.push('<!-- /wiki-sync:enrichment -->');
lines.push('');

const enrichment = lines.join('\n');

// Append al pending file (asume que el detector ya lo creó/actualizó)
if (fs.existsSync(PENDING_FILE)) {
  fs.appendFileSync(PENDING_FILE, enrichment);
} else {
  // Sin entrada base del detector — crear archivo mínimo
  const header = '# Wiki — Cambios Pendientes de Revision\n\n## 🔍 Pendientes\n';
  fs.writeFileSync(PENDING_FILE, header + enrichment);
}

console.error(`📚 wiki-sync v2: ${findings.length} módulo(s) enriquecido(s) en .pending-reviews.md`);
process.exit(0);
