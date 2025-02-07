import { env } from 'process';

export const config = {
    githubToken: env.GITHUB_TOKEN || '',
    openAiApiKey: env.OPENAI_API_KEY || '',
    sentryDsn: env.SENTRY_DSN || '',
    
    // Add any other necessary configuration settings here
};