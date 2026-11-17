---
name: next-auth-frontend
description: 'Complete authentication for Next.js App Router: session in httpOnly cookie, middleware guards, server actions for login/logout and refresh in server code. Use when adding login to a Next project, protecting routes, implementing session/refresh, or auditing auth flows. Triggers: "autenticacion", "guardar ruta", "sesion", "cerrar sesion", "registro", "recuperar contraseña", "flujos de auth", "auth middleware", "session cookie next".'
---

# Auth Frontend Next — sesión en cookie httpOnly, guards en middleware

**Regla:** nunca se entrega un login a medias: si la app tiene autenticación, incluye las 8
pantallas/flujos, el guard de ruta y el manejo de sesión. En App Router la sesión vive en
una **cookie httpOnly** leída en el servidor, no en `localStorage`.

## Cuándo usarla

- Agregar autenticación a un proyecto Next o revisar que esté completa.
- Implementar guards, refresh de token o logout.
- Auditoría de flujo: ¿falta registro, recuperación o verificación?

## Checklist de ejecución

### 1. Paquete de pantallas (mínimo obligatorio)

1. **Login** email + contraseña con **toggle mostrar/ocultar**.
2. **Registro** (si hay login, hay register).
3. **"Recordarme"** distinguiendo sesión persistente vs sesión de navegador.
4. **Recuperación**: pantalla de solicitud + página de restablecer con token.
5. **Verificación de email** tras el registro.
6. **OAuth (Google)**: solo botón + callback (route handler); el flujo es del backend.
7. **Cerrar sesión** que limpia cookie y estado.
8. **Cambiar contraseña** estando logueado.

### 2. Dónde vive cada cosa en App Router

- **Sesión**: cookie `httpOnly` + `Secure` + `SameSite`. El server component la lee con
  `cookies()`; **jamás** se copia a `localStorage` ni a un store de cliente.
- **Guards**: `middleware.ts` para rutas protegidas (redirect a `/login` si no hay sesión).
  El middleware es liviano: **cero** llamadas a base de datos — solo verifica la cookie/JWT.
  La autorización fina (rol, propiedad del recurso) se verifica **en el server**, al cargar
  el dato o en la server action.
- **Mutaciones de auth**: server actions (`login`, `logout`, `register`, `reset`) que validan
  con Zod, llaman al backend y usan `cookies()` para setear/borrar la sesión.
- El front **no** implementa lógica de auth (validar credenciales, firmar tokens): consume la
  API `Auth` y maneja la cookie en el servidor.

### 3. Contrato mínimo que la app consume

`POST /auth/login` · `register` · `refresh` · `forgot` · `reset` · `verify-email` ·
`logout` · `change-password` · OAuth start/callback.

- El refresh se resuelve en el servidor (server action o route handler), nunca leyendo el
  refresh token desde JavaScript del navegador.

### 4. Estados de formulario

- Submit deshabilitado mientras carga; errores del backend traducidos a mensajes legibles
  **inline** (vía `useActionState`), no solo toast — ver `next-formularios-frontend`.

### 5. Verificación (obligatoria)

```bash
# sesión: cookie httpOnly y nunca storage
rg -l "localStorage|sessionStorage" app/ components/ hooks/
rg "httpOnly|cookies\(\)" lib/ actions/ middleware.ts -l
# guards declarados en el middleware
rg -n "redirect\(|NextResponse" middleware.ts
# páginas de auth completas
ls app | rg -i "login|register|forgot|reset|verify"
# chequeos de sesión dispersos en pages (debería ser middleware/server)
rg "session|user" app/**/page.tsx -l
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Token/sesión en `localStorage` | `rg "localStorage" app/ components/ hooks/` |
| Login sin registro ni recuperación | `ls app` → solo `login` |
| Guard con query a la base de datos en el middleware | `rg -i "db\|prisma\|drizzle" middleware.ts` |
| Protección por rol hardcodeada en el cliente | `rg "role ===" components/` → reglas que son del backend |
| 403/401 tratado igual (sesión vs permiso) | manejar 401 (sesión) y 403 (permiso) por separado |
| Contraseña en cookie/log/props | `rg -i "password" actions/ lib/ \| rg "cookie\|console\|props"` |
| Logout que no borra la cookie ni la caché | revisar la server action de logout |
| Refresh leyendo el refresh token desde el cliente | `rg "refresh" components/ hooks/` |

## Solapamiento

- `next-config-env-frontend` — la URL base de auth es env pública; el token no es env.
- `next-formularios-frontend` — schemas y errores inline de login/registro/recuperación.
- `next-estados-toast-frontend` — loading/error de los flujos; errores graves → toast.
- `next-data-fetching-frontend` — cómo los fetchers adjuntan credenciales y reaccionan al 401.
- `vite-auth-frontend` — el equivalente SPA (guards de router cliente + store).
- `node-autenticacion-jwt-backend` — firma/verificación de tokens y rotación de refresh.
