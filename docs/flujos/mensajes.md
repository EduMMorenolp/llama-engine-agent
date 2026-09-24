# Flujo: Render de mensajes (MessageBubble)

Archivo: `features/chat/components/MessageBubble.tsx`

## Props

| Prop | Tipo | Uso |
|------|------|-----|
| `message` | `Message` | id, role, content, toolCalls, _subAgent |
| `toolCalls` | `ToolCallInfo[]` | tool cards en vivo (streaming) |
| `isStreaming` | `boolean` | cursor de streaming |
| `modelName` | `string` | pill del modelo en el footer |
| `onCopy` / `onEdit` / `onReload` / `onFork` / `onDelete` | callbacks | barra de acciones |

Roles: `user` | `assistant` | `tool`. Si `role === "tool"` → **retorna null** (no se renderiza).

## 1. Thinking / reasoning (`parseThinking`)

- Regex extrae contenido entre `<think>…</think>` (o hasta EOF si no hay cierre)
- Múltiples bloques se unen con `\n\n`
- El resto (`rest`) es el contenido visible
- Si hay thinking → contenedor colapsable "Reasoning" (Lightbulb) con `thinkingOpen`

## 2. Métricas (header)

Estimación local (no del backend):

```
cleanContent = displayContent sin data:image base64
tokenCount = max(1, round(len/3.8) + (imagen? 320 : 0))
durationSeconds = tokenCount / (user? 600 : 45)
tokensPerSecond = user ? "662.66" : tokenCount / max(0.2, duration)
```

Pills: tokens · duración (s) · velocidad (t/s).

## 3. Tool call cards

- Viene de prop `toolCalls` o de `message.toolCalls` parseado de JSON string
- Cada card: icono Terminal + nombre + args truncados (75 chars) + status
  - `pending` → "Ejecutando..." (warning)
  - `done` → check verde
  - `error` → X roja
- Normalización: `getToolName` (`tc.name || tc.function?.name`), `formatToolArgs` (obj → JSON, string directo)

## 4. Contenido markdown

`ReactMarkdown` + `remarkGfm` + custom components:

| Elemento | Comportamiento |
|----------|----------------|
| `p` | div `.markdown-paragraph` |
| `img` | botón que abre en nueva pestaña + nombre del adjunto |
| `code` con language | wrapper con header (lang + botón Copiar) + `SyntaxHighlighter` oneDark, fondo `#0d1017` |
| `code` inline | `.inline-code` |
| `a` | `target="_blank" rel="noopener noreferrer"` |
| `table` | wrapper scroll `.table-wrapper` |

`CodeCopyButton`: clipboard + estado "Copiado" 2s.

Durante streaming: `streaming-cursor` al final del markdown; si no hay content ni thinking ni tools → solo el cursor.

## 5. Footer / barra de acciones

- Pill del modelo (`⬡ {modelName}`)
- Badge del sub-agente si `message._subAgent`: `.sub-agent-badge` con Sparkles + nombre
- Acciones (cluster):
  - **Copy** — limpia dataURLs de imágenes (`[Imagen: alt]`), clipboard, estado 2s
  - **Edit** — solo `isUser && onEdit`
  - **Reload** — "Reenviar" (user) / "Regenerar" (assistant)
  - **Fork** — bifurca desde este mensaje
  - **Delete** — rojo al hover

## 6. Avatar

- user → `UserIcon`
- assistant → `logo.jpg` (`.assistant-avatar-img`)

## Streaming (burbuja temporal)

ChatView renderiza una `MessageBubble` extra con `id:"streaming"` mientras `streaming && (currentContent || toolCalls.length)`:

```ts
message={{ id:"streaming", role:"assistant", content: currentContent, … }}
toolCalls={toolCalls}
isStreaming
```

Al `done` de `useChat`, esta burbuja desaparece y se agrega el `Message` definitivo (una sola burbuja con todo el historial de tools).
