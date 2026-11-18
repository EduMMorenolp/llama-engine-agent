import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs, { type Database } from "sql.js";
import { getConfig } from "../config/index.js";
import { logger } from "../utils/logger.js";

let db: Database | null = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function getDb(): Promise<Database> {
	if (db) return db;

	const config = getConfig();
	const filePath = config.DB_PATH;

	logger.info(`Opening database at ${filePath}`);

	const SQL = await initSqlJs();
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

	if (fs.existsSync(filePath)) {
		const buffer = fs.readFileSync(filePath);
		db = new SQL.Database(buffer);
	} else {
		db = new SQL.Database();
	}

	db.run("PRAGMA journal_mode = WAL");
	db.run("PRAGMA foreign_keys = ON");

	runMigrations(db);
	return db;
}

export function getDbSync(): Database {
	if (!db) throw new Error("Database not initialized. Call getDb() first.");
	return db;
}

export function saveDb(): void {
	try {
		const config = getConfig();
		if (db && config.DB_PATH && config.DB_PATH !== ":memory:") {
			const dir = path.dirname(config.DB_PATH);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			const data = db.export();
			const buffer = Buffer.from(data);
			fs.writeFileSync(config.DB_PATH, buffer);
		}
	} catch (err) {
		logger.warn(`Error al persistir base de datos: ${err}`);
	}
}

let pendingWrites = 0;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function scheduleSave(): void {
	pendingWrites++;
	if (!saveTimeout) {
		saveTimeout = setTimeout(() => {
			saveDb();
			saveTimeout = null;
			pendingWrites = 0;
		}, 100);
	}
}

export function forceSaveIfPending(): void {
	if (saveTimeout) {
		clearTimeout(saveTimeout);
		saveTimeout = null;
	}
	if (pendingWrites > 0) {
		saveDb();
		pendingWrites = 0;
	}
}

export function closeDb(): void {
	if (db) {
		saveDb();
		db.close();
		db = null;
		logger.info("Database closed");
	}
}

function findMigrationsDir(): string | null {
	const candidates = [
		path.join(__dirname, "migrations"),
		path.join(__dirname, "../src/db/migrations"),
		path.join(process.cwd(), "src/db/migrations"),
		path.join(process.cwd(), "dist/db/migrations"),
		path.join(process.cwd(), "migrations"),
	];

	for (const candidate of candidates) {
		try {
			if (fs.existsSync(candidate) && fs.readdirSync(candidate).some((f) => f.endsWith(".sql"))) {
				return candidate;
			}
		} catch {}
	}
	return null;
}

function runMigrations(db: Database): void {
	db.run(`
		CREATE TABLE IF NOT EXISTS _migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			applied_at INTEGER NOT NULL DEFAULT (unixepoch())
		)
	`);

	const applied = new Set<string>();
	const rows = db.exec("SELECT name FROM _migrations");
	if (rows.length > 0) {
		for (const row of rows[0].values) {
			applied.add(row[0] as string);
		}
	}

	const migrationsDir = findMigrationsDir();
	if (!migrationsDir) {
		logger.warn("No migrations directory found, skipping");
		return;
	}

	logger.info(`Running migrations from: ${migrationsDir}`);

	const files = fs
		.readdirSync(migrationsDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	let count = 0;
	for (const file of files) {
		if (applied.has(file)) continue;

		const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
		const statements = sql
			.split(";")
			.map((s) => s.trim())
			.filter(Boolean);

		for (const stmt of statements) {
			db.run(stmt);
		}

		db.run("INSERT INTO _migrations (name) VALUES (?)", [file]);
		count++;
	}

	if (count > 0) {
		logger.info(`Applied ${count} migration(s)`);
		saveDb();
	}
}
