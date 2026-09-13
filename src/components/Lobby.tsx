import {
  Check,
  Copy,
  Crown,
  Plus,
  Sparkles,
  Users,
  ArrowUpRight,
  Bot,
} from "lucide-react";
import { socket } from "../hooks/useGame";
import type { ViewState } from "../../shared/types";
import { Avatar } from "./Avatar";
export function Lobby({
  game,
  notify,
}: {
  game: ViewState;
  notify: (s: string) => void;
}) {
  const host = game.hostId === game.yourId;
  const me = game.players.find((p) => p.id === game.yourId)!;
  const bots = game.players.filter((p) => p.bot).length;
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/?room=${game.roomCode}`,
      );
      notify("邀请链接已复制，发给你的牌搭子吧");
    } catch {
      notify(`房间码 ${game.roomCode}，可手动复制分享`);
    }
  }
  return (
    <main className="lobby-page">
      <div className="lobby-title">
        <span className="eyebrow">
          <span className="live-dot" />
          牌桌已经摆好了
        </span>
        <h1>
          就差你们<span>开演了。</span>
        </h1>
        <p>叫上朋友，或者让机器人陪你先练练手。</p>
      </div>
      <div className="lobby-layout">
        <section className="lobby-table">
          <div className="section-top">
            <h3>
              <Users size={18} />
              本局牌搭子
            </h3>
            <span>{game.players.length} / 6</span>
          </div>
          <div className="lobby-players">
            {game.players.map((p) => (
              <div
                className={`lobby-player ${p.id === game.yourId ? "is-me" : ""}`}
                key={p.id}
              >
                <Avatar index={p.avatar} size={61} />
                <h3>
                  {p.name}
                  {p.id === game.yourId && <small>你</small>}
                </h3>
                <span>
                  {p.id === game.hostId ? (
                    <>
                      <Crown size={13} />
                      房主
                    </>
                  ) : p.bot ? (
                    <>
                      <Bot size={13} />
                      策略机器人
                    </>
                  ) : p.ready ? (
                    <>
                      <Check size={13} />
                      准备好了
                    </>
                  ) : (
                    "还在酝酿演技"
                  )}
                </span>
                <i
                  className={p.ready || p.id === game.hostId ? "ready-dot" : ""}
                />
              </div>
            ))}
            {Array.from({ length: 6 - game.players.length }, (_, i) => (
              <button
                className="lobby-player empty-seat"
                key={i}
                onClick={copy}
              >
                <span className="empty-avatar">
                  <Plus size={26} />
                </span>
                <h3>虚位以待</h3>
                <span>邀请朋友入座</span>
              </button>
            ))}
          </div>
        </section>
        <aside className="lobby-sidebar">
          <span className="tiny-caps">YOUR SECRET CLUB</span>
          <p>房间码</p>
          <div className="room-code">{game.roomCode}</div>
          <button className="button button-outline" onClick={copy}>
            <Copy size={17} />
            复制邀请链接
          </button>
          <div className="lobby-settings">
            <h3>机器人牌搭子</h3>
            <p>凑不齐人？他们随时奉陪。</p>
            <div className="bot-stepper">
              <button
                disabled={!host || bots === 0}
                onClick={() => socket.emit("bots", bots - 1)}
                aria-label="减少机器人"
              >
                −
              </button>
              <span>
                <Bot size={19} />
                {bots} 位
              </span>
              <button
                disabled={!host || game.players.length === 6}
                onClick={() => socket.emit("bots", bots + 1)}
                aria-label="增加机器人"
              >
                +
              </button>
            </div>
          </div>
          <div className="lobby-tip">
            <Sparkles size={18} />
            <p>机器人也会藏目标、猜你人格、在你快赢时狠狠补一刀。</p>
          </div>
          {host ? (
            <button
              className="button button-lime"
              disabled={
                game.players.length < 2 ||
                game.players.some((p) => p.id !== game.hostId && !p.ready)
              }
              onClick={() => socket.emit("start")}
            >
              开始搞事 <ArrowUpRight size={21} />
            </button>
          ) : (
            <button
              className={`button ${me.ready ? "button-outline" : "button-lime"}`}
              onClick={() => socket.emit("ready")}
            >
              {me.ready ? "取消准备" : "我准备好了"}
              <Check size={20} />
            </button>
          )}
          <small className="lobby-bottom">
            {host
              ? "2–6 人即可开始 · 3–5 人更热闹"
              : "等房主开局，秘密人格即将揭晓"}
          </small>
        </aside>
      </div>
    </main>
  );
}
