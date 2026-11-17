# {{doc.title}}

## Despliegue

{{#each ejecucion.runbook.deploy}}- {{this}}
{{/each}}

## Monitoreo

{{#each ejecucion.runbook.monitoring}}- {{this}}
{{/each}}

## Health checks

{{#each ejecucion.runbook.healthChecks}}- {{this}}
{{/each}}

## Incidentes

{{#each ejecucion.runbook.incidents}}- {{this}}
{{/each}}
