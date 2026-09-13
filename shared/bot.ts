import { CARD_MAP, PERSONALITIES } from "./cards";
import { direction, progress, activePersonality } from "./personalities";
import { reduceGame } from "./engine";
import type { Action, Axis, GameState, Player } from "./types";
function utility(p: Player) {
  return (
    progress(p) * 14 +
    p.axes.reduce((sum, v, i) => sum + v * direction(p.goal, i), 0) +
    p.hand.length * 0.45 +
    p.shield * 0.9 +
    (p.reflect ? 1 : 0)
  );
}
export function botAction(
  s: GameState,
  id: string,
  now: number,
): Action | null {
  const p = s.players.find((p) => p.id === id)!;
  if (!p) return null;
  if (s.phase === "reaction" && s.pending?.to === id) {
    // Save the counter if the incoming card actually helps our private goal.
    const accepted = reduceGame(s, { type: "REACT", playerId: id }, now);
    if (utility(accepted.players.find((q) => q.id === id)!) > utility(p))
      return { type: "REACT", playerId: id };
    const card =
      p.hand.find((c) =>
        CARD_MAP[c].effects.some((e) => e.kind === "reflect"),
      ) ?? p.hand.find((c) => CARD_MAP[c].type === "defense");
    return { type: "REACT", playerId: id, cardId: card };
  }
  if (
    s.phase === "challenge" &&
    s.challenge?.player !== id &&
    !s.challenge?.responded.includes(id)
  ) {
    const victim = s.players.find((q) => q.id === s.challenge!.player)!;
    let best: Action = { type: "PASS", playerId: id },
      score = 0;
    for (const card of p.hand) {
      if (CARD_MAP[card].target === "self") continue;
      for (let a = 0; a < 4; a++) {
        const act: Action = {
          type: "PLAY",
          playerId: id,
          cardId: card,
          targetId: victim.id,
          axis: a as Axis,
        };
        try {
          let next = reduceGame(s, act, now);
          if (next.pending)
            next = reduceGame(
              next,
              { type: "REACT", playerId: victim.id },
              now,
            );
          const after = next.players.find((q) => q.id === victim.id)!;
          const delta = utility(victim) - utility(after);
          if (delta > score) {
            score = delta;
            best = act;
          }
        } catch {}
      }
    }
    return best;
  }
  if (s.phase !== "playing" || s.players[s.turn].id !== id) return null;
  if (progress(p) === 4) return { type: "DECLARE", playerId: id };
  let best: Action | null = null,
    bestScore = 0.25;
  function test(act: Action) {
    try {
      let next = reduceGame(s, act, now);
      if (next.pending)
        next = reduceGame(
          next,
          { type: "REACT", playerId: next.pending.to },
          now,
        );
      const me = next.players.find((q) => q.id === id)!;
      let score = utility(me) - utility(p); // Own goal is the only private goal used in normal play.
      for (const other of s.players.filter((q) => q.id !== id)) {
        const after = next.players.find((q) => q.id === other.id)!;
        if (other.hidden || other.masked) continue; // Public stability is a threat heuristic, not access to their secret goal.
        const stability = other.axes.filter((v) => v !== 0).length;
        score +=
          stability === 4
            ? other.axes.reduce(
                (sum, v, i) =>
                  sum + (Math.abs(v) - after.axes[i] * Math.sign(v)) * 0.45,
                0,
              )
            : 0;
      }
      if (act.type === "PLAY") score += 0.65;
      if (score > bestScore) {
        bestScore = score;
        best = act;
      }
    } catch {}
  }
  if (!s.abilityUsed) {
    for (const q of s.players)
      for (let a = 0; a < 4; a++)
        test({
          type: "ABILITY",
          playerId: id,
          targetId: q.id,
          axis: a as Axis,
        });
  }
  if (!s.moves) {
    for (const card of p.hand)
      for (const q of s.players)
        for (let a = 0; a < 4; a++)
          test({
            type: "PLAY",
            playerId: id,
            cardId: card,
            targetId: q.id,
            axis: a as Axis,
          });
  }
  if (best) return best;
  // Occasional low-cost public bluff: mask the intent rather than move randomly.
  if (
    !s.moves &&
    p.hand.includes("x0") &&
    (s.seed + s.turnCount + p.avatar) % 3 === 0
  )
    return { type: "PLAY", playerId: id, cardId: "x0", targetId: id };
  if (
    !s.guessUsed &&
    p.focus >= 2 &&
    s.turnCount > 8 &&
    (s.seed + s.turnCount * 7 + p.avatar) % 5 === 0
  ) {
    const q = s.players.find((q) => q.id !== id && !q.hidden);
    if (q) {
      const guess = activePersonality(q.axes);
      if (PERSONALITIES.includes(guess))
        return { type: "GUESS", playerId: id, targetId: q.id, guess };
    }
  }
  return { type: "END", playerId: id };
}
