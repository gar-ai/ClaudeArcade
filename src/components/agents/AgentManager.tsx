/**
 * Agent Manager - List and manage Claude Code agents
 */

import { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import {
  listAgents,
  deleteAgent,
  AgentData,
  AVAILABLE_MODELS,
} from '../../services/agentService';
import { AgentEditor } from './AgentEditor';

interface AgentManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentManager({ isOpen, onClose }: AgentManagerProps) {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<AgentData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const projectPath = useProjectStore((state) => state.projectPath);

  // Load agents
  const loadAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAgents(projectPath || undefined);
      setAgents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAgents();
    }
  }, [isOpen, projectPath]);

  // Handle delete
  const handleDelete = async (agent: AgentData) => {
    try {
      await deleteAgent(agent.id, agent.is_global, projectPath || undefined);
      setDeleteConfirm(null);
      loadAgents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete agent');
    }
  };

  // Handle editor close
  const handleEditorClose = (saved: boolean) => {
    setEditingAgent(null);
    setIsCreating(false);
    if (saved) {
      loadAgents();
    }
  };

  if (!isOpen) return null;

  // Show editor if editing or creating
  if (editingAgent || isCreating) {
    return (
      <AgentEditor
        agent={editingAgent}
        isCreating={isCreating}
        onClose={handleEditorClose}
      />
    );
  }

  const getModelLabel = (model: string | null) => {
    if (!model) return 'Default';
    const found = AVAILABLE_MODELS.find((m) => m.value === model);
    return found ? found.label.split(' ')[1] : model;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[80vh] rounded-xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
          border: '2px solid #c9a227',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid #3d3328' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#c9a227' }}>
              Agent Manager
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#7a6f62' }}>
              Create and manage custom Claude agents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(180deg, #c9a227 0%, #a68820 100%)',
                color: '#1a1410',
              }}
            >
              + New Agent
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: '#7a6f62' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#c9a227', borderTopColor: 'transparent' }} />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
              <button
                onClick={loadAgents}
                className="mt-3 px-4 py-2 rounded-lg text-sm"
                style={{ background: '#3d3328', color: '#b8a894' }}
              >
                Retry
              </button>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: '#3d3328' }}
              >
                <svg className="w-8 h-8" fill="none" stroke="#7a6f62" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#b8a894' }}>
                No agents found
              </p>
              <p className="text-xs mt-1" style={{ color: '#7a6f62' }}>
                Create your first agent to get started
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(180deg, #c9a227 0%, #a68820 100%)',
                  color: '#1a1410',
                }}
              >
                + Create Agent
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-4 rounded-lg transition-all hover:scale-[1.01]"
                  style={{
                    background: 'linear-gradient(180deg, #3d3328 0%, #2d261e 100%)',
                    border: '1px solid #4a3f32',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate" style={{ color: '#c9a227' }}>
                          {agent.config.name || agent.id}
                        </h3>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0"
                          style={{
                            background: agent.is_global ? 'rgba(96, 165, 250, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                            color: agent.is_global ? '#60a5fa' : '#4ade80',
                          }}
                        >
                          {agent.is_global ? 'Global' : 'Project'}
                        </span>
                        {agent.config.model && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] shrink-0"
                            style={{ background: '#3d3328', color: '#b8a894' }}
                          >
                            {getModelLabel(agent.config.model)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: '#b8a894' }}>
                        {agent.config.description || 'No description'}
                      </p>
                      {agent.config.tools && agent.config.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.config.tools.slice(0, 5).map((tool) => (
                            <span
                              key={tool}
                              className="px-1.5 py-0.5 rounded text-[9px]"
                              style={{ background: '#2d261e', color: '#7a6f62' }}
                            >
                              {tool}
                            </span>
                          ))}
                          {agent.config.tools.length > 5 && (
                            <span className="text-[9px]" style={{ color: '#7a6f62' }}>
                              +{agent.config.tools.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-3 shrink-0">
                      <button
                        onClick={() => setEditingAgent(agent)}
                        className="p-2 rounded-lg transition-all hover:bg-white/10"
                        style={{ color: '#b8a894' }}
                        title="Edit agent"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {deleteConfirm === agent.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(agent)}
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ background: '#ef4444', color: '#fff' }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 rounded text-xs"
                            style={{ background: '#3d3328', color: '#b8a894' }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(agent.id)}
                          className="p-2 rounded-lg transition-all hover:bg-red-500/10"
                          style={{ color: '#ef4444' }}
                          title="Delete agent"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center justify-between shrink-0"
          style={{ borderTop: '1px solid #3d3328', background: '#1a1410' }}
        >
          <span className="text-xs" style={{ color: '#7a6f62' }}>
            {agents.length} agent{agents.length !== 1 ? 's' : ''} • Stored in ~/.claude/agents/
          </span>
          <button
            onClick={loadAgents}
            className="text-xs px-2 py-1 rounded transition-all hover:bg-white/5"
            style={{ color: '#b8a894' }}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
