/**
 * Demo manual de la aplicación AURA con guardrails (sin Promptfoo).
 *
 * Uso:
 *   @{prompt = (Get-Content prompts\hardened_fs.txt -Raw).Replace('{{input}}', 'mi consulta')} |
 *     ConvertTo-Json -Compress | node guardrails/aura_app.mjs
 */

import { procesar } from './nucleo.mjs';

function leerStdin() {
  return new Promise((resolve, reject) => {
    let datos = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (trozo) => { datos += trozo; });
    process.stdin.on('end', () => resolve(datos));
    process.stdin.on('error', reject);
  });
}

const crudo = await leerStdin();
let promptRenderizado = crudo;
try {
  const entrada = JSON.parse(crudo);
  if (typeof entrada.prompt === 'string') promptRenderizado = entrada.prompt;
} catch {
  // entrada en texto plano: se usa tal cual
}

const { output, metadata } = await procesar(promptRenderizado);
process.stdout.write(JSON.stringify({ output, metadata }, null, 2) + '\n');
