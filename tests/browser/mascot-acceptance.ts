import { expect, type Locator, type Page } from "@playwright/test";

/** Rendered acceptance for the reference-style mascot; provider access is checked separately. */
export async function verifyReferenceMascot(
  page: Page,
  actor: Locator,
  checkOffscreen = true,
) {
  await expect(actor).toHaveAttribute("data-ready", "true");
  await page.mouse.move(0, 0);
  await expect(actor.locator(".mascot-blush")).toHaveCSS("opacity", "0");
  await expect(actor.locator(".mascot-sparkles")).toHaveCSS("opacity", "0");
  await expect(actor.locator(".mascot-arm-rest")).toHaveCSS("opacity", "1");
  await expect(actor.locator(".mascot-play-buttons path")).toHaveCount(2);
  await expect(actor.locator(".mascot-ground-shadow")).toHaveCount(1);
  await expect(actor.locator(".mascot-ground-shadow")).toHaveCSS(
    "background-image",
    /radial-gradient/,
  );
  const streaks = await actor.locator(".mascot-blush path").getAttribute("d");
  expect(streaks?.match(/M/g)).toHaveLength(6);
  const lowerCenter = await actor
    .locator(".mascot-body-open")
    .evaluate((node) => {
      const im = node as HTMLImageElement,
        c = document.createElement("canvas");
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(im, 0, 0);
      return ctx.getImageData(
        Math.round(c.width * 0.51),
        Math.round(c.height * 0.84),
        1,
        1,
      ).data[3];
    });
  expect(lowerCenter).toBeGreaterThan(240);
  const hands = await actor
    .locator(".mascot-wave .mascot-arm")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const im = node as HTMLImageElement,
          c = document.createElement("canvas");
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(im, 0, 0);
        const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
        let left = c.width,
          top = c.height,
          right = 0,
          bottom = 0;
        for (let y = 0; y < c.height; y++)
          for (let x = 0; x < c.width; x++) {
            if (pixels[(y * c.width + x) * 4 + 3] > 220) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
          }
        return {
          top: top / c.height,
          bottom: bottom / c.height,
          width: (right - left) / c.width,
          height: (bottom - top) / c.height,
        };
      }),
    );
  // A short mitten below the headphone icons, without the oversized bent arm.
  for (const hand of hands) {
    expect(hand.top).toBeGreaterThan(0.42);
    expect(hand.bottom).toBeLessThan(0.65);
    expect(hand.width).toBeLessThan(0.21);
    expect(hand.height).toBeLessThan(0.21);
  }
  const blink = await actor.evaluate(async (el) => {
    el.querySelector(".mascot-float")!
      .getAnimations()
      .forEach((a) => a.pause());
    const eyes = el.querySelector(".mascot-eyes")!,
      animation = eyes.getAnimations()[0];
    animation.pause();
    const duration = Number(animation.effect!.getTiming().duration);
    const sample = async (progress: number) => {
      animation.currentTime = duration * progress;
      await new Promise(requestAnimationFrame);
      return {
        awake: Number(
          getComputedStyle(el.querySelector(".mascot-eyes-awake")!).opacity,
        ),
        closed: Number(
          getComputedStyle(el.querySelector(".mascot-eyes-closed")!).opacity,
        ),
        body: el
          .querySelector(".mascot-body-open")!
          .getBoundingClientRect()
          .toJSON(),
        face: el
          .querySelector(".mascot-face")!
          .getBoundingClientRect()
          .toJSON(),
      };
    };
    const open = await sample(0.5),
      shut = await sample(0.93),
      reopened = await sample(0.96);
    animation.currentTime = 0;
    animation.play();
    return { open, shut, reopened };
  });
  expect([blink.open.awake, blink.open.closed]).toEqual([1, 0]);
  expect([blink.shut.awake, blink.shut.closed]).toEqual([0, 1]);
  expect([blink.reopened.awake, blink.reopened.closed]).toEqual([1, 0]);
  expect(blink.shut.body).toEqual(blink.open.body);
  expect(blink.shut.face).toEqual(blink.open.face);
  await actor.hover();
  await expect(actor.locator(".mascot-eyes-happy")).toHaveCSS(
    "display",
    "inline",
  );
  await expect(actor.locator(".mascot-blush")).toHaveCSS("opacity", "1");
  await expect(actor.locator(".mascot-sparkles")).toHaveCSS("opacity", "1");
  await expect(actor.locator(".mascot-arm-rest")).toHaveCSS("opacity", "0");
  const waving = await actor.evaluate(async (el) => {
    const frames: string[] = [],
      bodyBoxes: string[] = [],
      sparkles: string[] = [];
    let instant = true;
    for (let i = 0; i < 70; i++) {
      await new Promise(requestAnimationFrame);
      const a = getComputedStyle(el.querySelector(".mascot-wave-a")!),
        b = getComputedStyle(el.querySelector(".mascot-wave-b")!);
      frames.push(a.opacity + ":" + b.opacity);
      instant &&=
        getComputedStyle(el.querySelector(".mascot-blush")!).opacity === "1";
      instant &&= a.transform === "none" && b.transform === "none";
      bodyBoxes.push(
        JSON.stringify(
          el
            .querySelector(".mascot-body-open")!
            .getBoundingClientRect()
            .toJSON(),
        ),
      );
      sparkles.push(
        getComputedStyle(el.querySelector(".mascot-sparkle")!).transform,
      );
    }
    return {
      frames: [...new Set(frames)].sort(),
      fixedBody: new Set(bodyBoxes).size === 1,
      instant,
      twinkling: new Set(sparkles).size > 1,
    };
  });
  expect(waving.frames).toEqual(["0:1", "1:0"]);
  expect(waving.fixedBody, "Waving must keep the body fixed").toBe(true);
  expect(waving.instant, "Wave poses and blush must switch instantly").toBe(
    true,
  );
  expect(waving.twinkling, "Visible waving sparkles must animate").toBe(true);
  await page.mouse.move(0, 0);
  await expect(actor.locator(".mascot-blush")).toHaveCSS("opacity", "0");
  await expect(actor.locator(".mascot-sparkles")).toHaveCSS("opacity", "0");
  await expect(actor.locator(".mascot-arm-rest")).toHaveCSS("opacity", "1");
  await actor.evaluate((el) => {
    el.setAttribute("data-state", "working");
  });
  const snip = await actor.evaluate(async (el) => {
    const rig = el.querySelector(".mascot-rig")!;
    const animation = rig.getAnimations()[0];
    animation.pause();
    const duration = Number(animation.effect!.getTiming().duration);
    const sample = async (time: number) => {
      animation.currentTime = time;
      await new Promise(requestAnimationFrame);
      return [".mascot-body-open", ".mascot-body-closed"].map((selector) =>
        Number(getComputedStyle(el.querySelector(selector)!).opacity),
      );
    };
    const open = await sample(duration * 0.25),
      closed = await sample(duration * 0.75);
    const images = [
      el.querySelector(".mascot-body-open"),
      el.querySelector(".mascot-body-closed"),
    ] as HTMLImageElement[];
    const pixels = images.map((im) => {
      const c = document.createElement("canvas");
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(im, 0, 0);
      return ctx.getImageData(0, 0, c.width, c.height).data;
    });
    let headDifferences = 0,
      scissorsDifferences = 0;
    for (let i = 0; i < pixels[0].length; i++) {
      if (pixels[0][i] !== pixels[1][i]) {
        const y = Math.floor(i / 4 / images[0].naturalWidth);
        if (y < 540) headDifferences++;
        else scissorsDifferences++;
      }
    }
    return { open, closed, headDifferences, scissorsDifferences };
  });
  expect(snip.open).toEqual([1, 0]);
  expect(snip.closed).toEqual([0, 1]);
  expect(snip.headDifferences).toBe(0);
  expect(snip.scissorsDifferences).toBeGreaterThan(1000);
  await actor.evaluate((el) => {
    el.setAttribute("data-state", "idle");
  });
  const inward = await actor
    .locator(".mascot-play-buttons path")
    .last()
    .getAttribute("transform");
  expect(inward).toContain("scale(-1 1)");
  expect(inward).toContain("translate(79.6 36)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await actor.hover();
  await expect(actor.locator(".mascot-eyes")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(actor.locator(".mascot-wave")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(actor.locator(".mascot-sparkle").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  if (checkOffscreen) {
    await page.setViewportSize({ width: 390, height: 420 });
    await page.mouse.move(0, 0);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await expect(actor).toHaveAttribute("data-paused", "true");
  }
  return {
    restoredFloatingDesign: true,
    fixedBody: true,
    stableBlink: true,
    twoFrameWave: true,
    compactMitten: true,
    cutting: true,
    inwardPlay: true,
    rapidExpressions: true,
    streakBlush: true,
    headphonePlay: true,
    sparkles: true,
    homeShadow: true,
    reducedMotion: true,
  };
}
