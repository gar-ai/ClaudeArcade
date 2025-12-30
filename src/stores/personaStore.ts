import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Persona, ThemeType, AvatarType, SavedLoadout, ThemeColors } from '../types';
import { DEFAULT_PERSONA, THEME_PRESETS } from '../types';

interface PersonaState {
  // Current active persona
  activePersona: Persona;

  // Saved personas (build profiles)
  savedPersonas: Persona[];

  // Computed theme colors based on active persona
  themeColors: ThemeColors;
}

interface PersonaActions {
  // Persona management
  createPersona: (name: string, title?: string) => Persona;
  saveCurrentAsPersona: (name: string, title?: string) => void;
  loadPersona: (personaId: string) => void;
  deletePersona: (personaId: string) => void;
  updatePersona: (personaId: string, updates: Partial<Omit<Persona, 'id' | 'createdAt'>>) => void;

  // Quick setters for current persona
  setAvatar: (avatar: AvatarType) => void;
  setTheme: (theme: ThemeType) => void;
  setTitle: (title: string) => void;
  setName: (name: string) => void;

  // Loadout management
  saveCurrentLoadout: (loadout: SavedLoadout) => void;
  getLoadout: () => SavedLoadout;
}

function generateId(): string {
  return `persona_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultPersona(): Persona {
  return {
    ...DEFAULT_PERSONA,
    id: generateId(),
    createdAt: Date.now(),
    lastUsed: Date.now(),
  };
}

export const usePersonaStore = create<PersonaState & PersonaActions>()(
  persist(
    (set, get) => ({
      // Initial state
      activePersona: createDefaultPersona(),
      savedPersonas: [],
      themeColors: THEME_PRESETS.fantasy,

      // Actions
      createPersona: (name, title = 'Code Mage') => {
        const newPersona: Persona = {
          id: generateId(),
          name,
          title,
          avatar: 'mage',
          theme: 'fantasy',
          loadout: {
            helmId: null,
            hookIds: [],
            mainhandId: null,
            offhandId: null,
            ringIds: [],
            spellbookIds: [],
            companionIds: [],
            trinketIds: [],
          },
          createdAt: Date.now(),
          lastUsed: Date.now(),
        };

        set((state) => ({
          savedPersonas: [...state.savedPersonas, newPersona],
        }));

        return newPersona;
      },

      saveCurrentAsPersona: (name, title) => {
        const { activePersona, savedPersonas } = get();

        const newPersona: Persona = {
          ...activePersona,
          id: generateId(),
          name,
          title: title || activePersona.title,
          createdAt: Date.now(),
          lastUsed: Date.now(),
        };

        set({
          savedPersonas: [...savedPersonas, newPersona],
        });
      },

      loadPersona: (personaId) => {
        const { savedPersonas } = get();
        const persona = savedPersonas.find((p) => p.id === personaId);

        if (persona) {
          const updatedPersona = {
            ...persona,
            lastUsed: Date.now(),
          };

          set({
            activePersona: updatedPersona,
            themeColors: THEME_PRESETS[persona.theme],
            savedPersonas: savedPersonas.map((p) =>
              p.id === personaId ? updatedPersona : p
            ),
          });
        }
      },

      deletePersona: (personaId) => {
        set((state) => ({
          savedPersonas: state.savedPersonas.filter((p) => p.id !== personaId),
        }));
      },

      updatePersona: (personaId, updates) => {
        const { savedPersonas, activePersona } = get();

        // Update in saved personas list
        const updatedSaved = savedPersonas.map((p) =>
          p.id === personaId ? { ...p, ...updates } : p
        );

        // If updating active persona, also update it
        if (activePersona.id === personaId) {
          const updatedActive = { ...activePersona, ...updates };
          set({
            activePersona: updatedActive,
            savedPersonas: updatedSaved,
            themeColors: THEME_PRESETS[updatedActive.theme],
          });
        } else {
          set({ savedPersonas: updatedSaved });
        }
      },

      setAvatar: (avatar) => {
        set((state) => ({
          activePersona: { ...state.activePersona, avatar },
        }));
      },

      setTheme: (theme) => {
        set((state) => ({
          activePersona: { ...state.activePersona, theme },
          themeColors: THEME_PRESETS[theme],
        }));
      },

      setTitle: (title) => {
        set((state) => ({
          activePersona: { ...state.activePersona, title },
        }));
      },

      setName: (name) => {
        set((state) => ({
          activePersona: { ...state.activePersona, name },
        }));
      },

      saveCurrentLoadout: (loadout) => {
        set((state) => ({
          activePersona: { ...state.activePersona, loadout },
        }));
      },

      getLoadout: () => {
        return get().activePersona.loadout;
      },
    }),
    {
      name: 'claudearcade-personas',
      partialize: (state) => ({
        activePersona: state.activePersona,
        savedPersonas: state.savedPersonas,
      }),
    }
  )
);
