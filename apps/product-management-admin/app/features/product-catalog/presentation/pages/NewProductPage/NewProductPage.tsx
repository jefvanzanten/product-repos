import { productCompositionDtoSchema } from "@product-repos/contracts";
import { useRef, useState } from "react";
import { useNavigation } from "react-router";
import type { ProductComposition } from "../../../domain/product-catalog";
import { AdminForm as Form } from "../../../../../core/presentation/routing/admin-source-context";
import { BrandCombobox } from "../../brands/components/brand-combobox/brand-combobox";
import { CategoryBreadcrumb } from "../../categories/components/category-breadcrumb/category-breadcrumb";
import { CategoryTreePicker } from "../../categories/components/category-tree-picker/category-tree-picker";
import { useNewProductCategory } from "../../new-product/hooks/use-new-product-category";
import { ProductFormFieldset } from "../../products/components/product-form-fieldset/product-form-fieldset";
import { ConsumptionTypeSection, MacroProfileSection, ProductFormActions, ProductNameSection } from "../../products/components/product-form-sections/product-form-sections";
import type { NewProductActionResult, NewProductLoaderData } from "../../types/new-product.types";
import styles from "./NewProductPage.module.css";

/** Render composition-first concrete-product creation. */
export function NewProductPage({ actionData, loaderData }: { readonly actionData?: NewProductActionResult; readonly loaderData: NewProductLoaderData }): React.ReactNode {
  const busy = useNavigation().state !== "idle";
  const [composition, setComposition] = useState<ProductComposition | null>(loaderData.selectedComposition);
  const [suggestions, setSuggestions] = useState<ReadonlyArray<ProductComposition>>([]);
  const requestSequence = useRef(0);
  const values = actionData?.values ?? {};

  /** Search shared compositions in response to administrator input. */
  async function handleCompositionQuery(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const query = event.currentTarget.value.trim();
    setComposition(null);
    const sequence = ++requestSequence.current;
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const response = await fetch(`/composition-lookup?q=${encodeURIComponent(query)}`);
    const nextSuggestions = response.ok ? productCompositionDtoSchema.array().parse(await response.json()) : [];
    if (sequence === requestSequence.current) setSuggestions(nextSuggestions);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}><h1 className={styles.title}>Product aanmaken</h1><p className={styles.intro}>Kies eerst een gedeelde samenstelling en voeg daarna de concrete verpakking toe.</p></header>
      {actionData?.errors?.form ? <p className={styles.formError}>{actionData.errors.form}</p> : null}
      <Form className={styles.form} method="post" preventScrollReset>
        <ProductFormFieldset title="Gedeelde samenstelling">
          {composition ? <CompositionSelection composition={composition} onClear={() => setComposition(null)} /> : (
            <>
              <label className={styles.label}>Zoek op productnaam of merk<input className={styles.input} autoComplete="off" placeholder="Bijv. Heinz tomatenpuree" onChange={(event) => void handleCompositionQuery(event)} /></label>
              {suggestions.length > 0 ? <div className={styles.suggestions}>{suggestions.map((item) => <button key={item.id} type="button" onClick={() => { setComposition(item); setSuggestions([]); }}><strong>{item.brand?.name ? `${item.brand.name} ${item.name}` : item.name}</strong><span>{item.categoryPath.map((category) => category.name).join(" › ")} · {item.productCount} producten</span></button>)}</div> : null}
              <p className={styles.help}>Geen match? Vul hieronder een nieuwe samenstelling in. Er wordt nooit automatisch gekoppeld.</p>
            </>
          )}
        </ProductFormFieldset>
        {composition ? null : <NewCompositionFields actionData={actionData} loaderData={loaderData} values={values} />}

        <ProductFormFieldset title="Dit concrete product">
          <input name="productCompositionId" type="hidden" value={composition?.id ?? ""} />
          <div className={styles.twoColumns}>
            <Field label="Verpakkingstype" error={actionData?.errors?.packageTypeId}><select name="packageTypeId" defaultValue={values.packageTypeId ?? ""} required><option value="">Kies type</option>{loaderData.packageTypes.map((type) => <option key={type.id} value={type.id}>{type.singularName}</option>)}</select></Field>
            <Field label="Barcode (optioneel)"><input name="barcode" defaultValue={values.barcode ?? ""} inputMode="numeric" /></Field>
            <Field label="Inhoud" error={actionData?.errors?.amount}><input name="amount" defaultValue={values.amount ?? ""} inputMode="decimal" placeholder="200" required /></Field>
            <Field label="Eenheid" error={actionData?.errors?.unitTypeId}><select name="unitTypeId" defaultValue={values.unitTypeId ?? ""} required><option value="">Kies eenheid</option>{loaderData.unitTypes.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>)}</select></Field>
          </div>
          <Field label="Afbeeldings-URL (optioneel)"><input name="imageUrl" defaultValue={values.imageUrl ?? ""} type="url" /></Field>
          <PortionFields errors={actionData?.errors} unitTypes={loaderData.unitTypes} values={values} />
        </ProductFormFieldset>
        <ProductFormActions busy={busy} />
      </Form>
    </main>
  );
}

/** Render the selected shared composition as immutable create context. */
function CompositionSelection({ composition, onClear }: { readonly composition: ProductComposition; readonly onClear: () => void }): React.ReactNode {
  return <div className={styles.selection}><div><strong>{composition.brand?.name ? `${composition.brand.name} ${composition.name}` : composition.name}</strong><span>{composition.categoryPath.map((category) => category.name).join(" › ")}</span><span>Voedingswaarden en gedeelde gegevens worden hergebruikt.</span></div><button type="button" onClick={onClear}>Andere kiezen</button></div>;
}

/** Render shared fields with the established category picker and brand combobox. */
function NewCompositionFields({ actionData, loaderData, values }: { readonly actionData?: NewProductActionResult; readonly loaderData: NewProductLoaderData; readonly values: Record<string, string> }): React.ReactNode {
  const defaultCategoryId = values.categoryId ?? loaderData.categoryId ?? "";
  const defaultBrandId = values.brandId ?? loaderData.brandId;
  const defaultBrandName = values.brandName;
  const defaultBrandQuery = values.brandQuery ?? loaderData.selectedBrand?.name ?? loaderData.brandQuery;
  const brandDefaultsKey = JSON.stringify([defaultBrandId, defaultBrandName, defaultBrandQuery]);
  const category = useNewProductCategory({ categories: loaderData.categories, defaultCategoryId });

  return (
    <>
      <CategoryBreadcrumb path={category.breadcrumbPath} />
      <ProductFormFieldset title="Categorie">
        <CategoryTreePicker
          key={defaultCategoryId}
          busy={category.busy}
          defaultValue={category.defaultCategoryId}
          errors={actionData?.errors}
          mutationErrors={category.mutationErrors}
          mutationResult={category.mutationResult}
          options={category.options}
          selectedCategoryId={category.selectedCategoryId}
          onCreateCategory={category.createCategory}
          onDeleteCategory={category.deleteCategory}
          onSelectedCategoryChange={category.selectCategory}
        />
      </ProductFormFieldset>
      <ProductNameSection error={actionData?.errors?.productName} value={values.productName} />
      <ProductFormFieldset title="Merk (optioneel)">
        <BrandCombobox key={brandDefaultsKey} defaultBrandId={defaultBrandId} defaultBrandName={defaultBrandName} defaultQuery={defaultBrandQuery} error={actionData?.errors?.brandName} initialBrands={loaderData.brands} />
      </ProductFormFieldset>
      <ConsumptionTypeSection error={actionData?.errors?.consumptionType} value={values.consumptionType} />
      <MacroProfileSection errors={actionData?.errors} profile={null} values={values} />
    </>
  );
}

/** Render optional product-specific portion controls. */
function PortionFields({ errors, unitTypes, values }: { readonly errors?: Record<string, string>; readonly unitTypes: NewProductLoaderData["unitTypes"]; readonly values: Record<string, string> }): React.ReactNode {
  const [enabled, setEnabled] = useState(values.portionEnabled === "on");
  return <div className={styles.portion}><label className={styles.check}><input name="portionEnabled" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.currentTarget.checked)} /> Portie toevoegen (optioneel)</label>{enabled ? <div className={styles.twoColumns}><Field label="Enkelvoud" error={errors?.portionName}><input name="portionName" defaultValue={values.portionName ?? ""} placeholder="wafel" required /></Field><Field label="Meervoud" error={errors?.portionPluralName}><input name="portionPluralName" defaultValue={values.portionPluralName ?? ""} placeholder="wafels" required /></Field><Field label="Portiegrootte" error={errors?.portionAmount}><input name="portionAmount" defaultValue={values.portionAmount ?? ""} inputMode="decimal" required /></Field><Field label="Portie-eenheid" error={errors?.portionUnitTypeId}><select name="portionUnitTypeId" defaultValue={values.portionUnitTypeId ?? ""} required><option value="">Kies eenheid</option>{unitTypes.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field><Field label="Aantal per product (optioneel)"><input name="portionsPerProduct" defaultValue={values.portionsPerProduct ?? ""} min="1" type="number" /></Field></div> : null}</div>;
}

/** Render one consistent concrete-product field and its validation error. */
function Field({ children, error, label }: { readonly children: React.ReactNode; readonly error?: string; readonly label: string }): React.ReactNode {
  return <label className={styles.label}><span>{label}</span>{children}{error ? <small className={styles.inlineError}>{error}</small> : null}</label>;
}
