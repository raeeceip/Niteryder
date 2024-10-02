import { App } from '@octokit/app';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { config } from '../../config/config';

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    const app = new App({
      appId: config.github.appId,
      privateKey: config.github.privateKey,
    });

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

  // Add more GitHub API methods as needed
}
