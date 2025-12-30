import { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type ReactFlowInstance,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore } from '../../stores/workflowStore';
import { nodeTypes } from './WorkflowNode';
import type { WorkflowNode as WfNode } from '../../types/workflow';
import { NODE_TYPE_COLORS } from '../../types/workflow';

interface WorkflowCanvasProps {
  onNodeSelect?: (nodeId: string | null) => void;
}

export function WorkflowCanvas({ onNodeSelect }: WorkflowCanvasProps) {
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);

  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const addNode = useWorkflowStore((state) => state.addNode);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);

  // Handle connection
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onConnect({
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
        });
      }
    },
    [onConnect]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
      onNodeSelect?.(node.id);
    },
    [selectNode, onNodeSelect]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    clearSelection();
    onNodeSelect?.(null);
  }, [clearSelection, onNodeSelect]);

  // Handle drop from palette
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/workflow-node-type');
      if (!type || !reactFlowRef.current) return;

      const position = reactFlowRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type as WfNode['type'], position);
    },
    [addNode]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Convert our nodes/edges to React Flow format
  const rfNodes: Node[] = nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
    selected: node.selected,
  }));

  const rfEdges: Edge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type || 'smoothstep',
    animated: edge.animated,
    label: edge.label,
    style: {
      stroke: '#c9a227',
      strokeWidth: 2,
    },
    labelStyle: {
      fill: '#e0d5c7',
      fontSize: 10,
    },
    labelBgStyle: {
      fill: '#2a231c',
      fillOpacity: 0.8,
    },
  }));

  // MiniMap node color
  const getNodeColor = (node: Node) => {
    const colors = NODE_TYPE_COLORS[node.type as keyof typeof NODE_TYPE_COLORS];
    return colors?.accent || '#c9a227';
  };

  return (
    <div
      className="w-full h-full"
      style={{
        background: 'linear-gradient(180deg, #1a1410 0%, #0f0c09 100%)',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange as (changes: unknown[]) => void}
        onEdgesChange={onEdgesChange as (changes: unknown[]) => void}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#c9a227', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        {/* Background with subtle grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#3d3328"
        />

        {/* Controls */}
        <Controls
          className="!bg-[#2a231c] !border-[#4a3f32] !rounded-lg !shadow-lg"
        />

        {/* MiniMap */}
        <MiniMap
          nodeColor={getNodeColor}
          maskColor="rgba(0, 0, 0, 0.6)"
          style={{
            backgroundColor: '#1a1410',
            border: '1px solid #4a3f32',
            borderRadius: 8,
          }}
          className="!bg-[#1a1410]"
        />
      </ReactFlow>
    </div>
  );
}
