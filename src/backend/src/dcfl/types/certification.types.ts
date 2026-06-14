/**
 * Certification Canonical Model (CCM) — KnowTo DCFL
 * PT-067: Single source of truth for all certification artifact contracts.
 * Standard-agnostic: EC0366 is one implementation; other standards extend this module.
 */

// ── Primitive domain types ────────────────────────────────────────────────────

export type ISO639LanguageCode = 'es' | 'en' | 'pt' | 'fr' | (string & {});

export type ModalidadCanonica = 'presencial' | 'virtual' | 'mixto';

export type BloomLevel =
  | 'recordar'
  | 'comprender'
  | 'aplicar'
  | 'analizar'
  | 'evaluar'
  | 'crear';

export type TipoInstrumento =
  | 'Lista de Cotejo'
  | 'Guía de Observación'
  | 'Examen Escrito'
  | 'Portafolio de Evidencias'
  | 'Proyecto'
  | 'Ensayo'
  | 'Estudio de Caso'
  | 'Rúbrica';

export type ViolacionSeverity = 'error' | 'warning' | 'info';

export type ArtifactStatus = 'draft' | 'valid' | 'corrected' | 'rejected' | 'active';

// ── Shared sub-types ──────────────────────────────────────────────────────────

export interface CriterioObservable {
  descripcion: string;
  verbo: string;
}

/** Artifacts that carry observable criteria (P1, P5, P6). Engine applies validateObservable only to these. */
export interface ObservableCriteriaCarrier {
  criterios: CriterioObservable[];
}

export interface MetricaReporteo {
  metrica: string;
  formato: string;
  frecuencia: string;
}

export interface ReferenciaVerificada {
  texto: string;
  verificable: boolean;
  url?: string;
}

// ── F3 Artifact ───────────────────────────────────────────────────────────────

export interface F3Artifact {
  plataforma: string;
  modalidad: ModalidadCanonica;
  criteriosAceptacion: string[];
  reporteo: MetricaReporteo[];
  idioma: ISO639LanguageCode;
}

// ── P1 Artifact ───────────────────────────────────────────────────────────────

export interface Reactivo {
  descripcion: string;
  respuestaEsperada?: string;
}

export interface UnidadEvaluacion {
  id: string;
  nombre: string;
  nivel_bloom: BloomLevel;
  instrumento: TipoInstrumento;
  /** Single source of weight — no separate ponderaciones[] array exists. */
  ponderacion: number;
  reactivos: Reactivo[];
}

export interface P1Artifact extends ObservableCriteriaCarrier {
  productCode: 'P1';
  modalidad: ModalidadCanonica;
  idioma: ISO639LanguageCode;
  unidades: UnidadEvaluacion[];
}

// ── P2 Artifact ───────────────────────────────────────────────────────────────

export interface Slide {
  numero: number;
  titulo: string;
  contenido: string;
  notas?: string;
}

export interface P2Artifact {
  productCode: 'P2';
  modalidad: ModalidadCanonica;
  idioma: ISO639LanguageCode;
  modulo: string;
  slides: Slide[];
}

// ── P3 Artifact ───────────────────────────────────────────────────────────────

export interface Escena {
  numero: number;
  duracion_segundos: number;
  descripcion_visual: string;
  audio: string;
}

export interface P3Artifact {
  productCode: 'P3';
  modalidad: ModalidadCanonica;
  idioma: ISO639LanguageCode;
  modulo: string;
  escenas: Escena[];
}

// ── P4 Artifact ───────────────────────────────────────────────────────────────

export interface SeccionCapitulo {
  titulo: string;
  contenido: string;
}

export interface Capitulo {
  numero: number;
  nombre: string;
  secciones: SeccionCapitulo[];
}

export interface TerminoGlosario {
  termino: string;
  definicion: string;
}

export interface P4Artifact {
  productCode: 'P4';
  modalidad: ModalidadCanonica;
  idioma: ISO639LanguageCode;
  capitulos: Capitulo[];
  glosario: TerminoGlosario[];
  referencias: ReferenciaVerificada[];
}

// ── P5 Artifact ───────────────────────────────────────────────────────────────

export interface Actividad {
  nombre: string;
  descripcion: string;
  duracion_minutos: number;
  verbo_bloom: string;
  recursos: string[];
}

export interface P5Artifact extends ObservableCriteriaCarrier {
  productCode: 'P5';
  modalidad: ModalidadCanonica;
  idioma: ISO639LanguageCode;
  modulo: string;
  actividades: Actividad[];
}

// ── P6 Artifact ───────────────────────────────────────────────────────────────

export interface Sesion {
  numero: number;
  fecha?: string;
  tema: string;
  duracion_horas: number;
  actividades: string[];
}

export interface P6Artifact extends ObservableCriteriaCarrier {
  productCode: 'P6';
  modalidad: ModalidadCanonica;
  idioma: ISO639LanguageCode;
  modulo: string;
  sesiones: Sesion[];
}

// ── P7 Artifact ───────────────────────────────────────────────────────────────

export interface P7Artifact {
  productCode: 'P7';
  modalidad: ModalidadCanonica;
  idioma: ISO639LanguageCode;
  modulo: string;
  terminos: TerminoGlosario[];
}

// ── P8 Artifact ───────────────────────────────────────────────────────────────

export interface EntradaCronograma {
  semana: number;
  modulo: string;
  actividad: string;
  responsable: string;
  entregable: string;
}

export interface P8Artifact {
  productCode: 'P8';
  modalidad: ModalidadCanonica;
  idioma: ISO639LanguageCode;
  modulo: string;
  cronograma: EntradaCronograma[];
}

// ── Union type ────────────────────────────────────────────────────────────────

export type CertificationArtifact =
  | F3Artifact
  | P1Artifact
  | P2Artifact
  | P3Artifact
  | P4Artifact
  | P5Artifact
  | P6Artifact
  | P7Artifact
  | P8Artifact;

// ── Rules Engine contracts ────────────────────────────────────────────────────

export interface Violacion {
  code: string;
  message: string;
  /** Dot-notation path to the offending field, e.g. 'unidades[2].ponderacion' */
  field: string;
  severity: ViolacionSeverity;
}

export interface CorrectionLog {
  type: 'WEIGHT_ROUNDING';
  delta: number;
  policy: string;
  units_affected: Array<{ id: string; old: number; new: number }>;
}

/**
 * Explicit certification context passed to the engine on every call.
 * Engine is pure (no DB reads inside) — all context is provided by the caller.
 */
export interface CertificationContext {
  f3Artifact: F3Artifact;
  p4Artifact?: P4Artifact;
  /** From _frozen.idioma_requerido. If null, validateLanguage is skipped. */
  requiredLang: ISO639LanguageCode | null;
  /** From _frozen.estandar_norma. Null means no standard — NullRulesEngine is used. */
  estandarNorma: string | null;
  /** Max allowed absolute weight delta for auto-correction (default 3). */
  roundingThreshold: number;
}

/**
 * Result of runCertificationCheck.
 * certificable is DERIVED, never stored: violaciones.filter(v => v.severity === 'error').length === 0
 */
export interface CertResult {
  violaciones: Violacion[];
  /** Non-null only when the engine auto-corrected a math error. Original artifact is immutable. */
  artifactCorregido: CertificationArtifact | null;
}

// ── Certification Score (6-axis) ──────────────────────────────────────────────

export interface CertificationScore {
  /** % of P4 chapters covered by P1 units (0–100) */
  cobertura: number;
  /** % of units with valid Bloom-instrument alignment (0–100) */
  bloom: number;
  /** 100 if artifact modalidad matches F3, else 0 */
  modalidad: number;
  /** 100 if artifact.idioma matches requiredLang (or requiredLang is null), else 0 */
  idioma: number;
  /** % of text fields free from prohibited vocabulary (0–100) */
  vocabulario: number;
  /** 100 if all references are ReferenciaVerificada.verificable === true, else 0 */
  trazabilidad: number;
  /** Weighted average of the 6 axes */
  total: number;
}

// ── Artifact Version (immutable history) ─────────────────────────────────────

export interface ArtifactVersion {
  id: string;
  project_id: string;
  product_code: string;
  version: number;
  artifact: CertificationArtifact;
  documento_md: string | null;
  prompt_template_id: string | null;
  prompt_template_version: string | null;
  /** SHA-256(template_id + '|' + template_version) — NOT hash of rendered text */
  prompt_hash: string | null;
  model: string | null;
  generated_by: string | null;
  cert_score: CertificationScore | null;
  correction_log: CorrectionLog | null;
  /** Points to the artifact this version was derived from (corrections only) */
  derived_from_artifact_id: string | null;
  created_at: string;
  is_active: boolean;
}
