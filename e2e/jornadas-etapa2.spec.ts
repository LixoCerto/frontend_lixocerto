import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const emailTeste = process.env.E2E_USER_EMAIL;
const senhaTeste = process.env.E2E_USER_PASSWORD;
const emailLegado = process.env.E2E_LEGACY_USER_EMAIL;
const senhaLegada = process.env.E2E_LEGACY_USER_PASSWORD;
const screenshotDir = process.env.E2E_SCREENSHOT_DIR || "/tmp/lcr-stage2-screenshots";
mkdirSync(screenshotDir, { recursive: true });

async function capturar(page: Page, nome: string): Promise<void> {
  await page.screenshot({ path: join(screenshotDir, nome), fullPage: false, animations: "disabled" });
}

async function entrar(page: Page, pularOnboarding = true): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(emailTeste!);
  await page.locator("#login-senha").fill(senhaTeste!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  const boasVindas = page.getByRole("heading", { name: "Boas-vindas ao Lixo Certo!" });
  await expect(boasVindas).toBeVisible({ timeout: 20_000 });
  const pular = page.getByRole("button", { name: "Pular por agora" });
  if (pularOnboarding && await pular.count()) await pular.click();
  await expect(page.getByRole("heading", { name: "O que você vai descartar hoje?" })).toBeVisible({ timeout: 20_000 });
}

async function abrirNavegacao(page: Page, rotulo: RegExp): Promise<void> {
  const menu = page.getByRole("navigation", { name: "Áreas disponíveis" });
  await menu.getByRole("button", { name: rotulo }).click();
}

async function buscarPontoEmlur(page: Page): Promise<void> {
  const form = page.locator('form[data-onboarding-action="pesquisar_pontos"]');
  await form.getByLabel("Cidade").fill("João Pessoa");
  await form.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("EMLUR — recebimento de resíduos eletrônicos", { exact: true })).toBeVisible({ timeout: 15_000 });
}

test.describe("Prioridade 2 — jornadas principais de ponta a ponta", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);
  test.skip(!emailTeste || !senhaTeste, "Configure credenciais fictícias exclusivas de E2E.");
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 960 });
  });

  test("cadastro, login e onboarding do primeiro acesso", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Que bom ver você!" })).toBeVisible();
    await capturar(page, "00-login.png");

    await page.getByRole("tab", { name: "Criar conta" }).click();
    const emailCadastro = `cadastro-${Date.now()}@exemplo.test`;
    const senhaCadastro = `E2eCadastro${Date.now()}A9!`;
    await page.getByLabel("Nome completo").fill("Pessoa Fictícia de Teste");
    await page.getByLabel("E-mail").fill(emailCadastro);
    await page.locator("#login-senha").fill(senhaCadastro);
    await page.locator("#login-confirmacao").fill(senhaCadastro);
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page).toHaveURL(/\/confirmar-email\?email=/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Confirme seu e-mail" })).toBeVisible();
    await capturar(page, "01-confirmacao-email.png");

    // O cadastro acima usa email .test e o provedor da API está em modo log; não há envio externo.
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(emailTeste!);
    await page.locator("#login-senha").fill(senhaTeste!);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Boas-vindas ao Lixo Certo!" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Começar missões" }).click();
    await expect(page.getByRole("heading", { name: "Faça sua primeira busca" })).toBeVisible();
    await page.getByRole("button", { name: "Ir para a missão" }).click();
    await page.getByLabel("Buscar material").fill("Papelão");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Pesquise novamente no Guia" })).toBeVisible();
    await page.getByRole("button", { name: "Ir para a missão" }).click();
    const buscaGuia = page.locator('form[data-onboarding-action="buscar_guia"]');
    await buscaGuia.getByLabel("Buscar material pelo nome ou categoria").fill("Papel");
    await buscaGuia.getByRole("button", { name: "Buscar", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Pesquise pontos por cidade" })).toBeVisible();
    await page.getByRole("button", { name: "Ir para a missão" }).click();
    await buscarPontoEmlur(page);

    await expect(page.getByRole("heading", { name: "Plataforma desbloqueada!" })).toBeVisible();
    await page.getByRole("button", { name: "Explorar a plataforma" }).click();
    await abrirNavegacao(page, /Visão geral/);
    await expect(page.getByRole("heading", { name: "O que você vai descartar hoje?" })).toBeVisible();
    await capturar(page, "02-visao-geral.png");
  });

  test("login aceita senha válida de conta preexistente anterior à política atual", async ({ page }) => {
    test.skip(!emailLegado || !senhaLegada, "Configure a conta legada fictícia no fixture local.");
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(emailLegado!);
    await page.locator("#login-senha").fill(senhaLegada!);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Boas-vindas ao Lixo Certo!" })).toBeVisible({ timeout: 20_000 });
  });

  test("consulta ao Guia com resultado publicado, instrução e fontes", async ({ page }) => {
    await entrar(page);
    await abrirNavegacao(page, /Guia de descarte/);
    await expect(page.getByRole("heading", { name: "Guia de descarte", level: 1 })).toBeVisible();
    const form = page.locator('form[data-onboarding-action="buscar_guia"]');
    await form.getByLabel("Buscar material pelo nome ou categoria").fill("Papelão");
    await form.getByRole("button", { name: "Buscar", exact: true }).click();
    const material = page.getByRole("article").filter({ hasText: "Papel e papelão secos para coleta seletiva" });
    await expect(material).toBeVisible();
    await expect(material.getByText("Como descartar")).toBeVisible();
    await material.evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 96));
    await capturar(page, "03-guia-lista.png");
    await material.locator("summary").click();
    await expect(material.getByText("Caminhos indicados pelas fontes")).toBeVisible();
    expect(await material.getByRole("link", { name: /Abrir fonte:/ }).count()).toBeGreaterThan(0);
    await material.getByText("Caminhos indicados pelas fontes").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -80));
    await capturar(page, "04-guia-detalhe.png");
  });

  test("busca de pontos por cidade e verificação dos dados apresentados", async ({ page }) => {
    await entrar(page);
    await abrirNavegacao(page, /Pontos de coleta/);
    await buscarPontoEmlur(page);
    const cartao = page.getByRole("article").filter({ hasText: "EMLUR — recebimento de resíduos eletrônicos" });
    await expect(cartao.getByText("Verificado", { exact: true })).toBeVisible();
    await expect(cartao.getByText("Eletroeletrônicos", { exact: true })).toBeVisible();
    await expect(cartao.getByText(/pin cartográfico do Google Maps, não aferido em campo/i)).toBeVisible();
    await cartao.locator("details summary").click();
    await expect(cartao.getByText(/Atendimento:/)).toBeVisible();
    await cartao.evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 96));
    await capturar(page, "05-pontos.png");
  });

  test("quiz, participação em desafio e atualização do painel de progresso", async ({ page }) => {
    await entrar(page);
    await abrirNavegacao(page, /Quiz e questionários/);
    await expect(page.getByRole("heading", { name: "Quiz e questionários", level: 1 })).toBeVisible();
    const pergunta = page.locator("#painel-quiz article").first();
    await expect(pergunta).toBeVisible();
    await capturar(page, "06-quiz-pergunta.png");
    await pergunta.getByRole("button").first().click();
    await expect(page.getByRole("status").filter({ hasText: /Mandou bem! \+\d+ pontos/ })).toBeVisible({ timeout: 15_000 });
    await capturar(page, "07-quiz-resultado.png");
    await abrirNavegacao(page, /Desafios/);
    const listaDesafios = page.getByRole("region", { name: "Desafios disponíveis" });
    const participar = listaDesafios.getByRole("button", { name: "Participar deste desafio" }).first();
    await expect(participar).toBeVisible({ timeout: 15_000 });
    const cartaoDesafio = participar.locator("xpath=ancestor::article[1]");
    const nomeDesafio = await cartaoDesafio.getByRole("heading", { level: 3 }).innerText();
    await participar.click();
    const desafioAtualizado = listaDesafios.getByRole("article").filter({ hasText: nomeDesafio });
    await expect(desafioAtualizado.getByText("Participando", { exact: true })).toBeVisible({ timeout: 15_000 });
    await abrirNavegacao(page, /Visão geral/);
    await expect(page.getByRole("heading", { name: "O que você vai descartar hoje?" })).toBeVisible();
    const progresso = page.getByRole("region", { name: "Seu progresso" });
    await expect(progresso.getByText("20", { exact: true })).toBeVisible({ timeout: 15_000 });
    const desafiosAtivos = page.getByRole("region", { name: "Desafios ativos" });
    await expect(desafiosAtivos.getByText(nomeDesafio, { exact: true })).toBeVisible({ timeout: 15_000 });
    await capturar(page, "08-painel-progresso.png");
  });

  test("geofence rejeita posição simulada fora do raio máximo de 5 m", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:3000" });
    await context.setGeolocation({ latitude: -7.114192, longitude: -34.859458, accuracy: 5 });
    await entrar(page);
    await abrirNavegacao(page, /Pontos de coleta/);
    await buscarPontoEmlur(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const cartaoPonto = page.getByRole("article").filter({ hasText: "EMLUR — recebimento de resíduos eletrônicos" });
    await cartaoPonto.getByRole("button", { name: /Iniciar descarte/ }).click();
    const registros = page.getByRole("region", { name: "Registros de descarte" });
    await registros.getByRole("button", { name: "Estou no ponto: confirmar localização" }).click();
    const alertaGeofence = registros.getByRole("alert");
    await expect(alertaGeofence).toContainText(/Check-in não aceito: você está a .* m do ponto; o limite é 5 m\. Aproxime-se até ficar a 5 m ou menos e tente novamente\./, { timeout: 20_000 });
    await expect(alertaGeofence).not.toContainText(/invalid_argument/i);
    await alertaGeofence.scrollIntoViewIfNeeded();
    await capturar(page, "09-geofence-fora-raio.png");
  });

  test("check-in no ponto, foto sintética e envio para revisão", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:3000" });
    await context.setGeolocation({ latitude: -7.114392, longitude: -34.859458, accuracy: 5 });
    await entrar(page);
    await abrirNavegacao(page, /Pontos de coleta/);
    await buscarPontoEmlur(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const cartaoPonto = page.getByRole("article").filter({ hasText: "EMLUR — recebimento de resíduos eletrônicos" });
    await cartaoPonto.getByRole("button", { name: /Iniciar descarte/ }).click();
    const registros = page.getByRole("region", { name: "Registros de descarte" });
    await expect(registros.getByText("Destino selecionado: EMLUR — recebimento de resíduos eletrônicos.")).toBeVisible();
    await registros.getByRole("button", { name: "Estou no ponto: confirmar localização" }).click();
    await expect(registros.getByText("Presença confirmada!")).toBeVisible({ timeout: 20_000 });
    await capturar(page, "10-checkin-localizacao.png");

    await registros.getByRole("group", { name: "Categorias aceitas pelo ponto" }).getByRole("button", { name: "Eletroeletrônicos" }).click();
    const pngSintetico = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAABzUlEQVR42u3cMVKEMBTGcZPhEB7BC1hY7Q2224LeY9lvQccNrLbwAh7BzrGytXMYsowS8r6XsP9XLgshP15ICEPC5/fXHbEcEQKAAAIIIIAAAuhGo9MX+XB42rL7++uFDKKJAQQQQARA/4lQaj5oY+dtEUUGBGQQQAABBBBAAAHEQLF4TIeO98+PFkV8vLyVHRbqMkigMzuy0VDevInZ6WiOH63TRxkW5camL6+gFHoxgAACCCCA2o2ukvM4n47pj/0w3jrQVZd0q6NUrFYn75/7AVpbZy+jrhKdq41o9rfz6ahva9Fdpx/GpWqnm/R5FN11/tzF1yhWruNu5HaTXns38erpGUlXAzRtF3npMN1L1srIIIAAAggggABSdNLbBwpk0I6AWpkPkgJlP3NmP+W2l0EZRo46Pk0sNVpiSjfpn+l9plz7YUynU9fK7vwmzXxQyTo7vhdzfnH4W3PerNabI4ykAQIIIIAAAgggAiCAANoZ0PSLwEZLMQESr6JlWm5s+vIKjh8FF9OuDoKPeoPpcsmzbyQLfho4Q7dr1MF6PWnB96umt7zY9NkLjh9kK5IXTyVNXxlYsp2RNEAAAQQQQAABRAAEEEAA1RY/jAuyaWdO1ZcAAAAASUVORK5CYII=", "base64");
    await registros.locator('input[type="file"]').setInputFiles({
      name: "evidencia-sintetica.png",
      mimeType: "image/png",
      buffer: pngSintetico,
    });
    await expect(registros.getByText(/Pronta: evidencia-sintetica\.png/)).toBeVisible({ timeout: 15_000 });
    await registros.getByText(/Pronta: evidencia-sintetica\.png/).scrollIntoViewIfNeeded();
    await capturar(page, "11-checkin-foto.png");
    await registros.getByRole("button", { name: "Concluir e enviar para revisão" }).click();
    await expect(registros.getByText(/1 registro enviado para revisão/)).toBeVisible({ timeout: 20_000 });
    await expect(registros.getByText("Em revisão", { exact: true })).toBeVisible();
    await registros.getByText("Em revisão", { exact: true }).scrollIntoViewIfNeeded();
    await capturar(page, "12-checkin-enviado.png");
  });
});
