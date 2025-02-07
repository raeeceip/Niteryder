import OpenAI from 'openai';
import { AnalysisResult } from '../codeAnalysis/CodeAnalysisService';
import { logger } from '../../utils/logger';

export interface AISuggestion {
  type: 'issue' | 'fix';
  id: string;
  title: string;
  body: string;
  filePath?: string;
  fixedContent?: string;
  baseSha?: string;
}

export class AIIntegrationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzePullRequest(diff: string) {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a code review assistant. Analyze the following diff and provide feedback."
        },
        {
          role: "user",
          content: diff
        }
      ]
    });

    return completion.choices[0].message.content;
  }

  async suggestFix(code: string, issue: string) {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a code fixing assistant. Suggest a fix for the following issue."
        },
        {
          role: "user",
          content: `Code:\n${code}\n\nIssue:\n${issue}`
        }
      ]
    });

    return completion.choices[0].message.content;
  }

  async analyzeResults(owner: string, repo: string, analysisResults: AnalysisResult[]): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    
    for (const result of analysisResults) {
      if (result.issues.length > 0) {
        const suggestion = await this.generateSuggestion(result);
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }
  
  async analyzeCode(owner: string, repo: string): Promise<AISuggestion[]> {
    // Placeholder implementation - can be enhanced based on AI response format
    return [
      {
        type: 'issue',
        id: 'issue-1',
        title: 'Code improvement suggestion',
        body: 'Consider refactoring this code to improve readability and maintainability.',
        filePath: 'src/index.ts'
      }
    ];
  }

  private async generateSuggestion(analysisResult: AnalysisResult): Promise<AISuggestion> {
    try {
      const prompt = this.createAnalysisPrompt(analysisResult);
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a code review assistant. Generate suggestions for code improvements."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      return this.parseSuggestion(completion.choices[0].message.content || '', analysisResult);
    } catch (error) {
      logger.error('Error generating AI suggestion:', error);
      throw error;
    }
  }

  private createAnalysisPrompt(analysisResult: AnalysisResult): string {
    return `Analyze the following code issues and suggest improvements:
    File: ${analysisResult.path}
    Issues: ${JSON.stringify(analysisResult.issues, null, 2)}
    Metrics: ${JSON.stringify(analysisResult.metrics, null, 2)}`;
  }

  private parseSuggestion(content: string, analysisResult: AnalysisResult): AISuggestion {
    // Simple implementation - can be enhanced based on AI response format
    return {
      type: 'issue',
      id: `fix-${Date.now()}`,
      title: `Code improvement suggestion for ${analysisResult.path}`,
      body: content,
      filePath: analysisResult.path
    };
  }
}