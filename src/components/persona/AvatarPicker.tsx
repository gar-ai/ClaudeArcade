import { usePersonaStore } from '../../stores/personaStore';
import { PixelSprite } from '../character/PixelSprite';
import type { AvatarType } from '../../types';

// Avatar metadata
const AVATAR_DATA: Record<AvatarType, { name: string; description: string }> = {
  mage: {
    name: 'Mage',
    description: 'Master of arcane arts and code sorcery',
  },
  warrior: {
    name: 'Warrior',
    description: 'Battle-hardened debugger and bug slayer',
  },
  rogue: {
    name: 'Rogue',
    description: 'Stealthy refactorer and performance thief',
  },
  cleric: {
    name: 'Cleric',
    description: 'Healer of broken builds and CI pipelines',
  },
  ranger: {
    name: 'Ranger',
    description: 'Tracker of dependencies and path finder',
  },
  warlock: {
    name: 'Warlock',
    description: 'Wielder of dark APIs and forbidden code',
  },
};

interface AvatarPickerProps {
  onClose?: () => void;
}

export function AvatarPicker({ onClose }: AvatarPickerProps) {
  const activePersona = usePersonaStore((state) => state.activePersona);
  const setAvatar = usePersonaStore((state) => state.setAvatar);

  const handleSelect = (avatar: AvatarType) => {
    setAvatar(avatar);
    onClose?.();
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3
          className="text-lg font-bold"
          style={{ color: '#c9a227' }}
        >
          Choose Your Class
        </h3>
        <p className="text-sm" style={{ color: '#7a6f62' }}>
          Select an avatar for your build profile
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(AVATAR_DATA) as [AvatarType, typeof AVATAR_DATA.mage][]).map(
          ([avatarKey, data]) => {
            const isSelected = activePersona.avatar === avatarKey;

            return (
              <button
                key={avatarKey}
                onClick={() => handleSelect(avatarKey)}
                className="p-3 rounded-lg transition-all group"
                style={{
                  background: isSelected
                    ? 'linear-gradient(180deg, rgba(201, 162, 39, 0.2) 0%, rgba(139, 112, 25, 0.1) 100%)'
                    : 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
                  border: `2px solid ${isSelected ? '#c9a227' : '#3d3328'}`,
                  boxShadow: isSelected ? '0 0 12px rgba(201, 162, 39, 0.3)' : 'none',
                }}
              >
                {/* Avatar Icon */}
                <div
                  className="w-16 h-16 mx-auto rounded-lg flex items-center justify-center mb-2 overflow-hidden"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(201, 162, 39, 0.3) 0%, rgba(139, 112, 25, 0.2) 100%)'
                      : 'linear-gradient(135deg, #2a231c 0%, #1a1410 100%)',
                    border: `2px solid ${isSelected ? '#c9a227' : '#3d3328'}`,
                    boxShadow: isSelected ? '0 0 8px rgba(201, 162, 39, 0.4)' : 'none',
                  }}
                >
                  <PixelSprite
                    avatar={avatarKey}
                    size={48}
                    glowColor={isSelected ? '#c9a227' : undefined}
                  />
                </div>

                {/* Name */}
                <div
                  className="text-sm font-medium"
                  style={{ color: isSelected ? '#c9a227' : '#f5e6d3' }}
                >
                  {data.name}
                </div>

                {/* Description - show on hover */}
                <div
                  className="text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#7a6f62' }}
                >
                  {data.description}
                </div>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}

// Compact avatar display for use in other components
export function AvatarIcon({ avatar, size = 24 }: { avatar: AvatarType; size?: number }) {
  return <PixelSprite avatar={avatar} size={size} />;
}
