import { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useWorkflowStore } from '../../stores/workflowStore';
import { WorkflowCanvas } from './WorkflowCanvas';
import { NodePalette } from './NodePalette';
import { NodeInspector } from './NodeInspector';

interface WorkflowEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkflowEditor({ isOpen, onClose }: WorkflowEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const workflows = useWorkflowStore((state) => state.workflows);
  const currentWorkflowId = useWorkflowStore((state) => state.currentWorkflowId);
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const saveCurrentWorkflow = useWorkflowStore((state) => state.saveCurrentWorkflow);
  const deleteWorkflow = useWorkflowStore((state) => state.deleteWorkflow);
  const getCurrentWorkflow = useWorkflowStore((state) => state.getCurrentWorkflow);
  const isPaletteOpen = useWorkflowStore((state) => state.isPaletteOpen);
  const isInspectorOpen = useWorkflowStore((state) => state.isInspectorOpen);
  const togglePalette = useWorkflowStore((state) => state.togglePalette);
  const toggleInspector = useWorkflowStore((state) => state.toggleInspector);

  const currentWorkflow = getCurrentWorkflow();

  const handleNewWorkflow = () => {
    const name = prompt('Enter workflow name:', 'New Workflow');
    if (name) {
      createWorkflow(name);
    }
  };

  const handleSave = () => {
    saveCurrentWorkflow();
  };

  const handleClose = () => {
    saveCurrentWorkflow();
    onClose();
  };

  const handleDeleteWorkflow = () => {
    if (!currentWorkflowId) return;
    if (confirm('Delete this workflow?')) {
      deleteWorkflow(currentWorkflowId);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1a1410 0%, #0f0c09 100%)',
      }}
    >
      {/* Header */}
      <div
        className="h-12 px-4 flex items-center justify-between shrink-0"
        style={{
          background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
          borderBottom: '2px solid #4a3f32',
        }}
      >
        <div className="flex items-center gap-4">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded transition-all hover:bg-[#3d3328]"
            style={{ color: '#7a6f62' }}
            title="Close Editor"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Title */}
          <div className="flex items-center gap-3">
            <h1
              className="text-lg font-bold"
              style={{ color: '#c9a227', fontFamily: "'Cinzel', serif" }}
            >
              Workflow Editor
            </h1>

            {/* Workflow selector */}
            <select
              value={currentWorkflowId || ''}
              onChange={(e) => e.target.value && loadWorkflow(e.target.value)}
              className="px-2 py-1 rounded text-sm outline-none"
              style={{
                background: '#1a1410',
                border: '1px solid #4a3f32',
                color: '#f5e6d3',
              }}
            >
              <option value="" disabled>
                Select workflow...
              </option>
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name}
                </option>
              ))}
            </select>

            {/* New workflow button */}
            <button
              onClick={handleNewWorkflow}
              className="px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
                border: '1px solid #4a3f32',
                color: '#c9a227',
              }}
            >
              + New
            </button>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {currentWorkflow && (
            <>
              {/* Save button */}
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded text-xs font-medium transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)',
                  color: '#1a1410',
                  border: '1px solid #4ade80',
                }}
              >
                Save
              </button>

              {/* Delete button */}
              <button
                onClick={handleDeleteWorkflow}
                className="p-1.5 rounded transition-all hover:bg-[#3d2828]"
                style={{ color: '#7a6f62' }}
                title="Delete Workflow"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {!currentWorkflow ? (
          // No workflow selected state
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-24 h-24 mx-auto mb-6 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
                  border: '2px solid #4a3f32',
                }}
              >
                <svg
                  className="w-12 h-12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4a3f32"
                  strokeWidth="1.5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: '#c9a227', fontFamily: "'Cinzel', serif" }}
              >
                Create a Workflow
              </h2>
              <p className="text-sm mb-6" style={{ color: '#7a6f62' }}>
                Design visual workflows for Claude Code
              </p>
              <button
                onClick={handleNewWorkflow}
                className="px-6 py-2 rounded-lg font-medium transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(180deg, #c9a227 0%, #a88420 100%)',
                  color: '#1a1410',
                  border: '1px solid #c9a227',
                  boxShadow: '0 0 20px rgba(201, 162, 39, 0.3)',
                }}
              >
                Create New Workflow
              </button>
            </div>
          </div>
        ) : (
          <ReactFlowProvider>
            <WorkflowCanvas onNodeSelect={setSelectedNodeId} />
            <NodePalette isOpen={isPaletteOpen} onToggle={togglePalette} />
            <NodeInspector
              isOpen={isInspectorOpen}
              onToggle={toggleInspector}
              selectedNodeId={selectedNodeId}
            />
          </ReactFlowProvider>
        )}
      </div>

      {/* Footer */}
      {currentWorkflow && (
        <div
          className="h-8 px-4 flex items-center justify-between shrink-0 text-[10px]"
          style={{
            background: '#1a1410',
            borderTop: '1px solid #3d3328',
            color: '#7a6f62',
          }}
        >
          <span>
            {currentWorkflow.name} • v{currentWorkflow.version}
          </span>
          <span>
            Last saved: {new Date(currentWorkflow.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
