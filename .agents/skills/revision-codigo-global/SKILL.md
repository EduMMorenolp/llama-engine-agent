---
name: revision-codigo-global
description: 'Revisa código en cinco ejes (corrección, legibilidad, arquitectura, seguridad, performance) antes de merge, exigiendo un remedio estructural concreto por cada bandera, no solo señalamientos. Use when reviewing code written by yourself, another agent, or a human, or before merging any change. Triggers: "revisar codigo", "code review", "revisar el diff", "revisar PR", "review", "chequear cambios", "antes de merge", "aprobar cambio".'
---

# Revisión de Código — cinco ejes, con remedio propuesto

**Regla:** toda revisión evalúa **5 ejes** (corrección, legibilidad, arquitectura, seguridad,
performance) y **cada bandera estructural viene con el movimiento concreto** que la arregla:
decir "esto es complejo" sin proponer el arreglo deja al autor adivinando.

## Cuándo usarla

- Antes de mergear un PR o cambio propio/de otro agente.
- Después de un bug fix: revisar el fix **y** su test de regresión.
- Revisión de arquitectura al cerrar una feature.

## Checklist de ejecución

### 1. Contexto primero

- Leer la spec/tarea que motivó el cambio; ver los archivos vecinos, no solo el diff.
- Correr los tests del repo (los mismos que gatean el merge).
- Orden de atención: **bugs > seguridad > diseño > nits de estilo** (los nits se marcan como nits).

### 2. Los cinco ejes

| Eje | Qué preguntar |
|---|---|
| **Corrección** | ¿Hace lo que pide la tarea? ¿Edge cases (null, vacío, límites)? ¿Caminos de error, no solo happy path? ¿Pasan los tests y prueban lo correcto? |
| **Legibilidad** | ¿Nombres descriptivos y consistentes? ¿Flujo directo (sin ternarios anidados ni callbacks profundos)? ¿Podría hacerse en menos líneas? ¿Las abstracciones pagan su complejidad? ¿Código muerto (`_unused`, shims, `// removed`)? |
| **Arquitectura** | ¿Sigue patrones existentes (o el nuevo está justificado)? ¿Límites de módulo limpios y dependencias en una dirección? ¿El refactor **reduce** la complejidad o solo la reubica? ¿Lógica de feature filtrándose a un módulo compartido? |
| **Seguridad** | ¿Input validado/sanitizado? ¿Secretos fuera de código, logs y git? ¿Auth/authz donde corresponde? ¿Queries parametrizadas? ¿Output codificado (XSS)? ¿Datos externos tratados como no confiables? |
| **Performance** | ¿N+1? ¿Loops/fetch sin límite ni paginación? ¿Operaciones sync que deberían ser async? ¿Re-renders innecesarios en UI? |

### 3. Remedios estructurales (proponer el movimiento)

- Cadena de conditionales → modelo con tipo o dispatcher explícito.
- Ramas duplicadas → un solo flujo claro; separar orquestación de la lógica de negocio.
- Lógica de feature en módulo compartido → mover al paquete dueño del concepto.
- Helper canónico existente → reutilizarlo en vez del casi-duplicado.
- Frontera de tipo ambigua (`any`/casts) → hacerla explícita: el branching desaparece.
- Wrapper passthrough que solo agrega indirección → borrarlo; archivo grande → partirlo.

Preferir el remedio que **quita piezas móviles** sobre el que distribuye la misma complejidad.

### 4. Tamaño del cambio

- ~100 líneas cambiadas → ideal (se revisa de una sentada). ~300 → aceptable si es **un**
  cambio lógico. Más → pedir que se divida: un diff gigante no se revisa de verdad.

### 5. Verificación (obligatoria)

```bash
# rastro de depuración olvidado en lo revisado (debe dar 0)
rg -n 'console\.log|debugger' src/
# secretos en el diff (debe dar 0)
rg -n -i -e 'password\s*=\s*\x22' -e 'api[_-]?key\s*=\s*\x22' src/
# tests en verde con el comando real del repo (descubierto, no asumido)
# (ver package.json / CI: npm test, vitest, jest...)
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| Review que solo comenta estilo e ignora bugs/eje seguridad | comentarios sin mención a los 5 ejes |
| "LGTM" sin leer el diff completo ni correr los tests | la review no tiene evidencia de ejecución |
| Señalar un problema sin remedio propuesto | bandera estructural sin "mover X a Y" |
| Aprobar un diff de miles de líneas | pedir división antes de revisar |
| Refactor oportunista dentro de la review (scope creep) | cambios no relacionados en el mismo PR |
| Distinta vara según el autor | mismos 5 ejes para humanos, agentes y propios |

## Solapamiento

- `simplificar-codigo-global` — la review **señala** complejidad; esa skill **ejecuta** el arreglo.
- `tdd-global` — todo fix que llega a la review trae su test de reproducción.
- `node-testing-backend` — los tests que la review debe correr vienen de esa skill.
