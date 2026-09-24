# Flujos del Frontend — engine-ui-agent

Documentación de todos los flujos y funciones del frontend (`engine-ui-agent`, puerto 3061).

## Índice

| Doc | Flujo |
|-----|-------|
| [chat.md](chat.md) | Envío de mensajes, streaming, tools en vivo, stop, errores, reload, adjuntos, starters, mic |
| [sesiones.md](sesiones.md) | CRUD de sesiones, rename, fork, búsqueda, paginación de mensajes |
| [agentes.md](agentes.md) | Tabs Chat/Agentes, selección de agente → sesión, creación, mapping en localStorage |
| [configuracion.md](configuracion.md) | SettingsModal (2 tabs: Chat / Agentes), export/import, delete all |
| [modelos.md](modelos.md) | Selector de modelo, info del modelo, ModelSettingsModal (parámetros) |
| [herramientas.md](herramientas.md) | ToolSelector, AttachMenu, SystemPromptModal, MCPServersModal, FileUpload |
| [websocket.md](websocket.md) | Ciclo de vida del WebSocket de chat + health check periódico |
| [mensajes.md](mensajes.md) | MessageBubble: render markdown, thinking, tool cards, métricas, acciones |
| [sidebar.md](sidebar.md) | Layout, colapso del sidebar, footer, atajos de teclado |

## Stack

- React 19 + Vite + TypeScript (ESM)
- Sin lib de estado externa: Context Providers (`SessionsProvider`, `ToastProvider`)
- WebSocket para streaming en tiempo real (`useChat`)
- Markdown: `react-markdown` + GFM + `react-syntax-highlighter` (oneDark)
- Linter: Biome (tabs, double quotes, semicolons)

## Capas

```
App.tsx (Router + Providers)
  └─ Layout.tsx (sidebar + outlet)
       ├─ SessionList (sidebar: tabs Chat/Agentes, lista de sesiones)
       └─ ChatView (navbar, messages, Composer, modales)
            ├─ useChat (WebSocket streaming)
            ├─ useSessions (Provider: CRUD + mensajes)
            └─ MessageBubble (render de mensajes)
```

## API client

Todo pasa por `src/lib/api-client.ts`:

- `AGENT_URL` = `VITE_AGENT_URL` (default `http://localhost:3060`)
- `AGENT_KEY` = `VITE_AGENT_KEY`, header `x-api-key`
- Helpers: `apiGet`, `apiPost`, `apiPatch`, `apiDelete`, `connectWebSocket`
- `connectWebSocket()` convierte `http` → `ws` y apunta a `/ws`
- Errores HTTP → `throw new Error(message)` con `payload.error` del backend

## Estado local relevante (localStorage)

| Key | Contenido | Archivo |
|-----|-----------|---------|
| `active_session_id` | Sesión activa | `SessionsProvider.tsx` |
| `session_agents` | Mapa `sessionId → agentName` | `lib/session-agents.ts` |
| `llama_engine_settings` | Preferencias del SettingsModal | `SettingsModal.tsx` |
