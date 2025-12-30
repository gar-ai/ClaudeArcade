import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { WorkflowNodeData, WorkflowNodeType } from '../../types/workflow';
import { NODE_TYPE_COLORS } from '../../types/workflow';

// Node icons (simple SVG paths)
const NODE_ICONS: Record<WorkflowNodeType, string> = {
  trigger: 'M8 5v14l11-7z', // Play
  prompt: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', // Message
  action: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', // Zap
  decision: 'M6 3v12h12V3M6 15v6l6-3 6 3v-6', // Git branch simplified
  loop: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3', // Repeat
  subagent: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 3.13a4 4 0 0 1 0 7.75', // Users
  mcp_call: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01', // Plug simplified
  output: 'M9 11l3 3 8-8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', // Check circle
};

function WorkflowNodeComponent({ data, type, selected }: NodeProps<WorkflowNodeData>) {
  const nodeType = type as WorkflowNodeType;
  const colors = NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.action;
  const isExecuting = data.isExecuting;

  return (
    <div
      className="relative rounded-lg min-w-[140px] transition-all"
      style={{
        background: `linear-gradient(180deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`,
        border: `2px solid ${selected ? colors.accent : colors.border}`,
        boxShadow: selected
          ? `0 0 16px ${colors.accent}60, 0 4px 12px rgba(0, 0, 0, 0.3)`
          : isExecuting
          ? `0 0 20px ${colors.accent}80, 0 4px 12px rgba(0, 0, 0, 0.3)`
          : '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Input Handle */}
      {nodeType !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !rounded-full !border-2"
          style={{
            background: colors.bg,
            borderColor: colors.border,
            top: -6,
          }}
        />
      )}

      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{
          borderBottom: `1px solid ${colors.border}40`,
        }}
      >
        {/* Icon */}
        <div
          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
          style={{
            background: `${colors.accent}20`,
            border: `1px solid ${colors.accent}40`,
          }}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.accent}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={NODE_ICONS[nodeType]} />
          </svg>
        </div>

        {/* Label */}
        <span
          className="text-sm font-medium truncate"
          style={{ color: colors.accent }}
        >
          {data.label}
        </span>

        {/* Execution indicator */}
        {isExecuting && (
          <div
            className="w-2 h-2 rounded-full animate-pulse ml-auto"
            style={{ background: colors.accent }}
          />
        )}
      </div>

      {/* Content preview */}
      {(data.prompt || data.condition || data.description) && (
        <div className="px-3 py-2">
          <p
            className="text-xs truncate opacity-70"
            style={{ color: '#e0d5c7' }}
          >
            {data.prompt || data.condition || data.description}
          </p>
        </div>
      )}

      {/* Linked item badge */}
      {data.linkedItemId && (
        <div
          className="px-3 py-1.5 text-[10px] flex items-center gap-1"
          style={{
            borderTop: `1px solid ${colors.border}40`,
            color: '#a89a86',
          }}
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span className="truncate">{data.linkedItemType || 'Linked'}</span>
        </div>
      )}

      {/* Output Handle */}
      {nodeType !== 'output' && (
        <>
          {nodeType === 'decision' ? (
            // Decision node has two outputs: true and false
            <>
              <Handle
                type="source"
                position={Position.Bottom}
                id="true"
                className="!w-3 !h-3 !rounded-full !border-2"
                style={{
                  background: '#22c55e',
                  borderColor: '#4ade80',
                  bottom: -6,
                  left: '30%',
                }}
              />
              <Handle
                type="source"
                position={Position.Bottom}
                id="false"
                className="!w-3 !h-3 !rounded-full !border-2"
                style={{
                  background: '#ef4444',
                  borderColor: '#f87171',
                  bottom: -6,
                  left: '70%',
                }}
              />
            </>
          ) : (
            <Handle
              type="source"
              position={Position.Bottom}
              className="!w-3 !h-3 !rounded-full !border-2"
              style={{
                background: colors.bg,
                borderColor: colors.border,
                bottom: -6,
              }}
            />
          )}
        </>
      )}

      {/* Result/Error overlay */}
      {data.lastError && (
        <div
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center"
          style={{
            background: '#ef4444',
            border: '2px solid #1a1410',
          }}
          title={data.lastError}
        >
          <span className="text-[10px] text-white font-bold">!</span>
        </div>
      )}
    </div>
  );
}

export const WorkflowNodeMemo = memo(WorkflowNodeComponent);

// Export node types for React Flow
export const nodeTypes = {
  trigger: WorkflowNodeMemo,
  prompt: WorkflowNodeMemo,
  action: WorkflowNodeMemo,
  decision: WorkflowNodeMemo,
  loop: WorkflowNodeMemo,
  subagent: WorkflowNodeMemo,
  mcp_call: WorkflowNodeMemo,
  output: WorkflowNodeMemo,
};
