import { expect, test } from "@playwright/test";

test.describe("jornadas de acesso do Lixo Certo", () => {
  test("exibe a jornada de login e permite alternar para cadastro", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Que bom ver você!" })).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Senha", exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Criar conta" }).click();
    await expect(page.getByRole("heading", { name: "Crie sua conta" })).toBeVisible();
    await expect(page.getByLabel("Nome completo")).toBeVisible();
    await expect(page.getByLabel("Confirmar senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar minha conta" })).toBeVisible();
  });

  test("valida os requisitos de senha e impede cadastro inválido no cliente", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Criar conta" }).click();
    await page.getByLabel("Nome completo").fill("Pessoa de Teste");
    await page.getByLabel("E-mail").fill("pessoa.teste@exemplo.test");
    await page.getByRole("textbox", { name: "Senha", exact: true }).fill("curta");
    await expect(page.getByText("12 caracteres ou mais")).toBeVisible();
    await expect(page.getByText("Letras e números")).toBeVisible();
    await page.getByLabel("Confirmar senha").fill("diferente");
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page.getByRole("alert")).toContainText("12 caracteres");
  });

  test("mantém a recuperação de senha acessível a partir do login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Esqueci minha senha" }).click();
    await expect(page.getByRole("heading", { name: "Recuperar sua senha" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar código de recuperação" })).toBeVisible();
  });
});
