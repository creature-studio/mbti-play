/** Real browser + authoritative server + independent Socket.IO peers. No mock state or test backdoor. */
import { chromium as playwright, type Page } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import { io, type Socket } from "socket.io-client";
import { createHash, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { botAction } from "../shared/bot";
import { CARDS, CARD_MAP, AXIS_LETTERS } from "../shared/cards";
import type { Action, GameState, Player, ViewState } from "../shared/types";
const url = process.env.TEST_URL || "http://127.0.0.1:3000";
const shots = ".arena/screenshots";
await mkdir(shots, { recursive: true });
const browser = await playwright.launch({
  executablePath:
    process.env.CHROMIUM_PATH || (await chromium.executablePath()),
  args: chromium.args.filter((a) => a !== "--single-process"),
  headless: true,
});
const states = new Map<string, ViewState>(),
  clients: { id: string; token: string; socket: Socket }[] = [];
const delay = (n: number) => new Promise((r) => setTimeout(r, n));
async function wait(fn: () => boolean, ms = 12000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > ms)
      throw Error("Browser network condition timed out");
    await delay(25);
  }
}
async function connect(i: number) {
  const token = randomBytes(16).toString("hex"),
    id = createHash("sha256").update(token).digest("hex").slice(0, 24);
  const socket = io(url, { auth: { token } });
  socket.on("state", (s: ViewState) => states.set(id, s));
  const c = { token, id, socket };
  clients.push(c);
  await wait(() => socket.connected);
  return c;
}
const errors: string[] = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${shots}/home-desktop.png`, fullPage: true });
  // Mobile home, menus, card library and responsive overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${shots}/home-mobile.png`, fullPage: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await page
    .getByRole("button", { name: "游戏规则", exact: true })
    .first()
    .click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  const host = await connect(0);
  await page.evaluate(
    (token) => localStorage.setItem("ps-token", token),
    host.token,
  );
  host.socket.emit("create", { name: "薄荷观察员", avatar: 0 });
  await wait(() => states.has(host.id));
  const code = states.get(host.id)!.roomCode;
  for (let i = 1; i < 4; i++) {
    const c = await connect(i);
    c.socket.emit("join", {
      code,
      name: ["", "月亮没睡", "小林不想上班", "阿橘"][i],
      avatar: i,
    });
    await wait(() => states.has(c.id));
    c.socket.emit("ready");
  }
  await page.reload();
  await page.locator(".lobby-page").waitFor();
  await wait(() =>
    states
      .get(host.id)!
      .players.slice(1)
      .every((p) => p.ready),
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/lobby-mobile.png`, fullPage: true });
  await page.getByRole("button", { name: "开始搞事" }).click();
  await page.locator(".secret-reveal-card").waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${shots}/reveal-mobile.png` });
  if (await page.getByRole("button", { name: "记住了，开始演" }).isVisible())
    await page.getByRole("button", { name: "记住了，开始演" }).click();
  await wait(() => states.get(host.id)!.phase === "playing");
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${shots}/game-mobile.png` });
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({
      width,
      height: width > 1000 ? 1000 : width === 768 ? 1024 : 844,
    });
    await page.waitForTimeout(500);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
      `overflow at ${width}px`,
    );
  }
  await page.screenshot({ path: `${shots}/game-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  // Reload is a real browser reload; cards and identity must survive.
  const hand = states.get(host.id)!.players.find((p) => p.id === host.id)!.hand;
  await page.reload();
  await page.locator(".self-zone").waitFor();
  assert.deepEqual(
    states.get(host.id)!.players.find((p) => p.id === host.id)!.hand,
    hand,
  );
  let actions = 0;
  const used = new Set<string>();
  let attacked = false,
    driftShot = false;
  while (states.get(host.id)!.phase !== "finished" && actions < 500) {
    const v = states.get(host.id)!;
    const players = v.players.map((p) => {
      const own = states.get(p.id)!.players.find((q) => q.id === p.id)!;
      return {
        ...p,
        ...own,
        axes: own.axes!,
        goal: own.goal!,
        hand: own.hand!,
        clues: own.clues!,
      } as Player;
    });
    const state: GameState = {
      ...v,
      players,
      seed: 83,
      deck: CARDS.map((c) => c.id),
      discard: [],
      lastEffect: v.lastCard
        ? CARD_MAP[v.lastCard].effects.filter((e) => e.kind === "move")
        : null,
    };
    const id =
      v.phase === "reaction"
        ? v.pending!.to
        : v.phase === "challenge"
          ? v.players.find(
              (p) =>
                p.id !== v.challenge!.player &&
                !v.challenge!.responded.includes(p.id),
            )?.id
          : v.players[v.turn].id;
    if (!id) {
      await delay(50);
      continue;
    }
    let action = botAction(state, id, Date.now());
    if (!action) {
      await delay(50);
      continue;
    }
    if (id === host.id) {
      // Exercise guess UI once, in addition to strategic play.
      const me = players.find((p) => p.id === id)!;
      if (
        v.phase === "playing" &&
        !v.guessUsed &&
        me.focus >= 2 &&
        !used.has("GUESS")
      )
        action = {
          type: "GUESS",
          playerId: id,
          targetId: players[1].id,
          guess: "ENTP",
        };
      await uiAction(page, action, v);
      used.add(action.type);
      if (action.type === "PLAY" && action.targetId !== id) attacked = true;
    } else clients.find((c) => c.id === id)!.socket.emit("action", action);
    const seq = v.seq;
    await wait(
      () =>
        states.get(host.id)!.seq !== seq ||
        states.get(host.id)!.phase !== v.phase,
    );
    await delay(id === host.id ? 300 : 90);
    actions++;
    if (states.get(host.id)!.phase === "challenge")
      await page.screenshot({ path: `${shots}/declaration-mobile.png` });
    if (
      !driftShot &&
      states.get(host.id)!.players.find((p) => p.id === host.id)!.stats.drifts >
        0
    ) {
      await page.screenshot({ path: `${shots}/drift-mobile.png` });
      driftShot = true;
    }
  }
  assert.equal(states.get(host.id)!.phase, "finished");
  await page.locator(".results-page").waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `${shots}/results-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `${shots}/results-desktop.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "再来一局，这次不装了" }).click();
  await page.locator(".lobby-page").waitFor();
  assert.equal(states.get(host.id)!.phase, "lobby");
  assert.deepEqual(errors, []);
  console.log(
    `PASS: browser home → room → secret → gameplay → winner → settlement → rematch. ${actions} actions, UI actions ${[...used].join(", ")}. Attack from host: ${attacked}. 375/390/430/768/1440px, no horizontal overflow or JS errors.`,
  );
} finally {
  for (const c of clients) {
    c.socket.emit("leave");
    c.socket.disconnect();
  }
  await browser.close();
}
async function uiAction(page: Page, a: Action, v: ViewState) {
  if (a.type === "END") {
    await page.locator(".end-turn-button").click();
    return;
  }
  if (a.type === "PLAY") {
    const me = v.players.find((p) => p.id === v.yourId)!;
    const index = me.hand!.indexOf(a.cardId);
    await page.locator(".hand-card").nth(index).press("Enter");
    const panel = page.locator(".card-inspector");
    await panel.waitFor();
    await page.waitForTimeout(300);
    if (await panel.locator(".axis-picker").count())
      await panel
        .locator(".axis-picker button")
        .nth(a.axis ?? 0)
        .click();
    const name =
      a.targetId === v.yourId
        ? "自己"
        : v.players.find((p) => p.id === a.targetId)!.name;
    await panel
      .locator(".target-picker button")
      .filter({ hasText: name })
      .click();
    if (!(await page.locator(".effects-layer .card-flight").count()))
      await page.screenshot({ path: `${shots}/card-mobile.png` });
    await panel.locator(".button-lime").click();
    return;
  }
  if (a.type === "ABILITY") {
    await page.locator(".skill-button").click();
    const modal = page.getByRole("dialog");
    await modal
      .locator(".axis-picker button")
      .nth(a.axis ?? 0)
      .click();
    const name =
      a.targetId === v.yourId
        ? "自己"
        : v.players.find((p) => p.id === a.targetId)!.name;
    await modal
      .locator(".target-picker button")
      .filter({ hasText: name })
      .click();
    await modal.getByRole("button", { name: "发动能力" }).click();
    return;
  }
  if (a.type === "GUESS") {
    await page.locator(".guess-button").click();
    const modal = page.getByRole("dialog");
    await modal
      .locator(".target-picker button")
      .filter({ hasText: v.players.find((p) => p.id === a.targetId)!.name })
      .click();
    for (let i = 0; i < 4; i++)
      await modal
        .locator(".guess-letters")
        .getByRole("button", { name: a.guess[i], exact: true })
        .click();
    await modal.getByRole("button", { name: `下注：${a.guess}` }).click();
    return;
  }
  if (a.type === "DECLARE") {
    await page.locator(".declare-button").click();
    await page.getByRole("button", { name: "公开我的人格" }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${shots}/declaration-mobile.png` });
    return;
  }
  if (a.type === "REACT") {
    if (a.cardId)
      await page
        .locator(".reaction-options button")
        .filter({ hasText: CARD_MAP[a.cardId].name })
        .first()
        .click();
    else await page.getByRole("button", { name: "这次我接了" }).click();
    return;
  }
  if (a.type === "PASS") {
    await page.getByRole("button", { name: "这次放过" }).click();
    return;
  }
}
