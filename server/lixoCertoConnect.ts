import { create } from "@bufbuild/protobuf";
import type { ConnectRouter, ServiceImpl } from "@connectrpc/connect";
import {
  CollectionPointSchema,
  DashboardActionSchema,
  GetDashboardResponseSchema,
  LixoCertoService,
  ListCollectionPointsResponseSchema,
  ListMaterialsResponseSchema,
  MaterialSchema,
  SubmitQuizResponseSchema,
  SubmitSusEvaluationResponseSchema,
} from "../shared/gen/lixo_certo/v1/lixo_certo_pb";

const materials = [
  {
    id: "e-waste",
    name: "Celular e eletrônicos",
    category: "Eletroeletrônicos",
    disposalInstruction: "Entregue em ponto de coleta de lixo eletrônico. Não descarte no lixo comum.",
    icon: "smartphone",
    impactNote: "Baterias e componentes podem liberar substâncias tóxicas no solo.",
  },
  {
    id: "paper",
    name: "Papel e papelão",
    category: "Recicláveis",
    disposalInstruction: "Mantenha limpo e seco antes de encaminhar à coleta seletiva.",
    icon: "file-text",
    impactNote: "A reciclagem reduz o consumo de matéria-prima e água.",
  },
  {
    id: "glass",
    name: "Vidro",
    category: "Recicláveis",
    disposalInstruction: "Separe por segurança e entregue na coleta seletiva ou ecoponto.",
    icon: "glass-water",
    impactNote: "O vidro pode ser reciclado diversas vezes.",
  },
  {
    id: "organic",
    name: "Resíduos orgânicos",
    category: "Orgânicos",
    disposalInstruction: "Priorize compostagem doméstica ou comunitária quando possível.",
    icon: "leaf",
    impactNote: "A compostagem evita emissões associadas ao descarte em aterros.",
  },
];

const collectionPoints = [
  {
    id: 1,
    name: "Ecoponto Lixo Certo — demonstração",
    address: "Cadastro de ponto real pendente de validação institucional",
    city: "João Pessoa",
    acceptedCategories: ["Eletroeletrônicos", "Pilhas e baterias"],
    isVerified: false,
  },
];

function calculateSusScore(answers: number[]): number {
  const rawScore = answers.reduce((total, answer, index) => {
    return total + (index % 2 === 0 ? answer - 1 : 5 - answer);
  }, 0);
  return Math.round(rawScore * 2.5);
}

const serviceImplementation: ServiceImpl<typeof LixoCertoService> = {
  async getDashboard() {
    return create(GetDashboardResponseSchema, {
      greeting: "Bom dia! Vamos cuidar do planeta?",
      ecoPoints: 1250,
      currentStreak: 7,
      badgesUnlocked: 8,
      dailyTip: "Antes de reciclar, reduza e reutilize. A melhor embalagem é a que não vira resíduo.",
      quickActions: [
        create(DashboardActionSchema, {
          id: "quiz",
          label: "Quiz ambiental",
          description: "Teste seus conhecimentos e ganhe pontos.",
          icon: "circle-help",
        }),
        create(DashboardActionSchema, {
          id: "guide",
          label: "Guia de descarte",
          description: "Descubra o destino correto de cada material.",
          icon: "map-pinned",
        }),
        create(DashboardActionSchema, {
          id: "challenge",
          label: "Desafio da semana",
          description: "Registre uma ação sustentável hoje.",
          icon: "trophy",
        }),
      ],
    });
  },

  async listMaterials(request) {
    const normalizedQuery = request.query.trim().toLocaleLowerCase("pt-BR");
    const normalizedCategory = request.category.trim().toLocaleLowerCase("pt-BR");
    const filtered = materials.filter(material => {
      const matchesQuery = !normalizedQuery || [material.name, material.category, material.disposalInstruction]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedQuery);
      const matchesCategory = !normalizedCategory || material.category.toLocaleLowerCase("pt-BR") === normalizedCategory;
      return matchesQuery && matchesCategory;
    });

    return create(ListMaterialsResponseSchema, {
      materials: filtered.map(material => create(MaterialSchema, material)),
    });
  },

  async listCollectionPoints(request) {
    const city = request.city.trim().toLocaleLowerCase("pt-BR");
    const category = request.materialCategory.trim().toLocaleLowerCase("pt-BR");
    const filtered = collectionPoints.filter(point => {
      const matchesCity = !city || point.city.toLocaleLowerCase("pt-BR") === city;
      const matchesCategory = !category || point.acceptedCategories.some(item => item.toLocaleLowerCase("pt-BR").includes(category));
      return matchesCity && matchesCategory;
    });

    return create(ListCollectionPointsResponseSchema, {
      collectionPoints: filtered.map(point => create(CollectionPointSchema, point)),
    });
  },

  async submitQuiz(request) {
    const correct = request.answerId === "reciclagem-eletronicos";
    const pointsAwarded = correct ? 50 : 0;
    return create(SubmitQuizResponseSchema, {
      correct,
      pointsAwarded,
      totalPoints: correct ? 1300 : 1250,
      explanation: correct
        ? "Correto. Eletrônicos devem seguir para pontos de coleta especializados, nunca para o lixo comum."
        : "Quase! Pilhas, baterias e equipamentos eletrônicos devem seguir para pontos de coleta especializados.",
    });
  },

  async submitSusEvaluation(request) {
    const hasValidAnswers = request.answers.length === 10 && request.answers.every(answer => answer >= 1 && answer <= 5);
    if (!request.consented) {
      return create(SubmitSusEvaluationResponseSchema, {
        accepted: false,
        score: 0,
        message: "A resposta não foi aceita porque o consentimento não foi registrado.",
      });
    }
    if (!hasValidAnswers) {
      return create(SubmitSusEvaluationResponseSchema, {
        accepted: false,
        score: 0,
        message: "A escala SUS exige dez respostas, com valores entre 1 e 5.",
      });
    }

    return create(SubmitSusEvaluationResponseSchema, {
      accepted: true,
      score: calculateSusScore([...request.answers]),
      message: "Escore calculado para conferência. O MVP não armazena respostas de participantes até a aprovação do protocolo de pesquisa.",
    });
  },
};

export function registerLixoCertoConnectService(router: ConnectRouter): void {
  router.service(LixoCertoService, serviceImplementation);
}
