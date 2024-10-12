// src/services/reviewer/reviewer.ts
import { GitHubService } from '../github/GitHubService';
import { logger } from '../../utils';

export class ReviewerService {
    private githubService: GitHubService;
    private llmService: LLMService;

    constructor() {
        this.githubService = new GitHubService();
        this.llmService = new LLMService();
    }

    async reviewRepositories() {
        try {
            const repositories = await this.githubService.listRepositories();
            for (const repo of repositories) {
                const content = await this.githubService.getRepositoryContent(repo.owner.login, repo.name, '');
                const analysis = await this.llmService.analyzeRepository(content);
                logger.info(`Analysis for ${repo.name}:`, analysis);
            }
        } catch (error) {
            logger.error('Error reviewing repositories:', error);
        }
    }
}
