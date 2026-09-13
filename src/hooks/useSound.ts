import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine } from "../audio/AudioEngine";
import { clampVolume, type Sound } from "../audio/cues";
export type { Sound } from "../audio/cues";
export function useSound() {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem("ps-sound") === "true",
  );
  const [volume, setVolumeState] = useState(() =>
    clampVolume(Number(localStorage.getItem("ps-volume") ?? 0.5)),
  );
  const ref = useRef<AudioEngine | null>(null);
  if (!ref.current) ref.current = new AudioEngine();
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  useEffect(() => {
    const engine = ref.current!;
    engine.setEnabled(enabledRef.current);
    engine.setVolume(volume);
    engine.setHidden(document.hidden);
    const unlock = (e: Event) => {
      if (e.isTrusted) void engine.unlock();
    };
    const visibility = () => engine.setHidden(document.hidden);
    document.addEventListener("pointerdown", unlock, { capture: true });
    document.addEventListener("keydown", unlock, { capture: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("visibilitychange", visibility);
      engine.dispose();
    };
  }, []);
  const play = useCallback((kind: Sound, delayMs = 0) => {
    ref.current!.play(kind, delayMs);
  }, []);
  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    localStorage.setItem("ps-sound", String(next));
    ref.current!.setEnabled(next);
    if (next)
      void ref.current!.unlock().then(() => ref.current!.play("enabled"));
  }, []);
  const setVolume = useCallback((value: number) => {
    const next = clampVolume(value);
    setVolumeState(next);
    localStorage.setItem("ps-volume", String(next));
    ref.current!.setVolume(next);
  }, []);
  const preview = useCallback((kind: Sound) => {
    void ref.current!.unlock().then(() => {
      ref.current!.stop();
      ref.current!.play(kind);
    });
  }, []);
  return { enabled, volume, play, toggle, setVolume, preview };
}
