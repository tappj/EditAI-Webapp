import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ DNT: "1" });
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        screen: { id: "sign_in", title: "Sign in with publik", buttons: [] },
        profile: { consent: false, telemetry: false },
      },
    }),
  );
});
test("Eva's feature orbit moves, pauses for details, and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const orbit = page.locator(".feature-orbit"),
    feature = page.locator('.orbit-feature[data-feature="batch"]');
  await expect(page.locator(".orbit-feature")).toHaveCount(6);
  await expect(
    page.locator('.orbit-feature[data-feature="export"]'),
  ).toHaveCount(0);
  await orbit.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(orbit).toHaveAttribute("data-paused", "false");
  const transform = await feature.evaluate((el) => el.style.transform);
  await expect
    .poll(() => feature.evaluate((el) => el.style.transform))
    .not.toBe(transform);
  const box = (await feature.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(orbit).toHaveAttribute("data-paused", "true");
  await expect(page.locator(".feature-orbit-detail")).toContainText(
    "Queue up to 10",
  );
  const stopped = await feature.evaluate((el) => el.style.transform);
  await page.waitForTimeout(150);
  expect(await feature.evaluate((el) => el.style.transform)).toBe(stopped);
  await feature.click();
  await page.mouse.move(0, 0);
  await expect(page.locator(".feature-orbit-detail")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".feature-orbit-detail")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(orbit).toHaveAttribute("data-paused", "true");
  await page.locator('.orbit-feature[data-feature="audio"]').focus();
  await expect(page.locator(".feature-orbit-detail")).toContainText(
    "word-timed transcript",
  );
  await expect(
    orbit.locator(".feature-orbit-eva .editai-mascot"),
  ).toHaveAttribute("data-eva-theme", "editAI");
  await page.screenshot({
    path: "outputs/workflow58/feature-orbit.png",
    fullPage: false,
  });
});
test("website contact accepts an optional reply address, omits attachments and preserves failed drafts", async ({
  page,
}) => {
  let rejected = true;
  const requests: any[] = [];
  await page.route("**/api/contact", (r) => {
    requests.push(r.request().postDataJSON());
    return r.fulfill(
      rejected
        ? {
            status: 502,
            json: { error: "Your message could not be sent. Try again." },
          }
        : { json: { ok: true } },
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Contact us", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Contact EditAI",
    exact: true,
  });
  await expect(dialog.locator("input[type=file]")).toHaveCount(0);
  await expect(dialog.getByLabel("Message", { exact: true })).toHaveAttribute(
    "placeholder",
    "Tell us what you’d like to know or share.",
  );
  await dialog
    .getByLabel("Message", { exact: true })
    .fill("A question about EditAI");
  await expect(
    dialog.getByRole("button", { name: "Send message", exact: true }),
  ).toBeEnabled();
  await dialog
    .getByLabel("Your email (Optional, if you want us to get back to you)", {
      exact: true,
    })
    .fill("reply@example.com");
  await dialog
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Try again");
  await expect(dialog.getByLabel("Message", { exact: true })).toHaveValue(
    "A question about EditAI",
  );
  rejected = false;
  await dialog
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText("has been sent");
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[0].email).toBe("reply@example.com");
  expect(requests[0].images).toBeUndefined();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Contact us", exact: true }).click();
  await dialog.getByLabel("Message", { exact: true }).fill("No reply needed");
  await dialog
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText("has been sent");
  expect(requests[2].email).toBeUndefined();
});
