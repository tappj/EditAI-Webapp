// UI-only fixture in the installed renderer. This does not prove provider access.
// A separate, unmocked desktop acceptance run remains required for publication.
import { _electron as electron, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const executable =
  process.env.EDITAI_EXECUTABLE ||
  "/Applications/EditAI.app/Contents/MacOS/EditAI";
const app = await electron.launch({
  executablePath: executable,
  args: [],
  env: {
    ...process.env,
    PUBLIK_SELF_TEST: "",
    DNT: "1",
    DO_NOT_TRACK: "1",
    PUBLIK_TELEMETRY: "false",
  },
});
const report = {
  fixtures: true,
  providerConnectivityVerified: false,
  date: new Date().toISOString(),
};
let page, previousDraft;
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(30000);
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().forEach((window) =>
      window.webContents.setAudioMuted(true),
    ),
  );
  await expect(page.getByRole("heading", { name: /^Welcome/ })).toBeVisible();
  previousDraft = await page.evaluate(() =>
    localStorage.getItem("editai-studio-onboarding-v1"),
  );
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        screen: { id: "sign_in", title: "Sign in with publik", buttons: [] },
        profile: { consent: false, telemetry: false },
      },
    }),
  );
  await page.route("**/api/telemetry", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.evaluate(() =>
    localStorage.setItem(
      "editai-studio-onboarding-v1",
      JSON.stringify({
        step: "estimate",
        answers: { editingTime: ["3 to 6 hours"], volume: ["3 to 5 a week"] },
      }),
    ),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  const button = page.getByRole("button", {
    name: "See your time savings",
    exact: true,
  });
  await expect(button).toBeEnabled();
  await expect(button).toHaveCSS("background-color", "rgb(50, 106, 180)");
  await expect(page.getByRole("link", { name: "Back to EditAI" })).toHaveCount(
    0,
  );
  await expect(
    page.locator(".sign-in-header").getByRole("link", { name: "EditAI home" }),
  ).toBeVisible();
  await button.click();
  await expect(
    page.locator(".monthly-time-legend [data-activity=saved] strong"),
  ).toHaveAttribute("data-minutes", "1115");
  await expect(
    page.locator(".monthly-time-legend [data-activity=editing] strong"),
  ).toHaveAttribute("data-minutes", "85");
  await expect(page.locator(".studio-onboarding-hour-grid span")).toHaveCount(
    720,
  );
  expect(
    await page
      .locator(".monthly-time-legend strong")
      .evaluateAll((values) =>
        values.reduce((sum, node) => sum + Number(node.dataset.minutes), 0),
      ),
  ).toBe(43200);
  await page.screenshot({ path: "outputs/desktop-time-savings.png" });
  report.nativeGraph = true;
  report.blueButton = true;
  report.noBackLink = true;
  report.monthMinutes = 43200;
  report.savedMinutes = 1115;
  report.editaiMinutes = 85;
  report.archiveSha256 = createHash("sha256")
    .update(
      await readFile(
        executable.replace(
          /\/Contents\/MacOS\/EditAI$/,
          "/Contents/Resources/app.asar",
        ),
      ),
    )
    .digest("hex");
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
} finally {
  if (page && previousDraft !== undefined) {
    await page
      .evaluate(
        (draft) =>
          draft === null
            ? localStorage.removeItem("editai-studio-onboarding-v1")
            : localStorage.setItem("editai-studio-onboarding-v1", draft),
        previousDraft,
      )
      .catch(() => {});
    await page.unroute("**/api/session");
    await page.unroute("**/api/telemetry");
    await page.reload();
    try {
      await expect(
        page.getByRole("heading", { name: /^Welcome/ }),
      ).toBeVisible();
      report.restoredGenuineSession = true;
    } catch (error) {
      report.error ||= error.message;
      process.exitCode = 1;
    }
  }
  await writeFile(
    "outputs/desktop-savings-verification.json",
    JSON.stringify(report, null, 2),
  );
  console.log({
    nativeGraph: report.nativeGraph,
    fixtures: true,
    restoredGenuineSession: report.restoredGenuineSession,
    error: report.error,
  });
  await app.close();
}
