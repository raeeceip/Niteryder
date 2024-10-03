import { Octokit } from '@octokit/rest';

export class WorkflowService {
    constructor(private octokit: Octokit) {}
  
    async listWorkflows(owner: string, repo: string) {
      const { data } = await this.octokit.actions.listRepoWorkflows({ owner, repo });
      return data.workflows;
    }
  
    async getWorkflowRuns(owner: string, repo: string, workflow_id: number) {
      const { data } = await this.octokit.actions.listWorkflowRuns({ owner, repo, workflow_id });
      return data.workflow_runs;
    }
  
    async reRunWorkflow(owner: string, repo: string, run_id: number) {
      const { data } = await this.octokit.actions.reRunWorkflow({ owner, repo, run_id });
      return data;
    }
  }