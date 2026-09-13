import { EVENTS } from "./cards";
import { personality } from "./personalities";
import type { GameState, Player, Axis } from "./types";
export function random(s: GameState) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
export function shuffle<T>(s: GameState, a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function log(
  s: GameState,
  text: string,
  kind: GameState["logs"][number]["kind"] = "normal",
) {
  s.logs.push({ id: ++s.seq, text, kind });
  if (s.logs.length > 80) s.logs.shift();
}
export function giveCard(s: GameState, p: Player, card: string) {
  if (p.hand.length >= 8) s.discard.push(p.hand.shift()!);
  p.hand.push(card);
}
export function draw(s: GameState, p: Player, n = 1) {
  for (let i = 0; i < n; i++) {
    if (!s.deck.length) s.deck = shuffle(s, s.discard.splice(0));
    const c = s.deck.pop();
    if (c) giveCard(s, p, c);
  }
}
export function move(
  s: GameState,
  p: Player,
  axis: Axis,
  amount: number,
  boost = true,
) {
  const before = personality(p.axes);
  const ev = EVENTS[s.event];
  let delta = amount;
  if (
    boost &&
    ev.axis === axis &&
    (ev.direction === undefined || Math.sign(amount) === ev.direction)
  )
    delta += Math.sign(amount) * ev.bonus;
  p.axes[axis] = Math.max(-3, Math.min(3, p.axes[axis] + delta));
  const after = personality(p.axes);
  if (before !== after) {
    p.stats.drifts++;
    p.history.push(after);

    log(
      s,
      `${p.name} 人格漂移${p.hidden || p.masked ? "！" : `：${before} → ${after}`}`,
      "drift",
    );
  }
}
