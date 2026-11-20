/**
 * Provider de Promptfoo para la aplicación AURA con guardrails.
 *
 * Se carga in-process (sin pipes ni consolas): evita los problemas de encoding
 * que aparecen al leer stdout de un proceso hijo en Windows.
 *
 * Uso en el YAML:
 *   providers:
 *     - id: file://guardrails/provider.mjs
 */

import { procesar } from './nucleo.mjs';

export default class AuraConGuardrails {
  id() {
    return 'aura-con-guardrails';
  }

  async callApi(prompt) {
    const { output, metadata } = await procesar(prompt);
    return { output, metadata: { guardrail: metadata } };
  }
}
