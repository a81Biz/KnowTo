import { BaseRepository } from './base.repository';
import { SupabaseClient } from '@supabase/supabase-js';

export interface PreguntaFase {
  id: string;
  project_id: string;
  fase_destino: number;
  texto: string;
  orden: number;
  created_at: string;
}

export class PreguntasRepository extends BaseRepository<PreguntaFase> {
  constructor(client: SupabaseClient) {
    super(client, 'preguntas_fase');
  }
  
  async deleteByProjectAndFase(projectId: string, faseDestino: number): Promise<void> {
    await this.client
      .from(this.tableName)
      .delete()
      .eq('project_id', projectId)
      .eq('fase_destino', faseDestino);
  }
  
  async insertMany(rows: any[]): Promise<void> {
    if (rows.length === 0) return;
    await this.client.from(this.tableName).insert(rows);
  }
  
  async replaceQuestions(projectId: string, faseDestino: number, preguntas: string[]): Promise<void> {
    // 1. Eliminar preguntas existentes
    await this.deleteByProjectAndFase(projectId, faseDestino);
    
    // 2. Insertar nuevas preguntas
    const rows = preguntas.map((pregunta, i) => ({
      project_id: projectId,
      fase_destino: faseDestino,
      fase_origen: 0, 
      texto: pregunta,
      orden: i + 1
    }));
    await this.insertMany(rows);
  }
}
