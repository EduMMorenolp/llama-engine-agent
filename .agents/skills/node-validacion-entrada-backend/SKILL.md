---
name: node-validacion-entrada-backend
description: 'Request validation middleware (Joi/Zod) for Express backends. Use when adding endpoints with body/params/query, when validation is manual or missing, or to audit that every route with input is validated. Triggers: "validar body", "validar request", "Joi", "Zod", "validateBody", "400 bad request", "agregar endpoint", "params/query", "schema de validacion".'
---

# Backend Validación de Entrada — ninguna data llega al service sin pasar por un schema

**Regla:** toda ruta con body/params/query lleva un validador como middleware; los errores de
validación los formatea el handler central (400 con `details`).

## Cuándo usarla

- Crear un endpoint que reciba body, params o query.
- La validación es manual, está en el controller, o no existe.
- Auditar la cobertura de validación de un backend.

## Checklist de ejecución

1. **Middleware de validación por ruta** (Joi o Zod):

   ```ts
   // src/middlewares/validateSchema.ts
   export const validateBody = (schema: Schema) => (req, res, next) => {
     const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
     if (error) {
       return next(new ValidationError("Datos inválidos", error.details.map(d => ({
         field: d.path.join("."), message: d.message,
       }))));   // → 400 con details, respondido por el errorHandler central
     }
     req.body = value;
     next();
   };
   ```

   Uso en la ruta — **nunca** dentro del controller:

   ```ts
   router.post("/recurso", verifyToken, validateBody(createSchema), controller.create);
   ```

2. **Un schema por módulo**, junto a la ruta (`recurso.routes.ts` + `recurso.schema.ts`).
   Params de ruta (IDs) también se validan (`validateParams`): un ID no numérico ⇒ 400, no 500.
   Si el frontend consume el mismo contrato, compartir tipos/schema cuando exista mecanismo.
3. **Reglas de datos con trampa:**
   - **Fechas:** UTC/timezone — `Joi.date().iso()` / Zod `.coerce.date()` con hora explícita;
     un desfase de un día nace en la validación o en el parser.
   - **Strings vacíos:** `allow('')` de Joi no cubre validaciones custom → pasa vacío y revienta
     en la BD; validar explícitamente.
   - **Enums:** enum vacío en Postgres ⇒ `NULLIF` o validación previa.
   - **IDs de estado:** validar el ID que se persiste, no derivarlo con ternarios implícitos.
   - `stripUnknown: true` para que campos de más no se guarden silenciosamente.
4. **Cobertura: 100% de rutas con input validadas.** Verificación (obligatoria):

   ```bash
   # rutas definidas
   rg "router\.(post|put|patch|delete|get)\(" src/ -c
   # rutas con validador
   rg "validate(Body|Params|Query)" src/ -c
   ```

   Meta: todas las rutas que mutan datos (y GET con query si la query afecta el resultado).
   Los errores responden **400 con `details`** desde el handler central — jamás
   `res.status(400)` en el controller.

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Rutas de escritura sin validador | Comparar conteos: `router.(post\|put\|patch\|delete)` vs `validate(Body\|Params\|Query)` |
| Validación manual dispersa en los controllers | `rg "if *(!req\.body\." src/*controller*` → patrón de chequeos ad-hoc |
| Joi/Zod solo en config, cero en requests | `rg "schema.validate" src/` → solo hits en config |
| `res.status(400)` en controllers (no pasa por el handler) | `rg "res\.status\(400\)" src/` |
| Schema definido pero no registrado en la ruta | Buscar `*schema*` sin uso: `rg -L "Schema" src/` + revisar rutas |
| Params/query sin validar | `rg "req\.(params\|query)" src/` sin `validateParams/Query` aguas arriba |

## Solapamiento

- **Complementa** `node-errores-respuestas-backend`: los `ValidationError` que lanza este middleware
  los formatea el handler central.
- **No valida contra BD** (unicidad de email, existencia de FK): eso es regla de negocio de los
  services que vienen después del middleware — `node-base-datos-conexion-backend` no se toca acá.
