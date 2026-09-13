import { useEffect, useRef } from "react";
import type { ViewState } from "../../shared/types";
import type { Sound } from "../audio/cues";
import { gameCues, needsCountdown } from "../audio/gameCues";
export function useGameAudio(
  game: ViewState | null,
  connected: boolean,
  play: (s: Sound, delayMs?: number) => void,
) {
  const previous = useRef<ViewState | null>(null);
  useEffect(() => {
    if (!game || !connected) {
      previous.current = null;
      return;
    }
    const cues = gameCues(previous.current, game);
    previous.current = game;
    cues.forEach((c) => play(c.kind, c.delay));
  }, [game, connected, play]);
  const actionable = !!game && connected && needsCountdown(game);
  const deadline = game?.deadline;
  useEffect(() => {
    if (!actionable || !deadline) return;
    const timers = [3, 2, 1].flatMap((second) => {
      const ms = deadline - Date.now() - second * 1000;
      return ms > 0 ? [window.setTimeout(() => play("tick"), ms)] : [];
    });
    return () => timers.forEach(clearTimeout);
  }, [actionable, deadline, play]);
}
