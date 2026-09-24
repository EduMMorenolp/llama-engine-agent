# Flujo: Sidebar y layout

Archivos:
- `components/layout/Layout.tsx`
- `features/sessions/components/SessionList.tsx`
- `App.tsx` (providers + router)

## 1. Layout

```
<div class="layout">
  <aside class="sidebar [collapsed]">
    <SessionList onToggleSidebar isSidebarOpen />
  </aside>
  <button class="sidebar-overlay" onClick=cerrar />   // cierra en mobile
  <main class="main">
    <Outlet context={{ sidebarOpen, toggleSidebar }} />
  </main>
</div>
```

- `sidebarOpen` inicia `true` (estado local de Layout)
- `toggleSidebar` invierte el flag → clase `collapsed`
- ChatView consume `useOutletContext` para mostrar botón de reabrir cuando está colapsado
- Overlay clickeable cierra el sidebar

## 2. Estructura del sidebar (SessionList)

```
.sidebar-content
  .sidebar-header          logo "Llama Engine / Agent Studio" + botón ocultar
  .sidebar-tabs            [Chat] [Agentes]          ← dos tabs
  (si chat)
    .sidebar-actions       botón "Nueva conversación" (Ctrl K) + search
    .sidebar-sessions-container
      título "Conversaciones Recientes"
      lista filteredSessions → session-item
  (si agents)
    .sidebar-sessions-container
      título "Agentes"
      lista agents → item con Sparkles
      .sidebar-new-agent    input + botón "Crear agente"
  .sidebar-footer          status "Engine v0.1.0" + botón Settings
  SettingsModal (condicional)
```

## 3. session-item (tab Chat)

- **Click** → `selectSession(id)`
- **Doble click** → modo rename inline (input + ✓ + ✕; Enter guarda, Esc cancela)
- **Hover acciones**: Edit (rename) · Trash (`removeSession`)
- Clase `active` si `session.id === activeSessionId`
- DisplayName: `session.name || "Chat " + id.slice(0,6)`

## 4. session-item (tab Agentes)

- **Click** → `handleSelectAgent(agent.name)` (ver `agentes.md`)
- Icono Sparkles; resalta si la sesión mapeada es la activa

## 5. Búsqueda

- Input con SearchIcon; filtra por `name ?? id` case-insensitive (solo cliente)

## 6. Atajos globales

| Shortcut | Acción |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | `createNewSession()` (registrado en SessionList mount) |

## 7. Footer

- Dot de conexión + texto "Engine v0.1.0" (hardcoded; no lee health real en esta versión)
- Botón Settings → `setShowSettings(true)` → modal

## 8. Providers (App.tsx)

```
<ToastProvider>
  <SessionsProvider>
    <Router> → Layout → ChatView
  </SessionsProvider>
</ToastProvider>
```

`ToastProvider`: cola de toasts, auto-remove 3s, click para cerrar; tipos `success | error | info | warning`.

## 9. CSS relevante (`src/index.css`)

- `.sidebar-tabs`, `.sidebar-tab`, `.sidebar-tab.active`
- `.sidebar-new-agent`
- `.session-item`, `.session-item.active`, `.session-item-main`, `.session-item-actions`
- `.sidebar.collapsed`, `.sidebar-overlay`
- `.chat-tab-chip`, `.chat-tab-close` (tabs en navbar)
