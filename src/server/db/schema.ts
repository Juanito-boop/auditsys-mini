/** DDL SQLite del modelo AuditSys Mini. Una sola transacción implícita por db.exec(). */

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'auditor')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization TEXT NOT NULL,
  objective TEXT NOT NULL,
  scope TEXT NOT NULL,
  audit_date TEXT NOT NULL CHECK (audit_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  auditor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('borrador', 'en_curso', 'cerrada')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS controls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  criterion TEXT NOT NULL,
  source TEXT NOT NULL,
  theme TEXT NOT NULL CHECK (theme IN ('Organizacional', 'Personas', 'Físico', 'Tecnológico')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS audit_controls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  control_id INTEGER NOT NULL REFERENCES controls(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('pendiente', 'implementado', 'parcialmente_implementado', 'no_implementado', 'no_aplicable')),
  observations TEXT NOT NULL DEFAULT '',
  na_justification TEXT,
  evaluated_at TEXT CHECK (evaluated_at IS NULL OR evaluated_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (audit_id, control_id),
  UNIQUE (id, audit_id)
);

CREATE TABLE IF NOT EXISTS evidences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_control_id INTEGER NOT NULL REFERENCES audit_controls(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  source TEXT NOT NULL,
  evidence_date TEXT NOT NULL CHECK (evidence_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  reference TEXT NOT NULL,
  is_simulated INTEGER NOT NULL CHECK (is_simulated IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_control_id INTEGER NOT NULL,
  audit_id INTEGER NOT NULL,
  condition TEXT NOT NULL,
  criterion TEXT NOT NULL,
  cause TEXT NOT NULL,
  effect_risk TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('baja', 'media', 'alta', 'critica')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (audit_control_id, audit_id)
    REFERENCES audit_controls(id, audit_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  finding_id INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('baja', 'media', 'alta')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS report_print_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  user_name_snapshot TEXT NOT NULL,
  user_email_snapshot TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('resultados','informe')),
  request_key TEXT NOT NULL,
  UNIQUE (audit_id, user_id, request_key)
);

CREATE INDEX IF NOT EXISTS idx_audits_auditor_id ON audits(auditor_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audit_controls_audit_id ON audit_controls(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_controls_control_id ON audit_controls(control_id);
CREATE INDEX IF NOT EXISTS idx_audit_controls_status ON audit_controls(status);
CREATE INDEX IF NOT EXISTS idx_evidences_audit_control_id ON evidences(audit_control_id);
CREATE INDEX IF NOT EXISTS idx_findings_audit_id ON findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_finding_id ON recommendations(finding_id);
CREATE INDEX IF NOT EXISTS idx_report_print_requests_audit_requested ON report_print_requests(audit_id, requested_at DESC, id DESC);
`;

export const SCHEMA_TABLES = [
  "users",
  "audits",
  "controls",
  "audit_controls",
  "evidences",
  "findings",
  "recommendations",
  "report_print_requests",
] as const;
