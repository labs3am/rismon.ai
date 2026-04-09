import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  label?: string;
  useHistory?: boolean;
}

export default function BackButton({ to, label = 'Back', useHistory = false }: BackButtonProps) {
  const navigate = useNavigate();

  if (useHistory) {
    return (
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm py-2 mb-6 transition-colors cursor-pointer bg-transparent border-none"
        style={{ color: '#71717a', fontSize: '14px', padding: '8px 0' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.color = '#71717a')}
      >
        <ChevronLeft size={16} />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <Link
      to={to || '/dashboard'}
      className="flex items-center gap-1 text-sm py-2 mb-6 transition-colors"
      style={{ color: '#71717a', fontSize: '14px', padding: '8px 0' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.color = '#71717a')}
    >
      <ChevronLeft size={16} />
      <span>{label}</span>
    </Link>
  );
}
