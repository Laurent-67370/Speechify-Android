import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary React — attrape les erreurs de rendu des enfants
 * et affiche un fallback élégant au lieu de faire planter toute l'app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erreur capturée :', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h2 className="text-xl font-bold text-stone-300 mb-2">Oups, un problème est survenu</h2>
          <p className="text-sm text-stone-500 mb-6 max-w-md">
            Une erreur inattendue s'est produite. Essayez de recharger la page.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-5 py-2.5 bg-[#646cff] hover:bg-[#535bf2] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
