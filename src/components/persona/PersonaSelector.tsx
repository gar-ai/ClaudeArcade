import { useState, useRef, useEffect } from 'react';
import { usePersonaStore } from '../../stores/personaStore';
import { PersonaEditor } from './PersonaEditor';
import type { Persona, AvatarType } from '../../types';

// Simple avatar icons
const AVATAR_ICONS: Record<AvatarType, string> = {
  mage: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  warrior: 'M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5V7L12 2 3 7v10z',
  rogue: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  cleric: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 16h-2v-6H4v-2h6V5h2v6h6v2h-6v6z',
  ranger: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z',
  warlock: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z',
};

interface PersonaSelectorProps {
  compact?: boolean;
}

export function PersonaSelector({ compact = false }: PersonaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewPersona, setShowNewPersona] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activePersona = usePersonaStore((state) => state.activePersona);
  const savedPersonas = usePersonaStore((state) => state.savedPersonas);
  const loadPersona = usePersonaStore((state) => state.loadPersona);
  const saveCurrentAsPersona = usePersonaStore((state) => state.saveCurrentAsPersona);
  const deletePersona = usePersonaStore((state) => state.deletePersona);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNewPersona(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveNew = () => {
    if (newPersonaName.trim()) {
      saveCurrentAsPersona(newPersonaName.trim());
      setNewPersonaName('');
      setShowNewPersona(false);
    }
  };

  const handleLoadPersona = (persona: Persona) => {
    loadPersona(persona.id);
    setIsOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, personaId: string) => {
    e.stopPropagation();
    deletePersona(personaId);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded transition-colors"
        style={{
          background: isOpen
            ? 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)'
            : 'transparent',
          border: '1px solid transparent',
          borderColor: isOpen ? '#4a3f32' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(201, 162, 39, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        {/* Avatar Icon */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #c9a227 0%, #8b7019 100%)',
            border: '1px solid #e4c34a',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="#1a1410"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={AVATAR_ICONS[activePersona.avatar]} />
          </svg>
        </div>

        {!compact && (
          <>
            <div className="text-left">
              <div className="text-sm font-medium" style={{ color: '#f5e6d3' }}>
                {activePersona.name}
              </div>
              <div className="text-xs" style={{ color: '#7a6f62' }}>
                {activePersona.title}
              </div>
            </div>

            {/* Dropdown Arrow */}
            <svg
              className="w-4 h-4 transition-transform"
              style={{
                color: '#7a6f62',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-64 rounded-lg shadow-xl z-50 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
            border: '2px solid #4a3f32',
          }}
        >
          {/* Current Persona */}
          <div
            className="px-3 py-2 border-b flex items-center justify-between"
            style={{ borderColor: '#3d3328', background: 'rgba(201, 162, 39, 0.05)' }}
          >
            <div>
              <div className="text-xs font-medium uppercase" style={{ color: '#7a6f62' }}>
                Active Build
              </div>
              <div className="text-sm font-medium" style={{ color: '#c9a227' }}>
                {activePersona.name} - {activePersona.title}
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowEditor(true);
              }}
              className="p-1.5 rounded transition-colors"
              style={{ color: '#7a6f62' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#c9a227';
                e.currentTarget.style.background = 'rgba(201, 162, 39, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#7a6f62';
                e.currentTarget.style.background = 'transparent';
              }}
              title="Edit persona"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>

          {/* Saved Personas */}
          {savedPersonas.length > 0 && (
            <div className="py-1 border-b" style={{ borderColor: '#3d3328' }}>
              <div
                className="px-3 py-1 text-xs font-medium uppercase"
                style={{ color: '#7a6f62' }}
              >
                Saved Builds
              </div>
              {savedPersonas.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => handleLoadPersona(persona)}
                  className="w-full px-3 py-2 flex items-center justify-between group transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(201, 162, 39, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #4a3f32 0%, #2a231c 100%)',
                        border: '1px solid #5a4f42',
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3 h-3"
                        fill="none"
                        stroke="#b8a894"
                        strokeWidth="2"
                      >
                        <path d={AVATAR_ICONS[persona.avatar]} />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-sm" style={{ color: '#f5e6d3' }}>
                        {persona.name}
                      </div>
                      <div className="text-xs" style={{ color: '#7a6f62' }}>
                        {persona.title}
                      </div>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, persona.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                    style={{ color: '#ef4444' }}
                    title="Delete persona"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* New Persona */}
          <div className="p-2">
            {showNewPersona ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newPersonaName}
                  onChange={(e) => setNewPersonaName(e.target.value)}
                  placeholder="Build name..."
                  autoFocus
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={{
                    background: '#1a1410',
                    border: '1px solid #4a3f32',
                    color: '#f5e6d3',
                    outline: 'none',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNew();
                    if (e.key === 'Escape') setShowNewPersona(false);
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNew}
                    className="flex-1 px-2 py-1 rounded text-xs font-medium"
                    style={{
                      background: 'linear-gradient(180deg, #c9a227 0%, #8b7019 100%)',
                      color: '#1a1410',
                    }}
                  >
                    Save Build
                  </button>
                  <button
                    onClick={() => setShowNewPersona(false)}
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      background: '#3d3328',
                      color: '#b8a894',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewPersona(true)}
                className="w-full px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: 'transparent',
                  border: '1px dashed #4a3f32',
                  color: '#b8a894',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#c9a227';
                  e.currentTarget.style.color = '#c9a227';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#4a3f32';
                  e.currentTarget.style.color = '#b8a894';
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Save Current Build
              </button>
            )}
          </div>
        </div>
      )}

      {/* Persona Editor Modal */}
      <PersonaEditor isOpen={showEditor} onClose={() => setShowEditor(false)} />
    </div>
  );
}
