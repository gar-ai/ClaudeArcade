import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { usePersonaStore } from '../../stores/personaStore';
import { useProjectStore } from '../../stores/projectStore';
import '@xterm/xterm/css/xterm.css';

// Quick command presets
const QUICK_COMMANDS = [
  { label: 'Claude', cmd: 'claude', icon: '>', description: 'Start Claude Code' },
  { label: 'Help', cmd: 'claude --help', icon: '?', description: 'Show help' },
  { label: 'Clear', cmd: 'clear', icon: 'x', description: 'Clear terminal' },
];

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const themeColors = usePersonaStore((state) => state.themeColors);

  // Project state
  const projectPath = useProjectStore((state) => state.projectPath);
  const projectName = useProjectStore((state) => state.projectName);
  const autoStartClaude = useProjectStore((state) => state.autoStartClaude);

  // Send a command to the terminal
  const sendCommand = useCallback(async (cmd: string) => {
    if (ptyIdRef.current && xtermRef.current) {
      try {
        // Add to history
        setCommandHistory(prev => [...prev.slice(-19), cmd]);
        // Send command with newline
        await invoke('pty_write', { id: ptyIdRef.current, data: cmd + '\n' });
      } catch (err) {
        console.error('Failed to send command:', err);
      }
    }
  }, []);

  // Handle terminal input
  const handleInput = useCallback(async (data: string) => {
    if (ptyIdRef.current) {
      try {
        await invoke('pty_write', { id: ptyIdRef.current, data });
      } catch (err) {
        console.error('Failed to write to PTY:', err);
      }
    }
  }, []);

  // Handle terminal resize
  const handleResize = useCallback(async () => {
    if (fitAddonRef.current && xtermRef.current && ptyIdRef.current) {
      fitAddonRef.current.fit();
      const { cols, rows } = xtermRef.current;
      try {
        await invoke('pty_resize', { id: ptyIdRef.current, cols, rows });
      } catch (err) {
        console.error('Failed to resize PTY:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal with theme-aware styling
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
    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial fit
    setTimeout(() => fitAddon.fit(), 0);

    // Handle user input
    term.onData(handleInput);

    // Spawn PTY with project directory
    const spawnPty = async () => {
      try {
        const id = await invoke<string>('pty_spawn', {
          cols: term.cols,
          rows: term.rows,
          cwd: projectPath || undefined,
        });
        ptyIdRef.current = id;
        setIsConnected(true);

        // Welcome message
        term.writeln('\x1b[1;33m╔══════════════════════════════════╗\x1b[0m');
        term.writeln('\x1b[1;33m║     ClaudeArcade Terminal        ║\x1b[0m');
        term.writeln('\x1b[1;33m╚══════════════════════════════════╝\x1b[0m');
        term.writeln('');

        if (projectPath) {
          term.writeln(`\x1b[32mProject:\x1b[0m ${projectName || projectPath}`);
          term.writeln(`\x1b[90m${projectPath}\x1b[0m`);
          term.writeln('');

          // Auto-start claude if enabled
          if (autoStartClaude) {
            term.writeln('\x1b[90mStarting Claude Code...\x1b[0m');
            term.writeln('');
            // Small delay to let shell initialize
            setTimeout(async () => {
              await invoke('pty_write', { id, data: 'claude\n' });
            }, 500);
          }
        } else {
          term.writeln('\x1b[90mNo project selected. Use the Project Picker to select a folder.\x1b[0m');
          term.writeln('\x1b[90mOr use the quick commands above.\x1b[0m');
          term.writeln('');
        }
      } catch (err) {
        console.error('Failed to spawn PTY:', err);
        term.writeln('\x1b[31mFailed to start terminal\x1b[0m');
        term.writeln('\x1b[90mPTY support may not be available\x1b[0m');
        setIsConnected(false);
      }
    };

    spawnPty();

    // Listen for PTY output
    const unlistenOutput = listen<{ id: string; data: string }>('pty-output', (event) => {
      if (event.payload.id === ptyIdRef.current) {
        term.write(event.payload.data);
      }
    });

    // Listen for PTY exit
    const unlistenExit = listen<{ id: string; code: number }>('pty-exit', (event) => {
      if (event.payload.id === ptyIdRef.current) {
        term.writeln('');
        term.writeln(`\x1b[90mProcess exited with code ${event.payload.code}\x1b[0m`);
        ptyIdRef.current = null;
      }
    });

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      // Cleanup
      unlistenOutput.then((fn) => fn());
      unlistenExit.then((fn) => fn());
      resizeObserver.disconnect();

      if (ptyIdRef.current) {
        invoke('pty_kill', { id: ptyIdRef.current }).catch(console.error);
      }

      term.dispose();
    };
  }, [handleInput, handleResize, themeColors, projectPath, projectName, autoStartClaude]);

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden"
      style={{ background: 'var(--terminal-bg)' }}
    >
      {/* Command Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{
          background: `linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)`,
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
                  ? `linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)`
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

        {/* Divider */}
        <div
          className="w-px h-5 mx-1"
          style={{ background: 'var(--bg-tertiary)' }}
        />

        {/* Project indicator */}
        {projectName && (
          <div className="flex items-center gap-1.5 ml-auto">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>
              {projectName}
            </span>
          </div>
        )}

        {/* Connection Status */}
        <div className={`flex items-center gap-1.5 ${projectName ? '' : 'ml-auto'}`}>
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

        {/* History dropdown (if we have history) */}
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
                {commandHistory.slice().reverse().map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => sendCommand(cmd)}
                    className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
          ref={terminalRef}
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
