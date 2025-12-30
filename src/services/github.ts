/**
 * GitHub API Service for fetching skills and MCP servers from official repos
 */

export interface GitHubSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  source: 'official' | 'community' | 'enterprise';
  repoUrl: string;
  path: string;
}

export interface GitHubMCPServer {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
  path: string;
  source: 'official' | 'community';
}

interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  url: string;
  html_url: string;
}

// Cache for GitHub API responses (5 minute TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      // Note: For higher rate limits, users can add their own GitHub token
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data as T;
}

/**
 * Fetch official skills from anthropics/skills repo
 */
export async function fetchOfficialSkills(): Promise<GitHubSkill[]> {
  const skills: GitHubSkill[] = [];

  try {
    // Fetch skills directory contents
    const contents = await fetchWithCache<GitHubContent[]>(
      'https://api.github.com/repos/anthropics/skills/contents/skills'
    );

    for (const item of contents) {
      if (item.type === 'dir') {
        // Determine category based on skill name
        const category = categorizeSkill(item.name);

        skills.push({
          id: `skill-${item.name}`,
          name: formatSkillName(item.name),
          description: getSkillDescription(item.name),
          category,
          source: 'official',
          repoUrl: 'https://github.com/anthropics/skills',
          path: item.path,
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch official skills:', error);
  }

  return skills;
}

/**
 * Fetch official MCP servers from modelcontextprotocol/servers repo
 */
export async function fetchOfficialMCPServers(): Promise<GitHubMCPServer[]> {
  const servers: GitHubMCPServer[] = [];

  try {
    // Fetch src directory contents
    const contents = await fetchWithCache<GitHubContent[]>(
      'https://api.github.com/repos/modelcontextprotocol/servers/contents/src'
    );

    for (const item of contents) {
      if (item.type === 'dir') {
        servers.push({
          id: `mcp-${item.name}`,
          name: formatSkillName(item.name),
          description: getMCPServerDescription(item.name),
          repoUrl: 'https://github.com/modelcontextprotocol/servers',
          path: item.path,
          source: 'official',
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch official MCP servers:', error);
  }

  return servers;
}

/**
 * Fetch HuggingFace skills from huggingface/skills repo
 */
export async function fetchHuggingFaceSkills(): Promise<GitHubSkill[]> {
  const skills: GitHubSkill[] = [];

  try {
    // Fetch root directory contents
    const contents = await fetchWithCache<GitHubContent[]>(
      'https://api.github.com/repos/huggingface/skills/contents'
    );

    for (const item of contents) {
      // Only look for directories that look like skills (contain hf- prefix)
      if (item.type === 'dir' && (item.name.startsWith('hf-') || item.name.startsWith('hf_'))) {
        skills.push({
          id: `hf-skill-${item.name}`,
          name: formatHFSkillName(item.name),
          description: getHFSkillDescription(item.name),
          category: 'ml-training',
          source: 'community',
          repoUrl: `https://github.com/huggingface/skills/tree/main/${item.name}`,
          path: item.path,
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch HuggingFace skills:', error);
  }

  return skills;
}

function formatHFSkillName(name: string): string {
  return name
    .replace(/^hf[-_]/, 'HF ')
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getHFSkillDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'hf-llm-trainer': 'Train LLMs on Hugging Face Jobs with TRL, SFT, DPO, and GRPO methods',
    'hf_dataset_creator': 'Create structured training datasets with prompts and templates',
    'hf_model_evaluation': 'Orchestrate evaluation jobs and generate performance reports',
    'hf-paper-publisher': 'Publish and manage research papers on Hugging Face Hub',
  };
  return descriptions[name] || `Hugging Face ${formatHFSkillName(name)} skill for ML workflows`;
}

/**
 * Enterprise partner skills (static list based on Anthropic's announcements)
 */
export function getEnterpriseSkills(): GitHubSkill[] {
  return [
    {
      id: 'enterprise-atlassian',
      name: 'Atlassian',
      description: 'Jira, Confluence, and Trello integration for project management',
      category: 'enterprise',
      source: 'enterprise',
      repoUrl: 'https://www.atlassian.com',
      path: '',
    },
    {
      id: 'enterprise-canva',
      name: 'Canva',
      description: 'Design creation and editing with Canva',
      category: 'enterprise',
      source: 'enterprise',
      repoUrl: 'https://www.canva.com',
      path: '',
    },
    {
      id: 'enterprise-cloudflare',
      name: 'Cloudflare',
      description: 'CDN, DNS, and web security management',
      category: 'enterprise',
      source: 'enterprise',
      repoUrl: 'https://www.cloudflare.com',
      path: '',
    },
    {
      id: 'enterprise-figma',
      name: 'Figma',
      description: 'UI/UX design collaboration and prototyping',
      category: 'enterprise',
      source: 'enterprise',
      repoUrl: 'https://www.figma.com',
      path: '',
    },
    {
      id: 'enterprise-notion',
      name: 'Notion',
      description: 'Workspace and documentation management',
      category: 'enterprise',
      source: 'enterprise',
      repoUrl: 'https://www.notion.so',
      path: '',
    },
    {
      id: 'enterprise-ramp',
      name: 'Ramp',
      description: 'Corporate finance and expense management',
      category: 'enterprise',
      source: 'enterprise',
      repoUrl: 'https://www.ramp.com',
      path: '',
    },
    {
      id: 'enterprise-sentry',
      name: 'Sentry',
      description: 'Error tracking and performance monitoring',
      category: 'enterprise',
      source: 'enterprise',
      repoUrl: 'https://sentry.io',
      path: '',
    },
  ];
}

// Helper functions
function formatSkillName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function categorizeSkill(name: string): string {
  const documentSkills = ['docx', 'pdf', 'pptx', 'xlsx'];
  const designSkills = ['algorithmic-art', 'canvas-design', 'frontend-design', 'theme-factory', 'slack-gif-creator'];
  const devSkills = ['mcp-builder', 'webapp-testing', 'web-artifacts-builder', 'skill-creator'];
  const commSkills = ['brand-guidelines', 'internal-comms', 'doc-coauthoring'];

  if (documentSkills.includes(name)) return 'documents';
  if (designSkills.includes(name)) return 'design';
  if (devSkills.includes(name)) return 'development';
  if (commSkills.includes(name)) return 'communication';
  return 'other';
}

function getSkillDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'docx': 'Create, edit, and analyze Word documents with tracked changes support',
    'pdf': 'Comprehensive PDF manipulation toolkit for text and table extraction',
    'pptx': 'Create, edit, and analyze PowerPoint presentations',
    'xlsx': 'Create, edit, and analyze Excel spreadsheets with formula support',
    'algorithmic-art': 'Generate art using p5.js with randomness and particle systems',
    'canvas-design': 'Design visual art in PNG and PDF formats',
    'slack-gif-creator': 'Create animated GIFs optimized for Slack',
    'frontend-design': 'Modern frontend design with React and Tailwind CSS',
    'mcp-builder': 'Guide for creating MCP servers',
    'webapp-testing': 'Test local web applications using Playwright',
    'brand-guidelines': 'Apply brand colors and typography consistently',
    'internal-comms': 'Write status reports, newsletters, and FAQs',
    'skill-creator': 'Interactive tool for building new skills',
    'theme-factory': 'Generate and customize themes',
    'web-artifacts-builder': 'Build complex HTML artifacts with React',
    'doc-coauthoring': 'Collaborative document creation',
  };
  return descriptions[name] || `${formatSkillName(name)} skill`;
}

function getMCPServerDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'everything': 'A comprehensive server with all MCP capabilities for testing',
    'fetch': 'Make HTTP requests and fetch web content',
    'filesystem': 'Read and write files on your local filesystem',
    'git': 'Git repository operations and version control',
    'memory': 'Persistent memory storage for Claude',
    'sequentialthinking': 'Step-by-step reasoning and problem solving',
    'time': 'Current time and timezone utilities',
  };
  return descriptions[name] || `${formatSkillName(name)} MCP server`;
}

/**
 * Clear the cache (useful for forcing refresh)
 */
export function clearCache(): void {
  cache.clear();
}
