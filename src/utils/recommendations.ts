import type { InventoryItem, Equipment } from '../types';

export interface ProjectInfo {
  frameworks: string[];
  languages: string[];
  hasTests: boolean;
  packageManager: string | null;
  hasTypescript: boolean;
  hasEslint: boolean;
  hasPrettier: boolean;
}

export interface Recommendation {
  itemId: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

// Plugin mappings - which plugins are recommended for which frameworks/languages
const FRAMEWORK_PLUGINS: Record<string, string[]> = {
  react: ['typescript-lsp@claude-plugins-official', 'eslint-plugin@claude-plugins-official'],
  nextjs: ['typescript-lsp@claude-plugins-official', 'eslint-plugin@claude-plugins-official'],
  vue: ['typescript-lsp@claude-plugins-official'],
  angular: ['typescript-lsp@claude-plugins-official'],
  svelte: ['typescript-lsp@claude-plugins-official'],
  tailwind: [],
  express: ['typescript-lsp@claude-plugins-official'],
  rust: ['rust-analyzer-lsp@claude-plugins-official'],
  django: ['pyright-lsp@claude-plugins-official'],
  flask: ['pyright-lsp@claude-plugins-official'],
  fastapi: ['pyright-lsp@claude-plugins-official'],
};

const LANGUAGE_PLUGINS: Record<string, string[]> = {
  typescript: ['typescript-lsp@claude-plugins-official'],
  javascript: ['typescript-lsp@claude-plugins-official'],
  python: ['pyright-lsp@claude-plugins-official'],
  rust: ['rust-analyzer-lsp@claude-plugins-official'],
  go: ['gopls-lsp@claude-plugins-official'],
};

export function getRecommendations(
  projectInfo: ProjectInfo | null,
  inventory: InventoryItem[],
  equipment: Equipment
): Recommendation[] {
  if (!projectInfo) return [];

  const recommendations: Recommendation[] = [];
  const equippedIds = getEquippedIds(equipment);

  // Framework-based recommendations
  for (const framework of projectInfo.frameworks) {
    const plugins = FRAMEWORK_PLUGINS[framework.toLowerCase()] || [];
    for (const pluginId of plugins) {
      if (!equippedIds.has(pluginId)) {
        const item = inventory.find((i) => i.id === pluginId);
        if (item) {
          recommendations.push({
            itemId: pluginId,
            reason: `Recommended for ${framework} projects`,
            confidence: 'high',
          });
        }
      }
    }
  }

  // Language-based recommendations
  for (const language of projectInfo.languages) {
    const plugins = LANGUAGE_PLUGINS[language.toLowerCase()] || [];
    for (const pluginId of plugins) {
      if (!equippedIds.has(pluginId) && !recommendations.find((r) => r.itemId === pluginId)) {
        const item = inventory.find((i) => i.id === pluginId);
        if (item) {
          recommendations.push({
            itemId: pluginId,
            reason: `Recommended for ${language} development`,
            confidence: 'medium',
          });
        }
      }
    }
  }

  // TypeScript recommendation
  if (projectInfo.hasTypescript && !equippedIds.has('typescript-lsp@claude-plugins-official')) {
    const item = inventory.find((i) => i.id === 'typescript-lsp@claude-plugins-official');
    if (item && !recommendations.find((r) => r.itemId === item.id)) {
      recommendations.push({
        itemId: item.id,
        reason: 'TypeScript detected in project',
        confidence: 'high',
      });
    }
  }

  return recommendations;
}

function getEquippedIds(equipment: Equipment): Set<string> {
  const ids = new Set<string>();

  // Single slots
  if (equipment.helm) ids.add(equipment.helm.id);
  if (equipment.mainhand) ids.add(equipment.mainhand.id);
  if (equipment.offhand) ids.add(equipment.offhand.id);

  // Array slots
  equipment.hooks.forEach((h) => ids.add(h.id));
  equipment.rings.forEach((r) => ids.add(r.id));
  equipment.spellbook.forEach((s) => ids.add(s.id));
  equipment.companions.forEach((c) => ids.add(c.id));
  equipment.trinkets.forEach((t) => ids.add(t.id));

  return ids;
}

export function getContextForecast(
  currentTokens: number,
  itemTokenWeight: number,
  totalBudget: number
): { newTotal: number; newPercentage: number; warning: string | null } {
  const newTotal = currentTokens + itemTokenWeight;
  const newPercentage = (newTotal / totalBudget) * 100;

  let warning: string | null = null;
  if (newPercentage >= 50) {
    warning = 'Equipping this will enter the dumbzone (>50%)';
  } else if (newPercentage >= 25) {
    warning = 'Context load will be heavy (>25%)';
  }

  return { newTotal, newPercentage, warning };
}

export function detectConflicts(
  item: InventoryItem,
  equipment: Equipment,
  _inventory: InventoryItem[] // Reserved for future conflict detection
): string[] {
  const conflicts: string[] = [];

  // Get all equipped items
  const allEquipped = [
    equipment.helm,
    equipment.mainhand,
    equipment.offhand,
    ...equipment.hooks,
    ...equipment.rings,
    ...equipment.spellbook,
    ...equipment.companions,
    ...equipment.trinkets,
  ].filter(Boolean);

  // Check for multiple formatters
  const isFormatter =
    item.name.toLowerCase().includes('prettier') ||
    item.name.toLowerCase().includes('format');

  if (isFormatter) {
    const equippedFormatters = allEquipped.filter(
      (i) =>
        i!.name.toLowerCase().includes('prettier') || i!.name.toLowerCase().includes('format')
    );

    if (equippedFormatters.length > 0) {
      conflicts.push(`May conflict with ${equippedFormatters[0]!.name} (multiple formatters)`);
    }
  }

  // Check for multiple linters of same type
  const isLinter = item.name.toLowerCase().includes('lint') || item.name.toLowerCase().includes('eslint');

  if (isLinter) {
    const equippedLinters = allEquipped.filter(
      (i) => i!.name.toLowerCase().includes('lint') || i!.name.toLowerCase().includes('eslint')
    );

    if (equippedLinters.length > 0) {
      conflicts.push(`May conflict with ${equippedLinters[0]!.name} (multiple linters)`);
    }
  }

  return conflicts;
}
