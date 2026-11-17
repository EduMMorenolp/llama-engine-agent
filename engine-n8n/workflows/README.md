# Flujos de n8n para el Asistente Personal Proactivo

Este directorio contiene los flujos exportados de n8n listos para importar.

## 📋 Flujos incluidos

1. **`01_saludo_matutino.json`**:
   - Dispara a las 08:00 AM todos los días.
   - Consulta la personalidad activa y las actividades ya cargadas en PostgreSQL.
   - Pide a Qwen 3.5 4B redactar el saludo del día y preguntar por nuevas actividades.
   - Envía el mensaje proactivo a Telegram.

2. **`02_cerebro_conversacional.json`**:
   - Escucha mensajes de Telegram (texto o audios de voz).
   - Si es audio, lo transcribe llamando a Faster-Whisper local (`http://whisper-server:8000/v1/audio/transcriptions`).
   - Pasa el mensaje al agente Qwen 3.5 4B con 5 herramientas definidas:
     - `agendar_actividad`
     - `consultar_agenda`
     - `crear_habito`
     - `registrar_habito`
     - `cambiar_personalidad`
   - Guarda/actualiza en PostgreSQL y responde por Telegram.

3. **`03_reloj_vigilante.json`**:
   - Se ejecuta cada 5 minutos.
   - **Rama Recordatorios**: detecta actividades de hoy que inicien en los próximos 15 minutos (`recordado = false`), envía alerta a Telegram y marca `recordado = true`.
   - **Rama Hábitos**: detecta si la hora actual coincide con algún hábito configurado (`habitos_config`) y dispara la pregunta correspondiente a Telegram.

4. **`04_api_webhook_web_ui.json`**:
   - Webhooks para la interfaz web (`engine-ui-agent`):
     - `POST /webhook/agent-chat`: recibe mensajes de texto/voz del frontend.
     - `GET /webhook/agent-agenda`: devuelve actividades del día y hábitos activos para visualización en el dashboard.

---

## ⚙️ Configuración previa en n8n

1. **Credenciales en n8n**:
   - **Postgres**: Host: `host.docker.internal` (o IP de Docker), Puerto: `5434`, DB: `agent_db`, Usuario: `agent_user`, Password: `agent_secret_password`.
   - **Telegram**: Token de tu bot creado en `@BotFather`.
   - **OpenAI Compatible (llama.cpp)**: Base URL: `http://host.docker.internal:3050/v1` (o `8080/v1`), API Key: `llama-engine-dev` (o `none`), Modelo: `qwen3.5-4b`.
2. **Importación**:
   - En n8n, ir a **Workflows** $\rightarrow$ **Add workflow** $\rightarrow$ Menú `...` $\rightarrow$ **Import from File**.

