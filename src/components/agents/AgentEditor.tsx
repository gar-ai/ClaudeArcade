/**
 * Agent Editor - Create and edit Claude Code agents
 */

import { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import {
  saveAgent,
  AgentData,
  AgentConfig,
  createEmptyAgentConfig,
  generateAgentId,
  generateAgentMarkdown,
  AVAILABLE_TOOLS,
  AVAILABLE_MODELS,
  PERMISSION_MODES,
} from '../../services/agentService';

interface AgentEditorProps {
  agent: AgentData | null;
  isCreating: boolean;
  onClose: (saved: boolean) => void;
}

export function AgentEditor({ agent, isCreating, onClose }: AgentEditorProps) {
  const [config, setConfig] = useState<AgentConfig>(
    agent?.config || createEmptyAgentConfig()
  );
  const [agentId, setAgentId] = useState(agent?.id || '');
  const [isGlobal, setIsGlobal] = useState(agent?.is_global ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const projectPath = useProjectStore((state) => state.projectPath);

  // Auto-generate ID from name when creating
  useEffect(() => {
    if (isCreating && config.name) {
      setAgentId(generateAgentId(config.name));
    }
  }, [config.name, isCreating]);

  // Handle save
  const handleSave = async () => {
    if (!agentId.trim()) {
      setError('Agent ID is required');
      return;
    }
    if (!config.name.trim()) {
      setError('Agent name is required');
      return;
    }
    if (!config.description.trim()) {
      setError('Description is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveAgent(agentId, config, isGlobal, projectPath || undefined);
      onClose(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  // Toggle tool selection
  const toggleTool = (tool: string) => {
    const currentTools = config.tools || [];
    const newTools = currentTools.includes(tool)
      ? currentTools.filter((t) => t !== tool)
      : [...currentTools, tool];
    setConfig({ ...config, tools: newTools.length > 0 ? newTools : null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose(false)} />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
          border: '2px solid #c9a227',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid #3d3328' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#c9a227' }}>
              {isCreating ? 'Create Agent' : 'Edit Agent'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#7a6f62' }}>
              {isCreating ? 'Define a new custom agent' : `Editing: ${agent?.id}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${showPreview ? 'ring-2 ring-[#c9a227] ring-offset-2 ring-offset-[#1a1410]' : ''}`}
              style={{
                background: showPreview ? '#c9a227' : '#3d3328',
                color: showPreview ? '#1a1410' : '#b8a894',
              }}
            >
              Preview
            </button>
            <button
              onClick={() => onClose(false)}
              className="p-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: '#7a6f62' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {showPreview ? (
            // Preview Mode
            <div className="rounded-lg p-4 font-mono text-sm whitespace-pre-wrap" style={{ background: '#1a1410', color: '#b8a894' }}>
              {generateAgentMarkdown(config)}
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-5">
              {/* AI Generator Toggle */}
              {isCreating && (
                <div
                  className="p-4 rounded-lg"
                  style={{ background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.3)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="#a855f7" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="font-medium" style={{ color: '#a855f7' }}>
                        AI-Assisted Generation
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAiGenerator(!showAiGenerator)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: 'rgba(147, 51, 234, 0.2)', color: '#a855f7' }}
                    >
                      {showAiGenerator ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showAiGenerator && (
                    <div className="space-y-2">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe what you want this agent to do... (e.g., 'A code reviewer that focuses on security vulnerabilities')"
                        className="w-full h-24 px-3 py-2 rounded-lg text-sm resize-none"
                        style={{
                          background: '#1a1410',
                          border: '1px solid #3d3328',
                          color: '#b8a894',
                        }}
                      />
                      <p className="text-xs" style={{ color: '#7a6f62' }}>
                        Coming soon: Claude will generate the agent configuration based on your description
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    placeholder="Code Reviewer"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: '#1a1410',
                      border: '1px solid #3d3328',
                      color: '#b8a894',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                    Agent ID {isCreating && '(auto-generated)'}
                  </label>
                  <input
                    type="text"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    placeholder="code-reviewer"
                    disabled={!isCreating}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: '#1a1410',
                      border: '1px solid #3d3328',
                      color: isCreating ? '#b8a894' : '#7a6f62',
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                  Description * <span style={{ color: '#7a6f62' }}>(when Claude should use this agent)</span>
                </label>
                <textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Expert code reviewer that analyzes code for quality, security, and best practices. USE PROACTIVELY when reviewing pull requests or code changes."
                  className="w-full h-20 px-3 py-2 rounded-lg text-sm resize-none"
                  style={{
                    background: '#1a1410',
                    border: '1px solid #3d3328',
                    color: '#b8a894',
                  }}
                />
              </div>

              {/* Model & Permission Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                    Model
                  </label>
                  <select
                    value={config.model || ''}
                    onChange={(e) => setConfig({ ...config, model: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: '#1a1410',
                      border: '1px solid #3d3328',
                      color: '#b8a894',
                    }}
                  >
                    <option value="">Default (inherit)</option>
                    {AVAILABLE_MODELS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                    Permission Mode
                  </label>
                  <select
                    value={config.permission_mode || ''}
                    onChange={(e) => setConfig({ ...config, permission_mode: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: '#1a1410',
                      border: '1px solid #3d3328',
                      color: '#b8a894',
                    }}
                  >
                    <option value="">Default</option>
                    {PERMISSION_MODES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scope */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                  Scope
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsGlobal(true)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all ${isGlobal ? 'ring-2 ring-blue-400' : ''}`}
                    style={{
                      background: isGlobal ? 'rgba(96, 165, 250, 0.15)' : '#1a1410',
                      color: isGlobal ? '#60a5fa' : '#7a6f62',
                      border: `1px solid ${isGlobal ? '#60a5fa' : '#3d3328'}`,
                    }}
                  >
                    <div className="font-medium">Global</div>
                    <div className="text-xs opacity-75">~/.claude/agents/</div>
                  </button>
                  <button
                    onClick={() => setIsGlobal(false)}
                    disabled={!projectPath}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all ${!isGlobal ? 'ring-2 ring-green-400' : ''}`}
                    style={{
                      background: !isGlobal ? 'rgba(74, 222, 128, 0.15)' : '#1a1410',
                      color: !isGlobal ? '#4ade80' : projectPath ? '#7a6f62' : '#4a3f32',
                      border: `1px solid ${!isGlobal ? '#4ade80' : '#3d3328'}`,
                    }}
                  >
                    <div className="font-medium">Project</div>
                    <div className="text-xs opacity-75">.claude/agents/</div>
                  </button>
                </div>
              </div>

              {/* Tools */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                  Allowed Tools <span style={{ color: '#7a6f62' }}>(leave empty for all tools)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TOOLS.map((tool) => {
                    const selected = config.tools?.includes(tool);
                    return (
                      <button
                        key={tool}
                        onClick={() => toggleTool(tool)}
                        className="px-2.5 py-1 rounded text-xs transition-all"
                        style={{
                          background: selected ? 'rgba(201, 162, 39, 0.2)' : '#1a1410',
                          color: selected ? '#c9a227' : '#7a6f62',
                          border: `1px solid ${selected ? '#c9a227' : '#3d3328'}`,
                        }}
                      >
                        {tool}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#b8a894' }}>
                  System Prompt
                </label>
                <textarea
                  value={config.system_prompt}
                  onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                  placeholder="You are an expert code reviewer. When reviewing code, focus on:&#10;- Security vulnerabilities&#10;- Performance issues&#10;- Code readability&#10;- Best practices"
                  className="w-full h-48 px-3 py-2 rounded-lg text-sm font-mono resize-none"
                  style={{
                    background: '#1a1410',
                    border: '1px solid #3d3328',
                    color: '#b8a894',
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderTop: '1px solid #3d3328', background: '#1a1410' }}
        >
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: '#3d3328', color: '#b8a894' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
            style={{
              background: 'linear-gradient(180deg, #c9a227 0%, #a68820 100%)',
              color: '#1a1410',
            }}
          >
            {saving ? 'Saving...' : isCreating ? 'Create Agent' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
