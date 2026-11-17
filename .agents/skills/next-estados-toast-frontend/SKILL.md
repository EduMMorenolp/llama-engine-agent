---
name: next-estados-toast-frontend
description: 'Next.js view states: loading.tsx/error.tsx per segment, granular Suspense, empty state with retry and an accessible global toast in a client island. Use when a page loads data, shows no-data or error, or when adding notifications in a Next project. Triggers: "loading", "skeleton", "empty state", "estado vacio", "reintentar", "toast", "notificaciones", "snackbar", "estado de error", "spinner", "loading.tsx", "error boundary", "suspense".'
---

# Estados y Toast Next — `loading.tsx`/`error.tsx` por segmento, toast accesible

**Regla:** cada segmento que carga datos trae `loading.tsx` y `error.tsx`, cada vista cubre
**loading (skeleton) / contenido / empty / error con retry**, y existe **un toast global
accesible** montado en una isla cliente.

## Cuándo usarla

- Crear o revisar una página que consume datos en un proyecto Next.
- Agregar notificaciones/toasts.
- Una vista queda en blanco, sin feedback, o el loading tapa toda la app.

## Checklist de ejecución

### 1. Los 4 estados, con las herramientas del App Router

1. **Loading** — `loading.tsx` del segmento (suspense automático) con skeleton de la **forma
   real** del contenido, no un spinner genérico. El resto del layout sigue visible mientras
   carga el hijo (streaming) — no usar spinner a pantalla completa. Para transiciones de
   navigación/submit: `useTransition` (estado "pendiente" sin parpadeo).
2. **Contenido** — la vista real.
3. **Empty state** — mensaje + acción orientativa ("No hay resultados", botón a crear).
4. **Error con retry** — `error.tsx` del segmento (recibe `error` y `reset`) con mensaje
   claro + botón **Reintentar**; nunca vista en blanco. El `error.tsx` es de cliente: recibe
   props serializables, no loguea al servidor.

- Skeleton y regiones de carga con `aria-busy="true"` + `aria-label` de qué carga: el lector
  de pantalla se entera, no solo quien mira la pantalla.

### 2. Suspense granular

- `<Suspense fallback={<Skeleton />}>` **por sección** que tarda, no un único wrap de la
  página: una sección lenta no debe retener a las rápidas.
- Los datos del layout no se cubren con el `loading.tsx` del hijo: si el layout necesita
  su propio loading, va su `<Suspense>`.

### 3. Toast global

- Sistema **global** montado en el `layout.tsx` raíz como isla `'use client'`
  (contexto/store de UI), no estados locales por página.
- Variantes `success` `error` `info` `warning`; duración configurable; **transición de salida**.
- **Accesible:** `role="status"`/`role="alert"`, `aria-live` (polite/assertive según
  severidad), sin robar el foco.
- Errores de API → toast por defecto; errores de formulario → **inline**
  (ver `next-formularios-frontend`).

### 4. Verificación (obligatoria)

```bash
# segmentos con datos y su loading/error correspondiente
ls app/**/loading.tsx app/**/error.tsx 2>/dev/null
# aria en los toasts
rg 'aria-live|role="status"|role="alert"' app/ components/
# spinners genéricos donde cabría skeleton
rg "Spinner|loader" app/ components/
# loading manual a pantalla completa
rg "setLoading|setIsLoading" components/
# suspense único que retiene toda la página
rg -n "<Suspense" app/ components/
```

Revisión funcional: en cada página de datos — probar con API caída (error+retry), sin datos
(empty) y red lenta (skeleton + streaming).

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Segmento con datos sin `loading.tsx`/`error.tsx` | comparar `page.tsx` vs archivos del segmento |
| `error.tsx` sin `reset()` ni botón de reintento | leer el componente: solo imprime el error |
| Spinner a pantalla completa en vez de skeleton | `rg "Spinner" app/` |
| Empty state inexistente (lista vacía = nada) | revisar render con `data.length === 0` |
| Toasts por página (sin stack global) | `rg "useState.*toast" app/` |
| Toast sin ARIA (inaccesible) | `rg "aria-live" app/ components/` → sin matches |
| Errores de formulario solo como toast | errores de campo → inline, no toast |
| Un solo `<Suspense>` que bloquea la página entera | `rg "<Suspense" app/` → 1 match en el layout |
| `error.tsx` en el root cubriendo errores que correspondían al segmento | revisar dónde vive cada boundary |

## Solapamiento

- `next-data-fetching-frontend` — de ahí salen las cargas que estos estados presentan.
- `next-arquitectura-frontend` — dónde viven `loading.tsx`/`error.tsx` y el layout del toast.
- `next-formularios-frontend` — cuándo el error va inline vs toast.
- `next-auth-frontend` — los flujos de sesión usan estos estados.
- `next-ui-bloques-frontend` — tokens/variantes con los que se estilizan skeletons y toasts.
- `vite-estados-toast-frontend` — el equivalente SPA (`useTransition`, store de UI).
- `next-accesibilidad-frontend` — audita ARIA, foco y contraste del conjunto.
