import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { Action, ViewState } from "../../shared/types";
let token = localStorage.getItem("ps-token");
if (!token) {
  token = crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem("ps-token", token);
}
export const socket = io({ auth: { token }, autoConnect: false });
export function useGame() {
  const [game, setGame] = useState<ViewState | null>(null),
    [connected, setConnected] = useState(socket.connected),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const onState = (s: ViewState) => {
      setGame(s);
      const url = new URL(location.href);
      url.searchParams.set("room", s.roomCode);
      history.replaceState({}, "", url);
    };
    const onNotice = (s: string) => setNotice(s);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onLeft = () => {
      setGame(null);
      history.replaceState({}, "", location.pathname);
    };
    socket.on("state", onState);
    socket.on("notice", onNotice);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("left", onLeft);
    setConnected(socket.connected);
    socket.connect();
    return () => {
      socket.off("state", onState);
      socket.off("notice", onNotice);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("left", onLeft);
    };
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4200);
      return () => clearTimeout(t);
    }
  }, [notice]);
  return {
    game,
    connected,
    notice,
    setNotice,
    send: (action: Omit<Action, "playerId"> | Record<string, unknown>) =>
      socket.emit("action", action),
  };
}
