import { describe, expect, it } from "vitest";
import { TONS } from "@/components/pagina/Pagina";
import { tomDaCategoria } from "./GuiaMaterialCard";

describe("tomDaCategoria", () => {
  it("usa laranja para resíduos perigosos conforme a CONAMA 275/2001", () => {
    expect(tomDaCategoria("Resíduos perigosos")).toBe("laranja");
  });

  it("reserva roxo para resíduos radioativos", () => {
    expect(tomDaCategoria("Resíduos radioativos")).toBe("roxo");
  });

  it("não associa automaticamente resíduos especiais não padronizados à cor radioativa", () => {
    expect(tomDaCategoria("Eletroeletrônicos e eletrodomésticos")).toBe(
      "cinza"
    );
    expect(
      tomDaCategoria("Pilhas e baterias portáteis versus automotivas")
    ).toBe("cinza");
  });

  it("preserva as cores previstas para os materiais da coleta seletiva", () => {
    expect(tomDaCategoria("Papel e papelão")).toBe("azul");
    expect(tomDaCategoria("Plásticos e embalagens plásticas")).toBe("vermelho");
    expect(tomDaCategoria("Vidro de embalagens")).toBe("verde");
    expect(tomDaCategoria("Metais e latas")).toBe("amarelo");
    expect(tomDaCategoria("Restos alimentares e orgânicos")).toBe("marrom");
  });

  it("define uma paleta visual laranja para a categoria perigosa", () => {
    expect(TONS.laranja).toEqual({
      cor: "#c2410c",
      fundo: "#fff7ed",
      borda: "#fed7aa",
      texto: "#9a3412",
    });
  });
});
