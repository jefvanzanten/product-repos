import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const backendUrl = "http://127.0.0.1:3100";

type BrandResponse = { readonly id: string; readonly name: string };
type CategoryResponse = { readonly id: number; readonly name: string; readonly parentId: number | null };
type PackageTypeResponse = { readonly id: number; readonly name: string };
type UnitTypeResponse = { readonly id: number; readonly name: string };
type ProductCreatedResponse = {
  readonly id: string;
  readonly name: string;
  readonly package: { readonly id: string };
};
type TestRefs = {
  readonly colaCategory: CategoryResponse;
  readonly drinkCategory: CategoryResponse;
  readonly packageType: PackageTypeResponse;
  readonly unitType: UnitTypeResponse;
};

test.describe.serial("admin productcatalogus specs", () => {
  let refs: TestRefs;

  test.beforeAll(async ({ request }) => {
    refs = await loadRefs(request);
  });

  test("productcatalogus-browsen-specificatie AC-07 - lege catalogus is zichtbaar op een verse database", async ({ page }) => {
    await page.goto("/admin/product-catalogus/producten");

    await expect(page.getByText("Nog geen producten")).toBeVisible();
    await expect(page.getByRole("link", { name: "Eerste product aanmaken" })).toBeVisible();
  });

  test.describe("product-aanmaken-specificatie", () => {
    test("AC-01 - formulier direct openen vanaf de catalogus", async ({ page }) => {
      await page.goto("/admin/product-catalogus/producten");
      await expect(page.getByText("Nog geen producten")).toBeVisible();

      await page.getByRole("link", { name: "Eerste product aanmaken" }).click();

      await expect(page).toHaveURL(/\/admin\/product-catalogus\/producten\/nieuw$/);
      await expect(page.getByRole("heading", { name: "Product aanmaken" })).toBeVisible();
    });

    test("AC-02 - product met bestaand merk aanmaken redirect naar productdetail", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const brand = await createBrand(request, `Bestaand Merk ${suffix}`);
      await page.goto("/admin/product-catalogus/producten/nieuw");

      await fillCreateProductBasics(page, refs, `Cola bestaand merk ${suffix}`);
      await selectExistingBrand(page, brand.name);
      await page.getByRole("button", { name: "Product opslaan" }).click();

      await expect(page).toHaveURL(/\/admin\/product-catalogus\/producten\/[0-9a-f-]+$/);
      await expect(page.getByText(brand.name, { exact: true })).toBeVisible();
      await expect(page.getByText(`Cola bestaand merk ${suffix}`, { exact: true })).toBeVisible();
    });

    test("AC-03 - product zonder merk aanmaken", async ({ page }) => {
      const suffix = uniqueSuffix();
      await page.goto("/admin/product-catalogus/producten/nieuw");

      await fillCreateProductBasics(page, refs, `Merkloze cola ${suffix}`);
      await page.getByRole("button", { name: "Product opslaan" }).click();

      await expect(page).toHaveURL(/\/admin\/product-catalogus\/producten\/[0-9a-f-]+$/);
      await expect(page.locator("dd").filter({ hasText: /^-$/ })).toBeVisible();
      await expect(page.getByRole("heading", { name: `Merkloze cola ${suffix}` })).toBeVisible();
    });

    test("AC-04 - nieuw merk inline gebruiken", async ({ page }) => {
      const suffix = uniqueSuffix();
      const brandName = `Nieuw Inline Merk ${suffix}`;
      await page.goto("/admin/product-catalogus/producten/nieuw");

      await fillCreateProductBasics(page, refs, `Cola nieuw merk ${suffix}`);
      await page.getByPlaceholder("Typ om merken te zoeken, bijv. Coca-Cola").fill(brandName);
      await page.getByRole("button", { name: `+ Maak “${brandName}” aan als nieuw merk` }).click();
      await expect(page.getByText(`Nieuw merk wordt aangemaakt: ${brandName}`)).toBeVisible();
      await expect(page.getByLabel("Productnaam")).toHaveValue(`Cola nieuw merk ${suffix}`);
      await page.getByRole("button", { name: "Product opslaan" }).click();

      await expect(page).toHaveURL(/\/admin\/product-catalogus\/producten\/[0-9a-f-]+$/);
      await expect(page.getByText(brandName, { exact: true })).toBeVisible();
    });

    test("AC-05 - nieuwe categorie inline gebruiken en ingevulde velden behouden", async ({ page }) => {
      const suffix = uniqueSuffix();
      const categoryName = `Inline Categorie ${suffix}`;
      const productName = `Categorie product ${suffix}`;
      await page.goto("/admin/product-catalogus/producten/nieuw");

      await page.getByLabel("Productnaam").fill(productName);
      await page.locator('select[name="packageTypeId"]').selectOption({ label: refs.packageType.name });
      await page.getByLabel("Inhoud").fill("0,5");
      await page.locator('select[name="unitTypeId"]').selectOption({ label: refs.unitType.name });
      await page.getByLabel("Aantal per verpakking").fill("1");
      await page.getByRole("button", { name: "+ hoofdcategorie" }).click();
      await page.getByPlaceholder("Nieuwe categorie onder hoofdcategorie").fill(categoryName);
      await page.getByRole("button", { name: "Toevoegen" }).click();

      await expect(page.getByRole("radio", { name: new RegExp(`^${escapeRegex(categoryName)}$`) })).toBeChecked();
      await expect(page.getByLabel("Productnaam")).toHaveValue(productName);
      await expect(page.getByLabel("Inhoud")).toHaveValue("0,5");
    });

    test("AC-06 - categorie veilig verwijderen", async ({ page, request }) => {
      const category = await createCategory(request, `Veilig Verwijderen ${uniqueSuffix()}`, null);
      await page.goto("/admin/product-catalogus/producten/nieuw");

      await page.getByRole("radio", { name: category.name }).check();
      await page.getByRole("button", { name: `Categorie ${category.name} verwijderen` }).click();

      await expect(page.getByRole("radio", { name: category.name })).toHaveCount(0);
      await expect(page.locator('input[name="categoryId"]:checked')).toHaveCount(0);
    });

    test("AC-07 - duplicaat product blokkeren", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const brand = await createBrand(request, `Duplicaat Merk ${suffix}`);
      await createProduct(request, refs, { name: `Duplicaat Cola ${suffix}`, brandId: brand.id, categoryId: refs.colaCategory.id });
      await page.goto("/admin/product-catalogus/producten/nieuw");

      await fillCreateProductBasics(page, refs, `  duplicaat cola ${suffix.toUpperCase()}  `);
      await selectExistingBrand(page, brand.name);
      await page.getByRole("button", { name: "Product opslaan" }).click();

      await expect(page.getByText("Dit product bestaat al.")).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/product-catalogus\/producten\/nieuw$/);
    });

    test("AC-08 - brandId en categoryId context vooraf invullen", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const brand = await createBrand(request, `Context Merk ${suffix}`);
      const category = await createCategory(request, `Context Categorie ${suffix}`, null);

      await page.goto(`/admin/product-catalogus/producten/nieuw?brandId=${brand.id}`);
      await expect(page.getByText(`Geselecteerd merk: ${brand.name}`)).toBeVisible();

      await page.goto(`/admin/product-catalogus/producten/nieuw?categoryId=${category.id}`);
      await expect(page.getByRole("radio", { name: category.name })).toBeChecked();
    });
  });

  test.describe("product-zoeken-specificatie", () => {
    test("AC-01/AC-02 - zoekterm blijft zichtbaar en product aanmaken gebruikt geen prefill", async ({ page }) => {
      await page.goto("/admin/product-catalogus/producten?q=cola");

      await expect(page.getByPlaceholder("Zoek product, merk of categorie")).toHaveValue("cola");
      await page.getByRole("link", { name: "Product aanmaken" }).click();

      await expect(page).toHaveURL(/\/admin\/product-catalogus\/producten\/nieuw$/);
      await expect(page.getByLabel("Productnaam")).toHaveValue("");
      await expect(page.getByPlaceholder("Typ om merken te zoeken, bijv. Coca-Cola")).toHaveValue("");
    });

    test("AC-03 - merk suggesties zoeken en bestaand merk kiezen", async ({ page, request }) => {
      const brand = await createBrand(request, `Suggestie Merk ${uniqueSuffix()}`);
      await page.goto("/admin/product-catalogus/producten/nieuw");

      await page.getByPlaceholder("Typ om merken te zoeken, bijv. Coca-Cola").fill(brand.name);
      await page.getByRole("option", { name: brand.name }).click();

      await expect(page.getByText(`Geselecteerd merk: ${brand.name}`)).toBeVisible();
    });

    test("AC-04 - losse merkzoektekst blokkeert opslaan", async ({ page }) => {
      const suffix = uniqueSuffix();
      await page.goto("/admin/product-catalogus/producten/nieuw");

      await fillCreateProductBasics(page, refs, `Los merk ${suffix}`);
      await page.getByPlaceholder("Typ om merken te zoeken, bijv. Coca-Cola").fill(`Niet gekozen merk ${suffix}`);
      await page.getByRole("button", { name: "Product opslaan" }).click();

      await expect(page.getByText("Kies een suggestie of maak het merk aan met de plus-optie.")).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/product-catalogus\/producten\/nieuw$/);
    });

    test("AC-05/AC-06 - zoeken vanaf twee tekens toont gegroepeerde resultaten", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const brand = await createBrand(request, `Zoek Groep Merk ${suffix}`);
      const category = await createCategory(request, `Zoek Groep Cat ${suffix}`, null);
      await createProduct(request, refs, { name: `Zoek Groep Product ${suffix}`, brandId: brand.id, categoryId: category.id });

      await page.goto(`/admin/product-catalogus/producten?q=${encodeURIComponent(suffix.slice(0, 1))}`);
      await expect(page.getByRole("heading", { name: "Producten" })).toHaveCount(1);
      await expect(page.getByText(`Zoek Groep Product ${suffix}`)).toHaveCount(0);

      await page.goto(`/admin/product-catalogus/producten?q=${encodeURIComponent(suffix)}`);
      await expect(page.getByRole("heading", { name: "Producten" }).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "Merken" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Categorieën" })).toBeVisible();
      await expect(page.getByRole("link", { name: new RegExp(`^Zoek Groep Merk ${escapeRegex(suffix)} 1`) })).toBeVisible();
      await expect(page.getByRole("link", { name: new RegExp(`^Zoek Groep Cat ${escapeRegex(suffix)} 1`) })).toBeVisible();
    });

    test("AC-07 - geen resultaten toont lege zoekstate", async ({ page }) => {
      const query = `geen-resultaten-${uniqueSuffix()}`;
      await page.goto(`/admin/product-catalogus/producten?q=${query}`);

      await expect(page.getByText(`Geen resultaten gevonden voor "${query}".`)).toBeVisible();
      await expect(page.getByRole("link", { name: "Product aanmaken" })).toBeVisible();
    });

    test("AC-08 - merk- en categorieresultaten verwijderen q uit de URL", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const brand = await createBrand(request, `Selectie Merk ${suffix}`);
      const category = await createCategory(request, `Selectie Cat ${suffix}`, null);
      await createProduct(request, refs, { name: `Selectie Product ${suffix}`, brandId: brand.id, categoryId: category.id });

      await page.goto(`/admin/product-catalogus/producten?q=${encodeURIComponent(suffix)}`);
      await page.getByRole("link", { name: new RegExp(`^${escapeRegex(brand.name)} 1`) }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/product-catalogus/producten\\?brandId=${brand.id}$`));
      await expect(page.getByPlaceholder("Zoek product, merk of categorie")).toHaveValue("");

      await page.goto(`/admin/product-catalogus/producten?q=${encodeURIComponent(suffix)}`);
      await page.getByRole("link", { name: new RegExp(`^${escapeRegex(category.name)} 1`) }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/product-catalogus/producten\\?categoryId=${category.id}$`));
      await expect(page.getByPlaceholder("Zoek product, merk of categorie")).toHaveValue("");
    });
  });

  test.describe("productcatalogus-browsen-specificatie", () => {
    test("AC-01 - root toont categorieën en geen platte productlijst", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const category = await createCategory(request, `Root Browse ${suffix}`, null);
      const product = await createProduct(request, refs, { name: `Root Product ${suffix}`, brandId: null, categoryId: category.id });

      await page.goto("/admin/product-catalogus/producten");

      await expect(page.getByRole("heading", { name: "Categorieën" })).toBeVisible();
      await expect(page.getByRole("link", { name: new RegExp(category.name) })).toBeVisible();
      await expect(page.getByText(product.name)).toHaveCount(0);
    });

    test("AC-02 - categorie openen toont directe subcategorieën en directe producten", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const parent = await createCategory(request, `Browse Parent ${suffix}`, null);
      const child = await createCategory(request, `Browse Child ${suffix}`, parent.id);
      const directProduct = await createProduct(request, refs, { name: `Direct Product ${suffix}`, brandId: null, categoryId: parent.id });
      const childProduct = await createProduct(request, refs, { name: `Child Product ${suffix}`, brandId: null, categoryId: child.id });

      await page.goto(`/admin/product-catalogus/producten?categoryId=${parent.id}`);

      await expect(page.getByText(parent.name).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "Subcategorieën" })).toBeVisible();
      await expect(page.getByRole("link", { name: new RegExp(child.name) })).toBeVisible();
      await expect(page.getByText(directProduct.name)).toBeVisible();
      await expect(page.getByText(childProduct.name)).toHaveCount(0);
      await expect(page.getByRole("link", { name: `Product aanmaken in ${parent.name}` })).toBeVisible();
    });

    test("AC-03 - productrij opent productdetail", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const category = await createCategory(request, `Open Product Cat ${suffix}`, null);
      const product = await createProduct(request, refs, { name: `Open Product ${suffix}`, brandId: null, categoryId: category.id });

      await page.goto(`/admin/product-catalogus/producten?categoryId=${category.id}`);
      await page.getByRole("link", { name: new RegExp(product.name) }).click();

      await expect(page).toHaveURL(new RegExp(`/admin/product-catalogus/producten/${product.id}$`));
      await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
    });

    test("AC-04 - merkresultaat toont producten gegroepeerd per categorie", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const brand = await createBrand(request, `Brand Result ${suffix}`);
      const firstCategory = await createCategory(request, `Brand Cat A ${suffix}`, null);
      const secondCategory = await createCategory(request, `Brand Cat B ${suffix}`, null);
      await createProduct(request, refs, { name: `Brand Product A ${suffix}`, brandId: brand.id, categoryId: firstCategory.id });
      await createProduct(request, refs, { name: `Brand Product B ${suffix}`, brandId: brand.id, categoryId: secondCategory.id });

      await page.goto(`/admin/product-catalogus/producten?q=${encodeURIComponent(brand.name)}`);
      await page.getByRole("link", { name: new RegExp(`^${escapeRegex(brand.name)} 2`) }).click();

      await expect(page).toHaveURL(new RegExp(`/admin/product-catalogus/producten\\?brandId=${brand.id}$`));
      await expect(page.getByRole("heading", { name: `Producten van ${brand.name}` })).toBeVisible();
      await expect(page.getByRole("heading", { name: firstCategory.name })).toBeVisible();
      await expect(page.getByRole("heading", { name: secondCategory.name })).toBeVisible();
      await expect(page.getByText("merkchip")).toHaveCount(0);
    });

    test("AC-05 - contextueel product aanmaken vanuit categorie en merk", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const brand = await createBrand(request, `Context Browse Merk ${suffix}`);
      const category = await createCategory(request, `Context Browse Cat ${suffix}`, null);
      await createProduct(request, refs, { name: `Context Browse Product ${suffix}`, brandId: brand.id, categoryId: category.id });

      await page.goto(`/admin/product-catalogus/producten?categoryId=${category.id}`);
      await page.getByRole("link", { name: `Product aanmaken in ${category.name}` }).click();
      await expect(page.getByRole("radio", { name: category.name })).toBeChecked();

      await page.goto(`/admin/product-catalogus/producten?brandId=${brand.id}`);
      await page.getByRole("link", { name: `Product aanmaken voor ${brand.name}` }).click();
      await expect(page.getByText(`Geselecteerd merk: ${brand.name}`)).toBeVisible();
    });

    test("AC-06 - typed zoekterm geeft geen prefill in productformulier", async ({ page }) => {
      await page.goto("/admin/product-catalogus/producten?q=typedterm");
      await page.getByRole("link", { name: "Product aanmaken" }).click();

      await expect(page.getByLabel("Productnaam")).toHaveValue("");
      await expect(page.getByPlaceholder("Typ om merken te zoeken, bijv. Coca-Cola")).toHaveValue("");
      await expect(page.locator('input[name="categoryId"]:checked')).toHaveCount(0);
    });

    test("AC-08 - oude trapsgewijze productmanagement-flow komt niet terug", async ({ page }) => {
      await page.goto("/admin/product-catalogus/producten/nieuw");

      await expect(page.getByText("Producttype", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Merkproduct", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Variant", { exact: true })).toHaveCount(0);
      await expect(page.getByText("SKU", { exact: true })).toHaveCount(0);
      await expect(page.locator("body")).toContainText(/categorie/i);
      await expect(page.locator("body")).toContainText(/merk/i);
      await expect(page.locator("body")).toContainText(/productnaam/i);
      await expect(page.locator("body")).toContainText(/verpakking/i);
    });

    test("spec-regel - meer laden is een werkende link", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const category = await createCategory(request, `Meer Laden UI ${suffix}`, null);
      await createProduct(request, refs, { name: `Meer Laden A ${suffix}`, brandId: null, categoryId: category.id });
      await createProduct(request, refs, { name: `Meer Laden B ${suffix}`, brandId: null, categoryId: category.id });

      await page.goto(`/admin/product-catalogus/producten?categoryId=${category.id}&limit=1`);
      await expect(page.getByText(`Meer Laden A ${suffix}`)).toBeVisible();
      await expect(page.getByText(`Meer Laden B ${suffix}`)).toHaveCount(0);

      await page.getByRole("link", { name: "Meer laden", exact: true }).click();

      await expect(page).toHaveURL(new RegExp(`categoryId=${category.id}.*limit=51`));
      await expect(page.getByText(`Meer Laden B ${suffix}`)).toBeVisible();
    });
  });

  test.describe("product-detail-specificatie", () => {
    test("AC-01/AC-04 - productdetail openen toont productgegevens en verpakkingen", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const category = await createCategory(request, `Detail Cat ${suffix}`, null);
      const product = await createProduct(request, refs, { name: `Detail Product ${suffix}`, brandId: null, categoryId: category.id });

      await page.goto(`/admin/product-catalogus/producten?categoryId=${category.id}`);
      await page.getByRole("link", { name: new RegExp(product.name) }).click();

      await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Productgegevens" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Verpakkingen" })).toBeVisible();
      await expect(page.getByText("fles 1.5 liter")).toBeVisible();
      await expect(page.getByRole("link", { name: "Bekijk verpakking" })).toBeVisible();
    });

    test("AC-02/AC-03 - product bewerken en opslaan", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const originalCategory = await createCategory(request, `Edit Cat Original ${suffix}`, null);
      const nextCategory = await createCategory(request, `Edit Cat Next ${suffix}`, null);
      const brand = await createBrand(request, `Edit Merk ${suffix}`);
      const product = await createProduct(request, refs, { name: `Edit Product ${suffix}`, brandId: null, categoryId: originalCategory.id });

      await page.goto(`/admin/product-catalogus/producten/${product.id}`);
      await page.getByRole("link", { name: "Product bewerken" }).click();

      await page.getByLabel("Categorie").selectOption({ label: nextCategory.name });
      await selectExistingBrand(page, brand.name);
      await page.getByLabel("Productnaam").fill(`Edited Product ${suffix}`);
      await page.getByRole("button", { name: "Opslaan" }).click();

      await expect(page).toHaveURL(new RegExp(`/admin/product-catalogus/producten/${product.id}$`));
      await expect(page.locator("dd").filter({ hasText: new RegExp(`^${escapeRegex(nextCategory.name)}$`) })).toBeVisible();
      await expect(page.locator("dd").filter({ hasText: new RegExp(`^${escapeRegex(brand.name)}$`) })).toBeVisible();
      await expect(page.locator("dd").filter({ hasText: new RegExp(`^Edited Product ${escapeRegex(suffix)}$`) })).toBeVisible();
    });

    test("product bewerken ondersteunt inline merk/categorie en blokkeert losse merktekst", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const product = await createProduct(request, refs, { name: `Inline Edit Product ${suffix}`, brandId: null, categoryId: refs.colaCategory.id });
      const categoryName = `Edit Inline Cat ${suffix}`;
      const brandName = `Edit Inline Merk ${suffix}`;

      await page.goto(`/admin/product-catalogus/producten/${product.id}?edit=1`);
      await page.getByLabel("Productnaam").fill(`Inline Edited Product ${suffix}`);
      await page.getByPlaceholder("Typ om merken te zoeken, bijv. Coca-Cola").fill(`Losse tekst ${suffix}`);
      await page.getByRole("button", { name: "Opslaan" }).click();
      await expect(page.getByText("Kies een suggestie of maak het merk aan met de plus-optie.")).toBeVisible();

      await page.goto(`/admin/product-catalogus/producten/${product.id}?edit=1`);
      await page.getByLabel("Productnaam").fill(`Inline Edited Product ${suffix}`);
      await page.getByRole("button", { name: "+ Categorie aanmaken" }).click();
      await page.getByPlaceholder("Bijv. Cola").fill(categoryName);
      await page.getByRole("button", { name: "Categorie toevoegen" }).click();
      await expect(page.locator('select[name="categoryId"]')).toHaveValue(/\d+/);
      await page.waitForLoadState("networkidle");
      await page.getByPlaceholder("Typ om merken te zoeken, bijv. Coca-Cola").fill(brandName);
      await expect(page.getByPlaceholder("Typ om merken te zoeken, bijv. Coca-Cola")).toHaveValue(brandName);
      await page.getByRole("button", { name: `+ Maak “${brandName}” aan als nieuw merk` }).click();
      await page.getByRole("button", { name: "Opslaan" }).click();

      await expect(page.locator("dd").filter({ hasText: categoryName })).toBeVisible();
      await expect(page.locator("dd").filter({ hasText: new RegExp(`^${escapeRegex(brandName)}$`) })).toBeVisible();
    });

    test("AC-05/AC-06 - verpakking toevoegen, openen en bewerken", async ({ page, request }) => {
      const suffix = uniqueSuffix();
      const product = await createProduct(request, refs, { name: `Package Product ${suffix}`, brandId: null, categoryId: refs.colaCategory.id });

      await page.goto(`/admin/product-catalogus/producten/${product.id}`);
      await page.getByRole("link", { name: "Verpakking toevoegen" }).first().click();
      await expect(page).toHaveURL(new RegExp(`/admin/product-catalogus/producten/${product.id}/verpakkingen/nieuw$`));
      await page.getByLabel("Verpakkingstype").selectOption({ label: "blik" });
      await page.getByLabel("Inhoud").fill("0,33");
      await page.getByLabel("Eenheid").selectOption({ label: "liter" });
      await page.getByLabel("Aantal per verpakking").fill("6");
      await page.getByRole("button", { name: "Verpakking opslaan" }).click();

      await expect(page).toHaveURL(new RegExp(`/admin/product-catalogus/producten/${product.id}/verpakkingen/[0-9a-f-]+$`));
      await expect(page.getByRole("heading", { name: "Verpakking" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "blik 6 x 0.33 liter" })).toBeVisible();

      await page.getByRole("link", { name: "Verpakking bewerken" }).click();
      await page.getByLabel("Verpakkingstype").selectOption({ label: "multipack" });
      await page.getByLabel("Inhoud").fill("330");
      await page.getByLabel("Eenheid").selectOption({ label: "milliliter" });
      await page.getByLabel("Aantal per verpakking").fill("12");
      await page.getByRole("button", { name: "Opslaan" }).click();

      await expect(page.getByRole("heading", { name: "multipack 12 x 330 milliliter" })).toBeVisible();
    });

    test("AC-07 - geen verwijder- of archiefactie op productdetail of verpakkingdetail", async ({ page, request }) => {
      const product = await createProduct(request, refs, { name: `Geen Delete ${uniqueSuffix()}`, brandId: null, categoryId: refs.colaCategory.id });

      await page.goto(`/admin/product-catalogus/producten/${product.id}`);
      await expect(page.locator("body")).not.toContainText(/verwijder|archiveer|archiveren/i);
      await page.getByRole("link", { name: "Bekijk verpakking" }).first().click();
      await expect(page.locator("body")).not.toContainText(/verwijder|archiveer|archiveren/i);
    });
  });
});

async function loadRefs(request: APIRequestContext): Promise<TestRefs> {
  const [categories, packageTypes, unitTypes] = await Promise.all([
    getJson<CategoryResponse[]>(request, "/categories"),
    getJson<PackageTypeResponse[]>(request, "/package-types"),
    getJson<UnitTypeResponse[]>(request, "/unit-types"),
  ]);
  const colaCategory = findByName(categories, "Cola");
  const drinkCategory = findByName(categories, "Drinken");
  const packageType = findByName(packageTypes, "fles");
  const unitType = findByName(unitTypes, "liter");
  return { colaCategory, drinkCategory, packageType, unitType };
}

async function getJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`${backendUrl}${path}`);
  expect(response.ok()).toBe(true);
  return response.json() as Promise<T>;
}

async function createBrand(request: APIRequestContext, name: string): Promise<BrandResponse> {
  const response = await request.post(`${backendUrl}/brands`, { data: { name } });
  expect([200, 201]).toContain(response.status());
  return response.json() as Promise<BrandResponse>;
}

async function createCategory(request: APIRequestContext, name: string, parentId: number | null): Promise<CategoryResponse> {
  const response = await request.post(`${backendUrl}/categories`, { data: { name, parentId } });
  expect(response.status()).toBe(201);
  return response.json() as Promise<CategoryResponse>;
}

async function createProduct(
  request: APIRequestContext,
  refs: TestRefs,
  input: { readonly name: string; readonly brandId: string | null; readonly categoryId: number },
): Promise<ProductCreatedResponse> {
  const response = await request.post(`${backendUrl}/products`, {
    data: {
      name: input.name,
      categoryId: input.categoryId,
      brandId: input.brandId,
      package: {
        packageTypeId: refs.packageType.id,
        amount: "1.5",
        unitTypeId: refs.unitType.id,
        unitsPerPackage: 1,
      },
    },
  });
  expect(response.status()).toBe(201);
  return response.json() as Promise<ProductCreatedResponse>;
}

async function fillCreateProductBasics(page: Page, refs: TestRefs, productName: string): Promise<void> {
  await page.getByRole("radio", { name: /Cola$/ }).check();
  await page.getByLabel("Productnaam").fill(productName);
  await page.locator('select[name="packageTypeId"]').selectOption({ label: refs.packageType.name });
  await page.getByLabel("Inhoud").fill("1,5");
  await page.locator('select[name="unitTypeId"]').selectOption({ label: refs.unitType.name });
  await page.getByLabel("Aantal per verpakking").fill("1");
}

async function selectExistingBrand(page: Page, brandName: string): Promise<void> {
  await page.getByPlaceholder("Typ om merken te zoeken, bijv. Coca-Cola").fill(brandName);
  await page.getByRole("option", { name: brandName }).click();
  await expect(page.getByText(`Geselecteerd merk: ${brandName}`)).toBeVisible();
}

function findByName<T extends { readonly name: string }>(items: ReadonlyArray<T>, name: string): T {
  const found = items.find((item) => item.name === name);
  if (!found) throw new Error(`Missing seeded item: ${name}`);
  return found;
}

function uniqueSuffix(): string {
  return crypto.randomUUID().slice(0, 8);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
