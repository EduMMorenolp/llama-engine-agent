# llama-engine-agent — Instrucciones del Agente

Asistente personal proactivo local con modelo Qwen 3.5 4B corriendo en `llama.cpp` (`http://localhost:3050` provisto por `llama-engine`).
Arquitectura: **Enfoque B** (n8n como orquestador de eventos, PostgreSQL 16 dedicado, Faster-Whisper local, Telegram bot y Web UI en React/Vite).

## Estructura Modular

```
llama-engine-agent/
├── .vscode/
│   └── tasks.json
├── docs/
├── engine-agent/
│   ├── engine-agent-api/        # Puerto 3060 (Express + TS API)
│   └── engine-agent-ui/         # Puerto 3061 (React 19 + Vite Web UI)
├── engine-n8n/                  # Puerto 5678 (Orquestador de workflows)
│   └── workflows/
├── engine-postgres/             # Puerto 5434 (PostgreSQL 16)
│   └── init/
├── engine-whisper/              # Puerto 8000 (Faster-Whisper STT CUDA)
├── docker-compose.yml           # Compose raíz que orquesta los servicios
├── AGENTS.md
├── CHANGELOG.md
└── README.md
```

## Servicios y Puertos

| Servicio | Carpeta | Rol | Puerto / Endpoint |
|---|---|---|---|
| **llama-runtime** | `llama-engine` | Inferencia LLM (Qwen 3.5 4B) | `http://localhost:3050` / `8080` |
| **engine-whisper** | `./engine-whisper` | Transcripción STT de voz con CUDA | `http://localhost:8000` |
| **engine-postgres**| `./engine-postgres`| Base de datos persistente | `localhost:5434` (interno 5432) |
| **engine-n8n** | `./engine-n8n` | Orquestador de crons, tools y Telegram | `http://localhost:5678` |
| **engine-agent-api**| `./engine-agent/engine-agent-api` | API REST & WebSocket | `http://localhost:3060` |
| **engine-agent-ui** | `./engine-agent/engine-agent-ui` | Dashboard web y chat con Web Speech | `http://localhost:3061` |

## Comandos

### Docker

| Acción | Comando |
|---|---|
| Iniciar todos los servicios | `docker compose up -d` |
| Iniciar solo infraestructura (DB, STT, n8n) | `docker compose up -d engine-postgres engine-whisper engine-n8n` |
| Ver logs | `docker compose logs -f` |
| Detener | `docker compose down` |

### engine-agent-ui (Frontend)

| Acción | Comando |
|---|---|
| Instalar | `cd engine-agent/engine-agent-ui && npm install` |
| Desarrollo | `npm run dev` (puerto 3061) |
| Build | `npm run build` |
| Lint | `npm run lint` |

## Convenciones y Reglas

- **PostgreSQL**: Seguir `supabase-postgres-best-practices` (nombres en snake_case, tipos timestamptz/date/time, índices en columnas de filtro cron).
- **Contratos de API**: Seguir `contrato-api-global` (payloads tipados, errores predecibles).
- **Changelog**: Registrar cada cambio en `CHANGELOG.md` siguiendo `changelog-global` con fecha al final.
- **Tasks VS Code**: Usar `.vscode/tasks.json` para encender los servicios de desarrollo.
