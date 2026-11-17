---
name: tdd-global
description: 'Metodología TDD: test rojo antes que código verde y, ante un bug, primero reproducirlo en un test y después arreglarlo (Prove-It). Aplica a backend y frontend. Use when implementing new logic, fixing a bug, modifying existing behavior, or proving that code works. Triggers: "TDD", "test primero", "red green", "escribir test", "reproducir el bug", "prove it", "ciclo de tests", "test de regresion".'
---

# TDD — test rojo antes que código verde

**Regla:** el test fallido viene **antes** del código que lo hace pasar; ante un bug, lo
primero es **reproducirlo en un test** (que falle), no arreglarlo a ciegas. "Se ve bien" no es
terminado: **test es la prueba**.

## Cuándo usarla

- Implementar lógica o comportamiento nuevo.
- Arreglar cualquier bug (primero Prove-It, después el fix).
- Modificar funcionalidad existente o agregar manejo de edge cases.
- **No usar:** cambios de config, documentación o contenido estático sin impacto en comportamiento.

## Checklist de ejecución

### 1. Descubrir el stack del repo (antes del primer test)

- Framework y comando de test: leer `package.json`, CI y README — **nunca asumir `npm test`**.
- Comando de un test focalizado vs suite completa (los dos se usan en el ciclo).
- Convenciones: dónde viven los tests, naming, patrones de los tests vecinos.
- Wrappers del repo (`./gradlew`, `make test`, scripts) sobre herramientas globales.

### 2. Ciclo RED → GREEN → REFACTOR

1. **RED** — escribir el test que **falla**. Si pasa a la primera, no prueba nada (el bug era
   otro o el test está mal). Ver el rojo es parte del trabajo.
2. **GREEN** — el mínimo necesario para que pase; sin ingeniería extra.
3. **REFACTOR** — con tests verdes, limpiar (extraer, renombrar, quitar duplicación) sin
   cambiar comportamiento; re-correr tests tras **cada** paso.

### 3. Prove-It (bugs)

`reporte → test que lo reproduce (ROJA) → fix → VERDE → suite completa (sin regresiones)`.
El test de reproducción se queda: es el guardián de la regresión. Nunca "arreglar" el bug
editando el test para que pase.

### 4. Pirámide de tests

- **Unit** (muchos, rápidos, aislados) → **integration** (rutas con BD real **aislada**, no
  mocks de todo) → **E2E** (pocos: flujos críticos del navegador, ver `playwright-cli`).
- Preferir pocos mocks: la integration test con BD real aislada da más confianza que el mock
  de cada dependencia.

### 5. Verificación (obligatoria)

```bash
# test focalizado en rojo durante RED (falla como corresponde)
# → mismo comando en verde al terminar el ciclo (comando real del repo)
# suite completa antes de dar por terminado (regresiones)
# (comandos descubiertos en el paso 1)
# los cambios de comportamiento dejaron tests en el diff
git diff --stat | rg 'test|spec'
# sin tests vacíos o saltados (debe dar 0)
rg -n '\.skip\(|xit\(|xdescribe\(' src/
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Fix de bug sin test que lo reprodujera | diff del fix sin archivo de test |
| Test que pasa a la primera (probando nada) | no se observó la fase roja |
| "Arreglar" el bug editando el test | el assertion cambió junto con el fix |
| Suite completa nunca corrida | solo se corrió el test focalizado |
| Integration tests que mockean todo | `rg -c 'mock\|spy'` alto en tests de rutas |
| Test acoplado a la implementación | refactor interno rompe tests verdes sin cambiar comportamiento |
| Tests flakey / dependientes del orden | pasan solos y fallan en conjunto |

## Solapamiento

- `node-testing-backend` — esta skill es la **metodología** (cuándo y en qué orden); esa es la
  **infraestructura** (fixtures, BD aislada, CI, cobertura) de Express.
- `revision-codigo-global` — toda revisión exige que los fixes lleguen con su test.
- `playwright-cli` — el frontend verifica en runtime con navegador; los E2E formales van a la suite.
