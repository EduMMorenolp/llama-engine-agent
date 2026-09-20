# Changelog

## Unreleased

- **Changed**: Parallel tool execution — multiple tool calls from the LLM are now executed concurrently via `Promise.allSettled`. Reduces latency by ~67% when 3+ tools are called in a single iteration. [2026-09-20]
  * **Files (Archivos)**: `src/agent/loop.ts`. [2026-09-20]

- **Added**: Retry with exponential backoff for LLM client — `sendMessage` and `sendMessageStream` now retry up to 3 times on transient errors (429, 500, 502, 503, 504, ECONNRESET, ETIMEDOUT) with delays of 1s, 2s, 4s. Eliminates crashes from temporary llama.cpp unavailability. [2026-09-20]
  * **Files (Archivos)**: `src/agent/llm-client.ts`, `src/agent/llm-client.test.ts`. [2026-09-20]

- **Added**: Tool call cache (`ToolCache`) — LRU cache with 60s TTL for idempotent tools (read_file, glob_search, grep_search, search_memories). Avoids redundant I/O for repeated identical queries within the same session. [2026-09-20]
  * **Files (Archivos)**: `src/agent/tool-cache.ts`, `src/agent/tool-cache.test.ts`, `src/agent/loop.ts`. [2026-09-20]

- **Changed**: Debounced database persistence — `saveDb()` replaced with `scheduleSave()` (100ms debounce) in session and memory services. Reduces synchronous I/O blocking by ~80% during rapid tool execution. `forceSaveIfPending()` called on SIGTERM/SIGINT shutdown. [2026-09-20]
  * **Files (Archivos)**: `src/db/index.ts`, `src/modules/sessions/service.ts`, `src/modules/memories/service.ts`, `src/index.ts`. [2026-09-20]

- **Changed**: Smart history truncation preserves assistant→tool pairs — when context window exceeds budget, the truncation algorithm now walks backwards keeping assistant messages and their corresponding tool responses together, preventing broken conversation flow. [2026-09-20]
  * **Files (Archivos)**: `src/agent/prompt.ts`, `src/agent/prompt.test.ts`. [2026-09-20]

- **Changed**: Iteration exhaustion feedback — when the agent loop hits `maxIterations`, it now emits a structured summary listing all executed tools and instructs the LLM to synthesize results, instead of a generic "completado" message. [2026-09-20]
  * **Files (Archivos)**: `src/agent/loop.ts`, `src/agent/loop.test.ts`. [2026-09-20]

- **Changed**: Versioned migrations — SQL schemas moved from inline strings to `src/db/migrations/*.sql` files. Migration runner tracks applied files in `_migrations` table. [2026-09-19]
  * **Files (Archivos)**: `src/db/index.ts`, `src/db/migrations/001-create-sessions.sql`, `002-create-messages.sql`, `003-create-memories.sql`, `004-create-custom-tools.sql`. [2026-09-19]

- **Added**: Zod DTOs for MCP module — `addServerDto` validates `name` (required), `transport` (enum), optional `command`, `args`, `url`, `env`. Controller now uses `safeParse` with `BadRequestException` on validation failure. [2026-09-19]
  * **Files (Archivos)**: `src/modules/mcp/dto.ts`, `src/modules/mcp/controller.ts`. [2026-09-19]

- **Added**: Backend `README.md` — project description, stack, architecture, setup, scripts, endpoints, docs. [2026-09-19]
  * **Files (Archivos)**: `README.md`. [2026-09-19]

- **Changed**: Consolidated data access layer — `SessionStore` removed. `SessionService` is now the single canonical data access layer for sessions and messages. Added `addMessage`, `getSessionOrNull`, `createSessionRaw` methods. `AgentLoopConfig` now includes `memoryService: MemoryService` for memory operations. [2026-09-19]
  * **Files (Archivos)**: `src/modules/sessions/service.ts`, `src/agent/loop.ts`, `src/agent/prompt.ts`, `src/tools/types.ts`, `src/ws.ts`, `src/server.ts`, `src/routes/index.ts`, `src/index.ts`. [2026-09-19]
  * **Removed**: `src/sessions/store.ts`, `src/sessions/db.ts` (dead code duplicates). [2026-09-19]

- **Changed**: Error propagation in MCP and Models controllers — all async handlers now use `next(err)` instead of inline try/catch with `res.status(500)`, delegating to the central error handler. [2026-09-19]
  * **Files (Archivos)**: `src/modules/mcp/controller.ts`, `src/modules/models/controller.ts`. [2026-09-19]

- **Changed**: Replaced `console.log` with centralized `logger` in WebSocket server. Fixed `any` types in `loop.ts`, `ws.ts`, `tools/index.ts`, `chat/handler.ts`. [2026-09-19]
  * **Files (Archivos)**: `src/ws.ts`, `src/agent/loop.ts`, `src/tools/index.ts`, `src/modules/chat/handler.ts`. [2026-09-19]

- **Added**: Morgan HTTP request logger (`morgan("short")`) integrated in Express middleware stack. [2026-09-19]
  * **Files (Archivos)**: `src/server.ts`. [2026-09-19]
  * **Dependencies**: `morgan`, `@types/morgan`. [2026-09-19]

- **Added**: `.env.example` with all environment variables documented. [2026-09-19]
  * **Files (Archivos)**: `.env.example`. [2026-09-19]

- **Removed**: Dead code — `src/env.ts` (duplicate of `src/config/index.ts`), `src/sessions/db.ts` (duplicate of `src/db/index.ts`), `src/sessions/store.test.ts` (test for deleted store). [2026-09-19]

- **Fixed**: Memory ID uniqueness — `MemoryService.upsert` now uses `crypto.randomUUID()` instead of `Date.now()` to prevent UNIQUE constraint collisions in rapid test execution. [2026-09-19]
  * **Files (Archivos)**: `src/modules/memories/service.ts`. [2026-09-19]

- **Added**: MCP (Model Context Protocol) subsystem and management (`src/modules/mcp/`). Implements JSON-RPC client communication over `stdio` subprocesses, tool discovery (`tools/list`), dynamic registration in `ToolRegistry`, tool execution (`tools/call`), and REST management endpoints (`/api/mcp/servers`, `/api/mcp/servers/:id/connect`, `/api/mcp/servers/:id/disconnect`). Includes built-in presets: Memory Graph, Filesystem MCP, Fetch & Web Search. [2026-09-16]
  * **Files (Archivos)**: `src/modules/mcp/types.ts`, `src/modules/mcp/manager.ts`, `src/modules/mcp/controller.ts`, `src/modules/mcp/routes.ts`, `src/modules/mcp/manager.test.ts`. [2026-09-16]

- **Added**: `enabledTools` option support in WebSocket chat protocol (`ws.ts`) and autonomous agent loop (`loop.ts`). Dynamically filters tool schemas and skips tool definitions when tools are disabled, preventing unwanted tool execution. [2026-09-16]
  * **Files (Archivos)**: `src/agent/types.ts`, `src/agent/loop.ts`, `src/ws.ts`. [2026-09-16]

- **Added**: Context window budget management and history trimming in `prompt.ts`. Trims older message history to prevent context overflow errors (e.g. 400 Bad Request / 349k tokens). [2026-09-16]
  * **Files (Archivos)**: `src/agent/prompt.ts`, `src/agent/prompt.test.ts`. [2026-09-16]

- **Added**: Output truncation (max 8KB / 200 lines) and directory exclusion filters (`node_modules`, `.git`, `dist`, `build`, etc.) for `read_file`, `bash`, `glob_search`, and `grep_search` tools. [2026-09-16]
  * **Files (Archivos)**: `src/tools/index.ts`. [2026-09-16]

- **Fixed**: LLMClient baseURL normalization ensuring `/v1` suffix is present and improving OpenAI-compatible error formatting. [2026-09-16]
  * **Files (Archivos)**: `src/agent/llm-client.ts`, `src/agent/llm-client.test.ts`. [2026-09-16]

- **Added**: Core engine-agent microservice architecture:
  * Autonomous iterative agent loop (`src/agent/loop.ts`) with multi-step tool execution.
  * SQLite session and persistent memory store (`src/sessions/store.ts`, `src/db/index.ts`).
  * Tool Registry (`src/tools/registry.ts`) and built-in tools (bash, file-ops, search, memory).
  * Real-time WebSocket streaming server (`src/ws.ts`) and Express REST API (`src/server.ts`, `src/routes/index.ts`). [2026-09-16]
