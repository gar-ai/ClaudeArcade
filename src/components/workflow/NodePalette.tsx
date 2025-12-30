import { NODE_TEMPLATES, NODE_TYPE_COLORS, type NodeTemplate } from '../../types/workflow';

interface NodePaletteProps {
  isOpen: boolean;
  onToggle: () => void;
}

// Group templates by category
const groupedTemplates = NODE_TEMPLATES.reduce(
  (acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  },
  {} as Record<string, NodeTemplate[]>
);

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  trigger: { label: 'Triggers', color: '#4ade80' },
  flow: { label: 'Flow Control', color: '#a855f7' },
  action: { label: 'Actions', color: '#fbbf24' },
  advanced: { label: 'Advanced', color: '#818cf8' },
};

export function NodePalette({ isOpen, onToggle }: NodePaletteProps) {
  const handleDragStart = (
    event: React.DragEvent,
    template: NodeTemplate
  ) => {
    event.dataTransfer.setData('application/workflow-node-type', template.type);
    event.dataTransfer.effectAllowed = 'move';
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute left-4 top-4 z-10 p-2 rounded-lg transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
          border: '1px solid #4a3f32',
          color: '#c9a227',
        }}
        title="Open Node Palette"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="absolute left-4 top-4 bottom-4 w-56 z-10 rounded-lg overflow-hidden flex flex-col"
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
          background: 'linear-gradient(180deg, rgba(201, 162, 39, 0.1) 0%, transparent 100%)',
          borderBottom: '1px solid #4a3f32',
        }}
      >
        <h3
          className="text-sm font-bold"
          style={{ color: '#c9a227', fontFamily: "'Cinzel', serif" }}
        >
          Node Palette
        </h3>
        <button
          onClick={onToggle}
          className="p-1 rounded transition-all hover:bg-[#3d3328]"
          style={{ color: '#7a6f62' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.entries(groupedTemplates).map(([category, templates]) => (
          <div key={category}>
            {/* Category header */}
            <h4
              className="text-[10px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: CATEGORY_LABELS[category]?.color || '#7a6f62' }}
            >
              {CATEGORY_LABELS[category]?.label || category}
            </h4>

            {/* Templates */}
            <div className="space-y-1.5">
              {templates.map((template) => {
                const colors = NODE_TYPE_COLORS[template.type];
                return (
                  <div
                    key={template.type + template.label}
                    draggable
                    onDragStart={(e) => handleDragStart(e, template)}
                    className="p-2 rounded cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] hover:shadow-lg"
                    style={{
                      background: `linear-gradient(180deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`,
                      border: `1px solid ${colors.border}60`,
                    }}
                    title={template.description}
                  >
                    <div className="flex items-center gap-2">
                      {/* Icon */}
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style={{
                          background: `${colors.accent}20`,
                          border: `1px solid ${colors.accent}40`,
                        }}
                      >
                        <span
                          className="text-xs"
                          style={{ color: colors.accent }}
                        >
                          {template.icon.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div
                          className="text-xs font-medium truncate"
                          style={{ color: colors.accent }}
                        >
                          {template.label}
                        </div>
                        <div
                          className="text-[9px] truncate"
                          style={{ color: '#7a6f62' }}
                        >
                          {template.description}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div
        className="p-2 text-center text-[9px] shrink-0"
        style={{
          borderTop: '1px solid #4a3f32',
          color: '#7a6f62',
        }}
      >
        Drag nodes to the canvas
      </div>
    </div>
  );
}
