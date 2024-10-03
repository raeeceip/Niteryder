import { Octokit } from '@octokit/rest';

export class PullRequestService {
    constructor(private octokit: Octokit) {}
  
    async listPullRequests(owner: string, repo: string, options: object = {}) {
      const { data } = await this.octokit.pulls.list({ owner, repo, ...options });
      return data;
    }
  
    async getPullRequest(owner: string, repo: string, pull_number: number) {
      const { data } = await this.octokit.pulls.get({ owner, repo, pull_number });
      return data;
    }
  
    async createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body: string) {
      const { data } = await this.octokit.pulls.create({ owner, repo, title, head, base, body });
      return data;
    }
  
    async updatePullRequest(owner: string, repo: string, pull_number: number, options: object) {
      const { data } = await this.octokit.pulls.update({ owner, repo, pull_number, ...options });
      return data;
    }
  
    async mergePullRequest(owner: string, repo: string, pull_number: number, options: object = {}) {
      const { data } = await this.octokit.pulls.merge({ owner, repo, pull_number, ...options });
      return data;
    }
  
    async reviewPullRequest(owner: string, repo: string, pull_number: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string) {
      const { data } = await this.octokit.pulls.createReview({ owner, repo, pull_number, event, body });
      return data;
    }
  }
  