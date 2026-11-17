---
name: next-ui-bloques-frontend
description: 'Next.js transversal UI blocks: pagination synced to searchParams, design tokens/theme in globals.css, design-system adherence (anti AI-aesthetic), Intl helpers and accessible info modal. Use when adding lists, theming, date/currency formatting or help/changelog UI in a Next project. Triggers: "paginacion", "scroll infinito", "design tokens", "tema oscuro", "formato de fechas", "moneda", "changelog en la app", "manual de uso", "modal de informacion", "design system", "espaciado", "tipografia", "aesthetic", "searchparams".'
---

# UI Bloques Next — `searchParams` como estado, tokens como única fuente de verdad

**Regla:** paginación con estado en la URL (leída en el server), tokens como única fuente de
verdad, formateo `Intl` central y el icono "i" con changelog + manual — implementados
**una vez**, reutilizados.

## Cuándo usarla

- Crear un listado multi-página o scroll infinito.
- Agregar colores/tema o detectar valores hardcodeados.
- Formatear fechas/dinero/números en varias pantallas.
- Agregar changelog o manual dentro de la app.

## Checklist de ejecución

### 1. Paginación / scroll

- Listados: **paginación** (`< 1 2 3 >`) o scroll infinito **consistente** (uno por app);
  scroll infinito solo si el backend soporta offset/contador.
- **Estado de página en la URL** (`?page=`), leído en el server:
  `searchParams` es `Promise` en Next 15+ → `const { page } = await searchParams;`.
  Compartible y sobrevive al reload; los links de paginación son `<Link href={{ pathname, query }}>`.
- **Resultado anunciado**: región `aria-live="polite"` con el resumen ("12 resultados, página
  2 de 5") — al cambiar de página/filtrar, los lectores de pantalla se enteran sin mover el
  foco.

### 2. Design tokens + tema

- Tokens (color, spacing, typography, radius, shadow) como variables CSS en
  `app/globals.css` — única fuente de verdad; los Server Components los consumen por clase.
- Tema claro/oscuro **por token** (clase/atributo en el `<html>`, p. ej. `next-themes`),
  nunca `#000` suelto.
- **Prohibido** colores/valores hardcodeados fuera de tokens.
- **`:focus-visible` es un token**, definido con el resto (nunca `outline: none` sin
  reemplazo).
- **`prefers-reduced-motion`**: respetar la media query desactivando transiciones no
  esenciales; las transiciones de UI (modal, toast) van por token de duración.
- **Adherencia al design system — anti "aesthetic AI"** (la UI genérica de IA tiene estética
  reconocible; ninguna entra al repo):

| Señal de IA genérica | En su lugar |
|---|---|
| Paleta morada/índigo en todo | la paleta real del proyecto (los tokens existentes) |
| Gradientes por todos lados | planos, o gradiente sutil solo si el DS lo define |
| `rounded-2xl`/`rounded-full` en todo | escala de radios del DS (jerarquía real) |
| Hero genérico a pantalla completa | layout según el contenido real |
| Padding sobredimensionado e igual en todo | escala de spacing del DS (jerarquía visual) |
| Sombras compitiendo con el contenido | sutil o ninguna, la que diga el DS |

- **Escala de spacing**: solo valores de la escala del DS (múltiplos de `0.25rem`); prohibido
  inventar `13px`, `2.3rem`.
- **Tipografía**: `h1` (uno por página) → `h2` → `h3` → body → small; sin saltos de jerarquía
  (cruce con `next-accesibilidad-frontend`).

### 3. Formateo de locales

- Helper central con `Intl` (fechas, moneda, números) en `lib/`: funciona igual en server y
  cliente. Ningún componente formatea a mano (`toLocaleString` suelto repetido).

### 4. Icono "i": changelog + manual

- Icono de información en el header del `layout.tsx` raíz.
- Abre **modal accesible**: cierra con `Escape`, clic en `×`/backdrop, focus trap y devolución
  del foco. Es una isla `'use client'`; el contenido se leen de un módulo de datos
  (`lib/info.ts`: `APP_VERSION`, `CHANGELOG`, `MANUAL`) o de un route handler.
- Mantener el changelog de la app alineado con el changelog del repo.

### 5. Verificación (obligatoria)

```bash
# colores/valores hardcodeados fuera de tokens
rg "#[0-9a-fA-F]{3,8}\b|rgba?\(" app/ components/ -g '!app/globals.css'
# formateo disperso en vez del helper Intl
rg "toLocaleDateString|toLocaleString|Intl\." app/ components/ -g '!lib/**'
# paginación sin estado en la URL
rg "searchParams" app/ -l
# accesibilidad del modal de info
rg 'aria-modal|role="dialog"|Escape' components/
# outline eliminado sin foco visible de reemplazo
rg "outline:\s*none|outline:\s*0" app/ components/
# transiciones sin reduced-motion (sin matches = falta)
rg "prefers-reduced-motion" app/
# listados sin anuncio a lectores de pantalla
rg "aria-live" app/ components/ -c
# spacing fuera de escala en componentes
rg "padding:\s*[0-9]+px|margin(-[a-z]+)?:\s*[0-9]+px" app/ components/
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Página con `useState` de página sin sync a la URL | `rg "useState.*page" app/ components/` |
| `searchParams` destructurado sin `await` | `rg "searchParams\.[a-z]" app/` |
| Scroll infinito sin soporte de offset en el backend | revisar contrato del listado |
| Fechas/monedas formateadas distinto en cada pantalla | `rg "toLocaleString" app/ components/` |
| Changelog hardcodeado en el JSX del modal | `rg "CHANGELOG" components/` → datos en `lib/` |
| Modal sin `Escape`/focus trap | `rg 'role="dialog"' components/` sin teclado |
| `outline: none` sin reemplazo visible | `rg "outline:\s*none" app/ components/` |
| Estética "AI" (paleta morada, gradientes, redondeo máximo) | `rg "linear-gradient" app/ components/` |
| Spacing fuera de escala (`13px`, `2.3rem`) | `rg "padding:\s*[0-9]+px" app/ components/` |
| Saltos de jerarquía de headings | `rg -n "<h[1-6]" app/` (orden por página) |

## Solapamiento

- `next-arquitectura-frontend` — `globals.css` y `lib/info.ts` viven donde dice la estructura.
- `next-estados-toast-frontend` — skeletons/empty/error comparten tokens y variantes.
- `next-formularios-frontend` — inputs y errores comparten tokens y helpers de formato.
- `next-data-fetching-frontend` — los listados paginados usan sus fetchers y su caché.
- `next-accesibilidad-frontend` — audita que los tokens de foco/contraste existan realmente.
- `vite-ui-bloques-frontend` — el equivalente SPA (`useSearchParams`, store de UI).
