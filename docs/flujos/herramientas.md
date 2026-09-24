# Flujo: Herramientas, adjuntos, system prompt y MCP

Archivos:
- `features/chat/components/Composer.tsx`
- `features/chat/components/ToolSelector.tsx`
- `features/chat/components/AttachMenu.tsx`
- `features/chat/components/FileUpload.tsx`
- `features/chat/components/SystemPromptModal.tsx`
- `features/chat/components/MCPServersModal.tsx`

## 1. ToolSelector (wrench)

```
Mount del Composer → fetchTools() → GET /api/tools
  → si hay tools del server → mapea a ToolConfig { name, label: description||name, enabled }
  → catch → DEFAULT_TOOLS (8 tools built-in)

DEFAULT_TOOLS:
  bash, read_file, write_file, edit_file,
  glob_search, grep_search, memorize, search_memories
  (todos enabled=true)

Botón wrench → toggle showToolSelector (cierra AttachMenu)
  → popover con contador "activas/total"
  → click tool → handleToggleTool(name) → enabled flip
  → cierra con click outside (ref)

Al enviar:
  enabledTools = tools.filter(t => t.enabled).map(t => t.name)
  → options.enabledTools → payload WS
```

El botón wrench se resalta (`var(--accent)`) si `activeToolsCount > 0`.

## 2. AttachMenu (plus)

```
Botón + → toggle showAttachMenu (cierra ToolSelector)
  · Add files → cierra menú → click input[type=file] oculto
  · System message → SystemPromptModal
  · MCP servers → MCPServersModal
```

## 3. FileUpload

```
FileList → useFileUpload.processFiles()
  → attachments[]: FileAttachment { id, name, size, content?, preview? }
  · chips con nombre/tamaño; X → filter por id
  · images → preview dataURL (data:image)
  · text/code → content leído

Al enviar, ChatView convierte a markdown:
  imagen  → ![name](preview)
  con content → 📎 **name** (size) + ```ext\ncontent\n```
  sin content → 📎 **name** (size)
fullMessage = attachmentsSummary + "\n\n" + text
```

## 4. SystemPromptModal

```
AttachMenu → "System message"
  → modal con textarea (prompt actual del Composer)
  → onSave(setSystemPrompt)
  → on send: options.systemPrompt → payload WS
```

Default en Composer: system prompt largo en español (comportamiento, herramientas, formato markdown).

## 5. MCPServersModal

```
AttachMenu → "MCP servers"
  → <MCPServersModal onClose={…} />
```

API (`api.ts`):

| Acción | Endpoint |
|--------|----------|
| Listar | `GET /api/mcp/servers` |
| Agregar | `POST /api/mcp/servers` |
| Eliminar | `DELETE /api/mcp/servers/:id` |
| Conectar | `POST /api/mcp/servers/:id/connect` |
| Desconectar | `POST /api/mcp/servers/:id/disconnect` |

`MCPServer`: `{ id, name, transport: stdio|sse|http, command?, args?, url?, status, toolsCount?, errorMessage? }`.

## 6. Micrófono

- `useSpeechRecognition` → `isSupported` muestra botón
- start/stop; `transcript` sincroniza `setText` mientras `listening`
- al enviar con listening → stop + reset
- clase CSS `recording` en el botón

## 7. textarea auto-resize

```
useEffect(text) → height = auto → min(scrollHeight, 200) → max(…, 24)
```

## 8. Envío (resumen de opciones)

```ts
onSend(text, attachments, {
  systemPrompt,      // SystemPromptModal
  enabledTools,      // ToolSelector
  modelSettings,     // ModelSettingsModal
})
// + agent y model los agrega ChatView en handleSend
```
