> **Documento:** Contratos de API · **Fase:** Tecnico · **Versión:** 1.0 · **Fecha:** 2026-10-17 · **Autor:** Equipo de Producto · **Estado:** Borrador

## Control de versiones

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-10-17 | Equipo de Producto | Versión inicial |

# Contratos de API

Contratos derivados con criterio contract-first: la forma de la respuesta y de los errores
se acuerda antes de implementar. El detalle de cada contrato lo define la skill de contrato
de API del proyecto.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/pedidos` | Lista pedidos con filtros de estado y fecha |
| POST | `/pedidos` | Crea un pedido con sus items |
| PATCH | `/pedidos/{id}/estado` | Cambia el estado y registra la auditoria |
| GET | `/pedidos/export` | Devuelve la planilla de los pedidos filtrados |
