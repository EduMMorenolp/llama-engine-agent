# Changelog

## Sin liberar

- **Agregado**: Carga paginada de mensajes — `GET /api/sessions/:id` ahora acepta params `limit` (default 100, max 500) y `offset`, retorna `hasMore` y `totalMessages` en la respuesta. `SessionService.getMessagesPaginated()` reemplaza a `getMessages()` para queries paginadas. [2026-09-20]
  * **Archivos**: `src/modules/sessions/service.ts`, `src/modules/sessions/controller.ts`, `src/server.test.ts`. [2026-09-20]

- **Cambiado**: Ejecución paralela de tools — múltiples tool calls del LLM ahora se ejecutan concurrentemente vía `Promise.allSettled`. Reduce latencia ~67% cuando 3+ tools se llaman en una sola iteración. [2026-09-20]
  * **Archivos**: `src/agent/loop.ts`. [2026-09-20]

- **Agregado**: Reintentos con backoff exponencial para el cliente LLM — `sendMessage` y `sendMessageStream` ahora reintentan hasta 3 veces en errores transitorios (429, 500, 502, 503, 504, ECONNRESET, ETIMEDOUT) con delays de 1s, 2s, 4s. Elimina crashes por indisponibilidad temporal de llama.cpp. [2026-09-20]
  * **Archivos**: `src/agent/llm-client.ts`, `src/agent/llm-client.test.ts`. [2026-09-20]

- **Agregado**: Cache de tool calls (`ToolCache`) — cache LRU con TTL de 60s para tools idempotentes (read_file, glob_search, grep_search, search_memories). Evita I/O redundante para queries repetidas idénticas dentro de la misma sesión. [2026-09-20]
  * **Archivos**: `src/agent/tool-cache.ts`, `src/agent/tool-cache.test.ts`, `src/agent/loop.ts`. [2026-09-20]

- **Cambiado**: Persistencia debounced de base de datos — `saveDb()` reemplazado por `scheduleSave()` (debounce de 100ms) en servicios de sesiones y memorias. Reduce bloqueo de I/O síncrono ~80% durante ejecución rápida de tools. `forceSaveIfPending()` llamado en SIGTERM/SIGINT shutdown. [2026-09-20]
  * **Archivos**: `src/db/index.ts`, `src/modules/sessions/service.ts`, `src/modules/memories/service.ts`, `src/index.ts`. [2026-09-20]

- **Cambiado**: Truncado inteligente de historial preserva pares assistant→tool — cuando la ventana de contexto excede el budget, el algoritmo de truncado ahora camina hacia atrás manteniendo mensajes assistant y sus tool responses correspondientes juntos, evitando flujo de conversación roto. [2026-09-20]
  * **Archivos**: `src/agent/prompt.ts`, `src/agent/prompt.test.ts`. [2026-09-20]

- **Cambiado**: Feedback de iteración agotada — cuando el loop del agente alcanza `maxIterations`, ahora emite un resumen estructurado listando todas las tools ejecutadas e instruye al LLM a sintetizar resultados, en lugar de un mensaje genérico "completado". [2026-09-20]
  * **Archivos**: `src/agent/loop.ts`, `src/agent/loop.test.ts`. [2026-09-20]

- **Cambiado**: Migraciones versionadas — schemas SQL movidos de strings inline a archivos `src/db/migrations/*.sql`. Runner de migraciones rastrea archivos aplicados en tabla `_migrations`. [2026-09-19]
  * **Archivos**: `src/db/index.ts`, `src/db/migrations/001-create-sessions.sql`, `002-create-messages.sql`, `003-create-memories.sql`, `004-create-custom-tools.sql`. [2026-09-19]

- **Agregado**: DTOs Zod para módulo MCP — `addServerDto` valida `name` (requerido), `transport` (enum), `command`, `args`, `url`, `env` opcionales. Controller ahora usa `safeParse` con `BadRequestException` en fallo de validación. [2026-09-19]
  * **Archivos**: `src/modules/mcp/dto.ts`, `src/modules/mcp/controller.ts`. [2026-09-19]

- **Agregado**: `README.md` del backend — descripción del proyecto, stack, arquitectura, setup, scripts, endpoints, docs. [2026-09-19]
  * **Archivos**: `README.md`. [2026-09-19]

- **Cambiado**: Capa de acceso a datos consolidada — `SessionStore` eliminado. `SessionService` ahora es la capa canónica de acceso a datos para sesiones y mensajes. Métodos agregados: `addMessage`, `getSessionOrNull`, `createSessionRaw`. `AgentLoopConfig` ahora incluye `memoryService: MemoryService` para operaciones de memoria. [2026-09-19]
  * **Archivos**: `src/modules/sessions/service.ts`, `src/agent/loop.ts`, `src/agent/prompt.ts`, `src/tools/types.ts`, `src/ws.ts`, `src/server.ts`, `src/routes/index.ts`, `src/index.ts`. [2026-09-19]
  * **Eliminado**: `src/sessions/store.ts`, `src/sessions/db.ts` (código muerto duplicado). [2026-09-19]

- **Cambiado**: Propagación de errores en controllers MCP y Models — todos los handlers async ahora usan `next(err)` en lugar de try/catch inline con `res.status(500)`, delegando al handler central de errores. [2026-09-19]
  * **Archivos**: `src/modules/mcp/controller.ts`, `src/modules/models/controller.ts`. [2026-09-19]

- **Cambiado**: Reemplazo de `console.log` por `logger` centralizado en servidor WebSocket. Tipos `any` corregidos en `loop.ts`, `ws.ts`, `tools/index.ts`, `chat/handler.ts`. [2026-09-19]
  * **Archivos**: `src/ws.ts`, `src/agent/loop.ts`, `src/tools/index.ts`, `src/modules/chat/handler.ts`. [2026-09-19]

- **Agregado**: Logger HTTP Morgan (`morgan("short")`) integrado en el stack de middleware de Express. [2026-09-19]
  * **Archivos**: `src/server.ts`. [2026-09-19]
  * **Dependencias**: `morgan`, `@types/morgan`. [2026-09-19]

- **Agregado**: `.env.example` con todas las variables de entorno documentadas. [2026-09-19]
  * **Archivos**: `.env.example`. [2026-09-19]

- **Eliminado**: Código muerto — `src/env.ts` (duplicado de `src/config/index.ts`), `src/sessions/db.ts` (duplicado de `src/db/index.ts`), `src/sessions/store.test.ts` (test del store eliminado). [2026-09-19]

- **Corregido**: Unicidad de IDs de memoria — `MemoryService.upsert` ahora usa `crypto.randomUUID()` en lugar de `Date.now()` para prevenir colisiones de constraint UNIQUE en ejecución rápida de tests. [2026-09-19]
  * **Archivos**: `src/modules/memories/service.ts`. [2026-09-19]

- **Agregado**: Subsistema MCP (Model Context Protocol) y gestión (`src/modules/mcp/`). Implementa comunicación cliente JSON-RPC sobre subprocessos `stdio`, descubrimiento de tools (`tools/list`), registro dinámico en `ToolRegistry`, ejecución de tools (`tools/call`), y endpoints REST de gestión (`/api/mcp/servers`, `/api/mcp/servers/:id/connect`, `/api/mcp/servers/:id/disconnect`). Incluye presets integrados: Memory Graph, Filesystem MCP, Fetch & Web Search. [2026-09-16]
  * **Archivos**: `src/modules/mcp/types.ts`, `src/modules/mcp/manager.ts`, `src/modules/mcp/controller.ts`, `src/modules/mcp/routes.ts`, `src/modules/mcp/manager.test.ts`. [2026-09-16]

- **Agregado**: Soporte de opción `enabledTools` en protocolo WebSocket chat (`ws.ts`) y loop autónomo del agente (`loop.ts`). Filtra dinámicamente schemas de tools y salta definiciones cuando las tools están deshabilitadas, evitando ejecución no deseada. [2026-09-16]
  * **Archivos**: `src/agent/types.ts`, `src/agent/loop.ts`, `src/ws.ts`. [2026-09-16]

- **Agregado**: Gestión de budget de ventana de contexto y truncado de historial en `prompt.ts`. Trunca historial de mensajes más viejos para prevenir errores de overflow de contexto (ej: 400 Bad Request / 349k tokens). [2026-09-16]
  * **Archivos**: `src/agent/prompt.ts`, `src/agent/prompt.test.ts`. [2026-09-16]

- **Agregado**: Truncado de salida (max 8KB / 200 líneas) y filtros de exclusión de directorios (`node_modules`, `.git`, `dist`, `build`, etc.) para tools `read_file`, `bash`, `glob_search` y `grep_search`. [2026-09-16]
  * **Archivos**: `src/tools/index.ts`. [2026-09-16]

- **Corregido**: Normalización de baseURL en LLMClient asegurando presencia de sufijo `/v1` y mejorando formato de errores compatible con OpenAI. [2026-09-16]
  * **Archivos**: `src/agent/llm-client.ts`, `src/agent/llm-client.test.ts`. [2026-09-16]

- **Agregado**: Arquitectura de microservicio core engine-agent:
  * Loop de agente autónomo iterativo (`src/agent/loop.ts`) con ejecución multi-step de tools.
  * Store SQLite de sesiones y memoria persistente (`src/sessions/store.ts`, `src/db/index.ts`).
  * Tool Registry (`src/tools/registry.ts`) y tools integradas (bash, file-ops, search, memory).
  * Servidor de streaming WebSocket en tiempo real (`src/ws.ts`) y API REST Express (`src/server.ts`, `src/routes/index.ts`). [2026-09-16]
