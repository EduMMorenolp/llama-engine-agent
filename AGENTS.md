# llama-engine-agent — Instrucciones del Agente

Plataforma de agente AI autónomo que corre contra un servidor llama.cpp local (`localhost:3050`). Dos paquetes independientes: backend (`engine-agent`:3060) y frontend (`engine-ui-agent`:3061).

## Comandos

### engine-agent (Backend)

| Acción | Comando |
|--------|---------|
| Instalar | `cd engine-agent && npm install` |
| Desarrollo | `npm run dev` (tsx watch, puerto 3060) |
| Build | `npm run build` (tsc) |
| Producción | `npm start` (node dist/index.js) |
| Tests | `npm test` (vitest run) |
| Tests watch | `npm run test:watch` |
| Lint | `npm run lint` (biome check) |
| Formatear | `npm run format` (biome format --write) |
| Fix lint+format | `npm run check` (biome check --write) |

### engine-ui-agent (Frontend)

| Acción | Comando |
|--------|---------|
| Instalar | `cd engine-ui-agent && npm install` |
| Desarrollo | `npm run dev` (vite, puerto 3061) |
| Build | `npm run build` (tsc -b && vite build) |
| Preview | `npm run preview` |
| Tests | `npm test` (vitest run) |
| Tests watch | `npm run test:watch` |
| Lint | `npm run lint` (biome check) |

### Requisitos

- Node.js >= 18
- Servidor llama.cpp corriendo en `http://localhost:3050` (API compatible OpenAI)

## Estructura del proyecto

```
llama-engine-agent/
  engine-agent/              # Backend (Express + TypeScript)
    src/
      index.ts               # Entry point
      server.ts              # Express app factory
      ws.ts                  # WebSocket server
      config/                # Validación de env con Zod
      db/                    # SQLite init + migraciones
      agent/                 # Loop del agente, LLM client, prompt
      tools/                 # Registry + 9 herramientas built-in
      sessions/              # Store de sesiones (CRUD)
      modules/               # chat, sessions, memories, tools, models, mcp
      middleware/             # auth, validation, errorHandler
      common/                # Excepciones HTTP
      utils/                 # Logger
    data/                    # SQLite DB (agent.db)
    docs/                    # API-CONTRACTS.md
  engine-ui-agent/           # Frontend (React + Vite)
    src/
      main.tsx               # Entry point
      App.tsx                # Router + providers
      api.ts                 # Tipos y funciones API
      lib/                   # API client (fetch + WebSocket)
      providers/             # ToastProvider, SessionsProvider
      components/            # Layout, Icons
      features/
        chat/                # ChatView, Composer, MessageBubble, modals
        sessions/            # SessionList
```

## Arquitectura

### Backend — Módulos

| Módulo | Ruta | Responsabilidad |
|--------|------|-----------------|
| chat | `POST /api/chat` | Streaming SSE del agente |
| sessions | `/api/sessions` | CRUD sesiones + mensajes |
| memories | `/api/memories` | Memoria persistente del agente |
| tools | `/api/tools` | Listar/eliminar herramientas |
| models | `GET /api/models` | Proxy a llama.cpp |
| mcp | `/api/mcp/*` | Gestión de servidores MCP |

### Backend — Flujo del agente

1. Guarda mensaje del usuario en SQLite
2. Carga memorias y arma system prompt
3. Loop (máx 10 iteraciones):
   - Envía historial + schemas de tools al LLM
   - Si hay tool calls → ejecuta → agrega resultado → continúa
   - Si solo texto → guarda respuesta → break
4. Emite eventos stream (`message`, `tool_start`, `tool_end`, `done`)

### Herramientas built-in

`bash`, `read_file`, `write_file`, `edit_file`, `glob_search`, `grep_search`, `memorize`, `search_memories`, `update_memory`

### Frontend — Arquitectura

- Feature-based con Context Providers (sin lib de estado externa)
- WebSocket para streaming en tiempo real (`useChat` hook)
- Markdown con GFM, syntax highlighting, bloques de thinking

## Base de datos

SQLite (sql.js WASM) con 4 tablas:
- `sessions` — id, name, model, created_at, updated_at
- `messages` — id, session_id FK, role, content, tool_calls, tool_call_id, created_at
- `memories` — id, key UNIQUE, content, tags, created_at, updated_at
- `custom_tools` — name PK, description, parameters, handler_type, handler_config, enabled, created_at

Migraciones en `src/db/index.ts`. La DB se crea automáticamente al iniciar.

## API

**Auth**: `X-API-Key` o `Authorization: Bearer <key>` (valor: `llama-engine-dev`)

Ver `engine-agent/docs/API-CONTRACTS.md` para el contrato completo (17 endpoints REST + 1 WebSocket).

### Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check (sin auth) |
| POST | `/api/chat` | Enviar mensaje (SSE) |
| GET/POST | `/api/sessions` | Listar/crear sesiones |
| GET/PATCH/DELETE | `/api/sessions/:id` | Obtener/actualizar/eliminar sesión |
| GET/POST/DELETE | `/api/memories` | Buscar/crear/eliminar memorias |
| GET/DELETE | `/api/tools` | Listar/eliminar herramientas |
| GET | `/api/models` | Modelos disponibles |
| WS | `/ws` | WebSocket para chat en tiempo real |

### WebSocket — Protocolo

**Cliente envía**: `{ type: "chat", payload: { sessionId, message, model, systemPrompt, enabledTools, modelSettings } }`

**Servidor envía**: `{ type: "message"|"tool_start"|"tool_end"|"done"|"error", payload: {...} }`

## Testing

| Paquete | Framework | Entorno | Archivos |
|---------|-----------|---------|----------|
| engine-agent | Vitest | node | 14 test files |
| engine-ui-agent | Vitest | jsdom | 5 test files |

Cobertura: agent loop, tools, sessions, memories, MCP manager, middleware, chat handler, componentes UI.

## Code style

- **Linter/formatter**: Biome (tabs, double quotes, semicolons, lineWidth 100)
- **TypeScript**: ES2022, strict mode, ESM (`"type": "module"`)
- **Backend**: NodeNext module resolution
- **Frontend**: ESNext + bundler resolution, react-jsx transform
- **No `any`** sin justificación explícita
- **Un componente por archivo** (frontend), naming PascalCase
- **Functional components** solamente (frontend)

## Convenciones de módulos

Cada módulo backend sigue:

```
modules/<nombre>/
  dto.ts        # Tipos + schemas Zod
  service.ts    # Lógica de negocio
  store.ts      # Acceso a datos
```

- Los DTOs viven en `modules/*/dto.ts`.
- Siempre validar con Zod antes de procesar.
- Errores via excepciones HTTP de `common/`.
- Nunca hacer fetch de datos sin try/catch.

## Env vars

### engine-agent (.env)

```
AGENT_PORT=3060
ENGINE_API_URL=http://localhost:3050
ENGINE_API_KEY=llama-engine-dev
DB_PATH=./data/agent.db
MAX_ITERATIONS=10
SYSTEM_PROMPT=Sos un asistente de IA inteligente, empático y servicial.
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_ALLOWED_USERS=
```

### engine-ui-agent (.env)

```
VITE_AGENT_URL=http://localhost:3060
VITE_AGENT_KEY=llama-engine-dev
```

## Reglas

**Siempre**
- Correr `npm run lint` antes de commitear (cada paquete tiene su propio Biome).
- Correr `npm test` para verificar que no se rompió nada.
- Usar Zod para validar inputs en el backend (DTOs en `modules/*/dto.ts`).
- Mantener los módulos separados: controller → service → store/db.

**Preguntar primero**
- Agregar nuevas dependencias runtime.
- Cambiar el schema de la DB (migraciones).
- Modificar el protocolo WebSocket.
- Agregar nuevos endpoints públicos.

**Nunca**
- Hardcodear secrets en código fuente.
- Hacer fetch de datos sin try/catch.
- Usar `any` sin justificación.
- Saltar la validación de Zod en endpoints.

**Testing**
- Tests en archivos `*.test.ts` o `*.test.tsx` junto al código.
- Cobertura mínima: agent loop, tools, sessions, memories, middleware.
- No mocking excesivo — testear comportamiento real cuando sea posible.

## Git

No hay sincronización automática. Commitear manualmente con mensajes descriptivos en inglés.

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `docs/PRD.md` | Requisitos del producto, user stories, criterios de aceptación |
| `docs/ARCHITECTURE.md` | Diagramas Mermaid de componentes, secuencia, BD |
| `docs/RULES.md` | Convenciones de código completas |
| `docs/DESIGN.md` | Paleta de colores, componentes UI, layout |
| `docs/TASKS.md` | Roadmap, backlog, tareas completadas |
| `docs/MEMORY.md` | Estado del proyecto, decisiones, conocimiento acumulado |
