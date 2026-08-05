import { PackageContentFields } from "../packages/components/package-content-fields/package-content-fields";
import { PackageImageUpload } from "../packages/components/package-image-upload/package-image-upload";
import {
  PackageForm,
  PackageFormActions,
  PackageFormError,
  PackageNotFound,
  PackagePage,
  PackagePrimaryButton,
  PackageSecondaryLink,
} from "../packages/components/package-page/package-page";
import type {
  PackageEditActionResult,
  PackageEditLoaderData,
  ProductPackageWithProductId,
} from "../types/product-package.types";

/**
 * Render the dedicated package-edit page without an intermediate detail state.
 *
 * @param props - Loaded package data and the latest optional action result.
 * @returns Package-edit page.
 */
export function PackageEditPage({ actionData, loaderData }: { readonly actionData?: PackageEditActionResult; readonly loaderData: PackageEditLoaderData }): React.ReactNode {
  if (!loaderData.found) {
    return <PackageNotFound message={loaderData.productFound ? "Verpakking niet gevonden." : "Product niet gevonden."} />;
  }

  const productUrl = `/product-catalogus/${loaderData.product.id}${loaderData.context}`;
  return (
    <PackagePage backUrl={productUrl} intro={loaderData.product.displayName} title="Verpakking bewerken">
      <PackageForm multipart>
        <PackageFormError message={actionData?.errors?.form} />
        <PackageImageUpload error={actionData?.errors?.image} imageUrl={loaderData.packageDetail.imageUrl} productName={loaderData.product.displayName} />
        <PackageContentFields errors={actionData?.errors} packageTypes={loaderData.packageTypes} unitTypes={loaderData.unitTypes} values={actionData?.values ?? packageToValues(loaderData.packageDetail)} variant="light" />
        <PackageFormActions>
          <PackageSecondaryLink to={productUrl}>Annuleren</PackageSecondaryLink>
          <PackagePrimaryButton>Wijzigingen opslaan</PackagePrimaryButton>
        </PackageFormActions>
      </PackageForm>
    </PackagePage>
  );
}

/**
 * Convert package protocol data into editable package-content values.
 *
 * @param packageDetail - Current package protocol data.
 * @returns Form-compatible string values.
 */
function packageToValues(packageDetail: ProductPackageWithProductId): Record<string, string> {
  return {
    packageTypeId: String(packageDetail.packageType.id),
    amount: packageDetail.unitContent.amount,
    unitTypeId: String(packageDetail.unitContent.unitType.id),
    portionEnabled: packageDetail.portion === null ? "" : "on",
    portionName: packageDetail.portion?.name ?? "",
    portionAmount: packageDetail.portion?.unitContent.amount ?? "",
    portionUnitTypeId: packageDetail.portion === null ? "" : String(packageDetail.portion.unitContent.unitType.id),
    portionsPerPackage: packageDetail.portion?.portionsPerPackage === null || packageDetail.portion === null ? "" : String(packageDetail.portion.portionsPerPackage),
  };
}
