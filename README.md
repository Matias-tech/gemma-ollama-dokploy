# Despliegue Ollama + Gemma 4 E2B en Dokploy

> Guía técnica para desplegar el modelo `gemma4:e2b` vía Ollama en un VPS con restricción estricta de 3 GB de RAM.

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
docker exec -it ollama-gemma ollama pull gemma4:e2b
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
