UPDATE agents SET tools = '["web_search", "web_fetch", "list_skills", "load_skill", "read_file", "glob_search", "grep_search", "search_memories", "memorize"]' WHERE name = 'researcher';
UPDATE agents SET tools = '["web_search", "web_fetch", "list_skills", "load_skill", "read_file", "write_file", "edit_file", "bash", "glob_search", "grep_search", "search_memories"]' WHERE name = 'coder';
UPDATE agents SET tools = '["list_skills", "load_skill", "read_file", "bash", "glob_search", "grep_search", "search_memories"]' WHERE name = 'reviewer';

INSERT OR IGNORE INTO skills (name, agent, description, directory, metadata, triggers, tags) VALUES
	('web-research', 'researcher', 'Investigación web y datos en tiempo real: busca clima, noticias, documentación oficial y sintetiza fuentes con citas.', 'skills/researcher/web-research', '{"triggers": ["clima", "buscar en internet", "web", "noticias", "tiempo"], "allowed_tools": ["web_search", "web_fetch", "memorize"], "tags": ["researcher", "web", "weather"]}', '["clima", "buscar en internet", "web", "noticias", "tiempo"]', '["researcher", "web", "weather"]'),
	('architecture-audit', 'reviewer', 'Auditoría de arquitectura y calidad de proyecto: analiza estructura modular, dependencias, seguridad y rendimiento.', 'skills/reviewer/architecture-audit', '{"triggers": ["arquitectura", "auditar", "estructura"], "allowed_tools": ["glob_search", "grep_search", "read_file"], "tags": ["reviewer", "architecture"]}', '["arquitectura", "auditar", "estructura"]', '["reviewer", "architecture"]');

