import { useNavigation } from "react-router";
import { AdminForm as Form } from "../../../../admin-source-context";
import { BrandCombobox } from "../../brands/components/brand-combobox/brand-combobox";
import { CategoryBreadcrumb } from "../../categories/components/category-breadcrumb/category-breadcrumb";
import { CategoryTreePicker } from "../../categories/components/category-tree-picker/category-tree-picker";
import { PackageContentFields } from "../../packages/components/package-content-fields/package-content-fields";
import { useNewProductCategory } from "../../new-product/hooks/use-new-product-category";
import { ProductFormFieldset } from "../../products/components/product-form-fieldset/product-form-fieldset";
import {
  ConsumptionTypeSection,
  MacroProfileSection,
  ProductFormActions,
  ProductNameSection,
} from "../../products/components/product-form-sections/product-form-sections";
import type { NewProductActionResult, NewProductLoaderData } from "../../types/new-product.types";
import styles from "./NewProductPage.module.css";

type NewProductPageProps = {
  readonly actionData?: NewProductActionResult;
  readonly loaderData: NewProductLoaderData;
};

/**
 * Render the product creation page.
 *
 * @param props - Loaded reference data and the latest optional action result.
 * @returns The product creation page.
 */
export function NewProductPage({ actionData, loaderData }: NewProductPageProps): React.ReactNode {
  const busy = useNavigation().state !== "idle";
  const values = actionData?.values ?? {};
  const defaultCategoryId = values.categoryId ?? loaderData.categoryId ?? "";
  const defaultBrandId = values.brandId ?? loaderData.brandId;
  const defaultBrandName = values.brandName;
  const defaultBrandQuery = values.brandQuery ?? loaderData.selectedBrand?.name ?? loaderData.brandQuery;
  const brandDefaultsKey = JSON.stringify([defaultBrandId, defaultBrandName, defaultBrandQuery]);
  const category = useNewProductCategory({ categories: loaderData.categories, defaultCategoryId });

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Product aanmaken</h1>
        <p className={styles.intro}>Vul categorie, merk, product, voedingswaarden en verpakking in.</p>
      </header>
      <CategoryBreadcrumb path={category.breadcrumbPath} />
      {actionData?.errors?.form ? <p className={styles.formError}>{actionData.errors.form}</p> : null}
      <Form className={styles.form} method="post" preventScrollReset>
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
        <ProductNameSection error={actionData?.errors?.productName ?? actionData?.errors?.name} value={values.productName} />
        <ProductFormFieldset title="Merk (optioneel)">
          <BrandCombobox key={brandDefaultsKey} defaultBrandId={defaultBrandId} defaultBrandName={defaultBrandName} defaultQuery={defaultBrandQuery} error={actionData?.errors?.brandName} initialBrands={loaderData.brands} />
        </ProductFormFieldset>
        <ConsumptionTypeSection error={actionData?.errors?.consumptionType} value={values.consumptionType} />
        <ProductFormFieldset title="Verpakking">
          <PackageContentFields errors={actionData?.errors} packageTypes={loaderData.packageTypes} unitTypes={loaderData.unitTypes} values={values} />
        </ProductFormFieldset>
        <MacroProfileSection errors={actionData?.errors} profile={null} values={values} />
        <ProductFormActions busy={busy} />
      </Form>
    </main>
  );
}
