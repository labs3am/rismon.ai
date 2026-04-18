// Particle background removed per design update.
// Replaced with a solid background matching the dark theme.
export default function ParticleBackground() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: '#0a0a0a' }}
      aria-hidden="true"
    />
  );
}
