---
name: next-arquitectura-frontend
description: 'App Router structure for Next.js: app/ tree, server components by default, minimal use client, route groups and layer rules. Use when creating a new Next project, deciding where a page/layout/component goes, or when imports cross segments or too many files are client components. Triggers: "estructura del frontend", "por feature", "arquitectura frontend", "organizar componentes", "prop drilling", "diseno de componentes", "donde guarda el estado", "app router", "estructura de app", "route groups", "server components".'
---

# Arquitectura Frontend Next — `app/` por segmentos, server por defecto

**Regla:** la estructura sigue el **árbol de rutas** (`app/`), todo es Server Component
hasta que una hoja justifique `'use client'`, y **cero lógica de negocio en la UI**.

## Cuándo usarla

- Proyecto Next nuevo: definir la estructura desde el inicio.
- Crear un archivo (page, layout, componente, action) y decidir dónde va.
- Demasiados `'use client'` o imports cruzados entre segmentos.
- Revisión de arquitectura antes de merge.

## Checklist de ejecución

### 1. Árbol canónico

```
app/                      # una carpeta = un segmento de ruta
├── layout.tsx            # raíz: providers, shell, metadata global
├── page.tsx              # home
├── (marketing)/          # route group: agrupa sin afectar la URL
│   ├── layout.tsx
│   └── pricing/page.tsx
├── (app)/dashboard/…     # grupo privado
├── loading.tsx           # fallback scoped al segmento
├── error.tsx             # boundary scoped al segmento
└── api/<recurso>/route.ts
components/               # componentes compartidos (server por defecto)
lib/                      # helpers, clientes, fetchers puros (sin JSX)
hooks/                    # hooks de cliente
actions/                  # server actions por feature
styles/                   # tokens (globals.css) + utilities
```

### 2. Tabla de dependencias: qué importa qué

| Capa | Contenido | Puede importar | NO puede importar |
|---|---|---|---|
| `app/**/page.tsx` | composición de la ruta | components, lib, actions | otros pages, hooks de cliente directo |
| `app/**/layout.tsx` | shell del segmento | components, providers | lógica de negocio |
| `components/` (server) | UI pura | lib, otros components | hooks de cliente, `localStorage` |
| `components/` (client) | estado/eventos/browser APIs | hooks, lib | fetch directo a la API |
| `lib/` | fetchers, helpers, parsers | — | React, components |
| `actions/` | mutaciones server-side | lib, db/data-access | components |

Reglas derivadas:

- **Server Components por defecto:** `'use client'` solo en la hoja mínima que necesita
  estado, eventos o browser APIs; el server pasa datos **serializables** a las islas
  cliente vía props (composition pattern), nunca un objeto de la BD entero.
- **`lib/` es la capa de datos:** los fetchers viven ahí (ver `next-data-fetching-frontend`);
  las pages los llaman, no hacen `fetch` inline.
- **Sin imports entre route groups**: `(marketing)` no importa de `(app)`; lo compartido baja
  a `components/`.

### 3. Ubicación de cada artefacto

| Artefacto | Vive en |
|---|---|
| Ruta pública | `app/<segmento>/page.tsx` |
| Layout compartido por varias rutas | route group `app/(grupo)/layout.tsx` |
| Componente usado por una sola ruta | junto a la ruta: `app/<ruta>/<componente>.tsx` |
| Componente reutilizado en ≥2 rutas | `components/<area>/<Componente>/` |
| Server action de una feature | `actions/<feature>.ts` |
| Fetcher/helper sin JSX | `lib/<modulo>.ts` |
| Hook de cliente | `hooks/<feature>.ts` |

### 4. Componentes: diseño y estado

- **Colocación por componente**: carpeta con todo lo suyo (`Componente.tsx`,
  `Componente.test.tsx`, `types.ts`, `use-<componente>.ts` si el estado es complejo).
- **Composición > configuración**: `children`/props mínimas antes que 8 props de variante
  (`headerVariant`, `content=`): cada prop es una rama de render que hay que testear.
- **Escala de decisión de estado** — la más simple que alcanza:

| Estado | Vive en |
|---|---|
| URL (página, filtros, sort) | `searchParams` (son `Promise` en Next 15+: **await** siempre) |
| Remoto con caché del servidor | fetch en Server Component con estrategia explícita |
| Local de una isla cliente | `useState` en el componente `'use client'` |
| Compartido entre islas hermanas | lifting o contexto de cliente |
| Theme/locale | cookie + `next-themes`-style, leído en el server |

- **Prop drilling ≤ 3 niveles**: 4+ es deuda; subir a contexto o reestructurar.

### 5. Verificación (obligatoria)

```bash
# archivos cliente: cada uno debe justificar estado/eventos/browser API
rg -l "'use client'" app/ components/
# params/searchParams destructurados en crudo (Next 15+: son Promise)
rg "const \{ *(params|searchParams) *\} *(await )?props|params\.[a-z]" app/ -g '!*.test.*'
# fetch inline en pages/components (debería pasar por lib/)
rg "fetch\(" app/ components/ -g '!**/api/**'
# imports entre route groups (composición ilegal)
rg "from ['\"]@?/?.*\(app\)|from ['\"]\.\./\.\./\(" app/
# estructura
ls app/
```

Cero matches o justificación explícita por archivo.

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| `'use client'` en el `page.tsx` completo cuando un botón lo bastaba | `rg -l "'use client'" app/` → páginas enteras |
| Datos del servidor copiados a un store de cliente (duplicado) | `rg "useEffect.*fetch|setState" app/ components/` |
| `fetch` inline en pages/components | `rg "fetch\(" app/ components/` |
| Route groups importándose entre sí | `rg "from ['\"].*\(" app/` |
| `params`/`searchParams` sin await (Next 15+) | `rg "params\.[a-z]" app/` sin `await` |
| Componentes globales de un solo uso acumulados | `components/` sin subcarpetas y en crecimiento |
| Lógica de negocio (reglas, permisos) en la UI | reglas que pertenecen al backend |
| Props de 4+ niveles | heurística: `=\s*\w+\.\w+\.\w+\.\w+` |

## Solapamiento

- **Base de las hermanas Next:** `next-data-fetching-frontend`, `next-auth-frontend`,
  `next-formularios-frontend`, `next-estados-toast-frontend` y `next-ui-bloques-frontend`
  asumen este árbol; ésta lo define y audita.
- `vite-arquitectura-frontend` — el mismo diseño para SPA Vite/React Router; esta skill es la
  que aplica en proyectos Next.js.
- `next-config-env-frontend` — dónde vive la config y qué variables son server-only.
- `next-accesibilidad-frontend` — audita teclado/ARIA/responsive sobre este árbol.
