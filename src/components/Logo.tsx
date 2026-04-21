import { Link } from 'react-router-dom';

interface Props {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Wordmark "Rismon ai." — the trailing dot is always orange. */
export default function Logo({ to = '/', size = 'md', className = '' }: Props) {
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 28 : 16;

  const inner = (
    <span
      className={className}
      style={{
        fontWeight: 700,
        fontSize,
        letterSpacing: '-0.02em',
        color: '#ffffff',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'baseline',
      }}
    >
      Rismon<span style={{ color: '#f97316' }}>.</span>ai
    </span>
  );

  if (!to) return inner;
  return <Link to={to} aria-label="Rismon ai. — home">{inner}</Link>;
}
