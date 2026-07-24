import type {
  Brand,
  CreateBrandInput,
  CreateProductTypeInput,
  ProductType,
  UnitType,
} from "@product-repos/contracts";
import type { ProductSearchResponse } from "@product-repos/contracts/product-search";
import type { PackagingType } from "../types";

const apiBaseUrl = process.env.API_URL ?? "http://localhost:3000";
const apiUrl = apiBaseUrl.replace(/\/$/, "");

async function getProductResults(
  query: string,
): Promise<ProductSearchResponse> {
  const searchParams = new URLSearchParams({ q: query });

  const response = await fetch(
    `${apiUrl}/api/product-search?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Product search failed with status ${response.status}`);
  }

  return response.json() as Promise<ProductSearchResponse>;
}

async function createProductType(
  input: CreateProductTypeInput,
): Promise<ProductType> {
  const response = await fetch(`${apiUrl}/product-types`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Product type creation failed with status ${response.status}`);
  }

  return response.json() as Promise<ProductType>;
}

async function getUnitTypes(): Promise<UnitType[]> {
  const response = await fetch(`${apiUrl}/units`);

  if (!response.ok) {
    throw new Error(`Unit type lookup failed with status ${response.status}`);
  }

  return response.json() as Promise<UnitType[]>;
}

async function getPackagingTypes(): Promise<PackagingType[]> {
  const response = await fetch(`${apiUrl}/packaging-types`);

  if (!response.ok) {
    throw new Error(`Packaging type lookup failed with status ${response.status}`);
  }

  const packagingTypes = await response.json() as PackagingType[];

  return packagingTypes.length > 0
    ? packagingTypes
    : [{ id: 0, name: "Standaard" }];
}

async function createBrandForProductType(
  productTypeId: string,
  input: CreateBrandInput,
): Promise<Brand> {
  const response = await fetch(
    `${apiUrl}/product-types/${encodeURIComponent(productTypeId)}/brands`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Brand creation failed"),
    );
  }

  return response.json() as Promise<Brand>;
}

async function createProductVariant(input: {
  name: string;
  productId: string;
}): Promise<{ id: string; name: string; productId: string }> {
  const response = await fetch(`${apiUrl}/product-variants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Product variant creation failed with status ${response.status}`);
  }

  return response.json() as Promise<{ id: string; name: string; productId: string }>;
}

async function createProductExecution(input: {
  amount: number;
  packagingTypeName: string;
  productVariantId: string;
  unitTypeId: number;
  unitsPerPackage: number;
}): Promise<unknown> {
  const response = await fetch(`${apiUrl}/product-executions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Product execution creation failed with status ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

export {
  createBrandForProductType,
  createProductExecution,
  createProductType,
  createProductVariant,
  getProductResults,
  getPackagingTypes,
  getUnitTypes,
};

async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response
    .json()
    .then((value) => value as { error?: { message?: string } })
    .catch(() => undefined);
  const message = body?.error?.message;

  return message
    ? `${fallback}: ${message}`
    : `${fallback} with status ${response.status}`;
}
