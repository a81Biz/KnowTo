// src/__tests__/cce/routes/wizard.cce.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../../index';
import type { Env } from '../../../core/types/env';

// ── Mocks de servicios ───────────────────────────────────────────────────────
const mockCreateProject = vi.fn().mockResolvedValue({ projectId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee' });
const mockSaveStep = vi.fn().mockResolvedValue({ stepId: 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff' });
const mockSaveDocument = vi.fn().mockResolvedValue({ documentId: 'cccccccc-dddd-4eee-ffff-000000000000' });
const mockGetContext = vi.fn().mockResolvedValue({ project: { name: 'Test CCE' } });
const mockGetProjects = vi.fn().mockResolvedValue([]);
const mockSaveExtractedContext = vi.fn().mockResolvedValue({ extractedContextId: 'dddddddd-eeee-4fff-aaaa-111111111111' });
const mockExtract = vi.fn().mockResolvedValue({
  extractorId: 'EXTRACTOR_F1_1',
  content: '## ANÁLISIS DE SECTOR\nContenido extraído CCE.',
  parserUsed: { 'F0.analisis_sector': true },
  extractedContextId: 'dddddddd-eeee-4fff-aaaa-111111111111',
});
const mockStoreFile = vi.fn().mockResolvedValue({
  fileId: 'eeeeeeee-ffff-4000-aaaa-222222222222',
  fileName: 'instrumento-director.pdf',
  instrumentId: 'entrevista-director',
});

// Mock del AIService para simular pipeline multi-agente
const mockAiGenerate = vi.fn().mockImplementation(async ({ promptId, context, userInputs }) => {
  if (promptId === 'F0') {
    // Simular pipeline completo
    return '# MARCO DE REFERENCIA VALIDADO\n## 1. ANÁLISIS DEL SECTOR\nContenido generado para TECHIC.';
  }
  if (promptId === 'F1_1') {
    return '## 1. GUÍA DE ENTREVISTA - DIRECTOR\nPreguntas generadas...';
  }
  if (promptId === 'F0_CLIENT_QUESTIONS_FORM') {
    return JSON.stringify({
      formTitle: 'Preguntas para TECHIC',
      description: 'Formulario basado en hallazgos',
      sections: [{ id: 's1', title: 'Sección 1', fields: [] }],
    });
  }
  return '# Documento generado\nContenido de prueba CCE.';
});

vi.mock('../../../cce/services/supabase.service', () => ({
  SupabaseService: vi.fn().mockImplementation(() => ({
    createProject: mockCreateProject,
    saveStep: mockSaveStep,
    saveDocument: mockSaveDocument,
    getProjectContext: mockGetContext,
    getUserProjects: mockGetProjects,
    saveExtractedContext: mockSaveExtractedContext,
    saveStepOutput: vi.fn().mockResolvedValue({ success: true }),
    getStepOutputs: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('../../../core/services/ai.service', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    generate: mockAiGenerate,
    extractTextFromImage: vi.fn().mockResolvedValue('Texto OCR extraído'),
    executePipeline: vi.fn().mockImplementation(async ({ pipelineId }: { pipelineId: string }) => {
      if (pipelineId === 'F0') {
        return { success: true, output: '# MARCO DE REFERENCIA VALIDADO\n## 1. ANÁLISIS DEL SECTOR\nContenido generado.' };
      }
      return { success: true, output: 'Pipeline ejecutado correctamente' };
    }),
  })),
}));

vi.mock('../../../core/services/context-extractor.service', () => ({
  ContextExtractorService: vi.fn().mockImplementation(() => ({
    extract: mockExtract,
  })),
}));

vi.mock('../../../core/services/upload.service', () => ({
  UploadService: vi.fn().mockImplementation(() => ({
    storeFile: mockStoreFile,
  })),
}));

// ── Constantes de test ───────────────────────────────────────────────────────
const DEV_ENV: Env = { ENVIRONMENT: 'development' } as Env;
const AUTH = { Authorization: 'Bearer dev-local-bypass' };
const JSON_HEADER = { 'Content-Type': 'application/json' };

const VALID_PROJECT_ID = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
const VALID_STEP_ID = 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff';

function post(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { ...AUTH, ...JSON_HEADER },
    body: JSON.stringify(body),
  }, DEV_ENV);
}

function get(path: string) {
  return app.request(path, { headers: AUTH }, DEV_ENV);
}

// ── Tests existentes (se mantienen) ──────────────────────────────────────────
// ... (los tests de autenticación, creación de proyecto, etc. se mantienen igual)

// ── NUEVOS TESTS PARA PIPELINE MULTI-AGENTE ──────────────────────────────────

describe('CCE — Pipeline Multi-Agente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const RICH_CONTEXT = {
    projectName: 'Consultoría TECHIC 2026',
    clientName: 'Laura González',
    companyName: 'TECHIC Agencia Creativa S.A. de C.V.',
    tradeName: 'TECHIC',
    mainActivity: 'Producción creativa y dirección visual',
    sector: 'Servicios profesionales / Marketing',
    subsector: 'Agencia de publicidad y producción audiovisual',
    city: 'Ciudad de México',
    stateRegion: 'CDMX',
    hasMultipleSites: 'No',
    yearsInOperation: '8 años',
    isPartOfCorporation: 'No',
    totalWorkers: '45',
    unionizedWorkers: '0',
    mainDepartments: 'Producción, Estrategia y cuentas, Administración',
    workersByArea: 'Producción: 25, Cuentas: 12, Admin: 8',
    mainProblem: 'Entregas fuera de tiempo y errores en postproducción',
    symptoms: '40% entregas fuera de tiempo, 6 renuncias último año, quejas de 2 clientes',
    problemStart: 'Últimos 6-8 meses',
    quantitativeData: '40% entregas fuera de tiempo, 35% aumento horas extras',
    previousAttempts: 'Contrataron más personal, no funcionó',
    currentSituation: 'Empresa en crecimiento con problemas de coordinación interna',
    hasIMSS: 'Sí',
    hasDC2: 'No',
    hasMixedCommission: 'No aplica',
    hasSTPS: 'No',
    recentTraining: 'Sí',
    hasDC3: 'No',
    hasTrainingBudget: 'No definido',
    hasTrainingFacilities: 'Sí',
    hasLMS: 'No',
    hasInternalInstructor: 'Parcial',
    trainingAvailability: 'Media',
    mainObjective: 'Reducir entregas fuera de tiempo y estandarizar procesos',
    measurableResult: 'Reducir reprocesos en un 50% en 3 meses',
    timeframe: '3-6 meses',
    restrictions: 'Capacitación en horario laboral, máximo 4 horas/semana',
    contactPosition: 'Directora General',
    email: 'laura@techic.agency',
    phone: '55 1234 5678',
    availableSchedule: 'Lunes a viernes 10am-1pm',
    websiteUrl: 'https://techic.agency',
    socialMediaUrls: 'https://instagram.com/techic\nhttps://linkedin.com/company/techic',
    mostActiveNetworks: 'Instagram y LinkedIn',
    reviewProfiles: 'Google Maps',
  };

  it('ejecuta pipeline F0 correctamente con contexto enriquecido', async () => {
    const res = await post('/cce/wizard/generate', {
      projectId: VALID_PROJECT_ID,
      stepId: VALID_STEP_ID,
      phaseId: 'F0',
      promptId: 'F0',
      context: RICH_CONTEXT,
      userInputs: {},
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { content: string } };
    expect(body.success).toBe(true);
    expect(body.data.content).toContain('MARCO DE REFERENCIA VALIDADO');
    expect(mockAiGenerate).toHaveBeenCalled();
  });

  it('genera instrumentos de diagnóstico F1_1 correctamente', async () => {
    const res = await post('/cce/wizard/generate', {
      projectId: VALID_PROJECT_ID,
      stepId: VALID_STEP_ID,
      phaseId: 'F1_1',
      promptId: 'F1_1',
      context: RICH_CONTEXT,
      userInputs: {},
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { content: string } };
    expect(body.success).toBe(true);
    expect(body.data.content).toContain('GUÍA DE ENTREVISTA');
  });

  it('genera formulario de preguntas para el cliente F0_CLIENT_QUESTIONS_FORM', async () => {
    const res = await post('/cce/wizard/generate-form', {
      projectId: VALID_PROJECT_ID,
      promptId: 'F0_CLIENT_QUESTIONS_FORM',
      context: RICH_CONTEXT,
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { formSchema: { formTitle: string } } };
    expect(body.success).toBe(true);
    expect(body.data.formSchema.formTitle).toBe('Preguntas para TECHIC');
  });
});