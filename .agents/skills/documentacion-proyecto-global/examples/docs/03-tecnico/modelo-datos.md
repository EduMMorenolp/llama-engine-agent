> **Documento:** Modelo de Datos · **Fase:** Tecnico · **Versión:** 1.0 · **Fecha:** 2026-10-17 · **Autor:** Equipo de Producto · **Estado:** Borrador

## Control de versiones

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-10-17 | Equipo de Producto | Versión inicial |

# Modelo de Datos

## Diagrama entidad-relación

```mermaid
erDiagram
    Pedido {
        string id
        string cliente
        string estado
        string creado_en
    }
    ItemPedido {
        string id
        string pedido_id
        string producto
        string cantidad
    }
    Usuario {
        string id
        string nombre
        string rol
    }
    CambioEstado {
        string id
        string pedido_id
        string usuario_id
        string estado
        string fecha
    }
    Pedido ||--o{ ItemPedido : "un pedido tiene varios items"
    Pedido ||--o{ CambioEstado : "un pedido acumula cambios de estado"
    Usuario ||--o{ CambioEstado : "un usuario registra muchos cambios"
```

## Entidades y campos

| Entidad | Campos |
|---|---|
| Pedido | id, cliente, estado, creado_en |
| ItemPedido | id, pedido_id, producto, cantidad |
| Usuario | id, nombre, rol |
| CambioEstado | id, pedido_id, usuario_id, estado, fecha |

## Relaciones

| Origen | Destino | Cardinalidad | Descripción |
|---|---|---|---|
| Pedido | ItemPedido | 1-N | un pedido tiene varios items |
| Pedido | CambioEstado | 1-N | un pedido acumula cambios de estado |
| Usuario | CambioEstado | 1-N | un usuario registra muchos cambios |
