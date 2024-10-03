// src/config/config.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  github: {
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_PRIVATE_KEY!,
    installationId: process.env.GITHUB_INSTALLATION_ID!,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN!,
    token: process.env.SENTRY_TOKEN!,
    org: process.env.SENTRY_ORG!,
  },
  ferbCronSchedule: process.env.FERB_CRON_SCHEDULE || '0 1 * * 1', // Every Monday at 1 AM
  sentryCronSchedule: process.env.SENTRY_CRON_SCHEDULE || '0 2 * * *', // Every day at 2 AM
  mainRepoOwner: process.env.MAIN_REPO_OWNER!,
  mainRepoName: process.env.MAIN_REPO_NAME!,
  harperCliPath: process.env.HARPER_CLI_PATH || 'harper-cli',
};

// Validate required configuration
const requiredEnvVars = [
  'GITHUB_APP_ID',
  'GITHUB_PRIVATE_KEY',
  'GITHUB_INSTALLATION_ID',
  'SENTRY_DSN',
  'SENTRY_TOKEN',
  'SENTRY_ORG',
  'MAIN_REPO_OWNER',
  'MAIN_REPO_NAME'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});