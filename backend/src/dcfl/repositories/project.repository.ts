import { BaseRepository } from '../../core/repositories/base.repository';
import { SupabaseClient } from '@supabase/supabase-js';

export interface WizardProject {
  id: string;
  name: string;
  industry: string;
  course_topic: string;
  created_at: string;
}

export class ProjectRepository extends BaseRepository<WizardProject> {
  constructor(client: SupabaseClient) {
    super(client, 'projects');
  }
  
  async findByName(name: string): Promise<WizardProject | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('name', name)
      .single();
    
    if (error) return null;
    return data as WizardProject;
  }
  
  async getProjectName(id: string): Promise<string> {
    const project = await this.findById(id);
    return project?.name ?? 'Proyecto sin nombre';
  }
}
