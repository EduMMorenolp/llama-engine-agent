# PRD — llama-engine-agent

## Visión general

Plataforma de agente AI autónomo que interactúa con un servidor llama.cpp local. Consta de dos paquetes independientes: un backend que ejecuta el loop del agente con herramientas, y un frontend de chat en tiempo real.

**Versión actual:** 0.1.0
**Stack:** Express + TypeScript + SQLite (backend) / React 19 + Vite 6 (frontend)
**Dependencia externa:** llama.cpp en `localhost:3050` (API compatible OpenAI)

---

## Objetivos

1. Proveer una interfaz de chat conversacional con streaming en tiempo real.
2. Ejecutar un agente autónomo con capacidad de usar herramientas (bash, archivos, búsqueda, memorias).
3. Persistir sesiones, mensajes y memorias del agente en SQLite.
4. Permitir herramientas custom registradas por el usuario.
5. Soportar integración opcional con Telegram.

---

## Usuarios

| Tipo | Descripción |
|------|-------------|
| Usuario final | Interactúa con el agente via UI web o Telegram |
| Desarrollador | Configura herramientas custom, gestiona el agente |

---

## Funcionalidades

### F1 — Chat con streaming (SSE + WebSocket)

- Enviar mensajes y recibir respuesta en chunks via SSE o WebSocket.
- Eventos: `message`, `tool_start`, `tool_end`, `done`, `error`.
- El frontend renderiza Markdown con GFM y syntax highlighting.

### F2 — Gestión de sesiones

- Crear, listar, obtener y eliminar sesiones.
- Cada sesión tiene: id, nombre, modelo, timestamps.
- Las sesiones agrupan conversaciones y sus mensajes.

### F3 — Loop del agente con herramientas

- El agente recibe el historial de la sesión + system prompt + memorias.
- Itera hasta 10 veces por mensaje del usuario.
- En cada iteración: envía al LLM → si hay tool calls, ejecuta y repite → si solo texto, responde.
- Tools disponibles: `bash`, `read_file`, `write_file`, `edit_file`, `glob_search`, `grep_search`, `memorize`, `search_memories`, `update_memory`.

### F4 — Memoria persistente

- CRUD de memorias (key, content, tags).
- Las memorias se inyectan en el system prompt del agente.
- El agente puede crear/actualizar memorias via tool `memorize`/`update_memory`.

### F5 — Herramientas custom

- Registrar herramientas con handler: `bash` (ejecutar comando), `http` (llamada HTTP), `prompt` (prompt template).
- Las herramientas custom se integran al loop del agente igual que las built-in.

### F6 — Proxy de modelos

- Endpoint `GET /api/models` que proxea a llama.cpp.
- Retorna la lista de modelos disponibles en el servidor local.

### F7 — Gestión MCP (Model Context Protocol)

- Endpoints para registrar y gestionar servidores MCP.
- Permite conectar el agente a fuentes de datos externas.

### F8 — Integración Telegram (opcional)

- Bot de Telegram que recibe mensajes y responde via el agente.
- Control de usuarios permitidos via env var.

---

## User Stories

| ID | Story | Prioridad |
|----|-------|-----------|
| US-01 | Como usuario, quiero enviar un mensaje y ver la respuesta en streaming | Alta |
| US-02 | Como usuario, quiero crear y gestionar sesiones de chat | Alta |
| US-03 | Como usuario, quiero que el agente pueda ejecutar comandos bash | Alta |
| US-04 | Como usuario, quiero que el agente lea/escriba archivos | Alta |
| US-05 | Como usuario, quiero que el agente recuerde contexto entre sesiones | Alta |
| US-06 | Como desarrollador, quiero registrar herramientas custom | Media |
| US-07 | Como usuario, quiero ver el estado de ejecución de herramientas | Media |
| US-08 | Como usuario, quiero conectarme via WebSocket para tiempo real | Media |
| US-09 | Como usuario, quiero interactuar via Telegram | Baja |

---

## Criterios de aceptación

- [ ] El backend responde en menos de 200ms al health check.
- [ ] El streaming SSE entrega chunks de texto en menos de 500ms desde la primera respuesta del LLM.
- [ ] El agente ejecuta un máximo de 10 iteraciones por mensaje.
- [ ] Las sesiones y mensajes persisten en SQLite correctamente.
- [ ] Las memorias se inyectan en el system prompt del agente.
- [ ] Los errores se retornan como eventos SSE/WS tipo `error`.
- [ ] La UI muestra bloques de código con syntax highlighting.
- [ ] Los tests cubren: agent loop, tools, sessions, memories, middleware.

---

## Restricciones

- Requiere un servidor llama.cpp corriendo en `localhost:3050`.
- No hay autenticación de usuarios (solo API key estática).
- SQLite como única base de datos (sin soporte multi-usuario).
- Sin workspace configurado entre los dos paquetes (cada uno es independiente).
