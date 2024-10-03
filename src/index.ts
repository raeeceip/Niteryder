// src/index.ts
import { GitHubService } from './services/github';

async function main() {
  const githubService = new GitHubService();

  try {
    // Your main logic here
    const repos = await githubService.repositories.listRepositories();
    console.log('Accessible repositories:', repos.map((repo: { full_name: string }) => repo.full_name));

    // More code...

  } catch (error) {
    console.error('Error:', error);
  }
}

main();