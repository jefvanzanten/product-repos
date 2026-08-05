import { describe, expect, test } from "bun:test";
import { normalizeLocationName, projectActiveLocationTree, projectArchivedLocationTree } from "./location-domain.ts";

const archivedAt = "2026-08-04T12:00:00.000Z";

describe("location domain", () => {
  test("normalizes whitespace, casing keys, accents, and Unicode equivalents", () => {
    const normalized = normalizeLocationName("  Étage\t e\u0301én  ");
    expect(normalized).toEqual({ ok: true, value: { name: "Étage één", normalizedName: "étage één" } });
    expect(normalizeLocationName("e")).not.toEqual(normalizeLocationName("é"));
  });

  test("rejects empty, separators, controls, and names beyond the boundary", () => {
    expect(normalizeLocationName(" \t ")).toEqual({ ok: false, error: "EMPTY" });
    expect(normalizeLocationName("Keuken › Kast")).toEqual({ ok: false, error: "INVALID_CHARACTER" });
    expect(normalizeLocationName("Kast\u0000")).toEqual({ ok: false, error: "INVALID_CHARACTER" });
    expect(normalizeLocationName("a".repeat(101))).toEqual({ ok: false, error: "TOO_LONG" });
    expect(normalizeLocationName("a".repeat(100)).ok).toBeTrue();
  });

  test("sorts naturally and projects direct and inherited archive status", () => {
    const rows = [
      { id: 1, parentId: null, name: "Keuken", archivedAt: null },
      { id: 2, parentId: 1, name: "Koelkast", archivedAt },
      { id: 3, parentId: 2, name: "Lade 10", archivedAt: null },
      { id: 4, parentId: 2, name: "Lade 2", archivedAt },
      { id: 5, parentId: 2, name: "Lade 1", archivedAt: null },
    ];
    expect(projectActiveLocationTree(rows)[0]?.children).toHaveLength(0);
    const archiveRoot = projectArchivedLocationTree(rows)[0]!;
    expect(archiveRoot.path).toBe("Keuken › Koelkast");
    expect(archiveRoot.children.map((node) => node.name)).toEqual(["Lade 1", "Lade 2", "Lade 10"]);
    expect(archiveRoot.children.map((node) => node.archivedAt)).toEqual([null, archivedAt, null]);
    expect(archiveRoot.children.every((node) => node.isEffectivelyArchived)).toBeTrue();
  });

  test("bounds corrupt cycles without recursive projection", () => {
    const rows = [
      { id: 1, parentId: 2, name: "A", archivedAt: null },
      { id: 2, parentId: 1, name: "B", archivedAt: null },
    ];
    expect(projectActiveLocationTree(rows)).toEqual([]);
    expect(projectArchivedLocationTree(rows)).toEqual([]);
  });
});
