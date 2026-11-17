> **Documento:** Estrategia de Calidad y Testing · **Fase:** Ejecucion · **Versión:** 1.0 · **Fecha:** 2026-10-17 · **Autor:** Equipo de Producto · **Estado:** Borrador

## Control de versiones

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-10-17 | Equipo de Producto | Versión inicial |

# Estrategia de Calidad y Testing

## Estrategia

- Cada funcionalidad se prueba antes de darla por terminada
- Los bugs se reproducen en una prueba antes de corregirlos
- El rol de QA revisa el flujo completo antes del piloto

## Tipos de prueba

- Unitarias de la logica de pedidos
- Integracion de la API
- Revision manual del flujo en el navegador

## Integración continua

- Lint y typecheck en cada cambio
- Suite de pruebas en cada rama
- Sin merge si la suite esta en rojo
