# Flujo: Configuración (SettingsModal)

Archivo: `features/chat/components/SettingsModal.tsx`

Se abre desde el footer del sidebar (ícono Settings) o, en ChatView, desde `showSettings` (estado existe pero el trigger visible es el sidebar).

## Estructura

- Render con `createPortal` a `document.body`
- Backdrop clickeable cierra el modal
- Layout: sidebar de navegación izquierda + área de contenido
- **Exactamente 2 tabs** (requisito): `chat` | `agents`
- Footer fijo: `Reset to default` | `Save settings`

```ts
type TabType = "chat" | "agents";
```

## Tab Chat

### General Preferences
| Toggle | Default | Persistencia |
|--------|---------|--------------|
| Auto-scroll to latest message | true | `llama_engine_settings` |
| Stream responses in real-time | true | `llama_engine_settings` |

### Display & Performance
| Toggle | Default |
|--------|---------|
| Show token metrics & speed | true |
| Expand Reasoning by default | true |

### Inference Parameters (sliders)
| Param | Min | Max | Step | Default |
|-------|-----|-----|------|---------|
| Temperature | 0 | 2 | 0.05 | 0.7 |
| Top-P | 0 | 1 | 0.05 | 0.9 |
| Repeat Penalty | 1 | 2 | 0.05 | 1.1 |

(Top-K aparece en estado pero el slider visible en esta versión es temperature/topP/repeatPenalty.)

### Agent Engine Settings
- Toggle "Herramientas Autónomas Habilitadas" (defaultChecked, no persiste en el objeto save)

### Endpoints & Debug
- `apiUrl` (Agent Service URL, default `http://localhost:3060`)
- `engineUrl` (Llama Engine API URL, default `http://localhost:3050`)

### Conversaciones
| Acción | Comportamiento |
|--------|----------------|
| **Export** | JSON de `sessions` → blob `llama-engine-conversations-YYYY-MM-DD.json` |
| **Import** | lee `.json/.jsonl`; si es array → toast success + `loadSessions()`; si no → toast error de formato |
| **Delete All** | `window.confirm` → itera `removeSession` por cada sesión → toast → `loadSessions()` |

## Tab Agentes

- `fetchAgents()` al montar el modal
- Lista `{name, description}` por cada agente
- Form "Nuevo Agente": input nombre + botón Crear
  - Agrega a `agents` local + toast success
  - **No** llama `createAgent()` en esta versión (solo estado local)

## Save / Reset

```
Save settings
  → localStorage.setItem("llama_engine_settings", JSON.stringify({...todos los campos}))
  → toast success "Configuración guardada correctamente"
  → onClose()

Reset to default
  → resetea todos los useState a defaults
  → localStorage.removeItem("llama_engine_settings")
  → toast info "Valores restaurados por defecto"
```

Nota: los settings guardados no se leen al abrir el modal en el mount actual (solo se escriben/borrar); la lectura inicial desde localStorage no está implementada en esta versión.

## APIs relacionadas

- Agentes: `GET /api/agents` (`fetchAgents`)
- Sesiones (export/import/delete): `useSessions` → `fetchSessions`, `removeSession`
