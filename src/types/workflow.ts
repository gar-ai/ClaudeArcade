/**
 * Workflow Types for Visual Workflow Editor
 * Inspired by cc-wf-studio - Claude Code Workflow Studio
 */

// Node types available in the workflow editor
export type WorkflowNodeType =
  | 'trigger'    // Event that starts the workflow (user input, file change, etc.)
  | 'prompt'     // Claude instruction/prompt node
  | 'action'     // Execute a skill, command, or tool
  | 'decision'   // If/else branching based on condition
  | 'subagent'   // Spawn an isolated context subagent
  | 'mcp_call'   // Call an MCP server tool
  | 'loop'       // Repeat actions in a loop
  | 'output';    // Return/output result

// Trigger types for workflow start
export type TriggerType =
  | 'manual'        // User manually invokes workflow
  | 'file_change'   // File modified in workspace
  | 'command'       // Slash command invoked
  | 'schedule'      // Time-based trigger
  | 'hook';         // Claude hook event

// Node data structure
export interface WorkflowNodeData {
  label: string;
  description?: string;
  // Link to inventory item (skill, command, mcp, etc.)
  linkedItemId?: string;
  linkedItemType?: string;
  // Node-specific configuration
  prompt?: string;           // For prompt nodes
  condition?: string;        // For decision nodes
  loopCount?: number;        // For loop nodes
  triggerType?: TriggerType; // For trigger nodes
  triggerConfig?: Record<string, unknown>;
  // MCP specific
  mcpServer?: string;
  mcpTool?: string;
  mcpArgs?: Record<string, unknown>;
  // Subagent specific
  subagentPrompt?: string;
  subagentContext?: string;
  // Execution state
  isExecuting?: boolean;
  lastResult?: string;
  lastError?: string;
}

// Position in the canvas
export interface Position {
  x: number;
  y: number;
}

// Workflow node (extends React Flow Node concept)
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: Position;
  data: WorkflowNodeData;
  // React Flow compatibility
  width?: number;
  height?: number;
  selected?: boolean;
  dragging?: boolean;
}

// Edge connection between nodes
export interface WorkflowEdge {
  id: string;
  source: string;      // Source node ID
  target: string;      // Target node ID
  sourceHandle?: string; // For nodes with multiple outputs (e.g., decision: 'true' | 'false')
  targetHandle?: string;
  label?: string;
  animated?: boolean;  // Animation for active edges
  type?: 'default' | 'smoothstep' | 'step' | 'straight';
}

// Complete workflow definition
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  // Metadata
  createdAt: number;
  updatedAt: number;
  version: string;
  author?: string;
  // Export settings
  exportType?: 'command' | 'subagent';
  exportPath?: string;
  // Execution state
  isExecuting?: boolean;
  lastExecutedAt?: number;
}

// Workflow execution state
export interface WorkflowExecution {
  workflowId: string;
  startedAt: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  currentNodeId?: string;
  visitedNodes: string[];
  nodeResults: Record<string, {
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: string;
    error?: string;
    startedAt?: number;
    completedAt?: number;
  }>;
  finalResult?: string;
  error?: string;
}

// Node template for drag-and-drop palette
export interface NodeTemplate {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: string;
  defaultData: Partial<WorkflowNodeData>;
  category: 'trigger' | 'flow' | 'action' | 'advanced';
}

// Predefined node templates
export const NODE_TEMPLATES: NodeTemplate[] = [
  // Triggers
  {
    type: 'trigger',
    label: 'Manual Trigger',
    description: 'Start workflow manually',
    icon: 'play',
    defaultData: { label: 'Start', triggerType: 'manual' },
    category: 'trigger',
  },
  {
    type: 'trigger',
    label: 'Command Trigger',
    description: 'Start when /command is invoked',
    icon: 'terminal',
    defaultData: { label: 'On Command', triggerType: 'command' },
    category: 'trigger',
  },
  // Flow control
  {
    type: 'prompt',
    label: 'Prompt',
    description: 'Claude instruction/prompt',
    icon: 'message',
    defaultData: { label: 'Prompt', prompt: '' },
    category: 'flow',
  },
  {
    type: 'decision',
    label: 'Decision',
    description: 'If/else branching',
    icon: 'git-branch',
    defaultData: { label: 'Decision', condition: '' },
    category: 'flow',
  },
  {
    type: 'loop',
    label: 'Loop',
    description: 'Repeat actions',
    icon: 'repeat',
    defaultData: { label: 'Loop', loopCount: 3 },
    category: 'flow',
  },
  // Actions
  {
    type: 'action',
    label: 'Action',
    description: 'Execute a skill or command',
    icon: 'zap',
    defaultData: { label: 'Action' },
    category: 'action',
  },
  {
    type: 'mcp_call',
    label: 'MCP Call',
    description: 'Call an MCP server tool',
    icon: 'plug',
    defaultData: { label: 'MCP Call' },
    category: 'action',
  },
  // Advanced
  {
    type: 'subagent',
    label: 'Subagent',
    description: 'Spawn isolated context agent',
    icon: 'users',
    defaultData: { label: 'Subagent', subagentPrompt: '' },
    category: 'advanced',
  },
  {
    type: 'output',
    label: 'Output',
    description: 'Return result',
    icon: 'check-circle',
    defaultData: { label: 'Output' },
    category: 'flow',
  },
];

// Category colors for nodes (RPG themed)
export const NODE_TYPE_COLORS: Record<WorkflowNodeType, { bg: string; border: string; accent: string }> = {
  trigger: { bg: '#2d3a2d', border: '#4ade80', accent: '#22c55e' },   // Green - start
  prompt: { bg: '#3a2d3a', border: '#c084fc', accent: '#a855f7' },   // Purple - magic/claude
  action: { bg: '#3a3a2d', border: '#fbbf24', accent: '#f59e0b' },   // Gold - action
  decision: { bg: '#2d3a3a', border: '#60a5fa', accent: '#3b82f6' }, // Blue - logic
  loop: { bg: '#3a2d2d', border: '#f87171', accent: '#ef4444' },     // Red - iteration
  subagent: { bg: '#2d2d3a', border: '#818cf8', accent: '#6366f1' }, // Indigo - agents
  mcp_call: { bg: '#3a3a3a', border: '#94a3b8', accent: '#64748b' }, // Gray - external
  output: { bg: '#2d3a2d', border: '#34d399', accent: '#10b981' },   // Emerald - finish
};

// Generate workflow markdown for export
export function generateWorkflowMarkdown(workflow: Workflow, exportType: 'command' | 'subagent'): string {
  const header = exportType === 'command'
    ? `# ${workflow.name}\n\n${workflow.description || ''}\n\n`
    : `# Subagent: ${workflow.name}\n\n${workflow.description || ''}\n\n## Context\nIsolated context agent for: ${workflow.description || workflow.name}\n\n`;

  // Build step-by-step instructions from nodes
  const steps: string[] = [];
  const sortedNodes = topologicalSort(workflow.nodes, workflow.edges);

  for (const node of sortedNodes) {
    switch (node.type) {
      case 'prompt':
        if (node.data.prompt) {
          steps.push(`## Prompt\n${node.data.prompt}`);
        }
        break;
      case 'action':
        steps.push(`## Action: ${node.data.label}\n${node.data.description || ''}`);
        break;
      case 'decision':
        steps.push(`## Decision\nCondition: ${node.data.condition || 'Check condition'}`);
        break;
      case 'mcp_call':
        steps.push(`## MCP Call: ${node.data.mcpTool || 'tool'}\nServer: ${node.data.mcpServer || 'server'}`);
        break;
      case 'subagent':
        steps.push(`## Spawn Subagent\n${node.data.subagentPrompt || ''}`);
        break;
      case 'output':
        steps.push(`## Output\nReturn the result.`);
        break;
    }
  }

  return header + steps.join('\n\n');
}

// Topological sort for workflow execution order
function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // Build graph
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    adjacency.get(edge.source)?.push(edge.target);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: WorkflowNode[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = nodeMap.get(current);
    if (node) sorted.push(node);

    for (const neighbor of adjacency.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  return sorted;
}
