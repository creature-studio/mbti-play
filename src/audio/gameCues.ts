import type { ViewState } from "../../shared/types";
import { CARD_MAP } from "../../shared/cards";
import type { Sound } from "./cues";
export interface CueEvent {
  kind: Sound;
  delay?: number;
}
/** Consumes server transitions, not button guesses. A rejected play makes no hit sound. */
export function gameCues(
  before: ViewState | null,
  after: ViewState,
): CueEvent[] {
  if (!before || before.roomCode !== after.roomCode) {
    return after.phase === "reveal"
      ? [{ kind: "shuffle" }, { kind: "reveal", delay: 430 }]
      : [];
  }
  if (before.phase !== "reveal" && after.phase === "reveal")
    return [{ kind: "shuffle" }, { kind: "reveal", delay: 430 }];
  if (after.phase === "finished")
    return before.phase === "finished"
      ? []
      : [{ kind: after.winner === after.yourId ? "win" : "lose" }];
  if (after.phase === "lobby") return [];
  if (
    after.challenge &&
    after.challenge.deadline !== before.challenge?.deadline
  )
    return [{ kind: "declare" }];
  const mine = after.players.find((p) => p.id === after.yourId),
    oldMine = before.players.find((p) => p.id === before.yourId);
  if (!mine || !oldMine) return [];
  const cues: CueEvent[] = [];
  const recent = after.logs.filter((l) => l.id > before.seq);
  const guard = recent.some((l) => l.kind === "guard");
  const animation =
    after.animation && after.animation.id !== before.animation?.id
      ? after.animation
      : null;
  if (guard) {
    cues.push({
      kind: recent.some((l) => l.kind === "guard" && /反弹|奉还/.test(l.text))
        ? "reflect"
        : "defense",
    });
  } else if (animation) {
    const card = CARD_MAP[animation.card];
    if (card?.type === "defense")
      cues.push({
        kind: card.effects.some((e) => e.kind === "reflect")
          ? "reflect"
          : "defense",
      });
    else {
      cues.push({ kind: "play" });
      if (animation.from !== animation.to && after.phase !== "reaction")
        cues.push({ kind: "attack", delay: 260 });
    }
  } else if (
    before.phase === "reaction" &&
    before.pending &&
    after.phase !== "reaction"
  )
    cues.push({ kind: "attack" });
  if (
    after.phase === "reaction" &&
    after.pending?.to === after.yourId &&
    before.phase !== "reaction"
  )
    cues.push({ kind: "reaction", delay: 140 });
  if (after.event !== before.event) cues.push({ kind: "world" });
  if (recent.some((l) => l.text.includes("人格能力")))
    cues.push({ kind: "ability" });
  if (mine.stats.correct > oldMine.stats.correct)
    cues.push({ kind: "guessRight" });
  else if (
    mine.stats.guesses > oldMine.stats.guesses ||
    after.players.some(
      (p) =>
        p.stats.failed >
        (before.players.find((q) => q.id === p.id)?.stats.failed ??
          p.stats.failed),
    )
  )
    cues.push({ kind: "fail" });
  const justMyTurn =
    after.phase === "playing" &&
    after.players[after.turn]?.id === after.yourId &&
    (before.turnCount !== after.turnCount || before.phase === "reveal");
  if (justMyTurn) cues.push({ kind: "turn", delay: 120 });
  if (
    (mine.handCount > oldMine.handCount || justMyTurn) &&
    !cues.some((c) => c.kind === "guessRight")
  )
    cues.push({ kind: "draw" });
  if (mine.current !== oldMine.current)
    cues.push({ kind: "drift", delay: 220 });
  return cues.filter((c, i, a) => a.findIndex((x) => x.kind === c.kind) === i);
}
export function needsCountdown(game: ViewState) {
  return (
    (game.phase === "playing" && game.players[game.turn]?.id === game.yourId) ||
    (game.phase === "reaction" && game.pending?.to === game.yourId) ||
    (game.phase === "challenge" &&
      !!game.challenge &&
      game.challenge.player !== game.yourId &&
      !game.challenge.responded.includes(game.yourId))
  );
}
