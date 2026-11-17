---
name: generador-estimaciones-global
description: 'Genera documentos HTML de estimación de esfuerzo de desarrollo por rol (backend, frontend, QA y resumen consolidado) con horas prellenadas con la propuesta del agente para que el usuario ajuste, listos para imprimir a PDF. Use when estimating development times for requested features or modules, creating a per-role effort document, or consolidating team hours. Triggers: "crear estimación", "estimar proyecto", "estimar horas", "tiempos de desarrollo", "cuánto tarda", "documento de estimación", "estimación backend", "estimación frontend", "estimación QA", "presupuesto de horas".'
---

# Generador de Estimaciones Global — horas propuestas por rol, listas para ajustar

**Regla:** cada estimación es un **documento HTML autocontenido por rol** (backend, frontend,
QA y resumen) con las horas **prellenadas con la propuesta del agente**; el usuario ajusta en
el HTML o pidiendo regenerar. Proyección en semanas: `total ÷ 8 h/día ÷ 5 días`.

## Cuándo usarla

- Piden cuánto tarda una feature o módulo nuevo ("estimar X", "tiempos de desarrollo").
- Crear los documentos de estimación por rol de un proyecto.
- Re-estimar tras un cambio de alcance o consolidar las horas del equipo.
- Presentar el desglose de esfuerzo (backend/frontend/QA) con totales y semanas.

## Checklist de ejecución

1. **Encuesta inicial**: nombre del proyecto, stack técnico, equipo (nombre por rol: backend,
   frontend, QA, diseño opcional), módulos/features a estimar — para cada uno pedir tareas
   backend, tareas frontend y tareas QA — y qué documentos quiere (por rol + resumen).
2. **Proponer horas**: estimar cada tarea según el alcance descrito y **prellenar** la tabla
   con la propuesta (nunca campos vacíos ni `___ h` sin valor). El usuario ajusta editando el
   HTML o pidiendo regenerar con los valores corregidos.
3. **Estructura por rol** (`estimacion_<rol>.html`): portada (proyecto, rol, stack, equipo) →
   fases (0 infraestructura, 1 migración/scaffolding, 2 módulos funcionales); cada módulo con
   lista de tareas + tabla Tarea × Horas → resumen con subtotales por fase/módulo, total
   general y proyección en semanas.
4. **Resumen consolidado** (`estimacion_resumen.html`): tabla Fase/Módulo × Backend | Frontend
   | QA con fila TOTAL, totales por rol con las semanas de cada uno y nota sobre trabajo en
   paralelo.
5. **Colores fijos por rol** (consistencia entre documentos): backend `#1a5276`, frontend
   `#196f3d`, QA `#7d3c98`, resumen `#2c3e50`.
6. **HTML autocontenido**: CSS inline, `@page` A4, `page-break` entre secciones, cero
   dependencias externas; guardar en la ruta que indique el usuario (default
   `docs/estimaciones/`). El PDF se obtiene imprimiendo desde el navegador
   (Ctrl+P → Guardar como PDF).
7. **Verificación (obligatoria)**:

```bash
# -g con el patrón de archivo funciona igual en bash y PowerShell (sin expandir el shell);
# \x22 = comilla doble, evita romper el quoting del shell
# 0 CSS externo o CDN (debe dar 0)
rg -c -g 'estimacion_*.html' 'rel=\x22stylesheet\x22|https?://[^\x22]+\.css' .
# subtotales y total en cada documento de rol (no debe dar 0)
rg -c 'Subtotal|Total general' estimacion_backend.html
# proyección en semanas en el resumen (no debe dar 0)
rg -c -i 'semana' estimacion_resumen.html
# proyectos ajenos o modelos de IA en el documento (debe dar 0)
rg -c -g 'estimacion_*.html' -i 'claude|gpt|gemini|copilot' .
```

## Anti-patrones (cómo detectarlos)

| Anti-patrón | Detección |
|---|---|
| CSS externo o CDN (no autocontenido) | `rg -c -g 'estimacion_*.html' 'rel=\x22stylesheet\x22\|https?://[^\x22]+\.css' .` → 0 |
| Tablas con horas vacías (sin propuesta prellenada) | `rg -c -g 'estimacion_*.html' '>___ h<\|></td>' .` → >0 |
| Sin subtotales por fase/módulo | `rg -c -g 'estimacion_*.html' 'Subtotal' .` → 0 en algún doc de rol |
| Sin proyección en semanas | `rg -c -i 'semana' estimacion_resumen.html` → 0 |
| Encuesta saltada (portada sin stack ni equipo) | `rg -c 'Stack técnico' estimacion_backend.html` → 0 |
| Proyectos ajenos o modelos de IA en el documento | `rg -c -g 'estimacion_*.html' -i 'claude\|gpt\|gemini\|copilot' .` → 0 |
| Documentos faltantes vs los pedidos | `ls estimacion_*.html` → el conteo debe igualar los documentos pedidos |

## Solapamiento

- `changelog-global` — lo estimado acá define el alcance de la primera versión del proyecto;
  cuando el desarrollo arranque, los cambios contra ese alcance se registran en el
  `CHANGELOG.md` del servicio en el mismo gesto.
