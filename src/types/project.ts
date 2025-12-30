// === PROJECT REGISTRY ===

// Matches backend ClaudeItemsSummary from project.rs
export interface ClaudeItemsSummary {
  hasClaudeFolder: boolean;
  hasClaudeMd: boolean;
  commandCount: number;
  skillCount: number;
  hookCount: number;
  subagentCount: number;
  mcpCount: number;
  totalTokenEstimate: number;
  commands: string[];
  skills: string[];
  subagents: string[];
}

// Matches backend ProjectScanResult from project.rs
export interface ProjectScanResult {
  claudeItems: ClaudeItemsSummary;
  projectType: ProjectType;
  hasPackageJson: boolean;
  hasCargoToml: boolean;
  hasPyproject: boolean;
  hasGoMod: boolean;
  hasGemfile: boolean;
}

// Supported project types
export type ProjectType =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'ruby'
  | 'java'
  | 'generic';

// Project type display info
export interface ProjectTypeInfo {
  label: string;
  icon: string;
  color: string;
}

export const PROJECT_TYPE_INFO: Record<ProjectType, ProjectTypeInfo> = {
  typescript: { label: 'TypeScript', icon: 'TS', color: '#3178c6' },
  javascript: { label: 'JavaScript', icon: 'JS', color: '#f7df1e' },
  python: { label: 'Python', icon: 'PY', color: '#3776ab' },
  rust: { label: 'Rust', icon: 'RS', color: '#dea584' },
  go: { label: 'Go', icon: 'GO', color: '#00add8' },
  ruby: { label: 'Ruby', icon: 'RB', color: '#cc342d' },
  java: { label: 'Java', icon: 'JV', color: '#b07219' },
  generic: { label: 'Project', icon: '?', color: '#6b7280' },
};

// Registered project in the registry
export interface RegisteredProject {
  id: string;
  path: string;
  name: string;
  type: ProjectType;
  tags: string[];
  notes: string;
  claudeItems: ClaudeItemsSummary;
  createdAt: number;
  lastOpened: number;
  openCount: number;
}

// Create empty claude items summary
export const EMPTY_CLAUDE_ITEMS: ClaudeItemsSummary = {
  hasClaudeFolder: false,
  hasClaudeMd: false,
  commandCount: 0,
  skillCount: 0,
  hookCount: 0,
  subagentCount: 0,
  mcpCount: 0,
  totalTokenEstimate: 0,
  commands: [],
  skills: [],
  subagents: [],
};

// Helper to generate project ID from path
export function generateProjectId(path: string): string {
  // Use last 2 path segments + timestamp for uniqueness
  const segments = path.split('/').filter(Boolean);
  const lastTwo = segments.slice(-2).join('-');
  const hash = path.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `${lastTwo}-${Math.abs(hash).toString(36)}`;
}

// Helper to extract project name from path
export function extractProjectName(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'Unknown';
}

// Helper to check if a project has claude items configured
export function hasClaudeConfiguration(items: ClaudeItemsSummary): boolean {
  return (
    items.hasClaudeFolder ||
    items.hasClaudeMd ||
    items.commandCount > 0 ||
    items.skillCount > 0 ||
    items.hookCount > 0 ||
    items.subagentCount > 0 ||
    items.mcpCount > 0
  );
}

// Helper to get total item count
export function getTotalItemCount(items: ClaudeItemsSummary): number {
  return (
    items.commandCount +
    items.skillCount +
    items.hookCount +
    items.subagentCount +
    items.mcpCount +
    (items.hasClaudeMd ? 1 : 0)
  );
}
