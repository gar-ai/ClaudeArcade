import { useState } from 'react';
import { usePersonaStore } from '../../stores/personaStore';
import { AvatarPicker } from './AvatarPicker';
import type { ThemeType } from '../../types';
import { THEME_PRESETS } from '../../types';

// Theme preview data
const THEME_INFO: Record<ThemeType, { name: string; description: string }> = {
  fantasy: {
    name: 'Fantasy',
    description: 'Classic gold and brown medieval theme',
  },
  dark: {
    name: 'Dark',
    description: 'Modern dark theme with indigo accents',
  },
  light: {
    name: 'Light',
    description: 'Clean light theme with green accents',
  },
  hacker: {
    name: 'Hacker',
    description: 'Matrix-inspired green on black',
  },
  royal: {
    name: 'Royal',
    description: 'Regal purple and deep violet',
  },
};

type EditorTab = 'profile' | 'avatar' | 'theme';

interface PersonaEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PersonaEditor({ isOpen, onClose }: PersonaEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('profile');
  const activePersona = usePersonaStore((state) => state.activePersona);
  const setName = usePersonaStore((state) => state.setName);
  const setTitle = usePersonaStore((state) => state.setTitle);
  const setTheme = usePersonaStore((state) => state.setTheme);

  const [editName, setEditName] = useState(activePersona.name);
  const [editTitle, setEditTitle] = useState(activePersona.title);

  if (!isOpen) return null;

  const handleSave = () => {
    if (editName.trim()) {
      setName(editName.trim());
    }
    if (editTitle.trim()) {
      setTitle(editTitle.trim());
    }
    onClose();
  };

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'avatar', label: 'Avatar' },
    { id: 'theme', label: 'Theme' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
          border: '3px solid #4a3f32',
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.5), 0 0 60px rgba(201, 162, 39, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{
            background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
            borderBottom: '2px solid #4a3f32',
          }}
        >
          <h2 className="text-lg font-bold" style={{ color: '#c9a227' }}>
            Edit Persona
          </h2>
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
        <div className="flex border-b" style={{ borderColor: '#3d3328' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === tab.id ? '#c9a227' : '#7a6f62',
                background: activeTab === tab.id ? 'rgba(201, 162, 39, 0.1)' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #c9a227' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4" style={{ minHeight: '300px' }}>
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#b8a894' }}
                >
                  Character Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded"
                  style={{
                    background: '#1a1410',
                    border: '1px solid #4a3f32',
                    color: '#f5e6d3',
                    outline: 'none',
                  }}
                  placeholder="Enter name..."
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#b8a894' }}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded"
                  style={{
                    background: '#1a1410',
                    border: '1px solid #4a3f32',
                    color: '#f5e6d3',
                    outline: 'none',
                  }}
                  placeholder="e.g., Code Mage, Debug Knight..."
                />
              </div>

              <div className="pt-4">
                <p className="text-xs" style={{ color: '#7a6f62' }}>
                  Your persona represents your Claude Code build profile. Customize it to
                  match your coding style and preferences.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'avatar' && <AvatarPicker />}

          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold" style={{ color: '#c9a227' }}>
                  Choose Theme
                </h3>
                <p className="text-sm" style={{ color: '#7a6f62' }}>
                  Select a color scheme for your interface
                </p>
              </div>

              <div className="space-y-2">
                {(Object.entries(THEME_INFO) as [ThemeType, typeof THEME_INFO.fantasy][]).map(
                  ([themeKey, info]) => {
                    const colors = THEME_PRESETS[themeKey];
                    const isSelected = activePersona.theme === themeKey;

                    return (
                      <button
                        key={themeKey}
                        onClick={() => setTheme(themeKey)}
                        className="w-full p-3 rounded-lg flex items-center gap-3 transition-all"
                        style={{
                          background: isSelected
                            ? `linear-gradient(90deg, ${colors.accent}20 0%, transparent 100%)`
                            : 'transparent',
                          border: `2px solid ${isSelected ? colors.accent : '#3d3328'}`,
                        }}
                      >
                        {/* Color swatches */}
                        <div className="flex gap-1">
                          <div
                            className="w-6 h-6 rounded"
                            style={{ background: colors.bgPrimary, border: '1px solid #5a4f42' }}
                          />
                          <div
                            className="w-6 h-6 rounded"
                            style={{ background: colors.accent }}
                          />
                          <div
                            className="w-6 h-6 rounded"
                            style={{ background: colors.textPrimary }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-left">
                          <div
                            className="font-medium"
                            style={{ color: isSelected ? colors.accent : '#f5e6d3' }}
                          >
                            {info.name}
                          </div>
                          <div className="text-xs" style={{ color: '#7a6f62' }}>
                            {info.description}
                          </div>
                        </div>

                        {/* Selected indicator */}
                        {isSelected && (
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={colors.accent}
                            strokeWidth="2"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex justify-end gap-2"
          style={{
            background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
            borderTop: '1px solid #3d3328',
          }}
        >
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
            className="px-4 py-2 rounded text-sm font-medium"
            style={{
              background: 'linear-gradient(180deg, #c9a227 0%, #8b7019 100%)',
              color: '#1a1410',
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
