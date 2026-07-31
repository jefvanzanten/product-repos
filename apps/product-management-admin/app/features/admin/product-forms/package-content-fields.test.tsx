import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PackageContentFields } from "./package-content-fields";

const packageTypes = [
  { id: 1, name: "pak" },
] as const;
const unitTypes = [
  { id: 3, name: "gram", symbol: "g", dimension: "MASS" as const, conversionToBase: "1" },
] as const;

describe("PackageContentFields", () => {
  it("always renders the complete package content separately", () => {
    const markup = renderToStaticMarkup(
      <PackageContentFields
        packageTypes={packageTypes}
        unitTypes={unitTypes}
        values={{ packageTypeId: "1", amount: "88", unitTypeId: "3" }}
      />,
    );

    expect(markup).toContain("Volledige verpakkingsinhoud");
    expect(markup).toContain("Portie of stuk toevoegen (optioneel)");
    expect(markup).not.toContain("Som van de porties");
  });

  it("shows portion input alongside total content and permits a rounded difference", () => {
    const markup = renderToStaticMarkup(
      <PackageContentFields
        packageTypes={packageTypes}
        unitTypes={unitTypes}
        values={{
          packageTypeId: "1",
          amount: "88",
          unitTypeId: "3",
          portionEnabled: "on",
          portionName: "wafel",
          portionAmount: "4,9",
          portionUnitTypeId: "3",
          portionsPerPackage: "18",
        }}
      />,
    );

    expect(markup).toContain("Volledige verpakkingsinhoud");
    expect(markup).toContain("Portiegrootte");
    expect(markup).toContain("Aantal porties of stuks in de verpakking (optioneel)");
    expect(markup).toContain("Som van de porties:");
    expect(markup).toContain("88,2 g");
    expect(markup).toContain("volledige inhoud: 88 g");
  });
});
