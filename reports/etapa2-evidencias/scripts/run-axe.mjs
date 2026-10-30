import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceRoot = path.resolve(here, "..");
const frontendRoot = path.resolve(process.env.FRONTEND_ROOT || path.resolve(here, "../../.."));
const frontendRequire = createRequire(path.join(frontendRoot, "package.json"));
const { chromium } = frontendRequire("@playwright/test");
const baseURL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const reportPath = path.resolve(process.env.A11Y_REPORT_PATH || path.join(evidenceRoot, "raw/axe-wcag22.json"));
const screenshotDir = path.resolve(process.env.A11Y_SCREENSHOT_DIR || path.join(evidenceRoot, "raw/axe-screenshots"));
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || undefined;
if (!email || !password) throw new Error("Defina credenciais fictícias locais em E2E_USER_EMAIL/E2E_USER_PASSWORD.");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const scans = [];
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"];

async function capture(name) {
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true, animations: "disabled" });
}

async function scan(name) {
  await page.waitForTimeout(250);
  const result = await new AxeBuilder({ page }).withTags(tags).analyze();
  scans.push({
    page: name,
    url: page.url(),
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map((n) => ({ target: n.target, failureSummary: n.failureSummary })),
    })),
    violationCount: result.violations.length,
    affectedNodeCount: result.violations.reduce((sum, v) => sum + v.nodes.length, 0),
    passes: result.passes.length,
    incomplete: result.incomplete.length,
    incompleteRules: result.incomplete.map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.map((n) => n.target) })),
  });
  await capture(name);
}

try {
  await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Que bom ver você!" }).waitFor({ state: "visible" });
  await scan("login");

  await page.goto(`${baseURL}/confirmar-email?email=auditoria%40exemplo.test`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Confirme seu e-mail" }).waitFor({ state: "visible" });
  await scan("confirmacao-email");

  await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/$/);
  const welcome = page.getByRole("heading", { name: "Boas-vindas ao Lixo Certo!" });
  const homeHeading = page.getByRole("heading", { name: "O que você vai descartar hoje?" });
  await page.waitForFunction(() => document.body.innerText.includes("Boas-vindas ao Lixo Certo!") || document.body.innerText.includes("O que você vai descartar hoje?"), { timeout: 20_000 });
  if (await welcome.isVisible().catch(() => false)) {
    const skip = page.getByRole("button", { name: "Pular por agora" });
    if (await skip.count()) await skip.click();
  }
  await homeHeading.waitFor({ state: "visible", timeout: 20_000 });
  await scan("visao-geral");

  const menu = page.getByRole("navigation", { name: "Áreas disponíveis" });
  await menu.getByRole("button", { name: /Guia de descarte/ }).click();
  await page.getByRole("heading", { name: "Guia de descarte", level: 1 }).waitFor({ state: "visible" });
  const guideForm = page.locator('form[data-onboarding-action="buscar_guia"]');
  await guideForm.getByLabel("Buscar material pelo nome ou categoria").fill("Papelão");
  await guideForm.getByRole("button", { name: "Buscar", exact: true }).click();
  const material = page.getByRole("article").filter({ hasText: "Papel e papelão secos para coleta seletiva" });
  await material.waitFor({ state: "visible" });
  await page.locator("article details summary").first().click();
  await scan("guia");

  await menu.getByRole("button", { name: /Pontos de coleta/ }).click();
  const pointsForm = page.locator('form[data-onboarding-action="pesquisar_pontos"]');
  await pointsForm.getByLabel("Cidade").fill("João Pessoa");
  await pointsForm.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("heading", { name: "EMLUR — recebimento de resíduos eletrônicos" }).waitFor({ state: "visible" });
  await scan("pontos");

  await menu.getByRole("button", { name: /Quiz e questionários/ }).click();
  await page.locator("#painel-quiz article").first().waitFor({ state: "visible", timeout: 15_000 });
  await scan("quiz");

  await menu.getByRole("button", { name: /Pontos de coleta/ }).click();
  const pointsFormAgain = page.locator('form[data-onboarding-action="pesquisar_pontos"]');
  await pointsFormAgain.getByLabel("Cidade").fill("João Pessoa");
  await pointsFormAgain.getByRole("button", { name: "Buscar", exact: true }).click();
  const pointCard = page.getByRole("article").filter({ hasText: "EMLUR — recebimento de resíduos eletrônicos" });
  await pointCard.getByRole("button", { name: /Iniciar descarte/ }).click();
  const checkin = page.getByRole("region", { name: "Registros de descarte" });
  await checkin.getByText("Destino selecionado: EMLUR — recebimento de resíduos eletrônicos.").waitFor({ state: "visible", timeout: 10_000 });
  await scan("checkin");

  const summary = {
    generatedAt: new Date().toISOString(),
    tool: "axe-core / @axe-core/playwright",
    standard: "WCAG 2.2 A/AA (inclui tags WCAG 2.0/2.1 e best-practice)",
    environment: { browser: await browser.version(), viewport: "1280x900 CSS px", origin: new URL(baseURL).origin },
    scans,
  };
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(scans.map((s) => ({ page: s.page, violations: s.violationCount, affectedNodes: s.affectedNodeCount, passingRuleResults: s.passes, incompleteRuleResults: s.incomplete }))));
} finally {
  await browser.close();
}
