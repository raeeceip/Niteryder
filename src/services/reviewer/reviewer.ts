import { GitHubService } from '../github/GitHubService';
import { CodeAnalysisService } from '../codeAnalysis/CodeAnalysisService';
import { AIIntegrationService } from '../aiIntegration/AIIntegrationService';
import { logger } from '../../utils/logger';

export interface RepositoryContent {
  name: string;
  path: string;
  content: string | null;
  type: 'file' | 'dir' | 'submodule' | 'symlink';
  sha: string;
  size: number;
}

export interface AnalysisResponse {
  issues: Array<{
    path: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
    suggestedFix?: string;
  }>;
  metrics: {
    overallScore: number;
    criticalIssues: number;
    suggestions: number;
  };
}

export class ReviewerService {
    private githubService: GitHubService;
    private codeAnalysisService: CodeAnalysisService;
    private aiService: AIIntegrationService;

    constructor() {
        this.githubService = new GitHubService();
        this.codeAnalysisService = new CodeAnalysisService(this.githubService);
        this.aiService = new AIIntegrationService();
    }

    async analyzeRepository(contents: any[]): Promise<AnalysisResponse> {
        try {
            const analysisResults = [];
            
            for (const file of contents) {
                if (file.type === 'file' && this.isAnalyzableFile(file.path)) {
                    // Fetch file content if not already present
                    const content = file.content 
                        ? Buffer.from(file.content, 'base64').toString('utf-8')
                        : await this.githubService.getFileContent(
                            file.owner,
                            file.repo,
                            file.path
                          );
                    
                    // Run code analysis
                    const analysis = await this.codeAnalysisService.analyzeFile(
                        file.path,
                        content
                    );
                    
                    // Get AI suggestions
                    const aiSuggestions = await this.aiService.analyzeCode(
                        file.path,
                        content
                    );
                    
                    analysisResults.push({
                        path: file.path,
                        analysis,
                        suggestions: aiSuggestions
                    });
                }
            }
            
            return this.summarizeResults(analysisResults);
            
        } catch (error) {
            logger.error('Error analyzing repository:', error);
            throw error;
        }
    }

    private isAnalyzableFile(path: string): boolean {
        const analyzableExtensions = ['.ts', '.js', '.tsx', '.jsx', '.json'];
        return analyzableExtensions.some(ext => path.endsWith(ext));
    }

    private summarizeResults(results: any[]): AnalysisResponse {
        interface AnalysisIssue {
            message: string;
            severity: string;
            line?: number;
        }

        interface AnalysisResult {
            path: string;
            analysis: {
            issues: AnalysisIssue[];
            };
            suggestions: Array<{
            type: string;
            originalIssue?: {
                line: number;
            };
            fixedContent?: string;
            }>;
        }

        const issues: Array<{
            path: string;
            message: string;
            severity: 'high' | 'medium' | 'low';
            suggestedFix?: string;
        }> = results.flatMap((result: AnalysisResult) => 
            result.analysis.issues.map((issue: AnalysisIssue) => ({
            path: result.path,
            message: issue.message,
            severity: this.mapSeverity(issue.severity),
            suggestedFix: this.findSuggestedFix(result.suggestions, issue)
            }))
        );

        return {
            issues,
            metrics: {
                overallScore: this.calculateOverallScore(results),
                criticalIssues: issues.filter(i => i.severity === 'high').length,
                suggestions: results.reduce((acc, r) => acc + r.suggestions.length, 0)
            }
        };
    }

    private mapSeverity(severity: string): 'high' | 'medium' | 'low' {
        switch (severity) {
            case 'error':
                return 'high';
            case 'warning':
                return 'medium';
            default:
                return 'low';
        }
    }

    private findSuggestedFix(suggestions: any[], issue: any): string | undefined {
        const relevantSuggestion = suggestions.find(s => 
            s.type === 'fix' && s.originalIssue?.line === issue.line
        );
        return relevantSuggestion?.fixedContent;
    }

    private calculateOverallScore(results: any[]): number {
        const weights = { high: 1, medium: 0.5, low: 0.1 };
        const totalIssues = results.reduce((acc, r) => 
            acc + r.analysis.issues.reduce((sum: number, i: any) => 
                sum + (weights[this.mapSeverity(i.severity)] || 0), 0), 0);
        
        return Math.max(0, 100 - (totalIssues * 5));
    }
}
