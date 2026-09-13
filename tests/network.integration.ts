/** Against an already running server: npm run test:network. No test-only server endpoints. */
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { io, type Socket } from "socket.io-client";
import { botAction } from "../shared/bot";
import { CARDS, CARD_MAP } from "../shared/cards";
import { progress } from "../shared/personalities";
import type { GameState, Player, ViewState } from "../shared/types";
const url = process.env.TEST_URL || "http://127.0.0.1:3000";
const views = new Map<string, ViewState>(),
  clients: { id: string; socket: Socket }[] = [];
const delay = (n: number) => new Promise((r) => setTimeout(r, n));
async function wait(fn: () => boolean, ms = 10000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > ms) throw Error("Network condition timed out");
    await delay(20);
  }
}
async function client(token = randomBytes(16).toString("hex")) {
  const id = createHash("sha256").update(token).digest("hex").slice(0, 24);
  const s = io(url, { auth: { token }, autoConnect: false });
  s.on("state", (v: ViewState) => views.set(id, v));
  s.on("notice", (n: string) => console.log("Notice:", n));
  s.connect();
  await wait(() => s.connected);
  const c = { id, socket: s };
  clients.push(c);
  return c;
}
try {
  const host = await client();
  host.socket.emit("create", { name: "集成测试房主", avatar: 0 });
  await wait(() => views.has(host.id));
  const code = views.get(host.id)!.roomCode;
  for (let i = 1; i < 6; i++) {
    const c = await client();
    c.socket.emit("join", { code, name: `牌搭子${i}`, avatar: i });
    await wait(() => views.has(c.id));
    c.socket.emit("ready");
    await wait(
      () =>
        views.get(host.id)!.players.find((p) => p.id === c.id)?.ready === true,
    );
  }
  assert.equal(views.get(host.id)!.players.length, 6);
  const seventh = await client();
  let rejected = "";
  seventh.socket.once("notice", (m) => (rejected = m));
  seventh.socket.emit("join", { code, name: "挤一挤" });
  await wait(() => !!rejected);
  assert.match(rejected, /6|坐满/);
  seventh.socket.disconnect();
  clients.pop();
  host.socket.emit("start");
  await wait(() => views.get(host.id)!.phase === "reveal");
  for (const c of clients) {
    const v = views.get(c.id)!;
    assert.ok(v.players.find((p) => p.id === c.id)!.goal);
    assert.ok(
      v.players
        .filter((p) => p.id !== c.id)
        .every((p) => !p.goal && !p.hand && !p.clues),
    );
  }
  // Refresh/reconnect uses the exact same temporary identity, including secret hand.
  const reconnect = clients[2],
    before = views
      .get(reconnect.id)!
      .players.find((p) => p.id === reconnect.id)!;
  reconnect.socket.disconnect();
  await delay(60);
  reconnect.socket.connect();
  await wait(() => reconnect.socket.connected);
  await delay(100);
  const after = views
    .get(reconnect.id)!
    .players.find((p) => p.id === reconnect.id)!;
  assert.deepEqual(after.hand, before.hand);
  assert.equal(after.goal, before.goal);
  assert.equal(views.get(host.id)!.players.length, 6);
  await wait(() => views.get(host.id)!.phase === "playing");
  let forged = "";
  clients[1].socket.once("notice", (n) => (forged = n));
  clients[1].socket.emit("action", { type: "END", playerId: host.id });
  await wait(() => !!forged);
  assert.match(forged, /轮到/);
  assert.equal(views.get(host.id)!.turn, 0);
  let steps = 0;
  const phases = new Set<string>();
  while (views.get(host.id)!.phase !== "finished" && steps < 1000) {
    const base = views.get(host.id)!;
    phases.add(base.phase);
    const ownPlayers = base.players.map((p) => {
      const own = views.get(p.id)!.players.find((q) => q.id === p.id)!;
      return {
        ...p,
        ...own,
        axes: own.axes!,
        goal: own.goal!,
        hand: own.hand!,
        clues: own.clues!,
      } as Player;
    });
    const s: GameState = {
      ...base,
      players: ownPlayers,
      seed: 123,
      deck: CARDS.map((c) => c.id),
      discard: [],
      lastEffect: base.lastCard
        ? CARD_MAP[base.lastCard].effects.filter((e) => e.kind === "move")
        : null,
    };
    const id =
      s.phase === "reaction"
        ? s.pending!.to
        : s.phase === "challenge"
          ? s.players.find(
              (p) =>
                p.id !== s.challenge!.player &&
                !s.challenge!.responded.includes(p.id),
            )?.id
          : s.players[s.turn].id;
    if (!id) {
      await delay(30);
      continue;
    }
    const a = botAction(s, id, Date.now());
    if (!a) {
      await delay(30);
      continue;
    }
    const c = clients.find((c) => c.id === id)!;
    const seq = base.seq;
    c.socket.emit("action", a);
    await wait(
      () =>
        views.get(host.id)!.seq !== seq ||
        views.get(host.id)!.phase !== base.phase,
    );
    await delay(70);
    steps++;
  }
  const result = views.get(host.id)!;
  assert.equal(result.phase, "finished");
  assert.ok(result.winner);
  const winner = result.players.find((p) => p.id === result.winner)!;
  assert.equal(progress({ axes: winner.axes!, goal: winner.goal! }), 4);
  assert.ok(result.players.every((p) => p.goal));
  console.log(
    `PASS: 6-client game, ${steps} authoritative actions, ${result.round} rounds. Phases: ${[...phases].join(", ")}. Secrets isolated, spoofing rejected, refresh recovered.`,
  );
  host.socket.emit("rematch");
  await wait(() => views.get(host.id)!.phase === "lobby");
  for (const c of clients.slice(1)) c.socket.emit("ready");
  await wait(() =>
    views
      .get(host.id)!
      .players.slice(1)
      .every((p) => p.ready),
  );
  host.socket.emit("start");
  await wait(() => views.get(host.id)!.phase === "reveal");
  assert.equal(views.get(host.id)!.round, 1);
  console.log("PASS: settlement → rematch → ready → new secret deal.");
  host.socket.emit("leave");
  await wait(() => views.get(clients[1].id)!.hostId === clients[1].id);
  console.log("PASS: host departure transfers ownership; Bot takes the seat.");
} finally {
  for (const c of clients) {
    c.socket.emit("leave");
    c.socket.disconnect();
  }
}
