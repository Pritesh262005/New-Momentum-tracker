import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="card p-8 max-w-md text-center">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
