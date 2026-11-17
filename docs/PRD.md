# PRD — Asistente Personal Proactivo (llama-engine-agent)

## 1. Visión General

Plataforma de asistente personal proactivo auto-alojado impulsado por el modelo local **Qwen 3.5 4B** corriendo en `llama.cpp` con aceleración GPU (NVIDIA RTX 5050 8GB).
La arquitectura orquestada por **n8n** y respaldada por **PostgreSQL 16** coordina la interacción por **Telegram** (con soporte de voz vía **Faster-Whisper**) y una **Web UI** interactiva con **Web Speech API**.

**Versión actual:** 0.2.0  
**Stack Principal:** n8n + PostgreSQL 16 + Faster-Whisper (CUDA) + React 19 / Vite + llama.cpp (OpenAI Compatible API).

---

## 2. Objetivos del Producto

1. **Proactividad matutina**: El asistente inicia la conversación diariamente a las 08:00 AM recordando actividades previas y solicitando las actividades del día para confeccionar la agenda.
2. **Seguimiento automatizado de hábitos**: Pregunta en horarios configurados (ej: almuerzo a las 14:00, cena a las 21:30) y registra de forma estructurada las respuestas del usuario.
3. **Recordatorios preventivos (Reloj vigilante)**: Cron cada 5 minutos que notifica al usuario con 15 minutos de anticipación antes de cualquier actividad programada.
4. **Interacción multicanal fluida**:
   - Celular vía Telegram: soporte para texto y notas de voz transcritas por Faster-Whisper local.
   - PC vía Web UI: interfaz moderna con dictado de voz nativo (Web Speech API).
5. **Personalidades configurables**: Capacidad de alternar el tono del asistente (Asistente Proactivo, Coach Disciplinado, Creativo/Reflexivo).

---

## 3. Modelo de Datos (PostgreSQL 16)

- **`personalidades`**: Perfiles de tono y prompt de sistema.
- **`agenda_diaria`**: Eventos y tareas con fecha, hora, estado de completado y recordatorio.
- **`habitos_config`**: Catálogo de hábitos activos con hora de disparo y pregunta asociada.
- **`registro_habitos`**: Historial de respuestas y resúmenes estructurados de cada hábito.
- **`memorias`**: Base de conocimiento y preferencias del usuario a largo plazo.

---

## 4. Requisitos Funcionales (RF)

| ID | Requisito | Canal | Prioridad |
|---|---|---|---|
| **RF-01** | Disparo automático del saludo matutino a las 08:00 AM | Telegram | Alta |
| **RF-02** | Reconocimiento y transcripción de notas de voz de Telegram con Faster-Whisper | Telegram | Alta |
| **RF-03** | Tool Calling de Qwen 3.5 4B para `agendar_actividad` convirtiendo horas relativas | Telegram / Web | Alta |
| **RF-04** | Disparo automático de preguntas de hábitos según `hora_disparo` | Telegram | Alta |
| **RF-05** | Alertas preventivas 15 minutos antes de actividades pendientes | Telegram | Alta |
| **RF-06** | Dashboard web con agenda del día, hábitos activos y chat interactivo | Web UI | Media |
| **RF-07** | Dictado por voz en el navegador mediante Web Speech API | Web UI | Media |
| **RF-08** | Cambio de personalidad activa mediante comando o tool | Telegram / Web | Media |

---

## 5. Requisitos No Funcionales (RNF)

- **Consumo de VRAM**: La combinación de Qwen 3.5 4B (~3.5 GB) y Faster-Whisper small (~1.0 GB) no debe exceder los 5.5 GB de VRAM para mantener holgura en los 8 GB de la RTX 5050.
- **Privacidad Local**: Todo el procesamiento (inferencia LLM, transcripción de audio, base de datos) corre 100% localmente.
- **Latencia de Transcripción**: Notas de voz de hasta 30 segundos deben transcribirse en menos de 1 segundo en GPU.
