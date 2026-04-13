import { AIService } from '../src/cce/services/ai.service';
import { SupabaseService } from '../src/cce/services/supabase.service';
import { PipelineOrchestratorService } from '../src/cce/services/pipeline-orchestrator.service';

const MOCK_ENV = {
  ENVIRONMENT: 'development',
  OLLAMA_URL: 'http://localhost:11434',
  OLLAMA_MODEL: 'llama3.2:3b',
  SUPABASE_URL: '',
  SUPABASE_SERVICE_ROLE_KEY: ''
} as any;

async function run() {
  console.log("=== INICIANDO SIMULADOR PIPELINE F0 (TECHIC) ===\n");
  
  const supabase = new SupabaseService(MOCK_ENV);
  const ai = new AIService(MOCK_ENV);
  const orchestrator = new PipelineOrchestratorService(ai, supabase);

  const projectId = '00000000-0000-0000-0000-000000000000';
  const pipelineId = 'F0';

  // TECHIC Mock Data
  const userInputs = {
    companyName: 'Techic OS',
    mainProblem: 'Falta de especialización y estandarización en on-boarding de desarrolladores',
    symptoms: 'Alta rotación temprana, código espagueti inicial, curvas de aprendizaje lentas'
  };

  const initialContext = {
    crawlerData: `TECHIC es una agencia de software boutique especializada en MVPs rápidos y escalables usando la pila T3 (TypeScript, Tailwind, Trpc). Nos enfocamos en Startups de etapa temprana y refactorizaciones Legacy complejas. Tenemos un equipo pequeño pero muy ágil.`,
    userInputs
  };

  console.log("• Contexto inicial cargado. Disparando orquestador...");
  
  try {
    const start = Date.now();
    // executePipeline requires context that includes the manual injects
    const finalContext = await orchestrator.executePipeline(projectId, pipelineId, initialContext);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    console.log(`\n=== PIPELINE F0 FINALIZADO CORRECTAMENTE en ${elapsed}s ===\n`);
    
    // Verificamos salidas en cce_step_outputs
    const dbOutputs = await supabase.getStepOutputs(projectId);
    console.log("-> SALIDAS INTERMEDIAS EN cce_step_outputs:");
    for (const key of Object.keys(dbOutputs)) {
       console.log(`   [+] ${key}`);
    }

    console.log("\n-> RESULTADO FINAL (JUEZ_F0 guardado en resultado_final):");
    console.log(finalContext.resultado_final || "(No result generated, check fallbacks)");

  } catch (error) {
    console.error("\n❌ ERROR EJECUTANDO EL PIPELINE:");
    console.error(error);
  }
}

run();
