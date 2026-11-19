// Installed Windows QA checks the real anonymous official gate, without a
// fabricated account, telemetry, or a credential exported from another machine.
import { _electron as electron, expect } from "@playwright/test";
const app = await electron.launch({
  executablePath: process.env.EDITAI_EXECUTABLE,
  args: [],
  timeout: 60000,
  env: {
    ...process.env,
    PUBLIK_SELF_TEST: "",
    DO_NOT_TRACK: "1",
    PUBLIK_TELEMETRY: "false",
  },
});
try {
  const page = await app.firstWindow();
  await expect(
    page.getByRole("button", { name: "Sign in with publik", exact: true }),
  ).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByRole("button", { name: "Upload clips" }),
  ).toHaveCount(0);
  const prefs = await app.evaluate(({ BrowserWindow }) => {
    const p =
      BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return {
      sandbox: p.sandbox,
      contextIsolation: p.contextIsolation,
      nodeIntegration: p.nodeIntegration,
    };
  });
  if (!prefs.sandbox || !prefs.contextIsolation || prefs.nodeIntegration)
    throw Error("Renderer isolation failed.");
  console.log(
    "Installed official sign-in gate and renderer isolation passed. Interactive signed-in editing requires separate acceptance.",
  );
} finally {
  await app.close();
}
