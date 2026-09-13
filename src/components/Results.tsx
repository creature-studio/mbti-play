import { Trophy, RotateCcw, Share2, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { socket } from "../hooks/useGame";
import type { PublicPlayer, ViewState } from "../../shared/types";
import { Avatar } from "./Avatar";
export function Results({
  game,
  notify,
}: {
  game: ViewState;
  notify: (s: string) => void;
}) {
  const winner = game.players.find((p) => p.id === game.winner)!;
  const me = game.players.find((p) => p.id === game.yourId)!;
  const sorted = [...game.players].sort((a, b) =>
    a.id === winner.id
      ? -1
      : b.id === winner.id
        ? 1
        : b.stats.correct - a.stats.correct,
  );
  const award = (
    key: "attacks" | "targeted" | "drifts" | "correct" | "failed",
  ) => [...game.players].sort((a, b) => b.stats[key] - a.stats[key])[0];
  const stealth = [...game.players].sort(
    (a, b) => a.stats.targeted - b.stats.targeted,
  )[0];
  const wildest = game.players
    .flatMap((p) => {
      const complete = p.history.filter((t) => !t.includes("·"));
      return complete.map((t) => ({
        player: p,
        from: p.history[0],
        to: t,
        distance: t.split("").filter((l, i) => l !== p.history[0][i]).length,
      }));
    })
    .sort((a, b) => b.distance - a.distance)[0];
  async function share() {
    const text = `《人格漂移》这局 ${winner.name} 藏成了 ${winner.goal}！我从 ${me.history[0]} 漂移到 ${me.current}，反复横跳 ${me.stats.drifts} 次。差一点就赢了，再来一局？`;
    try {
      if (navigator.share)
        await navigator.share({
          title: "人格漂移 · 本局战报",
          text,
          url: location.origin,
        });
      else {
        await navigator.clipboard.writeText(`${text}\n${location.origin}`);
        notify("战报已复制，发给牌搭子吧");
      }
    } catch {
      notify("分享未完成，你可以再试一次");
    }
  }
  return (
    <main className="results-page">
      <div className="results-confetti">
        {Array.from({ length: 20 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${i * 5}%`,
              animationDelay: `${i * 0.13}s`,
              background: i % 2 ? "#bea5e7" : "#c9f17c",
              transform: `rotate(${i * 30}deg)`,
            }}
          />
        ))}
      </div>
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="winner-block"
      >
        <span className="eyebrow">
          <Trophy size={15} /> 这一局，演得漂亮
        </span>
        <div className="winner-avatar">
          <Avatar index={winner.avatar} size={86} />
          <Trophy size={27} />
        </div>
        <h1>
          {winner.id === game.yourId
            ? "不装了，你赢了。"
            : `${winner.name}，藏到最后。`}
        </h1>
        <p>
          秘密目标 <b>{winner.goal}</b> · 历经 {game.round} 轮人格漂移 ·
          最终宣言成功
        </p>
      </motion.div>
      <div className="results-layout">
        <section className="results-ranking">
          <div className="section-top">
            <h3>本局人格揭晓</h3>
            <span>THE REAL YOU</span>
          </div>
          {sorted.map((p, i) => (
            <div
              className={`rank-row ${p.id === winner.id ? "rank-winner" : ""}`}
              key={p.id}
            >
              <b className="rank-no">{String(i + 1).padStart(2, "0")}</b>
              <Avatar index={p.avatar} size={40} />
              <div>
                <h3>
                  {p.name}
                  {p.id === game.yourId && <small>你</small>}
                </h3>
                <span>
                  {p.history[0]} <ArrowRight size={12} /> {p.current}
                </span>
              </div>
              <div className="rank-goal">
                <small>秘密目标</small>
                <b>{p.goal}</b>
              </div>
              {i === 0 && <Trophy size={20} />}
            </div>
          ))}
          <div className="my-journey">
            <h3>
              你的人格漂移路线 <Sparkles size={15} />
            </h3>
            <div>
              {me.history.map((t, i) => (
                <span key={i}>
                  {i > 0 && <ArrowRight size={12} />}
                  <b>{t}</b>
                </span>
              ))}
            </div>
          </div>
        </section>
        <aside className="awards">
          <h3>没赢，也有点东西。</h3>
          {(
            [
              ["最会搞事", award("attacks"), "attacks", "次出手"],
              ["全场背锅侠", award("targeted"), "targeted", "次被针对"],
              ["反复横跳大师", award("drifts"), "drifts", "次漂移"],
              ["人形读心机", award("correct"), "correct", "次猜中"],
              ["最会隐藏", stealth, "targeted", "次被针对"],
              ["差一点就赢", award("failed"), "failed", "次宣言被打断"],
            ] as [string, PublicPlayer, keyof PublicPlayer["stats"], string][]
          ).map(([label, p, key, suffix], i) => (
            <div className="award-row" key={label}>
              <span className="award-icon">
                {["↗", "◎", "⇌", "✧", "◌", "⚑"][i]}
              </span>
              <div>
                <h4>{label}</h4>
                <p>
                  {key === "correct" && p.stats[key] === 0
                    ? "全员都在装 · 本局无人猜中"
                    : p.name}
                </p>
              </div>
              <span>
                {p.stats[key]} {suffix}
              </span>
            </div>
          ))}
          {wildest && (
            <div className="award-row">
              <span className="award-icon">✳</span>
              <div>
                <h4>最离谱人格变化</h4>
                <p>{wildest.player.name}</p>
              </div>
              <span>
                {wildest.from} → {wildest.to}
              </span>
            </div>
          )}
        </aside>
      </div>
      <div className="results-actions">
        <button
          className="button button-lime"
          onClick={() => socket.emit("rematch")}
        >
          <RotateCcw size={19} />
          再来一局，这次不装了
        </button>
        <button className="button button-outline" onClick={share}>
          <Share2 size={18} />
          分享本局战报
        </button>
      </div>
    </main>
  );
}
