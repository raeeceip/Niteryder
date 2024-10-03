// src/services/sentry/SentryService.ts

import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import axios from 'axios';
import { logger, createCronJob, retry, AppError } from '../../utils';
import { config } from '../../config/config';
import { GitHubService } from '../github/GitHubService';

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  level: string;
  count: number;
  userCount: number;
  project: string;
  type: string;
  status: string;
  lastSeen: string;
  firstSeen: string;
}

export class SentryService {
  private githubService: GitHubService;
  private sentryToken: string;
  private sentryOrg: string;

  constructor(githubService: GitHubService, dsn: string, sentryToken: string, sentryOrg: string) {
    this.githubService = githubService;
    this.sentryToken = sentryToken;
    this.sentryOrg = sentryOrg;

    Sentry.init({
      dsn: dsn,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: undefined }),
        new ProfilingIntegration(),
      ],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });

    this.setupNightlyAnalysis();
  }

  private setupNightlyAnalysis() {
    createCronJob(config.sentryCronSchedule, this.performNightlyAnalysis.bind(this));
  }

  async performNightlyAnalysis() {
    logger.info('Starting nightly analysis');
    try {
      const repos = await retry(() => this.githubService.listRepositories());
      for (const repo of repos) {
        const [owner, repoName] = repo.full_name.split('/');
        await this.analyzeRepository(owner, repoName);
      }
    } catch (error) {
      logger.error('Error during nightly analysis:', error);
      this.captureException(error as Error);
      throw new AppError(500, 'Nightly analysis failed');
    }
    logger.info('Nightly analysis completed');
  }

  async analyzeRepository(owner: string, repo: string): Promise<void> {
    logger.info(`Analyzing repository: ${owner}/${repo}`);try {
        const [repoData, issues, pullRequests, workflows] = await Promise.all([
          retry(() => this.githubService.getRepository(owner, repo)),
          this.fetchSentryIssues(`${owner}-${repo}`),
          retry(() => this.githubService.listPullRequests(owner, repo, { state: 'open' })),
          retry(() => this.githubService.listWorkflows(owner, repo))
        ]);
  
        const analysis = this.analyzeIssues(issues);
        await this.createGitHubIssuesForCriticalSentryIssues(owner, repo, analysis.mostFrequent);
        await this.analyzePullRequests(owner, repo, pullRequests);
        await this.analyzeWorkflows(owner, repo, workflows);
  
        logger.info(`Analysis completed for ${owner}/${repo}`);
      } catch (error) {
        logger.error(`Error analyzing repository ${owner}/${repo}:`, error);
        this.captureException(error as Error);
        throw new AppError(500, `Repository analysis failed for ${owner}/${repo}`);
      }
    }
  
    private async fetchSentryIssues(projectSlug: string): Promise<SentryIssue[]> {
      try {
        const response = await axios.get(`https://sentry.io/api/0/projects/${this.sentryOrg}/${projectSlug}/issues/`, {
          headers: {
            Authorization: `Bearer ${this.sentryToken}`,
          },
        });
        return response.data as SentryIssue[];
      } catch (error) {
        logger.error('Error fetching Sentry issues:', error);
        return [];
      }
    }
  
    private analyzeIssues(issues: SentryIssue[]): any {
      const stats = {
        critical: 0,
        error: 0,
        warning: 0,
        mostFrequent: [] as { title: string; count: number; level: string }[],
      };
  
      issues.forEach(issue => {
        switch (issue.level) {
          case 'fatal':
          case 'critical':
            stats.critical++;
            break;
          case 'error':
            stats.error++;
            break;
          case 'warning':
            stats.warning++;
            break;
        }
      });
  
      stats.mostFrequent = issues
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(issue => ({
          title: issue.title,
          count: issue.count,
          level: issue.level,
        }));
  
      return stats;
    }
  
    private async createGitHubIssuesForCriticalSentryIssues(owner: string, repo: string, issues: { title: string; count: number; level: string }[]) {
      for (const issue of issues) {
        if (issue.level === 'critical' || issue.level === 'fatal') {
          await retry(() => this.githubService.createIssue(
            owner,
            repo,
            `[Critical] Sentry Issue: ${issue.title}`,
            `A critical issue has been detected by Sentry:\n\nTitle: ${issue.title}\nOccurrences: ${issue.count}\n\nPlease investigate and resolve this issue as soon as possible.`
          ));
        }
      }
    }
  
    private async analyzePullRequests(owner: string, repo: string, pullRequests: any[]) {
      for (const pr of pullRequests) {
        const files = await retry(() => this.githubService.listPullRequestFiles(owner, repo, pr.number));
        const analysis = {
          changedFiles: files.length,
          additions: pr.additions,
          deletions: pr.deletions,
          isLarge: pr.additions + pr.deletions > 1000,
          touchesCriticalFiles: files.some(file => file.filename.includes('config') || file.filename.includes('security')),
        };
  
        if (analysis.isLarge || analysis.touchesCriticalFiles) {
          await retry(() => this.githubService.createPullRequestReview(
            owner,
            repo,
            pr.number,
            `This PR is ${analysis.isLarge ? 'quite large' : ''} ${analysis.isLarge && analysis.touchesCriticalFiles ? 'and' : ''} ${analysis.touchesCriticalFiles ? 'touches critical files' : ''}. Please ensure thorough review.`,
            'COMMENT'
          ));
        }
      }
    }
  
    private async analyzeWorkflows(owner: string, repo: string, workflows: any[]) {
      for (const workflow of workflows) {
        const runs = await retry(() => this.githubService.listWorkflowRuns(owner, repo, workflow.id));
        const failedRuns = runs.filter(run => run.conclusion === 'failure');
        if (failedRuns.length > 0) {
          logger.warn(`Workflow ${workflow.name} in ${owner}/${repo} has ${failedRuns.length} failed runs`);
          // Here you could add logic to create issues for failed workflows or trigger re-runs
        }
      }
    }
  
    captureException(error: Error): void {
      Sentry.captureException(error);
    }
  }