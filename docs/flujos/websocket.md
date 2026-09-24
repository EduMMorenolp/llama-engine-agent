# Flujo: WebSocket y health check

Archivos:
- `lib/api-client.ts` (`connectWebSocket`)
- `features/chat/hooks/useChat.ts`

## 1. Conexión

```ts
connectWebSocket():
  wsUrl = AGENT_URL.replace(/^http/, "ws") + "/ws"
  // ej: http://localhost:3060 → ws://localhost:3060/ws
  return new WebSocket(wsUrl)
```

Una conexión **por mensaje** (no long-lived compartida): `sendMessage` abre el WS, en `done`/`error` lo cierra, `stopStreaming` lo cierra.

## 2. Mensaje cliente → servidor

```json
{
  "type": "chat",
  "payload": {
    "sessionId": "…",
    "message": "…",
    "agent": "coder" | undefined,
    "model": "qwen3.5-9b",
    "systemPrompt": "…",
    "enabledTools": ["bash", "read_file"],
    "modelSettings": { "enableReasoning": true, … }
  }
}
```

## 3. Mensajes servidor → cliente (`StreamEvent`)

```ts
{ type: "message" | "tool_start" | "tool_end" | "done" | "error",
  payload: Record<string, unknown> }
```

| type | payload clave | Acción en useChat |
|------|--------------|-------------------|
| `message` | `content`, `_subAgent?` | acumula texto en `currentContent`; captura `subAgent` |
| `tool_start` | `id`, `name`, `args` | push `ToolCallInfo` pending |
| `tool_end` | `id`, `name`, `result`, `error?` | matchea y marca done/error |
| `done` | — | emite **una** burbuja assistant final (con `_subAgent` y `toolCalls` JSON); `onDone`; cierra WS |
| `error` | `message` | burbuja `⚠️ **Aviso**` + `onError`; cierra WS |

Backend adjunta `_subAgent` a **todos** los eventos cuando el chat corre con `agent`; el frontend solo lo lee (primera vez que aparece) y lo congela para la burbuja final.

## 4. Estados de conexión

`connectionState`: `"connected" | "reconnecting" | "disconnected"`

- `checkHealth()` → `GET /api/health` → `status==="ok"` o `agentRunning` definido → `connected`; si no → `disconnected`
- Monto inicial + intervalo de **15s** (solo si `!streaming`)
- `ws.onopen` → `connected`
- `ws.onerror` / fallo de health → `disconnected`

## 5. Flujo completo de ciclo de vida

```
sendMessage:
  streamingRef=true, setStreaming(true)
  connectWebSocket()  ──throw?→ onError, disconnected, return
  onopen → send chat payload
  onmessage → switch (ver tabla)
  done/error → streamingRef=false, limpia, close
  onclose (si streamingRef aún true) → solo limpia flags
stopStreaming:
  close + streamingRef=false + limpia
```

`streamingRef` (ref boolean) es el guard real de single-flight y de `onclose`/`onerror`; `streaming` (state) es para render (botón Stop, loading gate, auto-scroll).

## 6. Health REST

```
GET /api/health  (sin auth)
→ { status, agentRunning }
```

Usado solo por `useChat.checkHealth`, no por `api-client` auth.
