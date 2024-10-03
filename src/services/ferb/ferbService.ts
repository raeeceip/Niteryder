// src/services/FerbService.ts

import { GitHubService } from '../github/GitHubService';
import { 
  createCronJob, 
  logger, 
  retry, 
  checkHarperInstallation, 
  safeWriteFile, 
  safeDeleteFile,
  AppError
} from '../../utils';
import { execSync } from 'child_process';
import * as path from 'path';
import { config } from '../../config/config';

export class FerbService {
    private githubService: GitHubService;

    constructor(githubService: GitHubService) {
        this.githubService = githubService;
    }

    public start() {
        if (!checkHarperInstallation()) {
            throw new Error('Harper CLI is not installed or not found at the specified path.');
        }
        createCronJob(config.ferbCronSchedule, this.runWeeklyCheck.bind(this));
        logger.info('Ferb service started. Weekly grammar checks scheduled.');
    }

    private async runWeeklyCheck() {
        try {
            const repositories = await retry(() => this.githubService.listRepositories());
            let allSuggestions: { repo: string, file: string, suggestions: string[] }[] = [];
    
            for (const repo of repositories) {
                const filesResponse = await retry(() => this.githubService.getRepositoryContent(repo.owner.login, repo.name));
                const files = Array.isArray(filesResponse) ? filesResponse : [];
    
                for (const file of files) {
                    if ('type' in file && file.type === 'file' && (file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
                        const content = await retry(() => this.githubService.getFileContent(repo.owner.login, repo.name, file.path));
                        const suggestions = await this.checkGrammarWithHarper(content);
                        if (suggestions.length > 0) {
                            allSuggestions.push({ repo: repo.name, file: file.name, suggestions });
                        }
                    }
                }
            }
    
            if (allSuggestions.length > 0) {
                await this.createPullRequest(allSuggestions);
            } else {
                logger.info('No grammar suggestions found this week.');
            }
        } catch (error) {
            logger.error('Error in weekly grammar check:', error);
            throw new AppError(500, 'Weekly grammar check failed');
        }
    }
    private async checkGrammarWithHarper(text: string): Promise<string[]> {
        const tempFile = path.join(process.cwd(), 'temp_file.txt');
        safeWriteFile(tempFile, text);

        try {
            const output = execSync(`${config.harperCliPath} ${tempFile}`, { encoding: 'utf-8' });
            const jsonOutput = JSON.parse(output);
            return jsonOutput.map((suggestion: any) => 
                `Line ${suggestion.range.start.line}: ${suggestion.message}`
            );
        } catch (error) {
            logger.error('Error checking grammar with Harper:', error);
            return [];
        } finally {
            safeDeleteFile(tempFile);
        }
    }

    private async createPullRequest(suggestions: { repo: string, file: string, suggestions: string[] }[]) {
        const title = "Weekly Grammar Check Suggestions";
        let body = "Here are this week's grammar suggestions:\n\n";

        suggestions.forEach(({ repo, file, suggestions }) => {
            body += `## In repo '${repo}', file '${file}':\n`;
            suggestions.forEach(suggestion => {
                body += `- ${suggestion}\n`;
            });
            body += '\n';
        });

        try {
            const mainRepo = await retry(() => this.githubService.getRepository(config.mainRepoOwner, config.mainRepoName));
            const defaultBranch = mainRepo.default_branch;
            const newBranch = `grammar-fixes-${new Date().toISOString().split('T')[0]}`;

            await retry(() => this.githubService.createBranch(config.mainRepoOwner, config.mainRepoName, newBranch, defaultBranch));
            await retry(() => this.githubService.createOrUpdateFile(
                config.mainRepoOwner,
                config.mainRepoName,
                'grammar-suggestions.md',
                body,
                'Weekly grammar suggestions',
                newBranch
            ));

            await retry(() => this.githubService.createPullRequest(
                config.mainRepoOwner,
                config.mainRepoName,
                title,
                body,
                newBranch,
                defaultBranch
            ));

            logger.info('Created weekly grammar suggestion pull request');
        } catch (error) {
            logger.error('Error creating pull request:', error);
            throw new AppError(500, 'Failed to create pull request for grammar suggestions');
        }
    }
}