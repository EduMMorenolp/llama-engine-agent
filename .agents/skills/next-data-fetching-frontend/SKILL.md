---
name: next-data-fetching-frontend
description: 'Next.js data fetching: fetch in server components with an explicit cache strategy, Promise.all against waterfalls, Server Actions for mutations and revalidatePath/Tag to refresh. Use when loading data in a Next project, choosing a cache policy, adding mutations, or when fetches run twice or show stale data. Triggers: "data fetching", "fetch", "cache", "llamadas a la api", "invalidar cache", "optimistic", "revalidatepath", "revalidate tag", "datos en server components".'
---

# Data Fetching Next — fetch en el server, caché explícita, revalidación post-mutación

**Regla:** los datos se cargan en el servidor (Server Components o `lib/`) con **estrategia
de caché declarada en todo fetch**; las mutaciones van por Server Actions que, al terminar,
revalidan con `revalidatePath`/`revalidateTag`. **Un solo data layer.**

## Cuándo usarla

- Cargar datos en una página, layout o componente.
- Decidir la política de caché de un fetch (o corregir un default silencioso).
- Agregar mutaciones, o arreglar datos viejos/duplicados tras escribir.

## Checklist de ejecución

### 1. Fetchers en `lib/`, no inline

- `lib/<feature>.ts` centraliza: URL base (env), headers, tipado del contrato y manejo de
  error. Las pages/components los llaman; jamás `fetch` inline en JSX o en un `useEffect`.
- Fetch a **nuestra API interna**: route handlers propios o, mejor, acceso directo a la capa
  de datos (`lib/db`); nunca ir por HTTP localhost en el server (rompe con streaming/SSR).

### 2. Estrategia de caché explícita en todo fetch

Cada fetch declara su política — nunca el default silencioso del framework:

| Caso | Política |
|---|---|
| Dato privado/por usuario | `cache: "no-store"` |
| Dato público con TTL | `next: { revalidate: N }` |
| Dato invalidateable por eventos | `next: { tags: ["<recurso>"] }` |

- Layouts compartidos se cachean por defecto: si un layout necesita datos del usuario,
  que el page/segmento hijo los cargue (el layout cacheado no se re-renderiza por sesión).
- **`await` siempre** a `params`/`searchParams` (son `Promise` en Next 15+).

### 3. Sin waterfalls

- **Anti-waterfall**: fetches independientes con `Promise.all([...])`; nunca `await`
  secuenciales en el mismo componente. Si el segundo depende del primero, se lanza dentro de
  su `.then`/después del await (la dependencia real lo justifica).
- **Paralelismo en el árbol**: un `loading.tsx` por segmento pesado deja renderizar el resto
  del layout mientras carga el hijo (streaming) — ver `next-estados-toast-frontend`.

### 4. Mutaciones = Server Actions + revalidación

```ts
"use server";
export async function crearTarea(prev: State, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Datos inválidos", fieldErrors: parsed.error.flatten() };
  await db.insert(tareas).values(parsed.data);
  revalidatePath("/tareas");        // o: revalidateTag("tareas");
  return { ok: true };
}
```

- Toda action valida input con Zod y chequea autorización **dentro** de la action (es un
  endpoint público: esconder el botón no protege nada).
- **Optimista**: `useOptimistic` para que la UI reaccione antes de la respuesta; si la
  action falla, la acción descarta el estado optimista y muestra el error inline.

### 5. Un solo data layer

- Si conviven servicios legacy, `useEffect`+`useState` para datos remotos y fetchers en
  `lib/`, migrar y eliminar la capa vieja en la misma tarea.
- `useQuery` (TanStack Query) solo tiene sentido en **islas cliente** que necesitan refetch
  por interacción; nunca como capa paralela al fetch del server.

### 6. Verificación (obligatoria)

```bash
# fetch inline fuera de lib/ (violación)
rg "fetch\(" app/ components/ -g '!**/api/**'
# fetch sin política de caché declarada
rg -n "fetch\(" lib/ -A2 | rg -v "cache:|revalidate|tags:|no-store"
# awaits secuenciales de la API (waterfall)
rg -U "await .*(fetch|get|list).*\n.*await .*(fetch|get|list)" app/ lib/
# datos remotos cargados con useEffect en cliente
rg -n "useEffect" components/ -A3 | rg "fetch|setState"
# mutaciones sin revalidación
rg -l '"use server"' actions/ ; rg -n "revalidate(Path|Tag)" actions/ -l
# params/searchParams sin await
rg "params\.[a-z]" app/ -g '!*.test.*'
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Fetch sin política de caché (default silencioso) | `rg "fetch\(" lib/ -A2` sin `cache:`/`revalidate` |
| Datos privados cacheados (visto por otro usuario) | `revalidate` en endpoints privados |
| `await` secuenciales de la API | `rg -U "await.*\n.*await" app/ lib/` |
| Action sin validación Zod ni chequeo de autorización | leer cada `"use server"` |
| Mutación sin `revalidatePath`/`revalidateTag` → UI vieja | `rg '"use server"' actions/ -l` vs revalidaciones |
| Estado de servidor copiado a un store de cliente | `rg "useEffect.*fetch" components/` |
| HTTP interno desde el server (`fetch("http://localhost…")`) | `rg "fetch\(.?http" lib/ app/` |
| Dos data layers (queries + fetchers) conviviendo | `rg "useQuery" components/ -l` con fetchers en `lib/` |

## Solapamiento

- `next-arquitectura-frontend` — dónde viven `lib/` y `actions/` y qué importa qué.
- `next-config-env-frontend` — `NEXT_PUBLIC_API_URL` se lee una sola vez en `lib/`.
- `next-estados-toast-frontend` — loading/empty/error salen de estas cargas (Suspense +
  `loading.tsx`).
- `next-formularios-frontend` — el submit es una server action con sus errores inline.
- `next-auth-frontend` — el 401 dispara el flujo de sesión.
- `vite-data-fetching-frontend` — el equivalente SPA (cliente HTTP + TanStack Query).
