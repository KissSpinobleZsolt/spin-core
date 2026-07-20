// Shared card wrapper: slate-800 surface with slate-700 border, rounded corners.
export function Card({ children }) {
  return (
    <div style={{
      background: '#1e293b',   // slate-800
      border: '1px solid #334155', // slate-700
      borderRadius: '12px',
      padding: '20px 24px',
    }}>
      {children}
    </div>
  );
}
