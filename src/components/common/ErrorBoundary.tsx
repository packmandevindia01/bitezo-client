import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in [${this.props.name || 'Component'}]:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-amber-200 bg-amber-50 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertCircle size={24} />
          </div>
          <h3 className="mt-4 text-sm font-bold text-amber-900">
            {this.props.name || 'Component'} failed
          </h3>
          <p className="mt-1 text-xs text-amber-600 max-w-[200px]">
            Something went wrong while rendering this section.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-amber-700 active:scale-95"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
