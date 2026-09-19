# engine-agent

Backend API server for an autonomous AI agent that runs against a local llama.cpp server (`localhost:3050`). Provides a REST + WebSocket API for chat, session management, persistent memory, tool execution, and MCP integration.

## Stack

- **Runtime**: Node.js >= 18, ESM, strict TypeScript
- **Framework**: Express + Helmet + CORS + Morgan
- **Database**: SQLite via sql.js (WASM) — no native bindings
- **Validation**: Zod (fail-fast config + request validation)
- **LLM Client**: OpenAI SDK (compatible with llama.cpp)
- **Streaming**: Server-Sent Events (REST) + WebSocket
- **Tooling**: Biome (lint/format), Vitest (tests)

## Quick start

```bash
cp .env.example .env        # configure env vars
npm install
npm run dev                 # tsx watch, port 3060
```

The server requires a llama.cpp instance running at `http://localhost:3050`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot-reload |
| `npm start` | Compile and run in production mode |
| `npm test` | Run tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check with Biome |
| `npm run format` | Format with Biome |
| `npm run check` | Lint + format in one pass |

## Configuration

Environment variables (validated with Zod at startup):

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_PORT` | `3060` | HTTP server port |
| `ENGINE_API_URL` | `http://localhost:3050` | llama.cpp API URL |
| `ENGINE_API_KEY` | `llama-engine-dev` | API key for llama.cpp |
| `DB_PATH` | `./data/agent.db` | SQLite database path |
| `MAX_ITERATIONS` | `10` | Max agent loop iterations |
| `SYSTEM_PROMPT` | _(Spanish default)_ | Agent system prompt |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token (optional) |
| `TELEGRAM_ALLOWED_USERS` | — | Comma-separated allowed Telegram users |
| `LOG_LEVEL` | `info` | Log level |

## Authentication

All `/api` endpoints (except `/api/health`) require an API key via:

- `X-API-Key` header, or
- `Authorization: Bearer <key>` header

Default key: `llama-engine-dev`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (no auth) |
| POST | `/api/chat` | Send message to agent (SSE stream) |
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions/:id` | Get session |
| PATCH | `/api/sessions/:id` | Update session |
| DELETE | `/api/sessions/:id` | Delete session |
| GET | `/api/memories` | Search memories |
| POST | `/api/memories` | Create/update memory |
| DELETE | `/api/memories/:id` | Delete memory |
| GET | `/api/tools` | List registered tools |
| DELETE | `/api/tools/:name` | Unregister tool |
| GET | `/api/models` | List available models from llama.cpp |
| GET | `/api/mcp/servers` | List MCP servers |
| POST | `/api/mcp/servers` | Add MCP server |
| DELETE | `/api/mcp/servers/:id` | Remove MCP server |
| POST | `/api/mcp/servers/:id/connect` | Connect to MCP server |
| POST | `/api/mcp/servers/:id/disconnect` | Disconnect from MCP server |
| WS | `/ws` | WebSocket for real-time chat |

## Built-in tools

`bash`, `read_file`, `write_file`, `edit_file`, `glob_search`, `grep_search`, `memorize`, `search_memories`, `update_memory`

## Project structure

```
src/
├── index.ts              # Entry point
├── server.ts             # Express app factory
├── ws.ts                 # WebSocket server
├── config/               # Zod env validation
├── db/                   # SQLite init + migrations
├── agent/                # Agent loop, LLM client, prompt builder
├── tools/                # Tool registry + built-in tools
├── modules/
│   ├── chat/             # SSE chat handler
│   ├── sessions/         # Session CRUD
│   ├── memories/         # Persistent memory
│   ├── models/           # llama.cpp model proxy
│   ├── mcp/              # Model Context Protocol
│   └── tools/            # Tool management endpoints
├── middleware/            # auth, errorHandler
├── common/               # HttpException hierarchy
└── utils/                # Logger
```

## Documentation

- `docs/API-CONTRACTS.md` — Full API contract (17 REST endpoints + WebSocket)
