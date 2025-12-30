export function CharacterCard() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar Frame - Fantasy styled */}
      <div
        className="w-24 h-24 rounded-lg flex items-center justify-center p-1"
        style={{
          background: 'linear-gradient(135deg, #c9a227 0%, #8b7019 100%)',
          boxShadow: '0 0 16px rgba(201, 162, 39, 0.3), inset 0 0 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          className="w-full h-full rounded flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #3d3328 0%, #1a1410 100%)',
            border: '2px solid #4a3f32',
          }}
        >
          <span
            className="text-3xl font-bold"
            style={{
              color: '#c9a227',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            C
          </span>
        </div>
      </div>

      {/* Name & Title */}
      <div className="text-center">
        <h2 className="fantasy-title text-lg">Claude</h2>
        <p
          className="text-sm font-medium"
          style={{ color: '#b8a894' }}
        >
          Code Mage
        </p>
      </div>
    </div>
  );
}
