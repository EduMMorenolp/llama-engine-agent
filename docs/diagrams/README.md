# Diagrams — llama-engine-agent

Diagramas interactivos generados con [Archify](https://github.com/tt-a1i/archify). Cada diagrama es un HTML standalone con themes oscuro/claro, pan/zoom, búsqueda y exportación.

## Diagramas

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `architecture.html` | Architecture | Componentes del sistema: frontend, backend, agent, LLM, tools, DB |
| `agent-sequence.html` | Sequence | Flujo del agente: usuario → backend → LLM → tools → respuesta |
| `agent-workflow.html` | Workflow | Proceso iterativo de tool calls (loop de 10 iteraciones) |
| `dataflow.html` | Dataflow | Flujo de datos: sessions → messages → memories → LLM context |
| `session-lifecycle.html` | Lifecycle | Estados de sesión: creating → active → processing |

## Especificaciones JSON

Los archivos `.json` son las especificaciones tipadas que Archify renderiza a HTML. Para modificar un diagrama:

1. Editar el archivo `.json` correspondiente
2. Validar: `node ../_Config/.opencode/skills/archify/bin/archify.mjs validate <type> <file>.json --quality showcase`
3. Renderizar: `node ../_Config/.opencode/skills/archify/bin/archify.mjs deliver <type> <file>.json <file>.html --quality showcase`

## Comandos npm

Desde `engine-agent/`:

```bash
# Validar todos los diagramas
npm run diagrams:validate -- architecture ../docs/diagrams/architecture.json --quality showcase
npm run diagrams:validate -- sequence ../docs/diagrams/agent-sequence.json --quality showcase
npm run diagrams:validate -- workflow ../docs/diagrams/agent-workflow.json --quality showcase
npm run diagrams:validate -- dataflow ../docs/diagrams/dataflow.json --quality showcase
npm run diagrams:validate -- lifecycle ../docs/diagrams/session-lifecycle.json --quality showcase

# Renderizar todos los diagramas
npm run diagrams:build -- architecture ../docs/diagrams/architecture.json ../docs/diagrams/architecture.html --quality showcase
npm run diagrams:build -- sequence ../docs/diagrams/agent-sequence.json ../docs/diagrams/agent-sequence.html --quality showcase
npm run diagrams:build -- workflow ../docs/diagrams/agent-workflow.json ../docs/diagrams/agent-workflow.html --quality showcase
npm run diagrams:build -- dataflow ../docs/diagrams/dataflow.json ../docs/diagrams/dataflow.html --quality showcase
npm run diagrams:build -- lifecycle ../docs/diagrams/session-lifecycle.json ../docs/diagrams/session-lifecycle.html --quality showcase
```

## Quality Profiles

- `showcase`: Máxima calidad, ideal para documentación y presentaciones
- `standard`: Versión más ligera, válida pero menos pulida

## Requisitos

- Node.js >= 18
- Archify skill instalada en `_Config/.opencode/skills/archify/`
