import test from "node:test";
import assert from "node:assert/strict";
import { AudioEngine } from "../src/audio/AudioEngine";
import { CUES, clampVolume, type Sound } from "../src/audio/cues";
import { gameCues, needsCountdown } from "../src/audio/gameCues";
import { createGame, newPlayer, reduceGame, viewFor } from "../shared/engine";

class Param {
  value = 0;
  points: { value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.points.push({ value, time });
  }
  setTargetAtTime(value: number, time: number) {
    this.setValueAtTime(value, time);
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.setValueAtTime(value, time);
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.setValueAtTime(value, time);
  }
  cancelScheduledValues() {}
}
class Node {
  connect() {}
  disconnect() {}
}
class Source extends Node {
  frequency = new Param();
  type = "";
  buffer: unknown;
  onended: (() => void) | null = null;
  started: number | null = null;
  stopped = false;
  ends = 0;
  start(at: number) {
    this.started = at;
  }
  stop(at?: number) {
    if (at === undefined) {
      this.stopped = true;
      this.onended?.();
    } else this.ends = at;
  }
}
class Context {
  currentTime = 0;
  state = "suspended";
  sampleRate = 48000;
  destination = new Node();
  sources: Source[] = [];
  gains: (Node & { gain: Param })[] = [];
  createGain() {
    const n = Object.assign(new Node(), { gain: new Param() });
    this.gains.push(n);
    return n;
  }
  createDynamicsCompressor() {
    return Object.assign(new Node(), {
      threshold: new Param(),
      knee: new Param(),
      ratio: new Param(),
      attack: new Param(),
      release: new Param(),
    });
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBiquadFilter() {
    return Object.assign(new Node(), {
      type: "",
      frequency: new Param(),
      Q: new Param(),
    });
  }
  createOscillator() {
    const n = new Source();
    this.sources.push(n);
    return n;
  }
  createBufferSource() {
    return this.createOscillator();
  }
  async resume() {
    this.state = "running";
  }
  async close() {
    this.state = "closed";
  }
}
function setup() {
  const context = new Context();
  let created = 0;
  const engine = new AudioEngine(() => {
    created++;
    return context as unknown as AudioContext;
  });
  return { engine, context, created: () => created };
}
function base() {
  let s = createGame(
    [newPlayer("p0", "你", 0), newPlayer("p1", "对手", 1)],
    41,
    0,
  );
  return reduceGame(s, { type: "REVEALED", playerId: "p0" }, 8000);
}
const view = (s: ReturnType<typeof base>) => viewFor(s, "p0", "ABCDEF", "p0");

test("20 bounded cue recipes with sensible frequencies, envelopes and durations", () => {
  assert.equal(Object.keys(CUES).length, 20);
  for (const [kind, voices] of Object.entries(CUES)) {
    assert.ok(voices.length > 0 && voices.length <= 8, kind);
    for (const v of voices) {
      assert.ok(v.at >= 0);
      assert.ok(v.duration >= 0.02 && v.at + v.duration <= 1.1);
      assert.ok(v.gain > 0 && v.gain <= 0.35);
      assert.ok(v.frequency >= 40 && v.frequency <= 8000);
    }
  }
  assert.equal(clampVolume(10), 1);
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume(NaN), 0.5);
});
test("no audio context or automatic playback until opt-in and a gesture unlock", async () => {
  const { engine, created, context } = setup();
  assert.equal(engine.play("play"), false);
  await engine.unlock();
  assert.equal(created(), 0);
  engine.setEnabled(true);
  assert.equal(engine.play("play"), false);
  assert.equal(created(), 0);
  await engine.unlock();
  assert.equal(created(), 1);
  assert.equal(context.state, "running");
  assert.equal(engine.play("play"), true);
  await engine.unlock();
  assert.equal(created(), 1);
});
test("shuffle timing is staggered and duplicate events are throttled", async () => {
  const { engine, context } = setup();
  engine.setEnabled(true);
  await engine.unlock();
  engine.play("shuffle");
  assert.equal(context.sources.length, 6);
  assert.ok(context.sources[5].started! > context.sources[0].started! + 0.3);
  assert.equal(engine.play("shuffle"), false);
  engine.stop();
  context.currentTime = 1;
  assert.equal(engine.play("shuffle"), true);
});
test("mute and backgrounding immediately cancel even delayed voices; no stale replay", async () => {
  const { engine, context } = setup();
  engine.setEnabled(true);
  await engine.unlock();
  engine.play("declare", 1000);
  engine.setEnabled(false);
  assert.ok(context.sources.every((s) => s.stopped));
  assert.equal(engine.play("win"), false);
  assert.equal(context.gains[0].gain.value, 0);
  engine.setEnabled(true);
  await engine.unlock();
  engine.play("attack");
  engine.setHidden(true);
  assert.ok(context.sources.every((s) => s.stopped));
  assert.equal(engine.play("tick"), false);
  const count = context.sources.length;
  engine.setHidden(false);
  assert.equal(context.sources.length, count);
  assert.equal(engine.play("turn"), true);
  engine.dispose();
  assert.equal(context.state, "closed");
  assert.equal(engine.play("turn"), false);
});
test("zero volume silences voices, and all cues can be synthesized through the graph", async () => {
  const { engine, context } = setup();
  engine.setEnabled(true);
  await engine.unlock();
  for (const kind of Object.keys(CUES) as Sound[]) {
    assert.equal(engine.play(kind), true, kind);
    assert.ok(context.sources.every((s) => s.ends > s.started!));
    engine.stop();
    context.currentTime += 2;
  }
  engine.setVolume(0);
  assert.equal(engine.play("play"), false);
  engine.setVolume(2);
  assert.equal(context.gains[0].gain.value, 0.7);
  engine.setVolume(0.2);
  assert.ok(Math.abs(context.gains[0].gain.value - 0.14) < 0.00001);
});
test("state snapshots are not replayed on reconnect or duplicate updates", () => {
  const a = view(base());
  assert.deepEqual(gameCues(null, a), []);
  assert.deepEqual(gameCues(a, structuredClone(a)), []);
  const reveal = { ...a, phase: "reveal" as const };
  assert.deepEqual(
    gameCues(null, reveal).map((c) => c.kind),
    ["shuffle", "reveal"],
  );
  assert.deepEqual(gameCues(reveal, structuredClone(reveal)), []);
});
test("attack/guard/reaction cues follow accepted server effects", () => {
  let s = base();
  s.players[0].hand = ["a0"];
  s.players[1].hand = ["s1"];
  const before = view(s);
  s = reduceGame(
    s,
    { type: "PLAY", playerId: "p0", cardId: "a0", targetId: "p1" },
    9000,
  );
  assert.deepEqual(
    gameCues(before, view(s))
      .slice(0, 2)
      .map((c) => c.kind),
    ["play", "attack"],
  );
  s = base();
  s.players[0].hand = ["a0"];
  s.players[1].hand = ["d2"];
  const b = view(s);
  s = reduceGame(
    s,
    { type: "PLAY", playerId: "p0", cardId: "a0", targetId: "p1" },
    9000,
  );
  assert.equal(s.phase, "reaction");
  assert.ok(!gameCues(b, view(s)).some((c) => c.kind === "attack"));
  const reaction = view(s);
  s = reduceGame(s, { type: "REACT", playerId: "p1", cardId: "d2" }, 10000);
  assert.equal(gameCues(reaction, view(s))[0].kind, "reflect");
});
test("winner and loser hear different endings; only local actionable deadlines tick", () => {
  const a = view(base());
  assert.deepEqual(gameCues(a, { ...a, phase: "finished", winner: "p0" }), [
    { kind: "win" },
  ]);
  assert.deepEqual(gameCues(a, { ...a, phase: "finished", winner: "p1" }), [
    { kind: "lose" },
  ]);
  assert.ok(needsCountdown(a));
  assert.ok(!needsCountdown({ ...a, turn: 1 }));
  assert.ok(
    needsCountdown({
      ...a,
      phase: "reaction",
      pending: { from: "p1", to: "p0", card: "s0", axis: 0 },
    }),
  );
  assert.ok(
    !needsCountdown({
      ...a,
      phase: "challenge",
      challenge: { player: "p0", responded: [], deadline: 42 },
    }),
  );
});
