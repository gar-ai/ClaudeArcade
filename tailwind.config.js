/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base colors
        'bg-primary': '#0f0f1a',
        'bg-secondary': '#1a1a2e',
        'bg-tertiary': '#252540',
        'text-primary': '#eaeaea',
        'text-secondary': '#a0a0a0',

        // Status colors
        'status-healthy': '#22c55e',
        'status-heavy': '#eab308',
        'status-dumbzone': '#ef4444',

        // Rarity colors
        'rarity-common': '#9ca3af',
        'rarity-uncommon': '#22c55e',
        'rarity-rare': '#3b82f6',
        'rarity-epic': '#a855f7',
        'rarity-legendary': '#f59e0b',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
