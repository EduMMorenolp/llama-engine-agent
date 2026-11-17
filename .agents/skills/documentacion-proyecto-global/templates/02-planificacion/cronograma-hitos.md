# {{doc.title}}

## Diagrama de Gantt de hitos

{{@gantt}}

## Hitos

| Hito | Semana de inicio | Duración (semanas) | Entregable |
|---|---|---|---|
{{#each planificacion.milestones}}| {{name}} | {{startWeek}} | {{durationWeeks}} | {{deliverable}} |
{{/each}}

## Dependencias

{{#each planificacion.dependencies}}- {{this}}
{{/each}}
