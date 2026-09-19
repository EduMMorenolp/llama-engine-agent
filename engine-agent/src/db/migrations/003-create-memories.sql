CREATE TABLE IF NOT EXISTS memories (
	id TEXT PRIMARY KEY,
	key TEXT NOT NULL UNIQUE,
	content TEXT NOT NULL,
	tags TEXT DEFAULT '[]',
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
