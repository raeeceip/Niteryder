// src/workflows/ReviewWorkflow.ts
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent, KVNamespace } from 'cloudflare:workers';
import { GitHubService } from '../services/github/GitHubService';
import { ReviewerService } from '../services/reviewer/reviewer';

type Env = {
  GITHUB_TOKEN: KVNamespace;
};

export class ReviewWorkflow extends WorkflowEntrypoint<Env> {
  async run(event: WorkflowEvent, step: WorkflowStep) {
    const githubService = new GitHubService();
    const reviewerService = new ReviewerService();

    const repos = await step.do('fetch-repositories', async () => {
      return await githubService.listRepositories();
    });

    for (const repo of repos) {
      await step.do(`analyze-${repo.name}`, {
        retries: {
          limit: 3,
          backoff: 'exponential',
          delay: '1 minute'
        }
      }, async () => {
        const content = await githubService.getRepositoryContent(repo.owner.login, repo.name, '');
        return await reviewerService.analyzeRepository(content);
      });
    }
  }
}