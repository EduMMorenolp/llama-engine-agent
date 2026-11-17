-- ==============================================================================
-- Schema: llama-engine-agent
-- Best Practices: supabase-postgres-best-practices
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabla de Personalidades del Asistente
CREATE TABLE IF NOT EXISTS personalidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    system_prompt TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Asegurar que solo una personalidad esté activa a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_personalidad_unica_activa 
    ON personalidades (activa) 
    WHERE activa = true;

-- 3. Tabla de Agenda Diaria
CREATE TABLE IF NOT EXISTS agenda_diaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    actividad TEXT NOT NULL,
    completada BOOLEAN NOT NULL DEFAULT false,
    recordado BOOLEAN NOT NULL DEFAULT false,
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Índices para búsqueda por fecha y para el cron de recordatorios pendientes
CREATE INDEX IF NOT EXISTS idx_agenda_fecha_hora 
    ON agenda_diaria (fecha, hora);

CREATE INDEX IF NOT EXISTS idx_agenda_pendientes_recordar 
    ON agenda_diaria (fecha, hora) 
    WHERE recordado = false AND completada = false;

-- 4. Tabla de Configuración de Hábitos
CREATE TABLE IF NOT EXISTS habitos_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    hora_disparo TIME NOT NULL,
    pregunta_prompt TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Índice para el cron que busca hábitos a disparar por hora
CREATE INDEX IF NOT EXISTS idx_habitos_hora_disparo 
    ON habitos_config (hora_disparo) 
    WHERE activa = true;

-- 5. Tabla de Registro de Hábitos (respuestas del usuario)
CREATE TABLE IF NOT EXISTS registro_habitos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habito_id UUID NOT NULL REFERENCES habitos_config(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    respuesta_usuario TEXT NOT NULL,
    resumen_estructurado JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Índice FK en registro_habitos
CREATE INDEX IF NOT EXISTS idx_registro_habitos_habito_id 
    ON registro_habitos (habito_id);

CREATE INDEX IF NOT EXISTS idx_registro_habitos_fecha 
    ON registro_habitos (fecha);

-- 6. Tabla de Memorias a Largo Plazo
CREATE TABLE IF NOT EXISTS memorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT UNIQUE NOT NULL,
    contenido TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_memorias_tags 
    ON memorias USING GIN (tags);

