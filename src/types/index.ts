export interface Repository {
    owner: string;
    name: string;
    description?: string;
    url: string;
}

export interface AnalysisResult {
    repository: string;
    issues: string[];
    suggestions: string[];
}

export interface PullRequest {
    id: number;
    title: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    state: 'open' | 'closed' | 'merged';
}

export interface CodeAnalysisReport {
    repository: string;
    issuesFound: number;
    suggestions: string[];
}

export interface CIResult {
    pipelineId: string;
    status: 'success' | 'failure';
    logs: string;
}