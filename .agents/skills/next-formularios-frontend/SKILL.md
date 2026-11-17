---
name: next-formularios-frontend
description: 'Next.js forms: Zod schema shared by client and server, Server Actions validated with useActionState, inline errors per field and date/range traps. Use when building a form in a Next project, wiring a submit action, or when validation diverges from the backend contract. Triggers: "formularios", "validacion", "errores inline", "submit", "campos controlados", "fechas rango", "schema del formulario", "server actions forms", "use action state".'
---

# Formularios Frontend Next — schema Zod compartido, acción validada en el server

**Regla:** todo formulario valida con **Zod** (el mismo schema corre en el cliente para
feedback y en la Server Action como autoridad), muestra errores **inline** por campo y
bloquea el doble submit.

## Cuándo usarla

- Crear o refactorizar un formulario en un proyecto Next.
- La validación está duplicada, dispersa o diverge del backend.
- Errores que no se muestran, se pierden o llegan solo como toast.

## Checklist de ejecución

1. **Schema Zod único por formulario** (`<form>.schema.ts`), reflejando el contrato del
   endpoint (campos, tipos, requeridos). Lo importan el componente cliente (feedback
   inmediato) **y** la server action (autoridad): si el backend cambia el contrato, se cambia
   el schema en la misma tarea.
2. **Submit = Server Action con `useActionState`:**

   ```tsx
   "use client";
   const [state, formAction, pending] = useActionState(crearTareaAction, initialState);
   // state.fieldErrors.email → mensaje bajo el campo
   <input name="email" aria-invalid={!!state.fieldErrors?.email}
          aria-describedby="err-email" />
   <p id="err-email" role="alert">{state.fieldErrors?.email}</p>
   ```

   La action devuelve `{ fieldErrors, error }` en vez de lanzar: el estado de error vive en
   el resultado, no en una excepción que rompa el render.
3. **Errores inline por campo**: `aria-describedby` + `aria-invalid`; los errores de negocio
   del backend (409, reglas) también inline en el campo o formulario relacionado — **no solo
   toast** (el toast se va antes de leerlo).
4. **Validar en blur, no en cada tecla** (feedback del cliente con `touched`); la autoridad
   es la action.
5. **Atributos nativos reales**: `autoComplete` honesto (`name`, `email`, `current-password`,
   `new-password`, `tel`), `inputMode="numeric|decimal|email"`, `type` correcto; foco inicial
   en el primer campo.
6. **Patrones con trampa:**
   - **Rangos de fechas**: `min ≤ max` en el schema (`.refine`) y `min`/`max` nativos en los
     inputs para que la UI no permita lo inválido.
   - Fechas: parsear/serializar en un solo helper (server y cliente comparten el mismo);
     cuidar zona horaria (un desfase de un día nace en la serialización).
   - Campos numéricos: coerción de Zod (`z.coerce.number()`) distinguiendo string del input.
   - Selects con "vacío" inicial: valor sentinela explícito, no `""` que pasa por default.
7. **Campos controlados de forma consistente**: un patrón en todo el repo; no mezclar
   controlado/descontrolado por formulario.
8. **Verificación (obligatoria):**

   ```bash
   # schemas presentes y compartidos
   rg "\.schema\.ts" app/ components/ lib/ -l   # o rg "z\.object" app/ components/ lib/ -l
   # errores inline (no solo toast)
   rg "aria-invalid|aria-describedby" app/ components/ -c
   # actions sin validación previa
   rg '"use server"' actions/ -l
   rg -n "safeParse|parse\(" actions/ -l
   # doble submit sin bloqueo (pending >= submits)
   rg "useActionState" components/ -c
   rg "pending" components/ -c
   # inputs sin autoComplete (campos de identidad/credenciales)
   rg "<input" components/ -g '!*.test.*' -c
   rg "autoComplete" components/ -c
   ```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Action que no valida (confía en el cliente) | `rg '"use server"' actions/ -l` sin `safeParse` |
| Schema duplicado/distinto en cliente y servidor | dos copias de `z.object` para el mismo form |
| Error de negocio mostrado solo como toast | `rg "toast.*error" components/` sin error inline |
| Rango de fechas invertido permitido | inputs de fecha sin `min`/`max` |
| Fecha +1 día por zona horaria | parse/serialize dispersos: `rg "new Date\(" app/ components/` |
| Doble envío (doble click = doble registro) | submit sin `pending` deshabilitando el botón |
| Campos que pierden valores al fallar | probar fallo de red y revisar que conserva lo tipeado |
| Input de email/contraseña sin `autoComplete` | conteo de `<input>` vs `autoComplete` |
| Errores que parpadean con cada tecla | validación en `onChange` sin `touched`/blur |

## Solapamiento

- `next-data-fetching-frontend` — el patrón de la server action validada (su checklist de
  actions) y cómo se revalida después.
- `next-estados-toast-frontend` — cuándo el error va inline (campo) vs toast (global).
- `next-auth-frontend` — login/registro/recuperación aplican este flujo.
- `next-ui-bloques-frontend` — tokens y helpers de formato (fechas/moneda).
- `vite-formularios-frontend` — el equivalente SPA (react-hook-form/Zod en cliente).
- `node-validacion-entrada-backend` — el schema del endpoint en el servidor: el del formulario
  lo refleja, no lo redefine.
