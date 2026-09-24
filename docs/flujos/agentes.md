# Flujo: Agentes (sidebar tabs + sesión por agente)

Archivos principales:
- `features/sessions/components/SessionList.tsx`
- `lib/session-agents.ts`
- `features/chat/components/ChatView.tsx` (envío con `agent`)
- `features/chat/hooks/useChat.ts` (payload `agent`)
- `features/chat/components/SettingsModal.tsx` (tab Agentes)

## 1. Tabs del sidebar

Debajo de `.sidebar-header` hay dos tabs:

| Tab | Contenido |
|-----|-----------|
| **Chat** | Nueva conversación, búsqueda, lista de sesiones |
| **Agentes** | Lista de agentes + input para crear |

```ts
const [sidebarTab, setSidebarTab] = useState<"chat" | "agents">("chat");
```

- Al montar en `"agents"` → `fetchAgents()` → `GET /api/agents`
- Cambiar a `"chat"` muestra la lista de sesiones habitual (sin cambios respecto al flujo original)

## 2. Mapping sesión ↔ agente (localStorage)

`lib/session-agents.ts` — key `session_agents`, valor `Record<sessionId, agentName>`:

| Función | Comportamiento |
|---------|----------------|
| `getAgentSessionMap()` | Parsea JSON, `{}` si falla |
| `setAgentForSession(sessionId, agent)` | Escribe entrada |
| `getAgentForSession(sessionId)` | Lee entrada (null si no existe) |
| `findSessionIdForAgent(agent)` | Primera sesión mapeada a ese agente |
| `removeAgentForSession(sessionId)` | Borra entrada (al eliminar sesión) |

**Por qué localStorage y no DB:** AGENTS.md pide preguntar antes de migrar el schema; el mapping es preferencia de UI y no requiere migración.

## 3. Seleccionar agente → chat (`handleSelectAgent`)

```
Click en item de la tab Agentes
  → handleSelectAgent(agentName)
      1. sessionId = findSessionIdForAgent(agentName)
      2. si existe pero ya no está en sessions → removeAgentForSession (limpia stale)
      3. si no hay sesión → busca sessions.find(name === agentName)
      4. si aún no → createNewSession(agentName)     // sesión con nombre del agente
      5. setAgentForSession(sessionId, agentName)
      6. await selectSession(sessionId)              // carga mensajes
      7. setSidebarTab("chat")                      // vuelve a la tab Chat
```

Resultado: cada agente "es" un chat. La sesión activa queda mapeada; al enviar mensajes, ChatView adjunta ese agente.

## 4. Envío con agente

```
ChatView.handleSend:
  agent: getAgentForSession(sessionId) ?? undefined
    ↓
useChat sendMessage → payload WS { …, agent }
    ↓
backend ws.ts acepta `agent`, lo usa como sub-agente y adjunta
  `_subAgent` a los eventos (message/tool_start/tool_end/done)
    ↓
useChat captura _subAgent en local en el primer chunk
    ↓
al emitir la burbuja final en "done": _subAgent en el Message
    ↓
MessageBubble muestra badge junto al modelo:
  <span class="sub-agent-badge">✨ {message._subAgent}</span>
```

## 5. Crear agente desde el sidebar

```
Tab Agentes → input "Nombre del agente" + botón "Crear agente"
  · Enter o click (deshabilitado si nombre vacío)
  → createAgent({ name })  → POST /api/agents
  → setAgents([...prev, agent]); limpia input
  · error → noop (silencioso)
```

## 6. Crear agente desde Settings

`SettingsModal` → tab **Agentes**:

- Lista agentes (`fetchAgents` al montar)
- Form "Nuevo Agente": nombre + botón Crear
- **Nota:** esta versión agrega el agente solo al estado local de la lista (no llama `createAgent`); para persistirlo usar el sidebar (que sí hace POST). Diferencia conocida.

## 7. Eliminar sesión de un agente

```
removeSession(id)
  → removeAgentForSession(id)   // borra del map
  → siguiente click en el agente
      → findSessionIdForAgent → null/stale → limpia
      → crea sesión nueva con el nombre del agente
```

Ciclo completo: eliminar el chat del agente no borra el agente; la próxima selección recrea la sesión.

## 8. Agentes por defecto

Migración backend `005-agents-skills.sql` crea `coder`, `researcher`, `reviewer` (personalizables). El frontend solo lee `GET /api/agents`.

## API usada

| Acción | Endpoint |
|--------|----------|
| Listar | `GET /api/agents` |
| Crear | `POST /api/agents` |
| Actualizar | `PATCH /api/agents/:name` |
| Eliminar | `DELETE /api/agents/:name` |
| Obtener | `GET /api/agents/:name` |
