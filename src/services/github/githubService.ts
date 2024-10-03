// src/services/github/GitHubService.ts
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { config } from '../../config/config';

import { RepositoryService } from './repositoryService';
import { IssueService } from './issueService';
import { PullRequestService } from './pullRequestService';
import { UserService } from './userService';
import { WorkflowService } from './workflowService';

export class GitHubService {
  private octokit: Octokit;
  public repositories: RepositoryService;
  public issues: IssueService;
  public pullRequests: PullRequestService;
  public users: UserService;
  public workflows: WorkflowService;

  constructor() {
    this.octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.github.appId,
        privateKey: config.github.privateKey,
        installationId: config.github.installationId,
      },
    });

    this.repositories = new RepositoryService(this.octokit);
    this.issues = new IssueService(this.octokit);
    this.pullRequests = new PullRequestService(this.octokit);
    this.users = new UserService(this.octokit);
    this.workflows = new WorkflowService(this.octokit);
  }
}


