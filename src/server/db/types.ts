/** Filas tal como se leen de SQLite (snake_case, booleanos 0/1). */

import type { AuditStatus, ControlStatus, Priority, Role, Severity, Theme } from "@/shared/types";

export type SqliteBoolean = 0 | 1;

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: string;
}

export interface AuditRow {
  id: number;
  organization: string;
  objective: string;
  scope: string;
  audit_date: string;
  auditor_id: number;
  status: AuditStatus;
  created_at: string;
}

export interface ControlRow {
  id: number;
  code: string;
  name: string;
  description: string;
  criterion: string;
  source: string;
  theme: Theme;
  active: SqliteBoolean;
  created_at: string;
}

export interface AuditControlRow {
  id: number;
  audit_id: number;
  control_id: number;
  status: ControlStatus;
  observations: string;
  na_justification: string | null;
  evaluated_at: string | null;
  created_at: string;
}

export interface EvidenceRow {
  id: number;
  audit_control_id: number;
  description: string;
  source: string;
  evidence_date: string;
  reference: string;
  is_simulated: SqliteBoolean;
  created_at: string;
}

export interface FindingRow {
  id: number;
  audit_control_id: number;
  audit_id: number;
  condition: string;
  criterion: string;
  cause: string;
  effect_risk: string;
  severity: Severity;
  created_at: string;
}

export interface RecommendationRow {
  id: number;
  finding_id: number;
  description: string;
  priority: Priority;
  created_at: string;
}
