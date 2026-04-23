import { BaseRepository } from './base.repository';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Fase0Estructurado {
  id: string;
  project_id: string;
  job_id: string;
  project_name: string | null;
  industry: string | null;
  course_topic: string | null;
  analisis_sector: any;
  desafios: any[];
  mejores_practicas: any[];
  competencia: any[];
  estandares_ec: any[];
  brechas: { mejores_practicas: string; competencia: string };
  recomendaciones: string[];
  referencias: any[];
  documento_final: string;
  created_at: string;
}

export class Fase0Repository extends BaseRepository<Fase0Estructurado> {
  constructor(client: SupabaseClient) {
    super(client, 'fase0_estructurado');
  }

  async upsert(data: Omit<Fase0Estructurado, 'id' | 'created_at'>): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .upsert(data, { onConflict: 'project_id,job_id' });

    if (error) throw new Error(`Fase0Repository.upsert failed: ${error.message}`);
  }

  async findByProjectId(projectId: string): Promise<Fase0Estructurado | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data as Fase0Estructurado;
  }
}
