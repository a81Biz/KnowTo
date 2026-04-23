import { PreguntasRepository } from '../repositories/preguntas.repository';

export class PreguntasService {
  constructor(private repository: PreguntasRepository) {}
  
  async saveFaseQuestions(projectId: string, faseDestino: number, preguntas: string[]): Promise<void> {
    if (!preguntas || preguntas.length === 0) {
      console.warn(`[PreguntasService] No hay preguntas para guardar en fase ${faseDestino}`);
      return;
    }
    
    await this.repository.replaceQuestions(projectId, faseDestino, preguntas);
    console.log(`[PreguntasService] Guardadas ${preguntas.length} preguntas para fase ${faseDestino}`);
  }
  
  async getFaseQuestions(projectId: string, faseDestino: number): Promise<any[]> {
    const preguntas = await this.repository.findAll({
      project_id: projectId,
      fase_destino: faseDestino
    });
    return preguntas.sort((a, b) => a.orden - b.orden);
  }
}
