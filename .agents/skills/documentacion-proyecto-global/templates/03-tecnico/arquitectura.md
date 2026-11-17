# {{doc.title}}

## Diagrama de módulos

{{@archflow}}

## Stack

{{#each tecnico.architecture.stack}}- {{this}}
{{/each}}

## Módulos y responsabilidades

| Módulo | Responsabilidad |
|---|---|
{{#each tecnico.architecture.modules}}| {{name}} | {{responsibility}} |
{{/each}}

## Integraciones

{{#each tecnico.architecture.integrations}}- {{this}}
{{/each}}

## Despliegue

{{#each tecnico.architecture.deployment}}- {{this}}
{{/each}}
