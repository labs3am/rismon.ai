import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ background: '#000000', borderTop: '1px solid #ffffff14', padding: '48px 24px' }}>
      <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-8">
        <div>
          <p style={{ color: '#ffffff', fontWeight: 600, fontSize: 16 }}>Rismon.ai</p>
          <p style={{ color: '#555555', fontSize: 13, marginTop: 8 }}>
            From the house of{' '}
            <a href="https://labs3am.com" target="_blank" rel="noopener noreferrer" style={{ color: '#888888' }} className="hover:underline">Labs3am</a>
          </p>
          <p style={{ color: '#444444', fontSize: 13, marginTop: 16 }}>© 2026 Rismon.ai</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link to="/privacy" style={{ color: '#888888', fontSize: 14, transition: 'color 0.15s ease' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: '#888888', fontSize: 14, transition: 'color 0.15s ease' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Terms of Service</Link>
          <a href="mailto:hello@rismon.ai" style={{ color: '#888888', fontSize: 14, transition: 'color 0.15s ease' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Contact</a>
        </div>
      </div>
    </footer>
  );
}
