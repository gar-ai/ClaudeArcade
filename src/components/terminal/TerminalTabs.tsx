import { useState, useRef, useEffect } from 'react';
import { useTerminalStore, TerminalTab } from '../../stores/terminalStore';
import { useProjectStore } from '../../stores/projectStore';

interface TerminalTabsProps {
  onTabChange?: (tabId: string) => void;
}

export function TerminalTabs({ onTabChange }: TerminalTabsProps) {
  const tabs = useTerminalStore((state) => state.tabs);
  const activeTabId = useTerminalStore((state) => state.activeTabId);
  const addTab = useTerminalStore((state) => state.addTab);
  const closeTab = useTerminalStore((state) => state.closeTab);
  const setActiveTab = useTerminalStore((state) => state.setActiveTab);
  const renameTab = useTerminalStore((state) => state.renameTab);
  const canAddTab = useTerminalStore((state) => state.canAddTab);

  const projectPath = useProjectStore((state) => state.projectPath);
  const projectName = useProjectStore((state) => state.projectName);

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with one tab if empty
  useEffect(() => {
    if (tabs.length === 0) {
      addTab(projectPath, projectName);
    }
  }, [tabs.length, addTab, projectPath, projectName]);

  // Focus input when editing
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const handleAddTab = () => {
    if (canAddTab()) {
      const newTabId = addTab(projectPath, projectName);
      onTabChange?.(newTabId);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleDoubleClick = (tab: TerminalTab) => {
    setEditingTabId(tab.id);
    setEditValue(tab.name);
  };

  const handleRenameSubmit = () => {
    if (editingTabId && editValue.trim()) {
      renameTab(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 overflow-x-auto shrink-0"
      style={{
        background: 'linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
        borderBottom: '1px solid var(--bg-tertiary)',
      }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          onDoubleClick={() => handleDoubleClick(tab)}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-all min-w-0"
          style={{
            background: tab.id === activeTabId
              ? 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)'
              : 'var(--bg-secondary)',
            border: tab.id === activeTabId
              ? '1px solid var(--accent)'
              : '1px solid var(--bg-tertiary)',
            maxWidth: '150px',
          }}
        >
          {/* Connection indicator */}
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              background: tab.isConnected ? '#1eff00' : '#f87171',
              boxShadow: tab.isConnected ? '0 0 4px #1eff00' : '0 0 4px #f87171',
            }}
          />

          {/* Tab name */}
          {editingTabId === tab.id ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              className="flex-1 min-w-0 bg-transparent text-xs font-medium outline-none"
              style={{
                color: tab.id === activeTabId ? 'var(--bg-primary)' : 'var(--text-primary)',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 text-xs font-medium truncate"
              style={{
                color: tab.id === activeTabId ? 'var(--bg-primary)' : 'var(--text-primary)',
              }}
            >
              {tab.name}
            </span>
          )}

          {/* Close button */}
          {tabs.length > 1 && (
            <button
              onClick={(e) => handleCloseTab(e, tab.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity shrink-0"
              style={{
                color: tab.id === activeTabId ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {/* Add tab button */}
      {canAddTab() && (
        <button
          onClick={handleAddTab}
          className="p-1.5 rounded transition-all shrink-0"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
          title="New Terminal"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {/* Tab count indicator */}
      <div className="ml-auto text-[10px] px-2" style={{ color: 'var(--text-secondary)' }}>
        {tabs.length}/5
      </div>
    </div>
  );
}
