import { CharacterPaperDoll } from '../character/CharacterPaperDoll';
import { ContextMeter } from '../stats/ContextMeter';
import { PartyPanel } from '../party/PartyPanel';

export function LeftPanel() {
  return (
    <aside
      className="w-80 min-w-80 h-full flex flex-col overflow-hidden"
      style={{
        background: `linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)`,
        borderRight: '2px solid var(--bg-tertiary)',
        boxShadow: 'inset -1px 0 0 rgba(255, 255, 255, 0.03)',
      }}
    >
      {/* Context Meter - compact at top */}
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: '2px solid var(--bg-tertiary)' }}>
        <ContextMeter />
      </div>

      {/* Character Paper Doll with Equipment */}
      <div className="flex-1 overflow-y-auto">
        <CharacterPaperDoll />
      </div>

      {/* Party Panel - Claude instances */}
      <div style={{ borderTop: '2px solid var(--bg-tertiary)' }}>
        <PartyPanel />
      </div>
    </aside>
  );
}
