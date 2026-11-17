---
name: next-accesibilidad-frontend
description: 'Accesibilidad WCAG 2.1 AA y responsive mobile-first en Next.js App Router: teclado completo, ARIA correcta, foco tras la navegación del router, contraste 4.5:1 y headings por segmento. Use when building or reviewing UI in a Next project, auditing a11y, or when the app fails with keyboard or screen readers. Triggers: "accesibilidad", "a11y", "WCAG", "lector de pantalla", "teclado", "foco", "contraste", "responsive", "mobile first", "breakpoints", "aria-label", "accesibilidad next".'
---

# Accesibilidad y Responsive Next — WCAG 2.1 AA + mobile-first en App Router

**Regla:** toda interfaz es usable **con teclado** y **con lector de pantalla**, con contraste
suficiente y sin scroll horizontal en mobile; en App Router se suma el foco tras la
navegación del router, que el streaming no rompa la lectura.

## Cuándo usarla

- Construir o revisar componentes/páginas nuevas en un proyecto Next.
- Auditoría de a11y antes de merge o feedback de "no funciona con teclado/lectores".
- La UI se rompe en pantallas chicas o hay scroll horizontal.

## Checklist de ejecución

### 1. Teclado

- Todo elemento interactivo es focusable: **`<button>` nativo**, no `div onClick` (si no hay
  más remedio: `role="button"` + `tabIndex={0}` + Enter/Space en keydown).
- Sin keyboard traps; orden de Tab lógico (DOM = orden visual).
- `:focus-visible` visible en toda la app (token definido en `next-ui-bloques-frontend`).

### 2. ARIA y labels

- Botón solo-icono → `aria-label="Cerrar diálogo"`.
- Input con `<label htmlFor="email">` + `id`, o `aria-label` si no hay label visible.
- Estados con roles semánticos: `role="status"` (informativo), `role="alert"` (error),
  listas con `role="list"`; regiones dinámicas con `aria-live`.
- No usar solo color para informar: agregar icono o texto.
- Landmarks en el `layout.tsx`: `header`/`nav`/`main`/`footer` — el lector navega por
  regiones; un `<main>` único por árbol de layout.

### 3. Foco en la navegación del router

- Tras navegar con el router (`<Link>`, `router.push`), el foco **no** queda en el body:
  el título de la nueva página debe recibir foco (o el heading `h1` con `tabIndex={-1}` +
  `ref.focus()` en el layout/page). Sin esto, el teclado continúa desde la posición vieja.
- Al abrir un modal/dialog: foco **dentro** + focus trap; al cerrar: **devolver el foco** al
  botón que lo abrió.
- `loading.tsx`/`error.tsx` son cliente: si muestran un botón (Reintentar), debe ser
  focusable y anunciado.

### 4. Streaming y lectura de pantalla

- Skeletons/regiones de carga con `aria-busy="true"`: el streaming entrega HTML por partes y
  un lector de pantalla lee lo que llega; sin `aria-busy` anuncia contenido a medias.
- No usar `aria-live` agresivo en contenido que hace streaming (se lee cada trozo).

### 5. Color, contraste y tipografía

- Contraste **4.5:1** texto normal, **3:1** texto grande (comprobar en devtools/eyedropper).
- Colores por tokens semánticos (`text-primary`, `bg-surface`), nunca hex crudos.
- Jerarquía `h1` (uno por página) → `h2` → `h3`; **no saltar niveles** ni usar headings
  decorativos. Cuidado con el `layout.tsx`: un `h1` en el layout se repite en todas las rutas
  hijas.

### 6. Responsive mobile-first

- Diseñar de 1 columna para arriba: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Probar breakpoints **320 / 768 / 1024 / 1440 px**; sin scroll horizontal; targets táctiles
  cómodos.

### 7. Verificación (obligatoria)

```bash
# clickeables en div/span (necesitan role+tabIndex+teclado, o <button>)
rg '<div[^>]*onClick|<span[^>]*onClick' app/ components/
# inputs sin label asociado
rg -c '<input' app/ components/; rg -c 'htmlFor|aria-label' app/ components/
# landmarks del layout
rg -n '<header|<nav|<main|<footer' app/layout.tsx app/**/layout.tsx
# h1 por página y foco tras navegación
rg -n '<h1' app/ ; rg -n "tabIndex=\{-1\}|\.focus\(\)" app/ components/
# jerarquía de headings por página
rg -n '<h[1-6]' app/
# breakpoints mobile-first declarados (debe ser >0)
rg -c 'sm:|md:|lg:|@media' app/ components/
# outline eliminado sin foco visible de reemplazo (debe dar 0)
rg 'outline:\s*none|outline:\s*0' app/ components/
```

Contraste (4.5:1) y foco real → comprobación manual en el navegador (devtools + teclado),
incluyendo una navegación completa con Tab tras cambiar de ruta.

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| `div onClick` no focusable | `rg '<div[^>]*onClick' app/ components/` |
| Botón de solo-icono sin nombre accesible | `rg -c 'aria-label'` bajo vs botones |
| Modal sin focus trap ni devolución del foco | `rg 'role="dialog"' components/` sin manejo de foco |
| Foco perdido tras navegar (body al terminar el streaming) | probar: navegar y apretar Tab |
| Landmarks faltantes (sin `<main>`) | `rg '<main' app/layout.tsx` |
| `outline: none` sin reemplazo visible | `rg 'outline:\s*none' app/ components/` |
| Contraste bajo (gris sobre blanco) | revisar tokens en devtools |
| Solo color como información | error sin texto/icono |
| `h1` repetido por el layout en todas las rutas | `rg '<h1' app/layout.tsx` |
| Solo desktop: sin breakpoints o scroll horizontal | `rg -c 'sm:\|md:\|lg:' app/` → 0 |

## Solapamiento

- `next-ui-bloques-frontend` — token `:focus-visible` y `prefers-reduced-motion` viven ahí.
- `next-estados-toast-frontend` — empty/error/toast ya traen `aria-live`/roles; acá se audita.
- `next-formularios-frontend` — labels, `htmlFor` y errores inline con `aria-describedby`.
- `next-arquitectura-frontend` — landmarks y dónde vive cada componente auditado.
- `next-estados-toast-frontend` — el streaming (`loading.tsx`) debe anunciarse con `aria-busy`.
- `vite-accesibilidad-frontend` — el equivalente SPA (guard de router cliente, sin streaming).
