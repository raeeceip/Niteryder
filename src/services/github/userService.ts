import { Octokit } from '@octokit/rest';

export class UserService {
    constructor(private octokit: Octokit) {}
  
    async getAuthenticatedUser() {
      const { data } = await this.octokit.users.getAuthenticated();
      return data;
    }
  
    async getUser(username: string) {
      const { data } = await this.octokit.users.getByUsername({ username });
      return data;
    }
  
    async listCollaborators(owner: string, repo: string) {
      const { data } = await this.octokit.repos.listCollaborators({ owner, repo });
      return data;
    }
  }