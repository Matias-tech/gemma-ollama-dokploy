/**
 * Cliente de Clasificación de Correos usando Ollama + Gemma 4 E2B
 * Endpoint: https://gemma.hostred.cl/api/generate
 *
 * Parámetros de comportamiento:
 * - rules: Array de reglas personalizadas para clasificar
 * - temperature: 0.0 - 1.0 (recomendado 0.1 para consistencia)
 * - maxTokens: Límite de tokens de respuesta
 * - numCtx: Tamaño del contexto (recomendado 512 para ahorrar RAM)
 * - labels: Etiquetas de salida personalizadas (default: IMPORTANTE / NO_IMPORTANTE)
 */

const API_URL = 'https://gemma.hostred.cl/api/generate';
const MODEL = 'gemma4:e2b-q4_0';

async function classifyEmail({
  subject,
  content,
  rules = [],
  temperature = 0.1,
  maxTokens = 10,
  numCtx = 512,
  labels = { positive: 'IMPORTANTE', negative: 'NO_IMPORTANTE' }
}) {
  if (!subject || !content) {
    throw new Error('Se requieren "subject" y "content"');
  }

  const defaultRules = [
    `Es de un cliente, jefe o proveedor crítico → ${labels.positive}`,
    `Contiene facturas, pagos, recordatorios urgentes o requiere acción inmediata → ${labels.positive}`,
    `Es una oportunidad de negocio o reclamo → ${labels.positive}`,
    `Newsletter, promociones, notificaciones automáticas → ${labels.negative}`,
    `No requiere respuesta o acción → ${labels.negative}`
  ];

  const allRules = rules.length > 0 ? rules : defaultRules;

  const prompt = `Clasifica el siguiente correo electrónico como ${labels.positive} o ${labels.negative}.

Reglas:
${allRules.map(r => `- ${r}`).join('\n')}

Responde ÚNICAMENTE con una de estas dos palabras: ${labels.positive} o ${labels.negative}.

Asunto: ${subject}
Contenido: ${content.substring(0, 1000)}

Clasificación:`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
        num_ctx: numCtx
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama HTTP error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.response.trim();
  const isImportant = raw === labels.positive;

  return {
    important: isImportant,
    classification: raw,
    model: MODEL,
    duration_ms: data.total_duration ? Math.round(data.total_duration / 1e6) : null
  };
}

// ─── EJEMPLOS DE USO ───────────────────────────────────────────────

// 1. Clasificación básica
classifyEmail({
  subject: 'Propuesta de colaboración',
  content: 'Hola, me interesa contratar sus servicios para un proyecto urgente.'
})
  .then(r => console.log('Ejemplo 1:', r))
  .catch(console.error);

// 2. Reglas personalizadas
classifyEmail({
  subject: 'Newsletter de tecnología',
  content: 'Las últimas novedades en inteligencia artificial este mes.',
  rules: [
    'Contiene la palabra "urgente" o "factura" → IMPORTANTE',
    'Es un newsletter genérico → BASURA'
  ],
  labels: { positive: 'IMPORTANTE', negative: 'BASURA' }
})
  .then(r => console.log('Ejemplo 2:', r))
  .catch(console.error);

// 3. Mayor creatividad (menos recomendado para clasificación)
classifyEmail({
  subject: 'Reunión de seguimiento',
  content: 'Quedamos en reunirnos mañana para revisar avances.',
  temperature: 0.5
})
  .then(r => console.log('Ejemplo 3:', r))
  .catch(console.error);

module.exports = { classifyEmail };
