// src/services/github/GitHubService.ts

import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { config } from '../../config/config';


export class GitHubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.github.appId,
        privateKey: config.github.privateKey,
        installationId: config.github.installationId,
      },
    });
  }

  async listRepositories() {
    const { data } = await this.octokit.apps.listReposAccessibleToInstallation();
    return data.repositories;
  }

  async getRepository(owner: string, repo: string) {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return data;
  }

  async getRepositoryContent(owner: string, repo: string, path: string = '') {
    const { data } = await this.octokit.repos.getContent({ owner, repo, path });
    return data;
  }

  async getFileContent(owner: string, repo: string, path: string) {
    const { data } = await this.octokit.repos.getContent({ owner, repo, path });
    if (Array.isArray(data) || !('content' in data)) {
      throw new Error('Path does not point to a file');
    }
    return Buffer.from(data.content, 'base64').toString('utf-8');
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

  async createOrUpdateFile(owner: string, repo: string, path: string, content: string, message: string, branch: string) {
    try {
      const { data: existingFile } = await this.octokit.repos.getContent({ owner, repo, path, ref: branch });
      if (!Array.isArray(existingFile) && 'sha' in existingFile) {
        return await this.octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: Buffer.from(content).toString('base64'),
          sha: existingFile.sha,
          branch,
        });
      }
    } catch (error) {
      // File doesn't exist, create it
    }
    
    return await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
    });
  }

  async createPullRequest(owner: string, repo: string, title: string, body: string, head: string, base: string) {
    const { data } = await this.octokit.pulls.create({ owner, repo, title, body, head, base });
    return data;
  }

  async listPullRequests(owner: string, repo: string, options: object = {}) {
    const { data } = await this.octokit.pulls.list({ owner, repo, ...options });
    return data;
  }

  async getPullRequest(owner: string, repo: string, pull_number: number) {
    const { data } = await this.octokit.pulls.get({ owner, repo, pull_number });
    return data;
  }

  async createIssue(owner: string, repo: string, title: string, body: string, options: object = {}) {
    const { data } = await this.octokit.issues.create({ owner, repo, title, body, ...options });
    return data;
  }

  async listIssues(owner: string, repo: string, options: object = {}) {
    const { data } = await this.octokit.issues.listForRepo({ owner, repo, ...options });
    return data;
  }

  async listWorkflows(owner: string, repo: string) {
    const { data } = await this.octokit.actions.listRepoWorkflows({ owner, repo });
    return data.workflows;
  }

  async listWorkflowRuns(owner: string, repo: string, workflow_id: number) {
    const { data } = await this.octokit.actions.listWorkflowRuns({ owner, repo, workflow_id });
    return data.workflow_runs;
  }

  async createPullRequestReview(owner: string, repo: string, pull_number: number, body: string, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') {
    const { data } = await this.octokit.pulls.createReview({ owner, repo, pull_number, body, event });
    return data;
  }

  async listPullRequestFiles(owner: string, repo: string, pull_number: number) {
    const { data } = await this.octokit.pulls.listFiles({ owner, repo, pull_number });
    return data;
  }
}