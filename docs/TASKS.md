# Tareas del Proyecto — llama-engine-agent

## Estado: Fase 1 (Infraestructura y Flujos Base Completados)

### ✅ Tareas Completadas

- [x] **Infraestructura Docker**: `docker/docker-compose.yml` con PostgreSQL 16 y Faster-Whisper (CUDA).
- [x] **Esquema de Base de Datos**: `sql/01_schema.sql` y `sql/02_seed.sql` con personalidades, agenda diaria, configuración de hábitos, registro y memorias según `supabase-postgres-best-practices`.
- [x] **Flujos de n8n**:
  - `01_saludo_matutino.json`: Disparador 08:00 AM con Qwen 3.5 4B y Telegram.
  - `02_cerebro_conversacional.json`: Telegram (audio/texto) + Faster-Whisper + Tool Calling en Postgres.
  - `03_reloj_vigilante.json`: Cron cada 5 minutos para alertas preventivas y preguntas de hábitos.
  - `04_api_webhook_web_ui.json`: Webhooks para chat y consulta de dashboard web.
- [x] **Frontend Web**: Adaptación de `engine-ui-agent/src/api.ts` para interactuar con los Webhooks de n8n y soporte para Web Speech API.
- [x] **Tareas de VS Code**: `.vscode/tasks.json` con tareas para levantar Docker y la UI web.
- [x] **Documentación**: Actualización de `PRD.md`, `ARCHITECTURE.md`, `AGENTS.md` y `CHANGELOG.md`.

### 🔄 Próximos Pasos (Validación y Puesta en Marcha)

1. **Levantar el contenedor de Docker**:
   - Ejecutar `docker compose -f docker/docker-compose.yml up -d` para inicializar PostgreSQL y Faster-Whisper.
2. **Importar y Conectar en n8n**:
   - Conectar credenciales de PostgreSQL (`localhost:5434`, DB `agent_db`).
   - Conectar credencial de Telegram Bot (Token de `@BotFather`).
   - Importar los 4 flujos de `n8n-workflows/`.
3. **Prueba End-to-End**:
   - Enviar un mensaje de voz o texto por Telegram ("Hoy a las 17:00 tengo dentista").
   - Comprobar que Qwen ejecuta el Tool Calling y se guarda en `agenda_diaria`.
   - Verificar la alerta 15 minutos antes.
