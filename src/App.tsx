import { useEffect, useCallback, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { TitleBar } from './components/layout/TitleBar';
import { LeftPanel } from './components/layout/LeftPanel';
import { RightPanel } from './components/layout/RightPanel';
import { StatusBar } from './components/layout/StatusBar';
import { ItemDetailModal } from './components/modals/ItemDetailModal';
import { DumbzoneModal } from './components/modals/DumbzoneModal';
import { WorkflowEditor } from './components/workflow';
import { UpdateChecker } from './components/updates/UpdateChecker';
import { AgentManager } from './components/agents';
import { ProjectManager } from './components/project/ProjectManager';
import { useAppStore } from './stores/appStore';
import { usePersonaStore } from './stores/personaStore';
import { useProjectStore } from './stores/projectStore';
import { useWorkflowStore } from './stores/workflowStore';

function App() {
  const [showAgentManager, setShowAgentManager] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const scanInventory = useAppStore((state) => state.scanInventory);
  const setRightPanelMode = useAppStore((state) => state.setRightPanelMode);
  const setSelectedItem = useAppStore((state) => state.setSelectedItem);
  const selectedItem = useAppStore((state) => state.selectedItem);
  const pendingDumbzoneEquip = useAppStore((state) => state.pendingDumbzoneEquip);
  const cancelDumbzoneEquip = useAppStore((state) => state.cancelDumbzoneEquip);
  const themeColors = usePersonaStore((state) => state.themeColors);
  const setShowProjectPicker = useProjectStore((state) => state.setShowProjectPicker);
  const showProjectPicker = useProjectStore((state) => state.showProjectPicker);
  const isWorkflowEditorOpen = useWorkflowStore((state) => state.isEditorOpen);
  const openWorkflowEditor = useWorkflowStore((state) => state.openEditor);
  const closeWorkflowEditor = useWorkflowStore((state) => state.closeEditor);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Escape - Close modals
    if (e.key === 'Escape') {
      if (showProjectManager) {
        setShowProjectManager(false);
        e.preventDefault();
        return;
      }
      if (showAgentManager) {
        setShowAgentManager(false);
        e.preventDefault();
        return;
      }
      if (isWorkflowEditorOpen) {
        closeWorkflowEditor();
        e.preventDefault();
        return;
      }
      if (pendingDumbzoneEquip) {
        cancelDumbzoneEquip();
        e.preventDefault();
        return;
      }
      if (selectedItem) {
        setSelectedItem(null);
        e.preventDefault();
        return;
      }
      if (showProjectPicker) {
        setShowProjectPicker(false);
        e.preventDefault();
        return;
      }
    }

    // Mod+Shift+A - Open Agent Manager
    if (isMod && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      setShowAgentManager(!showAgentManager);
      return;
    }

    // Mod+Shift+P - Open Project Manager
    if (isMod && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      setShowProjectManager(!showProjectManager);
      return;
    }

    // Mod+1 - Backpack view
    if (isMod && e.key === '1') {
      e.preventDefault();
      setRightPanelMode('backpack');
      return;
    }

    // Mod+2 - Terminal view
    if (isMod && e.key === '2') {
      e.preventDefault();
      setRightPanelMode('terminal');
      return;
    }

    // Mod+3 - Split view
    if (isMod && e.key === '3') {
      e.preventDefault();
      setRightPanelMode('split');
      return;
    }

    // Mod+4 - Party view
    if (isMod && e.key === '4') {
      e.preventDefault();
      setRightPanelMode('party');
      return;
    }

    // Mod+P - Open project picker
    if (isMod && e.key === 'p') {
      e.preventDefault();
      setShowProjectPicker(!showProjectPicker);
      return;
    }

    // Mod+W - Open workflow editor
    if (isMod && e.key === 'w') {
      e.preventDefault();
      if (isWorkflowEditorOpen) {
        closeWorkflowEditor();
      } else {
        openWorkflowEditor();
      }
      return;
    }
  }, [selectedItem, showProjectPicker, pendingDumbzoneEquip, isWorkflowEditorOpen, showAgentManager, showProjectManager, setSelectedItem, setShowProjectPicker, setRightPanelMode, cancelDumbzoneEquip, openWorkflowEditor, closeWorkflowEditor]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Apply theme colors as CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', themeColors.bgPrimary);
    root.style.setProperty('--bg-secondary', themeColors.bgSecondary);
    root.style.setProperty('--bg-tertiary', themeColors.bgTertiary);
    root.style.setProperty('--text-primary', themeColors.textPrimary);
    root.style.setProperty('--text-secondary', themeColors.textSecondary);
    root.style.setProperty('--accent', themeColors.accent);
    root.style.setProperty('--accent-dark', themeColors.accentDark);
    root.style.setProperty('--terminal-bg', themeColors.terminal.background);
    root.style.setProperty('--terminal-fg', themeColors.terminal.foreground);
    root.style.setProperty('--terminal-cursor', themeColors.terminal.cursor);
    root.style.setProperty('--terminal-selection', themeColors.terminal.selection);
  }, [themeColors]);

  useEffect(() => {
    // Scan real inventory on load
    scanInventory();

    // Listen for external settings changes
    const unlisten = listen('settings-changed', () => {
      console.log('Settings changed externally, refreshing...');
      scanInventory();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [scanInventory]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <RightPanel />
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Modals */}
      <ItemDetailModal />
      <DumbzoneModal />

      {/* Workflow Editor */}
      <WorkflowEditor isOpen={isWorkflowEditorOpen} onClose={closeWorkflowEditor} />

      {/* Agent Manager */}
      <AgentManager isOpen={showAgentManager} onClose={() => setShowAgentManager(false)} />

      {/* Project Manager */}
      <ProjectManager isOpen={showProjectManager} onClose={() => setShowProjectManager(false)} />

      {/* Update Checker */}
      <UpdateChecker />
    </div>
  );
}

export default App;
