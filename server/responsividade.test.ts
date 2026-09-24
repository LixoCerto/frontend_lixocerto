import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../client/src/components/AppShell.tsx", import.meta.url), "utf8");

describe("estrutura responsiva do painel", () => {
  it("mantém menu móvel fechado por padrão e aberto por estado", () => {
    expect(css).toContain(".app-sidebar--open");
    expect(css).toContain("transform: translateX(-103%)");
    expect(shell).toContain("setAberto(true)");
    expect(shell).toContain("aria-label=\"Abrir menu\"");
  });

  it("define a transição para sidebar fixa em desktop", () => {
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain(".app-sidebar { transform: translateX(0); }");
    expect(css).toContain(".app-main { margin-left: 288px; }");
  });

  it("preserva controles navegáveis no shell", () => {
    expect(shell).toContain("aria-label=\"Navegação principal\"");
    expect(shell).toContain("aria-label=\"Notificações\"");
    expect(shell).toContain("lg:hidden");
  });
});
