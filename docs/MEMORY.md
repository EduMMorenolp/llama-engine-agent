# Memory — llama-engine-agent

## Estado actual

| Campo | Valor |
|-------|-------|
| Versión | 0.1.0 |
| Última actualización | 2026-09-19 |
| Estado | MVP funcional |

---

## Qué está funcionando

- **Backend completo:** Express + TypeScript, agent loop con 9 herramientas, streaming SSE + WebSocket, CRUD sesiones/memories/tools, proxy de modelos, MCP.
- **Frontend funcional:** React 19 + Vite 6, chat con streaming, markdown rendering, gestión de sesiones, glassmorphism UI.
- **Tests:** Cobertura en agent loop, tools, sessions, memories, middleware, chat handler, componentes UI.
- **Dev tooling:** Biome (lint/format), Vitest (tests), tsx (dev runner).

---

## Decisiones tomadas

| Decisión | Fecha | Razón |
|----------|-------|-------|
| SQLite via sql.js (WASM) | 2026-09-19 | Sin dependencias nativas, file-based |
| Biome sobre ESLint+Prettier | 2026-09-19 | Más rápido, config unificada |
| React Context sobre Redux/Zustand | 2026-09-19 | Sin dependencia externa, suficiente |
| openai SDK para llama.cpp | 2026-09-19 | API compatible, types incluidos |
| Express sobre Fastify/Hono | 2026-09-19 | Simplicidad, ecosistema |
| Vitest sobre Jest | 2026-09-19 | ESM nativo, más rápido |

---

## Conocimiento acumulado

### llama.cpp
- Expone API compatible con OpenAI en `localhost:3050`.
- Modelos se listan via `GET /v1/models`.
- Streaming funciona via `stream: true` en chat completions.

### sql.js
- WASM-based SQLite, sin binario nativo.
- La DB se crea automáticamente al iniciar.
- Migraciones en `src/db/index.ts`.

### WebSocket
- Endpoint: `ws://localhost:3060/ws`.
- Protocolo: JSON messages con `type` y `payload`.
- El frontend se reconecta automáticamente.

---

## Errores resueltos

_Ningún error registrado aún._

---

## Aprendizajes

_Ningún aprendizaje registrado aún._
