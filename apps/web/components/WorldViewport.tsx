"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { ChillWorldHandle } from "@chillspace/game";
import type { AvatarState, MoveInput } from "@chillspace/protocol";

interface WorldViewportProps {
  selfAvatar: AvatarState;
  avatars: AvatarState[];
  onMoveInput: (input: MoveInput) => void;
  onInteract: (tableId: string) => void;
  overlay?: ReactNode;
  onViewportResize?: (width: number, height: number) => void;
}

export function WorldViewport({
  selfAvatar,
  avatars,
  onMoveInput,
  onInteract,
  overlay,
  onViewportResize
}: WorldViewportProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<ChillWorldHandle | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let disposed = false;

    void import("@chillspace/game").then(({ createChillWorld }) => {
      if (disposed || !containerRef.current) {
        return;
      }

      worldRef.current = createChillWorld({
        container: containerRef.current,
        initialSelf: selfAvatar,
        onMoveInput,
        onInteract
      });

      worldRef.current.updateSelf(selfAvatar);
      worldRef.current.updateRemotes(avatars);
    });

    return () => {
      disposed = true;
      worldRef.current?.destroy();
      worldRef.current = null;
    };
  }, [selfAvatar.userId, onInteract, onMoveInput]);

  useEffect(() => {
    worldRef.current?.updateSelf(selfAvatar);
    worldRef.current?.updateRemotes(avatars);
  }, [selfAvatar, avatars]);

  useEffect(() => {
    if (!rootRef.current || !onViewportResize) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      onViewportResize(entry.contentRect.width, entry.contentRect.height);
    });

    resizeObserver.observe(rootRef.current);

    const rect = rootRef.current.getBoundingClientRect();
    onViewportResize(rect.width, rect.height);

    return () => {
      resizeObserver.disconnect();
    };
  }, [onViewportResize]);

  return (
    <div
      ref={rootRef}
      className="relative h-[62vh] min-h-[420px] w-full overflow-hidden rounded-xl border border-[rgba(255,232,176,0.1)]"
      style={{ background: "#1a1008" }}
    >
      <div ref={containerRef} className="h-full w-full" style={{ imageRendering: "pixelated" }} />
      <div className="pointer-events-none absolute inset-0 z-20">{overlay}</div>
    </div>
  );
}
