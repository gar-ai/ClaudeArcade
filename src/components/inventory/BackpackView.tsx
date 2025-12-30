import { useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { InventoryCard } from './InventoryCard';
import { FilterBar } from './FilterBar';

export function BackpackView() {
  const inventory = useAppStore((state) => state.inventory);
  const backpackFilter = useAppStore((state) => state.backpackFilter);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const isLoading = useAppStore((state) => state.isLoading);
  const recommendations = useAppStore((state) => state.recommendations);

  // Create a map of item IDs to their recommendations for quick lookup
  const recommendationMap = useMemo(() => {
    const map = new Map<string, typeof recommendations[0]>();
    for (const rec of recommendations) {
      map.set(rec.itemId, rec);
    }
    return map;
  }, [recommendations]);

  const filteredItems = inventory.filter((item) => {
    // Filter by type
    if (backpackFilter !== 'all' && item.itemType !== backpackFilter) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <div className="h-full flex flex-col" style={{ background: '#1a1410' }}>
      {/* Filter Bar */}
      <FilterBar />

      {/* Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div
              className="text-center p-6 rounded-lg"
              style={{
                background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
                border: '2px solid #4a3f32',
              }}
            >
              <div
                className="text-lg mb-2 font-bold animate-pulse"
                style={{ color: '#c9a227' }}
              >
                SCANNING...
              </div>
              <p style={{ color: '#b8a894' }}>Loading inventory</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div
              className="text-center p-6 rounded-lg"
              style={{
                background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
                border: '2px solid #4a3f32',
              }}
            >
              <div className="text-lg mb-2 font-bold" style={{ color: '#c9a227' }}>
                NO RESULTS
              </div>
              <p style={{ color: '#b8a894' }}>No items match your search</p>
              <p className="text-sm mt-2" style={{ color: '#7a6f62' }}>
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : backpackFilter === 'all'
                    ? 'Install some plugins to get started'
                    : `No ${backpackFilter} items available`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredItems.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                recommendation={recommendationMap.get(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
