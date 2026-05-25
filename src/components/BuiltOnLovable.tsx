import lovableLogo from '@/assets/logos/lovable.png';

/**
 * "Built on Lovable" badge — links to lovable.dev.
 * Used in the footer, homepage hero, and Promise Audit page so
 * sweepstake judges (and visitors) immediately see Rismon is a
 * Lovable-built product.
 */
export default function BuiltOnLovable({
  variant = 'pill',
}: {
  variant?: 'pill' | 'compact';
}) {
  const compact = variant === 'compact';
  return (
    <a
      href="https://lovable.dev"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Built on Lovable"
      className="inline-flex items-center gap-2 rounded-full transition-colors"
      style={{
        padding: compact ? '4px 10px 4px 6px' : '6px 12px 6px 8px',
        border: '1px solid #1f1f1f',
        background: '#0a0a0a',
        color: '#a3a3a3',
        fontSize: compact ? 11 : 12,
        letterSpacing: '0.02em',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#ffffff';
        e.currentTarget.style.borderColor = '#2a2a2a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#a3a3a3';
        e.currentTarget.style.borderColor = '#1f1f1f';
      }}
    >
      <img
        src={lovableLogo}
        alt=""
        width={compact ? 14 : 16}
        height={compact ? 14 : 16}
        style={{ display: 'block', objectFit: 'contain' }}
        loading="lazy"
      />
      <span>
        Built on <strong style={{ color: '#fff', fontWeight: 600 }}>Lovable</strong>
      </span>
    </a>
  );
}