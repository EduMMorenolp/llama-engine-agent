# {{doc.title}}

## Criterios de cierre

{{#each cierre.closureCriteria}}- {{this}}
{{/each}}

## Aceptación de entregables

| Entregable | Criterio de aceptación |
|---|---|
{{#each cierre.acceptance}}| {{item}} | {{criteria}} |
{{/each}}

## Firmas

| Rol | Nombre |
|---|---|
{{#each cierre.signOff}}| {{role}} | {{name}} |
{{/each}}
