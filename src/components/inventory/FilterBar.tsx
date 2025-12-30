import { useAppStore } from '../../stores/appStore';
import type { BackpackFilter } from '../../types';

// Simplified filters for item types
const FILTERS: { value: BackpackFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'helm', label: 'Memory' },
  { value: 'mainhand', label: 'Plugins' },
  { value: 'hooks', label: 'Hooks' },
  { value: 'ring', label: 'Commands' },
  { value: 'spell', label: 'Skills' },
  { value: 'companion', label: 'Agents' },
  { value: 'trinket', label: 'MCPs' },
];

// Check if a filter matches item type
const filterMatchesItem = (filter: BackpackFilter, itemType: string): boolean => {
  if (filter === 'all') return true;
  // Plugins filter matches both weapon types (mainhand + offhand)
  if (filter === 'mainhand') {
    return ['mainhand', 'offhand'].includes(itemType);
  }
  return itemType === filter;
};

export function FilterBar() {
  const backpackFilter = useAppStore((state) => state.backpackFilter);
  const setBackpackFilter = useAppStore((state) => state.setBackpackFilter);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const inventory = useAppStore((state) => state.inventory);
  const scanInventory = useAppStore((state) => state.scanInventory);
  const isLoading = useAppStore((state) => state.isLoading);

  const getCount = (filter: BackpackFilter): number => {
    if (filter === 'all') return inventory.length;
    return inventory.filter((item) => filterMatchesItem(filter, item.itemType)).length;
  };

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3"
      style={{
        background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
        borderBottom: '2px solid #4a3f32',
      }}
    >
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 rounded text-sm focus:outline-none transition-all"
          style={{
            background: 'linear-gradient(180deg, #1a1410 0%, #2a231c 100%)',
            border: '1px solid #4a3f32',
            color: '#f5e6d3',
          }}
        />
        <button
          onClick={() => scanInventory()}
          disabled={isLoading}
          className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all"
          style={{
            background: isLoading
              ? '#3d3328'
              : 'linear-gradient(180deg, #c9a227 0%, #8b7019 100%)',
            color: isLoading ? '#7a6f62' : '#1a1410',
            border: '1px solid #4a3f32',
            boxShadow: isLoading ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.3)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
          title="Refresh inventory"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setBackpackFilter(filter.value)}
            className="px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{
              background: backpackFilter === filter.value
                ? 'linear-gradient(180deg, #4a3f32 0%, #3d3328 100%)'
                : 'transparent',
              color: backpackFilter === filter.value ? '#c9a227' : '#b8a894',
              border: backpackFilter === filter.value
                ? '1px solid #c9a227'
                : '1px solid transparent',
            }}
          >
            {filter.label}
            <span style={{ color: '#7a6f62', marginLeft: '4px' }}>
              ({getCount(filter.value)})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
