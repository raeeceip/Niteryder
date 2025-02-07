import dotenv from 'dotenv';
import { ScheduledEvent, ExecutionContext, KVNamespace } from '@cloudflare/workers-types';
import { setupLogger, logger } from './utils/logger';
import { setupSentry } from './utils/sentry';
import { GitHubService } from './services/github/GitHubService';
import { CodeAnalysisService } from './services/codeAnalysis/CodeAnalysisService';
import { AIIntegrationService } from './services/aiIntegration/AIIntegrationService';

// Load environment variables
dotenv.config();

// Initialize logger
setupLogger();

export interface Env {
    GITHUB_TOKENS: KVNamespace;
    ENVIRONMENT: string;
}

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        const workflow = new Workflow(env);
        await workflow.run();
    },

    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const workflow = new Workflow(env);
        return workflow.handleRequest(request);
    }
};

class Workflow {
    private env: Env;
    private githubService: GitHubService;
    private codeAnalysisService: CodeAnalysisService;
    private aiIntegrationService: AIIntegrationService;

    constructor(env: Env) {
        this.env = env;
        this.githubService = new GitHubService();
        this.codeAnalysisService = new CodeAnalysisService(this.githubService);
        this.aiIntegrationService = new AIIntegrationService();
        logger.info('Workflow services initialized');
    }

    async initialize() {
        try {
            // Verify GitHub connectivity
            await this.githubService.listRepositories();
            
            // Initialize Sentry
            setupSentry();
            
            // Log successful initialization
            logger.info('NightRyder initialized successfully');
            
            return this;
        } catch (error) {
            logger.error('Failed to initialize NightRyder:', error);
            throw error;
        }
    }

    async handleRequest(request: Request): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname === '/review') {
            await this.run();
            return new Response('Review process initiated', { status: 200 });
        }
        return new Response('Not Found', { status: 404 });
    }

    async run() {
        try {
            const repos = await this.githubService.listRepositories();
            for (const repo of repos) {
                await this.processRepository(repo);
            }
        } catch (error) {
            console.error('Workflow error:', error);
        }
    }

    async processRepository(repo: { owner: { login: string }, name: string }) {
        try {
            // Analyze repository content
            const analysisResults = await this.codeAnalysisService.analyzeRepository(
                repo.owner.login,
                repo.name
            );

            // Get AI suggestions for issues found
            const aiSuggestions = await this.aiIntegrationService.analyzeResults(
                repo.owner.login,
                repo.name,
                analysisResults
            );

            // Create issues and PRs based on analysis
            for (const suggestion of aiSuggestions) {
                if (suggestion.type === 'issue') {
                    await this.githubService.createIssue(
                        repo.owner.login,
                        repo.name,
                        suggestion.title,
                        suggestion.body
                    );
                } else if (suggestion.type === 'fix') {
                    const branchName = `fix/${suggestion.id}`;
                    await this.githubService.createBranch(
                        repo.owner.login,
                        repo.name,
                        branchName,
                        suggestion.baseSha ?? ''
                    );

                    await this.githubService.createOrUpdateFile(
                        repo.owner.login,
                        repo.name,
                        suggestion.filePath ?? '',
                        suggestion.fixedContent ?? '',
                        branchName,
                        `Fix: ${suggestion.title}`
                    );

                    await this.githubService.createPullRequest(
                        repo.owner.login,
                        repo.name,
                        branchName,
                        'main',
                        suggestion.title,
                        suggestion.body
                    );
                }
            }

        } catch (error) {
            logger.error(`Error processing repository ${repo.owner.login}/${repo.name}:`, error);
        }
    }
}

async function main() {
    try {
        const env: Env = {
            GITHUB_TOKENS: (globalThis as any).GITHUB_TOKENS,
            ENVIRONMENT: process.env.ENVIRONMENT || 'development'
        };

        const workflow = new Workflow(env);
        await workflow.initialize();
        await workflow.run();

        logger.info('NightRyder started successfully');
    } catch (error) {
        logger.error('Failed to start NightRyder:', error);
        process.exit(1);
    }
}

// Only run main() if not in worker environment
if (typeof (globalThis as any).ExecutionContext === 'undefined') {
    main();
}
