import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startFlow } from "lighthouse";

const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceRoot = path.resolve(here, "..");
const require = createRequire(path.join(here, "package.json"));
const puppeteer = require("puppeteer-core");
const baseURL = process.env.LHR_BASE_URL || "http://127.0.0.1:3000";
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const runId = process.env.LHR_RUN_ID || "1";
const outputDir = path.resolve(process.env.LHR_OUTPUT_DIR || path.join(evidenceRoot, "raw"));
const chromePath = process.env.CHROME_PATH || undefined;
if (!email || !password) throw new Error("Defina credenciais fictícias locais em E2E_USER_EMAIL/E2E_USER_PASSWORD.");
fs.mkdirSync(outputDir, { recursive: true });

const throttling = {
  rttMs: 150,
  throughputKbps: 1638.4,
  requestLatencyMs: 562.5,
  downloadThroughputKbps: 1474.56,
  uploadThroughputKbps: 675,
  cpuSlowdownMultiplier: 4,
};
const screenEmulation = { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false };
const browser = await puppeteer.launch({ ...(chromePath ? { executablePath: chromePath } : {}), headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

async function clickButtonContaining(page, text) {
  async function clickVisibleMatch() {
    for (const button of await page.$$("button")) {
      const match = await button.evaluate((el, expected) => {
        const style = getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && el.getClientRects().length > 0 && (el.innerText || "").trim().includes(expected);
      }, text);
      if (match) { await button.click(); return true; }
    }
    return false;
  }
  if (await clickVisibleMatch()) return;
  const openMenu = await page.$('button[aria-label="Abrir menu de navegação"]');
  if (openMenu) {
    await openMenu.click();
    await page.waitForSelector('#navegacao-principal[role="dialog"]', { visible: true, timeout: 5000 });
    if (await clickVisibleMatch()) return;
  }
  throw new Error(`Botão não encontrado: ${text}`);
}

async function fillInput(page, selector, value) {
  await page.waitForSelector(selector, { visible: true, timeout: 15_000 });
  await page.click(selector);
  await page.type(selector, value, { delay: 4 });
}

async function waitForText(page, text, timeout = 15_000) {
  await page.waitForFunction((expected) => document.body.innerText.includes(expected), { timeout }, text);
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const flow = await startFlow(page, {
    name: "Lixo Certo — jornada principal móvel",
    flags: { onlyCategories: ["performance"], formFactor: "mobile", throttlingMethod: "simulate", throttling, screenEmulation },
  });

  await flow.navigate(`${baseURL}/login`, { name: "Navegação: login" });
  await page.waitForSelector("#login-email", { visible: true, timeout: 15_000 });

  await flow.startTimespan({ name: "Interação: autenticação e primeiro acesso" });
  await fillInput(page, "#login-email", email);
  await fillInput(page, "#login-senha", password);
  await page.click('form button[type="submit"]');
  await page.waitForFunction(() => document.body.innerText.includes("O que você vai descartar hoje?") || document.body.innerText.includes("Boas-vindas ao Lixo Certo!"), { timeout: 20_000 });
  for (const button of await page.$$("button")) {
    if ((await button.evaluate((el) => el.innerText || "")).trim().includes("Pular por agora")) { await button.click(); break; }
  }
  await waitForText(page, "O que você vai descartar hoje?", 20_000);
  await flow.endTimespan();
  await flow.snapshot({ name: "Tela: visão geral" });

  await flow.startTimespan({ name: "Interação: busca no Guia" });
  await clickButtonContaining(page, "Guia de descarte");
  await waitForText(page, "Guia de descarte");
  await fillInput(page, 'form[data-onboarding-action="buscar_guia"] input', "Papelão");
  await page.click('form[data-onboarding-action="buscar_guia"] button');
  await waitForText(page, "Papel e papelão secos para coleta seletiva");
  await flow.endTimespan();
  await flow.snapshot({ name: "Tela: Guia de descarte" });

  await flow.startTimespan({ name: "Interação: busca de ponto de coleta" });
  await clickButtonContaining(page, "Pontos de coleta");
  await fillInput(page, 'form[data-onboarding-action="pesquisar_pontos"] input', "João Pessoa");
  await page.click('form[data-onboarding-action="pesquisar_pontos"] button');
  await waitForText(page, "EMLUR — recebimento de resíduos eletrônicos");
  await flow.endTimespan();
  await flow.snapshot({ name: "Tela: pontos de coleta" });

  await flow.startTimespan({ name: "Interação: abertura do Quiz" });
  await clickButtonContaining(page, "Quiz e questionários");
  await page.waitForSelector("#painel-quiz article", { visible: true, timeout: 15_000 });
  await flow.endTimespan();
  await flow.snapshot({ name: "Tela: Quiz" });

  await flow.startTimespan({ name: "Interação: início do check-in" });
  await clickButtonContaining(page, "Pontos de coleta");
  await fillInput(page, 'form[data-onboarding-action="pesquisar_pontos"] input', "João Pessoa");
  await page.click('form[data-onboarding-action="pesquisar_pontos"] button');
  await waitForText(page, "EMLUR — recebimento de resíduos eletrônicos");
  let started = false;
  for (const card of await page.$$("article")) {
    if (!(await card.evaluate((el) => el.innerText || "")).includes("EMLUR — recebimento de resíduos eletrônicos")) continue;
    for (const control of await card.$$("button")) {
      if ((await control.evaluate((el) => el.innerText || "")).trim().includes("Iniciar descarte")) { await control.click(); started = true; break; }
    }
    if (started) break;
  }
  if (!started) throw new Error("Ação de iniciar descarte não encontrada no cartão do ponto.");
  await waitForText(page, "Destino selecionado: EMLUR — recebimento de resíduos eletrônicos.");
  await flow.endTimespan();
  await flow.snapshot({ name: "Tela: check-in" });

  const result = await flow.createFlowResult();
  const steps = (result.steps || []).map((step) => {
    const audits = step.lhr?.audits || {};
    const metric = (id) => audits[id]?.numericValue ?? null;
    const score = step.lhr?.categories?.performance?.score;
    return {
      name: step.name || step.stepName || "",
      type: step.type || "",
      performanceScore: score == null ? null : Math.round(score * 100),
      lcpMs: metric("largest-contentful-paint"),
      inpMs: metric("interaction-to-next-paint"),
      cls: metric("cumulative-layout-shift"),
      fcpMs: metric("first-contentful-paint"),
      tbtMs: metric("total-blocking-time"),
      speedIndexMs: metric("speed-index"),
    };
  });
  const summary = {
    generatedAt: new Date().toISOString(),
    tool: "Lighthouse User Flow 13.6.0",
    environment: {
      browser: await browser.version(),
      device: "emulação móvel, viewport 390×844 CSS px, DPR 1",
      network: "throttling simulado: RTT 150 ms; throughput 1.638,4 Kbps; download 1.474,56 Kbps; upload 675 Kbps; CPU ×4",
      origin: new URL(baseURL).origin,
      note: "Medições de laboratório; não representam dados de campo/CrUX.",
    },
    steps,
  };
  const stem = `lighthouse-run-${runId}`;
  fs.writeFileSync(path.join(outputDir, `${stem}.json`), JSON.stringify(summary, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, `${stem}.html`), await flow.generateReport());
  console.log(JSON.stringify(summary));
  flow.dispose();
} finally {
  await browser.close();
}
