"use client";

import { useCallback, useEffect, useState } from "react";

interface PomodoroTimerProps {
  isRunning: boolean;
  endsAtEpochMs: number;
  durationMinutes: number;
  startedBy: string;
  onStart: (minutes: number) => void;
  onStop: () => void;
}

export function PomodoroTimer({
  isRunning,
  endsAtEpochMs,
  durationMinutes,
  startedBy,
  onStart,
  onStop,
}: PomodoroTimerProps) {
  const [remaining, setRemaining] = useState("");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      setRemaining("");
      setFinished(false);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const diff = endsAtEpochMs - now;
      if (diff <= 0) {
        setRemaining("00:00");
        setFinished(true);
        return;
      }
      setFinished(false);
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isRunning, endsAtEpochMs]);

  const handleStart = useCallback((mins: number) => {
    onStart(mins);
  }, [onStart]);

  return (
    <section className="panel p-4">
      <h3 className="pixel-label text-amber-200">Pomodoro Timer</h3>
      {isRunning ? (
        <div className="mt-2">
          <p className="text-3xl font-bold tabular-nums" style={{ fontFamily: "var(--pixel-font)" }}>
            {remaining}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            {finished ? "Break time! 🎉" : `${durationMinutes}min session by ${startedBy}`}
          </p>
          <button
            onClick={onStop}
            className="mt-2 rounded-lg border border-white/20 bg-black/20 px-3 py-1 text-sm"
          >
            Stop
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => handleStart(25)}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black"
          >
            25 min
          </button>
          <button
            onClick={() => handleStart(50)}
            className="rounded-lg border border-amber-400/40 px-3 py-2 text-sm text-amber-200"
          >
            50 min
          </button>
          <button
            onClick={() => handleStart(5)}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm"
          >
            5 min break
          </button>
        </div>
      )}
    </section>
  );
}
