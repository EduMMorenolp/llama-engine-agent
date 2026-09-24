# Flujo: Sesiones (CRUD, rename, fork, búsqueda, paginación)

Archivos principales:
- `providers/SessionsProvider.tsx`
- `features/sessions/components/SessionList.tsx`
- `features/chat/components/ChatView.tsx` (tabs + export)

## Estado (SessionsProvider)

| Estado | Descripción |
|--------|-------------|
| `sessions` | Lista de sesiones del backend |
| `activeSessionId` | Sesión activa (persistida en `localStorage.active_session_id`) |
| `messages` | Mensajes de la sesión activa |
| `loading` | Carga inicial de lista |
| `hasMore` / `loadingMore` | Paginación de mensajes |
| `messagesLengthRef` | Ref de `messages.length` para no re-disparar fetch |

## 1. Carga inicial (`loadSessions`)

```
mount → loadSessions()
  fetchSessions() → GET /api/sessions
  targetId = activeSessionId válida
             || localStorage.active_session_id válida
             || sessions[0].id
  si targetId:
    setActiveSessionId + persistir localStorage
    si cambió de sesión O messages.length===0:
      fetchSession(targetId, limit=50, offset=0)
      setMessages + setHasMore
```

**Importante:** el effect de mount es `useEffect(..., [])` con biome-ignore para dependencias. `loadSessions` solo depende de `activeSessionId`, **no** de `messages.length` (uso `messagesLengthRef`) — esto evitaba un reload storm que remontaba ChatView.

## 2. Seleccionar sesión (`selectSession`)

```
click en session-item / chat-tab / handleSelectAgent
  → selectSession(id)
      setActiveSessionId + localStorage
      fetchSession(id, 50, 0) → setMessages + setHasMore
```

## 3. Crear sesión (`createNewSession`)

```
Botón "Nueva conversación" / Ctrl+K / tab "+" / handleSend sin sesión / handleSelectAgent
  → POST /api/sessions { name?, model? }
  → prepend a sessions; activar; setMessages([])
  Fallback si backend cae:
    → sesión local con crypto.randomUUID(); misma UI (no persiste en backend)
```

## 4. Eliminar sesión (`removeSession`)

```
Botón Trash en session-item / chat-tab-close / Delete All en Settings
  → DELETE /api/sessions/:id  (warn si falla)
  → removeAgentForSession(id)          // limpia mapping session_agents
  → filtra de sessions
  → si era la activa:
      nextActive = primera restante o null
      si hay next → activar + fetchSession(50,0)
      si no → limpiar localStorage + setMessages([])
```

## 5. Renombrar sesión (`renameSession`)

```
Doble click en session-item o chat-tab → modo edición inline
  Enter / blur → renameSession(id, newName.trim())
  Escape → cancelar
  → update optimista en sessions (name + updatedAt)
  → PATCH /api/sessions/:id { name }  (warn si falla)
```

## 6. Fork (`forkSession`)

```
MessageBubble botón Fork → handleFork(messageId)
  → forkSession(upToMessageId):
      idx = índice del mensaje en messages
      copied = messages.slice(0, idx+1)
      newName = `${active.name} (Fork)` o "Chat Fork"
      createNewSession(newName, active.model)
      setMessages(copied.map(m => ({...m, sessionId: forked.id})))
  → toast success/error
```

Nota: los mensajes copiados solo viven en estado local; el backend no recibe un endpoint de fork (el nuevo chat se puebla al enviar el siguiente mensaje).

## 7. Búsqueda (solo cliente)

```
input "Buscar en el historial..."
  → searchQuery
  → filteredSessions = sessions.filter(name o id incluye query, case-insensitive)
  → empty state: "No se encontraron coincidencias" / "Sin conversaciones aún"
```

## 8. Paginación de mensajes (`loadMoreMessages`)

```
scroll al top de messages-container (scrollTop < 100) y hasMore y !loadingMore
  → fetchSession(activeSessionId, 50, messages.length)
  → prepend: [...older, ...prev]
  → compensación de scroll: nuevoScrollTop = nuevaHeight - prevHeight
Indicador: "Cargando más mensajes..." con spinner
```

## 9. Tabs de chat en navbar (ChatView)

- Muestra hasta `sessions.slice(0, 4)` como chips
- Click → `selectSession`; doble click → rename inline; X → `removeSession`
- Botón `+` → `createNewSession`

## 10. Exportar sesión (navbar derecho)

```
Botón Download → menú
  Markdown → blob text/markdown, headers "### 👤 Usuario" / "### 🤖 Asistente", filename slug.md
  JSON     → { session, messages }, filename slug.json
  Sin mensajes → toast info "No hay mensajes para exportar"
  Éxito → toast success
```

## Mutadores de mensajes

| Función | Uso |
|---------|-----|
| `addMessage` | Agrega al final (envío user / done assistant) |
| `updateLastMessage` | Reemplaza contenido del último assistant (disponible, poco usado) |
| `deleteMessage` | Filtra por id (solo local) |
| `setMessages` | Setter crudo (fork) |
