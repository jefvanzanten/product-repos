import { chromium, type FullConfig } from "@playwright/test";
import { z } from "zod";

/** Warm the Vite dependency graph before browser diagnostics become part of an acceptance scenario. */
export default async function warmCalorieTracker(config: FullConfig): Promise<void> {
  const projectBaseUrl = z.string().parse(config.projects[0]?.use.baseURL);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        const response = await page.goto(new URL("login", `${projectBaseUrl}/`).toString(), { waitUntil: "networkidle" });
        if (response?.ok() && await page.getByLabel("E-mailadres").isVisible()) return;
      } catch {
        // Vite may invalidate its first optimized graph; the bounded warmup owns this transient state.
      }
      await page.waitForTimeout(500);
    }
    throw new Error("Calorie Tracker frontend did not stabilize during E2E warmup");
  } finally {
    await browser.close();
  }
}
