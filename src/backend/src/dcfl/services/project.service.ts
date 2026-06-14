import { ProjectRepository } from '../repositories/project.repository';

export class ProjectService {
  constructor(private repository: ProjectRepository) {}
  
  async getProjectName(projectId: string): Promise<string> {
    return this.repository.getProjectName(projectId);
  }
  
  async getProject(projectId: string) {
    return this.repository.findById(projectId);
  }
}
