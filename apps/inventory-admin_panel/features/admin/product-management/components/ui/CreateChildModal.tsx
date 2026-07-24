import type { UnitType } from "@product-repos/contracts";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type { PackagingType } from "../../types";
import AddItemButton from "./AddItemButton";

type CreateChildContext =
  | {
      kind: "brandProduct";
      existingBrandNames: string[];
      productTypeId: string;
      productTypeName: string;
    }
  | {
      kind: "variant";
      productId: string;
    }
  | {
      kind: "execution";
      packagingTypes: PackagingType[];
      unitTypes: UnitType[];
      variantId: string;
    };

interface CreateChildModalProps {
  context: CreateChildContext;
}

export default function CreateChildModal({
  context,
}: CreateChildModalProps): React.ReactNode {
  const fetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const [isOpen, setIsOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const title = getTitle(context.kind);
  const itemType = getItemType(context.kind);
  const matchingBrandNames = context.kind === "brandProduct"
    ? context.existingBrandNames
      .filter((name) =>
        normalizeBrandName(name).includes(normalizeBrandName(brandName)),
      )
      .slice(0, 5)
    : [];
  const isDuplicateBrand = context.kind === "brandProduct"
    && isDuplicateBrandName(brandName, context.existingBrandNames);
  const canCreateBrand = context.kind !== "brandProduct"
    || (brandName.trim().length > 0 && !isDuplicateBrand);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      setIsOpen(false);
      setBrandName("");
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <>
      <AddItemButton onClick={() => setIsOpen(true)} type={itemType} />
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-left shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button
                aria-label="Sluiten"
                className="rounded-md px-2 py-1 text-xl leading-none text-slate-600 hover:bg-slate-100"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                x
              </button>
            </div>

            {context.kind === "brandProduct" && (
              <fetcher.Form className="flex flex-col gap-4" method="post">
                <input name="intent" type="hidden" value="create-brand" />
                <input
                  name="productTypeId"
                  type="hidden"
                  value={context.productTypeId}
                />
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Merk</span>
                  <input
                    className="rounded-md border border-slate-300 px-3 py-2"
                    name="brandName"
                    onChange={(event) => setBrandName(event.currentTarget.value)}
                    required
                    type="text"
                    value={brandName}
                  />
                </label>
                {matchingBrandNames.length > 0 && (
                  <div className="-mt-3 rounded-md border border-slate-200 bg-white shadow-sm">
                    {matchingBrandNames.map((name) => (
                      <button
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        key={name}
                        onClick={() => setBrandName(name)}
                        type="button"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
                {isDuplicateBrand && (
                  <p className="text-sm text-red-700">
                    Dit merk bestaat al voor dit producttype.
                  </p>
                )}
                <SubmitButton
                  disabled={fetcher.state !== "idle" || !canCreateBrand}
                  label="Merk aanmaken"
                />
                {fetcher.data?.error && (
                  <p className="text-sm text-red-700">{fetcher.data.error}</p>
                )}
              </fetcher.Form>
            )}

            {context.kind === "variant" && (
              <fetcher.Form className="flex flex-col gap-4" method="post">
                <input name="intent" type="hidden" value="create-product-variant" />
                <input name="productId" type="hidden" value={context.productId} />
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Variantnaam</span>
                  <input
                    className="rounded-md border border-slate-300 px-3 py-2"
                    name="name"
                    required
                    type="text"
                  />
                </label>
                <SubmitButton
                  disabled={fetcher.state !== "idle"}
                  label="Variant aanmaken"
                />
              </fetcher.Form>
            )}

            {context.kind === "execution" && (
              <fetcher.Form className="flex flex-col gap-4" method="post">
                <input name="intent" type="hidden" value="create-product-execution" />
                <input name="productVariantId" type="hidden" value={context.variantId} />
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Serving size</span>
                  <input
                    className="rounded-md border border-slate-300 px-3 py-2"
                    min="0.01"
                    name="amount"
                    required
                    step="0.01"
                    type="number"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Eenheid</span>
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2"
                    disabled={context.unitTypes.length === 0}
                    name="unitTypeId"
                    required
                  >
                    {context.unitTypes.map((unitType) => (
                      <option key={unitType.id} value={unitType.id}>
                        {unitType.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Verpakkingsmateriaal</span>
                    <select
                      className="rounded-md border border-slate-300 px-3 py-2"
                      name="packagingTypeName"
                      required
                    >
                      {context.packagingTypes.map((packagingType) => (
                        <option key={packagingType.id} value={packagingType.name}>
                          {packagingType.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Aantal</span>
                    <input
                      className="rounded-md border border-slate-300 px-3 py-2"
                      defaultValue={1}
                      min="1"
                      name="unitsPerPackage"
                      required
                      step="1"
                      type="number"
                    />
                  </label>
                </div>
                {context.unitTypes.length === 0 && (
                  <p className="text-sm text-slate-600">
                    Er zijn nog geen eenheden beschikbaar.
                  </p>
                )}
                <SubmitButton
                  disabled={
                    context.unitTypes.length === 0
                    || fetcher.state !== "idle"
                  }
                  label="Uitvoering aanmaken"
                />
              </fetcher.Form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export type { CreateChildContext };

function isDuplicateBrandName(value: string, existingBrandNames: string[]): boolean {
  const normalizedValue = normalizeBrandName(value);

  return normalizedValue.length > 0
    && existingBrandNames.some((name) => normalizeBrandName(name) === normalizedValue);
}

function normalizeBrandName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl-NL");
}

function SubmitButton({
  disabled = false,
  label,
}: {
  disabled?: boolean;
  label: string;
}): React.ReactNode {
  return (
    <button
      className="rounded-lg bg-teal-600 p-2 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      disabled={disabled}
      type="submit"
    >
      {label}
    </button>
  );
}

function getItemType(kind: CreateChildContext["kind"]): string {
  if (kind === "brandProduct") return "merkproduct";
  if (kind === "execution") return "uitvoering";
  return "variant";
}

function getTitle(kind: CreateChildContext["kind"]): string {
  if (kind === "brandProduct") return "Merk aanmaken";
  if (kind === "execution") return "Uitvoering aanmaken";
  return "Variant aanmaken";
}

export { isDuplicateBrandName };
