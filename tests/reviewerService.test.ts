import { ReviewerService } from '../src/services/reviewer/ReviewerService';

describe('ReviewerService', () => {
    let reviewerService: ReviewerService;

    beforeEach(() => {
        reviewerService = new ReviewerService();
    });

    test('should list repositories', async () => {
        const repositories = await reviewerService.githubService.listRepositories();
        expect(repositories).toBeDefined();
        expect(Array.isArray(repositories)).toBe(true);
    });

    test('should analyze repository content', async () => {
        const repo = { owner: { login: 'testOwner' }, name: 'testRepo' };
        const content = await reviewerService.githubService.getRepositoryContent(repo.owner.login, repo.name, '');
        const analysis = await reviewerService.llmService.analyzeRepository(content);
        expect(analysis).toBeDefined();
    });

    test('should log analysis for each repository', async () => {
        const logSpy = jest.spyOn(console, 'log');
        await reviewerService.reviewRepositories();
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
    });

    test('should handle errors gracefully', async () => {
        jest.spyOn(reviewerService.githubService, 'listRepositories').mockImplementationOnce(() => {
            throw new Error('Test error');
        });
        await expect(reviewerService.reviewRepositories()).resolves.not.toThrow();
    });
});