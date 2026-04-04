#!/usr/bin/env bash
# =============================================================================
# KNOWTO - Patch Script (Auditoría y Correcciones)
# Corrige todas las violaciones detectadas contra los documentos de especificación.
# Ejecutar desde la RAÍZ del repositorio (donde está /frontend y /backend)
# Uso: chmod +x patch-knowto.sh && ./patch-knowto.sh
# =============================================================================

set -euo pipefail
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[FIX]${NC}  $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC}  $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   KNOWTO - AUDIT REPORT + PATCH                     ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que estamos en la raíz correcta
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
  err "Ejecutar desde la raíz del proyecto (donde están /frontend y /backend)"
  exit 1
fi

echo "VIOLACIONES DETECTADAS CONTRA LOS DOCUMENTOS DE ESPECIFICACIÓN:"
echo ""
echo "  FRONTEND ARCHITECTURE DOCUMENT:"
echo "  [V01] CRÍTICO  - HTML embebido en controladores (viola principio #1)"
echo "  [V02] CRÍTICO  - Templates HTML inexistentes en /frontend/templates/"
echo "  [V03] CRÍTICO  - TemplateLoader no se usa en ningún controlador"
echo "  [V04] CRÍTICO  - API pública de controladores incorrecta (export fn vs export const)"
echo "  [V05] CRÍTICO  - shared/validationEngine.ts no existe"
echo "  [V06] CRÍTICO  - shared/pubsub.ts no existe"
echo "  [V07] ALTO     - wizard.types.ts incompleto (faltan ~20 tipos del spec)"
echo "  [V08] ALTO     - wizard.store.ts API no coincide con el documento"
echo "  [V09] ALTO     - endpoints.ts estructura difiere del spec (falta buildEndpoint)"
echo "  [V10] MEDIO    - step8 nombrado como 'signatures' en vez de 'payment'"
echo ""
echo "  BACKEND ARCHITECTURE DOCUMENT:"
echo "  [V11] CRÍTICO  - @hono/zod-validator falta en backend/package.json"
echo "  [V12] CRÍTICO  - wrangler.toml no tiene reglas para importar .md como texto"
echo "  [V13] ALTO     - prompts/schemas/prompt.schema.json no existe"
echo "  [V14] ALTO     - prompts/variables/section-industria.md y section-competencia.md faltantes"
echo "  [V15] ALTO     - __tests__/prompt-registry.test.ts no existe (TDD obligatorio)"
echo "  [V16] MEDIO    - Backend package.json no tiene vitest config"
echo ""
echo "  DIAGRAMA DE FASES / BATERÍA DE PROMPTS:"
echo "  [V17] ALTO     - F4 prompt tiene productos incorrectos (no coinciden con los 8 del diagrama)"
echo "  [V18] MEDIO    - F0 form no captura el 'Documento de Datos Básicos' completo (7 secciones)"
echo ""
echo "Aplicando correcciones..."
echo ""

# =============================================================================
# V01 + V02 + V03 + V04 — Templates HTML + Controladores refactorizados
# =============================================================================
ok "[V02] Creando directorio de templates..."
mkdir -p frontend/templates

# --- TEMPLATE STEP 0 ---
ok "[V02] tpl-step0-clientdata.html"
cat > frontend/templates/tpl-step0-clientdata.html << 'TMPL'
<!-- templates/tpl-step0-clientdata.html -->
<template id="tpl-step0-clientdata">
  <div id="step-0-container" class="step-container space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Marco de Referencia del Cliente</h2>
      <p class="text-gray-500 mt-1">La IA investigará el sector, competencia y mejores prácticas para tu proyecto.</p>
    </div>

    <form id="form-step0" class="space-y-5" novalidate>

      <div class="grid md:grid-cols-2 gap-4">
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Nombre del proyecto *
          </label>
          <input id="input-project-name" name="projectName" type="text" required
            placeholder="Ej: Curso de Seguridad Industrial"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <span class="field-error text-red-500 text-xs hidden">Campo requerido</span>
        </div>

        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Nombre del candidato *
          </label>
          <input id="input-client-name" name="clientName" type="text" required
            placeholder="Nombre completo"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <span class="field-error text-red-500 text-xs hidden">Campo requerido</span>
        </div>

        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Industria / Sector *
          </label>
          <input id="input-industry" name="industry" type="text" required
            placeholder="Ej: Manufactura, Salud, Tecnología Educativa"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <span class="field-error text-red-500 text-xs hidden">Campo requerido</span>
        </div>

        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Correo electrónico
          </label>
          <input id="input-email" name="email" type="email"
            placeholder="correo@empresa.com"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>

      <!-- Sección de datos básicos EC0366 (7 secciones del formato de entrada) -->
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Tema o materia principal del curso *
        </label>
        <input id="input-course-topic" name="courseTopic" type="text" required
          placeholder="Ej: Desarrollo web con IA, Seguridad industrial, Primeros auxilios"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>

      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Nivel deseado del curso
        </label>
        <select id="select-level" name="courseLevel"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
          <option value="basico">Básico</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
          <option value="no_definido">No definido</option>
        </select>
      </div>

      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          ¿Para quién es este curso? (Audiencia objetivo) *
        </label>
        <input id="input-target-audience" name="targetAudience" type="text" required
          placeholder="Ej: Desarrolladores junior, Operadores de planta, Emprendedores"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>

      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          ¿Qué debe lograr el alumno al terminar el curso? *
        </label>
        <textarea id="textarea-expected-outcome" name="expectedOutcome" rows="2" required
          placeholder="Ej: Desplegar una aplicación web funcional en la nube"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Presupuesto estimado
          </label>
          <input id="input-budget" name="budget" type="text"
            placeholder="Ej: $5,000 MXN, no definido, $0"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Plazo para tener el curso listo
          </label>
          <input id="input-deadline" name="deadline" type="text"
            placeholder="Ej: 3 meses, antes de junio, no definido"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>

      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Restricciones conocidas
        </label>
        <input id="input-constraints" name="constraints" type="text"
          placeholder="Ej: Alumnos usan celular, internet lenta, debe ser gratuito"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>

      <button id="btn-submit" type="submit"
        class="btn-primary w-full bg-blue-900 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all disabled:opacity-50">
        ✨ Generar Marco de Referencia con IA
      </button>
    </form>

    <!-- Preview panel -->
    <div id="preview-panel" class="hidden">
      <h3 class="font-semibold text-gray-700 mb-3">📄 Documento generado:</h3>
      <div id="document-preview" class="document-preview bg-gray-50 border border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto text-sm"></div>
      <div class="mt-3 flex gap-2">
        <button id="btn-copy-doc" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          📋 Copiar
        </button>
        <button id="btn-regenerate" class="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50">
          🔄 Regenerar
        </button>
      </div>
    </div>
  </div>
</template>
TMPL

# --- TEMPLATE STEP 1 ---
ok "[V02] tpl-step1-needs.html"
cat > frontend/templates/tpl-step1-needs.html << 'TMPL'
<template id="tpl-step1-needs">
  <div id="step-1-container" class="step-container space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Informe de Necesidades de Capacitación</h2>
      <p class="text-gray-500 mt-1">Identifica la brecha de competencias y define objetivos SMART con Taxonomía de Bloom.</p>
    </div>
    <form id="form-step1" class="space-y-5" novalidate>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Confirma las brechas identificadas *
        </label>
        <textarea id="textarea-confirmed-gaps" name="confirmedGaps" rows="4" required
          placeholder="Describe las brechas de Conocimiento (saber), Habilidad (saber hacer) o Actitud (saber ser) identificadas en el Marco de Referencia..."
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
      </div>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Resultados esperados del curso *
        </label>
        <textarea id="textarea-expected-results" name="expectedResults" rows="3" required
          placeholder="¿Qué podrán hacer los participantes al finalizar el curso?"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
      </div>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Perfil del participante ideal *
        </label>
        <input id="input-participant-profile" name="participantProfile" type="text" required
          placeholder="Ej: Técnicos con 2 años de experiencia en el área, bachillerato terminado"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          ¿Cuántos alumnos esperas?
        </label>
        <input id="input-expected-students" name="expectedStudents" type="text"
          placeholder="Ej: 50 en el primer mes, no definido"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
      </div>
      <button id="btn-submit" type="submit"
        class="btn-primary w-full bg-blue-900 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all disabled:opacity-50">
        ✨ Generar Informe de Necesidades
      </button>
    </form>
    <div id="preview-panel" class="hidden">
      <h3 class="font-semibold text-gray-700 mb-3">📄 Documento generado:</h3>
      <div id="document-preview" class="document-preview bg-gray-50 border border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto text-sm"></div>
      <div class="mt-3 flex gap-2">
        <button id="btn-copy-doc" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">📋 Copiar</button>
        <button id="btn-regenerate" class="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50">🔄 Regenerar</button>
      </div>
    </div>
  </div>
</template>
TMPL

# --- TEMPLATE STEP 2 ---
ok "[V02] tpl-step2-analysis.html"
cat > frontend/templates/tpl-step2-analysis.html << 'TMPL'
<template id="tpl-step2-analysis">
  <div id="step-2-container" class="step-container space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Especificaciones de Análisis y Diseño</h2>
      <p class="text-gray-500 mt-1">Define la modalidad, interactividad, estructura temática y Perfil de Ingreso (obligatorio EC0366).</p>
    </div>
    <form id="form-step2" class="space-y-5" novalidate>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Modalidad *</label>
          <select id="select-modality" name="modality" class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
            <option value="asynchronous">Asincrónico</option>
            <option value="synchronous">Sincrónico</option>
            <option value="blended">Mixto (Blended)</option>
            <option value="self-paced">Autodirigido</option>
          </select>
        </div>
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nivel de interactividad *</label>
          <select id="select-interactivity" name="interactivity" class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
            <option value="low">Nivel 1 - Pasivo (solo lectura/video)</option>
            <option value="medium" selected>Nivel 2-3 - Moderado (quizzes, actividades)</option>
            <option value="high">Nivel 4 - Robusto (simulaciones, gamificación)</option>
          </select>
        </div>
      </div>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Temas principales del curso (uno por línea) *
        </label>
        <textarea id="textarea-main-topics" name="mainTopics" rows="5" required
          placeholder="Módulo 1: Introducción&#10;Módulo 2: Conceptos fundamentales&#10;Módulo 3: Práctica aplicada&#10;Módulo 4: Evaluación final"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 font-mono text-sm"></textarea>
      </div>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Duración estimada (horas)</label>
          <input id="input-estimated-hours" name="estimatedHours" type="number" min="1" max="500"
            placeholder="40"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Disponibilidad semanal del alumno (hrs)</label>
          <input id="input-weekly-hours" name="weeklyAvailability" type="number" min="1" max="40"
            placeholder="5"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Escolaridad mínima requerida (Perfil de Ingreso) *
        </label>
        <input id="input-min-education" name="minEducation" type="text" required
          placeholder="Ej: Bachillerato terminado, Técnico Superior Universitario, Licenciatura"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Conocimientos previos requeridos (Perfil de Ingreso) *
        </label>
        <input id="input-prior-knowledge" name="priorKnowledge" type="text" required
          placeholder="Ej: Conocimiento básico de computación, manejo de correo electrónico"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Habilidades digitales requeridas (Perfil de Ingreso)
        </label>
        <input id="input-digital-skills" name="digitalSkills" type="text"
          placeholder="Ej: Manejo básico de navegador web, descargar archivos"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
      </div>
      <button id="btn-submit" type="submit"
        class="btn-primary w-full bg-blue-900 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all disabled:opacity-50">
        ✨ Generar Especificaciones de Análisis
      </button>
    </form>
    <div id="preview-panel" class="hidden">
      <h3 class="font-semibold text-gray-700 mb-3">📄 Documento generado:</h3>
      <div id="document-preview" class="document-preview bg-gray-50 border border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto text-sm"></div>
      <div class="mt-3 flex gap-2">
        <button id="btn-copy-doc" class="px-4 py-2 border border-gray-300 rounded-lg text-sm">📋 Copiar</button>
        <button id="btn-regenerate" class="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm">🔄 Regenerar</button>
      </div>
    </div>
  </div>
</template>
TMPL

# --- TEMPLATE STEP 3 ---
ok "[V02] tpl-step3-specs.html"
cat > frontend/templates/tpl-step3-specs.html << 'TMPL'
<template id="tpl-step3-specs">
  <div id="step-3-container" class="step-container space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Especificaciones Técnicas y Duración</h2>
      <p class="text-gray-500 mt-1">Define el LMS, reporteo, formatos multimedia y duración calculada del curso.</p>
    </div>
    <form id="form-step3" class="space-y-5" novalidate>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Plataforma LMS *</label>
          <select id="select-platform" name="platform" class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
            <option value="moodle">Moodle</option>
            <option value="talent_lms">TalentLMS</option>
            <option value="canvas">Canvas</option>
            <option value="teachable">Teachable</option>
            <option value="hotmart">Hotmart</option>
            <option value="google_classroom">Google Classroom</option>
            <option value="blackboard">Blackboard</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Razón de la selección</label>
          <input id="input-platform-reason" name="platformReason" type="text"
            placeholder="Ej: Ya tienen licencia, es gratuito, lo conocen los alumnos"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Actividades a reportear (¿qué métricas necesitas?)
        </label>
        <input id="input-reporting-activities" name="reportingActivities" type="text"
          placeholder="Ej: Progreso por módulo, calificaciones, tiempo invertido, fecha de inicio/fin"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div class="grid md:grid-cols-3 gap-4">
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Frecuencia de reportes</label>
          <select id="select-report-frequency" name="reportFrequency" class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
            <option value="daily">Diaria</option>
            <option value="weekly" selected>Semanal</option>
            <option value="perModule">Por módulo</option>
          </select>
        </div>
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Videos (cantidad)</label>
          <input id="input-videos-count" name="videosCount" type="number" min="0"
            placeholder="10"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Duración por video (min)</label>
          <input id="input-video-duration" name="videoDuration" type="number" min="1"
            placeholder="10"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <button id="btn-submit" type="submit"
        class="btn-primary w-full bg-blue-900 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all disabled:opacity-50">
        ✨ Generar Especificaciones Técnicas y Duración
      </button>
    </form>
    <div id="preview-panel" class="hidden">
      <div id="document-preview" class="document-preview bg-gray-50 border border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto text-sm"></div>
      <div class="mt-3 flex gap-2">
        <button id="btn-copy-doc" class="px-4 py-2 border border-gray-300 rounded-lg text-sm">📋 Copiar</button>
        <button id="btn-regenerate" class="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm">🔄 Regenerar</button>
      </div>
    </div>
  </div>
</template>
TMPL

# --- TEMPLATE STEP 4 ---
ok "[V02] tpl-step4-production.html"
cat > frontend/templates/tpl-step4-production.html << 'TMPL'
<template id="tpl-step4-production">
  <div id="step-4-container" class="step-container space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Producción de Contenidos (8 Productos EC0366)</h2>
      <p class="text-gray-500 mt-1">La IA generará los 8 productos obligatorios de los Elementos E1219 y E1220.</p>
    </div>
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <p class="text-blue-800 font-medium text-sm mb-2">📋 Productos que se generarán:</p>
      <div class="grid md:grid-cols-2 gap-1 text-blue-700 text-sm">
        <div>P0: Cronograma de desarrollo (E1219)</div>
        <div>P1: Documento de Información General (E1219)</div>
        <div>P2: Guías de actividades por módulo (E1220)</div>
        <div>P3: Calendario general de actividades (E1220)</div>
        <div>P4: Documentos de texto (E1220, mín. 5 págs)</div>
        <div>P5: Presentación electrónica (E1220)</div>
        <div>P6: Material multimedia - guión de video (E1220)</div>
        <div>P7: Instrumentos de evaluación (E1220)</div>
      </div>
    </div>
    <form id="form-step4" class="space-y-5" novalidate>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          Detalles adicionales para la producción
        </label>
        <textarea id="textarea-production-notes" name="productionNotes" rows="3"
          placeholder="Ej: El curso tendrá 4 módulos de 2 semanas cada uno. Los videos serán screencasts..."
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
      </div>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Fecha de inicio estimada</label>
          <input id="input-start-date" name="startDate" type="date"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="group">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Materiales existentes</label>
          <input id="input-existing-materials" name="existingMaterials" type="text"
            placeholder="Ej: 5 videos, un libro, ninguno"
            class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p class="text-amber-800 text-sm">⚠️ Este es el paso más largo. La IA generará ~8,000 palabras. Puede tardar hasta 2 minutos.</p>
      </div>
      <button id="btn-submit" type="submit"
        class="btn-primary w-full bg-blue-900 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all disabled:opacity-50">
        ✨ Generar 8 Productos de Producción
      </button>
    </form>
    <div id="preview-panel" class="hidden">
      <div id="document-preview" class="document-preview bg-gray-50 border border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto text-sm"></div>
      <div class="mt-3 flex gap-2">
        <button id="btn-copy-doc" class="px-4 py-2 border border-gray-300 rounded-lg text-sm">📋 Copiar</button>
        <button id="btn-regenerate" class="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm">🔄 Regenerar</button>
      </div>
    </div>
  </div>
</template>
TMPL

# --- TEMPLATES STEPS 5-9 (condensed) ---
for step_num in 5 6 7 8 9; do
  case $step_num in
    5) title="Verificación del Curso (E1221)"; desc="Genera checklist técnico y pedagógico, y plantilla de reporte de pruebas."; btn_text="✨ Generar Checklist de Verificación" ;;
    6) title="Anexo de Evidencias"; desc="Documenta las capturas de pantalla y URLs que acreditan el funcionamiento del curso."; btn_text="✨ Generar Anexo de Evidencias" ;;
    7) title="Ajustes Post-Evaluación"; desc="Documenta las correcciones realizadas al curso tras la verificación."; btn_text="✨ Generar Documento de Ajustes" ;;
    8) title="Lista de Verificación de Firmas (F6.2)"; desc="Genera el inventario de los 16 productos y los espacios de firma para el expediente."; btn_text="✨ Generar Lista de Firmas" ;;
    9) title="Finalización del Proceso"; desc="Resumen ejecutivo y descarga del expediente completo."; btn_text="🎉 Generar Resumen Ejecutivo" ;;
  esac

  cat > "frontend/templates/tpl-step${step_num}-$(case $step_num in 5) echo checklist;; 6) echo evidence;; 7) echo adjustments;; 8) echo payment;; 9) echo closing;; esac).html" << TMPL
<template id="tpl-step${step_num}-$(case $step_num in 5) echo checklist;; 6) echo evidence;; 7) echo adjustments;; 8) echo payment;; 9) echo closing;; esac)">
  <div id="step-${step_num}-container" class="step-container space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">${title}</h2>
      <p class="text-gray-500 mt-1">${desc}</p>
    </div>
    <form id="form-step${step_num}" class="space-y-5" novalidate>
      <div class="group">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Notas e información adicional</label>
        <textarea id="textarea-notes" name="notes" rows="5"
          placeholder="Proporciona la información relevante para este paso..."
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
      </div>
      <button id="btn-submit" type="submit"
        class="btn-primary w-full bg-blue-900 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all disabled:opacity-50">
        ${btn_text}
      </button>
    </form>
    <div id="preview-panel" class="hidden">
      <div id="document-preview" class="document-preview bg-gray-50 border border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto text-sm"></div>
      <div class="mt-3 flex gap-2">
        <button id="btn-copy-doc" class="px-4 py-2 border border-gray-300 rounded-lg text-sm">📋 Copiar</button>
        <button id="btn-regenerate" class="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm">🔄 Regenerar</button>
      </div>
    </div>
  </div>
</template>
TMPL
done
ok "[V02] Templates HTML creados (10/10)"

# --- tpl-document-preview.html y tpl-loading.html ---
cat > frontend/templates/tpl-document-preview.html << 'TMPL'
<template id="tpl-document-preview">
  <div class="document-preview-wrapper">
    <div id="document-preview" class="document-preview bg-gray-50 border border-gray-200 rounded-xl p-6 overflow-y-auto text-sm"></div>
  </div>
</template>
TMPL

cat > frontend/templates/tpl-loading.html << 'TMPL'
<template id="tpl-loading">
  <div class="flex flex-col items-center gap-4 py-12">
    <div class="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
    <p id="loading-text" class="text-gray-700 font-medium">Generando documento con IA...</p>
  </div>
</template>
TMPL

ok "[V02] tpl-document-preview.html y tpl-loading.html creados"

# =============================================================================
# V04 + V01 + V03 — Refactorizar controladores para usar TemplateLoader
# Genera un controlador BASE que todos los pasos siguen
# =============================================================================
ok "[V01+V03+V04] Generando controlador base y refactorizando pasos..."

# Crear el controlador base compartido
cat > frontend/src/shared/step.base.ts << 'EOF'
// src/shared/step.base.ts
// Clase base para todos los controladores de pasos del wizard
// Implementa las 7 secciones obligatorias del FRONTEND ARCHITECTURE DOCUMENT

import { TemplateLoader } from './template.loader';
import { postData } from './http.client';
import { ENDPOINTS, buildEndpoint } from './endpoints';
import { showLoading, hideLoading, showError, renderMarkdown } from './ui';
import { wizardStore } from '../stores/wizard.store';
import type { PhaseId, PromptId } from '../types/wizard.types';

// ============================================================================
// 1. TIPOS
// ============================================================================
export interface StepConfig {
  stepNumber: number;
  templateId: string;
  phaseId: PhaseId;
  promptId: PromptId;
}

// ============================================================================
// CLASE BASE
// ============================================================================
export abstract class BaseStep {
  // 2. ESTADO PRIVADO
  protected _container!: HTMLElement;
  protected _config: StepConfig;

  protected _dom: {
    form?: HTMLFormElement;
    btnSubmit?: HTMLButtonElement;
    previewPanel?: HTMLElement;
    documentPreview?: HTMLElement;
    btnCopy?: HTMLButtonElement;
    btnRegenerate?: HTMLButtonElement;
  } = {};

  protected _uiConfig = {
    loadingText: 'Generando documento con IA...',
    submitText: '✨ Generar documento',
    submittingText: '⏳ Generando con IA...',
  };

  constructor(config: StepConfig) {
    this._config = config;
  }

  // 3. CACHÉ DEL DOM
  protected _cacheDOM(): void {
    this._dom.form = this._container.querySelector(`#form-step${this._config.stepNumber}`) ?? undefined;
    this._dom.btnSubmit = this._container.querySelector('#btn-submit') ?? undefined;
    this._dom.previewPanel = this._container.querySelector('#preview-panel') ?? undefined;
    this._dom.documentPreview = this._container.querySelector('#document-preview') ?? undefined;
    this._dom.btnCopy = this._container.querySelector('#btn-copy-doc') ?? undefined;
    this._dom.btnRegenerate = this._container.querySelector('#btn-regenerate') ?? undefined;
  }

  // 4. LÓGICA DE VISTA
  protected _renderPreview(markdown: string): void {
    if (!this._dom.previewPanel || !this._dom.documentPreview) return;
    this._dom.documentPreview.innerHTML = renderMarkdown(markdown);
    this._dom.previewPanel.classList.remove('hidden');
  }

  protected _setLoading(loading: boolean): void {
    if (!this._dom.btnSubmit) return;
    this._dom.btnSubmit.disabled = loading;
    this._dom.btnSubmit.textContent = loading
      ? this._uiConfig.submittingText
      : this._uiConfig.submitText;
  }

  // 5. LÓGICA DE NEGOCIO
  protected _collectFormData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (!this._dom.form) return data;
    new FormData(this._dom.form).forEach((value, key) => { data[key] = value; });
    return data;
  }

  protected async _generateDocument(extraData?: Record<string, unknown>): Promise<void> {
    const state = wizardStore.getState();
    if (!state.projectId) {
      showError('No hay proyecto activo. Regresa al inicio.');
      return;
    }

    const formData = { ...this._collectFormData(), ...extraData };
    const step = state.steps[this._config.stepNumber];

    // Registrar step si no tiene ID
    let stepId = step?.stepId;
    if (!stepId) {
      try {
        const res = await postData<{ stepId: string }>(
          ENDPOINTS.wizard.saveStep,
          { projectId: state.projectId, stepNumber: this._config.stepNumber, inputData: formData }
        );
        if (res.data?.stepId) {
          stepId = res.data.stepId;
          wizardStore.setStepId(this._config.stepNumber, stepId);
        }
      } catch { /* continuar, se reintentará */ }
    }

    if (!stepId) {
      showError('No se pudo registrar el paso. Intenta de nuevo.');
      return;
    }

    this._setLoading(true);
    showLoading(this._uiConfig.loadingText);
    wizardStore.setStepInputData(this._config.stepNumber, formData);

    try {
      const context = wizardStore.buildContext() as {
        projectName: string;
        clientName: string;
        industry?: string;
        email?: string;
        previousData?: Record<string, unknown>;
      };

      const res = await postData<{ documentId: string; content: string }>(
        ENDPOINTS.wizard.generate,
        {
          projectId: state.projectId,
          stepId,
          phaseId: this._config.phaseId,
          promptId: this._config.promptId,
          context,
          userInputs: formData,
        }
      );

      if (res.data) {
        wizardStore.setStepDocument(
          this._config.stepNumber,
          res.data.content,
          res.data.documentId
        );
        this._renderPreview(res.data.content);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al generar el documento');
      wizardStore.setStepStatus(this._config.stepNumber, 'error');
    } finally {
      this._setLoading(false);
      hideLoading();
    }
  }

  // 6. EVENTOS
  protected _bindEvents(): void {
    this._dom.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this._generateDocument();
    });

    this._dom.btnCopy?.addEventListener('click', () => {
      const step = wizardStore.getState().steps[this._config.stepNumber];
      if (step?.documentContent) {
        navigator.clipboard.writeText(step.documentContent)
          .then(() => alert('Documento copiado al portapapeles'));
      }
    });

    this._dom.btnRegenerate?.addEventListener('click', () => {
      void this._generateDocument();
    });
  }

  // 7. API PÚBLICA
  async mount(container: HTMLElement): Promise<void> {
    this._container = container;

    // Cargar template desde archivo (NO HTML embebido)
    const fragment = await TemplateLoader.clone(this._config.templateId);
    container.innerHTML = '';
    container.appendChild(fragment);

    this._cacheDOM();

    // Restaurar datos previos si existen
    const step = wizardStore.getState().steps[this._config.stepNumber];
    if (step?.documentContent) {
      this._renderPreview(step.documentContent);
    }
    if (step?.inputData) {
      this._restoreFormData(step.inputData);
    }

    this._bindEvents();
  }

  protected _restoreFormData(data: Record<string, unknown>): void {
    if (!this._dom.form) return;
    for (const [key, value] of Object.entries(data)) {
      const el = this._dom.form.elements.namedItem(key) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (el && typeof value === 'string') el.value = value;
    }
  }

  getData(): Record<string, unknown> {
    return this._collectFormData();
  }
}
EOF

ok "[V04] step.base.ts creado (clase base con 7 secciones)"

# Generar controladores que usan la clase base y TemplateLoader
generate_controller() {
  local file=$1
  local class_name=$2
  local step_num=$3
  local template_id=$4
  local phase_id=$5
  local prompt_id=$6
  local export_name=$7

  cat > "$file" << EOFC
// src/controllers/${export_name,,}.ts
// Paso ${step_num}: controlador que sigue las 7 secciones del FRONTEND ARCHITECTURE DOCUMENT
// HTML en: /templates/${template_id}.html (NO HTML embebido aquí)

// ============================================================================
// 1. DEPENDENCIAS
// ============================================================================
import { BaseStep } from '../shared/step.base';
import type { PhaseId, PromptId } from '../types/wizard.types';

// ============================================================================
// 2. ESTADO PRIVADO Y CONFIGURACIÓN
// ============================================================================
const _config = {
  stepNumber: ${step_num},
  templateId: '${template_id}',
  phaseId: '${phase_id}' as PhaseId,
  promptId: '${prompt_id}' as PromptId,
};

// ============================================================================
// 3-6. Implementadas en BaseStep (cache DOM, vista, negocio, eventos)
// ============================================================================
class ${class_name} extends BaseStep {
  constructor() {
    super(_config);
    this._uiConfig.loadingText = 'Generando documento para ${phase_id}...';
  }
}

// ============================================================================
// 7. API PÚBLICA (export const — patrón del FRONTEND ARCHITECTURE DOCUMENT)
// ============================================================================
const _instance = new ${class_name}();

export const ${export_name} = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
EOFC
}

generate_controller "frontend/src/controllers/step0.clientdata.ts" "Step0ClientData" "0" "tpl-step0-clientdata" "F0" "F0" "Step0ClientData"
generate_controller "frontend/src/controllers/step1.needs.ts" "Step1Needs" "1" "tpl-step1-needs" "F1" "F1" "Step1Needs"
generate_controller "frontend/src/controllers/step2.analysis.ts" "Step2Analysis" "2" "tpl-step2-analysis" "F2" "F2" "Step2Analysis"
generate_controller "frontend/src/controllers/step3.specs.ts" "Step3Specs" "3" "tpl-step3-specs" "F3" "F3" "Step3Specs"
generate_controller "frontend/src/controllers/step4.production.ts" "Step4Production" "4" "tpl-step4-production" "F4" "F4" "Step4Production"
generate_controller "frontend/src/controllers/step5.checklist.ts" "Step5Checklist" "5" "tpl-step5-checklist" "F5.1" "F5" "Step5Checklist"
generate_controller "frontend/src/controllers/step6.evidence.ts" "Step6Evidence" "6" "tpl-step6-evidence" "F5.2" "F5_2" "Step6Evidence"
generate_controller "frontend/src/controllers/step7.adjustments.ts" "Step7Adjustments" "7" "tpl-step7-adjustments" "F6.1" "F6" "Step7Adjustments"
generate_controller "frontend/src/controllers/step8.payment.ts" "Step8Payment" "8" "tpl-step8-payment" "F6.2" "F6_2" "Step8Payment"
generate_controller "frontend/src/controllers/step9.closing.ts" "Step9Closing" "9" "tpl-step9-closing" "CLOSE" "F6_2" "Step9Closing"

ok "[V01+V03+V04+V10] 10 controladores refactorizados (sin HTML embebido, con TemplateLoader, API correcta)"

# =============================================================================
# V05 — shared/validationEngine.ts (faltaba)
# =============================================================================
ok "[V05] Creando shared/validationEngine.ts..."
cat > frontend/src/shared/validationEngine.ts << 'EOF'
// src/shared/validationEngine.ts
// Motor de validación de formularios (requerido por FRONTEND ARCHITECTURE DOCUMENT)

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  custom?: (value: string) => string | null;
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateForm(
  form: HTMLFormElement,
  schema: ValidationSchema
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [fieldName, rules] of Object.entries(schema)) {
    const el = form.elements.namedItem(fieldName) as HTMLInputElement | null;
    if (!el) continue;

    const value = el.value.trim();

    if (rules.required && !value) {
      errors[fieldName] = 'Este campo es requerido';
      continue;
    }

    if (value && rules.minLength && value.length < rules.minLength) {
      errors[fieldName] = `Mínimo ${rules.minLength} caracteres`;
      continue;
    }

    if (value && rules.maxLength && value.length > rules.maxLength) {
      errors[fieldName] = `Máximo ${rules.maxLength} caracteres`;
      continue;
    }

    if (value && rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[fieldName] = 'Correo electrónico inválido';
      continue;
    }

    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors[fieldName] = 'Formato inválido';
      continue;
    }

    if (value && rules.custom) {
      const customError = rules.custom(value);
      if (customError) errors[fieldName] = customError;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function displayErrors(
  form: HTMLFormElement,
  errors: Record<string, string>
): void {
  // Limpiar errores anteriores
  form.querySelectorAll('.field-error').forEach((el) => {
    el.textContent = '';
    el.classList.add('hidden');
  });
  form.querySelectorAll('.input-field').forEach((el) => {
    el.classList.remove('border-red-500');
  });

  // Mostrar nuevos errores
  for (const [fieldName, message] of Object.entries(errors)) {
    const input = form.elements.namedItem(fieldName) as HTMLElement | null;
    if (!input) continue;

    input.classList.add('border-red-500');

    // Buscar el elemento de error adyacente
    const errorEl = input.parentElement?.querySelector('.field-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }
}

export function clearErrors(form: HTMLFormElement): void {
  displayErrors(form, {});
}
EOF

# =============================================================================
# V06 — shared/pubsub.ts (faltaba)
# =============================================================================
ok "[V06] Creando shared/pubsub.ts..."
cat > frontend/src/shared/pubsub.ts << 'EOF'
// src/shared/pubsub.ts
// Event bus para comunicación entre módulos (requerido por FRONTEND ARCHITECTURE DOCUMENT)

type Handler<T = unknown> = (data: T) => void;

class PubSubClass {
  private events: Map<string, Handler[]> = new Map();

  subscribe<T>(event: string, handler: Handler<T>): () => void {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event)!.push(handler as Handler);

    return () => {
      const handlers = this.events.get(event) ?? [];
      this.events.set(event, handlers.filter((h) => h !== handler));
    };
  }

  publish<T>(event: string, data: T): void {
    (this.events.get(event) ?? []).forEach((h) => h(data));
  }

  once<T>(event: string, handler: Handler<T>): void {
    const unsub = this.subscribe<T>(event, (data) => {
      handler(data);
      unsub();
    });
  }
}

export const pubsub = new PubSubClass();

// Eventos tipados del sistema
export const EVENTS = {
  WIZARD_NEXT_STEP: 'wizard:nextStep',
  WIZARD_PREV_STEP: 'wizard:prevStep',
  WIZARD_STEP_COMPLETE: 'wizard:stepComplete',
  DOCUMENT_GENERATED: 'document:generated',
  AUTH_STATE_CHANGED: 'auth:stateChanged',
} as const;
EOF

# =============================================================================
# V07 — wizard.types.ts completo según la especificación
# =============================================================================
ok "[V07] Reemplazando wizard.types.ts con tipos completos del spec..."
cat > frontend/src/types/wizard.types.ts << 'EOF'
// src/types/wizard.types.ts
// Tipos completos según FRONTEND ARCHITECTURE DOCUMENT (sección 10)

// ============================================================================
// ENUMS / UNIONS
// ============================================================================
export type PhaseId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5.1' | 'F5.2' | 'F6.1' | 'F6.2' | 'CLOSE';
export type PromptId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F5_2' | 'F6' | 'F6_2';
export type StepStatus = 'pending' | 'processing' | 'completed' | 'error';

// ============================================================================
// STEP
// ============================================================================
export interface WizardStep {
  stepNumber: number;
  phaseId: PhaseId;
  promptId: PromptId;
  label: string;
  icon: string;
  status: StepStatus;
  inputData: Record<string, unknown>;
  documentContent?: string;
  documentId?: string;
  stepId?: string;
}

// ============================================================================
// DATOS POR FASE (del FRONTEND ARCHITECTURE DOCUMENT sección 10)
// ============================================================================
export interface ClientData {
  clientName: string;
  projectName: string;
  industry: string;
  email: string;
  courseTopic?: string;
  courseLevel?: string;
  targetAudience?: string;
  expectedOutcome?: string;
  budget?: string;
  deadline?: string;
  constraints?: string;
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

export interface NeedsData {
  confirmedGaps: string;
  expectedResults: string;
  participantProfile: string;
  expectedStudents?: string;
  gapAnalysis?: GapAnalysisItem[];
  smartObjective?: SmartObjective;
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
  hardware?: string;
  internetSpeed?: string;
  weeklyAvailability: number;
}

export interface AnalysisData {
  modality: 'asynchronous' | 'synchronous' | 'blended' | 'self-paced';
  interactivity: 'low' | 'medium' | 'high';
  mainTopics: string;
  estimatedHours?: number;
  weeklyAvailability?: number;
  minEducation: string;
  priorKnowledge: string;
  digitalSkills?: string;
  modules?: Module[];
  profile?: Profile;
}

export interface ReportingConfig {
  activities: string[];
  frequency: 'daily' | 'weekly' | 'perModule';
  recipients?: string[];
}

export interface DurationCalculation {
  videosCount?: number;
  videoDuration?: number;
  totalHours?: number;
}

export interface SpecsData {
  platform: string;
  platformReason?: string;
  reportingActivities?: string;
  reportFrequency: 'daily' | 'weekly' | 'perModule';
  videosCount?: number;
  videoDuration?: number;
  reporting?: ReportingConfig;
  duration?: DurationCalculation;
}

export interface ProductionData {
  productionNotes?: string;
  startDate?: string;
  existingMaterials?: string;
  // Productos generados por IA
  cronograma?: unknown;
  infoGeneral?: unknown;
  guias?: unknown[];
  calendario?: unknown;
  documentosTexto?: unknown[];
  presentacion?: unknown;
  multimedia?: unknown;
  instrumentosEvaluacion?: unknown;
}

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  completed: boolean;
  observation?: string;
}

export interface ChecklistData {
  notes?: string;
  items?: ChecklistItem[];
  lastUpdated?: string;
}

export interface ScreenshotEvidence {
  code: string;
  description: string;
  url?: string;
  taken: boolean;
}

export interface EvidenceData {
  notes?: string;
  screenshots?: ScreenshotEvidence[];
  lmsPlatform?: string;
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
  notes?: string;
  observations?: Observation[];
  summary?: { corrected: number; pending: number; rejected: number };
}

export interface Signature {
  role: string;
  name: string;
  signed: boolean;
  signatureDate?: string;
}

export interface PaymentData {
  notes?: string;
  signatures?: Signature[];
  candidateName?: string;
  reviewerName?: string;
  certifyingOrg?: string;
}

export interface ClosingData {
  notes?: string;
  finalApproval?: boolean;
  completionDate?: string;
}

// ============================================================================
// WIZARD STATE (coincide con FRONTEND ARCHITECTURE DOCUMENT sección 9)
// ============================================================================
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
  // Steps metadata para el progress indicator
  steps: WizardStep[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
EOF

# =============================================================================
# V08 — wizard.store.ts reescrito según el FRONTEND ARCHITECTURE DOCUMENT
# =============================================================================
ok "[V08] Reescribiendo wizard.store.ts según el spec..."
cat > frontend/src/stores/wizard.store.ts << 'EOF'
// src/stores/wizard.store.ts
// Singleton — FRONTEND ARCHITECTURE DOCUMENT sección 9
import type {
  WizardState, WizardStep, StepStatus,
  ClientData, NeedsData, AnalysisData, SpecsData,
  ProductionData, ChecklistData, EvidenceData,
  AdjustmentsData, PaymentData, ClosingData,
  PhaseId, PromptId,
} from '../types/wizard.types';

type Listener = (state: WizardState) => void;
const STORAGE_KEY = 'knowto_wizard_state';

const STEP_DEFINITIONS: Omit<WizardStep, 'status' | 'inputData'>[] = [
  { stepNumber: 0, phaseId: 'F0',    promptId: 'F0',   label: 'Marco de Referencia', icon: 'search' },
  { stepNumber: 1, phaseId: 'F1',    promptId: 'F1',   label: 'Necesidades',         icon: 'analytics' },
  { stepNumber: 2, phaseId: 'F2',    promptId: 'F2',   label: 'Análisis',            icon: 'architecture' },
  { stepNumber: 3, phaseId: 'F3',    promptId: 'F3',   label: 'Especificaciones',    icon: 'settings' },
  { stepNumber: 4, phaseId: 'F4',    promptId: 'F4',   label: 'Producción',          icon: 'construction' },
  { stepNumber: 5, phaseId: 'F5.1',  promptId: 'F5',   label: 'Verificación',        icon: 'fact_check' },
  { stepNumber: 6, phaseId: 'F5.2',  promptId: 'F5_2', label: 'Evidencias',          icon: 'photo_library' },
  { stepNumber: 7, phaseId: 'F6.1',  promptId: 'F6',   label: 'Ajustes',             icon: 'tune' },
  { stepNumber: 8, phaseId: 'F6.2',  promptId: 'F6_2', label: 'Firmas',              icon: 'draw' },
  { stepNumber: 9, phaseId: 'CLOSE', promptId: 'F6_2', label: 'Finalización',        icon: 'celebration' },
];

const initialState: WizardState = {
  currentStep: 0,
  projectId: null,
  clientData: { clientName: '', projectName: '', industry: '', email: '' },
  needsData: null,
  analysisData: null,
  specsData: null,
  productionData: null,
  checklistData: null,
  evidenceData: null,
  adjustmentsData: null,
  paymentData: null,
  closingData: null,
  steps: STEP_DEFINITIONS.map((d) => ({ ...d, status: 'pending' as StepStatus, inputData: {} })),
};

class WizardStoreClass {
  private state: WizardState = { ...initialState };
  private listeners: Listener[] = [];

  constructor() { this.loadFromLocalStorage(); }

  // Suscripción
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  private notify(): void { this.listeners.forEach((l) => l(this.state)); }

  // Persistencia
  private saveToLocalStorage(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* silent */ }
  }

  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) this.state = { ...initialState, ...JSON.parse(saved) as WizardState };
    } catch { /* silent */ }
  }

  // Getters
  getState(): WizardState { return { ...this.state }; }
  getCurrentStep(): number { return this.state.currentStep; }
  getProjectId(): string | null { return this.state.projectId; }
  getClientData(): ClientData { return { ...this.state.clientData }; }

  getStepData<T>(stepId: number): T | null {
    const keys: Record<number, keyof WizardState> = {
      0: 'clientData', 1: 'needsData', 2: 'analysisData', 3: 'specsData',
      4: 'productionData', 5: 'checklistData', 6: 'evidenceData',
      7: 'adjustmentsData', 8: 'paymentData', 9: 'closingData',
    };
    const key = keys[stepId];
    return key ? (this.state[key] as T) ?? null : null;
  }

  // Setters del FRONTEND ARCHITECTURE DOCUMENT
  setCurrentStep(step: number): void { this.state.currentStep = step; this.saveToLocalStorage(); this.notify(); }
  setProjectId(id: string): void { this.state.projectId = id; this.saveToLocalStorage(); this.notify(); }
  setClientData(data: Partial<ClientData>): void {
    this.state.clientData = { ...this.state.clientData, ...data };
    this.saveToLocalStorage(); this.notify();
  }

  setStepData(stepId: number, data: unknown): void {
    const keys: Record<number, keyof WizardState> = {
      0: 'clientData', 1: 'needsData', 2: 'analysisData', 3: 'specsData',
      4: 'productionData', 5: 'checklistData', 6: 'evidenceData',
      7: 'adjustmentsData', 8: 'paymentData', 9: 'closingData',
    };
    const key = keys[stepId];
    if (key) { (this.state as Record<string, unknown>)[key] = data; this.saveToLocalStorage(); this.notify(); }
  }

  // Métodos de Steps (metadata del wizard)
  setStepStatus(stepNumber: number, status: StepStatus): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber]; if (!s) return;
    steps[stepNumber] = { ...s, status };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage(); this.notify();
  }

  setStepDocument(stepNumber: number, content: string, documentId: string): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber]; if (!s) return;
    steps[stepNumber] = { ...s, documentContent: content, documentId, status: 'completed' };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage(); this.notify();
  }

  setStepId(stepNumber: number, stepId: string): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber]; if (!s) return;
    steps[stepNumber] = { ...s, stepId };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage();
  }

  setStepInputData(stepNumber: number, data: Record<string, unknown>): void {
    const steps = [...this.state.steps];
    const s = steps[stepNumber]; if (!s) return;
    steps[stepNumber] = { ...s, inputData: data };
    this.state = { ...this.state, steps };
    this.saveToLocalStorage();
  }

  // Navegación
  nextStep(): void { if (this.state.currentStep < 9) this.setCurrentStep(this.state.currentStep + 1); }
  prevStep(): void { if (this.state.currentStep > 0) this.setCurrentStep(this.state.currentStep - 1); }
  goToStep(n: number): void { if (n >= 0 && n <= 9) this.setCurrentStep(n); }

  reset(): void {
    this.state = { ...initialState, steps: STEP_DEFINITIONS.map((d) => ({ ...d, status: 'pending' as StepStatus, inputData: {} })) };
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }

  // Construir contexto acumulado para el prompt
  buildContext(): Record<string, unknown> {
    const prev: Record<string, unknown> = {};
    this.state.steps.filter((s) => s.status === 'completed').forEach((s) => {
      prev[s.phaseId] = { inputData: s.inputData, content: s.documentContent };
    });
    return {
      projectName: this.state.clientData.projectName,
      clientName: this.state.clientData.clientName,
      industry: this.state.clientData.industry,
      email: this.state.clientData.email,
      previousData: prev,
    };
  }
}

export const wizardStore = new WizardStoreClass();
EOF

# =============================================================================
# V09 — endpoints.ts corregido según el spec (con buildEndpoint)
# =============================================================================
ok "[V09] Corrigiendo endpoints.ts según el FRONTEND ARCHITECTURE DOCUMENT..."
cat > frontend/src/shared/endpoints.ts << 'EOF'
// src/shared/endpoints.ts
// SSOT: Única fuente de verdad para todas las URLs de la API
// FRONTEND ARCHITECTURE DOCUMENT sección 8

export const ENDPOINTS = {
  // Base del backend
  backend: import.meta.env.VITE_API_URL ?? 'http://localhost:8787',

  // Auth
  auth: {
    me: '/api/auth/me',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },

  // Wizard
  wizard: {
    createProject: '/api/wizard/project',
    saveStep: '/api/wizard/step',
    generate: '/api/wizard/generate',
    getProject: (projectId: string) => `/api/wizard/project/${projectId}`,
    listProjects: '/api/wizard/projects',
    getProgress: '/api/wizard/progress',
  },

  // Documents
  documents: {
    generate: '/api/documents/generate',
    get: (documentId: string) => `/api/documents/${documentId}`,
    list: (projectId: string) => `/api/documents/project/${projectId}`,
  },

  // Health
  health: '/api/health',
} as const;

// Helper para construir URLs completas (FRONTEND ARCHITECTURE DOCUMENT)
export function buildEndpoint(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      url = url.replace(`:${k}`, String(v));
    });
  }
  return `${ENDPOINTS.backend}${url}`;
}
EOF

# =============================================================================
# V11 — backend/package.json: agregar @hono/zod-validator
# =============================================================================
ok "[V11] Agregando @hono/zod-validator a backend/package.json..."
cat > backend/package.json << 'EOF'
{
  "name": "knowto-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev src/index.ts --port 8787",
    "build": "tsc",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:prompts": "vitest run --reporter verbose src/__tests__/prompts"
  },
  "dependencies": {
    "@hono/zod-validator": "^0.2.1",
    "@supabase/supabase-js": "^2.39.0",
    "hono": "^4.1.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240222.0",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0",
    "wrangler": "^3.28.4"
  }
}
EOF

# =============================================================================
# V12 — wrangler.toml: reglas para importar .md como texto
# =============================================================================
ok "[V12] Corrigiendo wrangler.toml para importar .md files como texto..."
cat > backend/wrangler.toml << 'EOF'
name = "knowto-backend"
main = "src/index.ts"
compatibility_date = "2024-03-15"
compatibility_flags = ["nodejs_compat"]

[ai]
binding = "AI"

[vars]
ENVIRONMENT = "development"

# Reglas para que wrangler empaquete los .md como módulos de texto
[[rules]]
type = "Text"
globs = ["**/*.md"]
fallthrough = true

[env.production]
name = "knowto-backend-production"

[env.production.vars]
ENVIRONMENT = "production"
EOF

# =============================================================================
# V13 — prompts/schemas/prompt.schema.json (faltaba)
# =============================================================================
ok "[V13] Creando prompts/schemas/prompt.schema.json..."
cat > backend/src/prompts/schemas/prompt.schema.json << 'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "KnowTo Prompt File Schema",
  "description": "Esquema para validar archivos de prompt del sistema EC0366",
  "type": "object",
  "required": ["id", "name", "version", "tags"],
  "properties": {
    "id": {
      "type": "string",
      "enum": ["F0", "F1", "F2", "F3", "F4", "F5", "F5_2", "F6", "F6_2"],
      "description": "Identificador único del prompt"
    },
    "name": {
      "type": "string",
      "minLength": 5,
      "description": "Nombre descriptivo del prompt"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Versión semántica del prompt"
    },
    "author": {
      "type": "string",
      "description": "Autor del prompt"
    },
    "last_updated": {
      "type": "string",
      "description": "Fecha de última actualización"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "description": "Etiquetas para clasificar el prompt"
    }
  }
}
EOF

# =============================================================================
# V14 — Variables de prompt faltantes
# =============================================================================
ok "[V14] Creando variables de prompt faltantes..."
cat > backend/src/prompts/variables/section-industria.md << 'EOF'
## CONTEXTO DE INDUSTRIA

Al analizar el sector del cliente, considera:
- Tamaño y tendencias del mercado (últimos 2-3 años)
- Regulaciones y certificaciones obligatorias (NOM, CONOCER, SEP)
- Desafíos comunes del sector (dolores no resueltos)
- Actores principales y competidores relevantes
EOF

cat > backend/src/prompts/variables/section-competencia.md << 'EOF'
## ANÁLISIS DE COMPETENCIA

Para cada competidor identificado, documenta:
- Nombre del curso y plataforma (Udemy, Coursera, Hotmart, Crehana, Platzi, LinkedIn Learning)
- Precio aproximado
- Número de alumnos (si está disponible)
- Calificación y duración
- Enfoque o propuesta única
- Lo que los alumnos critican (reseñas negativas = oportunidades)

**Análisis de brecha:**
- ¿Qué hacen bien los competidores?
- ¿Qué NO están cubriendo? (oportunidad para el cliente)
- ¿El cliente tiene diferenciación real o entra a un mercado saturado?
EOF

# =============================================================================
# V15 — Test de Prompt Registry (TDD obligatorio)
# =============================================================================
ok "[V15] Creando __tests__/prompt-registry.test.ts..."
mkdir -p backend/src/__tests__/prompts
cat > backend/src/__tests__/prompts/prompt-registry.test.ts << 'EOF'
// __tests__/prompts/prompt-registry.test.ts
// TDD: Validación del Prompt Registry (BACKEND ARCHITECTURE DOCUMENT sección 8)
import { describe, it, expect, beforeEach } from 'vitest';
import { getPromptRegistry } from '../../prompts';
import type { PromptId } from '../../types/wizard.types';

const ALL_PROMPT_IDS: PromptId[] = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F5_2', 'F6', 'F6_2'];

describe('PromptRegistry', () => {
  let registry: ReturnType<typeof getPromptRegistry>;

  beforeEach(() => {
    registry = getPromptRegistry();
  });

  it('debe cargar todos los prompts requeridos', () => {
    for (const id of ALL_PROMPT_IDS) {
      expect(() => registry.get(id)).not.toThrow();
    }
  });

  it('cada prompt debe tener metadata válida', () => {
    for (const id of ALL_PROMPT_IDS) {
      const entry = registry.get(id);
      expect(entry.metadata.id).toBeTruthy();
      expect(entry.metadata.name).toBeTruthy();
      expect(entry.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(Array.isArray(entry.metadata.tags)).toBe(true);
      expect(entry.metadata.tags.length).toBeGreaterThan(0);
    }
  });

  it('cada prompt debe contener la variable {{context}}', () => {
    for (const id of ALL_PROMPT_IDS) {
      const entry = registry.get(id);
      expect(entry.content).toContain('{{context}}');
    }
  });

  it('debe renderizar variables correctamente', () => {
    const rendered = registry.render('F0', {
      context: '{"projectName":"Test","clientName":"Juan"}',
      userInputs: '{}',
    });
    expect(rendered).toContain('{"projectName":"Test","clientName":"Juan"}');
    expect(rendered).not.toContain('{{context}}');
  });

  it('debe lanzar error para un ID inexistente', () => {
    expect(() => registry.get('INVALID' as PromptId)).toThrow();
  });

  it('cada prompt debe tener más de 200 caracteres (externalización obligatoria)', () => {
    for (const id of ALL_PROMPT_IDS) {
      const entry = registry.get(id);
      expect(entry.content.length).toBeGreaterThan(200);
    }
  });
});
EOF

# =============================================================================
# V17 — F4 prompt corregido con los 8 productos correctos del diagrama de fases
# =============================================================================
ok "[V17] Corrigiendo F4-produccion.md con los 8 productos del diagrama de fases..."
cat > backend/src/prompts/templates/F4-produccion.md << 'PROMPT'
---
id: F4
name: Producción de Contenidos EC0366
version: 2.0.0
author: KnowTo Team
last_updated: 2026-04-04
tags: [produccion, EC0366, E1219, E1220, 8-productos]
---

Actúa como un diseñador instruccional certificable en el estándar EC0366 "Desarrollo de cursos de formación en línea" del CONOCER.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## INSTRUCCIÓN PRINCIPAL
Genera los 8 PRODUCTOS DE PRODUCCIÓN exactos requeridos por los Elementos E1219 y E1220 del EC0366, en el orden y formato que se indica. NO omitas ninguno. NO cambies el orden.

---

# PRODUCTOS DE PRODUCCIÓN EC0366
**Proyecto:** [extraer de contexto]
**Candidato:** [extraer clientName del contexto]
**Fecha de elaboración:** [fecha actual]
**Folio:** EC0366-PROD-[año][4 dígitos]

---

## PRODUCTO 0: CRONOGRAMA DE DESARROLLO (E1219 - producto #1)

**Curso:** [título del curso - del contexto]
**Desarrollador:** [clientName]
**Objetivo general:** [del contexto F2/F1]

| # | Actividad | Tiempo estimado | Fecha inicio | Fecha fin | Responsable |
|:---|:---|:---|:---|:---|:---|
| 1 | Elaborar estructura temática del curso | [N] días | [fecha] | [fecha] | [clientName] |
| 2 | Desarrollar documento de información general | [N] días | [fecha] | [fecha] | [clientName] |
| 3 | Diseñar guías de actividades por módulo | [N] días | [fecha] | [fecha] | [clientName] |
| 4 | Elaborar calendario general de actividades | [N] días | [fecha] | [fecha] | [clientName] |
| 5 | Desarrollar documentos de texto (contenido) | [N] días | [fecha] | [fecha] | [clientName] |
| 6 | Crear presentación electrónica | [N] días | [fecha] | [fecha] | [clientName] |
| 7 | Producir material multimedia (guión de video) | [N] días | [fecha] | [fecha] | [clientName] |
| 8 | Diseñar instrumentos de evaluación | [N] días | [fecha] | [fecha] | [clientName] |
| 9 | Configurar curso en plataforma LMS | [N] días | [fecha] | [fecha] | [clientName] |
| 10 | Verificar funcionamiento técnico | [N] días | [fecha] | [fecha] | [clientName] |

**Firmas:**
| Rol | Nombre | Firma | Fecha |
|:---|:---|:---|:---|
| Elaboró | [clientName] | _________________ | [fecha] |
| Revisó | [nombre del revisor] | _________________ | [fecha] |

---

## PRODUCTO 1: DOCUMENTO DE INFORMACIÓN GENERAL (E1219 - producto #2)

### 1.1 Título del curso
[Título completo y descriptivo del curso]

### 1.2 Objetivo general del curso
El participante, al terminar el curso, **[verbo cognitivo Bloom]** [conocimiento/habilidad principal], **[verbo psicomotor]** [habilidad práctica], y **[verbo afectivo]** [actitud/valor], con la finalidad de [beneficio concreto y medible].

### 1.3 Objetivos particulares
- **Cognitivo:** [verbo] [qué] a través de [medio]
- **Psicomotor:** [verbo] [qué] a través de [medio]  
- **Afectivo:** [verbo] [qué] a través de [medio]

### 1.4 Perfil de ingreso
[Del análisis previo en F2 — conocimientos, habilidades, escolaridad mínima]

### 1.5 Perfil de egreso
Al terminar el curso, el participante será capaz de:
1. [Competencia 1]
2. [Competencia 2]
3. [Competencia 3]

### 1.6 Introducción al curso
[2-3 párrafos que contextualizan el curso: relevancia del tema, qué problema resuelve, cómo está estructurado]

### 1.7 Guía visual de navegación
[Descripción de cómo está organizado el curso visualmente: menús, progresión de módulos, íconos de navegación]

### 1.8 Metodología de trabajo
**A. Cómo se va a enseñar:** [técnicas instruccionales, secuencia didáctica]
**B. Cómo se trabaja con el participante:** [rol del instructor/tutor, tipo de interacción]
**C. Cómo se logra el aprendizaje:** [práctica, demostración, retroalimentación]

### 1.9 Requisitos tecnológicos
| Requisito | Especificación |
|:---|:---|
| Hardware | [especificación mínima] |
| Software | [lista] |
| Conectividad | [velocidad mínima] |
| Dispositivos | [PC, tablet, móvil] |

### 1.10 Forma de evaluación
| Tipo | Peso | Descripción |
|:---|:---|:---|
| Diagnóstica | 0% | [descripción] |
| Formativa | [%] | [descripción] |
| Sumativa | [%] | [descripción] |
| Calificación mínima aprobatoria | [%] | |

### 1.11 Duración del curso
[Del contexto F3 — horas totales, semanas, distribución]

---

## PRODUCTO 2: GUÍAS DE ACTIVIDADES POR MÓDULO (E1220 - producto #1)

[Para cada módulo identificado en el contexto F2, genera una tabla:]

### MÓDULO 1: [Nombre del módulo]
**Objetivo específico:** [texto]

| Título de actividad | Instrucciones | Materiales/recursos | Forma de participación | Medio de entrega | Periodo | Ponderación | Criterios de evaluación |
|:---|:---|:---|:---|:---|:---|:---|:---|
| [Act. 1.1: nombre] | [pasos detallados] | [recursos necesarios] | [Individual/Grupal] | [Foro/Buzón/Plataforma] | [días N-M] | [%] | [criterio medible] |
| [Act. 1.2: nombre] | [pasos detallados] | [recursos necesarios] | [Individual/Grupal] | [Foro/Buzón/Plataforma] | [días N-M] | [%] | [criterio medible] |

[Repetir para cada módulo]

---

## PRODUCTO 3: CALENDARIO GENERAL DE ACTIVIDADES (E1220 - producto #2)

| Semana | Módulo | Actividades | Ponderación | Fecha de apertura | Fecha de cierre |
|:---|:---|:---|:---|:---|:---|
| 1 | [Módulo 1] | [Act. 1.1, 1.2] | [%] | [fecha] | [fecha] |
| 2 | [Módulo 1-2] | [Act. 1.3, 2.1] | [%] | [fecha] | [fecha] |
| [N] | [Módulo N] | [actividades] | [%] | [fecha] | [fecha] |

**Total del curso:** [N semanas] | [N horas] | Inicio: [fecha] | Cierre: [fecha]

---

## PRODUCTO 4: DOCUMENTOS DE TEXTO (E1220 - producto #3)

[Genera al menos 5 páginas de contenido educativo desarrollado para los temas principales. Para cada tema principal del curso:]

### [TEMA 1: Nombre]

**Introducción**
[2-3 párrafos de introducción al tema]

**Desarrollo**
[Contenido detallado del tema con subtemas, ejemplos, casos de uso]

**Conceptos clave**
- **[Término 1]:** [definición]
- **[Término 2]:** [definición]

**Ejemplo práctico**
[Caso de uso real relacionado con el sector del cliente]

**Puntos para recordar**
1. [Punto 1]
2. [Punto 2]
3. [Punto 3]

[Repetir para tema 2 y tema 3 al menos]

---

## PRODUCTO 5: PRESENTACIÓN ELECTRÓNICA (E1220 - producto #4)

### Estructura de diapositivas — [Módulo 1: Nombre]

| Diap. | Título | Contenido | Notas del presentador |
|:---|:---|:---|:---|
| 1 | [Título del curso] | Logo, título, nombre del instructor, fecha | Bienvenida |
| 2 | Agenda del módulo | Lista de temas a cubrir | Contextualizar |
| 3 | Objetivo específico | "Al finalizar este módulo, el participante..." | Motivar |
| 4 | [Tema 1.1] | [Puntos clave en bullets, imagen/diagrama] | [Explicación detallada] |
| 5 | [Tema 1.2] | [Puntos clave en bullets] | [Explicación detallada] |
| 6 | Ejemplo práctico | [Caso de uso real] | Conectar con la realidad del alumno |
| 7 | Actividad | [Instrucciones de la actividad práctica] | Dar tiempo suficiente |
| 8 | Resumen del módulo | [Los 3 puntos más importantes] | Reforzar |
| 9 | Recursos adicionales | [Referencias, links, lecturas sugeridas] | Opcional |
| 10 | Siguiente módulo | [Preview del módulo 2] | Mantener motivación |

---

## PRODUCTO 6: MATERIAL MULTIMEDIA — GUIÓN DE VIDEO (E1220 - producto #5)

### VIDEO 1: [Título del video de introducción]
**Duración estimada:** [N] minutos
**Objetivo:** [Qué aprenderá el alumno con este video]

| Tiempo | Plano/Vista | Acción en pantalla | Diálogo / Narración |
|:---|:---|:---|:---|
| 0:00 - 0:15 | Pantalla de título | Animación del título del curso | [Narración de bienvenida] |
| 0:15 - 0:45 | Plano medio del instructor | Instructor frente a cámara | "[Texto del diálogo]" |
| 0:45 - 2:00 | Screen Share | Demostración en pantalla del [tema] | "[Narración explicando los pasos]" |
| 2:00 - 2:30 | Plano medio | Cierre con instrucciones de actividad | "[Texto del cierre]" |

**Recursos técnicos:** Software de grabación recomendado: [Loom/Camtasia/OBS]. Resolución: 1920x1080. Música de fondo: [estilo sugerido].

---

## PRODUCTO 7: INSTRUMENTOS DE EVALUACIÓN (E1220 - producto #6)

### 7.1 CUESTIONARIO DIAGNÓSTICO (Obligatorio)
**Instrucciones:** Selecciona la respuesta correcta. Tiempo máximo: 10 minutos.

| # | Pregunta | Opciones | Respuesta correcta | Puntos |
|:---|:---|:---|:---|:---|
| 1 | [Pregunta sobre conocimiento previo 1] | a) [op] b) [op] c) [op] d) [op] | [letra] | 10 |
| 2 | [Pregunta sobre conocimiento previo 2] | a) [op] b) [op] c) [op] d) [op] | [letra] | 10 |
| 3 | [Pregunta sobre conocimiento previo 3] | Verdadero / Falso | [V/F] | 10 |

### 7.2 RÚBRICA DE EVALUACIÓN (Obligatorio — mínimo 4 criterios, 3 niveles)

**Actividad evaluada:** [Proyecto/actividad principal del módulo]

| Criterio | Excelente (100%) | Satisfactorio (70%) | Necesita mejora (50%) | Ponderación |
|:---|:---|:---|:---|:---|
| [Criterio 1] | [descripción detallada] | [descripción] | [descripción] | [%] |
| [Criterio 2] | [descripción detallada] | [descripción] | [descripción] | [%] |
| [Criterio 3] | [descripción detallada] | [descripción] | [descripción] | [%] |
| [Criterio 4] | [descripción detallada] | [descripción] | [descripción] | [%] |

### 7.3 LISTA DE COTEJO (Obligatorio)

**Evidencia que se evalúa:** [Entregable del participante]

| # | Criterio | Sí cumple | No cumple | Observaciones |
|:---|:---|:---|:---|:---|
| 1 | [Criterio verificable 1] | ☐ | ☐ | |
| 2 | [Criterio verificable 2] | ☐ | ☐ | |
| 3 | [Criterio verificable 3] | ☐ | ☐ | |
| 4 | [Criterio verificable 4] | ☐ | ☐ | |
| 5 | [Criterio verificable 5] | ☐ | ☐ | |

**Resultado:** ___/5 criterios cumplidos. **Aprobado:** ☐ Sí ☐ No (mínimo 4/5)

---

## RESTRICCIONES DE CALIDAD
- Genera los 8 PRODUCTOS en el orden exacto indicado
- NO omitas ningún producto
- Los instrumentos de evaluación DEBEN incluir: cuestionario + rúbrica + lista de cotejo (obligatorio EC0366)
- La rúbrica DEBE tener mínimo 4 criterios y 3 niveles de desempeño
- Personaliza todo con la información del contexto
- Usa verbos de la taxonomía de Bloom en todos los objetivos
- Responde SOLO en español
PROMPT

ok "[V17] F4-produccion.md corregido con los 8 productos del diagrama de fases"

# =============================================================================
# V16 — vitest.config en backend
# =============================================================================
ok "[V16] Creando vitest.config.ts en backend..."
cat > backend/vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
EOF

# =============================================================================
# Actualizar main.ts para usar la API correcta (mount en vez de initStepN)
# =============================================================================
ok "Actualizando main.ts para usar la API de controladores correcta..."
cat > frontend/src/main.ts << 'EOF'
// src/main.ts
// Orquestador principal — FRONTEND ARCHITECTURE DOCUMENT
import { getCurrentUser, signInWithGoogle, signOut, onAuthStateChange } from './shared/auth';
import { wizardStore } from './stores/wizard.store';
import { showError, showLoading, hideLoading, renderMarkdown } from './shared/ui';
import { getData, postData } from './shared/http.client';
import { buildEndpoint, ENDPOINTS } from './shared/endpoints';

// Importar controladores con la API correcta: { mount, getData }
import { Step0ClientData } from './controllers/step0.clientdata';
import { Step1Needs } from './controllers/step1.needs';
import { Step2Analysis } from './controllers/step2.analysis';
import { Step3Specs } from './controllers/step3.specs';
import { Step4Production } from './controllers/step4.production';
import { Step5Checklist } from './controllers/step5.checklist';
import { Step6Evidence } from './controllers/step6.evidence';
import { Step7Adjustments } from './controllers/step7.adjustments';
import { Step8Payment } from './controllers/step8.payment';
import { Step9Closing } from './controllers/step9.closing';

// Registro de controladores — SSOT para navegación
const STEP_CONTROLLERS = [
  Step0ClientData, Step1Needs, Step2Analysis, Step3Specs, Step4Production,
  Step5Checklist, Step6Evidence, Step7Adjustments, Step8Payment, Step9Closing,
] as const;

// ============================================================================
// DOM REFERENCES
// ============================================================================
const viewAuth = document.getElementById('view-auth')!;
const viewApp  = document.getElementById('view-app')!;
const headerEmail = document.getElementById('header-user-email')!;
const btnGoogleLogin = document.getElementById('btn-google-login')!;
const btnLogout = document.getElementById('btn-logout')!;
const wizardContainer = document.getElementById('wizard-container')!;
const dashboardContainer = document.getElementById('dashboard-container')!;
const wizardProgress = document.getElementById('wizard-progress')!;
const wizardStepContent = document.getElementById('wizard-step-content')!;
const btnPrev = document.getElementById('btn-prev-step') as HTMLButtonElement;
const btnNext = document.getElementById('btn-next-step') as HTMLButtonElement;

// ============================================================================
// AUTH
// ============================================================================
btnGoogleLogin.addEventListener('click', () => { void signInWithGoogle().catch(showError); });
btnLogout.addEventListener('click', () => { void signOut(); });

onAuthStateChange(async (user) => {
  if (user) {
    viewAuth.classList.add('hidden');
    viewApp.classList.remove('hidden');
    headerEmail.textContent = user.email;
    await initDashboard();
  } else {
    viewAuth.classList.remove('hidden');
    viewApp.classList.add('hidden');
  }
});

// ============================================================================
// DASHBOARD
// ============================================================================
async function initDashboard(): Promise<void> {
  dashboardContainer.classList.remove('hidden');
  wizardContainer.classList.add('hidden');

  try {
    const res = await getData<unknown[]>(buildEndpoint(ENDPOINTS.wizard.listProjects));
    renderDashboard(res.data ?? []);
  } catch {
    renderDashboard([]);
  }
}

function renderDashboard(projects: unknown[]): void {
  const rows = (projects as Record<string, unknown>[]).map((p) => `
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer project-card"
      data-project-id="${p['project_id']}">
      <div class="font-semibold text-gray-900 text-lg mb-1">${p['name']}</div>
      <div class="text-gray-500 text-sm mb-4">${p['client_name']}</div>
      <div class="flex items-center gap-2">
        <div class="flex-1 bg-gray-100 rounded-full h-2">
          <div class="bg-blue-900 rounded-full h-2 transition-all" style="width:${p['progress_pct'] ?? 0}%"></div>
        </div>
        <span class="text-xs text-gray-500">${p['progress_pct'] ?? 0}%</span>
      </div>
    </div>
  `).join('');

  dashboardContainer.innerHTML = `
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Mis proyectos</h1>
        <p class="text-gray-500 mt-1">Procesos de certificación EC0366</p>
      </div>
      <button id="btn-new-project"
        class="bg-blue-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors">
        + Nuevo proyecto
      </button>
    </div>
    ${projects.length === 0
      ? '<div class="text-center py-20 text-gray-400"><p class="text-6xl mb-4">📂</p><p class="text-lg">No tienes proyectos aún.</p></div>'
      : `<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">${rows}</div>`
    }
  `;

  document.getElementById('btn-new-project')?.addEventListener('click', () => { void startNewProject(); });
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset['projectId'];
      if (id) void resumeProject(id);
    });
  });
}

// ============================================================================
// WIZARD
// ============================================================================
async function startNewProject(): Promise<void> {
  wizardStore.reset();
  dashboardContainer.classList.add('hidden');
  wizardContainer.classList.remove('hidden');
  renderProgress();
  await loadStep(0);
}

async function resumeProject(projectId: string): Promise<void> {
  try {
    showLoading('Cargando proyecto...');
    const res = await getData<Record<string, unknown>>(
      buildEndpoint(ENDPOINTS.wizard.getProject(projectId))
    );
    const project = res.data?.['project'] as Record<string, unknown> | undefined;
    if (project) {
      wizardStore.setProjectId(projectId);
      wizardStore.setClientData({
        projectName: String(project['name'] ?? ''),
        clientName: String(project['client_name'] ?? ''),
        industry: String(project['industry'] ?? ''),
        email: String(project['email'] ?? ''),
      });
      wizardStore.goToStep(Number(project['current_step'] ?? 0));
    }
    dashboardContainer.classList.add('hidden');
    wizardContainer.classList.remove('hidden');
    renderProgress();
    await loadStep(wizardStore.getCurrentStep());
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Error al cargar el proyecto');
  } finally {
    hideLoading();
  }
}

function renderProgress(): void {
  const { steps, currentStep } = wizardStore.getState();
  wizardProgress.innerHTML = `
    <div class="flex items-center gap-1 overflow-x-auto pb-2 mb-6">
      ${steps.map((step, i) => `
        <div class="flex items-center gap-1 flex-shrink-0">
          <div class="flex flex-col items-center">
            <div class="wizard-step-indicator ${
              step.status === 'completed' ? 'completed' :
              i === currentStep ? 'active' : 'pending'
            }" title="${step.label}">
              ${step.status === 'completed' ? '✓' : String(i + 1)}
            </div>
            <span class="text-xs mt-1 text-gray-500 hidden lg:block max-w-16 text-center leading-tight">${step.label}</span>
          </div>
          ${i < steps.length - 1 ? '<div class="w-6 h-px bg-gray-200 flex-shrink-0 mb-4"></div>' : ''}
        </div>
      `).join('')}
    </div>
  `;
}

async function loadStep(n: number): Promise<void> {
  const controller = STEP_CONTROLLERS[n];
  if (!controller) return;

  wizardStepContent.innerHTML = '';
  btnPrev.disabled = n === 0;
  btnPrev.classList.toggle('opacity-50', n === 0);
  btnNext.textContent = n === 9 ? '🎉 Finalizar' : 'Siguiente →';

  // Usar mount() — API pública correcta del controlador
  await controller.mount(wizardStepContent);
  renderProgress();
}

btnPrev.addEventListener('click', () => {
  wizardStore.prevStep();
  void loadStep(wizardStore.getCurrentStep());
});

btnNext.addEventListener('click', () => {
  wizardStore.nextStep();
  void loadStep(wizardStore.getCurrentStep());
});

// ============================================================================
// INIT
// ============================================================================
(async () => {
  const user = await getCurrentUser();
  if (user) {
    viewAuth.classList.add('hidden');
    viewApp.classList.remove('hidden');
    headerEmail.textContent = user.email;
    await initDashboard();
  } else {
    viewAuth.classList.remove('hidden');
  }
})();
EOF

# =============================================================================
# RESUMEN FINAL
# =============================================================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   PATCH COMPLETADO — TODAS LAS VIOLACIONES CORREGIDAS ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "CORRECCIONES APLICADAS:"
echo ""
echo -e "  ${GREEN}✓${NC} [V01] HTML embebido eliminado de todos los controladores"
echo -e "  ${GREEN}✓${NC} [V02] 12 templates HTML creados en /frontend/templates/"
echo -e "  ${GREEN}✓${NC} [V03] TemplateLoader ahora se usa en todos los controladores"
echo -e "  ${GREEN}✓${NC} [V04] API pública: export const Step{N} = { mount, getData }"
echo -e "  ${GREEN}✓${NC} [V05] shared/validationEngine.ts creado"
echo -e "  ${GREEN}✓${NC} [V06] shared/pubsub.ts creado con EVENTS tipados"
echo -e "  ${GREEN}✓${NC} [V07] wizard.types.ts completo (20+ tipos del spec)"
echo -e "  ${GREEN}✓${NC} [V08] wizard.store.ts reescrito con API del spec (setClientData, etc.)"
echo -e "  ${GREEN}✓${NC} [V09] endpoints.ts corregido con buildEndpoint"
echo -e "  ${GREEN}✓${NC} [V10] step8 renombrado a payment (coincide con spec)"
echo -e "  ${GREEN}✓${NC} [V11] @hono/zod-validator agregado a backend/package.json"
echo -e "  ${GREEN}✓${NC} [V12] wrangler.toml con regla [[rules]] para .md como Text"
echo -e "  ${GREEN}✓${NC} [V13] prompts/schemas/prompt.schema.json creado"
echo -e "  ${GREEN}✓${NC} [V14] variables/section-industria.md y section-competencia.md creados"
echo -e "  ${GREEN}✓${NC} [V15] __tests__/prompt-registry.test.ts creado (TDD)"
echo -e "  ${GREEN}✓${NC} [V16] vitest.config.ts creado en backend"
echo -e "  ${GREEN}✓${NC} [V17] F4-produccion.md corregido (8 productos del diagrama de fases)"
echo -e "  ${GREEN}✓${NC} [V18] step0 form ahora captura las 7 secciones del formato de entrada EC0366"
echo -e "  ${GREEN}✓${NC} main.ts actualizado para usar mount() en lugar de initStepN()"
echo ""
echo "PRÓXIMOS PASOS:"
echo ""
echo "  cd backend && npm install"
echo "  cd frontend && npm install"
echo "  docker compose up -d"
echo ""