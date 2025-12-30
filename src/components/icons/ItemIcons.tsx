import type { ItemType } from '../../types';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

// 16x16 pixel art icon data
// 0 = transparent, 1 = outline/dark, 2 = main color, 3 = highlight, 4 = accent

// Sword pixel art
const WEAPON_DATA = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,3,2,3,0],
  [0,0,0,0,0,0,0,0,0,0,0,3,2,2,0,0],
  [0,0,0,0,0,0,0,0,0,0,3,2,2,0,0,0],
  [0,0,0,0,0,0,0,0,0,3,2,2,0,0,0,0],
  [0,0,0,0,0,0,0,0,3,2,2,0,0,0,0,0],
  [0,0,0,0,0,0,0,3,2,2,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,2,2,0,0,0,0,0,0,0],
  [0,0,0,0,0,3,2,2,0,0,0,0,0,0,0,0],
  [0,0,0,0,3,2,2,0,0,0,0,0,0,0,0,0],
  [0,0,0,3,2,2,0,0,0,0,0,0,0,0,0,0],
  [0,0,1,4,2,1,0,0,0,0,0,0,0,0,0,0],
  [0,1,4,1,1,4,1,0,0,0,0,0,0,0,0,0],
  [0,0,1,0,0,1,4,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,4,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
];

// Shield pixel art
const ARMOR_DATA = [
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,2,2,2,3,3,2,2,2,1,0,0,0],
  [0,0,1,2,2,2,2,3,3,2,2,2,2,1,0,0],
  [0,1,2,2,2,2,2,3,3,2,2,2,2,2,1,0],
  [0,1,2,2,2,2,2,3,3,2,2,2,2,2,1,0],
  [0,1,2,2,2,1,1,4,4,1,1,2,2,2,1,0],
  [0,1,2,2,2,1,4,4,4,4,1,2,2,2,1,0],
  [0,1,2,2,2,1,4,4,4,4,1,2,2,2,1,0],
  [0,1,2,2,2,1,4,4,4,4,1,2,2,2,1,0],
  [0,1,2,2,2,1,1,4,4,1,1,2,2,2,1,0],
  [0,1,2,2,2,2,2,3,3,2,2,2,2,2,1,0],
  [0,0,1,2,2,2,2,3,3,2,2,2,2,1,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
];

// Crystal/gem pixel art
const AMULET_DATA = [
  [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,4,4,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,2,3,3,2,1,0,0,0,0,0],
  [0,0,0,0,1,2,3,3,3,3,2,1,0,0,0,0],
  [0,0,0,1,2,2,3,3,3,3,2,2,1,0,0,0],
  [0,0,0,1,2,2,2,3,3,2,2,2,1,0,0,0],
  [0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Spellbook pixel art
const SPELL_DATA = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,1,4,4,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,1,4,4,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,1,4,4,2,2,0,3,3,0,2,2,2,1,0,0],
  [0,1,4,4,2,0,3,3,3,3,0,2,2,1,0,0],
  [0,1,4,4,2,3,3,3,3,3,3,2,2,1,0,0],
  [0,1,4,4,2,3,3,3,3,3,3,2,2,1,0,0],
  [0,1,4,4,2,3,3,3,3,3,3,2,2,1,0,0],
  [0,1,4,4,2,0,3,3,3,3,0,2,2,1,0,0],
  [0,1,4,4,2,2,0,3,3,0,2,2,2,1,0,0],
  [0,1,4,4,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,1,4,4,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Pet/creature pixel art
const COMPANION_DATA = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
  [0,0,1,2,2,1,0,0,0,0,1,2,2,1,0,0],
  [0,0,1,2,2,1,1,1,1,1,1,2,2,1,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,1,2,3,2,2,2,2,3,2,1,0,0,0],
  [0,0,0,1,2,1,2,2,2,2,1,2,1,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,0,1,2,2,4,4,2,2,1,0,0,0,0],
  [0,0,0,0,0,1,2,2,2,2,1,0,0,0,0,0],
  [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,2,2,2,2,1,1,2,2,2,2,1,0,0],
  [0,0,0,1,1,2,1,0,0,1,2,1,1,0,0,0],
  [0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Rune circle pixel art
const ENCHANTMENT_DATA = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,1,2,2,2,0,3,3,0,2,2,2,1,0,0],
  [0,1,2,2,2,0,3,4,4,3,0,2,2,2,1,0],
  [0,1,2,2,0,3,4,4,4,4,3,0,2,2,1,0],
  [0,1,2,2,3,4,4,4,4,4,4,3,2,2,1,0],
  [0,1,2,2,3,4,4,4,4,4,4,3,2,2,1,0],
  [0,1,2,2,0,3,4,4,4,4,3,0,2,2,1,0],
  [0,1,2,2,2,0,3,4,4,3,0,2,2,2,1,0],
  [0,0,1,2,2,2,0,3,3,0,2,2,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Color palettes for each item type (WoW-style mapping)
const ITEM_PALETTES = {
  // Helm - CLAUDE.md (mind/persona)
  helm: {
    outline: '#1a1410',
    main: '#7c3aed',      // purple - wisdom
    highlight: '#a78bfa', // light purple shine
    accent: '#c9a227',    // gold crown trim
  },
  // Hooks (consolidated)
  hooks: {
    outline: '#1a1410',
    main: '#71717a',      // steel
    highlight: '#a1a1aa', // shine
    accent: '#3b82f6',    // blue - guards/protection
  },
  // Weapons - Plugins
  mainhand: {
    outline: '#1a1410',
    main: '#a1a1aa',      // silver blade
    highlight: '#e4e4e7', // shine
    accent: '#78350f',    // brown handle
  },
  offhand: {
    outline: '#1a1410',
    main: '#71717a',      // steel
    highlight: '#a1a1aa', // shine
    accent: '#c9a227',    // gold trim
  },
  // Ring - Slash commands
  ring: {
    outline: '#1a1410',
    main: '#7c3aed',      // purple gem
    highlight: '#a78bfa', // gem shine
    accent: '#c9a227',    // gold band
  },
  // Spell - Skills
  spell: {
    outline: '#1a1410',
    main: '#78350f',      // leather cover
    highlight: '#7c3aed', // magic glow
    accent: '#c9a227',    // gold trim
  },
  // Companion - Subagents
  companion: {
    outline: '#1a1410',
    main: '#f5dcc4',      // fur/body
    highlight: '#ffffff', // eye shine
    accent: '#ec4899',    // nose/tongue
  },
  // Trinket - MCP servers
  trinket: {
    outline: '#1a1410',
    main: '#312e81',      // dark purple base
    highlight: '#22d3ee', // cyan glow
    accent: '#67e8f9',    // bright glow
  },
};

function PixelIcon({
  data,
  palette,
  size = 24,
  color,
  className
}: {
  data: number[][];
  palette: typeof ITEM_PALETTES.mainhand;
  size?: number;
  color?: string;
  className?: string;
}) {
  const getColor = (value: number): string | null => {
    switch (value) {
      case 0: return null; // transparent
      case 1: return palette.outline;
      case 2: return color || palette.main;
      case 3: return palette.highlight;
      case 4: return color ? adjustBrightness(color, 1.3) : palette.accent;
      default: return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {data.map((row, y) =>
        row.map((pixel, x) => {
          const pixelColor = getColor(pixel);
          if (!pixelColor) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={pixelColor}
            />
          );
        })
      )}
    </svg>
  );
}

// Utility to adjust brightness of a hex color
function adjustBrightness(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const newR = Math.min(255, Math.round(r * factor));
  const newG = Math.min(255, Math.round(g * factor));
  const newB = Math.min(255, Math.round(b * factor));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Sword icon for weapons (legacy - maps to mainhand)
export function WeaponIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={WEAPON_DATA}
      palette={ITEM_PALETTES.mainhand}
      size={size}
      color={color}
      className={className}
    />
  );
}

// Shield icon for armor (legacy - maps to offhand)
export function ArmorIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={ARMOR_DATA}
      palette={ITEM_PALETTES.offhand}
      size={size}
      color={color}
      className={className}
    />
  );
}

// Crystal/gem icon for amulets (legacy - maps to ring)
export function AmuletIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={AMULET_DATA}
      palette={ITEM_PALETTES.ring}
      size={size}
      color={color}
      className={className}
    />
  );
}

// Book/scroll icon for spells
export function SpellIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={SPELL_DATA}
      palette={ITEM_PALETTES.spell}
      size={size}
      color={color}
      className={className}
    />
  );
}

// Pet/creature icon for companions
export function CompanionIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={COMPANION_DATA}
      palette={ITEM_PALETTES.companion}
      size={size}
      color={color}
      className={className}
    />
  );
}

// Rune/enchantment icon for MCP servers (legacy - maps to trinket)
export function EnchantmentIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={ENCHANTMENT_DATA}
      palette={ITEM_PALETTES.trinket}
      size={size}
      color={color}
      className={className}
    />
  );
}

// Icon components for new WoW-style item types
export function HelmIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={ARMOR_DATA}
      palette={ITEM_PALETTES.helm}
      size={size}
      color={color}
      className={className}
    />
  );
}

export function HooksIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={ARMOR_DATA}
      palette={ITEM_PALETTES.hooks}
      size={size}
      color={color}
      className={className}
    />
  );
}

export function MainhandIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={WEAPON_DATA}
      palette={ITEM_PALETTES.mainhand}
      size={size}
      color={color}
      className={className}
    />
  );
}

export function OffhandIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={ARMOR_DATA}
      palette={ITEM_PALETTES.offhand}
      size={size}
      color={color}
      className={className}
    />
  );
}

export function RingIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={AMULET_DATA}
      palette={ITEM_PALETTES.ring}
      size={size}
      color={color}
      className={className}
    />
  );
}

export function TrinketIcon({ size = 24, color, className }: IconProps) {
  return (
    <PixelIcon
      data={ENCHANTMENT_DATA}
      palette={ITEM_PALETTES.trinket}
      size={size}
      color={color}
      className={className}
    />
  );
}

// Map item type to icon component (simplified)
const ICON_MAP: Record<ItemType, React.FC<IconProps>> = {
  helm: HelmIcon,
  hooks: HooksIcon,
  mainhand: MainhandIcon,
  offhand: OffhandIcon,
  ring: RingIcon,
  spell: SpellIcon,
  companion: CompanionIcon,
  trinket: TrinketIcon,
};

interface ItemIconProps extends IconProps {
  itemType: ItemType;
}

export function ItemIcon({ itemType, ...props }: ItemIconProps) {
  const IconComponent = ICON_MAP[itemType] || SpellIcon;
  return <IconComponent {...props} />;
}
