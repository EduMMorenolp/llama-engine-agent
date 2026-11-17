# {{doc.title}}

## Procedimiento

{{#each planificacion.changeControl.process}}- {{this}}
{{/each}}

## Aprobadores

{{#each planificacion.changeControl.approvers}}- {{this}}
{{/each}}

## Registro de cambios

| Fecha | Cambio | Estado |
|---|---|---|
{{#each planificacion.changeControl.log}}| {{date}} | {{change}} | {{status}} |
{{/each}}
