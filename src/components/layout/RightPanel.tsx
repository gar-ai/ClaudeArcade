import { useAppStore } from '../../stores/appStore';
import { BackpackView } from '../inventory/BackpackView';
import { MultiTerminal } from '../terminal/MultiTerminal';
import { PartyManagementScreen } from '../party/PartyManagementScreen';
import { RightPanelMode } from '../../types';

export function RightPanel() {
  const rightPanelMode = useAppStore((state) => state.rightPanelMode);

  return (
    <main className="flex-1 h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Tab Bar */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{
          background: `linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)`,
          borderBottom: '2px solid var(--bg-tertiary)',
        }}
      >
        <TabButton mode="backpack" label="Backpack" />
        <TabButton mode="terminal" label="Terminal" />
        <TabButton mode="split" label="Split" />
        <TabButton mode="party" label="Party" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {rightPanelMode === 'backpack' && <BackpackView />}
        {rightPanelMode === 'terminal' && <MultiTerminal />}
        {rightPanelMode === 'split' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden border-b border-bg-tertiary">
              <BackpackView />
            </div>
            <div className="h-1/2 overflow-hidden">
              <MultiTerminal />
            </div>
          </div>
        )}
        {rightPanelMode === 'party' && <PartyManagementScreen />}
      </div>
    </main>
  );
}

interface TabButtonProps {
  mode: RightPanelMode;
  label: string;
}

function TabButton({ mode, label }: TabButtonProps) {
  const rightPanelMode = useAppStore((state) => state.rightPanelMode);
  const setRightPanelMode = useAppStore((state) => state.setRightPanelMode);
  const isActive = rightPanelMode === mode;

  return (
    <button
      onClick={() => setRightPanelMode(mode)}
      className="px-4 py-1.5 rounded text-sm font-medium transition-all"
      style={{
        background: isActive
          ? `linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)`
          : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
        border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
        boxShadow: isActive ? '0 0 8px rgba(var(--accent), 0.2)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

