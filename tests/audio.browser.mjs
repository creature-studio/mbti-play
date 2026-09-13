/** Real Web Audio graph smoke test. Needs the running app and a Chromium runtime. */
import { chromium as playwright } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await playwright.launch({
  executablePath:
    process.env.CHROMIUM_PATH || (await chromium.executablePath()),
  args: chromium.args.filter((a) => a !== "--single-process"),
  headless: true,
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => {
    const Native = window.AudioContext;
    window.__audio = { contexts: [], peak: 0, sources: 0 };
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        window.__audio.contexts.push(this);
      }
      createOscillator() {
        window.__audio.sources++;
        return super.createOscillator();
      }
      createBufferSource() {
        window.__audio.sources++;
        return super.createBufferSource();
      }
      createDynamicsCompressor() {
        const node = super.createDynamicsCompressor(),
          analyser = this.createAnalyser(),
          connect = node.connect.bind(node),
          destination = this.destination;
        analyser.fftSize = 2048;
        node.connect = (target, ...args) => {
          if (target === destination) {
            connect(analyser);
            return analyser.connect(target, ...args);
          }
          return connect(target, ...args);
        };
        const data = new Float32Array(analyser.fftSize);
        function measure() {
          analyser.getFloatTimeDomainData(data);
          for (const sample of data)
            window.__audio.peak = Math.max(
              window.__audio.peak,
              Math.abs(sample),
            );
          requestAnimationFrame(measure);
        }
        requestAnimationFrame(measure);
        return node;
      }
    };
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:3000");
  await page.evaluate(() => document.fonts.ready);
  assert.equal(
    await page.evaluate(() => window.__audio.contexts.length),
    0,
    "initial load must not initialize audio",
  );
  await page.getByRole("button", { name: "音效设置", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page.getByRole("button", { name: "试听抽一张" }).isDisabled(),
    true,
  );
  await page.getByRole("switch", { name: "游戏音效", exact: true }).click();
  await page.waitForTimeout(350);
  assert.equal(
    await page.evaluate(() => window.__audio.contexts[0].state),
    "running",
  );
  for (const name of [
    "抽一张",
    "甩张牌",
    "给你一击",
    "婉拒了哈",
    "原路奉还",
    "人格漂移",
    "我不装了",
    "这局你赢",
  ]) {
    await page.evaluate(() => {
      window.__audio.peak = 0;
    });
    await page
      .getByRole("button", { name: `试听${name}`, exact: true })
      .click();
    await page.waitForTimeout(1100);
    const peak = await page.evaluate(() => window.__audio.peak);
    assert.ok(
      peak > 0.001 && peak < 1,
      `${name}: expected non-silent unclipped waveform, got ${peak}`,
    );
    console.log(`${name}: rendered peak ${peak.toFixed(4)}`);
  }
  await page.getByRole("button", { name: "试听这局你赢" }).click();
  await page.waitForTimeout(80);
  await page.getByRole("switch", { name: "游戏音效", exact: true }).click();
  await page.waitForTimeout(180);
  await page.evaluate(() => {
    window.__audio.peak = 0;
  });
  await page.waitForTimeout(250);
  assert.ok(
    (await page.evaluate(() => window.__audio.peak)) < 0.0001,
    "mute must stop a currently playing fanfare",
  );
  const slider = page.getByLabel("音量", { exact: true });
  await slider.press("Home");
  for (let i = 0; i < 7; i++) await slider.press("ArrowRight");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("ps-volume")),
    "0.35",
  );
  await page.reload();
  assert.equal(await page.evaluate(() => window.__audio.contexts.length), 0);
  await page.getByRole("button", { name: "音效设置", exact: true }).click();
  assert.equal(
    await page
      .getByRole("switch", { name: "游戏音效", exact: true })
      .getAttribute("aria-checked"),
    "false",
  );
  assert.equal(
    await page.getByLabel("音量", { exact: true }).inputValue(),
    "35",
  );
  await page.getByRole("switch", { name: "游戏音效", exact: true }).click();
  await page.getByLabel("音量", { exact: true }).press("Home");
  assert.equal(
    await page.getByRole("button", { name: "试听抽一张" }).isDisabled(),
    true,
  );
  await page.getByLabel("音量", { exact: true }).press("End");
  await page.waitForTimeout(150);
  await mkdir(".arena/screenshots", { recursive: true });
  await page.screenshot({ path: ".arena/screenshots/audio-mobile.png" });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: opt-in, 8 audible non-clipping previews, immediate mute, persisted volume/mute, 0-volume safety, 390px layout, no JS errors.",
  );
} finally {
  await browser.close();
}
