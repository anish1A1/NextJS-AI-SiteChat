"use client";

import { useState, Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useUsername } from "@/hooks/useUsername";

function LobbyContent() {
  const { username } = useUsername();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [roomInput, setRoomInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Catch error redirects from proxy.ts (?error=room-not-found or ?error=room-full)
  const errorParam = searchParams.get("error");
  const errorMessage =
    errorParam === "room-full"
      ? "That room is already at maximum capacity (2/2 users)."
      : errorParam === "room-not-found"
      ? "Room not found or its 10-minute timer has already expired."
      : null;

  // 1. Create a new room
  const { mutate: createRoom, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      const res = await client.api.room.create.post();
      if (res.status === 200 && res.data?.roomId) {
        router.push(`/room/${res.data.roomId}`);
      } else {
        throw new Error("Failed to create room");
      }
    },
  });

  // 2. Join an existing room (handles both raw Room ID and full URL)
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomInput.trim();
    if (!trimmed) return;

    setIsJoining(true);

    // Extract Room ID if the user pasted a full URL like http://localhost:3000/room/abc123
    const urlMatch = trimmed.match(/\/room\/([^/?#]+)/);
    const targetRoomId = urlMatch ? urlMatch[1] : trimmed;

    router.push(`/room/${targetRoomId}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-zinc-950 text-zinc-50 selection:bg-green-500/30">
      <div className="w-full max-w-md space-y-6">
        {/* Header / Brand Identity */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-mono mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            10-MIN SELF-DESTRUCTING ROOMS
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 font-mono">
            <span className="text-green-500">&gt;</span> sitechat
          </h1>
          <p className="text-zinc-400 text-sm">
            Zero-trace 1-on-1 private messaging. No accounts, no history.
          </p>
        </div>

        {/* Redirect Error Alert (if kicked back from proxy.ts) */}
        {errorMessage && (
          <div className="border border-red-500/40 bg-red-950/30 text-red-300 px-4 py-3 rounded-lg text-xs font-mono flex items-center justify-between">
            <span>! {errorMessage}</span>
            <button
              onClick={() => router.replace("/")}
              className="text-red-400 hover:text-red-200 underline ml-3 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className="border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md rounded-xl shadow-2xl space-y-6">
          {/* Identity Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                Assigned Alias
              </label>
              <span className="text-[11px] text-zinc-600 font-mono">
                Session Local
              </span>
            </div>
            <div className="bg-zinc-950 border border-zinc-800/90 px-3.5 py-2.5 text-sm text-green-400 font-mono rounded-lg truncate">
              {username || "Generating alias..."}
            </div>
          </div>

          {/* Primary Action: Create Room */}
          <button
            onClick={() => createRoom()}
            disabled={isCreating || isJoining}
            className="w-full bg-green-600 hover:bg-green-500 text-white p-3 text-sm font-bold tracking-wide transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-green-950/50"
          >
            {isCreating ? "INITIALIZING ROOM..." : "+ CREATE NEW ROOM"}
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-500 text-[11px] font-mono uppercase">
              or join existing
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Secondary Action: Join Room Form */}
          <form onSubmit={handleJoinRoom} className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="room-id-input"
                className="text-zinc-400 text-xs uppercase tracking-wider font-semibold block"
              >
                Room ID or Invite Link
              </label>
              <input
                id="room-id-input"
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Paste Room ID or full URL..."
                disabled={isCreating || isJoining}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-green-500/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 font-mono rounded-lg outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={!roomInput.trim() || isCreating || isJoining}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 p-3 text-sm font-bold tracking-wide transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-zinc-700/50"
            >
              {isJoining ? "CONNECTING..." : "JOIN ROOM →"}
            </button>
          </form>
        </div>

        {/* Minimal Footer */}
        <p className="text-center text-[11px] text-zinc-600 font-mono">
          Max 2 participants • Auto-wiped from Redis upon expiry
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-sm">
          Loading lobby...
        </main>
      }
    >
      <LobbyContent />
    </Suspense>
  );
}
