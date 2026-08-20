import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InventoryLocation } from "../../../domain/inventory";
import { LocationSelector } from "./location-selector";

const locations: ReadonlyArray<InventoryLocation> = [{
  id: 1,
  name: "Woning",
  parentId: null,
  path: "Woning",
  archivedAt: null,
  isEffectivelyArchived: false,
  children: [{
    id: 2,
    name: "Koelkast",
    parentId: 1,
    path: "Woning › Koelkast",
    archivedAt: null,
    isEffectivelyArchived: false,
    children: [],
  }],
}];

describe("LocationSelector", () => {
  it("expands branches independently and selects a location from tree rows", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LocationSelector locations={locations} selectedId={null} isPending={false} failed={false} onSelect={onSelect} />);

    expect(screen.queryByRole("treeitem", { name: "Koelkast" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Opbergplaats uitklappen: Woning" }));
    await user.click(screen.getByRole("radio", { name: "Koelkast" }));

    expect(screen.getByRole("treeitem", { name: "Koelkast" })).toHaveAttribute("aria-level", "2");
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
