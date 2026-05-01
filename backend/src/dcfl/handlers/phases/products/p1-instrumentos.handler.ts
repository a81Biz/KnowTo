import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';
import { resolveJudge } from '../../../helpers/judge-resolver.helper';

export async function handleP1(context: ProductContext): Promise<string | void> {
  const { jobId, projectId, services } = context;

  const judges = [
    { judge: 't1_juez', a: 't1_eval_A', b: 't1_eval_B' },
    { judge: 't2_juez', a: 't2_eval_A', b: 't2_eval_B' },
    { judge: 't3_juez', a: 't3_eval_A', b: 't3_eval_B' },
    { judge: 't4_juez', a: 't4_eval_A', b: 't4_eval_B' },
  ];

  let finalDoc = `# PRODUCTO 1: INSTRUMENTOS DE EVALUACIÓN\n`;
  finalDoc += `**Elemento EC0366:** E1219 — Producto #3 & #4\n\n---\n\n`;
  finalDoc += `> Este documento contiene las rúbricas, listas de cotejo y guías de observación basadas en los temas clave del curso.\n\n`;

  let hasInstruments = false;
  let counter = 1;

  for (const j of judges) {
    const ganador = await resolveJudge(jobId, j.judge, j.a, j.b, { instrumentos: [] }, services);
    const insts = ganador.instrumentos || [];
    
    if (insts.length > 0) {
      hasInstruments = true;
      insts.forEach((inst: any) => {
        finalDoc += `## ${counter}. ${inst.tipo || 'Instrumento de Evaluación'}\n`;
        finalDoc += `**Tema / Actividad a evaluar:** ${inst.tema || 'General'}\n\n`;
        finalDoc += `| Criterio de Evaluación | Peso (%) | Cumple (Sí/No) |\n`;
        finalDoc += `|:---|:---:|:---:|\n`;
        
        const reactivos = Array.isArray(inst.reactivos) ? inst.reactivos : [];
        reactivos.forEach((r: any) => {
          const crit = r.criterio || r.descripcion || '-';
          const peso = r.peso || r.valor || '-';
          finalDoc += `| ${crit} | ${peso}% | [ ] |\n`;
        });
        finalDoc += `\n---\n\n`;
        counter++;
      });
    }
  }

  if (!hasInstruments) {
    finalDoc += `*No se generaron instrumentos. Por favor, especifica los temas a evaluar.*\n`;
  }

  await services.supabase.saveF4Producto({
    projectId, producto: 'P1', documentoFinal: finalDoc,
    borradorA: '', borradorB: '', validacionEstado: 'aprobado',
    jobId, validacionErrores: { passed: true }
  });

  return finalDoc;
}
