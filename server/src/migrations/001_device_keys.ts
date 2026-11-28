import { db } from "../db.js";

function getColumnNames(table: string): Set<string> {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return new Set(columns.map((column) => column.name));
}

const codeColumns = getColumnNames("codes");

if (!codeColumns.has("device_public_key")) {
  db.exec("ALTER TABLE codes ADD COLUMN device_public_key TEXT");
}

if (!codeColumns.has("key_algorithm")) {
  db.exec("ALTER TABLE codes ADD COLUMN key_algorithm TEXT");
}

const resetColumns = getColumnNames("resets");

if (!resetColumns.has("old_device_public_key")) {
  db.exec("ALTER TABLE resets ADD COLUMN old_device_public_key TEXT");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS activation_challenges (
    id TEXT PRIMARY KEY,
    public_key TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    used_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_activation_challenges_created
  ON activation_challenges(created_at);
`);
