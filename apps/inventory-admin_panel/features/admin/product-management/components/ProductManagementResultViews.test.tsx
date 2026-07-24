import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { ProductSearchResponse } from "@product-repos/contracts/product-search";
import { productManagementQueryParams } from "../types";
import SingleResultView from "./SingleResultView";
import { isDuplicateBrandName } from "./ui/CreateChildModal";
import MultiResultListView from "./ui/MultiResultListView";
import SingleResultListView from "./ui/SingleResultListView";

const result: ProductSearchResponse = {
  productTypes: [
    {
      id: "type-1",
      name: "Cola",
      brandProductCount: 2,
    },
  ],
  brandProducts: [
    {
      brandId: "brand-1",
      productId: "product-1",
      productTypeId: "type-1",
      productTypeName: "Cola",
      name: "G'woon Cola",
      variantCount: 3,
    },
  ],
  variants: [
    {
      id: "variant-1",
      name: "G'woon Cola Zero",
      brandName: "G'woon",
      productTypeName: "Cola",
      contents: [{
        id: "sku-1",
        amount: 1,
        barcode: null,
        packagingTypeName: "Fles",
        unit: "L",
        unitsPerPackage: 1,
      }],
    },
  ],
};
const packagingTypes = [{ id: 1, name: "Fles" }];

function renderWithRouter(node: React.ReactNode): string {
  const router = createMemoryRouter(
    [{
      action: () => ({ ok: true }),
      element: node,
      path: "*",
    }],
    { initialEntries: ["/admin/product-management?productmerken=Cola"] },
  );

  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe("product management result views", () => {
  it("links product type results to the productmerken single-result query", () => {
    const markup = renderWithRouter(
      <MultiResultListView query="cola" result={result} />,
    );

    expect(markup).toContain(
      'href="/admin/product-management?q=cola&amp;productmerken=Cola"',
    );
    expect(markup).toContain("2 merken");
    expect(markup).toContain("1L");
    expect(markup).not.toContain("Verpakking:");
    expect(markup).not.toContain("Barcode:");
  });

  it("links brand results to variants instead of executions", () => {
    const markup = renderWithRouter(
      <MultiResultListView query="cola" result={result} />,
    );

    expect(markup).toContain("<h1>Merken</h1>");
    expect(markup).toContain(
      'href="/admin/product-management?q=cola&amp;productmerken=G%27woon+Cola"',
    );
    expect(markup).not.toContain(
      'href="/admin/product-management?q=cola&amp;variant=G%27woon+Cola"',
    );
  });

  it("preserves the original search query when linking from brands to variants", () => {
    const markup = renderWithRouter(
      <SingleResultListView
        initialQuery="cola"
        packagingTypes={packagingTypes}
        query="Cola"
        result={result}
        selectedParam={productManagementQueryParams.brandProduct}
        unitTypes={[]}
      />,
    );

    expect(markup).toContain(
      'href="/admin/product-management?q=cola&amp;variant=G%27woon+Cola&amp;previousParam=productmerken&amp;previousQuery=Cola"',
    );
  });

  it("renders variants after selecting a brand result", () => {
    const markup = renderWithRouter(
      <SingleResultListView
        initialQuery="cola"
        packagingTypes={packagingTypes}
        query="G'woon Cola"
        result={{ ...result, productTypes: [] }}
        selectedParam={productManagementQueryParams.brandProduct}
        unitTypes={[]}
      />,
    );

    expect(markup).toContain("<h1>G&#x27;woon Cola</h1>");
    expect(markup).toContain("<h2>Varianten</h2>");
    expect(markup).toContain("G&#x27;woon Cola Zero");
    expect(markup).toContain(
      'href="/admin/product-management?q=cola&amp;variant=G%27woon+Cola+Zero&amp;previousParam=productmerken&amp;previousQuery=G%27woon+Cola"',
    );
    expect(markup).not.toContain("Uitvoeringen");
    expect(markup).not.toContain("Verpakking:");
  });

  it("uses the stored previous state before returning to the original search query", () => {
    const variantMarkup = renderWithRouter(
      <SingleResultView
        initialQuery="cola"
        packagingTypes={packagingTypes}
        previousParam={productManagementQueryParams.brandProduct}
        previousQuery="Cola"
        query="G'woon Cola"
        result={result}
        selectedParam={productManagementQueryParams.variant}
        unitTypes={[]}
      />,
    );
    const productTypeMarkup = renderWithRouter(
      <SingleResultView
        initialQuery="cola"
        packagingTypes={packagingTypes}
        query="Cola"
        result={result}
        selectedParam={productManagementQueryParams.brandProduct}
        unitTypes={[]}
      />,
    );

    expect(variantMarkup).toContain(
      'href="/admin/product-management?q=cola&amp;productmerken=Cola"',
    );
    expect(productTypeMarkup).toContain(
      'href="/admin/product-management?q=cola"',
    );
  });

  it("returns directly to the original search query without an explicit previous state", () => {
    const markup = renderWithRouter(
      <SingleResultView
        initialQuery="cola"
        packagingTypes={packagingTypes}
        query="G'woon Cola"
        result={result}
        selectedParam={productManagementQueryParams.variant}
        unitTypes={[]}
      />,
    );

    expect(markup).toContain(
      'href="/admin/product-management?q=cola"',
    );
  });

  it("renders the fresh product type brands with a create option", () => {
    const markup = renderWithRouter(
      <SingleResultListView
        query="Cola"
        packagingTypes={packagingTypes}
        result={{
          ...result,
          brandProducts: [
            result.brandProducts[0]!,
            {
              brandId: "brand-2",
              productId: "product-2",
              productTypeId: "type-1",
              productTypeName: "Cola",
              name: "Coca Cola",
              variantCount: 0,
            },
          ],
        }}
        selectedParam={productManagementQueryParams.brandProduct}
        unitTypes={[]}
      />,
    );

    expect(markup).toContain("<h1>Cola</h1>");
    expect(markup).toContain("Merken");
    expect(markup).toContain("G&#x27;woon");
    expect(markup).toContain("Coca Cola");
    expect(markup).toContain("Producttype: Cola");
    expect(markup).toContain("Maak een nieuwe merk aan");
  });

  it("renders executions for a selected variant without repeated parent context", () => {
    const markup = renderWithRouter(
      <SingleResultListView
        query="G'woon Cola Zero"
        packagingTypes={packagingTypes}
        result={result}
        selectedParam={productManagementQueryParams.variant}
        unitTypes={[]}
      />,
    );

    expect(markup).toContain("<h1>G&#x27;woon Cola Zero</h1>");
    expect(markup).toContain("Uitvoeringen");
    expect(markup).toContain("Verpakking: 1 x Fles");
    expect(markup).toContain("Barcode: Geen barcode");
    expect(markup).not.toContain("Producttype: Cola");
    expect(markup).not.toContain("Merk: G&#x27;woon");
  });

  it("renders an execution empty state after selecting a variant without contents", () => {
    const markup = renderWithRouter(
      <SingleResultListView
        query="G'woon Cola Zero"
        packagingTypes={packagingTypes}
        result={{ ...result, variants: [{ ...result.variants[0]!, contents: [] }] }}
        selectedParam={productManagementQueryParams.variant}
        unitTypes={[]}
      />,
    );

    expect(markup).toContain("<h1>G&#x27;woon Cola Zero</h1>");
    expect(markup).toContain("Geen uitvoering gevonden.");
    expect(markup).not.toContain("Geen varianten gevonden.");
  });

  it("renders a no-results block with a create option for productmerken", () => {
    const markup = renderWithRouter(
      <SingleResultListView
        query="Cola"
        packagingTypes={packagingTypes}
        result={{ productTypes: result.productTypes, brandProducts: [], variants: [] }}
        selectedParam={productManagementQueryParams.brandProduct}
        unitTypes={[]}
      />,
    );

    expect(markup).toContain("Geen merken gevonden.");
    expect(markup).toContain("Cola");
    expect(markup).not.toContain("<p>Cola</p>");
    expect(markup).toContain("Maak een nieuwe merk aan");
  });

  it("matches duplicate brand names case-insensitively", () => {
    expect(isDuplicateBrandName("  g'WOON   cola ", ["G'woon Cola"])).toBe(true);
    expect(isDuplicateBrandName("Coca Cola", ["G'woon Cola"])).toBe(false);
  });
});
