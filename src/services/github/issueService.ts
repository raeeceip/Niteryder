// src/services/github/issueService.ts

import { Octokit } from '@octokit/rest';

export class IssueService {
    constructor(private octokit: Octokit) {}
  
    async listIssues(owner: string, repo: string, options: object = {}) {
      const { data } = await this.octokit.issues.listForRepo({ owner, repo, ...options });
      return data;
    }
  
    async getIssue(owner: string, repo: string, issue_number: number) {
      const { data } = await this.octokit.issues.get({ owner, repo, issue_number });
      return data;
    }
  
    async createIssue(owner: string, repo: string, title: string, body: string, options: object = {}) {
      const { data } = await this.octokit.issues.create({ owner, repo, title, body, ...options });
      return data;
    }
  
    async updateIssue(owner: string, repo: string, issue_number: number, options: object) {
      const { data } = await this.octokit.issues.update({ owner, repo, issue_number, ...options });
      return data;
    }
  
    async assignIssue(owner: string, repo: string, issue_number: number, assignees: string[]) {
      const { data } = await this.octokit.issues.addAssignees({ owner, repo, issue_number, assignees });
      return data;
    }
  }