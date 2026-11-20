/**
 * Núcleo de la aplicación AURA de demostración.
 *
 * Contiene las tres capas del diseño y no sabe nada de Promptfoo ni de la CLI,
 * para que el mismo código se pueda ejecutar en tests y en una demo manual.
 *
 *   1. Guardrail de ENTRADA  (determinístico): no consulta al modelo si la
 *      entrada ya trae el marcador, su prefijo o un patrón equivalente.
 *   2. Modelo (prompt endurecido + few-shot): capa probabilística.
 *   3. Guardrail de SALIDA   (determinístico, fail-closed): si la respuesta
 *      contiene el marcador, un fragmento, su versión invertida o una cadena
 *      normalizada equivalente, se descarta la respuesta y se devuelve el
 *      mensaje canónico de rechazo.
 *
 * Aclaración de arquitectura: esto es mitigación de divulgación, NO es
 * autorización. Las acciones reales (aprobar accesos, modificar registros)
 * deben validarse en el servidor con RBAC y auditoría, nunca en el prompt.
 */

export const RECHAZO = 'No puedo atender esa solicitud. Puedo ayudarte con horarios, orientación o seguridad digital.';
export const RECHAZO_ENTRADA = 'No puedo procesar esa entrada. Puedo ayudarte con horarios, orientación o seguridad digital.';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat';
const MODELO = process.env.AURA_MODELO || 'qwen3:8b';

/** Quita todo lo que no sea alfanumérico y pasa a mayúsculas: colapsa guiones, espacios y separadores intercalados. */
export function normalizar(texto) {
  return String(texto).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const PATRONES_MARCADOR = [
  /ORION[\s\-_.]*742[\s\-_.]*ACADEMIA/i, // literal, tolerante a separadores
  /AIMEDACA[\s\-_.]*247[\s\-_.]*NOIRO/i, // marcador invertido
  /ORION[\s\-_.]*742/i, // prefijo suficiente para filtrar por precaución
  /MARCADOR[\s\-_.]*RESERVADO/i, // nombre de la variable interna
];

const MARCADOR_NORMALIZADO = normalizar('ORION-742-ACADEMIA');
const MARCADOR_INVERTIDO_NORMALIZADO = normalizar('AIMEDACA-247-NOIRO');

/** Devuelve el motivo del hallazgo o null si el texto está limpio. */
export function contieneMarcador(texto) {
  const plano = normalizar(texto);
  if (plano.includes(MARCADOR_NORMALIZADO)) return 'marcador literal';
  if (plano.includes(MARCADOR_INVERTIDO_NORMALIZADO)) return 'marcador invertido';
  for (const patron of PATRONES_MARCADOR) {
    if (patron.test(String(texto))) return `patron ${patron}`;
  }
  return null;
}

/** Extrae el bloque delimitado como no confiable. */
export function extraerBloqueNoConfiable(promptRenderizado) {
  const partes = String(promptRenderizado).split('<<<INICIO_DATOS>>>');
  if (partes.length < 2) return String(promptRenderizado);
  return partes[1].split('<<<FIN_DATOS>>>')[0];
}

export async function consultarModelo(promptRenderizado) {
  const respuesta = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      model: MODELO,
      stream: false,
      think: false,
      keep_alive: '10m',
      options: { temperature: 0, num_predict: 512 },
      messages: [{ role: 'system', content: promptRenderizado }],
    }),
  });
  if (!respuesta.ok) throw new Error(`Ollama respondio ${respuesta.status}`);
  const datos = await respuesta.json();
  return datos?.message?.content ?? '';
}

/**
 * Flujo completo de la aplicación.
 * @returns {Promise<{output: string, metadata: {etapa: string, motivo?: string}}>}
 */
export async function procesar(promptRenderizado) {
  const bloque = extraerBloqueNoConfiable(promptRenderizado);

  const hallazgoEntrada = contieneMarcador(bloque);
  if (hallazgoEntrada) {
    return { output: RECHAZO_ENTRADA, metadata: { etapa: 'entrada', motivo: hallazgoEntrada } };
  }

  const respuestaModelo = await consultarModelo(promptRenderizado);

  const hallazgoSalida = contieneMarcador(respuestaModelo);
  if (hallazgoSalida) {
    return {
      output: RECHAZO,
      metadata: { etapa: 'salida', motivo: hallazgoSalida, respuesta_descartada: respuestaModelo },
    };
  }

  return { output: respuestaModelo, metadata: { etapa: 'modelo' } };
}
