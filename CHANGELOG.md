# Changelog

## [Unreleased]

- **Fixed**: **Copia y ejecución de migraciones SQLite en engine-agent-api**. Empaquetado explícito de archivos `.sql` en el proceso de build y Dockerfile hacia `dist/db/migrations` y `migrations`, incorporando resolución multi-ruta en `src/db/index.ts` y persistencia forzada con `saveDb()` para erradicar el error `no such table: sessions` y sembrar agentes y habilidades por defecto. [2026-11-18]
  * **Files (Archivos)**: engine-agent/engine-agent-api/src/db/index.ts, engine-agent/engine-agent-api/Dockerfile, engine-agent/engine-agent-api/package.json. [2026-11-18]

- **Fixed**: **Autenticación x-api-key y configuración en engine-agent-ui**. Inyección de `VITE_AGENT_KEY` en `docker-compose.yml` y Dockerfile con fallback predeterminado a `"llama-engine-dev"` en `api-client.ts`, incorporando campo editable de API Key en `SettingsModal` y `AppSettings` para resolver los errores HTTP 401 (Unauthorized) al consultar sesiones, agentes y skills. [2026-11-18]
  * **Files (Archivos)**: docker-compose.yml, engine-agent/engine-agent-ui/Dockerfile, engine-agent/engine-agent-ui/src/lib/api-client.ts, engine-agent/engine-agent-ui/src/lib/settings.ts, engine-agent/engine-agent-ui/src/features/chat/components/SettingsModal.tsx, engine-agent/engine-agent-api/src/middleware/auth.ts. [2026-11-18]

- **Fixed**: **Variables de entorno y enlace de red en engine-agent-api**. Inyección de `ENGINE_API_KEY`, `ENGINE_API_URL` y `HOST=0.0.0.0` en docker-compose.yml y .env para resolver el fallo de validación Zod (`ENGINE_API_KEY es requerida`) y permitir la conexión WebSocket y HTTP desde engine-agent-ui. [2026-11-18]
  * **Files (Archivos)**: docker-compose.yml, .env, .env.example. [2026-11-18]

- **Added**: **Guía completa de integración y conexión de n8n**. Documentación detallada en engine-n8n/README.md con los endpoints de host.docker.internal para conectar OpenAI-compatible (llama-engine), PostgreSQL persistente (engine-postgres en 5434), Faster-Whisper (puerto 8000), Code Sandbox y manual de importación de workflows. [2026-11-17]
  * **Files (Archivos)**: engine-n8n/README.md. [2026-11-17]

- **Changed**: **Desacoplamiento de n8n y contenedor engine-postgres**. Extracción de n8n y su sandbox hacia stack externo dedicado, renombrando el contenedor de base de datos a engine-postgres en docker-compose.yml con puertos aislados para evitar colisiones con n8n-postgres (5433). [2026-11-17]
  * **Files (Archivos)**: docker-compose.yml, .env, .env.example. [2026-11-17]

- **Changed**: **Guía estandarizada para agentes y flujo Docker**. Actualización integral de AGENTS.md con estructura estandarizada de alcance, arquitectura de 5 servicios modulares, flujo obligatorio de ramas y verificación en Docker con `--no-deps`, convenciones Biome y comandos de validación. [2026-11-17]
  * **Files (Archivos)**: AGENTS.md. [2026-11-17]

- **Fixed**: **Compatibilidad Node 20 en glob_search y upstream nginx**. Reemplazo de import glob inexistente en node:fs/promises por fs.promises.readdir recursivo en tools/index.ts, y corrección del upstream a engine-agent-api con alias de red en docker-compose.yml y nginx.conf. [2026-11-17]
  * **Files (Archivos)**: engine-agent/engine-agent-api/src/tools/index.ts, engine-agent/engine-agent-ui/nginx.conf, docker-compose.yml. [2026-11-17]
- **Fixed**: **Tipado de componentes en engine-agent-ui y optimización de build**. Corrección de tipos en ToastProvider, useAppSettings, ChatView y Composer, y ajuste del script build a vite build para empaquetado ágil en Docker. [2026-11-17]
  * **Files (Archivos)**: engine-agent/engine-agent-ui/src/lib/useAppSettings.ts, engine-agent/engine-agent-ui/src/providers/ToastProvider.tsx, engine-agent/engine-agent-ui/src/features/chat/components/ChatView.tsx, engine-agent/engine-agent-ui/src/features/chat/components/Composer.tsx, engine-agent/engine-agent-ui/package.json. [2026-11-17]
- **Fixed**: **Registry Docker de n8n y script build de api**. Sustitución del registry con rate limit docker.n8n.io por la imagen oficial de Docker Hub n8nio/n8n:latest en engine-n8n/Dockerfile, y adición del script build en engine-agent/engine-agent-api/package.json. [2026-11-17]
  * **Files (Archivos)**: engine-n8n/Dockerfile, engine-agent/engine-agent-api/package.json, engine-agent/engine-agent-ui/package.json. [2026-11-17]
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

