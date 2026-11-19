import React from 'react';
import { AlertTriangleIcon } from './Icons';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
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
            maxWidth: '520px',
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
              background: 'color-mix(in srgb, var(--warning, #f59e0b) 15%, transparent)',
              color: 'var(--warning, #f59e0b)'
            }}>
              <AlertTriangleIcon size={36} />
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.75rem 0', letterSpacing: '-0.5px' }}>
              Something went wrong
            </h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2.2rem', fontSize: '0.95rem' }}>
              An unexpected error occurred while rendering the page. Please reload the application to restore your session.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '0.85rem 1.8rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 6px 18px rgba(109, 82, 233, 0.4)'
                }}
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
