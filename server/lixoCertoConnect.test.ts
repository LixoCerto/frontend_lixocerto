import { createClient, createRouterTransport } from "@connectrpc/connect";
import { describe, expect, it } from "vitest";
import { LixoCertoService } from "../shared/gen/lixo_certo/v1/lixo_certo_pb";
import { registerLixoCertoConnectService } from "./lixoCertoConnect";

const client = createClient(
  LixoCertoService,
  createRouterTransport(registerLixoCertoConnectService),
);

describe("LixoCertoService", () => {
  it("retorna indicadores de impacto e ações do painel", async () => {
    const response = await client.getDashboard({ userId: "demo-user" });

    expect(response.ecoPoints).toBeGreaterThan(0);
    expect(response.quickActions).toHaveLength(3);
    expect(response.dailyTip).toContain("reciclar");
  });

  it("filtra materiais por categoria", async () => {
    const response = await client.listMaterials({
      category: "Eletroeletrônicos",
      query: "",
    });

    expect(response.materials).toHaveLength(1);
    expect(response.materials[0]?.name).toBe("Celular e eletrônicos");
  });

  it("retorna o ponto de coleta demonstrativo", async () => {
    const response = await client.listCollectionPoints({
      city: "João Pessoa",
      materialCategory: "Eletroeletrônicos",
    });

    expect(response.collectionPoints).toHaveLength(1);
    expect(response.collectionPoints[0]?.isVerified).toBe(false);
  });

  it("atribui pontos à resposta correta do quiz", async () => {
    const response = await client.submitQuiz({
      userId: "demo-user",
      questionId: "destino-eletronicos",
      answerId: "reciclagem-eletronicos",
    });

    expect(response.correct).toBe(true);
    expect(response.pointsAwarded).toBe(50);
    expect(response.totalPoints).toBe(1300);
  });

  it("calcula o SUS sem registrar dados quando há consentimento", async () => {
    const response = await client.submitSusEvaluation({
      participantCode: "P-001",
      consented: true,
      answers: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
      notes: "",
    });

    expect(response.accepted).toBe(true);
    expect(response.score).toBe(100);
  });

  it("rejeita submissão SUS sem consentimento", async () => {
    const response = await client.submitSusEvaluation({
      participantCode: "P-002",
      consented: false,
      answers: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
      notes: "",
    });

    expect(response.accepted).toBe(false);
    expect(response.score).toBe(0);
  });
});
