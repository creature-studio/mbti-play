import type { Ability, Axes, Player } from "./types";
import { AXIS_LETTERS } from "./cards";
export const ABILITIES: Record<string, Ability> = {
  INTJ: {
    name: "提前布局",
    description: "看牌库顶 2 张，拿走更接近目标的一张。",
  },
  INTP: { name: "换个思路", description: "弃掉最左手牌，抽 2 张新牌。" },
  ENTJ: {
    name: "我来安排",
    description: "令一人向 J 移动 1 格，自己抽 1 张。",
  },
  ENTP: { name: "反方发言", description: "将另一人的所选轴向中线推 1 格。" },
  INFJ: {
    name: "看穿不说穿",
    description: "花 1 点洞察，偷看一人的一条目标轴。",
  },
  INFP: {
    name: "忠于内心",
    description: "花 1 点洞察，所选轴向秘密目标移动 1 格。",
  },
  ENFJ: {
    name: "气氛组长",
    description: "所有人向 E 移动 1 格，自己获得防护。",
  },
  ENFP: {
    name: "灵感传染",
    description: "自己向 N 移动 1 格，另一人向 F 移动 1 格。",
  },
  ISTJ: {
    name: "按部就班",
    description: "自己向 J 移动 1 格，并获得 1 点洞察。",
  },
  ISFJ: {
    name: "我替你挡",
    description: "为任意一人加 1 层防护，自己获得 1 点洞察。",
  },
  ESTJ: {
    name: "回到正轨",
    description: "另一人所选轴回到中线；自己向 J 移动 1 格。",
  },
  ESFJ: { name: "见者有份", description: "自己和另一人各抽 1 张牌。" },
  ISTP: {
    name: "拆开看看",
    description: "移除一人的所有防护；若无防护则自己抽 1 张。",
  },
  ISFP: {
    name: "随性创作",
    description: "把自己所选轴翻转；从此刻开始另一种生活。",
  },
  ESTP: {
    name: "赌把大的",
    description: "所选轴朝目标移动 2 格，弃掉最左手牌。",
  },
  ESFP: {
    name: "全场焦点",
    description: "拿走另一人最左手牌，自己向 E 移动 1 格。",
  },
};
export function personality(axes: Axes): string {
  return axes
    .map((v, i) => (v === 0 ? "·" : AXIS_LETTERS[i][v < 0 ? 0 : 1]))
    .join("");
}
export function activePersonality(axes: Axes): string {
  return axes.map((v, i) => AXIS_LETTERS[i][v <= 0 ? 0 : 1]).join("");
}
export function direction(goal: string, axis: number) {
  return goal[axis] === AXIS_LETTERS[axis][0] ? -1 : 1;
}
export function progress(p: Pick<Player, "axes" | "goal">) {
  return p.axes.filter((v, i) => v * direction(p.goal, i) > 0).length;
}
