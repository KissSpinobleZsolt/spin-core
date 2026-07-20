// Section heading used inside Card components.
export function SectionTitle({ children }) {
  return (
    <h3 style={{
      color: '#f1f5f9',        // slate-100
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.06em',
      margin: '0 0 12px',
      textTransform: 'uppercase',
    }}>
      {children}
    </h3>
  );
}
