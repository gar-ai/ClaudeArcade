import { useRef, useEffect, useMemo } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useProjectStore } from '../../stores/projectStore';
import { useAppStore } from '../../stores/appStore';
import { useProjectRegistryStore, selectSortedProjects } from '../../stores/projectRegistryStore';
import { PROJECT_TYPE_INFO, hasClaudeConfiguration } from '../../types/project';

export function ProjectPicker() {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const projectPath = useProjectStore((state) => state.projectPath);
  const projectName = useProjectStore((state) => state.projectName);
  const recentProjects = useProjectStore((state) => state.recentProjects);
  const setProject = useProjectStore((state) => state.setProject);
  const removeRecentProject = useProjectStore((state) => state.removeRecentProject);
  const isOpen = useProjectStore((state) => state.showProjectPicker);
  const setIsOpen = useProjectStore((state) => state.setShowProjectPicker);

  const detectProject = useAppStore((state) => state.detectProject);

  // Registry store
  const registeredProjects = useProjectRegistryStore((state) => state.registeredProjects);
  const sortedProjects = useMemo(
    () => selectSortedProjects({ registeredProjects, isScanning: false, lastError: null }),
    [registeredProjects]
  );

  // Get projects that have Claude configuration
  const projectsWithClaude = useMemo(
    () => sortedProjects.filter((p) => hasClaudeConfiguration(p.claudeItems)),
    [sortedProjects]
  );

  // Detect project on mount if there's a persisted project path
  useEffect(() => {
    if (projectPath) {
      detectProject(projectPath);
    }
  }, []); // Only run on mount

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder',
      });

      if (selected && typeof selected === 'string') {
        setProject(selected);
        detectProject(selected); // Detect project type for recommendations
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to open folder dialog:', err);
    }
  };

  const handleSelectProject = (path: string) => {
    setProject(path);
    detectProject(path); // Detect project type for recommendations
    setIsOpen(false);
  };

  const handleRemoveRecent = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    removeRecentProject(path);
  };

  const handleOpenProjectManager = () => {
    setIsOpen(false);
    // Dispatch keyboard event to open project manager (Cmd+Shift+P)
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'P',
        shiftKey: true,
        metaKey: true,
        ctrlKey: false,
        bubbles: true,
      })
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded transition-all"
        style={{
          background: projectPath
            ? `linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)`
            : 'transparent',
          border: projectPath ? '1px solid var(--accent)' : '1px solid var(--bg-tertiary)',
          color: projectPath ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        {/* Folder Icon */}
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>

        <span className="text-sm font-medium max-w-[150px] truncate">
          {projectName || 'Select Project'}
        </span>

        {/* Dropdown Arrow */}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-80 rounded-lg shadow-xl z-50 overflow-hidden max-h-[70vh] flex flex-col"
          style={{
            background: 'var(--bg-secondary)',
            border: '2px solid var(--bg-tertiary)',
          }}
        >
          {/* Open Folder Button */}
          <button
            onClick={handleOpenFolder}
            className="w-full flex items-center gap-3 px-4 py-3 transition-colors shrink-0"
            style={{ borderBottom: '1px solid var(--bg-tertiary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <path d="M12 11v6M9 14h6" />
            </svg>
            <span style={{ color: 'var(--accent)' }} className="font-medium">
              Open Folder...
            </span>
          </button>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Registered Projects with Claude */}
            {projectsWithClaude.length > 0 && (
              <div className="py-2">
                <div
                  className="px-4 py-1 text-[10px] uppercase font-bold flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>Claude-Enabled</span>
                  <span
                    className="px-1 py-0.5 rounded text-[9px] font-medium"
                    style={{ background: '#22c55e20', color: '#22c55e' }}
                  >
                    {projectsWithClaude.length}
                  </span>
                </div>

                {projectsWithClaude.slice(0, 5).map((project) => {
                  const typeInfo = PROJECT_TYPE_INFO[project.type] || PROJECT_TYPE_INFO.generic;
                  const isActive = project.path === projectPath;

                  return (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project.path)}
                      className="w-full flex items-center gap-3 px-4 py-2 transition-colors group"
                      style={{
                        background: isActive ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'var(--bg-tertiary)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Type badge */}
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ background: typeInfo.color + '20', color: typeInfo.color }}
                      >
                        {typeInfo.icon}
                      </div>

                      <div className="text-left min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-sm font-medium truncate"
                            style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}
                          >
                            {project.name}
                          </span>
                          {project.claudeItems.commandCount > 0 && (
                            <span
                              className="text-[9px] px-1 rounded"
                              style={{ background: '#60a5fa20', color: '#60a5fa' }}
                            >
                              {project.claudeItems.commandCount}cmd
                            </span>
                          )}
                          {project.claudeItems.skillCount > 0 && (
                            <span
                              className="text-[9px] px-1 rounded"
                              style={{ background: '#a78bfa20', color: '#a78bfa' }}
                            >
                              {project.claudeItems.skillCount}skl
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[10px] truncate"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {project.tags.length > 0 ? project.tags.join(', ') : project.path}
                        </div>
                      </div>

                      {isActive && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
                        >
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}

                {projectsWithClaude.length > 5 && (
                  <button
                    onClick={handleOpenProjectManager}
                    className="w-full px-4 py-1.5 text-xs transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    +{projectsWithClaude.length - 5} more... (Manage)
                  </button>
                )}
              </div>
            )}

            {/* Recent Projects */}
            {recentProjects.length > 0 && (
              <div className="py-2" style={{ borderTop: projectsWithClaude.length > 0 ? '1px solid var(--bg-tertiary)' : 'none' }}>
                <div
                  className="px-4 py-1 text-[10px] uppercase font-bold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Recent Projects
                </div>

                {recentProjects.slice(0, 5).map((project) => (
                  <button
                    key={project.path}
                    onClick={() => handleSelectProject(project.path)}
                    className="w-full flex items-center justify-between px-4 py-2 transition-colors group"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <svg
                        className="w-4 h-4 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-secondary)"
                        strokeWidth="2"
                      >
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <div className="text-left min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {project.name}
                        </div>
                        <div
                          className="text-[10px] truncate"
                          style={{ color: 'var(--text-secondary)' }}
                          title={project.path}
                        >
                          {project.path}
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => handleRemoveRecent(e, project.path)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Remove from recent"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </button>
                ))}
              </div>
            )}

            {/* No projects */}
            {recentProjects.length === 0 && projectsWithClaude.length === 0 && (
              <div className="px-4 py-6 text-center" style={{ color: 'var(--text-secondary)' }}>
                <p className="text-sm">No recent projects</p>
                <p className="text-xs mt-1">Select a folder to get started</p>
              </div>
            )}
          </div>

          {/* Footer - Manage Projects Link */}
          <div
            className="px-4 py-2 flex items-center justify-between shrink-0"
            style={{
              borderTop: '1px solid var(--bg-tertiary)',
              background: 'var(--bg-primary)',
            }}
          >
            {projectPath ? (
              <div className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent)' }}>Current:</span> {projectPath}
              </div>
            ) : (
              <div />
            )}

            <button
              onClick={handleOpenProjectManager}
              className="text-[10px] px-2 py-1 rounded transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              title="Cmd+Shift+P"
            >
              Manage...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
