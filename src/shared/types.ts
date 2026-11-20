/** Tipos compartidos entre cliente y servidor. No importar código de servidor aquí. */

export type Role = "admin" | "auditor";
export type AuditStatus = "borrador" | "en_curso" | "cerrada";
export type ControlStatus =
  | "pendiente"
  | "implementado"
  | "parcialmente_implementado"
  | "no_implementado"
  | "no_aplicable";
export type Theme = "Organizacional" | "Personas" | "Físico" | "Tecnológico";
export type Severity = "baja" | "media" | "alta" | "critica";
export type Priority = "baja" | "media" | "alta";

export type ErrorCode =
  | "VALIDACION"
  | "NO_AUTENTICADO"
  | "CREDENCIALES_INVALIDAS"
  | "PROHIBIDO"
  | "NO_ENCONTRADO"
  | "CONFLICTO"
  | "ERROR_INTERNO";

export interface Actor {
  id: number;
  name: string;
  email: string;
  role: Role;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- El contrato define UserDTO como extensión de Actor.
export interface UserDTO extends Actor {}

export interface AuditDTO {
  id: number;
  organization: string;
  objective: string;
  scope: string;
  audit_date: string;
  auditor_id: number;
  auditor_name: string;
  status: AuditStatus;
  created_at: string;
  progress: { total: number; evaluados: number; pendientes: number };
}

export interface AuditDetailDTO extends AuditDTO {
  controls: AuditControlDTO[];
  totalEvidencias: number;
  totalHallazgos: number;
}

export interface ControlDTO {
  id: number;
  code: string;
  name: string;
  description: string;
  criterion: string;
  source: string;
  theme: Theme;
  active: boolean;
  created_at: string;
}

export interface AuditControlDTO {
  id: number;
  audit_id: number;
  control_id: number;
  status: ControlStatus;
  observations: string;
  na_justification: string | null;
  evaluated_at: string | null;
  created_at: string;
  control: ControlDTO;
  evidenciaCount: number;
  hallazgoCount: number;
  maxSeverity: Severity | null;
}

export interface EvidenceDTO {
  id: number;
  audit_control_id: number;
  description: string;
  source: string;
  evidence_date: string;
  reference: string;
  is_simulated: boolean;
  created_at: string;
}

export interface RecommendationDTO {
  id: number;
  finding_id: number;
  description: string;
  priority: Priority;
  created_at: string;
}

export interface FindingDTO {
  id: number;
  audit_id: number;
  audit_control_id: number;
  control: Pick<ControlDTO, "id" | "code" | "name">;
  condition: string;
  criterion: string;
  cause: string;
  effect_risk: string;
  severity: Severity;
  created_at: string;
  recommendations: RecommendationDTO[];
  warningSinRecomendacion: boolean;
}

export interface IndicatorResult {
  implementados: number | null;
  parcialmenteImplementados: number | null;
  noImplementados: number | null;
  denominador: number;
  formula: string;
  limitaciones: string[];
}

export interface Success<T> {
  data: T;
  message?: string;
}

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
}

export interface ResultsDTO {
  audit: Pick<
    AuditDTO,
    "id" | "organization" | "objective" | "scope" | "audit_date" | "status" | "auditor_name"
  >;
  counts: {
    totalControles: number;
    evaluados: number;
    pendientes: number;
    noAplicables: number;
    implementados: number;
    parcialmenteImplementados: number;
    noImplementados: number;
    evidencias: number;
    hallazgos: number;
    recomendaciones: number;
    hallazgosSinRecomendacion: number;
  };
  indicators: IndicatorResult;
  porEstado: Array<{ status: ControlStatus; total: number }>;
  porTema: Array<{ theme: Theme; evaluados: number; cumplimiento: number | null }>;
  porSeveridad: Array<{ severity: Severity; total: number }>;
  detallePorControl: Array<{
    auditControl: AuditControlDTO;
    evidencias: EvidenceDTO[];
    hallazgos: FindingDTO[];
  }>;
  trazabilidad: Array<{
    control: { id: number; code: string; name: string };
    status: ControlStatus;
    evidencias: Array<{
      id: number;
      reference: string;
      descripcion: string;
      simulada: boolean;
    }>;
    hallazgos: Array<{ id: number; severity: Severity; condition: string }>;
    recomendaciones: Array<{ id: number; description: string; priority: Priority }>;
  }>;
  avisos: string[];
}

export interface ReportDTO {
  meta: {
    titulo: string;
    generadoEn: string;
    referentes: string[];
    metodologia: string;
    avisoNoCertifica: string;
  };
  portada: {
    organization: string;
    objective: string;
    scope: string;
    audit_date: string;
    auditor: string;
    status: AuditStatus;
    created_at: string;
  };
  resultados: ResultsDTO;
  anexoEvidencias: Array<
    EvidenceDTO & { controlCode: string; controlName: string; etiquetaSimulada: "Simulada" | null }
  >;
  limitaciones: string[];
}

export type PrintRequestOrigin = "resultados" | "informe";

export interface PrintRequestDTO {
  id: number;
  auditId: number;
  userId: number;
  userName: string;
  userEmail: string | null;
  requestedAt: string;
  origin: PrintRequestOrigin;
}

export interface PrintRequestPorUsuarioDTO {
  userId: number;
  userName: string;
  userEmail: string | null;
  total: number;
  ultimaSolicitudEn: string;
}

export interface PrintRequestsDTO {
  auditId: number;
  total: number;
  solicitudes: PrintRequestDTO[];
  porUsuario: PrintRequestPorUsuarioDTO[];
}

export interface DashboardDTO {
  resumen: {
    totalAuditorias: number;
    porEstado: Record<AuditStatus, number>;
    cumplimientoPromedio: number | null;
    totalHallazgos: number;
  };
  distribucionEstadosControl: Array<{ status: ControlStatus; total: number }>;
  hallazgosPorSeveridad: Array<{ severity: Severity; total: number }>;
  cumplimientoPorAuditoria: Array<{
    id: number;
    organization: string;
    status: AuditStatus;
    cumplimiento: number | null;
    evaluados: number;
    total: number;
  }>;
  controlesConMasIncumplimientos: Array<{
    controlId: number;
    code: string;
    name: string;
    theme: Theme;
    hallazgos: number;
    auditoriasAfectadas: number;
  }>;
  estaVacio: boolean;
  avisos: string[];
}
