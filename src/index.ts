import { GitHubService } from './services/github/githubService';

async function main() {
  const githubService = new GitHubService();

  try {
    const repos = await githubService.listRepositories();
    console.log('Accessible repositories:', repos.map(repo => repo.full_name));
    // TODO: Implement repository scanning and task assignment logic
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
