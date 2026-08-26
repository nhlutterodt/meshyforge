// src/components/common/ErrorBoundary.tsx
// Shared crash-containment boundary. Extracted from the local
// PreviewErrorBoundary that used to live only in AssetPreview3D.tsx, so any
// panel can stop a render-time crash from unmounting the whole app instead
// of just its own subtree. See docs/LESSONS_LEARNED.md for the incident
// (an unwrapped animation-library response) that motivated this.

import { Component } from 'react';

interface ErrorBoundaryProps {
  readonly fallback: React.ReactNode;
  readonly children: React.ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught a render error:', error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
