import { PackageContentFields } from "../packages/components/package-content-fields/package-content-fields";
import {
  PackageForm,
  PackageFormError,
  PackageNotFound,
  PackagePage,
  PackagePrimaryButton,
} from "../packages/components/package-page/package-page";
import type {
  PackageFormActionResult,
  PackageFormLoaderData,
} from "../types/product-package.types";

/**
 * Render the package creation page.
 *
 * @param props - Loaded package reference data and the latest optional action result.
 * @returns The package creation page.
 */
export function PackageFormPage({ actionData, loaderData }: { readonly actionData?: PackageFormActionResult; readonly loaderData: PackageFormLoaderData }): React.ReactNode {
  if (!loaderData.found) return <PackageNotFound message="Product niet gevonden." />;

  return (
    <PackagePage
      backUrl={`/product-catalogus/${loaderData.product.id}${loaderData.context}`}
      intro={loaderData.product.displayName}
      title="Verpakking toevoegen"
    >
      <PackageForm>
        <PackageFormError message={actionData?.errors?.form} />
        <PackageContentFields errors={actionData?.errors} packageTypes={loaderData.packageTypes} unitTypes={loaderData.unitTypes} values={actionData?.values ?? {}} variant="light" />
        <PackagePrimaryButton>Verpakking opslaan</PackagePrimaryButton>
      </PackageForm>
    </PackagePage>
  );
}
