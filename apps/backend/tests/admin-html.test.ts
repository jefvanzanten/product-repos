import { describe, expect, it } from "bun:test";
import { app, testCatalog } from "./test-app";

describe("server-rendered admin product catalog", () => {
  it("renders the catalog admin layout and an HTMX partial", async () => {
    const full = await app.request("/admin/product-catalogus/");
    expect(full.status).toBe(200);
    const fullHtml = await full.text();
    expect(fullHtml).toContain("<html");
    expect(fullHtml).toContain("Productcatalogus");
    expect(fullHtml).toContain("/admin/assets/admin.css");
    expect(fullHtml).toContain("/admin/assets/htmx.min.js");

    const stylesheet = await app.request("/admin/assets/admin.css");
    expect(stylesheet.status).toBe(200);
    const css = await stylesheet.text();
    expect(css).toContain(".AdminLayout_shell");
    expect(css).toContain(".CatalogSearch_contentCard");
    expect(css).toContain(".CatalogSearch_browseBody");
    expect(css).toContain("min-height: 30vh");

    const partial = await app.request("/admin/product-catalogus", { headers: { "HX-Request": "true" } });
    expect(partial.status).toBe(200);
    const partialHtml = await partial.text();
    expect(partialHtml).toContain("catalog-content");
    expect(partialHtml).not.toContain("<html");
  });

  it("shows root categories without a flat product list", async () => {
    const suffix = crypto.randomUUID();
    const category = await createCategory(`Admin Root ${suffix}`, null);
    const product = await createProduct({ name: `Admin Root Product ${suffix}`, categoryId: category.id, brandId: null });

    const response = await app.request("/admin/product-catalogus");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Alle categorieën");
    expect(html).toContain(category.name);
    expect(html).not.toContain(product.name);
    expect(html).toContain("Categorie aanmaken");
    expect(html).not.toContain("Product aanmaken");
  });

  it("creates a root category from the catalog root", async () => {
    const categoryName = `Admin Root Modal ${crypto.randomUUID()}`;
    const modal = await app.request("/admin/product-catalogus/categorieen/nieuw", { headers: { "HX-Request": "true" } });
    expect(modal.status).toBe(200);
    const modalHtml = await modal.text();
    expect(modalHtml).toContain("Nieuwe categorie maken");
    expect(modalHtml).toContain("Naam categorie");

    const form = new FormData();
    form.set("name", categoryName);
    const created = await app.request("/admin/product-catalogus/categorieen/nieuw", { method: "POST", body: form });
    expect(created.status).toBe(303);
    expect(created.headers.get("location")).toBe("/admin/product-catalogus");

    const root = await app.request("/admin/product-catalogus");
    expect(await root.text()).toContain(categoryName);
  });

  it("expands any category inline while keeping only one detail panel open", async () => {
    const suffix = crypto.randomUUID();
    const firstRoot = await createCategory(`Admin Accordion First ${suffix}`, null);
    const secondRoot = await createCategory(`Admin Accordion Second ${suffix}`, null);
    const child = await createCategory(`Admin Accordion Child ${suffix}`, firstRoot.id);
    const grandchild = await createCategory(`Admin Accordion Grandchild ${suffix}`, child.id);
    const product = await createProduct({ name: `Admin Accordion Product ${suffix}`, categoryId: firstRoot.id, brandId: null });

    const root = await app.request("/admin/product-catalogus");
    expect(root.status).toBe(200);
    const rootHtml = await root.text();
    expect(rootHtml).toContain("id=\"category-accordion\"");
    expect(rootHtml).toContain(`hx-get=\"/admin/product-catalogus/categorieen/${firstRoot.id}/uitklappen\"`);
    expect(rootHtml).toContain(`aria-expanded=\"false\"`);
    expect(rootHtml).toContain("CategoryTree_toggleIcon");
    expect(rootHtml).not.toContain(product.name);
    expect(rootHtml).not.toContain(child.name);

    const expanded = await app.request(`/admin/product-catalogus/categorieen/${firstRoot.id}/uitklappen`, { headers: { "HX-Request": "true" } });
    expect(expanded.status).toBe(200);
    const expandedHtml = await expanded.text();
    expect(expandedHtml).toContain(`aria-controls=\"category-panel-${firstRoot.id}\"`);
    expect(expandedHtml).toContain(`id=\"category-panel-${firstRoot.id}\"`);
    expect(expandedHtml).toContain(`hx-get=\"/admin/product-catalogus/categorieen/${firstRoot.id}/uitklappen?open=0\"`);
    expect(expandedHtml).toContain(`hx-get=\"/admin/product-catalogus/categorieen/${child.id}/uitklappen\"`);
    expect(expandedHtml).toContain(child.name);
    expect(expandedHtml).toContain(product.name);
    expect(expandedHtml).toContain(secondRoot.name);
    expect(expandedHtml).toContain(`href=\"/admin/product-catalogus/categorieen/${firstRoot.id}/subcategorie/nieuw\"`);
    expect(expandedHtml).toContain(`href=\"/admin/product-catalogus/nieuw?categoryId=${firstRoot.id}\"`);
    expect(expandedHtml).not.toContain(">Subcategorieën</h3>");
    expect(expandedHtml).not.toContain(grandchild.name);
    expect(expandedHtml).not.toContain(`id=\"category-panel-${secondRoot.id}\"`);

    const nested = await app.request(`/admin/product-catalogus/categorieen/${child.id}/uitklappen`, { headers: { "HX-Request": "true" } });
    expect(nested.status).toBe(200);
    const nestedHtml = await nested.text();
    expect(nestedHtml).toContain(`id=\"category-panel-${child.id}\"`);
    expect(nestedHtml).toContain(grandchild.name);
    expect(nestedHtml).toContain(`href=\"/admin/product-catalogus/categorieen/${child.id}/subcategorie/nieuw\"`);
    expect(nestedHtml).toContain(`href=\"/admin/product-catalogus/nieuw?categoryId=${child.id}\"`);
    expect(nestedHtml).toMatch(new RegExp(`<button[^>]*hx-get=\"/admin/product-catalogus/categorieen/${firstRoot.id}/uitklappen\"[^>]*hx-push-url=\"/admin/product-catalogus\\?categoryId=${firstRoot.id}\"[^>]*aria-controls=\"category-panel-${child.id}\"`));
    expect(nestedHtml).not.toContain(`id=\"category-panel-${firstRoot.id}\"`);
    expect(nestedHtml).not.toContain(product.name);

    const switched = await app.request(`/admin/product-catalogus/categorieen/${secondRoot.id}/uitklappen`, { headers: { "HX-Request": "true" } });
    expect(switched.status).toBe(200);
    const switchedHtml = await switched.text();
    expect(switchedHtml).toContain(`id=\"category-panel-${secondRoot.id}\"`);
    expect(switchedHtml).not.toContain(`id=\"category-panel-${firstRoot.id}\"`);
    expect(switchedHtml).not.toContain(`id=\"category-panel-${child.id}\"`);
  });

  it("renames a category from the category tree edit route", async () => {
    const originalName = `Admin Rename Original ${crypto.randomUUID()}`;
    const renamedName = `Admin Rename Updated ${crypto.randomUUID()}`;
    const category = await createCategory(originalName, null);

    const root = await app.request("/admin/product-catalogus");
    const rootHtml = await root.text();
    expect(rootHtml).toContain(`/admin/product-catalogus/categorieen/${category.id}/bewerken`);
    expect(rootHtml).toContain(`aria-label="Categorie ${originalName} bewerken"`);

    const modal = await app.request(`/admin/product-catalogus/categorieen/${category.id}/bewerken`, { headers: { "HX-Request": "true" } });
    expect(modal.status).toBe(200);
    const modalHtml = await modal.text();
    expect(modalHtml).toContain("Categorie bewerken");
    expect(modalHtml).toContain(`value="${originalName}"`);

    const form = new FormData();
    form.set("name", renamedName);
    const updated = await app.request(`/admin/product-catalogus/categorieen/${category.id}/bewerken`, { method: "POST", body: form });
    expect(updated.status).toBe(303);
    expect(updated.headers.get("location")).toBe("/admin/product-catalogus");

    const updatedRoot = await app.request("/admin/product-catalogus");
    const updatedRootHtml = await updatedRoot.text();
    expect(updatedRootHtml).toContain(renamedName);
    expect(updatedRootHtml).not.toContain(originalName);
  });

  it("renders grouped search results and strips q from brand/category links", async () => {
    const suffix = crypto.randomUUID();
    const category = await createCategory(`Admin Zoek Cat ${suffix}`, null);
    const brand = await createBrand(`Admin Zoek Merk ${suffix}`);
    const product = await createProduct({ name: `Admin Zoek Product ${suffix}`, categoryId: category.id, brandId: brand.id });

    const response = await app.request(`/admin/product-catalogus?q=${encodeURIComponent(suffix)}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Producten");
    expect(html).toContain(product.name);
    expect(html).toContain("Merken");
    expect(html).toContain(`brandId=${brand.id}`);
    expect(html).not.toContain(`brandId=${brand.id}&amp;q=`);
    expect(html).toContain("Categorieën");
    expect(html).toContain(`categoryId=${category.id}`);
  });

  it("renders category browse without breadcrumb and with subcategory creation", async () => {
    const suffix = crypto.randomUUID();
    const parent = await createCategory(`Admin Parent ${suffix}`, null);
    const child = await createCategory(`Admin Child ${suffix}`, parent.id);
    const product = await createProduct({ name: `Admin Direct ${suffix}`, categoryId: parent.id, brandId: null });

    const response = await app.request(`/admin/product-catalogus?categoryId=${parent.id}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(parent.name);
    expect(html).toContain(`<h2>${parent.name}</h2>`);
    expect(html).toContain(child.name);
    expect(html).not.toContain(`${parent.name} &gt; ${child.name}`);
    expect(html).toContain(product.name);
    expect(html).toContain("Subcategorie aanmaken");
    expect(html).toContain("Zoek product, merk of categorie");
    expect(html).not.toContain("aria-label=\"Breadcrumb\"");
    expect(html.indexOf("Zoek product, merk of categorie")).toBeLessThan(html.indexOf("<section id=\"catalog-content\""));

    const partial = await app.request(`/admin/product-catalogus?categoryId=${parent.id}`, { headers: { "HX-Request": "true" } });
    expect(partial.status).toBe(200);
    const partialHtml = await partial.text();
    expect(partialHtml).not.toContain("aria-label=\"Breadcrumb\"");
    expect(partialHtml).toContain("category-accordion");
  });

  it("renders an empty state on category browse when there are no subcategories or direct products", async () => {
    const category = await createCategory(`Admin Empty Category ${crypto.randomUUID()}`, null);

    const response = await app.request(`/admin/product-catalogus?categoryId=${category.id}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<h2>${category.name}</h2>`);
    expect(html).toContain("Deze categorie is nu nog leeg.");
    expect(html).toContain("Maak een nieuwe subcategorie of een product aan om hem te vullen.");
    expect(html).not.toContain(`Producten in ${category.name}`);
    expect(html).not.toContain("Geen subcategorieën gevonden.");
    expect(html).toContain("Subcategorie aanmaken");
    expect(html).toContain("Product aanmaken");
  });

  it("does not render the category empty state when subcategories exist without direct products", async () => {
    const suffix = crypto.randomUUID();
    const parent = await createCategory(`Admin Empty Parent ${suffix}`, null);
    const child = await createCategory(`Admin Nested Child ${suffix}`, parent.id);

    const response = await app.request(`/admin/product-catalogus?categoryId=${parent.id}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<h2>${parent.name}</h2>`);
    expect(html).toContain(child.name);
    expect(html).not.toContain("Deze categorie is nu nog leeg.");
    expect(html).not.toContain(`Producten in ${parent.name}`);
    expect(html).toContain("Subcategorie aanmaken");
    expect(html).toContain("Product aanmaken");
  });

  it("renders product-detail with a clickable category breadcrumb from all categories", async () => {
    const suffix = crypto.randomUUID();
    const parent = await createCategory(`Detail Root ${suffix}`, null);
    const child = await createCategory(`Detail Child ${suffix}`, parent.id);
    const product = await createProduct({ name: `Detail Breadcrumb Product ${suffix}`, categoryId: child.id, brandId: null });

    const response = await app.request(`/admin/product-catalogus/${product.id}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Alle categorieën");
    expect(html).toContain("/admin/product-catalogus\">Alle categorieën</a>");
    expect(html).toContain(`/admin/product-catalogus?categoryId=${parent.id}`);
    expect(html).toContain(parent.name);
    expect(html).toContain(child.name);
  });

  it("creates a product from the HTML form with comma decimal input and redirects to detail", async () => {
    const productName = `Admin Form Product ${crypto.randomUUID()}`;
    const form = new FormData();
    form.set("name", productName);
    form.set("categoryId", String(testCatalog.categoryId));
    form.set("brandName", "");
    form.set("brandId", "");
    form.set("newBrandName", "");
    form.set("packageTypeId", String(testCatalog.packageTypeId));
    form.set("amount", "1,5");
    form.set("unitTypeId", String(testCatalog.unitTypeId));
    form.set("unitsPerPackage", "1");

    const response = await app.request("/admin/product-catalogus/nieuw", { method: "POST", body: form });
    expect(response.status).toBe(303);
    const location = response.headers.get("location");
    expect(location).toStartWith("/admin/product-catalogus/");

    const detail = await app.request(location ?? "");
    expect(detail.status).toBe(200);
    expect(await detail.text()).toContain(productName);
  });

  it("renders one brand field with HTMX create suggestions", async () => {
    const brandName = `Inline Merk ${crypto.randomUUID()}`;
    const formResponse = await app.request("/admin/product-catalogus/nieuw");
    expect(formResponse.status).toBe(200);
    const formHtml = await formResponse.text();
    expect(formHtml).toContain("Merk (optioneel)");
    expect(formHtml).toContain("name=\"brandName\"");
    expect(formHtml).not.toContain("Bestaand merk-id");
    expect(formHtml).not.toContain("Nieuw merk bevestigen");

    const suggestions = await app.request(`/admin/product-catalogus/merken/suggesties?brandName=${encodeURIComponent(brandName)}`, { headers: { "HX-Request": "true" } });
    expect(suggestions.status).toBe(200);
    const suggestionsHtml = await suggestions.text();
    expect(suggestionsHtml).toContain(`Merk “${brandName}” aanmaken`);

    const confirmed = await app.request(`/admin/product-catalogus/merken/nieuw-bevestigen?brandName=${encodeURIComponent(brandName)}`, { headers: { "HX-Request": "true" } });
    expect(confirmed.status).toBe(200);
    const confirmedHtml = await confirmed.text();
    expect(confirmedHtml).toContain("name=\"brandName\"");
    expect(confirmedHtml).toContain(`value=\"${brandName}\"`);
    expect(confirmedHtml).toContain("name=\"newBrandName\"");
  });

  it("creates a product with an inline confirmed new brand from the single brand field", async () => {
    const productName = `Admin Brand Product ${crypto.randomUUID()}`;
    const brandName = `Admin Inline Brand ${crypto.randomUUID()}`;
    const form = productFormData(productName);
    form.set("brandName", brandName);
    form.set("newBrandName", brandName);

    const response = await app.request("/admin/product-catalogus/nieuw", { method: "POST", body: form });
    expect(response.status).toBe(303);
    const detail = await app.request(response.headers.get("location") ?? "");
    expect(detail.status).toBe(200);
    const html = await detail.text();
    expect(html).toContain(productName);
    expect(html).toContain(brandName);
  });

  it("blocks an unknown brand name until it is confirmed inline", async () => {
    const form = productFormData(`Admin Unconfirmed Brand Product ${crypto.randomUUID()}`);
    form.set("brandName", `Onbevestigd Merk ${crypto.randomUUID()}`);

    const response = await app.request("/admin/product-catalogus/nieuw", { method: "POST", body: form });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Bevestig");
  });

  it("renders admin not-found states", async () => {
    const response = await app.request(`/admin/product-catalogus/${crypto.randomUUID()}`);
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("Product niet gevonden.");
  });
});

type BrandResponse = { readonly id: string; readonly name: string };
type CategoryResponse = { readonly id: number; readonly name: string; readonly parentId: number | null };
type CreatedProductResponse = { readonly id: string; readonly name: string };

async function createBrand(name: string): Promise<BrandResponse> {
  const response = await app.request("/brands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<BrandResponse>;
}

function productFormData(productName: string): FormData {
  const form = new FormData();
  form.set("name", productName);
  form.set("categoryId", String(testCatalog.categoryId));
  form.set("brandName", "");
  form.set("brandId", "");
  form.set("newBrandName", "");
  form.set("packageTypeId", String(testCatalog.packageTypeId));
  form.set("amount", "1,5");
  form.set("unitTypeId", String(testCatalog.unitTypeId));
  form.set("unitsPerPackage", "1");
  return form;
}

async function createCategory(name: string, parentId: number | null): Promise<CategoryResponse> {
  const response = await app.request("/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<CategoryResponse>;
}

async function createProduct(input: { readonly name: string; readonly categoryId: number; readonly brandId: string | null }): Promise<CreatedProductResponse> {
  const response = await app.request("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      categoryId: input.categoryId,
      brandId: input.brandId,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "1.5",
        unitTypeId: testCatalog.unitTypeId,
        unitsPerPackage: 1,
      },
    }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<CreatedProductResponse>;
}
