import { ESLint, Linter } from "eslint";
import { GitHubService } from '../github/GitHubService';
import { logger } from "../../utils/logger";

export interface AnalysisResult {
  path: string;
  issues: Array<{
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    line: number;
    column: number;
  }>;
  metrics: {
    complexity: number;
    linesOfCode: number;
    maintainabilityIndex: number;
  };
}

export class CodeAnalysisService {
  private eslint: ESLint;
  private githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
    this.eslint = new ESLint({
      overrideConfig: {
        extends: [
          'eslint:recommended',
          'plugin:@typescript-eslint/recommended'
        ],
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 2020,
          sourceType: 'module',
        }
      },
      useEslintrc: false,
      fix: true
    } as ESLint.Options);
  }

  async analyzeRepository(owner: string, repo: string): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    const contents = await this.githubService.getRepositoryContent(owner, repo);

    for (const file of contents) {
      if (this.isAnalyzableFile(file.name)) {
        const content = await this.githubService.getFileContent(owner, repo, file.path);
        const analysis = await this.analyzeFile(file.path, content);
        results.push(analysis);
      }
    }

    return results;
  }

  public async analyzeFile(path: string, content: string): Promise<AnalysisResult> {
    const lintResults = await this.eslint.lintText(content, { filePath: path });
    const metrics = this.calculateMetrics(content);

    return {
      path,
      issues: this.formatLintResults(lintResults[0]),
      metrics,
    };
  }

  private isAnalyzableFile(filename: string): boolean {
    const analyzableExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    return analyzableExtensions.some(ext => filename.endsWith(ext));
  }

  private formatLintResults(result: ESLint.LintResult) {
    interface Issue {
      type: string;
      severity: 'error' | 'warning' | 'info';
      message: string;
      line: number;
      column: number;
    }

    return result.messages.map<Issue>((msg: Linter.LintMessage): Issue => ({
      type: msg.ruleId || 'unknown',
      severity: this.getSeverity(msg.severity),
      message: msg.message,
      line: msg.line,
      column: msg.column,
    }));
  }

  private getSeverity(severity: number): 'error' | 'warning' | 'info' {
    switch (severity) {
      case 2:
        return 'error';
      case 1:
        return 'warning';
      default:
        return 'info';
    }
  }

  private calculateMetrics(content: string) {
    return {
      complexity: this.calculateComplexity(content),
      linesOfCode: content.split('\n').length,
      maintainabilityIndex: this.calculateMaintainabilityIndex(content),
    };
  }

  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on control structures
    const controlStructures = [
      'if', 'for', 'while', 'switch', 'catch', '&&', '||',
      '?.', '??', 'function', '=>'
    ];
    
    return controlStructures.reduce((count, structure) => 
      count + (content.match(new RegExp(structure, 'g')) || []).length, 1);
  }

  private calculateMaintainabilityIndex(content: string): number {
    const linesOfCode = content.split('\n').length;
    const complexity = this.calculateComplexity(content);
    
    // Simplified maintainability index calculation
    return Math.max(0, 100 - (linesOfCode * 0.1) - (complexity * 0.2));
  }
}