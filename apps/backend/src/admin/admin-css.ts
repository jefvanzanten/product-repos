import adminLayoutCss from "./components/AdminLayout/AdminLayout.module.css" with { type: "text" };
import adminNotFoundCss from "./components/AdminNotFound/AdminNotFound.module.css" with { type: "text" };
import adminPageCss from "./components/AdminPage/AdminPage.module.css" with { type: "text" };
import catalogSearchCss from "./components/CatalogSearch/CatalogSearch.module.css" with { type: "text" };
import categoryTreeCss from "./components/CategoryTree/CategoryTree.module.css" with { type: "text" };
import fieldErrorCss from "./components/FieldError/FieldError.module.css" with { type: "text" };
import packageFormCss from "./components/PackageForm/PackageForm.module.css" with { type: "text" };
import productFormCss from "./components/ProductForm/ProductForm.module.css" with { type: "text" };
import productRowCss from "./components/ProductRow/ProductRow.module.css" with { type: "text" };
import subcategoryModalCss from "./components/SubcategoryModal/SubcategoryModal.module.css" with { type: "text" };
import catalogIndexPageCss from "./pages/CatalogIndexPage/CatalogIndexPage.module.css" with { type: "text" };
import packageCreatePageCss from "./pages/PackageCreatePage/PackageCreatePage.module.css" with { type: "text" };
import packageDetailPageCss from "./pages/PackageDetailPage/PackageDetailPage.module.css" with { type: "text" };
import productCreatePageCss from "./pages/ProductCreatePage/ProductCreatePage.module.css" with { type: "text" };
import productDetailPageCss from "./pages/ProductDetailPage/ProductDetailPage.module.css" with { type: "text" };
import { type AdminCssModule, renderAdminCss } from "./css-modules";

const adminCssModules: readonly AdminCssModule[] = [
  { scope: "AdminLayout", css: adminLayoutCss },
  { scope: "AdminPage", css: adminPageCss },
  { scope: "AdminNotFound", css: adminNotFoundCss },
  { scope: "CatalogIndexPage", css: catalogIndexPageCss },
  { scope: "CatalogSearch", css: catalogSearchCss },
  { scope: "CategoryTree", css: categoryTreeCss },
  { scope: "FieldError", css: fieldErrorCss },
  { scope: "PackageForm", css: packageFormCss },
  { scope: "ProductForm", css: productFormCss },
  { scope: "ProductRow", css: productRowCss },
  { scope: "SubcategoryModal", css: subcategoryModalCss },
  { scope: "ProductCreatePage", css: productCreatePageCss },
  { scope: "ProductDetailPage", css: productDetailPageCss },
  { scope: "PackageCreatePage", css: packageCreatePageCss },
  { scope: "PackageDetailPage", css: packageDetailPageCss },
];

export function renderAdminStylesheet(): string {
  return renderAdminCss(adminCssModules);
}
