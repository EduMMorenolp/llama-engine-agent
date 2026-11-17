# {{doc.title}}

## Diagrama entidad-relación

{{@erd}}

## Entidades y campos

{{@entitiesTable}}

## Relaciones

| Origen | Destino | Cardinalidad | Descripción |
|---|---|---|---|
{{#each tecnico.dataModel.relations}}| {{from}} | {{to}} | {{kind}} | {{description}} |
{{/each}}
