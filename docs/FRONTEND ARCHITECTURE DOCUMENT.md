# KNOWTO - FRONTEND ARCHITECTURE DOCUMENT
**Version:** 2.0
**Date:** 2026-04-02
**Status:** STANDARD - CONVENTION - DO NOT DEVIATE

---

## 1. PRINCIPIOS FUNDAMENTALES (NO NEGOCIABLES)

| Principio | Regla |
|:---|:---|
| **Separación Estricta** | HTML vive en archivos `.html` con `<template>`. JavaScript/TypeScript NO contiene HTML embebido. |
| **7 Secciones por Módulo** | Todo controlador sigue la estructura: Dependencias → Estado → DOM Cache → Vista → Negocio → Eventos → API Pública |
| **TypeScript sobre JS** | Todo el código es TypeScript. El output compilado es JS para el navegador. |
| **Cero Lógica en la UI** | Las vistas (render) solo toman decisiones de lookup a diccionarios (`_uiConfig`). No contienen lógica de negocio. |
| **Event Delegation** | Los eventos se capturan en contenedores padres estáticos usando `closest()`. No se usan `onclick` en HTML. |
| **SSOT para Endpoints** | Todas las URLs de API están centralizadas en `endpoints.ts`. Prohibido escribir URLs directamente. |
| **Estado Global Singleton** | El estado del wizard se maneja en un store central (no prop drilling). |

---

## 2. ESTRUCTURA DE CARPETAS

```
knowto-frontend/
├── index.html                    # Entry point (solo estructura base y carga de assets)
├── src/
│   ├── main.ts                   # Entry point TypeScript (orquestador)
│   ├── controllers/
│   │   ├── step0.clientdata.ts
│   │   ├── step1.needs.ts
│   │   ├── step2.analysis.ts
│   │   ├── step3.specs.ts
│   │   ├── step4.production.ts
│   │   ├── step5.checklist.ts
│   │   ├── step6.evidence.ts
│   │   ├── step7.adjustments.ts
│   │   ├── step8.payment.ts
│   │   └── step9.closing.ts
│   ├── shared/
│   │   ├── http.client.ts        # Fetch wrapper con endpoints
│   │   ├── endpoints.ts          # SSOT para URLs de API
│   │   ├── ui.ts                 # showSuccessModal, showErrorModal, showLoading
│   │   ├── validationEngine.ts   # Validación de formularios
│   │   ├── pubsub.ts             # Event bus para comunicación entre módulos
│   │   ├── supabase.client.ts    # Cliente de Supabase para auth
│   │   ├── auth.ts               # Autenticación (Google OAuth)
│   │   └── template.loader.ts    # Carga y cache de templates HTML
│   ├── stores/
│   │   └── wizard.store.ts       # Estado global (singleton)
│   ├── types/
│   │   ├── wizard.types.ts
│   │   └── document.types.ts
│   └── vite-env.d.ts
├── templates/                    # HTML templates puros
│   ├── tpl-step0-clientdata.html
│   ├── tpl-step1-needs.html
│   ├── tpl-step2-analysis.html
│   ├── tpl-step3-specs.html
│   ├── tpl-step4-production.html
│   ├── tpl-step5-checklist.html
│   ├── tpl-step6-evidence.html
│   ├── tpl-step7-adjustments.html
│   ├── tpl-step8-payment.html
│   ├── tpl-step9-closing.html
│   ├── tpl-document-preview.html
│   └── tpl-loading.html
├── css/
│   └── styles.css                # Tailwind (compilado) o CSS puro
├── public/                       # Assets estáticos (imágenes, fuentes)
├── dist/                         # Build output (ignorado en git)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
└── .gitignore
```

---

## 3. CONVENCIONES DE NOMBRAMIENTO

| Tipo | Patrón | Ejemplo |
|:---|:---|:---|
| Archivo de controlador | `step{N}-{nombre}.ts` | `step0-clientdata.ts` |
| Archivo de template | `tpl-step{N}-{nombre}.html` | `tpl-step0-clientdata.html` |
| Variable privada | `_nombreVariable` | `_data`, `_dom`, `_uiConfig` |
| Función privada | `_nombreFuncion` | `_cacheDOM`, `_updateUI`, `_bindEvents` |
| Constante UI | `_uiConfig` | Diccionario de clases CSS, textos, configuraciones |
| IDs en HTML | `{tipo}-{nombre}` (kebab-case) | `form-step0`, `input-client-name`, `btn-submit` |
| Atributos para eventos | `data-action`, `data-id`, `data-code` | `data-action="delete" data-id="123"` |
| Tipos/Interfaces | PascalCase | `ClientData`, `WizardState` |

---

## 4. FORMATO DE ARCHIVO DE TEMPLATE (.HTML)

Cada template sigue esta estructura estandarizada:

```html
<!-- templates/tpl-step{N}-{nombre}.html -->
<template id="tpl-step{N}-{nombre}">
  <!-- Contenedor principal con ID único -->
  <div id="step-{N}-container" class="step-container">
    
    <!-- Formulario o contenido del paso -->
    <form id="form-step{N}" class="space-y-6">
      
      <!-- Campos con IDs predecibles -->
      <div class="group">
        <label class="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">
          {Nombre del Campo}
        </label>
        <input
          id="input-{campo}"
          type="{text|email|date}"
          class="input-field w-full bg-surface-container-low border-l-2 border-transparent focus:border-primary p-4 rounded-lg"
          placeholder="{Placeholder}"
          required
        />
      </div>
      
      <!-- Botón de acción -->
      <button
        id="btn-submit"
        type="submit"
        class="btn-primary w-full bg-primary text-white py-4 px-8 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50"
      >
        {Texto del botón}
      </button>
      
    </form>
    
  </div>
</template>
```

**Reglas para templates:**
- Cada template DEBE tener un `<template>` tag con `id` único
- El `id` del template DEBE coincidir con el nombre del archivo (sin extensión)
- Los elementos interactivos DEBEN tener `id` predecibles para el controlador
- No usar `onclick`, `onchange` u otros atributos de evento en HTML
- No usar `<script>` tags dentro de templates

---

## 5. ANATOMÍA DEL CONTROLADOR (7 SECCIONES OBLIGATORIAS)

```typescript
// src/controllers/step{N}.{nombre}.ts
// ============================================================================
// 1. DEPENDENCIAS
// ============================================================================
import { postData, getData } from '../shared/http.client';
import { ENDPOINTS } from '../shared/endpoints';
import { showSuccessModal, showErrorModal } from '../shared/ui';
import { TemplateLoader } from '../shared/template.loader';
import { wizardStore } from '../stores/wizard.store';
import type { TipoDatos } from '../types/wizard.types';

// ============================================================================
// 2. ESTADO PRIVADO Y CONFIGURACIÓN
// ============================================================================
let _data: TipoDatos = {
  // valores iniciales
};

const _dom: {
  container?: HTMLElement;
  form?: HTMLFormElement;
  inputCampo?: HTMLInputElement;
  btnSubmit?: HTMLButtonElement;
} = {};

const _uiConfig = {
  inputClasses: 'w-full bg-surface-container-low border-l-2 border-transparent focus:border-primary p-4 rounded-lg',
  buttonClasses: 'w-full bg-primary text-white py-4 px-8 rounded-lg font-bold hover:opacity-90 transition-all',
  badges: {
    'ACTIVO': 'bg-emerald-100 text-emerald-800',
    'DEFAULT': 'bg-slate-100 text-slate-800'
  }
};

// ============================================================================
// 3. CACHÉ DEL DOM (Privado)
// ============================================================================
const _cacheDOM = (container: HTMLElement): void => {
  _dom.container = container;
  _dom.form = container.querySelector('#form-step{N}');
  _dom.inputCampo = container.querySelector('#input-campo');
  _dom.btnSubmit = container.querySelector('#btn-submit');
};

// ============================================================================
// 4. LÓGICA DE VISTA / RENDERIZADO (Privado)
// ============================================================================
const _updateUI = (): void => {
  if (_dom.inputCampo) _dom.inputCampo.value = _data.campo;
};

const _setLoading = (isLoading: boolean): void => {
  if (_dom.btnSubmit) {
    _dom.btnSubmit.disabled = isLoading;
    _dom.btnSubmit.textContent = isLoading ? 'Procesando...' : 'Confirmar';
  }
};

// ============================================================================
// 5. LÓGICA DE NEGOCIO / DATOS (Privado)
// ============================================================================
const _saveData = async (): Promise<void> => {
  // Validaciones
  if (!_data.campo) {
    throw new Error('El campo es requerido');
  }
  
  const response = await postData(ENDPOINTS.wizard.saveStep, {
    stepId: {N},
    data: _data
  });
  
  wizardStore.setStepData({N}, _data);
  return response;
};

// ============================================================================
// 6. EVENTOS (Privado)
// ============================================================================
const _bindEvents = (): void => {
  // Input events
  if (_dom.inputCampo) {
    _dom.inputCampo.addEventListener('input', (e) => {
      _data.campo = (e.target as HTMLInputElement).value;
    });
  }
  
  // Submit event
  if (_dom.form) {
    _dom.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      _setLoading(true);
      
      try {
        await _saveData();
        showSuccessModal('Datos guardados correctamente');
        
        const event = new CustomEvent('wizard:nextStep', {
          detail: { step: {N}, data: _data }
        });
        document.dispatchEvent(event);
      } catch (error) {
        showErrorModal(error instanceof Error ? error.message : 'Error al guardar');
      } finally {
        _setLoading(false);
      }
    });
  }
};

// ============================================================================
// 7. API PÚBLICA
// ============================================================================
export const Step{N}Nombre = {
  mount: async (container: HTMLElement): Promise<void> => {
    const fragment = await TemplateLoader.clone('tpl-step{N}-nombre');
    container.innerHTML = '';
    container.appendChild(fragment);
    
    _cacheDOM(container);
    
    const savedData = wizardStore.getStepData({N});
    if (savedData) {
      _data = { ..._data, ...savedData };
    }
    
    _updateUI();
    _bindEvents();
  },
  
  getData: (): TipoDatos => ({ ..._data }),
  
  setData: (data: Partial<TipoDatos>): void => {
    _data = { ..._data, ...data };
    _updateUI();
  }
};
```

---

## 6. TEMPLATE LOADER (CON CACHE)

```typescript
// src/shared/template.loader.ts
class TemplateLoaderClass {
  private cache: Map<string, HTMLTemplateElement> = new Map();
  private basePath: string = '/templates';

  async load(templateId: string): Promise<HTMLTemplateElement> {
    if (this.cache.has(templateId)) {
      return this.cache.get(templateId)!;
    }

    const response = await fetch(`${this.basePath}/${templateId}.html`);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${templateId} (${response.status})`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const template = doc.querySelector('template');

    if (!template) {
      throw new Error(`Template ${templateId} must contain a <template> tag`);
    }

    this.cache.set(templateId, template);
    return template;
  }

  async clone(templateId: string): Promise<DocumentFragment> {
    const template = await this.load(templateId);
    return template.content.cloneNode(true) as DocumentFragment;
  }

  preload(templateIds: string[]): Promise<void[]> {
    return Promise.all(templateIds.map(id => this.load(id).then(() => undefined)));
  }
}

export const TemplateLoader = new TemplateLoaderClass();
```

---

## 7. HTTP CLIENT (CON TIPOS)

```typescript
// src/shared/http.client.ts
import { ENDPOINTS } from './endpoints';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  method: HttpMethod;
  body?: any;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

function buildUrl(endpoint: string, params?: Record<string, string | number>): string {
  let url = endpoint;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}

async function request<T>(endpoint: string, options: RequestOptions): Promise<T> {
  const url = buildUrl(endpoint, options.params);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  const token = localStorage.getItem('knowto_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const fetchData = <T>(endpoint: string, params?: Record<string, string | number>): Promise<T> =>
  request<T>(endpoint, { method: 'GET', params });

export const postData = <T>(endpoint: string, body: any, params?: Record<string, string | number>): Promise<T> =>
  request<T>(endpoint, { method: 'POST', body, params });

export const putData = <T>(endpoint: string, body: any, params?: Record<string, string | number>): Promise<T> =>
  request<T>(endpoint, { method: 'PUT', body, params });

export const patchData = <T>(endpoint: string, body: any, params?: Record<string, string | number>): Promise<T> =>
  request<T>(endpoint, { method: 'PATCH', body, params });

export const deleteData = <T>(endpoint: string, params?: Record<string, string | number>): Promise<T> =>
  request<T>(endpoint, { method: 'DELETE', params });
```

---

## 8. ENDPOINTS CENTRALIZADOS (SSOT)

```typescript
// src/shared/endpoints.ts
export const ENDPOINTS = {
  // Backend API URLs
  backend: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  
  // Auth endpoints
  auth: {
    me: '/api/auth/me',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },
  
  // Wizard endpoints
  wizard: {
    createProject: '/api/wizard/project',
    saveStep: '/api/wizard/step',
    getProject: (projectId: string) => `/api/wizard/project/:projectId`,
    getProgress: '/api/wizard/progress',
  },
  
  // Document endpoints
  documents: {
    generate: '/api/documents/generate',
    get: (documentId: string) => `/api/documents/:documentId`,
    list: (projectId: string) => `/api/documents/project/:projectId`,
  },
  
  // Health
  health: '/api/health',
} as const;

// Helper para reemplazar parámetros en URLs
export function buildEndpoint(
  endpoint: string,
  params?: Record<string, string | number>
): string {
  let url = endpoint;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  return `${ENDPOINTS.backend}${url}`;
}
```

---

## 9. WIZARD STORE (SINGLETON)

```typescript
// src/stores/wizard.store.ts
import type { WizardState, ClientData } from '../types/wizard.types';

type Listener = (state: WizardState) => void;

const STORAGE_KEY = 'knowto_wizard_state';

const initialState: WizardState = {
  currentStep: 0,
  projectId: null,
  clientData: {
    clientName: '',
    projectName: '',
    industry: '',
    email: '',
  },
  needsData: null,
  analysisData: null,
  specsData: null,
  productionData: null,
  checklistData: null,
  evidenceData: null,
  adjustmentsData: null,
  paymentData: null,
  closingData: null,
};

class WizardStoreClass {
  private state: WizardState = { ...initialState };
  private listeners: Listener[] = [];

  constructor() {
    this.loadFromLocalStorage();
  }

  // Subscription
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Persistence
  private saveToLocalStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  private loadFromLocalStorage(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.state = { ...initialState, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to load saved state', e);
      }
    }
  }

  // Getters
  getState(): WizardState {
    return { ...this.state };
  }

  getCurrentStep(): number {
    return this.state.currentStep;
  }

  getProjectId(): string | null {
    return this.state.projectId;
  }

  getClientData(): ClientData {
    return { ...this.state.clientData };
  }

  getStepData<T>(stepId: number): T | null {
    const key = this.getStepKey(stepId);
    return key ? (this.state[key] as T) ?? null : null;
  }

  // Setters
  setCurrentStep(step: number): void {
    this.state.currentStep = step;
    this.saveToLocalStorage();
    this.notify();
  }

  setProjectId(projectId: string): void {
    this.state.projectId = projectId;
    this.saveToLocalStorage();
    this.notify();
  }

  setClientData(data: Partial<ClientData>): void {
    this.state.clientData = { ...this.state.clientData, ...data };
    this.saveToLocalStorage();
    this.notify();
  }

  setStepData(stepId: number, data: any): void {
    const key = this.getStepKey(stepId);
    if (key) {
      (this.state as any)[key] = data;
      this.saveToLocalStorage();
      this.notify();
    }
  }

  private getStepKey(stepId: number): keyof WizardState | null {
    const keys: Record<number, keyof WizardState> = {
      0: 'clientData',
      1: 'needsData',
      2: 'analysisData',
      3: 'specsData',
      4: 'productionData',
      5: 'checklistData',
      6: 'evidenceData',
      7: 'adjustmentsData',
      8: 'paymentData',
      9: 'closingData',
    };
    return keys[stepId] || null;
  }

  // Actions
  nextStep(): void {
    if (this.state.currentStep < 9) {
      this.setCurrentStep(this.state.currentStep + 1);
    }
  }

  prevStep(): void {
    if (this.state.currentStep > 0) {
      this.setCurrentStep(this.state.currentStep - 1);
    }
  }

  reset(): void {
    this.state = { ...initialState };
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }
}

export const wizardStore = new WizardStoreClass();
```

---

## 10. TYPES DEFINITIONS

```typescript
// src/types/wizard.types.ts
export interface ClientData {
  clientName: string;
  projectName: string;
  industry: string;
  email: string;
}

export interface NeedsData {
  problemStatement: string;
  gapAnalysis: GapAnalysisItem[];
  smartObjective: SmartObjective;
  constraints: string[];
  assumptions: string[];
}

export interface GapAnalysisItem {
  behavior: string;
  rootCause: 'knowledge' | 'skill' | 'attitude' | 'process' | 'tool';
  isTrainable: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface SmartObjective {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

export interface AnalysisData {
  modality: 'asynchronous' | 'synchronous' | 'blended' | 'self-paced';
  interactivity: 'low' | 'medium' | 'high';
  modules: Module[];
  profile: Profile;
}

export interface Module {
  name: string;
  objective: string;
  duration: number;
  topics: string[];
}

export interface Profile {
  minEducation: string;
  priorKnowledge: string[];
  digitalSkills: string[];
  hardware: string;
  internetSpeed: string;
  weeklyAvailability: number;
}

export interface SpecsData {
  platform: string;
  platformReason: string;
  reporting: ReportingConfig;
  duration: DurationConfig;
}

export interface ReportingConfig {
  activities: string[];
  frequency: 'daily' | 'weekly' | 'perModule';
  recipients: string[];
}

export interface DurationConfig {
  totalHours: number;
  weeks: number;
  hoursPerWeek: number;
  calculation: DurationCalculation;
}

export interface DurationCalculation {
  activities: ActivityTime[];
  totalMinutes: number;
  adjustmentFactor: number;
}

export interface ActivityTime {
  module: number;
  reading: number;
  video: number;
  quiz: number;
  forum: number;
  practice: number;
  project: number;
  subtotal: number;
}

export interface ProductionData {
  cronograma: any;
  infoGeneral: any;
  guias: any[];
  calendario: any;
  documentosTexto: any[];
  presentacion: any;
  multimedia: any;
  instrumentosEvaluacion: any;
}

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  completed: boolean;
  observation?: string;
}

export interface ChecklistData {
  items: ChecklistItem[];
  lastUpdated: string;
}

export interface ScreenshotEvidence {
  code: string;
  description: string;
  url?: string;
  taken: boolean;
}

export interface EvidenceData {
  screenshots: ScreenshotEvidence[];
  lmsPlatform: string;
  testDate?: string;
}

export interface Observation {
  id: string;
  type: 'design' | 'content' | 'functionality';
  unit: string;
  description: string;
  proposal: string;
  priority: 'critical' | 'major' | 'minor';
  status: 'pending' | 'corrected' | 'rejected';
  correctionDate?: string;
}

export interface AdjustmentsData {
  observations: Observation[];
  summary: {
    corrected: number;
    pending: number;
    rejected: number;
  };
}

export interface PaymentData {
  amount?: number;
  currency: 'MXN' | 'USD';
  status: 'pending' | 'paid' | 'cancelled';
  transactionId?: string;
  paymentDate?: string;
}

export interface Signature {
  role: string;
  name: string;
  signed: boolean;
  signatureDate?: string;
}

export interface ClosingData {
  signatures: Signature[];
  finalApproval: boolean;
  completionDate: string;
}

export interface WizardState {
  currentStep: number;
  projectId: string | null;
  clientData: ClientData;
  needsData: NeedsData | null;
  analysisData: AnalysisData | null;
  specsData: SpecsData | null;
  productionData: ProductionData | null;
  checklistData: ChecklistData | null;
  evidenceData: EvidenceData | null;
  adjustmentsData: AdjustmentsData | null;
  paymentData: PaymentData | null;
  closingData: ClosingData | null;
}
```

---

