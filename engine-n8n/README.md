# engine-n8n

Servicio orquestador del asistente personal proactivo (`llama-engine-agent`).

## Características
- **Puerto:** `5678`.
- **Workflows en `workflows/`:**
  - `01_saludo_matutino.json`: Disparador 08:00 AM para confeccionar agenda diaria con Telegram.
  - `02_cerebro_conversacional.json`: Recibe audio/texto, transcribe con `engine-whisper`, ejecuta Tool Calling con Qwen 3.5 4B y persiste en `engine-postgres`.
  - `03_reloj_vigilante.json`: Cron cada 5 minutos para alertas preventivas (15 min antes) y preguntas de hábitos por horario.
  - `04_api_webhook_web_ui.json`: Webhooks para la UI web.

