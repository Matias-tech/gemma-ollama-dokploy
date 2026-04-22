/**
 * Ejemplo de consumo de la API de Ollama con Gemma 4 E2B
 * Endpoint: https://gemma.hostred.cl/api/chat
 */

const API_URL = 'https://gemma.hostred.cl/api/chat';
const MODEL = 'gemma4:e2b';

async function chatWithGemma(prompt) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Error al consultar Gemma:', error);
    throw error;
  }
}

// Uso
chatWithGemma('¿Qué es DevOps? Responde en español.')
  .then(answer => console.log('Respuesta:', answer))
  .catch(err => console.error('Fallo:', err));

module.exports = { chatWithGemma };
