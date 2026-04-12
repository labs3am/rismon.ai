export default function GlobalBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Grid with dot intersections via SVG */}
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='50' height='50' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='50' height='50' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3Ccircle cx='0' cy='0' r='1' fill='rgba(249,115,22,0.10)'/%3E%3Ccircle cx='50' cy='0' r='1' fill='rgba(249,115,22,0.10)'/%3E%3Ccircle cx='0' cy='50' r='1' fill='rgba(249,115,22,0.10)'/%3E%3Ccircle cx='50' cy='50' r='1' fill='rgba(249,115,22,0.10)'/%3E%3C/svg%3E")`,
        backgroundSize: '50px 50px',
      }} />

      {/* Left edge orange gradient bleed */}
      <div className="absolute inset-y-0 left-0 w-[200px]" style={{
        background: 'linear-gradient(to right, rgba(249,115,22,0.06), transparent)',
      }} />

      {/* Faint vertical edge lines */}
      <div className="absolute inset-y-0 left-0 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="absolute inset-y-0 right-0 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}
