import { Hono, type Context } from "hono";
import { renderAdminStylesheet } from "./admin-css";
import { withCatalogState } from "./catalog-navigation";
import { AdminNotFound } from "./components/AdminNotFound/AdminNotFound";
import { AdminPage } from "./components/AdminPage/AdminPage";
import { CatalogFrameContents } from "./components/CatalogSearch/CatalogSearch";
import { BrandPicker, BrandSuggestions } from "./components/ProductForm/ProductForm";
import { RootCategoryAccordion } from "./components/CategoryTree/CategoryTree";
import { CategoryModal } from "./components/SubcategoryModal/SubcategoryModal";
import { createCatalogCategory, createProduct, createProductPackage, loadCatalogCategory, loadCatalogIndex, loadProductCreateForm, loadProductDetail, loadProductPackageDetail, loadCatalogReferenceData, loadRootCategoryAccordion, updateCatalogCategoryName, updateProduct, updateProductPackage } from "./services/product-catalog.service";
import { catalogOk } from "./helpers/product-catalog-result";
import { CatalogContextNotFound, DuplicateCategory, DuplicatePackage, DuplicateProduct, InvalidCatalogForm, InvalidCatalogQuery, PackageNotFound, ProductNotFound, ReferenceNotFound, type CatalogError, type CatalogResult } from "./models/product-catalog-result.model";
import type { ProductCreateModel } from "./models/product-create.model";
import { defaultProductFormValues, packageFormValuesFromDetail, packageValuesFromFormData, parseCatalogQuery, parseCategoryName, parsePackageForm, parseProductCreateQuery, parseProductEditForm, parseProductForm, productFormValuesFromDetail, productValuesFromFormData, type PackageFormValues } from "./form-parsing";
import { isHtmxRequest } from "./htmx";
import { findBrandById, findBrandByNormalizedName, searchBrands } from "../repositories/brands.repository";
import { PackageCreatePage } from "./pages/PackageCreatePage/PackageCreatePage";
import { PackageDetailPage } from "./pages/PackageDetailPage/PackageDetailPage";
import { ProductCreatePage } from "./pages/ProductCreatePage/ProductCreatePage";
import { ProductDetailPage } from "./pages/ProductDetailPage/ProductDetailPage";
import { CatalogIndexPage } from "./pages/CatalogIndexPage/CatalogIndexPage";

/** Construct all server-rendered admin routes. */
export function adminRoutes() {
  const router = new Hono();

  router.get("/assets/admin.css", async (c) => c.text(await renderAdminStylesheet(), 200, { "Content-Type": "text/css; charset=utf-8" }));
  router.get("/assets/htmx.min.js", async (c) => c.text(await Bun.file(new URL("../../node_modules/htmx.org/dist/htmx.min.js", import.meta.url)).text(), 200, { "Content-Type": "application/javascript; charset=utf-8" }));

  router.get("/", (c) => c.redirect("/admin/product-catalogus", 302));

  const renderCatalogIndex = async (c: Context) => {
    const state = parseQuery(() => parseCatalogQuery(new URL(c.req.url)));
    if (state === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const result = loadCatalogIndex(state);
    if (!result.ok) return renderCatalogError(c, result.error);
    if (isHtmxRequest(c)) return c.html(<CatalogFrameContents model={result.value} />);
    return c.html(<CatalogIndexPage model={result.value} />);
  };

  router.get("/product-catalogus", renderCatalogIndex);
  router.get("/product-catalogus/", renderCatalogIndex);

  router.get("/product-catalogus/merken/suggesties", (c) => {
    const brandName = c.req.query("brandName") ?? "";
    const brands = searchBrands(brandName);
    const exactMatch = findBrandByNormalizedName(brandName) !== undefined;
    return c.html(<BrandSuggestions brandName={brandName} brands={brands} exactMatch={exactMatch} />);
  });

  router.get("/product-catalogus/merken/selecteren", (c) => {
    const brandId = c.req.query("brandId") ?? "";
    const selectedBrand = findBrandById(brandId);
    if (!selectedBrand) return c.html(<BrandPicker values={{ brandName: "", brandId: "", newBrandName: "" }} error="Merk niet gevonden." status={null} />, 404);
    return c.html(<BrandPicker values={{ brandName: selectedBrand.name, brandId: selectedBrand.id, newBrandName: "" }} error={undefined} status={`Gekozen bestaand merk: ${selectedBrand.name}`} />);
  });

  router.get("/product-catalogus/merken/nieuw-bevestigen", (c) => {
    const brandName = (c.req.query("brandName") ?? "").trim();
    if (brandName.length < 2) return c.html(<BrandPicker values={{ brandName, brandId: "", newBrandName: "" }} error="Typ minimaal 2 tekens voor een nieuw merk." status={null} />, 400);
    return c.html(<BrandPicker values={{ brandName, brandId: "", newBrandName: brandName }} error={undefined} status={`Nieuw merk wordt aangemaakt: ${brandName}`} />);
  });

  router.get("/product-catalogus/categorieen/nieuw", (c) => {
    return c.html(<CategoryModal _tag="RootCategory" errors={{}} value="" />);
  });

  router.get("/product-catalogus/categorieen/:categoryId/uitklappen", async (c) => {
    const categoryId = parseRouteCategoryId(c);
    if (categoryId === null) return renderCatalogError(c, new InvalidCatalogQuery("categoryId", "Categorie is ongeldig."));
    const state = parseQuery(() => parseCatalogQuery(new URL(c.req.url)));
    if (state === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const openedCategoryId = new URL(c.req.url).searchParams.get("open") === "0" ? null : categoryId;
    const result = loadRootCategoryAccordion({ categoryId: openedCategoryId, limit: state.limit });
    if (!result.ok) return renderCatalogError(c, result.error);
    return c.html(<RootCategoryAccordion model={result.value} />);
  });

  router.post("/product-catalogus/categorieen/nieuw", async (c) => {
    const formData = await c.req.raw.formData();
    try {
      const name = parseCategoryName(formData);
      const result = createCatalogCategory({ name, parentId: null });
      if (!result.ok) {
        if (result.error instanceof DuplicateCategory) return c.html(<CategoryModal _tag="RootCategory" errors={{ name: result.error.message }} value={name} />, 409);
        if (result.error instanceof InvalidCatalogForm) return c.html(<CategoryModal _tag="RootCategory" errors={result.error.fields} value={name} />, 400);
        return renderCatalogError(c, result.error);
      }
      const redirectTo = "/admin/product-catalogus";
      if (isHtmxRequest(c)) return new Response(null, { status: 204, headers: { "HX-Redirect": redirectTo } });
      return c.redirect(redirectTo, 303);
    } catch (error) {
      if (error instanceof InvalidCatalogForm) return c.html(<CategoryModal _tag="RootCategory" errors={error.fields} value="" />, 400);
      throw error;
    }
  });

  router.get("/product-catalogus/categorieen/:categoryId/subcategorie/nieuw", async (c) => {
    const categoryId = Number(c.req.param("categoryId"));
    const result = loadCatalogIndex({ q: "", brandId: undefined, categoryId, limit: 50 });
    if (!result.ok) return renderCatalogError(c, result.error);
    const category = result.value.browse?.state === "category" ? result.value.browse.category : null;
    if (category === null) return renderCatalogError(c, new CatalogContextNotFound("category", String(categoryId)));
    return c.html(<CategoryModal _tag="Subcategory" parentId={category.id} parentName={category.name} errors={{}} value="" />);
  });

  router.post("/product-catalogus/categorieen/:categoryId/subcategorie/nieuw", async (c) => {
    const parentId = Number(c.req.param("categoryId"));
    const formData = await c.req.raw.formData();
    try {
      const name = parseCategoryName(formData);
      const result = createCatalogCategory({ name, parentId });
      if (!result.ok) {
        if (result.error instanceof DuplicateCategory) return c.html(<CategoryModal _tag="Subcategory" parentId={parentId} parentName="deze categorie" errors={{ name: result.error.message }} value={name} />, 409);
        if (result.error instanceof InvalidCatalogForm) return c.html(<CategoryModal _tag="Subcategory" parentId={parentId} parentName="deze categorie" errors={result.error.fields} value={name} />, 400);
        return renderCatalogError(c, result.error);
      }
      const redirectTo = `/admin/product-catalogus?categoryId=${parentId}`;
      if (isHtmxRequest(c)) return new Response(null, { status: 204, headers: { "HX-Redirect": redirectTo } });
      return c.redirect(redirectTo, 303);
    } catch (error) {
      if (error instanceof InvalidCatalogForm) return c.html(<CategoryModal _tag="Subcategory" parentId={parentId} parentName="deze categorie" errors={error.fields} value="" />, 400);
      throw error;
    }
  });

  router.get("/product-catalogus/categorieen/:categoryId/bewerken", async (c) => {
    const categoryId = parseRouteCategoryId(c);
    if (categoryId === null) return renderCatalogError(c, new InvalidCatalogQuery("categoryId", "Categorie is ongeldig."));
    const result = loadCatalogCategory(categoryId);
    if (!result.ok) return renderCatalogError(c, result.error);
    const modal = <CategoryModal _tag="EditCategory" categoryId={result.value.id} parentId={result.value.parentId} errors={{}} value={result.value.name} />;
    if (isHtmxRequest(c)) return c.html(modal);
    return c.html(<AdminPage title="Categorie bewerken">{modal}</AdminPage>);
  });

  router.post("/product-catalogus/categorieen/:categoryId/bewerken", async (c) => {
    const categoryId = parseRouteCategoryId(c);
    if (categoryId === null) return renderCatalogError(c, new InvalidCatalogQuery("categoryId", "Categorie is ongeldig."));
    const categoryResult = loadCatalogCategory(categoryId);
    if (!categoryResult.ok) return renderCatalogError(c, categoryResult.error);
    const formData = await c.req.raw.formData();
    try {
      const name = parseCategoryName(formData);
      const result = updateCatalogCategoryName({ id: categoryId, name });
      if (!result.ok) {
        if (result.error instanceof DuplicateCategory) return c.html(<CategoryModal _tag="EditCategory" categoryId={categoryId} parentId={categoryResult.value.parentId} errors={{ name: result.error.message }} value={name} />, 409);
        if (result.error instanceof InvalidCatalogForm) return c.html(<CategoryModal _tag="EditCategory" categoryId={categoryId} parentId={categoryResult.value.parentId} errors={result.error.fields} value={name} />, 400);
        return renderCatalogError(c, result.error);
      }
      const redirectTo = categoryListHref(categoryResult.value.parentId);
      if (isHtmxRequest(c)) return new Response(null, { status: 204, headers: { "HX-Redirect": redirectTo } });
      return c.redirect(redirectTo, 303);
    } catch (error) {
      if (error instanceof InvalidCatalogForm) return c.html(<CategoryModal _tag="EditCategory" categoryId={categoryId} parentId={categoryResult.value.parentId} errors={error.fields} value="" />, 400);
      throw error;
    }
  });

  router.get("/product-catalogus/nieuw", async (c) => {
    const context = parseQuery(() => parseProductCreateQuery(new URL(c.req.url)));
    if (context === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const catalogState = parseQuery(() => parseCatalogQuery(new URL(c.req.url)));
    if (catalogState === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const result = loadProductCreateForm(context);
    if (!result.ok) return renderCatalogError(c, result.error);
    const values = defaultProductFormValues({ categoryId: result.value.selectedCategoryId, brand: result.value.selectedBrand });
    return c.html(<ProductCreatePage references={result.value} values={values} errors={{}} catalogState={catalogState} />);
  });

  router.post("/product-catalogus/nieuw", async (c) => {
    const catalogState = parseQuery(() => parseCatalogQuery(new URL(c.req.url)));
    if (catalogState === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const referencesResult = loadProductCreateForm({ brandId: undefined, categoryId: undefined });
    if (!referencesResult.ok) return renderCatalogError(c, referencesResult.error);
    const values = productValuesFromFormData(await c.req.raw.formData());
    try {
      const input = parseProductForm(values);
      const result = createProduct(input);
      if (!result.ok) return c.html(<ProductCreatePage references={referencesResult.value} values={values} errors={formErrorsFromCatalogError(result.error)} catalogState={catalogState} />, statusFromCatalogError(result.error));
      return c.redirect(withCatalogState(`/admin/product-catalogus/${result.value.id}`, catalogState), 303);
    } catch (error) {
      if (error instanceof InvalidCatalogForm) return c.html(<ProductCreatePage references={referencesResult.value} values={values} errors={error.fields} catalogState={catalogState} />, 400);
      throw error;
    }
  });

  router.get("/product-catalogus/:productId/verpakkingen/nieuw", async (c) => {
    const catalogState = parseQuery(() => parseCatalogQuery(new URL(c.req.url)));
    if (catalogState === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const productResult = loadProductDetail(c.req.param("productId"));
    if (!productResult.ok) return renderCatalogError(c, productResult.error);
    const references = loadCatalogReferenceData();
    if (!references.ok) return renderCatalogError(c, references.error);
    return c.html(<PackageCreatePage product={productResult.value} references={references.value} values={defaultPackageValues()} errors={{}} catalogState={catalogState} />);
  });

  router.post("/product-catalogus/:productId/verpakkingen/nieuw", async (c) => {
    const catalogState = parseQuery(() => parseCatalogQuery(new URL(c.req.url)));
    if (catalogState === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const productId = c.req.param("productId");
    const productResult = loadProductDetail(productId);
    if (!productResult.ok) return renderCatalogError(c, productResult.error);
    const references = loadCatalogReferenceData();
    if (!references.ok) return renderCatalogError(c, references.error);
    const values = packageValuesFromFormData(await c.req.raw.formData());
    try {
      const input = parsePackageForm(values);
      const result = createProductPackage(productId, input);
      if (!result.ok) return c.html(<PackageCreatePage product={productResult.value} references={references.value} values={values} errors={formErrorsFromCatalogError(result.error)} catalogState={catalogState} />, statusFromCatalogError(result.error));
      return c.redirect(withCatalogState(`/admin/product-catalogus/${productId}/verpakkingen/${result.value.id}`, catalogState), 303);
    } catch (error) {
      if (error instanceof InvalidCatalogForm) return c.html(<PackageCreatePage product={productResult.value} references={references.value} values={values} errors={error.fields} catalogState={catalogState} />, 400);
      throw error;
    }
  });

  router.get("/product-catalogus/:productId/verpakkingen/:packageId", async (c) => {
    const catalogState = parseQuery(() => parseCatalogQuery(new URL(c.req.url)));
    if (catalogState === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const productResult = loadProductDetail(c.req.param("productId"));
    if (!productResult.ok) return renderCatalogError(c, productResult.error);
    const packageResult = loadProductPackageDetail(c.req.param("productId"), c.req.param("packageId"));
    if (!packageResult.ok) return renderCatalogError(c, packageResult.error, c.req.param("productId"));
    if (new URL(c.req.url).searchParams.get("edit") === "1") {
      const references = loadCatalogReferenceData();
      if (!references.ok) return renderCatalogError(c, references.error);
      return c.html(<PackageDetailPage product={productResult.value} productPackage={packageResult.value} edit={true} references={references.value} values={packageFormValuesFromDetail(packageResult.value)} errors={{}} catalogState={catalogState} />);
    }
    return c.html(<PackageDetailPage product={productResult.value} productPackage={packageResult.value} edit={false} references={null} values={null} errors={{}} catalogState={catalogState} />);
  });

  router.post("/product-catalogus/:productId/verpakkingen/:packageId", async (c) => {
    const catalogState = parseQuery(() => parseCatalogQuery(new URL(c.req.url)));
    if (catalogState === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const productId = c.req.param("productId");
    const packageId = c.req.param("packageId");
    const productResult = loadProductDetail(productId);
    if (!productResult.ok) return renderCatalogError(c, productResult.error);
    const packageResult = loadProductPackageDetail(productId, packageId);
    if (!packageResult.ok) return renderCatalogError(c, packageResult.error, productId);
    const references = loadCatalogReferenceData();
    if (!references.ok) return renderCatalogError(c, references.error);
    const values = packageValuesFromFormData(await c.req.raw.formData());
    try {
      const input = parsePackageForm(values);
      const result = updateProductPackage(productId, packageId, input);
      if (!result.ok) return c.html(<PackageDetailPage product={productResult.value} productPackage={packageResult.value} edit={true} references={references.value} values={values} errors={formErrorsFromCatalogError(result.error)} catalogState={catalogState} />, statusFromCatalogError(result.error));
      return c.redirect(withCatalogState(`/admin/product-catalogus/${productId}/verpakkingen/${packageId}`, catalogState), 303);
    } catch (error) {
      if (error instanceof InvalidCatalogForm) return c.html(<PackageDetailPage product={productResult.value} productPackage={packageResult.value} edit={true} references={references.value} values={values} errors={error.fields} catalogState={catalogState} />, 400);
      throw error;
    }
  });

  router.get("/product-catalogus/:productId", async (c) => {
    const catalogState = parseQuery(() => parseCatalogQuery(new URL(c.req.url)));
    if (catalogState === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const productResult = loadProductDetail(c.req.param("productId"));
    if (!productResult.ok) return renderCatalogError(c, productResult.error);
    if (new URL(c.req.url).searchParams.get("edit") === "product") {
      const referencesResult = loadProductEditReferences(productResult.value);
      if (!referencesResult.ok) return renderCatalogError(c, referencesResult.error);
      return c.html(<ProductDetailPage product={productResult.value} edit={true} references={referencesResult.value} values={productFormValuesFromDetail(productResult.value)} errors={{}} catalogState={catalogState} />);
    }
    return c.html(<ProductDetailPage product={productResult.value} edit={false} references={null} values={null} errors={{}} catalogState={catalogState} />);
  });

  router.post("/product-catalogus/:productId", async (c) => {
    const catalogState = parseQuery(() => parseCatalogQuery(new URL(c.req.url)));
    if (catalogState === null) return renderCatalogError(c, new InvalidCatalogQuery("query", "Query is ongeldig."));
    const productId = c.req.param("productId");
    const productResult = loadProductDetail(productId);
    if (!productResult.ok) return renderCatalogError(c, productResult.error);
    const referencesResult = loadProductEditReferences(productResult.value);
    if (!referencesResult.ok) return renderCatalogError(c, referencesResult.error);
    const values = productValuesFromFormData(await c.req.raw.formData());
    try {
      const input = parseProductEditForm(values);
      const result = updateProduct(productId, input);
      if (!result.ok) return c.html(<ProductDetailPage product={productResult.value} edit={true} references={referencesResult.value} values={values} errors={formErrorsFromCatalogError(result.error)} catalogState={catalogState} />, statusFromCatalogError(result.error));
      return c.redirect(withCatalogState(`/admin/product-catalogus/${productId}`, catalogState), 303);
    } catch (error) {
      if (error instanceof InvalidCatalogForm) return c.html(<ProductDetailPage product={productResult.value} edit={true} references={referencesResult.value} values={values} errors={error.fields} catalogState={catalogState} />, 400);
      throw error;
    }
  });

  return router;
}

function loadProductEditReferences(product: { readonly category: { readonly id: number }; readonly brand: { readonly id: string; readonly name: string } | null }): CatalogResult<ProductCreateModel> {
  const references = loadCatalogReferenceData();
  if (!references.ok) return references;
  return catalogOk({
    ...references.value,
    selectedBrand: product.brand,
    selectedCategoryId: product.category.id,
  });
}


function renderCatalogError(c: Context, error: CatalogError, productId?: string) {
  if (error instanceof ProductNotFound || error instanceof CatalogContextNotFound || error instanceof ReferenceNotFound || error instanceof InvalidCatalogQuery) {
    return c.html(<AdminPage title="Niet gevonden"><AdminNotFound message={notFoundMessage(error)} backHref="/admin/product-catalogus" backLabel="Terug naar productcatalogus" /></AdminPage>, 404);
  }
  if (error instanceof PackageNotFound) {
    const backHref = productId ? `/admin/product-catalogus/${productId}` : "/admin/product-catalogus";
    return c.html(<AdminPage title="Niet gevonden"><AdminNotFound message="Verpakking niet gevonden." backHref={backHref} backLabel="Terug naar product" /></AdminPage>, 404);
  }
  return c.html(<AdminPage title="Fout"><AdminNotFound message={error.message} backHref="/admin/product-catalogus" backLabel="Terug naar productcatalogus" /></AdminPage>, statusFromCatalogError(error));
}

function formErrorsFromCatalogError(error: CatalogError): Readonly<Record<string, string>> {
  if (error instanceof InvalidCatalogForm) return error.fields;
  if (error instanceof DuplicateProduct) return { form: error.message };
  if (error instanceof DuplicatePackage) return { form: error.message };
  if (error instanceof DuplicateCategory) return { name: error.message };
  if (error instanceof ReferenceNotFound) return { form: error.message };
  return { form: error.message };
}

function statusFromCatalogError(error: CatalogError): 400 | 404 | 409 {
  if (error instanceof DuplicateProduct || error instanceof DuplicatePackage || error instanceof DuplicateCategory) return 409;
  if (error instanceof ProductNotFound || error instanceof PackageNotFound || error instanceof CatalogContextNotFound) return 404;
  return 400;
}

function defaultPackageValues(): PackageFormValues {
  return { packageTypeId: "", amount: "", unitTypeId: "", unitsPerPackage: "1" };
}

function parseRouteCategoryId(c: Context): number | null {
  const categoryId = Number(c.req.param("categoryId"));
  return Number.isInteger(categoryId) && categoryId >= 1 ? categoryId : null;
}

function categoryListHref(parentId: number | null): string {
  return parentId === null ? "/admin/product-catalogus" : `/admin/product-catalogus?categoryId=${parentId}`;
}

function notFoundMessage(error: ProductNotFound | CatalogContextNotFound | ReferenceNotFound | InvalidCatalogQuery): string {
  if (error instanceof CatalogContextNotFound && error.contextType === "category") return "Categorie niet gevonden.";
  if (error instanceof InvalidCatalogQuery && error.field === "categoryId") return "Categorie niet gevonden.";
  return "Product niet gevonden.";
}

function parseQuery<T>(parser: () => T): T | null {
  try {
    return parser();
  } catch (error) {
    if (error instanceof InvalidCatalogQuery) return null;
    throw error;
  }
}
