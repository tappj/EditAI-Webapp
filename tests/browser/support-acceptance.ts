import { expect, type Page } from "@playwright/test";
export async function verifySupportDialog(page: Page) {
  let requests: any[] = [];
  let reject = true;
  const native = page.url().startsWith("editai:");
  if (native) {
    // Renderer-only UI fixture: Electron's main-process relay bypasses CDP routes.
    await page.evaluate(() => {
      const original = window.fetch;
      const fixture = { reject: true, requests: [] as any[], original };
      (window as any).__supportFixture = fixture;
      window.fetch = async (input, init) => {
        if (
          new URL(
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : input.url,
            location.href,
          ).pathname === "/api/support"
        ) {
          fixture.requests.push(JSON.parse(init!.body as string));
          return fixture.reject
            ? Response.json(
                {
                  error:
                    "Your report could not be sent. Your message is still here; please try again.",
                },
                { status: 502 },
              )
            : Response.json({ ok: true });
        }
        return original(input, init);
      };
    });
  } else
    await page.route("**/api/support", async (r) => {
      requests.push(r.request().postDataJSON());
      await r.fulfill(
        reject
          ? {
              status: 502,
              json: {
                error:
                  "Your report could not be sent. Your message is still here; please try again.",
              },
            }
          : { json: { ok: true } },
      );
    });
  try {
    const clips = await page.locator(".timeline-clip").count();
    await page.getByRole("button", { name: "Support", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "Contact support",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog
      .getByLabel("Your email (Optional, if you want us to get back to you)", {
        exact: true,
      })
      .fill("reply@example.com");
    await expect(
      dialog.getByLabel("Title", { exact: true }),
    ).not.toHaveAttribute("required");
    await dialog
      .getByLabel("Message", { exact: true })
      .fill("Please investigate my Eva edit");
    const image = {
      name: "error.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
        "base64",
      ),
    };
    await dialog
      .getByLabel("Attach screenshots or images", { exact: true })
      .setInputFiles([image, { ...image, name: "remove.png" }]);
    await expect(dialog.locator(".support-image-list li")).toHaveCount(2);
    await dialog
      .getByRole("button", { name: "Remove image remove.png", exact: true })
      .click();
    await expect(dialog.locator(".support-image-list li")).toHaveCount(1);
    await dialog
      .getByLabel("Attach screenshots or images", { exact: true })
      .setInputFiles([image, image, image]);
    await expect(dialog.getByRole("alert")).toContainText("up to 3 images");
    await expect(dialog.locator(".support-image-list li")).toHaveCount(1);
    await dialog
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("could not be sent");
    await expect(dialog.getByLabel("Message", { exact: true })).toHaveValue(
      "Please investigate my Eva edit",
    );
    reject = false;
    if (native)
      await page.evaluate(
        () => ((window as any).__supportFixture.reject = false),
      );
    await dialog
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText("has been sent");
    if (native)
      requests = await page.evaluate(
        () => (window as any).__supportFixture.requests,
      );
    expect(requests).toHaveLength(2);
    expect(requests[0].id).toBe(requests[1].id);
    expect(requests[0].title).toBe("");
    expect(requests[0].email).toBe("reply@example.com");
    expect(requests[0].images).toEqual([
      {
        name: "error.png",
        type: "image/png",
        content: image.buffer.toString("base64"),
      },
    ]);
    expect(requests[1].images).toEqual(requests[0].images);
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Support", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Close support", exact: true })
      .focus();
    await page.keyboard.press("Delete");
    expect(await page.locator(".timeline-clip").count()).toBe(clips);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    const layout = await page.locator(".timeline-toolbar").evaluate((el) => {
      const icon = el
          .querySelector(".timeline-edit-actions button")!
          .getBoundingClientRect(),
        bar = el.getBoundingClientRect(),
        timeline = el.parentElement!.getBoundingClientRect();
      return {
        above: icon.top - timeline.top,
        below: bar.bottom - icon.bottom,
      };
    });
    expect(Math.abs(layout.above - layout.below)).toBeLessThanOrEqual(2);
    return {
      inApp: true,
      imageAttachments: true,
      imageRemoval: true,
      attachmentLimits: true,
      attachmentsPreservedOnError: true,
      optionalTitle: true,
      preservedOnError: true,
      stableRetry: true,
      keyboardIsolation: true,
      balancedToolbar: true,
      fixtures: true,
      emailDeliveryVerified: false,
    };
  } finally {
    if (native)
      await page.evaluate(() => {
        const f = (window as any).__supportFixture;
        if (f) {
          window.fetch = f.original;
          delete (window as any).__supportFixture;
        }
      });
    else await page.unroute("**/api/support");
    const close = page.getByRole("button", {
      name: "Close support",
      exact: true,
    });
    if (await close.isVisible()) await close.click();
  }
}
