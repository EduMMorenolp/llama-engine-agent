# Guía para agentes

## Alcance

Estas instrucciones aplican a todo el repositorio. Antes de cambiar comportamiento,
consultá [`README.md`](./README.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
[`docs/PRD.md`](./docs/PRD.md) y [`docs/RULES.md`](./docs/RULES.md).

## Arquitectura

- `engine-agent/engine-agent-api/`: API REST & WebSocket en Express/TypeScript (puerto 3060), router, gestión de tools y lógica del asistente.
- `engine-agent/engine-agent-ui/`: SPA React 19 / Vite (puerto 3061) con chat conversacional, reconocimiento de voz (Web Speech API) y configuración de MCP/modelos.
- `engine-postgres/`: PostgreSQL 16 persistente (puerto 5434 externo, 5432 interno) con esquemas de personalidades, agenda diaria, hábitos y memorias.
- `engine-whisper/`: Faster-Whisper local acelerado por CUDA (puerto 8000) para transcripción STT de audio de voz.
- `engine-n8n/`: Orquestador de flujos proactivos, cron jobs y bot de Telegram (puerto 5678).
- `docker-compose.yml`: Orquesta los servicios integrados del asistente personal.
- Vinculación con `llama-engine`: La inferencia LLM (Qwen 3.5 4B) la suministra el runtime externo `llama-engine` (`http://localhost:3050/v1` o `http://host.docker.internal:3050/v1`).

Conservá la separación estricta entre la UI web, la API del agente, el orquestador n8n y la base de datos. La API y n8n consumen el modelo mediante `LLAMA_API_URL` definida en `.env`; no hardcodees URLs ni credenciales en el código.

## Flujo de ramas y despliegue en Docker (Obligatorio)

- **Rama por feature desde `main`**: Siempre que se trabaje en una nueva feature o mejora, se debe crear y cambiar a una nueva rama partiendo desde `main` (por ejemplo, `git checkout main && git checkout -b feat/<nombre-descriptivo>`). Nunca desarrolles features directamente sobre `main`.
- **Deploy y verificación en Docker**: Todo cambio o nueva feature debe desplegarse en Docker y verificarse en ejecución (`docker compose ps`, healthchecks y pruebas contra los endpoints/UI activos) para comprobar que la feature funciona correctamente de punta a punta antes de dar por finalizada la tarea.
  - **Importante (`--no-deps`)**: Como `engine-agent-api` y `engine-agent-ui` interactúan con la red común, al reconstruir solo la API o la UI usá siempre **`docker compose up -d --build --no-deps engine-agent-api engine-agent-ui`** para no disparar por arrastre rebuilds pesados de CUDA en `engine-whisper` o reinicios innecesarios en `engine-n8n` y `engine-postgres`.

## Desarrollo y validación

Ejecutá los comandos desde la carpeta del paquete correspondiente:

### Backend (`engine-agent-api`)

```powershell
cd engine-agent/engine-agent-api
npm ci
npm run check
npm test
npm run build
```

### Frontend (`engine-agent-ui`)

```powershell
cd engine-agent/engine-agent-ui
npm ci
npm run check
npm run lint
npm test
npm run build
```

### Infraestructura Docker

Para validar la infraestructura completa:

```powershell
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

Si solo cambia el servicio de transcripción de voz, preferí `docker compose build engine-whisper`.
Los builds de CUDA requieren Docker con soporte NVIDIA (nvidia-container-toolkit) y pueden tardar varios minutos en la primera ejecución.

## Convenciones

- Usá TypeScript, React 19 y los patrones existentes antes de introducir nuevas abstracciones.
- Respetá Biome: tabs, comillas dobles, punto y coma y reglas de formateo existentes.
- Validá entradas en la API con esquemas Zod y mantené los errores tipados y explícitos (siguiendo `contrato-api-global`).
- Base de datos: Seguir `supabase-postgres-best-practices` (nombres en `snake_case`, tipos `timestamptz`/`date`/`time`, e índices explícitos en columnas de filtro cron y agenda).
- Agregá o actualizá pruebas unitarias y de integración (`vitest`) cuando cambie la lógica de la API o componentes de UI.
- Mantené los cambios quirúrgicos y actualizá la documentación directamente relacionada.
- No confirmes `.env`, credenciales, tokens de Telegram, tokens de n8n ni archivos de datos privados.
- No modifiques archivos generados (`dist/`, builds de Vite o dependencias instaladas en `node_modules/`).
- **Documentación y Changelog (Obligatorio)**: Siempre que se hagan cambios o se agreguen nuevas features/endpoints/pantallas, mantené actualizado `CHANGELOG.md` siguiendo el formato estricto de 5 categorías con fecha al final (`[YYYY-MM-DD]`), además de `docs/ARCHITECTURE.md` y `README.md`.

## Servicios y Runtime LLM

La inferencia del modelo LLM se delega a `llama-engine` ejecutándose en `http://localhost:3050` (o `http://host.docker.internal:3050` dentro de los contenedores Docker).

Al cambiar parámetros del modelo o variables de entorno en `.env`, reiniciá solo el servicio correspondiente:

```powershell
docker compose up -d --no-deps engine-agent-api
docker compose logs -f engine-agent-api
```
