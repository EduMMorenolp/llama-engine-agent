# Flujo: Chat (envío, streaming, herramientas)

Archivos principales:
- `features/chat/components/ChatView.tsx`
- `features/chat/components/Composer.tsx`
- `features/chat/hooks/useChat.ts`
- `lib/session-agents.ts`

## 1. Envío de un mensaje (`handleSend`)

```
Usuario escribe en Composer
  → Enter (sin Shift) o botón Send
  → Composer.handleSend()
      · valida: texto no vacío o hay adjuntos; no streaming; si escuchando, para el mic
      · enabledTools = tools.filter(enabled).map(name)
      · onSend(text, attachments, { systemPrompt, enabledTools, modelSettings })
      · limpia texto y adjuntos
  → ChatView.handleSend(text, attachments, options)
      · si no hay activeSessionId → createNewSession(undefined, selectedModel)
      · si hay adjuntos → construye fullMessage con markdown:
          - imágenes → ![name](dataURL)
          - archivos con contenido → 📎 **name** (size) + bloque de código
          - sin contenido → 📎 **name** (size)
      · addMessage(user con fullMessage)      // optimista en UI
      · scrollToBottom(smooth)
      · useChat.sendMessage(sessionId, fullMessage, {
            agent: getAgentForSession(sessionId) ?? undefined,
            model: selectedModel,
            systemPrompt, enabledTools, modelSettings
        }, onMessage=addMessage, onDone=refreshSessions, onError=addToast)
```

Punto clave: el **agente** se resuelve en el momento del envío desde `localStorage` (`session_agents`), no del navbar.

## 2. Streaming vía WebSocket (`useChat.sendMessage`)

```
if (streamingRef.current) return          // single-flight
streamingRef.current = true
setStreaming(true); setCurrentContent(""); setToolCalls([])

ws = connectWebSocket()                   // ws://…:3060/ws
ws.onopen:
  send { type:"chat", payload:{ sessionId, message, agent, model,
                                systemPrompt, enabledTools, modelSettings } }

ws.onmessage → switch(data.type):
  "message"    → acumula content en assistantContent
                 si payload._subAgent y aún no se capturó → subAgent = payload._subAgent
                 setCurrentContent(assistantContent)   // burbuja en vivo
  "tool_start" → crea ToolCallInfo {id, name, args, status:"pending"}
                 push a activeToolCalls; setToolCalls([...])
  "tool_end"   → matchea por id (o name+pending si no hay id)
                 result; status = error ? "error" : "done"
  "done"       → si hay assistantContent:
                   onMessage({ role:"assistant", content: assistantContent,
                               toolCalls: JSON.stringify(activeToolCalls) si >0,
                               _subAgent: subAgent })   // UNA sola burbuja final
                 streamingRef=false; setStreaming(false);
                 limpia content/tools; onDone(); ws.close()
  "error"      → onMessage(burbuja "⚠️ **Aviso**: msg"); onError(msg)
                 streamingRef=false; limpia; ws.close()

ws.onerror → connectionState=disconnected; burbuja de aviso; onError; limpia
ws.onclose → si aún streamingRef: limpia flags/estado (cierre inesperado)
```

**Decisión de diseño (fix de bug):** durante el streaming solo se actualiza `currentContent` (burbuja temporal `id:"streaming"` en ChatView). La burbuja definitiva del asistente se emite **una sola vez** en `done`, capturando `_subAgent` en una variable local. Esto evita que cada token cree un `Message` nuevo con UUID distinto.

## 3. Stop

```
Botón Send con disabled=true (streaming) se convierte en Stop
  → stopStreaming()
      · ws.close(); wsRef=null
      · streamingRef=false; setStreaming(false)
      · limpia currentContent y toolCalls
```

Nota: el mensaje parcial en `currentContent` se descarta (no se emite burbuja final).

## 4. Errores

| Origen | Comportamiento |
|--------|----------------|
| `connectWebSocket()` throw | `onError(msg)`, `connectionState=disconnected`, no envía |
| Evento `error` del backend | burbuja `⚠️ **Aviso**` + toast `error` |
| `ws.onerror` | burbuja de aviso + toast + `disconnected` |
| `ws.onclose` inesperado | solo limpia estado (sin burbuja) |
| Error de parseo JSON | `console.error` en `[ws]`, ignora el evento |

Toast: `ChatView` llama `addToast("error", err)` (ToastProvider auto-remueve a los 3s).

## 5. Reload / regenerate

```
MessageBubble botón Refresh
  → ChatView.handleReloadMsg(msg)
      · si msg.role === "user" → handleSend(msg.content, [])
      · si assistant → busca hacia atrás el último user message
                       → handleSend(prevUser.content, [])
```

Reenvía el contenido con el modelo/agente/herramientas actuales. No borra los mensajes existentes (genera una respuesta nueva).

## 6. Adjuntos (`FileUpload` + `AttachMenu`)

```
Botón + en Composer → AttachMenu
  · "Add files" → click en input[type=file] oculto
                   → FileList → useFileUpload.processFiles()
                   → attachments[] (FileAttachment {id, name, size, content?, preview?})
  · "System message" → SystemPromptModal
  · "MCP servers" → MCPServersModal
FileUpload muestra chips de adjuntos; X los remueve
Al enviar: ChatView convierte adjuntos a markdown dentro de fullMessage
```

## 7. Starter prompts (hero vacío)

Si `messages.length === 0 && !streaming`, ChatView muestra hero con 4 tarjetas:

1. Analizar arquitectura
2. Automatización & Bash
3. Búsqueda & Depuración
4. Diseño & Experiencia UX

Click → `handleStarterClick(prompt)` → `handleSend(prompt, [])` (flujo normal).

## 8. Micrófono (speech-to-text)

```
useSpeechRecognition (si isSupported)
  · botón Mic en Composer → start/stop
  · transcript → useEffect → setText(transcript)
  · al enviar con listening activo → stop + reset transcript
  · placeholder cambia a "Escuchando... hablá ahora"
```

## 9. Auto-scroll

- Cambio de sesión → scroll `auto` al bottom
- Carga inicial de mensajes (0 → n) → scroll `auto`
- Durante streaming (`currentContent`/`toolCalls` cambian) → scroll `smooth`, salvo que `showScrollBottom` (usuario scrolleó >120px)
- Botón flotante "scroll to bottom" cuando `distanceFromBottom > 120`

## 10. Loading gate

```ts
if (sessionsLoading && messages.length === 0 && !streaming)
  → spinner "Iniciando sesión..."
```

Condición deliberada para no desmontar el chat mientras hay streaming o mensajes (evita remount que rompía el WebSocket).
