// src/index.ts

import { GitHubService } from './services/github/GitHubService';
import { FerbService } from './services/ferb/ferbService';
import { SentryService } from './services/sentry/sentryService';
import { config } from './config/config';
import { logger } from './utils';

async function main() {
  try {
    const githubService = new GitHubService();

    const ferbService = new FerbService(githubService);
    ferbService.start();
    logger.info('Ferb service started');

    const sentryService = new SentryService(
      githubService,
      config.sentry.dsn,
      config.sentry.token,
      config.sentry.org
    );
    sentryService.performNightlyAnalysis(); // Start the first analysis
    logger.info('Sentry service started');

    process.on('SIGINT', async () => {
      logger.info('Shutting down gracefully...');
      // Perform any cleanup operations here
      process.exit(0);
    });

  } catch (error) {
    logger.error('Error starting services:', error);
    process.exit(1);
  }
}

main();