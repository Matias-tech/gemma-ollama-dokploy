# Despliegue Ollama + Gemma 4 E2B en Dokploy

> Guía técnica para desplegar el modelo `gemma4:e2b` vía Ollama en un VPS con **8 GB de RAM**.

## Requisitos de Infraestructura

- **RAM:** 8 GB (mínimo recomendado para `gemma4:e2b`).
- **CPU:** 6 vCores (se asignan 5 al contenedor, 1 para el sistema).
- **Disco:** 15 GB libres (el modelo ocupa ~7.2 GB).

## 1. Docker Compose

Pega el contenido de `docker-compose.yml` en la interfaz de Dokploy (sección **Docker Compose** del servicio).

**Configuración aplicada:**
- Límite de memoria: **7 GB** (`memory: 7G`), dejando 1 GB para el SO y Dokploy.
- Límite de CPU: **5 vCores** (`cpus: '5.00'`).
- `OLLAMA_FLASH_ATTENTION=true`: Reduce el consumo de memoria durante la inferencia.
- `OLLAMA_KEEP_ALIVE=5m`: Mantiene el modelo cargado 5 minutos tras el último uso (equilibrio entre latencia y RAM).

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

## 3. Post-Despliegue: Descargar el Modelo

El contenedor intenta descargar `gemma4:e2b` automáticamente al iniciar. Si prefieres hacerlo manualmente por SSH:

```bash
docker exec -it ollama-gemma ollama pull gemma4:e2b
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
    "model": "gemma4:e2b",
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
    model: 'gemma4:e2b',
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
    "model": "gemma4:e2b",
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
      model: 'gemma4:e2b',
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
