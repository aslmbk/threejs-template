import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Top-level boundary for the scene. Errors thrown while mounting reach the
 * nearest boundary — including the ones from inside `useEffect`, which is where
 * the engine is built. Bringing up a GPU backend can fail outright (no adapter,
 * a blocklisted driver, too many live contexts) and the renderer only reports
 * that asynchronously, so `App` turns the rejection into a render-time throw.
 * Without a boundary React unmounts the whole tree and leaves a blank page with
 * nothing to explain it.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;

    return (
      <div className="App-error" role="alert">
        <h1>Could not start the 3D scene</h1>
        <p>
          This usually means neither WebGPU nor WebGL2 is available or enabled
          here.
        </p>
        <pre>{error.message}</pre>
      </div>
    );
  }
}
