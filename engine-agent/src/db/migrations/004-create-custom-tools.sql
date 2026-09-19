CREATE TABLE IF NOT EXISTS custom_tools (
	name TEXT PRIMARY KEY,
	description TEXT NOT NULL,
	parameters TEXT NOT NULL,
	handler_type TEXT NOT NULL,
	handler_config TEXT NOT NULL,
	enabled INTEGER NOT NULL DEFAULT 1,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
