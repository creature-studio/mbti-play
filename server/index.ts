import express from "express";
import compression from "compression";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomBytes, createHash } from "node:crypto";
import { createGame, newPlayer, reduceGame, viewFor } from "../shared/engine";
import { botAction } from "../shared/bot";
import type { GameState, Player, Action } from "../shared/types";
const app = express(),
  http = createServer(app),
  io = new Server(http, { maxHttpBufferSize: 16384 });
app.disable("x-powered-by");
app.use(compression());

interface Room {
  code: string;
  hostId: string;
  players: Player[];
  game: GameState | null;
  updated: number;
  nextBot: number;
}
const rooms = new Map<string, Room>(),
  members = new Map<string, string>(),
  disconnects = new Map<string, number>();
const botNames = ["小林不想上班", "月亮没睡", "阿橘", "脆皮打工人", "随便都行"];
function lobby(r: Room, id: string) {
  return {
    phase: "lobby",
    players: r.players.map((p) => ({
      ...p,
      hand: [],
      goal: undefined,
      handCount: 0,
      current: "????",
    })),
    yourId: id,
    roomCode: r.code,
    hostId: r.hostId,
    logs: [],
    round: 1,
    turn: 0,
    seq: 0,
  };
}
function broadcast(r: Room) {
  r.updated = Date.now();
  for (const socket of io.sockets.sockets.values())
    if (members.get(socket.data.pid) === r.code)
      socket.emit(
        "state",
        r.game
          ? viewFor(r.game, socket.data.pid, r.code, r.hostId)
          : lobby(r, socket.data.pid),
      );
}
function leave(id: string) {
  const code = members.get(id),
    r = code ? rooms.get(code) : null;
  members.delete(id);
  if (!r) return;
  if (r.game && r.game.phase !== "finished") {
    const p = r.game.players.find((p) => p.id === id);
    if (p) {
      p.bot = true;
      p.connected = false;
    }
    r.players = r.game.players;
  } else {
    r.players = r.players.filter((p) => p.id !== id);
    r.game = null;
  }
  if (r.hostId === id)
    r.hostId =
      r.players.find((p) => !p.bot && p.id !== id && p.connected)?.id ??
      r.players.find((p) => !p.bot && p.id !== id)?.id ??
      "";
  if (!r.players.some((p) => !p.bot)) rooms.delete(r.code);
  else broadcast(r);
}
function addBots(r: Room, count: number) {
  for (let i = 0; i < count && r.players.length < 6; i++)
    r.players.push(
      newPlayer(
        `bot-${randomBytes(4).toString("hex")}`,
        botNames[i % botNames.length],
        (i + 1) % 6,
        true,
      ),
    );
}
io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;
  if (typeof token !== "string" || !/^[a-zA-Z0-9_-]{20,100}$/.test(token)) {
    socket.disconnect();
    return;
  }
  // The public player ID must NEVER be the reconnect credential.
  const id = createHash("sha256").update(token).digest("hex").slice(0, 24);
  socket.data.pid = id;
  disconnects.delete(id);
  const existing = rooms.get(members.get(id) ?? "");
  if (existing) {
    const p = (existing.game?.players ?? existing.players).find(
      (p) => p.id === id,
    );
    if (p) {
      p.connected = true;
      p.bot = false;
    }
    broadcast(existing);
  }
  let calls = 0,
    window = Date.now();
  function guard(fn: () => void) {
    try {
      if (Date.now() - window > 1000) {
        calls = 0;
        window = Date.now();
      }
      if (++calls > 15) throw Error("操作太快啦，给人格一点反应时间");
      fn();
    } catch (e) {
      socket.emit(
        "notice",
        e instanceof Error ? e.message : "操作没有成功，请重试",
      );
    }
  }
  socket.on("create", (payload = {}) =>
    guard(() => {
      if (rooms.size > 1000) throw Error("房间已满，请稍后再试");
      leave(id);
      const name =
        String(payload.name || "匿名观察员")
          .trim()
          .slice(0, 14) || "匿名观察员";
      let code = "";
      do {
        code = randomBytes(3).toString("hex").toUpperCase();
      } while (rooms.has(code));
      const r: Room = {
        code,
        hostId: id,
        players: [
          newPlayer(
            id,
            name,
            Math.abs(Math.floor(Number(payload.avatar) || 0)) % 6 || 0,
          ),
        ],
        game: null,
        updated: Date.now(),
        nextBot: Date.now() + 1800,
      };
      if (payload.quick) {
        addBots(r, 3);
        r.game = createGame(
          r.players,
          randomBytes(4).readUInt32LE(),
          Date.now(),
        );
      }
      rooms.set(code, r);
      members.set(id, code);
      broadcast(r);
    }),
  );
  socket.on("join", (payload = {}) =>
    guard(() => {
      const code = String(payload.code ?? "")
        .toUpperCase()
        .trim();
      const r = rooms.get(code);
      if (!r) throw Error("没找到这个房间，检查一下房间码");
      if (members.get(id) === code) {
        broadcast(r);
        return;
      }
      if (r.game && r.game.phase !== "finished")
        throw Error("这局已经开始了，等朋友下一局吧");
      if (r.players.length >= 6) throw Error("房间坐满了，最多 6 人");
      leave(id);
      if (r.game) {
        r.game = null;
        r.players.forEach((p) => (p.ready = p.bot));
      }
      r.players.push(
        newPlayer(
          id,
          String(payload.name || "神秘来客").slice(0, 14),
          Math.abs(Math.floor(Number(payload.avatar) || 0)) % 6 || 0,
        ),
      );
      members.set(id, code);
      broadcast(r);
    }),
  );
  socket.on("ready", () =>
    guard(() => {
      const r = rooms.get(members.get(id) ?? "");
      if (!r || r.game) return;
      const p = r.players.find((p) => p.id === id)!;
      p.ready = !p.ready;
      broadcast(r);
    }),
  );
  socket.on("bots", (count: number) =>
    guard(() => {
      const r = rooms.get(members.get(id) ?? "");
      if (!r || r.hostId !== id || r.game)
        throw Error("只有房主可以调整机器人");
      r.players = r.players.filter((p) => !p.bot);
      addBots(r, Math.max(0, Math.min(5, Math.floor(Number(count) || 0))));
      broadcast(r);
    }),
  );
  socket.on("start", () =>
    guard(() => {
      const r = rooms.get(members.get(id) ?? "");
      if (!r || r.hostId !== id) throw Error("等房主开局吧");
      if (r.game && r.game.phase !== "finished") throw Error("游戏已经开始");
      if (r.players.some((p) => p.id !== id && !p.bot && !p.ready))
        throw Error("还有朋友没准备好");
      r.game = createGame(r.players, randomBytes(4).readUInt32LE(), Date.now());
      r.nextBot = Date.now() + 1800;
      broadcast(r);
    }),
  );
  socket.on("rematch", () =>
    guard(() => {
      const r = rooms.get(members.get(id) ?? "");
      if (!r || r.game?.phase !== "finished") return;
      r.players = r.game.players.map((p) => ({ ...p, ready: p.bot }));
      r.game = null;
      broadcast(r);
    }),
  );
  socket.on("action", (input: Action) =>
    guard(() => {
      const r = rooms.get(members.get(id) ?? "");
      if (!r?.game) throw Error("对局还没开始");
      if (
        !input ||
        typeof input !== "object" ||
        ![
          "PLAY",
          "ABILITY",
          "GUESS",
          "DECLARE",
          "END",
          "PASS",
          "REACT",
        ].includes(input.type)
      )
        throw Error("无效操作");
      r.game = reduceGame(r.game, { ...input, playerId: id }, Date.now());
      r.nextBot = Date.now() + 1400;
      broadcast(r);
    }),
  );
  socket.on("leave", () =>
    guard(() => {
      leave(id);
      socket.emit("left");
    }),
  );
  socket.on("disconnect", () => {
    if ([...io.sockets.sockets.values()].some((s) => s.data.pid === id)) return;
    disconnects.set(id, Date.now());
    const r = rooms.get(members.get(id) ?? "");
    if (r) {
      const p = (r.game?.players ?? r.players).find((p) => p.id === id);
      if (p) p.connected = false;
      broadcast(r);
    }
  });
});
setInterval(() => {
  const now = Date.now();
  for (const [id, when] of disconnects)
    if (now - when > 30000) {
      const r = rooms.get(members.get(id) ?? "");
      if (r) {
        if (r.game) {
          const p = r.game.players.find((p) => p.id === id);
          if (p) p.bot = true;
          if (r.hostId === id)
            r.hostId =
              r.game.players.find((p) => p.connected && !p.bot)?.id ?? id;
          broadcast(r);
        } else leave(id);
      }
      disconnects.delete(id);
    }
  for (const [code, r] of rooms) {
    if (now - r.updated > 2 * 60 * 60 * 1000) {
      rooms.delete(code);
      for (const [id, c] of members) if (c === code) members.delete(id);
      continue;
    }
    let s = r.game;
    if (!s || s.phase === "finished") continue;
    try {
      if (s.deadline && now >= s.deadline) {
        r.game = reduceGame(
          s,
          { type: "TIMEOUT", playerId: s.players[0].id },
          now,
        );
        broadcast(r);
        continue;
      }
      if (now < r.nextBot) continue;
      let actor: Player | undefined;
      if (s.phase === "reaction")
        actor = s.players.find((p) => p.id === s.pending?.to && p.bot);
      else if (s.phase === "challenge")
        actor = s.players.find(
          (p) =>
            p.bot &&
            p.id !== s.challenge?.player &&
            !s.challenge?.responded.includes(p.id),
        );
      else if (s.phase === "playing" && s.players[s.turn].bot)
        actor = s.players[s.turn];
      if (actor) {
        const action = botAction(s, actor.id, now);
        if (action) {
          r.game = reduceGame(s, action, now);
          r.nextBot = now + 1300;
          broadcast(r);
        }
      }
    } catch (e) {
      console.error("Game tick:", e);
      r.nextBot = now + 2000;
    }
  }
}, 400).unref();
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, rooms: rooms.size }),
);
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist", { maxAge: "1h" }));
  app.get("*", (_req, res) => res.sendFile(process.cwd() + "/dist/index.html"));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "spa",
  } as any);
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT) || 3000;
http.listen(port, "0.0.0.0", () =>
  console.log(`Personality Shift ready on http://0.0.0.0:${port}`),
);
