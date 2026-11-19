import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { ShieldIcon } from './Icons';

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleReturn = () => {
    if (user?.role === 'admin') navigate('/admin/dashboard');
    else if (user?.role === 'teamleader') navigate('/teamleader/dashboard');
    else if (user?.role === 'intern') navigate('/intern/dashboard');
    else navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: 'var(--page)',
      color: 'var(--text)',
      fontFamily: 'inherit'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        padding: '2.8rem 2.2rem',
        background: 'var(--card)',
        borderRadius: '24px',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 50px var(--shadow)'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          margin: '0 auto 1.5rem',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: 'color-mix(in srgb, var(--error) 15%, transparent)',
          color: 'var(--error)'
        }}>
          <ShieldIcon size={36} />
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.75rem 0', letterSpacing: '-0.5px' }}>
          Access Denied
        </h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2.2rem', fontSize: '0.95rem' }}>
          You do not have the required permissions to access this page or resource. If you believe this is an error, please contact your portal administrator.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={handleReturn}
            style={{
              padding: '0.85rem 1.8rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.95rem',
              boxShadow: '0 6px 18px rgba(109, 82, 233, 0.4)',
              transition: 'transform 0.15s ease'
            }}
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
