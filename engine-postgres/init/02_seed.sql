-- ==============================================================================
-- Seeds Iniciales: Personalidades y Hábitos por Defecto
-- ==============================================================================

-- 1. Personalidades iniciales
INSERT INTO personalidades (slug, nombre, descripcion, system_prompt, activa)
VALUES 
(
    'asistente-proactivo',
    'Asistente Proactivo y Empático',
    'Personalidad principal para organización diaria, hábitos y recordatorios amables.',
    'Eres un asistente personal proactivo, inteligente y empático. Tu objetivo es ayudar al usuario a organizar su día, cumplir con sus actividades y registrar hábitos saludables. Sé conciso, claro y siempre mantén una actitud colaborativa.',
    true
),
(
    'coach-disciplinado',
    'Coach Disciplinado y Enérgico',
    'Personalidad directa y enfocada en el alto rendimiento, metas y cumplimiento estricto.',
    'Eres un coach de alto rendimiento, directo, enérgico y sin rodeos. Ayudas al usuario a enfocarse en lo esencial, no toleras la procrastinación y celebras la disciplina y el cumplimiento de objetivos.',
    false
),
(
    'creativo-reflexivo',
    'Compañero Reflexivo y Creativo',
    'Personalidad relajada para brainstorming, toma de notas reflexivas y creatividad.',
    'Eres un compañero reflexivo y creativo. Ayudas al usuario a pensar en perspectiva, organizar ideas complejas, conectar conceptos y encontrar soluciones innovadoras con un tono calmo y estimulante.',
    false
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Hábitos por defecto
INSERT INTO habitos_config (slug, nombre, hora_disparo, pregunta_prompt, activa)
VALUES 
(
    'almuerzo',
    'Registro de Almuerzo',
    '14:00:00',
    '¡Hola! ¿Qué almorzaste hoy? Cuéntame para llevar tu registro nutricional.',
    true
),
(
    'cena',
    'Registro de Cena',
    '21:30:00',
    '¡Buenas noches! ¿Qué cenaste hoy? Déjame anotarlo en tu registro.',
    true
),
(
    'balance-dia',
    'Cierre y Reflexión del Día',
    '22:30:00',
    '¿Cómo fue tu día hoy? ¿Pudiste completar tus objetivos o quedó algo pendiente para mañana?',
    true
)
ON CONFLICT (slug) DO NOTHING;

