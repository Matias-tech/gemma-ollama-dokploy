# Despliegue Ollama + Gemma 2 2B en Dokploy

> Guía técnica para desplegar el modelo `gemma2:2b` vía Ollama en un VPS con **8 GB de RAM**.

## Por qué Gemma 2 2B

Este modelo fue elegido después de múltiples intentos con `gemma4:e2b` (que requiere ~7.1 GB de RAM y mata el proceso en VPS sin GPU) y su versión cuantizada inexistente (`gemma4:e2b-q4_0` no existe en Ollama).

`gemma2:2b` ofrece el mejor balance para VPS sin GPU:
- **~1.6 GB** en disco
- **~2.0 GB** en RAM durante inferencia
- Respuestas en **10-20 segundos** en CPU
- Deja margen para múltiples servicios en el mismo VPS

## Requisitos de Infraestructura

- **RAM:** 4 GB mínimo, 8 GB recomendado (para margen).
- **CPU:** 4 vCores (se asignan 3.5 al contenedor).
- **Disco:** 5 GB libres.

## 1. Docker Compose

Pega el contenido de `docker-compose.yml` en la interfaz de Dokploy (sección **Docker Compose** del servicio).

## 2. Variables de Entorno y Red

Verifica estas variables en la pestaña **Environment** de Dokploy:

| Variable | Valor |
|----------|-------|
| `OLLAMA_HOST` | `0.0.0.0` |
| `OLLAMA_ORIGINS` | `https://gemma.hostred.cl,http://localhost,https://localhost` |
| `OLLAMA_NUM_PARALLEL` | `1` |
| `OLLAMA_MAX_LOADED_MODELS` | `1` |
| `OLLAMA_FLASH_ATTENTION` | `true` |
| `OLLAMA_KEEP_ALIVE` | `5m` |

### Enrutamiento de Dominio
1. En Dokploy, dentro del servicio Ollama, ve a **Domains**.
2. Agrega: `gemma.hostred.cl`.
3. Puerto: `11434`.
4. Activa **HTTPS**.

## 3. Post-Despliegue

El contenedor descarga `gemma2:2b` automáticamente al iniciar. Verifica:

```bash
docker exec -it ollama-gemma ollama list
```

## 4. Snippets de Integración

### cURL

```bash
curl -X POST https://gemma.hostred.cl/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma2:2b",
    "prompt": "¿Qué es DevOps? Responde en español.",
    "stream": false
  }'
```

### JavaScript (Fetch API)

```javascript
fetch('https://gemma.hostred.cl/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemma2:2b',
    messages: [
      { role: 'user', content: '¿Qué es DevOps? Responde en español.' }
    ],
    stream: false
  })
})
.then(response => response.json())
.then(data => {
  console.log(data.message.content);
})
.catch(error => console.error('Error:', error));
```

> **Nota:** Para `/api/generate`, extrae `data.response`. Para `/api/chat`, extrae `data.message.content`.

## 5. Clasificación de Correos

Usa el mismo endpoint (`/api/generate`) pasando parámetros de comportamiento. Revisa `classify.js` para ejemplos listos.

### cURL — Clasificación básica

```bash
curl -X POST https://gemma.hostred.cl/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma2:2b",
    "prompt": "Clasifica el siguiente correo como IMPORTANTE o NO_IMPORTANTE.\n\nReglas:\n- Es de un cliente o jefe → IMPORTANTE\n- Newsletter o promoción → NO_IMPORTANTE\n\nResponde ÚNICAMENTE con: IMPORTANTE o NO_IMPORTANTE.\n\nAsunto: Factura vencida #1234\nContenido: Estimado cliente, su factura venció ayer.\n\nClasificación:",
    "stream": false,
    "options": { "temperature": 0.1, "num_predict": 10 }
  }'
```

### JavaScript — Parámetros variables

```javascript
const API_URL = 'https://gemma.hostred.cl/api/generate';

async function classifyEmail(subject, content, customRules = []) {
  const rules = customRules.length > 0 ? customRules : [
    'Es de un cliente, jefe o proveedor crítico → IMPORTANTE',
    'Contiene facturas, pagos o requiere acción inmediata → IMPORTANTE',
    'Newsletter, promociones, notificaciones automáticas → NO_IMPORTANTE'
  ];

  const prompt = `Clasifica el siguiente correo como IMPORTANTE o NO_IMPORTANTE.\n\nReglas:\n${rules.map(r => '- ' + r).join('\n')}\n\nResponde ÚNICAMENTE con: IMPORTANTE o NO_IMPORTANTE.\n\nAsunto: ${subject}\nContenido: ${content.substring(0, 800)}\n\nClasificación:`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemma2:2b',
      prompt,
      stream: false,
      options: { temperature: 0.1, num_predict: 10 }
    })
  });

  const data = await res.json();
  return {
    important: data.response.trim() === 'IMPORTANTE',
    raw: data.response.trim()
  };
}

classifyEmail('Propuesta de colaboración', 'Hola, quiero contratar sus servicios.')
  .then(console.log);
```

## Notas sobre Gemma 4

Si en el futuro deseas usar `gemma4:e2b`, necesitarás:
- **16 GB de RAM mínimo** (el modelo usa ~7.1 GB)
- **GPU NVIDIA** recomendada (RTX 3060 12GB o superior)
- O un VPS cloud con aceleración GPU (AWS g4dn, Google Cloud T4, etc.)

En Ollama no existe el tag `gemma4:e2b-q4_0`. La cuantización se maneja internamente por el cliente según tu hardware.
