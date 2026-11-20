import "server-only";

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema";

export type Db = Database.Database;

/** Crea una conexión independiente; usar ":memory:" en tests. */
export function createDb(path: string): Db {
  if (path !== ":memory:" && !path.startsWith("file:")) {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA_SQL);
  return db;
}

const globalForDb = globalThis as typeof globalThis & { __auditsysDb?: Db };

/** Única conexión del proceso; sobrevive a recargas de HMR. */
export function getDb(): Db {
  if (!globalForDb.__auditsysDb) {
    globalForDb.__auditsysDb = createDb(process.env.DATABASE_PATH ?? "data/auditsys.db");
  }
  return globalForDb.__auditsysDb;
}
