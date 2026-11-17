CREATE TABLE IF NOT EXISTS agents (
	name TEXT PRIMARY KEY,
	description TEXT NOT NULL,
	core_prompt TEXT NOT NULL DEFAULT '',
	tools TEXT DEFAULT '[]',
	model TEXT,
	max_iterations INTEGER,
	memory_budget INTEGER DEFAULT 500,
	skill_budget INTEGER DEFAULT 3000,
	enabled INTEGER NOT NULL DEFAULT 1,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_agents_enabled ON agents(enabled);

CREATE TABLE IF NOT EXISTS skills (
	name TEXT PRIMARY KEY,
	agent TEXT NOT NULL,
	description TEXT NOT NULL,
	directory TEXT NOT NULL,
	metadata TEXT DEFAULT '{}',
	allowed_tools TEXT DEFAULT '[]',
	triggers TEXT DEFAULT '[]',
	tags TEXT DEFAULT '[]',
	usage_count INTEGER DEFAULT 0,
	success_count INTEGER DEFAULT 0,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_skills_agent ON skills(agent);
CREATE INDEX IF NOT EXISTS idx_skills_triggers ON skills(triggers);

CREATE TABLE IF NOT EXISTS skill_files (
	skill_name TEXT NOT NULL,
	file_path TEXT NOT NULL,
	file_type TEXT NOT NULL,
	content TEXT NOT NULL,
	updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
	PRIMARY KEY (skill_name, file_path)
);

CREATE INDEX IF NOT EXISTS idx_skill_files_skill ON skill_files(skill_name);

CREATE TABLE IF NOT EXISTS memories (
	id TEXT PRIMARY KEY,
	key TEXT NOT NULL UNIQUE,
	content TEXT NOT NULL,
	tags TEXT DEFAULT '[]',
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);

ALTER TABLE memories ADD COLUMN type TEXT DEFAULT 'insight';
ALTER TABLE memories ADD COLUMN relevance INTEGER DEFAULT 0;
ALTER TABLE memories ADD COLUMN last_used_at INTEGER;

INSERT INTO agents (name, description, core_prompt, tools, memory_budget, skill_budget) VALUES
	('researcher', 'Agente de investigación. Busca información en archivos y la resume con claridad.', 'Sos un agente de investigación. Tu tarea es buscar información en los archivos del sistema, analizarla y presentar un resumen claro y conciso. Usá las herramientas de lectura y búsqueda para encontrar lo que se te pide.', '["read_file", "glob_search", "grep_search", "search_memories"]', 500, 3000),
	('coder', 'Agente de código. Escribe, edita y testea código siguiendo mejores prácticas.', 'Sos un agente de código. Tu tarea es escribir, editar y testear código siguiendo las mejores prácticas. Usá las herramientas de archivo y bash para implementar lo que se te pide.', '["read_file", "write_file", "edit_file", "bash", "glob_search", "search_memories"]', 500, 3000),
	('reviewer', 'Agente de revisión. Revisa código y sugiere mejoras de performance y estilo.', 'Sos un agente de code review. Tu tarea es revisar código, encontrar bugs, sugerir mejoras de performance y estilo. Sé conciso y accionable.', '["read_file", "bash", "glob_search", "search_memories"]', 500, 3000);

INSERT INTO skills (name, agent, description, directory, metadata, triggers, tags) VALUES
	('code-review', 'coder', 'Revisión de código estructurada: verifica bugs, seguridad, performance y mantenibilidad.', 'skills/coder/code-review', '{"triggers": ["review", "code review", "check code"], "allowed_tools": ["read_file", "bash"], "tags": ["coder", "quality"], "examples": ["review mi código", "code review"]}', '["review", "code review", "check code"]', '["coder", "quality"]'),
	('quick-fix', 'coder', 'Corrección rápida de errores comunes: syntax errors, type mismatches, import errors.', 'skills/coder/quick-fix', '{"triggers": ["fix", "quick fix", "error"], "allowed_tools": ["read_file", "edit_file", "bash"], "tags": ["coder", "fix"], "examples": ["fix esto", "quick fix"]}', '["fix", "quick fix", "error"]', '["coder", "fix"]');
