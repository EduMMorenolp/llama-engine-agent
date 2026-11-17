> **Documento:** UX y Wireframes · **Fase:** Tecnico · **Versión:** 1.0 · **Fecha:** 2026-10-17 · **Autor:** Equipo de Producto · **Estado:** Borrador

## Control de versiones

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-10-17 | Equipo de Producto | Versión inicial |

# UX y Wireframes

## Flujos por vista

```mermaid
flowchart TD
    v0start(["Alta de pedido"])
    v0s0["Elegir cliente"]
    v0s1["Agregar items"]
    v0s2["Revisar total"]
    v0s3["Guardar"]
    v0start --> v0s0
    v0s0 --> v0s1
    v0s1 --> v0s2
    v0s2 --> v0s3
```

```mermaid
flowchart TD
    v1start(["Tablero de seguimiento"])
    v1s0["Ver columnas por estado"]
    v1s1["Abrir un pedido"]
    v1s2["Cambiar estado"]
    v1start --> v1s0
    v1s0 --> v1s1
    v1s1 --> v1s2
```

## Vistas

### Alta de pedido

Cargar un pedido validando los campos obligatorios

- Elegir cliente
- Agregar items
- Revisar total
- Guardar

### Tablero de seguimiento

Mover pedidos entre estados y ver la carga por columna

- Ver columnas por estado
- Abrir un pedido
- Cambiar estado
