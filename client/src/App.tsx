import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import TelaCarregamento from "./components/TelaCarregamento";
import { ThemeProvider } from "./contexts/ThemeContext";

const ConfirmarEmail = lazy(() => import("@/pages/ConfirmarEmail"));
const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const RedefinirSenha = lazy(() => import("@/pages/RedefinirSenha"));

function Router() {
  return (
    <Suspense fallback={<TelaCarregamento />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/confirmar-email" component={ConfirmarEmail} />
        <Route path="/redefinir-senha" component={RedefinirSenha} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
