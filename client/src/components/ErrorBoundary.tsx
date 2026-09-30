import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Detalhes ficam no console para diagnóstico; não são expostos na interface.
    console.error("Erro inesperado na interface do Lixo Certo", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6" role="alert" aria-labelledby="erro-aplicacao-titulo">
          <section className="flex w-full max-w-lg flex-col items-center rounded-2xl border bg-card p-8 text-center shadow-sm">
            <AlertTriangle size={44} className="mb-5 text-destructive" aria-hidden="true" />
            <h1 id="erro-aplicacao-titulo" className="text-xl font-semibold">Ocorreu um erro inesperado</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Não foi possível exibir esta página. Tente carregá-la novamente; se o problema continuar, volte mais tarde.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={cn(
                "mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2",
                "bg-primary text-primary-foreground hover:opacity-90",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              )}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Tentar novamente
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
