import type { MCPServer } from '../../types/mcp';

interface MCPCardProps {
  server: MCPServer;
  isInstalled: boolean;
  isLoading: boolean;
  onInstall: () => void;
  onRemove: () => void;
}

const ICON_MAP: Record<string, string> = {
  folder: 'F',
  brain: 'B',
  globe: 'G',
  download: 'D',
  search: 'S',
  map: 'M',
  github: 'GH',
  gitlab: 'GL',
  message: 'C',
  database: 'DB',
  bug: 'BG',
  clock: 'T',
  box: 'X',
};

export function MCPCard({ server, isInstalled, isLoading, onInstall, onRemove }: MCPCardProps) {
  const icon = ICON_MAP[server.icon] || 'P';

  return (
    <div
      className="p-4 rounded-lg transition-all"
      style={{
        background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
        border: isInstalled ? '2px solid #1eff00' : '2px solid #4a3f32',
        boxShadow: isInstalled ? '0 0 12px rgba(30, 255, 0, 0.2)' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded flex items-center justify-center text-xl"
            style={{
              background: 'linear-gradient(135deg, #3f362c 0%, #2d261e 100%)',
              border: '2px solid #524738',
            }}
          >
            {icon}
          </div>
          <div>
            <h3
              className="font-semibold text-sm"
              style={{
                color: '#f5e6d3',
                fontFamily: "'Cinzel', serif",
              }}
            >
              {server.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {server.official && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold"
                  style={{
                    background: 'rgba(201, 162, 39, 0.2)',
                    color: '#c9a227',
                    border: '1px solid rgba(201, 162, 39, 0.4)',
                  }}
                >
                  Official
                </span>
              )}
              <span
                className="text-[10px] capitalize"
                style={{ color: '#7a6f62' }}
              >
                {server.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p
        className="text-xs mb-3 line-clamp-2"
        style={{ color: '#b8a894' }}
      >
        {server.description}
      </p>

      {/* Environment Variables Warning */}
      {server.requiresEnv && server.requiresEnv.length > 0 && (
        <div
          className="text-[10px] px-2 py-1.5 rounded mb-3"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#f59e0b',
          }}
        >
          Requires: {server.requiresEnv.join(', ')}
        </div>
      )}

      {/* Action Button */}
      {isLoading ? (
        <button
          disabled
          className="w-full py-2 px-3 rounded text-xs font-medium transition-all opacity-70"
          style={{
            background: 'rgba(100, 116, 139, 0.2)',
            color: '#94a3b8',
            border: '1px solid rgba(100, 116, 139, 0.3)',
          }}
        >
          <span className="animate-pulse">Loading...</span>
        </button>
      ) : isInstalled ? (
        <button
          onClick={onRemove}
          className="w-full py-2 px-3 rounded text-xs font-medium transition-all"
          style={{
            background: 'rgba(30, 255, 0, 0.1)',
            color: '#1eff00',
            border: '1px solid rgba(30, 255, 0, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)';
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.4)';
            e.currentTarget.textContent = 'Remove';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(30, 255, 0, 0.1)';
            e.currentTarget.style.color = '#1eff00';
            e.currentTarget.style.borderColor = 'rgba(30, 255, 0, 0.3)';
            e.currentTarget.textContent = 'Installed';
          }}
        >
          Installed
        </button>
      ) : (
        <button
          onClick={onInstall}
          className="w-full py-2 px-3 rounded text-xs font-bold uppercase transition-all"
          style={{
            background: 'linear-gradient(180deg, #c9a227 0%, #8b7019 100%)',
            color: '#1a1410',
            border: '1px solid #c9a227',
          }}
        >
          Install
        </button>
      )}
    </div>
  );
}
