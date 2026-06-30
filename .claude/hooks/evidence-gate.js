#!/usr/bin/env node
/**
 * evidence-gate — PreToolUse hook (Edit/Write)
 *
 * Bloquea editar/crear código FUENTE si en el turno actual NO hubo ninguna
 * investigación previa (Read/Grep/Glob/Bash/Task). Es el backstop crudo del
 * protocolo "investiga antes de tocar": no puede juzgar si investigaste lo
 * SUFICIENTE, solo que miraste ALGO antes de escribir.
 *
 * Decisión:
 *   exit 0 → permite (hubo investigación en el turno, o no aplica)
 *   exit 2 → bloquea (stderr explica cómo desbloquear: leer/grepear primero)
 *
 * Fail-OPEN: ante cualquier error de parseo/lectura → exit 0 (nunca rompe el
 * flujo por un bug del propio hook).
 */
const fs = require('fs');

function allow() { process.exit(0); }

let input;
try {
  input = JSON.parse(fs.readFileSync(0, 'utf-8'));
} catch {
  allow();
}

const filePath = input?.tool_input?.file_path || '';
const transcriptPath = input?.transcript_path || '';

// Solo aplica a código fuente de los proyectos principales.
const isSourceCode =
  /(food-inventory-saas|food-inventory-admin|food-inventory-storefront|restaurant-storefront)\/src\/.*\.(ts|tsx|js|jsx|cjs|mjs)$/.test(
    filePath,
  );
if (!isSourceCode) allow();
if (!transcriptPath || !fs.existsSync(transcriptPath)) allow();

// Tools que cuentan como "haber mirado" antes de tocar.
const INVESTIGATION = new Set([
  'Read', 'Grep', 'Glob', 'Bash', 'Task', 'Agent', 'ToolSearch', 'WebFetch',
]);

let lines;
try {
  lines = fs.readFileSync(transcriptPath, 'utf-8').trim().split('\n');
} catch {
  allow();
}

// Recorremos de atrás hacia adelante hasta el último prompt REAL del usuario
// (type=user con texto y SIN tool_result). Todo lo posterior es el turno actual.
let investigatedThisTurn = false;
for (let i = lines.length - 1; i >= 0; i--) {
  let o;
  try { o = JSON.parse(lines[i]); } catch { continue; }
  const content = o?.message?.content;

  if (o?.type === 'assistant' && Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'tool_use' && INVESTIGATION.has(block.name)) {
        investigatedThisTurn = true;
      }
    }
  }

  if (o?.type === 'user') {
    const isToolResult = Array.isArray(content)
      ? content.some((c) => c?.type === 'tool_result')
      : false;
    const hasText = Array.isArray(content)
      ? content.some((c) => c?.type === 'text')
      : typeof content === 'string' && content.trim().length > 0;
    // Prompt real del usuario → frontera del turno; paramos.
    if (hasText && !isToolResult) break;
  }
}

if (investigatedThisTurn) allow();

console.error('');
console.error('⛔ evidence-gate: vas a tocar código sin haber investigado en este turno.');
console.error(`   Archivo: ${filePath}`);
console.error('');
console.error('   Regla del repo: investiga ANTES de tocar. Antes de editar/crear,');
console.error('   lee el archivo y su área (Read/Grep) y, si afirmas que algo "falta",');
console.error('   "ya existe" o "está roto", pega la evidencia (file:line / output).');
console.error('');
console.error('   Para continuar: haz primero un Read/Grep del área que vas a tocar');
console.error('   y vuelve a intentar el cambio.');
console.error('');
process.exit(2);
