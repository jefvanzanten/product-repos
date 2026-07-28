import type { Route } from "./+types/product-detail";
import type { ProductDetailDto } from "@product-repos/contracts";
import { useEffect, useMemo, useState } from "react";
import { Form, Link, redirect, useFetcher, useNavigation, useSearchParams } from "react-router";
import { buildCategoryTreeOptions, formatCategoryOption } from "../../../../features/admin/product-catalog/categoryTree";
import { createBrand, createCategory, getBrands, getCategories, getProductDetail, mapApiError, updateProduct } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import type { BrandDto, CategoryDto, FormErrors } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import styles from "./product-detail.module.css";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Productdetail" }];
}

type SubmittedValues = Record<string, string>;
type ActionResult = { readonly createdCategory?: CategoryDto; readonly errors?: FormErrors; readonly values?: SubmittedValues };

export async function loader({ params, request }: Route.LoaderArgs) {
  const productId = params.productId;
  if (!productId) return { brandQuery: "", brands: [], categories: [], product: null };

  const product = await getProductDetail(productId);
  if (!product) return { brandQuery: "", brands: [], categories: [], product: null };

  const url = new URL(request.url);
  const brandQuery = url.searchParams.get("merk")?.trim() ?? "";
  const searchedBrands = brandQuery.length >= 2 ? await getBrands(brandQuery) : [];

  return {
    brandQuery,
    brands: dedupeBrands(product.brand ? [product.brand, ...searchedBrands] : searchedBrands),
    categories: await getCategories(),
    product,
  };
}

export async function action({ params, request }: Route.ActionArgs): Promise<ActionResult | Response> {
  const productId = params.productId;
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  if (!productId) return { errors: { form: "Product ontbreekt." }, values };

  try {
    const intent = String(form.get("_action") ?? "updateProduct");
    if (intent === "createCategory") {
      const categoryName = String(form.get("categoryName") ?? "").trim();
      if (!categoryName) return { errors: { categoryName: "Vul een categorienaam in." }, values };
      const parentRaw = String(form.get("categoryParentId") ?? "");
      const createdCategory = await createCategory({ name: categoryName, parentId: parentRaw ? Number(parentRaw) : null });
      return { createdCategory, values: { ...values, categoryId: String(createdCategory.id), categoryParentId: parentRaw } };
    }

    const productName = String(form.get("productName") ?? "").trim();
    const categoryId = Number(form.get("categoryId"));
    const brandQuery = String(form.get("brandQuery") ?? "").trim();
    let brandId = String(form.get("brandId") ?? "").trim() || null;
    const brandName = String(form.get("brandName") ?? "").trim();
    if (brandQuery && !brandId && !brandName) return { errors: { brandName: "Kies een suggestie of maak het merk aan met de plus-optie." }, values };
    if (brandName) {
      const brand = await createBrand({ name: brandName });
      brandId = brand.id;
    }
    const updated = await updateProduct(productId, { name: productName, categoryId, brandId });
    return redirect(`/admin/product-catalogus/producten/${updated.id}`);
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}

export default function ProductDetail({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  const product = loaderData.product;
  const [searchParams] = useSearchParams();
  if (!product) return <ProductNotFound />;

  const editMode = searchParams.get("edit") === "1" || actionData?.errors !== undefined;
  const categoryPath = formatCategoryPath(product.categoryPath);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to="/admin/product-catalogus/producten">← Terug naar productcatalogus</Link>
        <div>
          <h1 className={styles.title}>{product.displayName}</h1>
          <CategoryBreadcrumb categoryPath={product.categoryPath} />
        </div>
      </header>

      <section className={styles.card} aria-labelledby="productgegevens-title">
        <div className={styles.sectionHeader}>
          <h2 id="productgegevens-title" className={styles.sectionTitle}>Productgegevens</h2>
          {editMode ? null : <Link className={styles.actionButton} to="?edit=1">Product bewerken</Link>}
        </div>
        {editMode
          ? <ProductEditForm actionData={actionData} brands={loaderData.brands} brandQuery={loaderData.brandQuery} categories={loaderData.categories} product={product} />
          : <ProductReadOnly categoryPath={categoryPath} product={product} />}
      </section>

      <section className={styles.card} aria-labelledby="verpakkingen-title">
        <div className={styles.sectionHeader}>
          <h2 id="verpakkingen-title" className={styles.sectionTitle}>Verpakkingen</h2>
          <Link className={styles.actionButton} to={`/admin/product-catalogus/producten/${product.id}/verpakkingen/nieuw`}>Verpakking toevoegen</Link>
        </div>
        {product.packages.length === 0 ? <EmptyPackages productId={product.id} /> : <PackageList product={product} />}
      </section>
    </main>
  );
}

function ProductEditForm({ actionData, brands, brandQuery, categories, product }: { readonly actionData?: ActionResult; readonly brands: ReadonlyArray<BrandDto>; readonly brandQuery: string; readonly categories: ProductDetailDto["categoryPath"]; readonly product: ProductDetailDto }): React.ReactNode {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const values = actionData?.values ?? productToValues(product, brandQuery);
  const categoryOptions = useMemo(() => buildCategoryTreeOptions(categories), [categories]);
  const errors = actionData?.errors ?? {};

  return (
    <Form className={styles.form} method="post" preventScrollReset>
      {errors.form ? <p className={styles.formError}>{errors.form}</p> : null}
      <CategoryInlineSelect defaultValue={values.categoryId} error={errors.categoryId ?? errors.categoryName} options={categoryOptions} />
      <BrandCombobox defaultBrandId={values.brandId} defaultBrandName={values.brandName} defaultQuery={values.brandQuery} error={errors.brandName ?? errors.brandId} initialBrands={brands} />
      <TextInput defaultValue={values.productName} error={errors.productName ?? errors.name} label="Productnaam" name="productName" placeholder="Bijv. Zero Sugar" />
      <div className={styles.buttonRow}>
        <button className={styles.submitButton} disabled={busy} type="submit">{busy ? "Opslaan..." : "Opslaan"}</button>
        <Link className={styles.secondaryButton} to={`/admin/product-catalogus/producten/${product.id}`}>Annuleren</Link>
      </div>
    </Form>
  );
}

function CategoryBreadcrumb({ categoryPath }: { readonly categoryPath: ProductDetailDto["categoryPath"] }): React.ReactNode {
  return (
    <nav aria-label="Categoriepad" className={styles.breadcrumb}>
      <ol className={styles.breadcrumbList}>
        <li className={styles.breadcrumbItem}>
          <Link className={styles.breadcrumbLink} to="/admin/product-catalogus/producten">Alle categorieën</Link>
        </li>
        {categoryPath.map((category) => (
          <li className={styles.breadcrumbItem} key={category.id}>
            <Link className={styles.breadcrumbLink} to={`/admin/product-catalogus/producten?categoryId=${category.id}`}>{category.name}</Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ProductReadOnly({ categoryPath, product }: { readonly categoryPath: string; readonly product: ProductDetailDto }): React.ReactNode {
  return (
    <dl className={styles.detailsList}>
      <DetailRow label="Categorie" value={categoryPath} />
      <DetailRow label="Merk" value={product.brand?.name ?? "-"} />
      <DetailRow label="Productnaam" value={product.name} />
      <DetailRow label="Weergavenaam" value={product.displayName} />
    </dl>
  );
}

function ProductNotFound(): React.ReactNode {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Product niet gevonden.</h1>
        <Link className={styles.backLink} to="/admin/product-catalogus/producten">← Terug naar productcatalogus</Link>
      </section>
    </main>
  );
}

function EmptyPackages({ productId }: { readonly productId: string }): React.ReactNode {
  return (
    <div className={styles.emptyStack}>
      <p className={styles.emptyState}>Geen verpakkingen gevonden voor dit product.</p>
      <Link className={styles.backLink} to={`/admin/product-catalogus/producten/${productId}/verpakkingen/nieuw`}>Verpakking toevoegen</Link>
    </div>
  );
}

function PackageList({ product }: { readonly product: ProductDetailDto }): React.ReactNode {
  return (
    <ul className={styles.packageList}>
      {product.packages.map((productPackage) => (
        <li key={productPackage.id} className={styles.packageItem}>
          <div>
            <p className={styles.packageSummary}>{productPackage.summary}</p>
            <p className={styles.packageMeta}>{productPackage.packageType.name} · {productPackage.unitContent.amount} {productPackage.unitContent.unitType.name} · {productPackage.unitsPerPackage} per verpakking</p>
          </div>
          <Link className={styles.packageLink} to={`/admin/product-catalogus/producten/${product.id}/verpakkingen/${productPackage.id}`}>Bekijk verpakking</Link>
        </li>
      ))}
    </ul>
  );
}

type BrandLookupData = {
  readonly brandQuery: string;
  readonly brands: ReadonlyArray<BrandDto>;
};

type BrandLookupResultsByQuery = ReadonlyMap<string, ReadonlyArray<BrandDto>>;

function CategoryInlineSelect({ defaultValue, error, options }: { readonly defaultValue?: string; readonly error?: string; readonly options: ReturnType<typeof buildCategoryTreeOptions> }): React.ReactNode {
  const fetcher = useFetcher<ActionResult>();
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultValue ?? "");
  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlineName, setInlineName] = useState("");
  const [inlineParentId, setInlineParentId] = useState(defaultValue ?? "");
  const createdCategory = fetcher.data?.createdCategory;
  const busy = fetcher.state !== "idle";

  useEffect(() => setSelectedCategoryId(defaultValue ?? ""), [defaultValue]);
  useEffect(() => {
    if (!createdCategory) return;
    setSelectedCategoryId(String(createdCategory.id));
    setInlineParentId(String(createdCategory.parentId ?? ""));
    setInlineName("");
    setInlineOpen(false);
  }, [createdCategory]);

  const submitInlineCategory = (): void => {
    const formData = new FormData();
    formData.set("_action", "createCategory");
    formData.set("categoryName", inlineName);
    formData.set("categoryParentId", inlineParentId);
    fetcher.submit(formData, { method: "post" });
  };

  const categoryOptions = createdCategory && !options.some((option) => option.category.id === createdCategory.id)
    ? [...options, { category: createdCategory, depth: 0, path: createdCategory.name }]
    : options;

  return (
    <div className={styles.inlineCreateBlock}>
      <label className={styles.textLabel}>Categorie
        <select className={styles.select} name="categoryId" value={selectedCategoryId} required onChange={(event) => setSelectedCategoryId(event.currentTarget.value)}>
          <option value="">Kies een categorie</option>
          {categoryOptions.map((option) => <option key={option.category.id} value={option.category.id}>{formatCategoryOption(option)}</option>)}
        </select>
      </label>
      {inlineOpen ? (
        <div className={styles.inlineCreatePanel}>
          <label className={styles.textLabel}>Nieuwe categorie
            <input className={styles.textInput} placeholder="Bijv. Cola" value={inlineName} onChange={(event) => setInlineName(event.currentTarget.value)} />
          </label>
          <label className={styles.textLabel}>Onder categorie
            <select className={styles.select} value={inlineParentId} onChange={(event) => setInlineParentId(event.currentTarget.value)}>
              <option value="">Hoofdcategorie</option>
              {options.map((option) => <option key={option.category.id} value={option.category.id}>{formatCategoryOption(option)}</option>)}
            </select>
          </label>
          <div className={styles.buttonRow}>
            <button className={styles.secondaryButton} disabled={busy} type="button" onClick={submitInlineCategory}>{busy ? "Toevoegen..." : "Categorie toevoegen"}</button>
            <button className={styles.secondaryButton} type="button" onClick={() => setInlineOpen(false)}>Annuleren</button>
          </div>
        </div>
      ) : <button className={styles.secondaryButton} type="button" onClick={() => setInlineOpen(true)}>+ Categorie aanmaken</button>}
      {fetcher.data?.errors?.categoryName ? <span className={styles.errorText}>{fetcher.data.errors.categoryName}</span> : null}
      {fetcher.data?.errors?.form ? <span className={styles.errorText}>{fetcher.data.errors.form}</span> : null}
      {error ? <span className={styles.errorText}>{error}</span> : null}
    </div>
  );
}

function BrandCombobox({ defaultBrandId, defaultBrandName, defaultQuery, error, initialBrands }: { readonly defaultBrandId?: string; readonly defaultBrandName?: string; readonly defaultQuery?: string; readonly error?: string; readonly initialBrands: ReadonlyArray<BrandDto> }): React.ReactNode {
  const fetcher = useFetcher<BrandLookupData>();
  const [inputValue, setInputValue] = useState(defaultBrandName || defaultQuery || findBrandNameById(initialBrands, defaultBrandId) || "");
  const [selectedBrandId, setSelectedBrandId] = useState(defaultBrandName ? "" : (defaultBrandId ?? ""));
  const [newBrandName, setNewBrandName] = useState(defaultBrandName ?? "");
  const [open, setOpen] = useState(false);
  const [brandLookupResultsByQuery, setBrandLookupResultsByQuery] = useState<BrandLookupResultsByQuery>(() => new Map());
  const trimmedInput = inputValue.trim();
  const fetchedBrandsForInput = brandLookupResultsByQuery.get(trimmedInput);
  const suggestions = useMemo(() => {
    if (!trimmedInput) return [];
    return dedupeBrands(fetchedBrandsForInput ?? filterBrandSuggestions(initialBrands, trimmedInput));
  }, [fetchedBrandsForInput, initialBrands, trimmedInput]);
  const hasExactSuggestion = suggestions.some((brand) => normalizeBrandName(brand.name) === normalizeBrandName(trimmedInput));
  const showSuggestionBox = open && trimmedInput.length > 0;
  const isLookingUpSuggestions = showSuggestionBox && fetchedBrandsForInput === undefined;
  const canCreateNewBrand = !isLookingUpSuggestions && !hasExactSuggestion;

  useEffect(() => {
    setInputValue(defaultBrandName || defaultQuery || findBrandNameById(initialBrands, defaultBrandId) || "");
    setSelectedBrandId(defaultBrandName ? "" : (defaultBrandId ?? ""));
    setNewBrandName(defaultBrandName ?? "");
  }, [defaultBrandId, defaultBrandName, defaultQuery, initialBrands]);

  useEffect(() => {
    const lookupData = fetcher.data;
    if (!lookupData) return;
    setBrandLookupResultsByQuery((current) => addBrandLookupResult(current, lookupData.brandQuery, lookupData.brands));
  }, [fetcher.data]);

  useEffect(() => {
    if (!open || !trimmedInput || fetchedBrandsForInput !== undefined) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ merk: trimmedInput });
      fetcher.load(`/admin/brand-lookup?${params.toString()}`);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [fetchedBrandsForInput, fetcher, open, trimmedInput]);

  const clearSelectedBrand = (value: string): void => {
    setInputValue(value);
    setSelectedBrandId("");
    setNewBrandName("");
    setOpen(true);
  };

  const selectExistingBrand = (brand: BrandDto): void => {
    setInputValue(brand.name);
    setSelectedBrandId(brand.id);
    setNewBrandName("");
    setOpen(false);
  };

  const selectNewBrand = (): void => {
    if (!trimmedInput) return;
    setInputValue(trimmedInput);
    setSelectedBrandId("");
    setNewBrandName(trimmedInput);
    setOpen(false);
  };

  return (
    <div className={styles.brandCombobox} onBlur={(event) => { const nextFocus = event.relatedTarget; if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) return; setOpen(false); }}>
      <label className={styles.textLabel}>Merk<input aria-autocomplete="list" aria-expanded={showSuggestionBox} autoComplete="off" className={styles.textInput} name="brandQuery" placeholder="Typ om merken te zoeken, bijv. Coca-Cola" type="text" value={inputValue} onChange={(event) => clearSelectedBrand(event.currentTarget.value)} onFocus={() => setOpen(true)} /></label>
      <input name="brandId" type="hidden" value={selectedBrandId} />
      <input name="brandName" type="hidden" value={newBrandName} />
      {showSuggestionBox ? (
        <div className={styles.suggestions} role="listbox">
          {suggestions.map((brand) => <button key={brand.id} className={styles.suggestionButton} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectExistingBrand(brand)}>{brand.name}</button>)}
          {isLookingUpSuggestions ? <p className={styles.lookupStatus}>Merken zoeken...</p> : null}
          {canCreateNewBrand ? <button className={styles.createBrandButton} type="button" onMouseDown={(event) => event.preventDefault()} onClick={selectNewBrand}>+ Maak “{trimmedInput}” aan als nieuw merk</button> : null}
        </div>
      ) : null}
      {selectedBrandId ? <p className={styles.statusText}>Geselecteerd merk: {inputValue}</p> : null}
      {newBrandName ? <p className={styles.statusText}>Nieuw merk wordt aangemaakt: {newBrandName}</p> : null}
      {!selectedBrandId && !newBrandName && trimmedInput ? <p className={styles.hintText}>Kies een suggestie of gebruik de plus-optie onderaan.</p> : null}
      {error ? <span className={styles.errorText}>{error}</span> : null}
    </div>
  );
}

function addBrandLookupResult(current: BrandLookupResultsByQuery, query: string, brands: ReadonlyArray<BrandDto>): BrandLookupResultsByQuery {
  if (!query.trim()) return current;
  const existingBrands = current.get(query);
  if (existingBrands === brands) return current;
  const next = new Map(current);
  next.set(query, brands);
  return next;
}

function findBrandNameById(brands: ReadonlyArray<BrandDto>, brandId: string | undefined): string | undefined {
  if (!brandId) return undefined;
  return brands.find((brand) => brand.id === brandId)?.name;
}

function filterBrandSuggestions(brands: ReadonlyArray<BrandDto>, query: string): ReadonlyArray<BrandDto> {
  const normalizedQuery = normalizeBrandName(query);
  return brands.filter((brand) => normalizeBrandName(brand.name).includes(normalizedQuery));
}

function normalizeBrandName(value: string): string {
  return value.trim().toLowerCase();
}

function DetailRow({ label, value }: { readonly label: string; readonly value: string }): React.ReactNode {
  return (
    <div className={styles.detailRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TextInput({ defaultValue, error, label, name, placeholder, type = "text" }: { readonly defaultValue?: string; readonly error?: string; readonly label: string; readonly name: string; readonly placeholder?: string; readonly type?: string }): React.ReactNode {
  return <label className={styles.textLabel}>{label}<input className={styles.textInput} defaultValue={defaultValue} name={name} placeholder={placeholder} type={type} />{error ? <span className={styles.errorText}>{error}</span> : null}</label>;
}

function productToValues(product: ProductDetailDto, brandQuery: string): SubmittedValues {
  return {
    brandId: product.brand?.id ?? "",
    brandQuery: brandQuery || product.brand?.name || "",
    categoryId: String(product.category.id),
    productName: product.name,
  };
}

function dedupeBrands(brands: ReadonlyArray<BrandDto>): ReadonlyArray<BrandDto> {
  const seenBrandIds = new Set<string>();
  return brands.filter((brand) => {
    if (seenBrandIds.has(brand.id)) return false;
    seenBrandIds.add(brand.id);
    return true;
  });
}

function formatCategoryPath(categoryPath: ProductDetailDto["categoryPath"]): string {
  return categoryPath.map((category) => category.name).join(" > ");
}
