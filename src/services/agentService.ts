/**
 * Agent Service - Manages Claude Code agents (subagents)
 * Provides CRUD operations for agent markdown files
 */

import { invoke } from '@tauri-apps/api/core';

/** Agent configuration (from YAML frontmatter + body) */
export interface AgentConfig {
  name: string;
  description: string;
  tools: string[] | null;
  model: string | null;
  permission_mode: string | null;
  skills: string[] | null;
  system_prompt: string;
}

/** Full agent data including file info */
export interface AgentData {
  id: string;
  file_path: string;
  is_global: boolean;
  config: AgentConfig;
}

/** Available tools for agents */
export const AVAILABLE_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Glob',
  'Grep',
  'WebSearch',
  'WebFetch',
  'Task',
  'AskUserQuestion',
  'TodoWrite',
  'NotebookEdit',
] as const;

/** Available models */
export const AVAILABLE_MODELS = [
  { value: 'sonnet', label: 'Claude Sonnet (Default)' },
  { value: 'opus', label: 'Claude Opus (Most Capable)' },
  { value: 'haiku', label: 'Claude Haiku (Fast)' },
  { value: 'inherit', label: 'Inherit from Parent' },
] as const;

/** Permission modes */
export const PERMISSION_MODES = [
  { value: 'default', label: 'Default', description: 'Normal permission prompts' },
  { value: 'acceptEdits', label: 'Accept Edits', description: 'Auto-accept file edits' },
  { value: 'bypassPermissions', label: 'Bypass All', description: 'Skip all permission checks' },
  { value: 'plan', label: 'Plan Mode', description: 'Plan-only, no execution' },
] as const;

/**
 * List all agents (global and project-specific)
 */
export async function listAgents(projectPath?: string): Promise<AgentData[]> {
  return invoke<AgentData[]>('list_agents', { projectPath });
}

/**
 * Get a single agent by ID
 */
export async function getAgent(
  agentId: string,
  isGlobal: boolean,
  projectPath?: string
): Promise<AgentData> {
  return invoke<AgentData>('get_agent', { agentId, isGlobal, projectPath });
}

/**
 * Create or update an agent
 */
export async function saveAgent(
  agentId: string,
  config: AgentConfig,
  isGlobal: boolean,
  projectPath?: string
): Promise<AgentData> {
  return invoke<AgentData>('save_agent', { agentId, config, isGlobal, projectPath });
}

/**
 * Delete an agent
 */
export async function deleteAgent(
  agentId: string,
  isGlobal: boolean,
  projectPath?: string
): Promise<void> {
  return invoke<void>('delete_agent', { agentId, isGlobal, projectPath });
}

/**
 * Get raw agent content (for advanced editing)
 */
export async function getAgentContent(
  agentId: string,
  isGlobal: boolean,
  projectPath?: string
): Promise<string> {
  return invoke<string>('get_agent_content', { agentId, isGlobal, projectPath });
}

/**
 * Save raw agent content
 */
export async function saveAgentContent(
  agentId: string,
  content: string,
  isGlobal: boolean,
  projectPath?: string
): Promise<void> {
  return invoke<void>('save_agent_content', { agentId, content, isGlobal, projectPath });
}

/**
 * Generate a valid agent ID from a name
 */
export function generateAgentId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Create a new empty agent config
 */
export function createEmptyAgentConfig(): AgentConfig {
  return {
    name: '',
    description: '',
    tools: null,
    model: null,
    permission_mode: null,
    skills: null,
    system_prompt: '',
  };
}

/**
 * Generate markdown content from config (for preview)
 */
export function generateAgentMarkdown(config: AgentConfig): string {
  const lines: string[] = ['---'];

  if (config.name) {
    lines.push(`name: ${config.name}`);
  }
  if (config.description) {
    lines.push(`description: ${config.description}`);
  }
  if (config.tools && config.tools.length > 0) {
    lines.push(`tools: ${config.tools.join(', ')}`);
  }
  if (config.model) {
    lines.push(`model: ${config.model}`);
  }
  if (config.permission_mode) {
    lines.push(`permission-mode: ${config.permission_mode}`);
  }
  if (config.skills && config.skills.length > 0) {
    lines.push(`skills: ${config.skills.join(', ')}`);
  }

  lines.push('---');
  lines.push('');
  lines.push(config.system_prompt);

  return lines.join('\n');
}
