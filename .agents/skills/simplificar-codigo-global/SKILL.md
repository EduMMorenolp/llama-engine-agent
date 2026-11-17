---
name: simplificar-codigo-global
description: 'Simplifica código preservando el comportamiento exacto: entiende antes de tocar, aplica cinco principios (comportamiento, convenciones, claridad, equilibrio, alcance) y verifica con los tests intactos. Use when refactoring code for clarity without changing behavior, when code works but is harder to read than it should be, or after code review flags complexity. Triggers: "simplificar codigo", "refactor", "limpiar codigo", "reducir complejidad", "codigo enrevesado", "funcion larga", "anidar menos", "code cleanup".'
---

# Simplificar Código — menos complejidad, mismo comportamiento

**Regla:** el objetivo **no es menos líneas** sino código que un miembro nuevo entiende más
rápido que el original; el comportamiento (entradas, salidas, errores, side effects) queda
**idéntico** y los tests pasan **sin modificarse**.

## Cuándo usarla

- La feature funciona y los tests pasan, pero la implementación pesa más de lo necesario.
- La review marcó legibilidad o complejidad (`revision-codigo-global`).
- Funciones largas, lógica muy anidada o nombres unclear; código escrito con urgencia.
- **No usar:** si no se entiende todavía qué hace el código (primero comprender), si ya está
  legible, o si la versión "más simple" sería mediblemente más lenta en un hot path.

## Checklist de ejecución

### 1. Entender antes de tocar (valla de Chesterton)

Antes de cambiar o borrar, responder: ¿cuál es su responsabilidad? ¿Quién lo llama y a qué
llama? ¿Edge cases y caminos de error? ¿Hay tests que definan el comportamiento? ¿Por qué se
escribió así (rendimiento, constraint, historia)? Si no se entiende por qué existe, no se
destruye — primero se entiende, después se decide si la razón sigue vigente.

### 2. Los cinco principios

1. **Preservar comportamiento exacto** — ante cada cambio preguntar: ¿mismo output para cada
   input? ¿mismos errores? ¿mismos side effects y orden? Si no se está seguro, no se hace.
2. **Seguir las convenciones del proyecto** — simplificar es acercar el código a sus vecinos,
   no imponer gustos propios (orden de imports, estilo de funciones, manejo de errores).
   Romper la consistencia no es simplificar: es churn.
3. **Claridad sobre astucia** — código explícito gana al compacto cuando el compacto obliga a
   una pausa mental.

```ts
// DIFÍCIL: ternario encadenado
const label = isNew ? 'New' : isUpdated ? 'Updated' : isArchived ? 'Archived' : 'Active';

// CLARO: mapeo legible
function getLabel(item: Item): string {
  if (item.isNew) return 'New';
  if (item.isUpdated) return 'Updated';
  if (item.isArchived) return 'Archived';
  return 'Active';
}
```

4. **Mantener el equilibrio** (trampas de la sobre-simplificación): inlinear de más mata al
   helper que daba un nombre al concepto; unir lógicas no relacionadas crea una función
   compleja; algunas abstracciones existen por extensibilidad/testeabilidad; optimizar para
   cantidad de líneas nunca es el objetivo.
5. **Alcance a lo cambiado** — simplificar lo recién modificado; los refactors de código no
   tocado van aparte y con pedido explícito (ruido en el diff y riesgo de regresión).

### 3. Verificación (obligatoria)

```bash
# los tests pasan SIN modificarse (la prueba de que el comportamiento es idéntico)
# (comando real del repo: ver package.json / CI)
# el diff toca solo el alcance pedido
git diff --stat
# sin restos de debug en lo simplificado (debe dar 0)
rg -n 'console\.log|debugger' src/
```

Pregunta final: *¿un miembro nuevo entiende esto más rápido que el original?* Si la respuesta
no es sí, aún no está simplificado.

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Cambiar comportamiento "de paso" | tests modificados junto con el código |
| Simplificar sin entender por qué existía | respuesta vacía a las preguntas de la valla |
| Optimizar para cantidad de líneas | menos líneas pero más indirección/pausas mentales |
| Unir dos funciones simples en una compleja | anidamiento que sube al mergear |
| Romper convenciones del proyecto con estilo propio | diff con formato ajeno al de los vecinos |
| Refactor drive-by fuera del alcance | archivos no relacionados en el diff |

## Solapamiento

- `revision-codigo-global` — la review señala la complejidad; esta skill ejecuta el arreglo.
- `node-testing-backend` — los tests que prueban el "comportamiento idéntico" se arman ahí.
- `revision-codigo-global` — el ciclo se cierra: review señala → esta skill simplifica → review re-aprueba.
