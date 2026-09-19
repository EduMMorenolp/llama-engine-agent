# Rules — llama-engine-agent

## Code Style

### Linter y Formatter

- **Herramienta:** Biome (config en `biome.json` de cada paquete)
- **Indentación:** Tabs
- **Strings:** Double quotes
- **Semicolons:** Siempre
- **Line width:** 100

### Comandos

| Acción | engine-agent | engine-ui-agent |
|--------|-------------|-----------------|
| Lint | `npm run lint` | `npm run lint` |
| Formatear | `npm run format` | — |
| Fix todo | `npm run check` | — |

---

## TypeScript

- **Target:** ES2022
- **Strict mode:** Siempre
- **Module:** ESM (`"type": "module"` en package.json)
- **Backend resolution:** NodeNext
- **Frontend resolution:** ESNext + bundler
- **JSX transform:** react-jsx (frontend)
- **No `any`** sin justificación explícita

---

## Backend — Convenciones

### Estructura de módulos

Cada módulo sigue el patrón:

```
modules/<nombre>/
  dto.ts        # Tipos + schemas Zod
  service.ts    # Lógica de negocio
  store.ts      # Acceso a datos (si aplica)
  handler.ts    # Controller HTTP (si aplica)
```

### Validación

- **Siempre** usar Zod para validar inputs en endpoints.
- Los DTOs viven en `modules/*/dto.ts`.
- Nunca skippear la validación.

### Errores

- Usar las excepciones HTTP de `common/`.
- Nunca hacer fetch de datos sin try/catch.

### Env vars

- Validadas con Zod en `config/index.ts`.
- Nunca hardcodear secrets en código fuente.

---

## Frontend — Convenciones

### Arquitectura

- Feature-based: `features/<nombre>/components/`
- Providers para estado global (Context + hooks).
- Sin lib de estado externa (Redux, Zustand, etc.).

### Componentes

- Functional components solamente.
- Un componente por archivo.
- Naming: PascalCase (`ChatView.tsx`, `MessageBubble.tsx`).

---

## Testing

| Paquete | Framework | Entorno | Comando |
|---------|-----------|---------|---------|
| engine-agent | Vitest | node | `npm test` |
| engine-ui-agent | Vitest | jsdom | `npm test` |

### Reglas

- Tests en archivos `*.test.ts` o `*.test.tsx` junto al código.
- Cobertura mínima: agent loop, tools, sessions, memories, middleware.
- No mocking excesivo — testear comportamiento real cuando sea posible.

---

## Git

- **Mensajes:** Descriptivos, en inglés.
- **No hay auto-commit** — commitear manualmente.
- **No commitear:** secrets, `.env`, `node_modules/`, `dist/`.
- **Pre-commit:** Correr `npm run lint` y `npm test`.

---

## Reglas para agentes

**Siempre:**
- Correr `npm run lint` antes de commitear.
- Correr `npm test` para verificar que no se rompió nada.
- Usar Zod para validar inputs en el backend.
- Mantener módulos separados: controller → service → store/db.

**Preguntar primero:**
- Agregar nuevas dependencias runtime.
- Cambiar el schema de la DB (migraciones).
- Modificar el protocolo WebSocket.
- Agregar nuevos endpoints públicos.

**Nunca:**
- Hardcodear secrets en código fuente.
- Hacer fetch de datos sin try/catch.
- Usar `any` sin justificación.
- Saltar la validación de Zod en endpoints.
