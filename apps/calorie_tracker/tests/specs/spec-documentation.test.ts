import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type SpecPlanRow = {
  readonly specPath: string;
  readonly planPath: string;
  readonly planType: string;
  readonly status: string;
};

const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const specsRoot = join(workspaceRoot, "docs/specs");
const planIndexPath = join(workspaceRoot, "docs/plans/specs-implementatieplan-index.md");

/**
 * Convert an absolute path to a stable workspace-relative markdown path.
 *
 * @param absolutePath - The absolute file path to convert.
 * @returns A workspace-relative path that uses forward slashes.
 */
function toWorkspacePath(absolutePath: string): string {
  return relative(workspaceRoot, absolutePath).replaceAll("\\", "/");
}

/**
 * Read a UTF-8 text file relative to the workspace root.
 *
 * @param workspacePath - The workspace-relative file path to read.
 * @returns The file contents as UTF-8 text.
 */
function readWorkspaceFile(workspacePath: string): string {
  return readFileSync(join(workspaceRoot, workspacePath), "utf8");
}

/**
 * Recursively list markdown files under a directory.
 *
 * @param directory - The absolute directory path to scan.
 * @returns Stable workspace-relative markdown paths.
 */
function listMarkdownFiles(directory: string): ReadonlyArray<string> {
  const markdownFiles: Array<string> = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      markdownFiles.push(...listMarkdownFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      markdownFiles.push(toWorkspacePath(entryPath));
    }
  }

  return markdownFiles.sort();
}

/**
 * Parse spec-to-plan rows from the implementation plan index coverage table.
 *
 * @param markdown - The markdown text of the implementation plan index.
 * @returns Parsed spec-to-plan coverage rows.
 */
function parseSpecPlanRows(markdown: string): ReadonlyArray<SpecPlanRow> {
  const rows: Array<SpecPlanRow> = [];
  const rowPattern = /^\| `(docs\/specs\/[^`]+)` \| `(docs\/plans\/[^`]+)` \| ([^|]+) \| ([^|]+) \|$/u;

  for (const line of markdown.split(/\r?\n/u)) {
    const match = rowPattern.exec(line.trim());

    if (match === null) {
      continue;
    }

    const specPath = match[1];
    const planPath = match[2];
    const planType = match[3];
    const status = match[4];

    if (specPath === undefined || planPath === undefined || planType === undefined || status === undefined) {
      continue;
    }

    rows.push({
      specPath,
      planPath,
      planType: planType.trim(),
      status: status.trim(),
    });
  }

  return rows;
}

/**
 * Decide whether a plan should explicitly describe executable test or verification work.
 *
 * @param row - The spec-to-plan coverage row to classify.
 * @returns True when the plan is not only a roadmap or index plan.
 */
function shouldDescribeTestWork(row: SpecPlanRow): boolean {
  const normalizedPlanType = row.planType.toLocaleLowerCase("nl-NL");
  return !normalizedPlanType.includes("roadmap") && !normalizedPlanType.includes("index");
}

/**
 * Detect a concrete test or verification agreement in a plan document.
 *
 * @param markdown - The markdown text of the plan document.
 * @returns True when the plan contains a tests or verification section.
 */
function hasTestAgreement(markdown: string): boolean {
  return /(?:^|\n)#{2,3}\s+(?:Stap\s+\d+\s+[—-]\s+)?(?:Tests?|Verificatie)\b/iu.test(markdown);
}

/**
 * Parse the scripts object from a package manifest.
 *
 * @param packageJson - The parsed package manifest to inspect.
 * @returns The package scripts that are string commands.
 */
function parsePackageScripts(packageJson: unknown): Record<string, string> {
  if (typeof packageJson !== "object" || packageJson === null || !("scripts" in packageJson)) {
    return {};
  }

  const scripts = packageJson.scripts;

  if (typeof scripts !== "object" || scripts === null) {
    return {};
  }

  const parsedScripts: Record<string, string> = {};

  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command === "string") {
      parsedScripts[name] = command;
    }
  }

  return parsedScripts;
}

describe("doorlopende specsuite", () => {
  const planIndexMarkdown = readFileSync(planIndexPath, "utf8");
  const planRows = parseSpecPlanRows(planIndexMarkdown);

  it("koppelt elke specificatie in docs/specs aan een uitvoerbaar plan", () => {
    const specs = listMarkdownFiles(specsRoot);
    const linkedSpecs = new Set(planRows.map((row) => row.specPath));
    const unlinkedSpecs = specs.filter((specPath) => !linkedSpecs.has(specPath));

    expect(specs.length).toBeGreaterThan(0);
    expect(unlinkedSpecs).toEqual([]);
  });

  it("verwijst vanuit de coverage-tabel alleen naar bestaande specs en plannen", () => {
    const missingPaths = planRows.flatMap((row) => {
      const pathsToCheck = [row.specPath, row.planPath];
      return pathsToCheck.filter((workspacePath) => !existsSync(join(workspaceRoot, workspacePath)));
    });

    expect(planRows.length).toBeGreaterThan(0);
    expect(missingPaths).toEqual([]);
  });

  it("borgt dat featureplannen test- of verificatieafspraken beschrijven", () => {
    const plansWithoutTestAgreement = planRows
      .filter(shouldDescribeTestWork)
      .filter((row) => !hasTestAgreement(readWorkspaceFile(row.planPath)))
      .map((row) => row.planPath);

    expect(plansWithoutTestAgreement).toEqual([]);
  });

  it("houdt een root Vitest-run en watch-run beschikbaar", () => {
    const scripts = parsePackageScripts(JSON.parse(readWorkspaceFile("package.json")));

    expect(scripts["test:specs"]).toContain("vitest");
    expect(scripts["test:specs"]).toContain("--run");
    expect(scripts["test:specs:watch"]).toContain("vitest");
    expect(scripts["test:specs:watch"]).toContain("--watch");
    expect(scripts["test:specs:watch"]).toContain("--bail=1");
  });
});
