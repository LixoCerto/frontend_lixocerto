import { describe, expect, it } from "vitest";
import { ITENS_NAVEGACAO, obterNavegacaoPermitida } from "@shared/permissoes";
import {
  acaoOnboardingFoiConcluida,
  concluirOnboarding,
  obterChaveOnboarding,
  obterPassosOnboarding,
  obterTarefasObrigatoriasOnboarding,
  onboardingFoiConcluido,
  marcarAcaoOnboardingConcluida,
  termosOnboardingEquivalentes,
  type AcaoOnboarding,
  type ArmazenamentoOnboarding,
} from "@/lib/onboarding";

function criarArmazenamento(): ArmazenamentoOnboarding & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem(chave) {
      return dados.get(chave) ?? null;
    },
    setItem(chave, valor) {
      dados.set(chave, valor);
    },
  };
}

describe("passo a passo obrigatório de primeiro acesso", () => {
  it("adapta a ajuda às áreas do usuário comum e não mostra administração", () => {
    const passos = obterPassosOnboarding(obterNavegacaoPermitida(["usuario"]), [
      "materiais:ler",
      "pontos_coleta:ler",
      "questionarios:responder",
      "gamificacao:ler",
      "gamificacao:participar",
      "avaliacao_usabilidade:enviar",
    ]);

    expect(passos.map(passo => passo.area)).toEqual([
      "inicio",
      "materiais",
      "pontos",
      "questionarios",
      "desafios",
      "pesquisa",
      "perfil",
    ]);
    expect(passos.map(passo => passo.area)).not.toContain("administracao");
  });

  it("exige buscas reais e navegação segura sem responder quiz ou enviar localização", () => {
    const tarefas = obterTarefasObrigatoriasOnboarding(obterNavegacaoPermitida(["usuario"]));
    expect(tarefas.map(tarefa => tarefa.acao)).toEqual([
      "buscar_inicio",
      "buscar_guia",
      "pesquisar_pontos",
    ]);
    expect(tarefas.find(tarefa => tarefa.acao === "pesquisar_pontos")?.instrucao).toContain("não solicita nem usa sua localização exata");
  });

  it("considera equivalentes termos com variação de acento, caixa e espaços", () => {
    expect(termosOnboardingEquivalentes("  Café ", "cafe")).toBe(true);
    expect(termosOnboardingEquivalentes("Papel", " papel ")).toBe(true);
    expect(termosOnboardingEquivalentes("Papel", "papelão")).toBe(false);
    expect(termosOnboardingEquivalentes("", "cafe")).toBe(false);
  });

  it("inclui apenas tarefas acessíveis quando o perfil não dispõe de todas as áreas", () => {
    const tarefas = obterTarefasObrigatoriasOnboarding(ITENS_NAVEGACAO.filter(item => item.id !== "pontos"));
    expect(tarefas.map(tarefa => tarefa.acao)).toEqual(["buscar_inicio", "buscar_guia"]);
  });

  it("mantém o progresso separado por usuário e usa nova versão obrigatória após a atualização", () => {
    const armazenamento = criarArmazenamento();
    expect(obterChaveOnboarding("usuario-1")).toContain(":v2:");
    expect(obterChaveOnboarding("usuario-1")).not.toBe(obterChaveOnboarding("usuario-2"));
    expect(onboardingFoiConcluido(armazenamento, "usuario-1")).toBe(false);

    marcarAcaoOnboardingConcluida(armazenamento, "usuario-1", "buscar_inicio");
    expect(acaoOnboardingFoiConcluida(armazenamento, "usuario-1", "buscar_inicio")).toBe(true);
    expect(acaoOnboardingFoiConcluida(armazenamento, "usuario-1", "buscar_guia")).toBe(false);
    expect(acaoOnboardingFoiConcluida(armazenamento, "usuario-2", "buscar_inicio")).toBe(false);
    expect(onboardingFoiConcluido(armazenamento, "usuario-1")).toBe(false);

    concluirOnboarding(armazenamento, "usuario-1");
    expect(onboardingFoiConcluido(armazenamento, "usuario-1")).toBe(true);
  });

  it("não impede o uso se o navegador bloquear localStorage", () => {
    const armazenamentoBloqueado: ArmazenamentoOnboarding = {
      getItem() { throw new Error("storage indisponível"); },
      setItem() { throw new Error("storage indisponível"); },
    };

    expect(onboardingFoiConcluido(armazenamentoBloqueado, "usuario-1")).toBe(false);
    expect(acaoOnboardingFoiConcluida(armazenamentoBloqueado, "usuario-1", "buscar_inicio")).toBe(false);
    expect(() => marcarAcaoOnboardingConcluida(armazenamentoBloqueado, "usuario-1", "buscar_inicio" as AcaoOnboarding)).not.toThrow();
    expect(() => concluirOnboarding(armazenamentoBloqueado, "usuario-1")).not.toThrow();
  });
});
