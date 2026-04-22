# Despliegue Ollama + Gemma 2 2B en Dokploy

> Guía técnica para desplegar el modelo `gemma2:2b` vía Ollama en un VPS con restricción estricta de 3 GB de RAM.

## 1. Docker Compose

Pega el contenido de `docker-compose.yml` en la interfaz de Dokploy (sección **Docker Compose** del servicio).

**Restricciones aplicadas:**
- Límite de memoria: **3 GB** (`memory: 3G`).
- Límite de CPU: **4 vCores** (`cpus: '4.00'`), reservando 2 vCores para el sistema.
- Solo 1 modelo cargado y 1 inferencia concurrente para minimizar consumo RAM.

## 2. Variables de Entorno y Red

Verifica estas variables en la pestaña **Environment** de Dokploy:

| Variable | Valor |
|----------|-------|
| `OLLAMA_HOST` | `0.0.0.0` |
| `OLLAMA_ORIGINS` | `https://gemma.hostred.cl,http://localhost,https://localhost` |
| `OLLAMA_NUM_PARALLEL` | `1` |
| `OLLAMA_MAX_LOADED_MODELS` | `1` |

### Enrutamiento de Dominio
1. En Dokploy, dentro del servicio Ollama, ve a **Domains**.
2. Agrega: `gemma.hostred.cl`.
3. Puerto: `11434`.
4. Activa **HTTPS**.

## 3. Post-Despliegue: Descargar el Modelo

Ejecuta en la terminal del VPS una vez que el contenedor esté arriba:

```bash
docker exec -it ollama-gemma ollama pull gemma2:2b
```

Verifica la instalación:

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

## 5. Clasificación de Correos (Parámetros Variables)

Usa el mismo endpoint (`/api/generate`) pasando parámetros de comportamiento. Revisa `classify.js` para ejemplos listos para usar.

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
