import { useEffect, useState } from 'react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { NODE_TYPE_COLORS, type WorkflowNodeType } from '../../types/workflow';

interface NodeInspectorProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedNodeId: string | null;
}

export function NodeInspector({ isOpen, onToggle, selectedNodeId }: NodeInspectorProps) {
  const nodes = useWorkflowStore((state) => state.nodes);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  // Local state for form
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [condition, setCondition] = useState('');

  // Sync local state with selected node
  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      setDescription(selectedNode.data.description || '');
      setPrompt(selectedNode.data.prompt || '');
      setCondition(selectedNode.data.condition || '');
    }
  }, [selectedNode]);

  const handleSave = () => {
    if (!selectedNodeId) return;
    updateNode(selectedNodeId, {
      label,
      description,
      prompt: prompt || undefined,
      condition: condition || undefined,
    });
  };

  const handleDelete = () => {
    if (!selectedNodeId) return;
    if (confirm('Delete this node?')) {
      deleteNode(selectedNodeId);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-4 top-4 z-10 p-2 rounded-lg transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
          border: '1px solid #4a3f32',
          color: '#c9a227',
        }}
        title="Open Node Inspector"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    );
  }

  const colors = selectedNode
    ? NODE_TYPE_COLORS[selectedNode.type as WorkflowNodeType]
    : null;

  return (
    <div
      className="absolute right-4 top-4 bottom-4 w-64 z-10 rounded-lg overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
        border: '2px solid #4a3f32',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        className="p-3 flex items-center justify-between shrink-0"
        style={{
          background: colors
            ? `linear-gradient(180deg, ${colors.accent}15 0%, transparent 100%)`
            : 'linear-gradient(180deg, rgba(201, 162, 39, 0.1) 0%, transparent 100%)',
          borderBottom: '1px solid #4a3f32',
        }}
      >
        <h3
          className="text-sm font-bold"
          style={{ color: colors?.accent || '#c9a227', fontFamily: "'Cinzel', serif" }}
        >
          {selectedNode ? 'Node Properties' : 'Inspector'}
        </h3>
        <button
          onClick={onToggle}
          className="p-1 rounded transition-all hover:bg-[#3d3328]"
          style={{ color: '#7a6f62' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 19l7-7-7-7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {!selectedNode ? (
          <div
            className="text-center py-8 text-sm"
            style={{ color: '#7a6f62' }}
          >
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6v6H9z" />
            </svg>
            Select a node to edit its properties
          </div>
        ) : (
          <div className="space-y-4">
            {/* Node type badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
              style={{
                background: `${colors?.accent}20`,
                color: colors?.accent,
                border: `1px solid ${colors?.accent}40`,
              }}
            >
              <span className="capitalize">{selectedNode.type.replace('_', ' ')}</span>
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleSave}
                className="w-full px-2 py-1.5 rounded text-sm outline-none transition-colors"
                style={{
                  background: '#1a1410',
                  border: '1px solid #4a3f32',
                  color: '#f5e6d3',
                }}
                placeholder="Node label..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSave}
                rows={2}
                className="w-full px-2 py-1.5 rounded text-sm outline-none resize-none transition-colors"
                style={{
                  background: '#1a1410',
                  border: '1px solid #4a3f32',
                  color: '#f5e6d3',
                }}
                placeholder="Optional description..."
              />
            </div>

            {/* Prompt (for prompt nodes) */}
            {selectedNode.type === 'prompt' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onBlur={handleSave}
                  rows={4}
                  className="w-full px-2 py-1.5 rounded text-sm outline-none resize-none transition-colors font-mono"
                  style={{
                    background: '#1a1410',
                    border: '1px solid #4a3f32',
                    color: '#f5e6d3',
                  }}
                  placeholder="Enter the prompt for Claude..."
                />
              </div>
            )}

            {/* Condition (for decision nodes) */}
            {selectedNode.type === 'decision' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                  Condition
                </label>
                <textarea
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  onBlur={handleSave}
                  rows={2}
                  className="w-full px-2 py-1.5 rounded text-sm outline-none resize-none transition-colors font-mono"
                  style={{
                    background: '#1a1410',
                    border: '1px solid #4a3f32',
                    color: '#f5e6d3',
                  }}
                  placeholder="e.g., file exists, response contains..."
                />
                <p className="text-[10px] mt-1" style={{ color: '#7a6f62' }}>
                  True path (green) / False path (red)
                </p>
              </div>
            )}

            {/* Node ID (read-only) */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#7a6f62' }}>
                Node ID
              </label>
              <div
                className="px-2 py-1.5 rounded text-xs font-mono truncate"
                style={{
                  background: '#1a1410',
                  border: '1px solid #3d3328',
                  color: '#7a6f62',
                }}
              >
                {selectedNode.id}
              </div>
            </div>

            {/* Delete button */}
            {selectedNode.type !== 'trigger' && (
              <button
                onClick={handleDelete}
                className="w-full py-2 rounded text-sm font-medium transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(180deg, #3d2828 0%, #2a1c1c 100%)',
                  border: '1px solid #5c3838',
                  color: '#f87171',
                }}
              >
                Delete Node
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
