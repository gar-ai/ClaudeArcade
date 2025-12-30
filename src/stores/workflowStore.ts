import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  WorkflowNodeData,
  Position,
} from '../types/workflow';

interface WorkflowState {
  // All saved workflows
  workflows: Workflow[];
  // Currently editing workflow
  currentWorkflowId: string | null;
  // Canvas state (for current workflow)
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  // Selection state
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  // Editor state
  isEditorOpen: boolean;
  isPaletteOpen: boolean;
  isInspectorOpen: boolean;
  // Execution state
  execution: WorkflowExecution | null;
}

interface WorkflowActions {
  // Workflow CRUD
  createWorkflow: (name: string, description?: string) => Workflow;
  loadWorkflow: (workflowId: string) => void;
  saveCurrentWorkflow: () => void;
  deleteWorkflow: (workflowId: string) => void;
  duplicateWorkflow: (workflowId: string) => Workflow;
  updateWorkflowMeta: (workflowId: string, updates: Partial<Pick<Workflow, 'name' | 'description' | 'icon'>>) => void;

  // Node operations
  addNode: (type: WorkflowNode['type'], position: Position, data?: Partial<WorkflowNodeData>) => string;
  updateNode: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, position: Position) => void;

  // Edge operations
  addEdge: (source: string, target: string, sourceHandle?: string, targetHandle?: string) => string;
  deleteEdge: (edgeId: string) => void;
  updateEdgeLabel: (edgeId: string, label: string) => void;

  // Selection
  selectNode: (nodeId: string, addToSelection?: boolean) => void;
  selectEdge: (edgeId: string, addToSelection?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Editor UI
  openEditor: (workflowId?: string) => void;
  closeEditor: () => void;
  togglePalette: () => void;
  toggleInspector: () => void;

  // Execution (placeholder for future)
  startExecution: () => void;
  stopExecution: () => void;

  // React Flow callbacks
  onNodesChange: (changes: unknown[]) => void;
  onEdgesChange: (changes: unknown[]) => void;
  onConnect: (connection: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) => void;

  // Helpers
  getCurrentWorkflow: () => Workflow | null;
  getSelectedNodes: () => WorkflowNode[];
}

function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function generateEdgeId(): string {
  return `edge_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

export const useWorkflowStore = create<WorkflowState & WorkflowActions>()(
  persist(
    (set, get) => ({
      // Initial state
      workflows: [],
      currentWorkflowId: null,
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      isEditorOpen: false,
      isPaletteOpen: true,
      isInspectorOpen: true,
      execution: null,

      // Workflow CRUD
      createWorkflow: (name, description) => {
        const workflow: Workflow = {
          id: generateId(),
          name,
          description,
          nodes: [
            {
              id: 'trigger_start',
              type: 'trigger',
              position: { x: 250, y: 50 },
              data: { label: 'Start', triggerType: 'manual' },
            },
          ],
          edges: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: '1.0.0',
        };

        set((state) => ({
          workflows: [...state.workflows, workflow],
          currentWorkflowId: workflow.id,
          nodes: workflow.nodes,
          edges: workflow.edges,
        }));

        return workflow;
      },

      loadWorkflow: (workflowId) => {
        const workflow = get().workflows.find((w) => w.id === workflowId);
        if (workflow) {
          set({
            currentWorkflowId: workflowId,
            nodes: [...workflow.nodes],
            edges: [...workflow.edges],
            selectedNodeIds: [],
            selectedEdgeIds: [],
          });
        }
      },

      saveCurrentWorkflow: () => {
        const { currentWorkflowId, nodes, edges, workflows } = get();
        if (!currentWorkflowId) return;

        set({
          workflows: workflows.map((w) =>
            w.id === currentWorkflowId
              ? { ...w, nodes, edges, updatedAt: Date.now() }
              : w
          ),
        });
      },

      deleteWorkflow: (workflowId) => {
        const { currentWorkflowId } = get();
        set((state) => ({
          workflows: state.workflows.filter((w) => w.id !== workflowId),
          currentWorkflowId: currentWorkflowId === workflowId ? null : currentWorkflowId,
          nodes: currentWorkflowId === workflowId ? [] : state.nodes,
          edges: currentWorkflowId === workflowId ? [] : state.edges,
        }));
      },

      duplicateWorkflow: (workflowId) => {
        const workflow = get().workflows.find((w) => w.id === workflowId);
        if (!workflow) {
          // Return a placeholder if not found
          return get().createWorkflow('New Workflow');
        }

        const newWorkflow: Workflow = {
          ...workflow,
          id: generateId(),
          name: `${workflow.name} (Copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          workflows: [...state.workflows, newWorkflow],
        }));

        return newWorkflow;
      },

      updateWorkflowMeta: (workflowId, updates) => {
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === workflowId ? { ...w, ...updates, updatedAt: Date.now() } : w
          ),
        }));
      },

      // Node operations
      addNode: (type, position, data = {}) => {
        const id = generateNodeId();
        const defaultLabels: Record<string, string> = {
          trigger: 'Start',
          prompt: 'Prompt',
          action: 'Action',
          decision: 'Decision',
          loop: 'Loop',
          subagent: 'Subagent',
          mcp_call: 'MCP Call',
          output: 'Output',
        };

        const newNode: WorkflowNode = {
          id,
          type,
          position,
          data: {
            label: defaultLabels[type] || type,
            ...data,
          },
        };

        set((state) => ({
          nodes: [...state.nodes, newNode],
        }));

        return id;
      },

      updateNode: (nodeId, updates) => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
          ),
        }));
      },

      deleteNode: (nodeId) => {
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
          edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
          selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
        }));
      },

      moveNode: (nodeId, position) => {
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
        }));
      },

      // Edge operations
      addEdge: (source, target, sourceHandle, targetHandle) => {
        const id = generateEdgeId();
        const newEdge: WorkflowEdge = {
          id,
          source,
          target,
          sourceHandle,
          targetHandle,
          type: 'smoothstep',
        };

        set((state) => ({
          edges: [...state.edges, newEdge],
        }));

        return id;
      },

      deleteEdge: (edgeId) => {
        set((state) => ({
          edges: state.edges.filter((e) => e.id !== edgeId),
          selectedEdgeIds: state.selectedEdgeIds.filter((id) => id !== edgeId),
        }));
      },

      updateEdgeLabel: (edgeId, label) => {
        set((state) => ({
          edges: state.edges.map((e) => (e.id === edgeId ? { ...e, label } : e)),
        }));
      },

      // Selection
      selectNode: (nodeId, addToSelection = false) => {
        set((state) => ({
          selectedNodeIds: addToSelection
            ? [...state.selectedNodeIds, nodeId]
            : [nodeId],
          selectedEdgeIds: addToSelection ? state.selectedEdgeIds : [],
        }));
      },

      selectEdge: (edgeId, addToSelection = false) => {
        set((state) => ({
          selectedEdgeIds: addToSelection
            ? [...state.selectedEdgeIds, edgeId]
            : [edgeId],
          selectedNodeIds: addToSelection ? state.selectedNodeIds : [],
        }));
      },

      clearSelection: () => {
        set({ selectedNodeIds: [], selectedEdgeIds: [] });
      },

      selectAll: () => {
        set((state) => ({
          selectedNodeIds: state.nodes.map((n) => n.id),
          selectedEdgeIds: state.edges.map((e) => e.id),
        }));
      },

      // Editor UI
      openEditor: (workflowId) => {
        if (workflowId) {
          get().loadWorkflow(workflowId);
        }
        set({ isEditorOpen: true });
      },

      closeEditor: () => {
        get().saveCurrentWorkflow();
        set({ isEditorOpen: false });
      },

      togglePalette: () => {
        set((state) => ({ isPaletteOpen: !state.isPaletteOpen }));
      },

      toggleInspector: () => {
        set((state) => ({ isInspectorOpen: !state.isInspectorOpen }));
      },

      // Execution (placeholder)
      startExecution: () => {
        const { currentWorkflowId, nodes } = get();
        if (!currentWorkflowId) return;

        set({
          execution: {
            workflowId: currentWorkflowId,
            startedAt: Date.now(),
            status: 'running',
            visitedNodes: [],
            nodeResults: Object.fromEntries(
              nodes.map((n) => [n.id, { status: 'pending' as const }])
            ),
          },
        });
      },

      stopExecution: () => {
        set((state) => ({
          execution: state.execution
            ? { ...state.execution, status: 'cancelled' as const }
            : null,
        }));
      },

      // React Flow callbacks
      onNodesChange: (changes) => {
        // Handle node changes from React Flow
        set((state) => {
          let newNodes = [...state.nodes];

          for (const change of changes as Array<{
            type: string;
            id?: string;
            position?: Position;
            selected?: boolean;
            dragging?: boolean;
          }>) {
            if (change.type === 'position' && change.id && change.position) {
              newNodes = newNodes.map((n) =>
                n.id === change.id ? { ...n, position: change.position! } : n
              );
            }
            if (change.type === 'select' && change.id) {
              newNodes = newNodes.map((n) =>
                n.id === change.id ? { ...n, selected: change.selected } : n
              );
            }
            if (change.type === 'remove' && change.id) {
              newNodes = newNodes.filter((n) => n.id !== change.id);
            }
          }

          return { nodes: newNodes };
        });
      },

      onEdgesChange: (changes) => {
        // Handle edge changes from React Flow
        set((state) => {
          let newEdges = [...state.edges];

          for (const change of changes as Array<{ type: string; id?: string }>) {
            if (change.type === 'remove' && change.id) {
              newEdges = newEdges.filter((e) => e.id !== change.id);
            }
          }

          return { edges: newEdges };
        });
      },

      onConnect: (connection) => {
        if (connection.source && connection.target) {
          get().addEdge(
            connection.source,
            connection.target,
            connection.sourceHandle,
            connection.targetHandle
          );
        }
      },

      // Helpers
      getCurrentWorkflow: () => {
        const { currentWorkflowId, workflows } = get();
        return workflows.find((w) => w.id === currentWorkflowId) || null;
      },

      getSelectedNodes: () => {
        const { nodes, selectedNodeIds } = get();
        return nodes.filter((n) => selectedNodeIds.includes(n.id));
      },
    }),
    {
      name: 'claudearcade-workflows',
      partialize: (state) => ({
        workflows: state.workflows,
        isPaletteOpen: state.isPaletteOpen,
        isInspectorOpen: state.isInspectorOpen,
      }),
    }
  )
);
