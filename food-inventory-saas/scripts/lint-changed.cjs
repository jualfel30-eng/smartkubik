#!/usr/bin/env node
/**
 * Lint del gate del DoD: corre eslint (SIN --fix) solo sobre los archivos que
 * cambiaste, no sobre el repo entero.
 *
 * Por qué: el repo arrastra deuda masiva de formato/lint legacy (miles de
 * errores prettier/prettier que se resuelven con `lint --fix`). Lintear todo
 * como gate es inservible. El estándar realista es "el archivo que tocaste
 * queda limpio". Esto lintea exactamente eso: cambios vs HEAD + staged + nuevos.
 *
 * No muta (sin --fix). Para auto-formatear usa `npm run lint`.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const EXT = /\.ts$/;

function git(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).split('\n');
  } catch {
    return [];
  }
}

// Paths relativos al cwd del proyecto (--relative). Untracked vía ls-files.
const candidates = [
  ...git('git diff --name-only --relative --diff-filter=ACMR HEAD'),
  ...git('git diff --name-only --relative --diff-filter=ACMR --cached'),
  ...git('git ls-files --others --exclude-standard --full-name'),
]
  .map((s) => s.trim())
  .filter(Boolean);

// ls-files --full-name da paths desde la raíz del repo; quédate solo con los de
// este proyecto y normalízalos a relativos del cwd, luego confirma que existen.
const projectDir = process.cwd().split('/').pop();
const files = [...new Set(candidates)]
  .map((f) => (f.startsWith(`${projectDir}/`) ? f.slice(projectDir.length + 1) : f))
  .filter((f) => EXT.test(f) && fs.existsSync(f));

if (files.length === 0) {
  console.log('✅ lint:changed — sin archivos .ts cambiados para lintear.');
  process.exit(0);
}

console.log(`Linteando ${files.length} archivo(s) cambiado(s)...`);
try {
  execSync(`npx eslint ${files.map((f) => JSON.stringify(f)).join(' ')}`, {
    stdio: 'inherit',
  });
  console.log('✅ lint:changed — limpio.');
} catch {
  console.error('\n❌ lint:changed — hay errores en archivos que tocaste. Corrige antes de dar por terminado.');
  process.exit(1);
}
