import { CUES, clampVolume, type Sound, type Voice } from "./cues";
/** Single audio graph. It is created/resumed only from a user gesture. */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private lastPlayed = new Map<Sound, number>();
  private enabled = false;
  private volume = 0.5;
  private hidden = false;
  private disposed = false;
  private generation = 0;
  constructor(
    private createContext = () =>
      new AudioContext({ latencyHint: "interactive" }),
  ) {}
  async unlock() {
    if (!this.enabled || this.hidden || this.disposed) return;
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.master = this.context.createGain();
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 12;
        limiter.ratio.value = 6;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.12;
        this.master.gain.value = this.volume * 0.7;
        this.master.connect(limiter);
        limiter.connect(this.context.destination);
        this.noise = this.context.createBuffer(
          1,
          Math.ceil(this.context.sampleRate * 0.5),
          this.context.sampleRate,
        );
        const data = this.noise.getChannelData(0);
        let seed = 27183;
        for (let i = 0; i < data.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          data[i] = seed / 2147483648 - 1;
        }
      }
      const generation = this.generation;
      if (this.context.state === "suspended") await this.context.resume();
      if (
        this.disposed ||
        this.hidden ||
        !this.enabled ||
        generation !== this.generation
      )
        return;
      this.updateGain();
    } catch {
      /* An unsupported or blocked audio device must never stop a game. */
    }
  }
  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) this.stop();
    this.updateGain();
  }
  setVolume(value: number) {
    this.volume = clampVolume(value);
    if (!this.volume) this.stop();
    this.updateGain();
  }
  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) this.stop();
    this.updateGain();
  }
  private updateGain() {
    if (!this.master || !this.context) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(
      this.enabled && !this.hidden ? this.volume * 0.7 : 0,
      now,
      0.012,
    );
  }
  play(kind: Sound, delayMs = 0) {
    const c = this.context;
    if (
      this.disposed ||
      !this.enabled ||
      this.hidden ||
      !this.volume ||
      !c ||
      c.state !== "running" ||
      !this.master
    )
      return false;
    const now = c.currentTime,
      previous = this.lastPlayed.get(kind) ?? -Infinity;
    if (
      now - previous < (kind === "select" ? 0.065 : 0.11) ||
      this.sources.size > 48
    )
      return false;
    this.lastPlayed.set(kind, now);
    for (const v of CUES[kind])
      this.voice(v, now + 0.008 + Math.min(1500, Math.max(0, delayMs)) / 1000);
    return true;
  }
  private voice(v: Voice, start: number) {
    start += v.at;
    const c = this.context!,
      envelope = c.createGain();
    const source: AudioScheduledSourceNode =
      v.wave === "noise" ? c.createBufferSource() : c.createOscillator();
    const filter = v.wave === "noise" ? c.createBiquadFilter() : null;
    if (v.wave === "noise") {
      (source as AudioBufferSourceNode).buffer = this.noise;
      if (filter) {
        filter.type = v.filter ?? "bandpass";
        filter.frequency.value = v.frequency;
        filter.Q.value = v.q ?? 0.7;
        source.connect(filter);
        filter.connect(envelope);
      }
    } else {
      const o = source as OscillatorNode;
      o.type = v.wave as OscillatorType;
      o.frequency.setValueAtTime(v.frequency, start);
      if (v.end)
        o.frequency.exponentialRampToValueAtTime(v.end, start + v.duration);
      o.connect(envelope);
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(v.gain, start + (v.attack ?? 0.006));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + v.duration);
    envelope.connect(this.master!);
    this.sources.add(source);
    source.onended = () => {
      source.disconnect();
      filter?.disconnect();
      envelope.disconnect();
      this.sources.delete(source);
    };
    source.start(start);
    source.stop(start + v.duration + 0.025);
  }
  stop() {
    this.generation++;
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {}
    }
    this.sources.clear();
    this.lastPlayed.clear();
  }
  dispose() {
    this.disposed = true;
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
  }
}
