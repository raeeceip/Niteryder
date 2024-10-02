import dotenv from 'dotenv';

dotenv.config();

export const config = {
  github: {
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
    installationId: process.env.GITHUB_INSTALLATION_ID,
  },
  cronSchedule: process.env.CRON_SCHEDULE || '0 1 * * *', // Default to 1 AM daily
};
