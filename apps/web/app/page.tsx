"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export default function HomePage() {
  const [roomName, setRoomName] = useState("Late Night Study Club");
  const [hostName, setHostName] = useState("StudyHost");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<null | {
    roomId: string;
    inviteToken: string;
    joinUrl: string;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, hostName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "room_create_failed");
      }

      const data = await response.json();
      const joinUrl = `${window.location.origin}/room/${data.room.id}?invite=${data.hostInviteToken}`;

      setResult({
        roomId: data.room.id,
        inviteToken: data.hostInviteToken,
        joinUrl
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="fade-rise panel flex flex-col gap-5 p-7">
        <p className="font-mono text-sm uppercase tracking-[0.18em] text-amber-200">Chillspace v1</p>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">
          Build your study world, not another tile-based meeting grid.
        </h1>
        <p className="max-w-3xl text-lg text-slate-200">
          Spawn a private room with avatar movement, proximity voice, webcam bubbles, shared lofi queue, and game tables.
        </p>
      </section>

      <section className="panel grid gap-4 p-6 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Room name
          <input
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none ring-amber-300 transition focus:ring"
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Host nickname
          <input
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none ring-amber-300 transition focus:ring"
            value={hostName}
            onChange={(event) => setHostName(event.target.value)}
          />
        </label>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            onClick={createRoom}
            disabled={creating}
            className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Room"}
          </button>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
      </section>

      {result ? (
        <section className="fade-rise panel flex flex-col gap-3 p-6">
          <h2 className="text-xl font-semibold">Room Ready</h2>
          <p className="font-mono text-sm text-slate-200">Room ID: {result.roomId}</p>
          <p className="font-mono text-sm text-slate-200">Invite token: {result.inviteToken}</p>
          <a
            href={result.joinUrl}
            className="w-fit rounded-lg border border-emerald-200/50 bg-emerald-500/20 px-4 py-2 font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
          >
            Enter Room
          </a>
        </section>
      ) : null}
    </main>
  );
}
