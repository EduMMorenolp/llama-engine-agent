# {{doc.title}}

Contratos derivados con criterio contract-first: la forma de la respuesta y de los errores
se acuerda antes de implementar. El detalle de cada contrato lo define la skill de contrato
de API del proyecto.

| Método | Ruta | Descripción |
|---|---|---|
{{#each tecnico.api.endpoints}}| {{method}} | `{{path}}` | {{description}} |
{{/each}}
