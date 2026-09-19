CREATE TABLE IF NOT EXISTS messages (
	id TEXT PRIMARY KEY,
	session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
	role TEXT NOT NULL,
	content TEXT,
	tool_calls TEXT,
	tool_call_id TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
