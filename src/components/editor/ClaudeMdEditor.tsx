import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ClaudeMdEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

type EditorTab = 'global' | 'project';

export function ClaudeMdEditor({ isOpen, onClose }: ClaudeMdEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('global');
  const [globalContent, setGlobalContent] = useState('');
  const [projectContent, setProjectContent] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load content when modal opens
  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const global = await invoke<string>('read_global_claude_md');
      setGlobalContent(global);
    } catch (err) {
      console.error('Failed to load global CLAUDE.md:', err);
      setError(err instanceof Error ? err.message : String(err));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadContent();
      setHasChanges(false);
    }
  }, [isOpen, loadContent]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      if (activeTab === 'global') {
        await invoke('write_global_claude_md', { content: globalContent });
      } else if (projectPath) {
        await invoke('write_project_claude_md', {
          projectPath,
          content: projectContent,
        });
      }
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }

    setIsSaving(false);
  };

  const handleContentChange = (value: string) => {
    if (activeTab === 'global') {
      setGlobalContent(value);
    } else {
      setProjectContent(value);
    }
    setHasChanges(true);
  };

  if (!isOpen) return null;

  const content = activeTab === 'global' ? globalContent : projectContent;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-[80vh] rounded-lg overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
          border: '3px solid #4a3f32',
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.5), 0 0 60px rgba(201, 162, 39, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between shrink-0"
          style={{
            background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
            borderBottom: '2px solid #4a3f32',
          }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold" style={{ color: '#c9a227' }}>
              CLAUDE.md Editor
            </h2>
            {hasChanges && (
              <span
                className="px-2 py-0.5 rounded text-xs"
                style={{ background: '#c9a22730', color: '#c9a227' }}
              >
                Unsaved changes
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: '#7a6f62' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f5e6d3')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#7a6f62')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0" style={{ borderColor: '#3d3328' }}>
          <button
            onClick={() => setActiveTab('global')}
            className="px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
            style={{
              color: activeTab === 'global' ? '#c9a227' : '#7a6f62',
              background: activeTab === 'global' ? 'rgba(201, 162, 39, 0.1)' : 'transparent',
              borderBottom: activeTab === 'global' ? '2px solid #c9a227' : '2px solid transparent',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Global (~/.claude/CLAUDE.md)
          </button>
          <button
            onClick={() => setActiveTab('project')}
            className="px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
            style={{
              color: activeTab === 'project' ? '#c9a227' : '#7a6f62',
              background: activeTab === 'project' ? 'rgba(201, 162, 39, 0.1)' : 'transparent',
              borderBottom: activeTab === 'project' ? '2px solid #c9a227' : '2px solid transparent',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Project
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div
                  className="animate-pulse text-lg font-bold"
                  style={{ color: '#c9a227' }}
                >
                  Loading...
                </div>
              </div>
            </div>
          ) : activeTab === 'project' && !projectPath ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div
                className="text-center p-6 rounded-lg max-w-md"
                style={{
                  background: 'rgba(201, 162, 39, 0.05)',
                  border: '1px dashed #4a3f32',
                }}
              >
                <svg
                  className="w-12 h-12 mx-auto mb-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7a6f62"
                  strokeWidth="1.5"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#c9a227' }}>
                  Project CLAUDE.md
                </h3>
                <p className="text-sm mb-4" style={{ color: '#b8a894' }}>
                  Project-specific CLAUDE.md files provide context for individual projects.
                  Enter a project path below to edit its CLAUDE.md file.
                </p>
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/path/to/your/project"
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{
                    background: '#1a1410',
                    border: '1px solid #4a3f32',
                    color: '#f5e6d3',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Editor */}
              <div className="flex-1 p-4 overflow-hidden">
                <textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-full p-4 rounded-lg resize-none font-mono text-sm"
                  style={{
                    background: '#1a1410',
                    border: '1px solid #3d3328',
                    color: '#f5e6d3',
                    outline: 'none',
                    lineHeight: 1.6,
                  }}
                  placeholder={`# CLAUDE.md

This file provides context to Claude Code about your ${activeTab === 'global' ? 'global preferences' : 'project'}.

## Instructions
- Describe your coding style preferences
- List important project conventions
- Add any special instructions for Claude

## Example
\`\`\`markdown
Prefer functional components in React.
Use TypeScript strict mode.
Follow the existing code style.
\`\`\``}
                  spellCheck={false}
                />
              </div>

              {/* Help text */}
              <div
                className="px-4 py-2 text-xs shrink-0"
                style={{ color: '#7a6f62', borderTop: '1px solid #3d3328' }}
              >
                <strong>Tip:</strong> CLAUDE.md files are read by Claude Code to understand your
                preferences. Use markdown to structure your instructions clearly.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex items-center justify-between shrink-0"
          style={{
            background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
            borderTop: '1px solid #3d3328',
          }}
        >
          <div>
            {error && (
              <span className="text-sm" style={{ color: '#ef4444' }}>
                {error}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm font-medium"
              style={{
                background: '#3d3328',
                color: '#b8a894',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="px-4 py-2 rounded text-sm font-medium transition-opacity"
              style={{
                background: 'linear-gradient(180deg, #c9a227 0%, #8b7019 100%)',
                color: '#1a1410',
                opacity: isSaving || !hasChanges ? 0.5 : 1,
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
