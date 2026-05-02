#!/usr/bin/env node
/**
 * wiki-sync
 *
 * Hook PostToolUse Bash (matcher git commit) que tras un commit identifica
 * archivos modificados en food-inventory-saas/src/modules/** y avisa al
 * usuario si hay endpoints/DTOs/schemas nuevos no documentados en el wiki.
 *
 * v1: detecta y reporta. NO modifica el wiki automáticamente.
 * v2 (futuro): genera diff propuesto para system-map.md y modules/<X>.md.
 *
 * Documentación: ./SKILL.md
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let changedFiles = [];
try {
  const out = execSync('git show --stat --name-only --pretty=format: HEAD', {
    encoding: 'utf-8',
  });
  changedFiles = out.split('\n').map((s) => s.trim()).filter(Boolean);
} catch {
  process.exit(0); // sin git, no hace nada
}

const moduleFiles = changedFiles.filter((f) =>
  f.match(/^food-inventory-saas\/src\/modules\/([^/]+)\/.+\.(controller|service|schema|dto)\.ts$/),
);

if (moduleFiles.length === 0) process.exit(0);

const modulesAffected = [...new Set(
  moduleFiles.map((f) => f.match(/modules\/([^/]+)\//)[1]),
)];

console.error('');
console.error(`📚 wiki-sync — commit toca ${modulesAffected.length} módulo(s):`);
console.error('');

for (const mod of modulesAffected) {
  const wikiPath = `docs/wiki/modules/${mod}.md`;
  const exists = fs.existsSync(wikiPath);
  const filesInMod = moduleFiles.filter((f) => f.includes(`/modules/${mod}/`));

  console.error(`  • ${mod}`);
  for (const f of filesInMod) {
    console.error(`      ${f.replace(`food-inventory-saas/src/modules/${mod}/`, '')}`);
  }

  if (!exists) {
    console.error(`    ⚠ NO existe ${wikiPath} — considera crear documentación del módulo.`);
  } else {
    console.error(`    → revisa: ${wikiPath} y docs/wiki/system-map.md`);
  }
  console.error('');
}

console.error('Recuerda: cambios en módulos exigen actualizar el wiki en el mismo PR.');
console.error('Ver política en CLAUDE.md → "Antes de tocar código".');
console.error('');

process.exit(0);
