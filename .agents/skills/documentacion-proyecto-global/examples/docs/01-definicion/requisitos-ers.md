> **Documento:** Especificacion de Requisitos (ERS) · **Fase:** Definicion · **Versión:** 1.0 · **Fecha:** 2026-10-17 · **Autor:** Equipo de Producto · **Estado:** Borrador

## Control de versiones

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-10-17 | Equipo de Producto | Versión inicial |

# Especificacion de Requisitos (ERS)

## Requerimientos funcionales (RF)

| ID | Descripción | Prioridad |
|---|---|---|
| RF-1 | El operador puede crear un pedido con cliente, items y observaciones | Alta |
| RF-2 | El supervisor puede cambiar el estado del pedido y queda auditado | Alta |
| RF-3 | El sistema exporta los pedidos filtrados a una planilla | Media |

## Requerimientos no funcionales (RNF)

| ID | Descripción | Categoría |
|---|---|---|
| RNF-1 | El tablero responde en menos de dos segundos con mil pedidos | Rendimiento |
| RNF-2 | Toda accion sensible queda registrada con usuario y fecha | Auditoria |

## Criterios de aceptación (Gherkin)

### CA-1 — Alta de pedido valida campos obligatorios

- **Dado** un operador autenticado en el alta de pedidos
- **Cuando** intenta guardar sin cliente seleccionado
- **Entonces** el sistema bloquea el guardado y resalta el campo faltante

### CA-2 — Cambio de estado auditado

- **Dado** un pedido en estado Pendiente
- **Cuando** el supervisor lo pasa a Confirmado
- **Entonces** el pedido muestra el nuevo estado y el registro de usuario y fecha
