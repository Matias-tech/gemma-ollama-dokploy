# Despliegue Ollama + Gemma 4 E2B (Q4_0) en Dokploy

> Guía técnica para desplegar el modelo `gemma4:e2b-q4_0-q4_0` vía Ollama en un VPS con **8 GB de RAM**.

## Requisitos de Infraestructura

- **RAM:** 8 GB (mínimo recomendado).
- **CPU:** 4 vCores (se asignan 3.5 al contenedor).
- **Disco:** 10 GB libres (el modelo Q4_0 ocupa ~3.2 GB en RAM / ~4 GB en disco).

> **Nota sobre el modelo:** Se usa la versión cuantizada `gemma4:e2b-q4_0-q4_0` en lugar de `gemma4:e2b-q4_0` (full quality). La versión Q4_0 reduce el consumo de RAM de **~7.1 GB a ~3.2 GB**, haciendo viable el despliegue en un VPS de 8 GB sin GPU.

## 1. Docker Compose

Pega el contenido de `docker-compose.yml` en la interfaz de Dokploy (sección **Docker Compose** del servicio).

**Configuración aplicada:**
- Límite de CPU: **3.5 vCores** (`cpus: '3.50'`), dejando margen para el SO.
- `OLLAMA_FLASH_ATTENTION=true`: Reduce el consumo de memoria durante la inferencia.
- `OLLAMA_KEEP_ALIVE=5m`: Mantiene el modelo cargado 5 minutos tras el último uso.
- `OLLAMA_CONTEXT_LENGTH=512`: Limita el contexto por defecto a 512 tokens para inferencias rápidas.

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
| `OLLAMA_CONTEXT_LENGTH` | `512` |

### Enrutamiento de Dominio
1. En Dokploy, dentro del servicio Ollama, ve a **Domains**.
2. Agrega: `gemma.hostred.cl`.
3. Puerto: `11434`.
4. Activa **HTTPS**.

## 3. Post-Despliegue: Descargar el Modelo

El contenedor intenta descargar `gemma4:e2b-q4_0` automáticamente al iniciar. Si prefieres hacerlo manualmente por SSH:

```bash
docker exec -it ollama-gemma ollama pull gemma4:e2b-q4_0
```

Verifica la instalación:

```bash
docker exec -it ollama-gemma ollama list
```

> ⚠️ **Advertencia:** La descarga es de ~7.2 GB. El primer arranque puede tardar varios minutos dependiendo de tu ancho de banda.

## 4. Snippets de Integración

### cURL

```bash
curl -X POST https://gemma.hostred.cl/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma4:e2b-q4_0",
    "prompt": "¿Qué es DevOps? Responde en español.",
    "stream": false,
    "options": { "num_ctx": 512 }
  }'
```

### JavaScript (Fetch API)

```javascript
fetch('https://gemma.hostred.cl/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemma4:e2b-q4_0',
    messages: [
      { role: 'user', content: '¿Qué es DevOps? Responde en español.' }
    ],
    stream: false,
    options: { num_ctx: 512 }
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
    "model": "gemma4:e2b-q4_0",
    "prompt": "Clasifica el siguiente correo como IMPORTANTE o NO_IMPORTANTE.\n\nReglas:\n- Es de un cliente o jefe → IMPORTANTE\n- Newsletter o promoción → NO_IMPORTANTE\n\nResponde ÚNICAMENTE con: IMPORTANTE o NO_IMPORTANTE.\n\nAsunto: Factura vencida #1234\nContenido: Estimado cliente, su factura venció ayer.\n\nClasificación:",
    "stream": false,
    "options": { "temperature": 0.1, "num_predict": 10, "num_ctx": 512 }
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
      model: 'gemma4:e2b-q4_0',
      prompt,
      stream: false,
      options: { temperature: 0.1, num_predict: 10, num_ctx: 512 }
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

## Optimización para 8 GB de RAM

Si experimentas lentitud o OOM:

1. **Reduce el contexto:** Usa `"num_ctx": 512` (o incluso `256`) en las peticiones para tareas simples como clasificación.
2. **Disminuye `OLLAMA_KEEP_ALIVE`:** Cambia a `1m` o `0` para liberar RAM inmediatamente tras cada inferencia.
3. **Monitorea el swap:** Asegúrate de que el VPS tenga swap configurado como colchón de emergencia.
