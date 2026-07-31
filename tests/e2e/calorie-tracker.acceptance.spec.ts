import { expect, test, type APIRequestContext, type ConsoleMessage, type Page, type Request, type Response, type TestInfo } from "@playwright/test";
import {
  BACKEND_ORIGIN,
  CATALOG,
  FIXTURE_ORIGIN,
  LOGS,
  USER_A,
  USER_B,
  currentAmsterdamDate,
  shiftDate,
} from "./calorie-tracker.fixture-data";

const browserErrors = new WeakMap<Page, Array<string>>();

/** Prefix an app-internal route with the deployed Calorie Tracker base path. */
function appPath(path: string): string {
  return `/calory-tracker${path}`;
}

/** Determine whether an HTTP failure is an intentional private-log or concurrency outcome. */
function isExpectedHttpFailure(status: number, url: string): boolean {
  if (status !== 404 && status !== 409) return false;
  return url.startsWith(`${BACKEND_ORIGIN}/calorie-tracker/logs/`);
}

/** Capture browser console errors while leaving ordinary diagnostic messages untouched. */
function captureConsoleError(message: ConsoleMessage): void {
  if (message.type() !== "error") return;
  if (message.text().startsWith("Failed to fetch manifest patches TypeError: Failed to fetch")) return;
  const location = message.location().url;
  const statusMatch = message.text().match(/status of (404|409)/);
  if (statusMatch !== null && isExpectedHttpFailure(Number(statusMatch[1]), location)) return;
  const page = message.page();
  if (page === null) return;
  browserErrors.get(page)?.push(message.text());
}

/** Capture an uncaught browser defect for the current scenario. */
function capturePageError(page: Page, error: Error): void {
  browserErrors.get(page)?.push(error.message);
}

/** Capture an unexpected failed HTTP response for one scenario. */
function captureResponseFailure(page: Page, response: Response): void {
  if (response.status() < 400 || isExpectedHttpFailure(response.status(), response.url())) return;
  browserErrors.get(page)?.push(`Unexpected HTTP ${response.status()} for ${response.url()}`);
}

/** Capture a transport failure unless cancellation was an intentional stale-request abort. */
function captureRequestFailure(page: Page, request: Request): void {
  const failure = request.failure();
  if (failure === null || failure.errorText.includes("ERR_ABORTED")) return;
  browserErrors.get(page)?.push(`Request failed for ${request.url()}: ${failure.errorText}`);
}

/** Register browser-defect collection for one newly created Playwright page. */
function registerBrowserDiagnostics(page: Page): void {
  browserErrors.set(page, []);
  page.on("console", captureConsoleError);
  /** Bind the owning page to an otherwise page-less Playwright page-error callback. */
  function recordPageError(error: Error): void {
    capturePageError(page, error);
  }
  /** Bind the owning page to a failed response callback. */
  function recordResponseFailure(response: Response): void {
    captureResponseFailure(page, response);
  }
  /** Bind the owning page to a transport-failure callback. */
  function recordRequestFailure(request: Request): void {
    captureRequestFailure(page, request);
  }
  page.on("pageerror", recordPageError);
  page.on("response", recordResponseFailure);
  page.on("requestfailed", recordRequestFailure);
}

/** Reset the real temporary database to stable anonymous data before a scenario. */
async function resetFixture(request: APIRequestContext, date: string): Promise<void> {
  const response = await request.post(`${FIXTURE_ORIGIN}/reset`, { data: { date } });
  expect(response.ok(), await response.text()).toBe(true);
}

/** Authenticate through the rendered login form rather than injecting a session. */
async function loginThroughUi(page: Page, user: typeof USER_A | typeof USER_B = USER_A): Promise<void> {
  await page.goto(appPath("/login"));
  await page.getByLabel("E-mailadres").fill(user.email);
  await page.getByLabel("Wachtwoord").fill(user.password);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL(/\/calory-tracker\/(?:\?date=\d{4}-\d{2}-\d{2})?$/);
}

/** Attach a full-page PNG as an inspectable acceptance artifact. */
async function captureScenario(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await testInfo.attach(`${testInfo.project.name}-${name}`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

/** Return all object entries from a JSON array whose id equals the requested value. */
function countItemsWithId(value: unknown, id: string): number {
  if (!Array.isArray(value)) return 0;
  let count = 0;
  for (const item of value) {
    if (typeof item === "object" && item !== null && Reflect.get(item, "id") === id) count += 1;
  }
  return count;
}

/** Prepare deterministic persistence and browser diagnostics before every test. */
async function prepareScenario({ page, request }: { page: Page; request: APIRequestContext }): Promise<void> {
  registerBrowserDiagnostics(page);
  await resetFixture(request, currentAmsterdamDate());
}

/** Fail a completed scenario when the browser emitted an uncaught error. */
async function verifyBrowserDiagnostics({ page }: { page: Page }): Promise<void> {
  expect(browserErrors.get(page) ?? []).toEqual([]);
}

test.beforeEach(prepareScenario);
test.afterEach(verifyBrowserDiagnostics);

/** Group the executable Calorie Tracker browser acceptance scenarios. */
test.describe("Calorie Tracker acceptance slice", function calorieTrackerAcceptanceSlice(): void {
  /** Verify UI authentication, owner scoping, indistinguishable private IDs, and history navigation. */
  test("authenticates through UI and isolates private logs and deep links", async function authIsolationScenario({ page, context }): Promise<void> {
    const date = currentAmsterdamDate();
    await page.goto(appPath(`/logs/${LOGS.otherUser}?date=${date}&type=all`));
    await expect(page).toHaveURL(/\/calory-tracker\/login$/);

    await loginThroughUi(page);
    await page.goto(appPath(`/logs?date=${date}&type=all`));
    await expect(page.getByRole("link", { name: /Volkoren reep/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Privéproduct/ })).toHaveCount(0);

    await page.goto(appPath(`/logs/${LOGS.otherUser}?date=${date}&type=drink`));
    await expect(page.getByRole("heading", { name: "Log niet gevonden" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${LOGS.otherUser}\\?date=${date}&type=drink$`));

    await page.goto(appPath(`/logs/${LOGS.earlyFood}?date=${date}&type=food`));
    await expect(page.getByRole("heading", { name: "Logdetail" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${LOGS.earlyFood}\\?date=${date}&type=food$`));
    await page.goBack();
    await page.goForward();
    await expect(page.getByRole("heading", { name: "Logdetail" })).toBeVisible();

    await context.clearCookies();
    await loginThroughUi(page, USER_B);
    await page.goto(appPath(`/logs?date=${date}&type=all`));
    await expect(page.getByRole("link", { name: /Privéproduct/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Volkoren reep/ })).toHaveCount(0);
  });

  /** Verify all primary statistics states and durable accessible goal editing. */
  test("renders exceeded, empty, and normal statistics and persists modal goals", async function statisticsAndGoalsScenario({ page }, testInfo): Promise<void> {
    const date = currentAmsterdamDate();
    const emptyDate = shiftDate(date, -3);
    await loginThroughUi(page);
    await page.goto(appPath(`/?date=${date}`));

    await expect(page.getByText(/kcal boven doel/).first()).toBeVisible();
    await captureScenario(page, testInfo, "statistics-exceeded");

    const goalsOpener = page.getByRole("button", { name: "Persoonlijke dagdoelen beheren" });
    await goalsOpener.click();
    const dialog = page.getByRole("dialog", { name: "Persoonlijke dagdoelen" });
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel("Koolhydraten doel")).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(goalsOpener).toBeFocused();

    await goalsOpener.click();
    await page.getByLabel("Calorieën doel").fill("2000");
    await page.getByRole("button", { name: "Opslaan" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(/\/ 2\.000 kcal/)).toBeVisible();
    await expect(page.getByText(/kcal boven doel/)).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(/\/ 2\.000 kcal/)).toBeVisible();
    await captureScenario(page, testInfo, "statistics-normal");

    await page.goto(appPath(`/?date=${emptyDate}`));
    await expect(page.getByText(/0 \/ 2\.000 kcal/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Koolhydraten" })).toBeVisible();
    await expect(page.getByText("0 g", { exact: true }).first()).toBeVisible();
    await captureScenario(page, testInfo, "statistics-empty");
  });

  /** Verify URL context, chronological filtering, browser creation, and backend retry idempotency. */
  test("preserves date/filter context, sorts logs, creates through UI, and retries idempotently", async function createAndContextScenario({ page }): Promise<void> {
    const date = currentAmsterdamDate();
    const previousDate = shiftDate(date, -1);
    await loginThroughUi(page);

    await page.goto(appPath(`/?date=${previousDate}`));
    await page.getByRole("link", { name: "Consumptielogboek" }).click();
    await expect(page).toHaveURL(new RegExp(`/logs\\?date=${previousDate}&type=all$`));
    await expect(page.getByRole("heading", { name: "Nog geen consumpties" })).toBeVisible();

    await page.goto(appPath(`/logs?date=${date}&type=all`));
    const times = await page.locator("time").allTextContents();
    expect(times).toEqual([...times].sort());
    await page.getByRole("button", { name: "Drinken" }).click();
    await expect(page).toHaveURL(new RegExp(`date=${date}&type=drink$`));
    await expect(page.getByRole("link", { name: /Bronwater/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Volkoren reep/ })).toHaveCount(0);

    await page.getByRole("link", { name: "Log toevoegen" }).last().click();
    await expect(page).toHaveURL(new RegExp(`/logs/nieuw\\?date=${date}&type=drink$`));
    await page.getByPlaceholder("Zoek op product of merk").fill("Volkoren");
    const productResult = page.getByRole("button", { name: /Volkoren reep/ });
    await expect(productResult).toBeVisible();
    await productResult.click();
    await page.getByLabel("Hoeveelheid").fill("0,5");
    await page.getByRole("button", { name: "Log opslaan" }).click();
    await expect(page).toHaveURL(new RegExp(`/logs\\?date=${date}&type=drink$`));
    await expect(page.getByRole("link", { name: /Volkoren reep/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Alles" }).click();
    await expect(page.getByRole("link", { name: /0,5 reep/ })).toBeVisible();

    const createBody = {
      id: LOGS.idempotent,
      packageId: CATALOG.foodPackageId,
      quantity: "1.25",
      inputMode: "PACKAGE",
      inputUnitTypeId: null,
      consumedAt: `${previousDate}T06:00:00.000Z`,
    } as const;
    const headers = { "X-Browser-Timezone": "Europe/Amsterdam" };
    const first = await page.request.post(`${BACKEND_ORIGIN}/calorie-tracker/logs`, { data: createBody, headers });
    const retry = await page.request.post(`${BACKEND_ORIGIN}/calorie-tracker/logs`, { data: createBody, headers });
    expect(first.status()).toBe(201);
    expect(retry.status()).toBe(200);
    expect(await retry.json()).toMatchObject({ id: LOGS.idempotent });
    const list = await page.request.get(`${BACKEND_ORIGIN}/calorie-tracker/logs?date=${previousDate}&type=all`, { headers });
    const listBody: unknown = await list.json();
    expect(countItemsWithId(typeof listBody === "object" && listBody !== null ? Reflect.get(listBody, "items") : null, LOGS.idempotent)).toBe(1);
  });

  /** Verify current detail data, archived search rules, and optimistic-conflict recovery. */
  test("opens detail, exposes archived catalog data, and recovers an edit conflict", async function detailEditArchiveScenario({ page, request }): Promise<void> {
    const date = currentAmsterdamDate();
    await loginThroughUi(page);
    await page.goto(appPath(`/logs/${LOGS.earlyFood}?date=${date}&type=food`));
    await expect(page.getByText("240 kcal", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Bewerken" }).click();
    await expect(page.getByRole("dialog", { name: "Log bewerken" })).toBeVisible();

    const touch = await request.post(`${FIXTURE_ORIGIN}/touch-log`, { data: { id: LOGS.earlyFood } });
    expect(touch.ok()).toBe(true);
    await page.getByLabel("Hoeveelheid").fill("2,5");
    await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
    await expect(page.getByRole("alert")).toContainText("intussen gewijzigd");
    await page.getByRole("button", { name: "Actuele data herladen" }).click();
    await expect(page.getByRole("dialog", { name: "Log bewerken" })).toBeVisible();
    await page.getByLabel("Hoeveelheid").fill("2,5");
    await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
    await expect(page).toHaveURL(new RegExp(`/logs\\?date=${date}&type=food$`));
    await expect(page.getByRole("link", { name: /2,5 reep/ })).toBeVisible();

    await page.goto(appPath(`/logs/${LOGS.archived}?date=${date}&type=all`));
    await expect(page.getByText("Gearchiveerd", { exact: true })).toBeVisible();
    await page.goto(appPath(`/logs/nieuw?date=${date}&type=all`));
    await page.getByPlaceholder("Zoek op product of merk").fill("Archiefmix");
    await expect(page.getByText("Product niet gevonden", { exact: true })).toBeVisible();
  });

  /** Verify immediate soft deletion and both sides of the five-second restore boundary. */
  test("deletes, restores within five seconds, and rejects an expired undo", async function deleteUndoScenario({ page }): Promise<void> {
    const date = currentAmsterdamDate();
    await loginThroughUi(page);
    await page.goto(appPath(`/logs/${LOGS.earlyFood}?date=${date}&type=all`));
    await page.getByRole("button", { name: "Verwijderen" }).click();
    const undo = page.getByRole("button", { name: "Ongedaan maken" });
    await expect(undo).toBeVisible();
    await expect(page.getByRole("link", { name: /Volkoren reep/ })).toHaveCount(0);
    await undo.click();
    await expect(page.getByRole("link", { name: /Volkoren reep/ })).toBeVisible();

    await page.goto(appPath(`/logs/${LOGS.earlyFood}?date=${date}&type=all`));
    await page.getByRole("button", { name: "Verwijderen" }).click();
    await expect(undo).toBeVisible();
    await expect(undo).toBeHidden({ timeout: 7_000 });
    const expiredRestore = await page.request.post(`${BACKEND_ORIGIN}/calorie-tracker/logs/${LOGS.earlyFood}/restore`, {
      headers: { "X-Browser-Timezone": "Europe/Amsterdam" },
    });
    expect(expiredRestore.status()).toBe(409);
  });

  /** Verify the mobile fixed-action geometry and desktop modal focus containment. */
  test("keeps the mobile CTA clear and traps focus in the desktop route modal", async function responsiveModalScenario({ page }, testInfo): Promise<void> {
    const date = currentAmsterdamDate();
    await loginThroughUi(page);
    await page.goto(appPath(`/logs?date=${date}&type=all`));

    if (testInfo.project.name === "mobile-chromium") {
      const callToAction = page.getByRole("link", { name: "Log toevoegen" }).last();
      const tabBar = page.getByRole("navigation", { name: "Hoofdnavigatie" });
      const actionBox = await callToAction.boundingBox();
      const tabBarBox = await tabBar.boundingBox();
      expect(actionBox).not.toBeNull();
      expect(tabBarBox).not.toBeNull();
      if (actionBox !== null && tabBarBox !== null) expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(tabBarBox.y);
      await captureScenario(page, testInfo, "mobile-logbook-no-overlap");
      await callToAction.click();
      const mobileDialogBox = await page.getByRole("dialog", { name: "Consumptielog aanmaken" }).boundingBox();
      expect(mobileDialogBox?.width ?? 0).toBeGreaterThanOrEqual(350);
    } else {
      await page.getByRole("link", { name: "Log toevoegen" }).first().click();
      const dialog = page.getByRole("dialog", { name: "Consumptielog aanmaken" });
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(640);
      const firstControl = page.getByRole("button", { name: "Sluiten" });
      const lastControl = page.getByRole("button", { name: "Log opslaan" });
      await lastControl.focus();
      await page.keyboard.press("Tab");
      await expect(firstControl).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(lastControl).toBeFocused();
    }
    await captureScenario(page, testInfo, "create-route-modal");
  });
});
