import type { Route } from "./+types/new-product";
import { useEffect, useMemo, useState } from "react";
import { Form, Link, redirect, useFetcher, useNavigation } from "react-router";
import { buildCategoryTreeOptions } from "../../../../features/admin/product-catalog/categoryTree";
import type { CategoryTreeOption } from "../../../../features/admin/product-catalog/categoryTree";
import { createBrand, createCategory, createProduct, deleteCategory, getBrand, getBrands, getCategories, getPackageTypes, getUnitTypes, mapApiError } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import type { BrandDto, CategoryDto, FormErrors } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import styles from "./new-product.module.css";

export function meta({}: Route.MetaArgs) { return [{ title: "Product aanmaken" }]; }

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const brandId = url.searchParams.get("brandId")?.trim() || undefined;
  const categoryId = url.searchParams.get("categoryId")?.trim() || undefined;
  const brandQuery = "";
  const [brands, selectedBrand] = await Promise.all([
    getBrands(brandQuery),
    brandId ? getBrand(brandId).catch(() => null) : Promise.resolve(null),
  ]);
  return {
    brandId,
    categoryId,
    brandQuery,
    brands: selectedBrand && !brands.some((brand) => brand.id === selectedBrand.id) ? [selectedBrand, ...brands] : brands,
    selectedBrand,
    categories: await getCategories(),
    packageTypes: await getPackageTypes(),
    unitTypes: await getUnitTypes(),
  };
}

type SubmittedValues = Record<string, string>;
type ActionResult = { errors?: FormErrors; createdCategory?: CategoryDto; deletedCategoryId?: number; values?: SubmittedValues };

export async function action({ request }: Route.ActionArgs): Promise<ActionResult | Response> {
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  try {
    const intent = String(form.get("_action") ?? "createProduct");
    if (intent === "createCategory") {
      const categoryName = String(form.get("categoryName") ?? "").trim();
      if (!categoryName) return { errors: { categoryName: "Vul een categorienaam in." }, values };
      const parentRaw = String(form.get("categoryParentId") ?? "");
      const createdCategory = await createCategory({ name: categoryName, parentId: parentRaw ? Number(parentRaw) : null });
      return { createdCategory, values: { ...values, categoryId: String(createdCategory.id), categoryParentId: parentRaw } };
    }
    if (intent === "deleteCategory") {
      const categoryId = Number(form.get("categoryId"));
      if (!Number.isInteger(categoryId) || categoryId < 1) return { errors: { form: "Categorie is ongeldig." }, values };
      await deleteCategory(categoryId);
      return { deletedCategoryId: categoryId, values };
    }

    const categoryId = Number(form.get("categoryId"));
    const brandQuery = String(form.get("brandQuery") ?? "").trim();
    let brandId = String(form.get("brandId") ?? "").trim() || null;
    const brandName = String(form.get("brandName") ?? "").trim();
    if (brandQuery && !brandId && !brandName) return { errors: { brandName: "Kies een suggestie of maak het merk aan met de plus-optie." }, values };
    if (brandName) {
      const brand = await createBrand({ name: brandName });
      brandId = brand.id;
    }

    const productName = String(form.get("productName") ?? "").trim();
    const amount = String(form.get("amount") ?? "").trim().replace(",", ".");
    const packageTypeId = Number(form.get("packageTypeId"));
    const unitTypeId = Number(form.get("unitTypeId"));
    const unitsPerPackage = Number(form.get("unitsPerPackage"));

    const created = await createProduct({ name: productName, categoryId, brandId, package: { amount, packageTypeId, unitTypeId, unitsPerPackage } });
    return redirect(`/admin/product-catalogus/${created.id}`);
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}

export default function NewProduct({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const values = actionData?.values ?? {};
  const categoryOptions = useMemo(() => buildCategoryTreeOptions(loaderData.categories), [loaderData.categories]);
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to="/admin/product-catalogus">← Productcatalogus</Link>
        <h1 className={styles.title}>Product aanmaken</h1>
        <p className={styles.intro}>Vul categorie, merk, product en verpakking in.</p>
      </header>
      {actionData?.errors?.form ? <p className={styles.formError}>{actionData.errors.form}</p> : null}
      <Form className={styles.form} method="post" preventScrollReset>
        <Fieldset title="Categorie">
          <CategoryTreePicker defaultValue={values.categoryId ?? loaderData.categoryId} errors={actionData?.errors} options={categoryOptions} />
        </Fieldset>
        <Fieldset title="Merk (optioneel)">
          <BrandCombobox defaultBrandId={values.brandId ?? loaderData.brandId} defaultBrandName={values.brandName} defaultQuery={values.brandQuery ?? loaderData.selectedBrand?.name ?? loaderData.brandQuery} error={actionData?.errors?.brandName} initialBrands={loaderData.brands} />
        </Fieldset>
        <Fieldset title="Product"><TextInput defaultValue={values.productName} error={actionData?.errors?.productName ?? actionData?.errors?.name} label="Productnaam" name="productName" placeholder="Bijv. Zero Sugar" /></Fieldset>
        <Fieldset title="Verpakking">
          <select className={styles.select} name="packageTypeId" defaultValue={values.packageTypeId ?? ""} required><option value="">Verpakkingstype</option>{loaderData.packageTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <div className={styles.packageGrid}><TextInput defaultValue={values.amount} error={actionData?.errors?.amount} label="Inhoud" name="amount" placeholder="1,5" /><select className={`${styles.select} ${styles.selectAlignedEnd}`} name="unitTypeId" defaultValue={values.unitTypeId ?? ""} required><option value="">Eenheid</option>{loaderData.unitTypes.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <TextInput defaultValue={values.unitsPerPackage ?? "1"} error={actionData?.errors?.unitsPerPackage} label="Aantal per verpakking" name="unitsPerPackage" placeholder="1" type="number" />
        </Fieldset>
        <p className={styles.note}>Live weergavenaam: merk + productnaam. Deze naam wordt niet naar de backend gestuurd.</p>
        <button className={styles.submitButton} disabled={busy} type="submit">{busy ? "Opslaan..." : "Product opslaan"}</button>
      </Form>
    </main>
  );
}

type BrandLookupData = {
  readonly brandQuery: string;
  readonly brands: ReadonlyArray<BrandDto>;
};

type BrandLookupResultsByQuery = ReadonlyMap<string, ReadonlyArray<BrandDto>>;

function BrandCombobox({ defaultBrandId, defaultBrandName, defaultQuery, error, initialBrands }: { defaultBrandId?: string; defaultBrandName?: string; defaultQuery?: string; error?: string; initialBrands: ReadonlyArray<BrandDto> }) {
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
      <label className={styles.brandLabel}>Merk<input aria-autocomplete="list" aria-expanded={showSuggestionBox} autoComplete="off" className={styles.brandInput} name="brandQuery" placeholder="Typ om merken te zoeken, bijv. Coca-Cola" type="text" value={inputValue} onChange={(event) => clearSelectedBrand(event.currentTarget.value)} onFocus={() => setOpen(true)} /></label>
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

function dedupeBrands(brands: ReadonlyArray<BrandDto>): ReadonlyArray<BrandDto> {
  const seenBrandIds = new Set<string>();
  return brands.filter((brand) => {
    if (seenBrandIds.has(brand.id)) return false;
    seenBrandIds.add(brand.id);
    return true;
  });
}

function normalizeBrandName(value: string): string {
  return value.trim().toLowerCase();
}

function Fieldset({ children, title }: { children: React.ReactNode; title: string }) { return <fieldset className={styles.fieldset}><legend className={styles.fieldsetLegend}>{title}</legend>{children}</fieldset>; }
function TextInput({ defaultValue, error, label, name, placeholder, type = "text" }: { defaultValue?: string; error?: string; label: string; name: string; placeholder?: string; type?: string }) { return <label className={styles.textLabel}>{label}<input className={styles.textInput} defaultValue={defaultValue} name={name} placeholder={placeholder} type={type} />{error ? <span className={styles.errorText}>{error}</span> : null}</label>; }
type VisibleCategoryTreeOption = {
  readonly option: CategoryTreeOption;
  readonly originalIndex: number;
};

function CategoryTreePicker({ defaultValue, errors, options }: { defaultValue?: string; errors?: FormErrors; options: ReadonlyArray<CategoryTreeOption> }) {
  const fetcher = useFetcher<ActionResult>();
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultValue ?? "");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<ReadonlySet<string>>(() => collectCategoryIds(options));
  const [inlineParentId, setInlineParentId] = useState<string | null>();
  const [inlineName, setInlineName] = useState("");
  const busy = fetcher.state !== "idle";
  const createdCategory = fetcher.data?.createdCategory;
  const deletedCategoryId = fetcher.data?.deletedCategoryId;
  const childCountByParentId = useMemo(() => buildChildCountByParentId(options), [options]);
  const visibleOptions = useMemo(() => buildVisibleCategoryOptions(options, expandedCategoryIds), [expandedCategoryIds, options]);
  const selectedCategoryIsVisible = visibleOptions.some(({ option }) => String(option.category.id) === selectedCategoryId);

  useEffect(() => setSelectedCategoryId(defaultValue ?? ""), [defaultValue]);
  useEffect(() => {
    if (!defaultValue) return;
    setExpandedCategoryIds((current) => mergeCategoryIds(current, collectAncestorCategoryIds(options, defaultValue)));
  }, [defaultValue, options]);
  useEffect(() => {
    if (!createdCategory) return;
    setSelectedCategoryId(String(createdCategory.id));
    setExpandedCategoryIds((current) => expandCategoryParentPath(current, options, createdCategory.parentId));
    setInlineParentId(undefined);
    setInlineName("");
  }, [createdCategory, options]);
  useEffect(() => {
    if (deletedCategoryId === undefined || selectedCategoryId !== String(deletedCategoryId)) return;
    setSelectedCategoryId("");
  }, [deletedCategoryId, selectedCategoryId]);

  const parentIndex = inlineParentId === undefined || inlineParentId === null ? -1 : options.findIndex((option) => String(option.category.id) === inlineParentId);
  const parentOption = parentIndex >= 0 ? options[parentIndex] : undefined;
  const parentVisibleIndex = parentOption ? visibleOptions.findIndex(({ option }) => option.category.id === parentOption.category.id) : -1;
  const insertionVisibleIndex = parentOption && parentVisibleIndex >= 0 ? findVisibleSubtreeEndIndex(visibleOptions, parentVisibleIndex) : -1;

  const toggleExpanded = (categoryId: number): void => {
    const categoryKey = String(categoryId);
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryKey)) next.delete(categoryKey);
      else next.add(categoryKey);
      return next;
    });
  };

  const openInlineInput = (parentId: string | null): void => {
    if (parentId !== null) setExpandedCategoryIds((current) => expandCategoryPath(current, options, parentId));
    setInlineParentId(parentId);
    setInlineName("");
  };

  const submitInlineCategory = (): void => {
    const formData = new FormData();
    formData.set("_action", "createCategory");
    formData.set("categoryName", inlineName);
    formData.set("categoryParentId", inlineParentId ?? "");
    fetcher.submit(formData, { method: "post" });
  };

  const submitDeleteCategory = (categoryId: number): void => {
    const formData = new FormData();
    formData.set("_action", "deleteCategory");
    formData.set("categoryId", String(categoryId));
    fetcher.submit(formData, { method: "post" });
  };

  const inlineRow = (depth: number, parentPath: string): React.ReactNode => (
    <div className={styles.inlineRow} style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}>
      <span className={styles.inlineArrow}>↳</span>
      <input autoFocus className={styles.inlineInput} placeholder={`Nieuwe categorie onder ${shortCategoryPath(parentPath)}`} value={inlineName} onChange={(event) => setInlineName(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submitInlineCategory(); } }} />
      <button className={styles.inlineSubmitButton} disabled={busy} type="button" onClick={submitInlineCategory}>{busy ? "..." : "Toevoegen"}</button>
      <button className={styles.secondaryButton} type="button" onClick={() => setInlineParentId(undefined)}>Annuleer</button>
    </div>
  );

  return (
    <div className={styles.categoryPicker}>
      <div className={styles.categoryHeader}><p className={styles.categoryHeaderTitle}>Bestaande categorie</p><button className={styles.categoryAddRootButton} type="button" onClick={() => openInlineInput(null)}>+ hoofdcategorie</button></div>
      {!selectedCategoryIsVisible && selectedCategoryId ? <input name="categoryId" type="hidden" value={selectedCategoryId} /> : null}
      <div className={styles.categoryTree} role="tree" aria-label="Categorieboom">
        {inlineParentId === null ? inlineRow(0, "hoofdcategorie") : null}
        {visibleOptions.map(({ option }, visibleIndex) => {
          const categoryId = String(option.category.id);
          const hasChildren = (childCountByParentId.get(option.category.id) ?? 0) > 0;
          const isExpanded = expandedCategoryIds.has(categoryId);
          return (
            <div key={option.category.id} className={styles.categoryGroup}>
              <div className={styles.categoryRow} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-level={option.depth + 1} style={{ paddingLeft: `${0.4 + option.depth * 0.8}rem` }}>
                {hasChildren ? <button className={styles.expandButton} type="button" aria-label={`${isExpanded ? "Categorie inklappen" : "Categorie uitklappen"}: ${option.path}`} title={`${isExpanded ? "Inklappen" : "Uitklappen"}: ${option.path}`} onClick={() => toggleExpanded(option.category.id)}>{isExpanded ? "−" : "+"}</button> : <span className={styles.expandPlaceholder} aria-hidden="true" />}
                <label className={styles.categoryLabel}><input className={styles.categoryRadio} checked={selectedCategoryId === categoryId} name="categoryId" type="radio" value={option.category.id} onChange={() => setSelectedCategoryId(categoryId)} /><span className={styles.categoryName}>{option.depth > 0 ? "↳ " : ""}{option.category.name}</span></label>
                <button className={styles.categoryAddChildButton} type="button" aria-label={`Subcategorie maken onder ${option.path}`} title={`Subcategorie maken onder ${option.path}`} onClick={() => openInlineInput(categoryId)}>+</button>
                <button className={styles.categoryDeleteButton} disabled={busy} type="button" aria-label={`Categorie ${option.path} verwijderen`} title={`Categorie ${option.path} verwijderen`} onClick={() => submitDeleteCategory(option.category.id)}>×</button>
              </div>
              {visibleIndex === insertionVisibleIndex && parentOption ? inlineRow(parentOption.depth + 1, parentOption.path) : null}
            </div>
          );
        })}
      </div>
      {fetcher.data?.errors?.categoryName ? <span className={styles.errorText}>{fetcher.data.errors.categoryName}</span> : null}
      {fetcher.data?.errors?.form ? <span className={styles.errorText}>{fetcher.data.errors.form}</span> : null}
      {errors?.categoryId ? <span className={styles.errorText}>{errors.categoryId}</span> : null}
    </div>
  );
}

function shortCategoryPath(path: string): string {
  return path.split(" > ").map((part) => part.split(" ")[0] ?? part).join(" > ");
}

function buildChildCountByParentId(options: ReadonlyArray<CategoryTreeOption>): ReadonlyMap<number, number> {
  const childCountByParentId = new Map<number, number>();
  for (const option of options) {
    const parentId = option.category.parentId;
    if (parentId === null) continue;
    childCountByParentId.set(parentId, (childCountByParentId.get(parentId) ?? 0) + 1);
  }
  return childCountByParentId;
}

function buildVisibleCategoryOptions(options: ReadonlyArray<CategoryTreeOption>, expandedCategoryIds: ReadonlySet<string>): ReadonlyArray<VisibleCategoryTreeOption> {
  const visibleOptions: VisibleCategoryTreeOption[] = [];
  const branchVisibleByDepth: boolean[] = [];
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (!option) continue;
    const parentIsVisible = option.depth === 0 || branchVisibleByDepth[option.depth - 1] === true;
    if (parentIsVisible) visibleOptions.push({ option, originalIndex: index });
    branchVisibleByDepth[option.depth] = parentIsVisible && expandedCategoryIds.has(String(option.category.id));
    branchVisibleByDepth.length = option.depth + 1;
  }
  return visibleOptions;
}

function findVisibleSubtreeEndIndex(visibleOptions: ReadonlyArray<VisibleCategoryTreeOption>, parentVisibleIndex: number): number {
  const parent = visibleOptions[parentVisibleIndex]?.option;
  if (!parent) return parentVisibleIndex;
  let endIndex = parentVisibleIndex;
  for (let index = parentVisibleIndex + 1; index < visibleOptions.length; index += 1) {
    const option = visibleOptions[index]?.option;
    if (!option || option.depth <= parent.depth) break;
    endIndex = index;
  }
  return endIndex;
}

function collectCategoryIds(options: ReadonlyArray<CategoryTreeOption>): ReadonlySet<string> {
  const categoryIds = new Set<string>();
  for (const option of options) categoryIds.add(String(option.category.id));
  return categoryIds;
}

function collectAncestorCategoryIds(options: ReadonlyArray<CategoryTreeOption>, categoryId: string | undefined): ReadonlySet<string> {
  const ancestors = new Set<string>();
  if (!categoryId) return ancestors;
  const optionByCategoryId = buildOptionByCategoryId(options);
  let parentId = optionByCategoryId.get(categoryId)?.category.parentId ?? null;
  const visitedCategoryIds = new Set<string>();
  while (parentId !== null) {
    const parentKey = String(parentId);
    if (visitedCategoryIds.has(parentKey)) break;
    visitedCategoryIds.add(parentKey);
    ancestors.add(parentKey);
    parentId = optionByCategoryId.get(parentKey)?.category.parentId ?? null;
  }
  return ancestors;
}

function expandCategoryParentPath(current: ReadonlySet<string>, options: ReadonlyArray<CategoryTreeOption>, parentId: number | null): ReadonlySet<string> {
  if (parentId === null) return current;
  return expandCategoryPath(current, options, String(parentId));
}

function expandCategoryPath(current: ReadonlySet<string>, options: ReadonlyArray<CategoryTreeOption>, categoryId: string): ReadonlySet<string> {
  const expandedIds = new Set<string>(collectAncestorCategoryIds(options, categoryId));
  expandedIds.add(categoryId);
  return mergeCategoryIds(current, expandedIds);
}

function mergeCategoryIds(current: ReadonlySet<string>, additions: ReadonlySet<string>): ReadonlySet<string> {
  let changed = false;
  const next = new Set(current);
  for (const addition of additions) {
    if (next.has(addition)) continue;
    next.add(addition);
    changed = true;
  }
  return changed ? next : current;
}

function buildOptionByCategoryId(options: ReadonlyArray<CategoryTreeOption>): ReadonlyMap<string, CategoryTreeOption> {
  const optionByCategoryId = new Map<string, CategoryTreeOption>();
  for (const option of options) optionByCategoryId.set(String(option.category.id), option);
  return optionByCategoryId;
}

