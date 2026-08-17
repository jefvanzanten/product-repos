import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminBottomTabs } from "./admin-bottom-tabs";

describe("AdminBottomTabs", () => {
  it("renders an inactive Inventory return tab and an active admin tab", () => {
    const markup = renderToStaticMarkup(<AdminBottomTabs source="inventory" />);
    expect(markup).toContain('href="/inventory"');
    expect(markup).toContain("Inventarisatie");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("source=inventory");
  });

  it("renders an inactive Calorie Tracker return tab and an active admin tab", () => {
    const markup = renderToStaticMarkup(<AdminBottomTabs source="calorie-tracker" />);
    expect(markup).toContain('href="/calorie-tracker"');
    expect(markup).toContain("Calorie Tracker");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("source=calorie-tracker");
  });

  it("does not invent a return tab without a resolved source", () => {
    const markup = renderToStaticMarkup(<AdminBottomTabs source={null} />);
    expect(markup).not.toContain('href="/inventory"');
    expect(markup).not.toContain('href="/calorie-tracker"');
    expect(markup).toContain('href="/product-management-admin/product-catalogus"');
    expect(markup).toContain('aria-current="page"');
  });
});
