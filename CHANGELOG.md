# Changelog

## [Unreleased]

- **Changed**: **Estructura modular por servicios con Dockerfile individual**. Reorganización del repositorio en carpetas modulares por servicio (engine-agent/ con api y ui, engine-postgres/, engine-whisper/, engine-n8n/) con Dockerfile propio y orquestación raíz en docker-compose.yml idéntico al patrón de llama-engine. [2026-11-17]
  * **Files (Archivos)**: docker-compose.yml, .env, .env.example, engine-agent/README.md, engine-postgres/Dockerfile, engine-postgres/README.md, engine-whisper/Dockerfile, engine-whisper/README.md, engine-n8n/Dockerfile, engine-n8n/README.md, .vscode/tasks.json, README.md, AGENTS.md. [2026-11-17]
- **Added**: **Documentación y vinculación con llama-engine**. Creación de README.md principal con arquitectura, guías de instalación, comandos de Docker y n8n, y especificación de la integración con el runtime de inferencia EduMMorenolp/llama-engine. [2026-11-17]
  * **Files (Archivos)**: README.md. [2026-11-17]
- **Added**: **Arquitectura Enfoque B con n8n y PostgreSQL**. Reestructuración del proyecto para operar como asistente proactivo local con n8n como orquestador, PostgreSQL 16 en contenedor dedicado, Faster-Whisper para transcripción de voz local y Web Speech API en navegador. [2026-11-17]
  * **Files (Archivos)**: docker/docker-compose.yml, docker/.env.example, sql/01_schema.sql, sql/02_seed.sql, n8n-workflows/01_saludo_matutino.json, n8n-workflows/02_cerebro_conversacional.json, n8n-workflows/03_reloj_vigilante.json, n8n-workflows/04_api_webhook_web_ui.json, n8n-workflows/README.md, .vscode/tasks.json. [2026-11-17]
- **Added**: **Esquema de Base de Datos y Seeds**. Definición de tablas en PostgreSQL (`personalidades`, `agenda_diaria`, `habitos_config`, `registro_habitos`, `memorias`) con índices parciales y constraints para optimizar los disparadores cron y registro de hábitos según las mejores prácticas de Supabase. [2026-11-17]
  * **Files (Archivos)**: sql/01_schema.sql, sql/02_seed.sql. [2026-11-17]
- **Added**: **Integración Webhook N8N en Frontend**. Métodos de consulta de dashboard y envío de mensajes hacia los webhooks de n8n con soporte de voz nativo en navegador. [2026-11-17]
  * **Files (Archivos)**: engine-ui-agent/src/api.ts, engine-ui-agent/.env.example. [2026-11-17]
- **Added**: **Automatización de servicios en VS Code**. Configuración de tareas en tasks.json para levantar PostgreSQL, Whisper y la UI web en paralelo. [2026-11-17]
  * **Files (Archivos)**: .vscode/tasks.json. [2026-11-17]

