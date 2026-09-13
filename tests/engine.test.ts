import test from "node:test";
import assert from "node:assert/strict";
import { CARDS, CARD_MAP, EVENTS, PERSONALITIES } from "../shared/cards";
import { ABILITIES, direction, progress } from "../shared/personalities";
import { createGame, newPlayer, reduceGame, viewFor } from "../shared/engine";
import { botAction } from "../shared/bot";
import type { Action, Axes, GameState } from "../shared/types";
function game(n = 4, seed = 42) {
  let s = createGame(
    Array.from({ length: n }, (_, i) =>
      newPlayer(`p${i}`, `Player ${i}`, i, true),
    ),
    seed,
    0,
  );
  return reduceGame(s, { type: "REVEALED", playerId: "p0" }, 8000);
}
function step(s: GameState, action: Action) {
  return reduceGame(s, action, 9000);
}
test("54 unique cards, ten events and all sixteen abilities", () => {
  assert.equal(CARDS.length, 54);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 54);
  assert.equal(EVENTS.length, 10);
  assert.equal(Object.keys(ABILITIES).length, 16);
  for (const c of CARDS) {
    assert.ok(c.description);
    assert.ok(c.art);
    assert.ok(c.effects.length);
  }
});
test("same seed and action are deterministic; input is never mutated", () => {
  const a = game(),
    b = game();
  assert.deepEqual(a, b);
  const before = structuredClone(a);
  const action: Action = { type: "END", playerId: "p0" };
  assert.deepEqual(step(a, action), step(b, action));
  assert.deepEqual(a, before);
});
test("opponent targets, hands, clues, deck and hidden history never leak", () => {
  const s = game();
  s.players[1].hidden = true;
  s.players[1].clues = ["TOP SECRET"];
  const view = viewFor(s, "p0", "ABC123", "p0");
  assert.equal(view.players[1].goal, undefined);
  assert.equal(view.players[1].hand, undefined);
  assert.equal(view.players[1].clues, undefined);
  assert.equal(view.players[1].axes, null);
  assert.deepEqual(view.players[1].history, []);
  assert.equal(view.players[1].current, "????");
  assert.ok(!("deck" in view));
  assert.ok(!("seed" in view));
  assert.ok(view.players[0].goal);
});
test("rejects off-turn play, illegal target, fake card, invalid axis", () => {
  const s = game();
  s.players[0].hand = ["a0", "d0"];
  assert.throws(() => step(s, { type: "END", playerId: "p1" }));
  assert.throws(() =>
    step(s, { type: "PLAY", playerId: "p0", cardId: "a0", targetId: "p0" }),
  );
  assert.throws(() =>
    step(s, { type: "PLAY", playerId: "p0", cardId: "d0", targetId: "p1" }),
  );
  assert.throws(() =>
    step(s, { type: "PLAY", playerId: "p0", cardId: "nope", targetId: "p0" }),
  );
  assert.throws(() =>
    step(s, {
      type: "PLAY",
      playerId: "p0",
      cardId: "a0",
      targetId: "p1",
      axis: 99 as any,
    }),
  );
});
test("one card per turn, axes clamped and personality changes", () => {
  let s = game();
  s.players[0].hand = ["s2", "s2"];
  s.players[0].axes[0] = 1;
  s = step(s, { type: "PLAY", playerId: "p0", cardId: "s2", targetId: "p0" });
  assert.equal(s.players[0].axes[0], -3);
  assert.equal(s.players[0].stats.drifts, 1);
  assert.throws(() =>
    step(s, { type: "PLAY", playerId: "p0", cardId: "s2", targetId: "p0" }),
  );
});
test("all 54 cards resolve without errors", () => {
  for (const c of CARDS) {
    let s = game();
    s.players[0].hand = [c.id, "s0"];
    s.players[1].hand = ["s0"];
    s = step(s, {
      type: "PLAY",
      playerId: "p0",
      cardId: c.id,
      targetId: c.target === "other" ? "p1" : "p0",
      axis: 2,
    });
    assert.equal(s.moves, c.id === "x6" ? 0 : 1, c.name);
    for (const p of s.players)
      assert.ok(p.axes.every((v) => v >= -3 && v <= 3));
  }
});
test("reaction cancels incoming move and reflection hits its source", () => {
  let s = game();
  s.players[0].hand = ["a0"];
  s.players[1].hand = ["d2"];
  s.players[0].axes[3] = 2;
  s.players[1].axes[3] = 2;
  s = step(s, { type: "PLAY", playerId: "p0", cardId: "a0", targetId: "p1" });
  assert.equal(s.phase, "reaction");
  assert.equal(s.players[1].axes[3], 2);
  s = step(s, { type: "REACT", playerId: "p1", cardId: "d2" });
  assert.equal(s.phase, "playing");
  assert.equal(s.players[1].axes[3], 2);
  assert.equal(s.players[0].axes[3], 0);
});
test("preemptive shield absorbs attack; defensive side effects resolve", () => {
  let s = game();
  s.players[1].shield = 1;
  s.players[0].hand = ["a0"];
  const before = s.players[1].axes[3];
  s = step(s, { type: "PLAY", playerId: "p0", cardId: "a0", targetId: "p1" });
  assert.equal(s.players[1].axes[3], before);
  assert.equal(s.players[1].shield, 0);
});
test("all 16 abilities are functional and once-per-turn", () => {
  for (const type of PERSONALITIES) {
    let s = game();
    s.players[0].axes = Array.from(type, (l, i) => direction(type, i)) as Axes;
    s.players[0].hand = ["s0", "s1"];
    const self = [
      "INTJ",
      "INTP",
      "INFP",
      "ENFJ",
      "ISTJ",
      "ISFJ",
      "ISFP",
      "ESTP",
    ].includes(type);
    s = step(s, {
      type: "ABILITY",
      playerId: "p0",
      targetId: self ? "p0" : "p1",
      axis: 0,
    });
    assert.equal(s.abilityUsed, true, type);
    assert.throws(() =>
      step(s, { type: "ABILITY", playerId: "p0", targetId: "p1" }),
    );
  }
});
test("neutral axis does not satisfy a goal", () => {
  let s = game();
  const p = s.players[0];
  p.axes = [0, 0, 0, 0];
  assert.equal(progress(p), 0);
  s = step(s, { type: "DECLARE", playerId: "p0" });
  assert.equal(s.players[0].stats.failed, 1);
  assert.equal(s.players[0].focus, 0);
  assert.equal(s.turn, 1);
});
test("correct declaration waits for challengers then declares a winner", () => {
  let s = game(3);
  s.players[0].axes = [0, 1, 2, 3].map((_, i) =>
    direction(s.players[0].goal, i),
  ) as Axes;
  s = step(s, { type: "DECLARE", playerId: "p0" });
  assert.equal(s.phase, "challenge");
  assert.equal(s.winner, null);
  s = step(s, { type: "PASS", playerId: "p1" });
  assert.equal(s.phase, "challenge");
  s = step(s, { type: "PASS", playerId: "p2" });
  assert.equal(s.phase, "finished");
  assert.equal(s.winner, "p0");
  assert.ok(viewFor(s, "p0", "ABC", "p0").players.every((p) => p.goal));
});
test("last chance attack stops a declaration and yields next turn", () => {
  let s = game(2);
  s.players[0].goal = "ENTP";
  s.players[0].axes = [-1, 1, -1, 1];
  s.players[0].hand = ["s0"];
  s.players[1].hand = ["s1"];
  s = step(s, { type: "DECLARE", playerId: "p0" });
  s = step(s, { type: "PLAY", playerId: "p1", cardId: "s1", targetId: "p0" });
  assert.equal(s.phase, "playing");
  assert.equal(s.winner, null);
  assert.equal(s.players[0].stats.failed, 1);
  assert.equal(s.turn, 1);
});
test("guess rewards correctly and wrong guesses only leak one letter privately", () => {
  let s = game();
  s.players[0].hand = [];
  s.players[0].focus = 3;
  const correct = s.players[1].goal;
  const a = step(s, {
    type: "GUESS",
    playerId: "p0",
    targetId: "p1",
    guess: correct,
  });
  assert.equal(a.players[0].hand.length, 2);
  assert.equal(a.players[0].stats.correct, 1);
  const b = step(s, {
    type: "GUESS",
    playerId: "p0",
    targetId: "p1",
    guess: PERSONALITIES.find((t) => t !== correct)!,
  });
  assert.equal(b.players[1].clues.length, 1);
  assert.equal(b.players[0].focus, 1);
  assert.throws(() =>
    step(a, { type: "GUESS", playerId: "p0", targetId: "p1", guess: correct }),
  );
});
test("events rotate every two rounds and timeouts progress instead of blocking", () => {
  let s = game(2);
  for (let i = 0; i < 4; i++)
    s = step(s, { type: "END", playerId: s.players[s.turn].id });
  assert.equal(s.round, 3);
  assert.equal(s.event, 1);
  s = reduceGame(s, { type: "TIMEOUT", playerId: "p0" }, s.deadline);
  assert.equal(s.turn, 1);
});
test("mask hides axes and changes visible persona only until next turn", () => {
  let s = game(2);
  s.players[0].hand = ["x0"];
  const axes = [...s.players[0].axes];
  s = step(s, { type: "PLAY", playerId: "p0", cardId: "x0", targetId: "p0" });
  assert.deepEqual(s.players[0].axes, axes);
  assert.equal(viewFor(s, "p1", "ABC", "p0").players[0].axes, null);
  s = step(s, { type: "END", playerId: "p0" });
  s = step(s, { type: "END", playerId: "p1" });
  assert.equal(s.players[0].hidden, false);
  assert.equal(s.players[0].masked, null);
});
test("2–6 player strategic bot simulations complete with validated winners", () => {
  const lengths: number[] = [];
  for (let n = 2; n <= 6; n++) {
    for (let seed = 1; seed <= 5; seed++) {
      let s = game(n, seed),
        now = 10000,
        steps = 0;
      while (s.phase !== "finished" && steps < 1600) {
        now += 1000;
        let id =
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
          s = reduceGame(s, { type: "TIMEOUT", playerId: "p0" }, s.deadline);
          continue;
        }
        const a = botAction(s, id, now);
        if (!a) throw Error(`Bot stuck: ${s.phase}`);
        s = reduceGame(s, a, now);
        steps++;
      }
      assert.equal(
        s.phase,
        "finished",
        `${n} players seed ${seed} stuck after ${steps} actions, round ${s.round}`,
      );
      assert.equal(progress(s.players.find((p) => p.id === s.winner)!), 4);
      lengths.push(s.round);
    }
  }
  console.log("25 full bot matches. Rounds:", lengths.join(", "));
});

test("opening is not an accidental win and fresh cards rotate a full hand", () => {
  let s = game();
  for (const p of s.players) assert.equal(progress(p), 1);
  s.players[0].hand = Array(8).fill("s0");
  s = step(s, { type: "END", playerId: "p0" });
  assert.equal(s.players[0].hand.length, 8);
  assert.ok(s.players[0].hand.some((c) => c !== "s0"));
});
test("extra-play card genuinely grants one additional play", () => {
  let s = game();
  s.players[0].hand = ["x6", "s0"];
  s = step(s, { type: "PLAY", playerId: "p0", cardId: "x6", targetId: "p0" });
  assert.equal(s.moves, 0);
  s = step(s, { type: "PLAY", playerId: "p0", cardId: "s0", targetId: "p0" });
  assert.equal(s.moves, 1);
});
test("expired reaction and challenge timers do not strand the state machine", () => {
  let s = game(2);
  s.players[0].hand = ["a0"];
  s.players[1].hand = ["d0"];
  s = step(s, { type: "PLAY", playerId: "p0", cardId: "a0", targetId: "p1" });
  assert.equal(s.phase, "reaction");
  s = reduceGame(s, { type: "TIMEOUT", playerId: "p0" }, s.deadline);
  assert.equal(s.phase, "playing");
  assert.equal(s.pending, null);
  s.players[0].axes = [0, 1, 2, 3].map((_, i) =>
    direction(s.players[0].goal, i),
  ) as Axes;
  s = step(s, { type: "DECLARE", playerId: "p0" });
  s = reduceGame(s, { type: "TIMEOUT", playerId: "p0" }, s.deadline);
  assert.equal(s.phase, "finished");
});
test("late-round acceleration moves the furthest axis toward its private goal", () => {
  let s = game(2);
  s.round = 9;
  const p = s.players[1];
  p.goal = "ENTP";
  p.axes = [3, -2, 1, -1];
  s = step(s, { type: "END", playerId: "p0" });
  assert.equal(s.players[1].axes[0], 2);
});
