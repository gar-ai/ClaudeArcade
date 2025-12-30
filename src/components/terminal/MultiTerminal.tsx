import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { usePersonaStore } from '../../stores/personaStore';
import { useTerminalStore, TerminalTab, parseClaudeOutput } from '../../stores/terminalStore';
import { useProjectStore } from '../../stores/projectStore';
import { TerminalTabs } from './TerminalTabs';
import '@xterm/xterm/css/xterm.css';

const QUICK_COMMANDS = [
  { label: 'Claude', cmd: 'claude', icon: '>', description: 'Start Claude Code' },
  { label: 'Help', cmd: 'claude --help', icon: '?', description: 'Show help' },
  { label: 'Clear', cmd: 'clear', icon: 'x', description: 'Clear terminal' },
];

interface TerminalInstance {
  term: XTerm;
  fitAddon: FitAddon;
  ptyId: string | null;
}

export function MultiTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalsRef = useRef<Map<string, TerminalInstance>>(new Map());
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const themeColors = usePersonaStore((state) => state.themeColors);

  const tabs = useTerminalStore((state) => state.tabs);
  const activeTabId = useTerminalStore((state) => state.activeTabId);
  const addTab = useTerminalStore((state) => state.addTab);
  const updateTabPty = useTerminalStore((state) => state.updateTabPty);
  const setTabStatus = useTerminalStore((state) => state.setTabStatus);
  const setTabTask = useTerminalStore((state) => state.setTabTask);
  const updateTabActivity = useTerminalStore((state) => state.updateTabActivity);

  const projectPath = useProjectStore((state) => state.projectPath);
  const projectName = useProjectStore((state) => state.projectName);
  const autoStartClaude = useProjectStore((state) => state.autoStartClaude);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId),
    [tabs, activeTabId]
  );

  // Initialize with one tab if empty
  useEffect(() => {
    if (tabs.length === 0) {
      addTab(projectPath, projectName);
    }
  }, [tabs.length, addTab, projectPath, projectName]);

  // Create terminal for a tab
  const createTerminal = useCallback(
    async (tab: TerminalTab) => {
      if (!containerRef.current || terminalsRef.current.has(tab.id)) return;

      const termContainer = document.createElement('div');
      termContainer.id = `terminal-${tab.id}`;
      termContainer.style.width = '100%';
      termContainer.style.height = '100%';
      termContainer.style.display = tab.id === activeTabId ? 'block' : 'none';
      containerRef.current.appendChild(termContainer);

      const term = new XTerm({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
        theme: {
          background: themeColors.terminal.background,
          foreground: themeColors.terminal.foreground,
          cursor: themeColors.terminal.cursor,
          cursorAccent: themeColors.terminal.background,
          selectionBackground: themeColors.terminal.selection,
          selectionForeground: themeColors.terminal.foreground,
          black: themeColors.terminal.background,
          red: '#f87171',
          green: '#1eff00',
          yellow: '#fbbf24',
          blue: '#0070dd',
          magenta: '#a335ee',
          cyan: '#22d3ee',
          white: themeColors.terminal.foreground,
          brightBlack: '#524738',
          brightRed: '#fca5a5',
          brightGreen: '#4ade80',
          brightYellow: '#fcd34d',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#67e8f9',
          brightWhite: '#ffffff',
        },
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(termContainer);

      setTimeout(() => fitAddon.fit(), 0);

      // Handle user input
      term.onData(async (data) => {
        const instance = terminalsRef.current.get(tab.id);
        if (instance?.ptyId) {
          try {
            await invoke('pty_write', { id: instance.ptyId, data });
          } catch (err) {
            console.error('Failed to write to PTY:', err);
          }
        }
      });

      // Spawn PTY
      try {
        const ptyId = await invoke<string>('pty_spawn', {
          cols: term.cols,
          rows: term.rows,
          cwd: tab.projectPath || undefined,
        });

        const instance: TerminalInstance = { term, fitAddon, ptyId };
        terminalsRef.current.set(tab.id, instance);
        updateTabPty(tab.id, ptyId, true);

        // Welcome message
        term.writeln('\x1b[1;33m╔══════════════════════════════════╗\x1b[0m');
        term.writeln('\x1b[1;33m║     ClaudeArcade Terminal        ║\x1b[0m');
        term.writeln('\x1b[1;33m╚══════════════════════════════════╝\x1b[0m');
        term.writeln('');

        if (tab.projectPath) {
          term.writeln(`\x1b[32mProject:\x1b[0m ${tab.projectName || tab.projectPath}`);
          term.writeln(`\x1b[90m${tab.projectPath}\x1b[0m`);
          term.writeln('');

          if (autoStartClaude) {
            term.writeln('\x1b[90mStarting Claude Code...\x1b[0m');
            term.writeln('');
            setTimeout(async () => {
              await invoke('pty_write', { id: ptyId, data: 'claude\n' });
            }, 500);
          }
        } else {
          term.writeln('\x1b[90mNo project selected. Use the Project Picker to select a folder.\x1b[0m');
          term.writeln('');
        }
      } catch (err) {
        console.error('Failed to spawn PTY:', err);
        term.writeln('\x1b[31mFailed to start terminal\x1b[0m');
        terminalsRef.current.set(tab.id, { term, fitAddon, ptyId: null });
        updateTabPty(tab.id, null, false);
      }
    },
    [themeColors, activeTabId, autoStartClaude, updateTabPty]
  );

  // Create terminals for new tabs
  useEffect(() => {
    tabs.forEach((tab) => {
      if (!terminalsRef.current.has(tab.id)) {
        createTerminal(tab);
      }
    });

    // Clean up removed tabs
    terminalsRef.current.forEach((instance, tabId) => {
      if (!tabs.find((t) => t.id === tabId)) {
        if (instance.ptyId) {
          invoke('pty_kill', { id: instance.ptyId }).catch(console.error);
        }
        instance.term.dispose();
        const container = document.getElementById(`terminal-${tabId}`);
        container?.remove();
        terminalsRef.current.delete(tabId);
      }
    });
  }, [tabs, createTerminal]);

  // Show/hide terminals based on active tab
  useEffect(() => {
    terminalsRef.current.forEach((instance, tabId) => {
      const container = document.getElementById(`terminal-${tabId}`);
      if (container) {
        container.style.display = tabId === activeTabId ? 'block' : 'none';
        if (tabId === activeTabId) {
          instance.fitAddon.fit();
          instance.term.focus();
        }
      }
    });
  }, [activeTabId]);

  // Listen for PTY events
  useEffect(() => {
    const unlistenOutput = listen<{ id: string; data: string }>('pty-output', (event) => {
      terminalsRef.current.forEach((instance, tabId) => {
        if (instance.ptyId === event.payload.id) {
          instance.term.write(event.payload.data);

          // Parse output for status updates
          const parsed = parseClaudeOutput(event.payload.data);
          if (parsed.status) {
            setTabStatus(tabId, parsed.status);
          }
          if (parsed.task) {
            setTabTask(tabId, parsed.task);
          }
          updateTabActivity(tabId);
        }
      });
    });

    const unlistenExit = listen<{ id: string; code: number }>('pty-exit', (event) => {
      terminalsRef.current.forEach((instance, tabId) => {
        if (instance.ptyId === event.payload.id) {
          instance.term.writeln('');
          instance.term.writeln(`\x1b[90mProcess exited with code ${event.payload.code}\x1b[0m`);
          instance.ptyId = null;
          updateTabPty(tabId, null, false);
          setTabStatus(tabId, 'disconnected');
        }
      });
    });

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenExit.then((fn) => fn());
    };
  }, [updateTabPty, setTabStatus, setTabTask, updateTabActivity]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const instance = activeTabId ? terminalsRef.current.get(activeTabId) : null;
      if (instance) {
        instance.fitAddon.fit();
        if (instance.ptyId) {
          invoke('pty_resize', {
            id: instance.ptyId,
            cols: instance.term.cols,
            rows: instance.term.rows,
          }).catch(console.error);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeTabId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminalsRef.current.forEach((instance) => {
        if (instance.ptyId) {
          invoke('pty_kill', { id: instance.ptyId }).catch(console.error);
        }
        instance.term.dispose();
      });
      terminalsRef.current.clear();
    };
  }, []);

  const sendCommand = useCallback(
    async (cmd: string) => {
      const instance = activeTabId ? terminalsRef.current.get(activeTabId) : null;
      if (instance?.ptyId) {
        try {
          setCommandHistory((prev) => [...prev.slice(-19), cmd]);
          await invoke('pty_write', { id: instance.ptyId, data: cmd + '\n' });
        } catch (err) {
          console.error('Failed to send command:', err);
        }
      }
    },
    [activeTabId]
  );

  const isConnected = activeTab?.isConnected ?? false;

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden"
      style={{ background: 'var(--terminal-bg)' }}
    >
      {/* Terminal Tabs */}
      <TerminalTabs />

      {/* Command Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
          borderBottom: '1px solid var(--bg-tertiary)',
        }}
      >
        {/* Quick Commands */}
        <div className="flex items-center gap-1.5">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.cmd}
              onClick={() => sendCommand(cmd.cmd)}
              disabled={!isConnected}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: isConnected
                  ? 'linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)'
                  : 'var(--bg-secondary)',
                border: '1px solid var(--bg-tertiary)',
                color: isConnected ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: isConnected ? 'pointer' : 'not-allowed',
                opacity: isConnected ? 1 : 0.5,
              }}
              title={cmd.description}
            >
              <span>{cmd.icon}</span>
              <span>{cmd.label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 mx-1" style={{ background: 'var(--bg-tertiary)' }} />

        {/* Project indicator */}
        {activeTab?.projectName && (
          <div className="flex items-center gap-1.5 ml-auto">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>
              {activeTab.projectName}
            </span>
          </div>
        )}

        {/* Connection Status */}
        <div className={`flex items-center gap-1.5 ${activeTab?.projectName ? '' : 'ml-auto'}`}>
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: isConnected ? '#1eff00' : '#f87171',
              boxShadow: isConnected ? '0 0 6px #1eff00' : '0 0 6px #f87171',
            }}
          />
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* History dropdown */}
        {commandHistory.length > 0 && (
          <>
            <div className="w-px h-5" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="relative group">
              <button
                className="px-2 py-1 rounded text-xs"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                History ({commandHistory.length})
              </button>
              <div
                className="absolute right-0 top-full mt-1 py-1 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--bg-tertiary)',
                  minWidth: '180px',
                }}
              >
                {commandHistory
                  .slice()
                  .reverse()
                  .map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => sendCommand(cmd)}
                      className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <code style={{ color: 'var(--accent)' }}>{cmd}</code>
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Terminal Container */}
      <div className="flex-1 overflow-hidden p-2">
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  );
}
