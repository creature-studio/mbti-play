/** Short, locally synthesized foley and earcons. No files, music or network requests. */
export type Voice = {
  at: number;
  duration: number;
  gain: number;
  wave: "sine" | "triangle" | "noise";
  frequency: number;
  end?: number;
  attack?: number;
  filter?: BiquadFilterType;
  q?: number;
};
const tone = (
  frequency: number,
  at = 0,
  duration = 0.16,
  gain = 0.12,
  end?: number,
): Voice => ({ wave: "sine", frequency, at, duration, gain, end });
const noise = (
  at: number,
  duration: number,
  gain: number,
  frequency: number,
  filter: BiquadFilterType = "bandpass",
): Voice => ({ wave: "noise", at, duration, gain, frequency, filter, q: 0.65 });
export const CUES = {
  enabled: [tone(523, 0, 0.12, 0.13), tone(784, 0.08, 0.24, 0.1)],
  select: [
    noise(0, 0.035, 0.1, 2600, "highpass"),
    tone(720, 0, 0.045, 0.07, 900),
  ],
  draw: [
    noise(0, 0.07, 0.15, 1900),
    noise(0.075, 0.055, 0.11, 3200),
    tone(470, 0.06, 0.07, 0.06, 610),
  ],
  shuffle: [0, 0.055, 0.115, 0.18, 0.25, 0.33].map((at, i) =>
    noise(at, 0.06, 0.1, 1400 + i * 270),
  ),
  reveal: [
    noise(0, 0.11, 0.07, 2000),
    tone(392, 0.06, 0.22, 0.12, 523),
    tone(784, 0.17, 0.36, 0.075),
  ],
  play: [noise(0, 0.11, 0.22, 1700), tone(210, 0.07, 0.08, 0.13, 100)],
  attack: [
    noise(0, 0.14, 0.22, 850, "lowpass"),
    tone(135, 0, 0.26, 0.32, 48),
    { ...tone(240, 0, 0.1, 0.08, 90), wave: "triangle" },
  ],
  defense: [
    tone(1047, 0, 0.34, 0.12),
    tone(1568, 0.025, 0.25, 0.06),
    noise(0, 0.05, 0.06, 4200, "highpass"),
  ],
  reflect: [
    tone(410, 0, 0.14, 0.14, 900),
    noise(0.05, 0.12, 0.12, 2300),
    tone(1250, 0.13, 0.26, 0.11, 700),
  ],
  drift: [
    tone(330, 0, 0.2, 0.12, 523),
    tone(659, 0.12, 0.3, 0.105, 784),
    tone(1047, 0.21, 0.28, 0.045),
  ],
  ability: [
    tone(262, 0, 0.12, 0.09),
    tone(523, 0.055, 0.22, 0.12, 659),
    tone(988, 0.14, 0.28, 0.045),
  ],
  turn: [tone(659, 0, 0.13, 0.11), tone(880, 0.12, 0.2, 0.11)],
  reaction: [tone(587, 0, 0.09, 0.14), tone(587, 0.16, 0.12, 0.14)],
  tick: [noise(0, 0.025, 0.065, 2800, "highpass"), tone(1047, 0, 0.04, 0.065)],
  world: [
    tone(220, 0, 0.4, 0.09),
    tone(440, 0.07, 0.28, 0.08),
    tone(659, 0.17, 0.38, 0.07),
  ],
  guessRight: [
    tone(523, 0, 0.13, 0.11),
    tone(659, 0.1, 0.13, 0.11),
    tone(1047, 0.2, 0.28, 0.1),
  ],
  fail: [tone(330, 0, 0.16, 0.12, 294), tone(220, 0.15, 0.28, 0.11, 196)],
  declare: [
    noise(0, 0.32, 0.11, 1300),
    tone(131, 0, 0.38, 0.1, 262),
    tone(392, 0.18, 0.23, 0.14),
    tone(523, 0.3, 0.24, 0.13),
    tone(784, 0.43, 0.38, 0.12),
    tone(1047, 0.43, 0.42, 0.05),
  ],
  win: [
    tone(523, 0, 0.19, 0.11),
    tone(659, 0.13, 0.19, 0.11),
    tone(784, 0.26, 0.22, 0.12),
    tone(1047, 0.43, 0.58, 0.12),
    tone(659, 0.43, 0.5, 0.06),
    tone(1318, 0.5, 0.45, 0.04),
  ],
  lose: [
    tone(392, 0, 0.3, 0.09),
    tone(330, 0.17, 0.36, 0.085),
    tone(262, 0.34, 0.45, 0.075),
  ],
} satisfies Record<string, Voice[]>;
export type Sound = keyof typeof CUES;
export const SOUND_SAMPLES: { kind: Sound; name: string; detail: string }[] = [
  { kind: "draw", name: "抽一张", detail: "轻轻翻动纸牌" },
  { kind: "play", name: "甩张牌", detail: "划过桌面，轻巧落下" },
  { kind: "attack", name: "给你一击", detail: "短促低频，不刺耳" },
  { kind: "defense", name: "婉拒了哈", detail: "清脆的护盾回响" },
  { kind: "reflect", name: "原路奉还", detail: "一个漂亮的回旋" },
  { kind: "drift", name: "人格漂移", detail: "滑动上扬的玻璃音" },
  { kind: "declare", name: "我不装了", detail: "短蓄力，亮出底牌" },
  { kind: "win", name: "这局你赢", detail: "一点点胜利的仪式感" },
];
export function clampVolume(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
}
