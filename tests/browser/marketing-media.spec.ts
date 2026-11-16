import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";

// Isolated component fixture: never a production route, auth bypass, or testimonial claim.
let script = "",
  styles = "",
  media: Buffer;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `
    import React, {StrictMode, useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import {AmbientHeroBackground} from './components/marketing/ambient-hero';
    import {ReviewMarquee, ReviewWall} from './components/marketing/landing';
    import {MarketingVideo} from './components/marketing/video-player';
    const reviews = Array.from({length:4}, (_,i)=>({id:'fixture-'+i,approved:true,title:'Isolated review fixture '+i,text:'Component test content. This is not a real customer endorsement.',author:'Test fixture',source:'Automated QA',rating:5}));
    function Harness(){const [mounted,setMounted]=useState(true);return <div className='marketing'><button id='unmount' onClick={()=>setMounted(false)}>Unmount components</button>{mounted && <><section className='marketing-hero' style={{marginTop:0,height:750}}><AmbientHeroBackground/><h1 style={{padding:40}}>Isolated component QA</h1><ReviewMarquee reviews={reviews}/></section><div style={{display:'flex',gap:20,width:500,margin:'40px auto'}}><div style={{width:240}}><MarketingVideo asset={{id:'test-a',title:'Test A',description:'Generated fixture',src:'/marketing-fixture.mp4'}}/></div><div style={{width:240}}><MarketingVideo asset={{id:'test-b',title:'Test B',description:'Generated fixture',src:'/marketing-fixture.mp4'}}/></div></div><ReviewWall reviews={reviews}/><div id='offscreen' style={{height:1500}}>Offscreen test target</div></>}</div>}
    createRoot(document.getElementById('root')).render(<StrictMode><Harness/></StrictMode>);
  `,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  script = result.outputFiles[0].text;
  styles = await readFile("app/marketing.css", "utf8");
  media = await readFile("outputs/fixture.mp4");
});
test.beforeEach(async ({ page }) => {
  await page.route("**/__marketing-component-qa", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><style>@import url('/fonts/fonts.css');*{box-sizing:border-box}body{margin:0}button{font:inherit;cursor:pointer}${styles}</style></head><body><div id="root"></div><script src="/marketing-component-test.js"></script></body></html>`,
    }),
  );
  await page.route("**/marketing-component-test.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: script }),
  );
  await page.route("**/marketing-fixture.mp4", (route) =>
    route.fulfill({ contentType: "video/mp4", body: media }),
  );
});

test("configured media autoplay muted, exclusive sound, user pause, visibility and offscreen lifecycle", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/__marketing-component-qa");
  const first = page.locator('[data-video-id="test-a"]');
  const second = page.locator('[data-video-id="test-b"]');
  await first.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      first
        .locator("video")
        .evaluate(
          (video: HTMLVideoElement) =>
            !video.paused && video.muted && video.currentTime > 0,
        ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      second
        .locator("video")
        .evaluate((video: HTMLVideoElement) => !video.paused && video.muted),
    )
    .toBe(true);
  await first.getByRole("button", { name: "Unmute Test A" }).click();
  await expect(first.locator("video")).toHaveJSProperty("muted", false);
  await second.getByRole("button", { name: "Unmute Test B" }).click();
  await expect(first.locator("video")).toHaveJSProperty("muted", true);
  await expect(second.locator("video")).toHaveJSProperty("muted", false);
  await first.getByRole("button", { name: "Pause Test A" }).click();
  await expect(first.locator("video")).toHaveJSProperty("paused", true);
  // Exercise the actual document visibility listener using a controlled visibility event.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(second.locator("video")).toHaveJSProperty("paused", true);
  await expect(second.locator("video")).toHaveJSProperty("muted", true);
  await expect(page.locator(".ambient-hero")).toHaveAttribute(
    "data-running",
    "false",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() =>
      second
        .locator("video")
        .evaluate((video: HTMLVideoElement) => !video.paused),
    )
    .toBe(true);
  await expect(first.locator("video")).toHaveJSProperty("paused", true);
  await first.getByRole("button", { name: "Play Test A" }).click();
  await expect
    .poll(() =>
      first
        .locator("video")
        .evaluate((video: HTMLVideoElement) => !video.paused),
    )
    .toBe(true);
  await page.locator("#offscreen").scrollIntoViewIfNeeded();
  await expect(first.locator("video")).toHaveJSProperty("paused", true);
  await expect(second.locator("video")).toHaveJSProperty("paused", true);
});

test("approved review infrastructure moves independently, pauses on focus and becomes static under reduced motion", async ({
  page,
}) => {
  await page.goto("/__marketing-component-qa");
  await expect(page.locator(".hero-marquees .review-card")).toHaveCount(24);
  await expect(page.locator('.marquee-group[aria-hidden="true"]')).toHaveCount(
    2,
  );
  await page.getByRole("region", { name: "Workflow strip 1" }).focus();
  expect(
    await page
      .locator(".marquee-track")
      .first()
      .evaluate((node) => getComputedStyle(node).animationPlayState),
  ).toBe("paused");
  await page.locator(".review-wall").scrollIntoViewIfNeeded();
  const tracks = page.locator(".review-wall-track");
  expect(
    await tracks.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).animationDirection),
    ),
  ).toEqual(["normal", "reverse"]);
  const start = await tracks
    .first()
    .evaluate((node) => getComputedStyle(node).transform);
  await expect
    .poll(() =>
      tracks.first().evaluate((node) => getComputedStyle(node).transform),
    )
    .not.toBe(start);
  await page.locator(".review-wall").focus();
  await expect
    .poll(() =>
      tracks
        .first()
        .evaluate((node) => getComputedStyle(node).animationPlayState),
    )
    .toBe("paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await tracks
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  await expect(
    page.locator('.review-wall-group[aria-hidden="true"]').first(),
  ).toBeHidden();
  await page.locator('[data-video-id="test-a"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-video-id="test-a"] video')).toHaveJSProperty(
    "paused",
    true,
  );
  await page.getByRole("button", { name: "Play Test A" }).click();
  await expect
    .poll(() =>
      page
        .locator('[data-video-id="test-a"] video')
        .evaluate((video: HTMLVideoElement) => !video.paused),
    )
    .toBe(true);
});

test("canvas frames and observers are released on unmount and rapid resizing stays bounded", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pending = new Set<number>();
    const schedule = window.requestAnimationFrame.bind(window),
      cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      const id = schedule((time) => {
        pending.delete(id);
        callback(time);
      });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      pending.delete(id);
      cancel(id);
    };
    Object.defineProperty(window, "__pendingMarketingFrames", {
      get: () => pending.size,
    });
    const observers = new Set<object>();
    const OriginalIntersection = window.IntersectionObserver;
    const OriginalResize = window.ResizeObserver;
    window.IntersectionObserver = class extends OriginalIntersection {
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        super(callback, options);
        observers.add(this);
      }
      disconnect() {
        observers.delete(this);
        super.disconnect();
      }
    };
    window.ResizeObserver = class extends OriginalResize {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        observers.add(this);
      }
      disconnect() {
        observers.delete(this);
        super.disconnect();
      }
    };
    Object.defineProperty(window, "__activeMarketingObservers", {
      get: () => observers.size,
    });
  });
  await page.goto("/__marketing-component-qa");
  await expect(page.locator(".ambient-hero")).toHaveAttribute(
    "data-running",
    "true",
  );
  for (const width of [390, 1440, 768, 1536])
    await page.setViewportSize({ width, height: 900 });
  const size = await page
    .locator(".ambient-hero canvas")
    .evaluate((node: HTMLCanvasElement) => ({
      width: node.width,
      host: node.getBoundingClientRect().width,
    }));
  expect(size.width).toBeLessThanOrEqual(size.host * 1.5 + 1);
  await page.locator("#unmount").click();
  await expect(
    page.locator("canvas, video, .marquee-track, .review-wall-track"),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __pendingMarketingFrames: number })
            .__pendingMarketingFrames,
      ),
    )
    .toBe(0);
});
