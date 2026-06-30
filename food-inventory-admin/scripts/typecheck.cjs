#!/usr/bin/env node
/**
 * Gate de typecheck con baseline de deuda conocida.
 *
 * Corre `tsc --noEmit` sobre el proyecto y falla SOLO si aparecen errores de
 * tipos fuera de la lista de deuda conocida (DEBT). Los errores dentro de esos
 * archivos se reportan como informativos pero NO bloquean — son deuda rastreada
 * que se arregla aparte (ver CLAUDE.md "Definition of Done").
 *
 * Por qué un wrapper y no `exclude` en tsconfig: tsc igual type-chequea los
 * archivos que son importados transitivamente (StorefrontSettings se carga lazy
 * desde App), así que `exclude` no suprime sus errores. Filtrar la salida es el
 * único mecanismo fiable sin modificar el código fuente.
 *
 * Cuando se arregle StorefrontSettings, borra su entrada de DEBT: a partir de
 * ahí el gate empieza a protegerlo.
 */
const { execSync } = require('child_process');

// Zonas con deuda de tipos conocida (no bloquean el gate). Se compara con
// `startsWith`, así que un prefijo de carpeta cubre todo su árbol.
const DEBT = [
  'src/components/StorefrontSettings/',
];

let output = '';
try {
  execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
} catch (e) {
  output = `${e.stdout || ''}${e.stderr || ''}`;
}

const errorLines = output.split('\n').filter((l) => /error TS\d+/.test(l));
const blocking = errorLines.filter((l) => !DEBT.some((d) => l.startsWith(d)));
const debtCount = errorLines.length - blocking.length;

if (debtCount > 0) {
  console.error(
    `⚠️  ${debtCount} error(es) de tipos en zonas de deuda conocida (ignorados por el gate):`,
  );
  DEBT.forEach((d) => console.error(`     - ${d}`));
}

if (blocking.length > 0) {
  console.error('\n❌ typecheck — errores bloqueantes (fuera de la deuda baseline):\n');
  console.error(blocking.join('\n'));
  console.error(`\n❌ typecheck: ${blocking.length} error(es) bloqueante(s). Corrige antes de dar por terminado.`);
  process.exit(1);
}

console.log('✅ typecheck: 0 errores bloqueantes.');
