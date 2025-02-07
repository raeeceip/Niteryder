import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_PRIVATE_KEY!,
        installationId: process.env.GITHUB_INSTALLATION_ID!,
      },
    });
  }

  async listRepositories() {
    const { data } = await this.octokit.apps.listReposAccessibleToInstallation();
    return data.repositories;
  }

  async createIssue(owner: string, repo: string, title: string, body: string) {
    return await this.octokit.issues.create({
      owner,
      repo,
      title,
      body,
    });
  }

  async createPullRequest(owner: string, repo: string, head: string, base: string, title: string, body: string) {
    return await this.octokit.pulls.create({
      owner,
      repo,
      head,
      base,
      title,
      body,
    });
  }

  async getRepositoryContent(owner: string, repo: string, path: string = '') {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
    });
    return Array.isArray(data) ? data : [data];
  }

  async getFileContent(owner: string, repo: string, path: string) {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if ('content' in data && typeof data.content === 'string') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    throw new Error('Not a file or empty content');
  }

  async getRepositoryLanguages(owner: string, repo: string) {
    const { data } = await this.octokit.repos.listLanguages({
      owner,
      repo,
    });
    return data;
  }

  async createBranch(owner: string, repo: string, branchName: string, sha: string) {
    await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha,
    });
  }

  async createOrUpdateFile(owner: string, repo: string, path: string, content: string, branch: string, message: string) {
    try {
      // Try to get existing file
      const { data: existingFile } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if ('sha' in existingFile) {
        await this.octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: Buffer.from(content).toString('base64'),
          branch,
          sha: existingFile.sha,
        });
      }
    } catch (error) {
      // File doesn't exist, create new file
      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
      });
    }
  }
}