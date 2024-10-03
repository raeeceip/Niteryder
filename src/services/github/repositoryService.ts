
// src/services/github/repositoryService.ts
import { Octokit } from '@octokit/rest';
export class RepositoryService {
    constructor(private octokit: Octokit) {}
  
    async listRepositories() {
      const { data } = await this.octokit.apps.listReposAccessibleToInstallation();
      return data.repositories;
    }
  
    async getRepository(owner: string, repo: string) {
      const { data } = await this.octokit.repos.get({ owner, repo });
      return data;
    }
  
    async createRepository(name: string, options: object) {
      const { data } = await this.octokit.repos.createForAuthenticatedUser({ name, ...options });
      return data;
    }
  
    async getBranches(owner: string, repo: string) {
      const { data } = await this.octokit.repos.listBranches({ owner, repo });
      return data;
    }
  
    async createBranch(owner: string, repo: string, branchName: string, sha: string) {
      const { data } = await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha,
      });
      return data;
    }
  }