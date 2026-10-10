import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[CampusInsight AI] Render error:', error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0b1120', color: '#f1f5f9',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '2rem', fontFamily: 'monospace'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️ CampusInsight AI</div>
          <div style={{ color: '#f87171', fontSize: '1.1rem', marginBottom: '1rem' }}>
            Something went wrong loading the app.
          </div>
          <pre style={{
            background: '#1e293b', padding: '1rem', borderRadius: '8px',
            maxWidth: '800px', overflow: 'auto', fontSize: '0.8rem', color: '#94a3b8'
          }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.info?.componentStack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem', padding: '0.6rem 1.5rem',
              background: '#0d9488', color: 'white', border: 'none',
              borderRadius: '6px', cursor: 'pointer', fontSize: '1rem'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
