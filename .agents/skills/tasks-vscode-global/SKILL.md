---
name: tasks-vscode-global
description: 'Crea y edita .vscode/tasks.json SOLO para levantar los servicios del proyecto en modo dev desde VS Code (monorepo: una task por servicio, agregadores por grupo y ALL). Use when the user wants to start the project services from VS Code, add or fix a service task, or turn several services on at once. Triggers: "tasks.json", "tarea de vscode", "levantar servicios", "npm run dev", "dev server", "correr backend y frontend", "agregar servicio", "task ALL", "encender todo", "isBackground".'
---

# Tasks de VS Code — un tasks.json solo para levantar servicios en modo dev

**Regla:** formato de casa: una task por servicio (`npm run dev` en su carpeta, con
`powershell -NoExit`, `isBackground` y panel propio) y agregadores que los encienden en
paralelo con `dependsOn`. Sin `&&`, sin rutas absolutas, sin comentarios JSONC — el
archivo se valida con Node.

## Cuándo usarla

- Piden "levantar los servicios desde VS Code", "una task para correr el backend y el
  frontend" o "task que levante todo" (monorepo con varios `npm run dev`).
- Agregar un servicio nuevo a `.vscode/tasks.json` o arreglar tasks existentes.
- Encender un grupo de apps o el repo completo de una (agregadores `GRUPO` y `ALL`).

## Checklist de ejecución

1. **Leer antes**: si existe `.vscode/tasks.json`, leerlo entero y respetar `version`,
   labels y estilo. **Descubrir los servicios reales del repo**: carpetas con
   `package.json` cuyo script `dev` exista — labels y `cwd` salen de ese inventario,
   nunca se inventan nombres.
2. **Una task por servicio** con el formato de casa (el porqué de cada campo):
   - `label`: emoji fijo por app/rol + **nombre real del servicio**
     (`🔧 <app> Backend`, `🎨 <app> Frontend`). El label es el ID que referencian los
     agregadores: no se renombra después (rompe los `dependsOn`).
   - `type: "shell"`, `command: "powershell"`, `args: ["-NoExit", "-Command", "npm run dev"]`
     — `-NoExit` mantiene la terminal viva para ver el log del server.
   - `options.cwd: "${workspaceFolder}/<carpeta-del-servicio>"` — relativa al workspace,
     jamás una ruta absoluta de una PC.
   - `isBackground: true` — el server nunca termina; sin esto VS Code lo da por
     terminado y los agregadores se comportan mal.
   - `problemMatcher: []` explícito — un dev server no emite errores parseables acá.
   - `presentation`: `reveal: "always"` (mostrar logs), `panel: "new"` (un panel por
     servicio: en uno compartido los servers se pisan los logs), `focus: false` (no roba
     el foco del editor), `clear: true` (arranca con buffer limpio).
3. **Agregadores**: uno por app y un `ALL` final. Sin `command`/`type`: solo `dependsOn`
   (con los labels exactos) + `dependsOrder: "parallel"` + `problemMatcher: []`.
   Jerarquía: servicios → grupo → `ALL`, máximo 2 niveles.
4. **Multi-SO**: `powershell` es Windows. Si el equipo es mixto, bloques `linux`/`osx`
   con `command: "bash"` y `args: ["-c", "npm run dev"]` — nunca duplicar la task entera.
5. **Plantilla concreta** — el formato de casa; reemplazar apps/carpetas por los
   servicios reales descubiertos en el paso 1:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "🔧 App1 Backend",
      "type": "shell",
      "command": "powershell",
      "args": ["-NoExit", "-Command", "npm run dev"],
      "options": { "cwd": "${workspaceFolder}/app1-back" },
      "isBackground": true,
      "problemMatcher": [],
      "presentation": { "reveal": "always", "panel": "new", "focus": false, "clear": true }
    },
    {
      "label": "🎨 App1 Frontend",
      "type": "shell",
      "command": "powershell",
      "args": ["-NoExit", "-Command", "npm run dev"],
      "options": { "cwd": "${workspaceFolder}/app1-front" },
      "isBackground": true,
      "problemMatcher": [],
      "presentation": { "reveal": "always", "panel": "new", "focus": false, "clear": true }
    },
    {
      "label": "⚙️ App2 Backend",
      "type": "shell",
      "command": "powershell",
      "args": ["-NoExit", "-Command", "npm run dev"],
      "options": { "cwd": "${workspaceFolder}/app2-back" },
      "isBackground": true,
      "problemMatcher": [],
      "presentation": { "reveal": "always", "panel": "new", "focus": false, "clear": true }
    },
    {
      "label": "💻 App2 Frontend",
      "type": "shell",
      "command": "powershell",
      "args": ["-NoExit", "-Command", "npm run dev"],
      "options": { "cwd": "${workspaceFolder}/app2-front" },
      "isBackground": true,
      "problemMatcher": [],
      "presentation": { "reveal": "always", "panel": "new", "focus": false, "clear": true }
    },
    {
      "label": "APP1",
      "dependsOn": ["🔧 App1 Backend", "🎨 App1 Frontend"],
      "dependsOrder": "parallel",
      "problemMatcher": []
    },
    {
      "label": "APP2",
      "dependsOn": ["⚙️ App2 Backend", "💻 App2 Frontend"],
      "dependsOrder": "parallel",
      "problemMatcher": []
    },
    {
      "label": "ALL",
      "dependsOn": ["APP1", "APP2"],
      "dependsOrder": "parallel",
      "problemMatcher": []
    }
  ]
}
```

6. **Verificación (obligatoria)**:

```bash
# JSON válido y sin comentarios (falla con JSONC)
node -e "JSON.parse(require('fs').readFileSync('.vscode/tasks.json','utf8'));console.log('ok')"
# version presente (1) y señales del formato de casa (deben ser >0)
rg -c '\x22version\x22:\s*\x222\.0\.0\x22' .vscode/tasks.json
rg -c 'isBackground' .vscode/tasks.json
rg -c 'NoExit' .vscode/tasks.json
# rutas absolutas, && y secretos (deben dar 0)
rg -c -e '[A-Za-z]:[/\\]' -e '/Users/' -e '/home/' .vscode/tasks.json
rg -c '&&' .vscode/tasks.json
rg -c -i -e 'password' -e 'secret' -e 'token' .vscode/tasks.json
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Rutas absolutas de una PC | `rg -c -e '[A-Za-z]:[/\\]' -e '/Users/' -e '/home/' .vscode/tasks.json` → >0 |
| Comentarios JSONC (VS Code los tolera, `JSON.parse` no) | `node -e "JSON.parse(...)"` → error |
| `&&` encadenando servicios en vez de agregador | `rg -c '&&' .vscode/tasks.json` → >0 |
| Servicio dev sin `isBackground` (VS Code lo da por terminado) | `rg -c 'isBackground' .vscode/tasks.json` → 0 con servicios |
| Terminal que muere: servicio sin `-NoExit` (perdés el log) | `rg -c 'NoExit' .vscode/tasks.json` → 0 con servicios |
| Servicios compartiendo panel (se pisan los logs) | `rg -c 'panel' .vscode/tasks.json` < `rg -c 'isBackground' .vscode/tasks.json` |
| Agregador apuntando a un label inexistente | `rg -c 'dependsOn' .vscode/tasks.json` vs los `label` del archivo |
| Sin `"version": "2.0.0"` | `rg -c '2\.0\.0' .vscode/tasks.json` → 0 |
| Secretos embebidos en la task | `rg -c -i -e 'password' -e 'secret' -e 'token' .vscode/tasks.json` → >0 |

## Solapamiento

- `changelog-global` — sumar un servicio a las tasks o cambiar cómo se levanta altera
  el workflow del equipo: se registra en el `CHANGELOG.md` del proyecto (Maintenance).
