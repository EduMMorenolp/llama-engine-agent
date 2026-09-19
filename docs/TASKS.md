# Tasks — llama-engine-agent

## Roadmap

### v0.1.0 — MVP funcional

- [x] Backend: Express + TypeScript + SQLite
- [x] Backend: Agent loop con tools (max 10 iteraciones)
- [x] Backend: 9 herramientas built-in
- [x] Backend: Streaming SSE
- [x] Backend: WebSocket server
- [x] Backend: CRUD sesiones + mensajes
- [x] Backend: CRUD memorias
- [x] Backend: Herramientas custom
- [x] Backend: Proxy de modelos
- [x] Backend: Gestión MCP
- [x] Frontend: React 19 + Vite 6
- [x] Frontend: Chat con streaming
- [x] Frontend: Gestión de sesiones
- [x] Frontend: Markdown rendering + syntax highlighting
- [x] Frontend: WebSocket client
- [x] Tests: agent loop, tools, sessions, memories, middleware

### v0.2.0 — Mejoras

- [ ] Integración Telegram
- [ ] Autenticación de usuarios (no solo API key)
- [ ] Búsqueda en historial de聊天
- [ ] Export de sesiones (markdown/JSON)
- [ ] Theme switching (light/dark)
- [ ] Mermaid rendering en chat

### v0.3.0 — Escalabilidad

- [ ] Migración a PostgreSQL (opcional)
- [ ] Multi-usuario
- [ ] Rate limiting
- [ ] Logging estructurado
- [ ] Health check mejorado (DB status, LLM status)
- [ ] Dashboard de métricas

---

## Backlog

- [ ] Configuración de system prompt via UI
- [ ] Selector de modelo via UI
- [ ] Drag & drop de archivos
- [ ] Soporte de imágenes (multimodal)
- [ ] Plugin system para herramientas
- [ ] Webhooks para eventos del agente
- [ ] Rate limiting por usuario
- [ ] Compresión de historial (context window management)

---

## En progreso

_Ninguna tarea en progreso actualmente._

---

## Completado

| Fecha | Tarea | Notas |
|-------|-------|-------|
| 2026-09-19 | Setup proyecto | Express + React + Vite |
| 2026-09-19 | Agent loop | Loop con tools, max 10 iteraciones |
| 2026-09-19 | 9 herramientas built-in | bash, file ops, search, memories |
| 2026-09-19 | Streaming SSE + WS | Tiempo real |
| 2026-09-19 | CRUD sesiones | SQLite persistence |
| 2026-09-19 | CRUD memorias | Memoria persistente del agente |
| 2026-09-19 | Herramientas custom | bash, http, prompt handlers |
| 2026-09-19 | Frontend chat UI | React 19, glassmorphism |
| 2026-09-19 | Documentación | PRD, Architecture, Rules, Design, Tasks, Memory |

---

## Blockeros

_Ningún bloqueo activo._
