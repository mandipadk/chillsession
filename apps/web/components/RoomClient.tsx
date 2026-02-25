"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefCallback
} from "react";
import { Client as ColyseusClient, Room as ColyseusRoom } from "colyseus.js";
import {
  Room as LiveKitRoom,
  RoomEvent,
  Track,
  type LocalTrack,
  type RemoteAudioTrack,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication
} from "livekit-client";
import { evaluatePlaybackDrift } from "@chillspace/music";
import {
  WORLD_CONFIG,
  type AvatarState,
  type GameKind,
  type MusicQueueItem,
  type MoveInput,
  type PlaybackState,
  type Role
} from "@chillspace/protocol";
import { controlMusic, joinSession, moderate, queueMusic } from "../lib/api";
import { calculateProximity } from "../lib/proximity";
import type { GameStatePayload, RoomUIState, SessionJoinResponse } from "../lib/types";
import { WorldViewport } from "./WorldViewport";
import { PomodoroTimer } from "./PomodoroTimer";

interface RoomClientProps {
  roomId: string;
  inviteToken?: string;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface BubbleLayout {
  userId: string;
  name: string;
  x: number;
  y: number;
  size: number;
  isSelf: boolean;
}

interface RemoteAudioChain {
  source: MediaStreamAudioSourceNode;
  panner: StereoPannerNode;
  gain: GainNode;
  trackId: string;
}

const DEFAULT_PLAYBACK: PlaybackState = {
  source: "licensed",
  itemId: "https://stream.lofi.radio/default.mp3",
  positionMs: 0,
  isPlaying: false,
  startedAtEpochMs: Date.now(),
  controllerRole: "host"
};

const DEFAULT_UI_STATE: RoomUIState = {
  avatars: [],
  messages: [],
  queue: [],
  playback: DEFAULT_PLAYBACK,
  games: {}
};

const PLACEHOLDER_TRACKS: MusicQueueItem[] = [
  {
    id: "licensed-1",
    source: "licensed",
    itemId: "https://stream.lofi.radio/default.mp3",
    title: "Lofi Study Stream",
    addedBy: "system",
    addedAtEpochMs: Date.now()
  }
];

const WORLD_PIXEL_WIDTH = WORLD_CONFIG.widthTiles * WORLD_CONFIG.tileSize;
const WORLD_PIXEL_HEIGHT = WORLD_CONFIG.heightTiles * WORLD_CONFIG.tileSize;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const toMediaStreamTrack = (
  track: LocalTrack | RemoteTrack | RemoteAudioTrack | null | undefined
): MediaStreamTrack | null => {
  if (!track || typeof track !== "object" || !("mediaStreamTrack" in track)) {
    return null;
  }

  const maybeTrack = track.mediaStreamTrack;
  if (!maybeTrack || typeof maybeTrack !== "object") {
    return null;
  }

  return maybeTrack as MediaStreamTrack;
};

export function RoomClient({ roomId, inviteToken }: RoomClientProps) {
  const [joinName, setJoinName] = useState("StudyBuddy");
  const [joinColor, setJoinColor] = useState("#7dd3fc");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const [session, setSession] = useState<SessionJoinResponse | null>(null);
  const [ui, setUI] = useState<RoomUIState>(DEFAULT_UI_STATE);
  const [textInput, setTextInput] = useState("");
  const [queueTitle, setQueueTitle] = useState("Lofi Deep Focus");
  const [queueSource, setQueueSource] = useState<"licensed" | "spotify" | "youtube">("licensed");
  const [queueItemId, setQueueItemId] = useState("https://stream.lofi.radio/default.mp3");
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 960, height: 640 });
  const [cameraTracks, setCameraTracks] = useState<Record<string, MediaStreamTrack>>({});

  const [chessFrom, setChessFrom] = useState("e2");
  const [chessTo, setChessTo] = useState("e4");
  const [pictionaryGuess, setPictionaryGuess] = useState("");
  const [pomodoroState, setPomodoroState] = useState<{
    isRunning: boolean;
    endsAtEpochMs: number;
    durationMinutes: number;
    startedBy: string;
  }>({ isRunning: false, endsAtEpochMs: 0, durationMinutes: 0, startedBy: "" });

  const colyseusRef = useRef<ColyseusRoom | null>(null);
  const livekitRef = useRef<LiveKitRoom | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChainsRef = useRef<Map<string, RemoteAudioChain>>(new Map());
  const audioSubscriptionsRef = useRef<Map<string, boolean>>(new Map());
  const bubbleVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const selfAvatar = useMemo(() => {
    if (!session) {
      return null;
    }

    const existing = ui.avatars.find((avatar) => avatar.userId === session.user.userId);
    if (existing) {
      return existing;
    }

    return {
      userId: session.user.userId,
      name: session.user.userName,
      color: session.user.avatarColor,
      x: 120,
      y: 120,
      dir: "down",
      webcamOn: webcamEnabled,
      role: session.user.role
    } satisfies AvatarState;
  }, [session, ui.avatars, webcamEnabled]);

  const upsertCameraTrack = useCallback((userId: string, track: MediaStreamTrack | null) => {
    setCameraTracks((previous) => {
      if (!track) {
        if (!(userId in previous)) {
          return previous;
        }

        const next = { ...previous };
        delete next[userId];
        return next;
      }

      if (previous[userId]?.id === track.id) {
        return previous;
      }

      return {
        ...previous,
        [userId]: track
      };
    });
  }, []);

  const disconnectAudioChain = useCallback((userId: string) => {
    const existing = audioChainsRef.current.get(userId);
    if (!existing) {
      return;
    }

    existing.source.disconnect();
    existing.panner.disconnect();
    existing.gain.disconnect();
    audioChainsRef.current.delete(userId);
  }, []);

  const ensureAudioChain = useCallback(
    (userId: string, track: MediaStreamTrack | null) => {
      const context = audioContextRef.current;
      if (!context || !track) {
        return;
      }

      const existing = audioChainsRef.current.get(userId);
      if (existing && existing.trackId === track.id) {
        return;
      }

      if (existing) {
        disconnectAudioChain(userId);
      }

      const source = context.createMediaStreamSource(new MediaStream([track]));
      const panner = context.createStereoPanner();
      const gain = context.createGain();

      source.connect(panner);
      panner.connect(gain);
      gain.connect(context.destination);

      audioChainsRef.current.set(userId, {
        source,
        panner,
        gain,
        trackId: track.id
      });
    },
    [disconnectAudioChain]
  );

  const syncLocalCameraTrack = useCallback(
    (room: LiveKitRoom, userId: string) => {
      const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const localCameraTrack = toMediaStreamTrack(publication?.track as LocalTrack | undefined);
      upsertCameraTrack(userId, localCameraTrack);
    },
    [upsertCameraTrack]
  );

  const connectRealtime = useCallback(
    async (data: SessionJoinResponse) => {
      const client = new ColyseusClient(data.bootstrap.colyseus.wsUrl);
      const room = await client.joinOrCreate("chill_room", {
        roomId,
        roomName: data.room.name,
        token: data.bootstrap.sessionJwt
      });

      colyseusRef.current = room;

      room.onMessage("state.patch", (payload: { avatars: AvatarState[] }) => {
        setUI((prev) => ({ ...prev, avatars: payload.avatars }));
      });

      room.onMessage("chat.message", (payload: RoomUIState["messages"][number]) => {
        setUI((prev) => ({
          ...prev,
          messages: [...prev.messages.slice(-99), payload]
        }));
      });

      room.onMessage("music.state", (payload: {
        queue: MusicQueueItem[];
        playback: PlaybackState;
      }) => {
        setUI((prev) => ({
          ...prev,
          queue: payload.queue,
          playback: payload.playback
        }));
      });

      room.onMessage("music.timelineSync", (payload: PlaybackState) => {
        setUI((prev) => ({ ...prev, playback: payload }));
      });

      room.onMessage("game.state", (payload: GameStatePayload) => {
        setUI((prev) => ({
          ...prev,
          games: {
            ...prev.games,
            [payload.tableId]: payload
          }
        }));
      });

      room.onMessage("pomodoro.state", (payload: {
        isRunning: boolean;
        endsAtEpochMs: number;
        durationMinutes: number;
        startedBy: string;
      }) => {
        setPomodoroState(payload);
      });

      room.onLeave(() => {
        setJoinError("Disconnected from realtime server.");
      });
    },
    [roomId]
  );

  const syncProximityAudio = useCallback(() => {
    const lkRoom = livekitRef.current;
    if (!lkRoom || !selfAvatar) {
      return;
    }

    const avatarsById = new Map(ui.avatars.map((avatar) => [avatar.userId, avatar]));

    lkRoom.remoteParticipants.forEach((participant: RemoteParticipant) => {
      const otherAvatar = avatarsById.get(participant.identity);
      participant.audioTrackPublications.forEach((publication: RemoteTrackPublication) => {
        const subscriptionKey = `${participant.identity}:${publication.trackSid ?? publication.trackName ?? publication.source}`;

        if (!otherAvatar) {
          const wasSubscribed = audioSubscriptionsRef.current.get(subscriptionKey);
          if (wasSubscribed !== false) {
            publication.setSubscribed(false);
            audioSubscriptionsRef.current.set(subscriptionKey, false);
          }
          disconnectAudioChain(participant.identity);
          return;
        }

        const proximity = calculateProximity(selfAvatar, otherAvatar);
        const shouldSubscribe = proximity.distanceTiles <= WORLD_CONFIG.farVoiceRadiusTiles + 2;
        const wasSubscribed = audioSubscriptionsRef.current.get(subscriptionKey);

        if (wasSubscribed !== shouldSubscribe) {
          publication.setSubscribed(shouldSubscribe);
          audioSubscriptionsRef.current.set(subscriptionKey, shouldSubscribe);
        }

        const chain = audioChainsRef.current.get(participant.identity);
        if (!chain) {
          return;
        }

        chain.gain.gain.value = proximity.muted ? 0 : proximity.gain;
        chain.panner.pan.value = proximity.pan;
      });
    });
  }, [disconnectAudioChain, selfAvatar, ui.avatars]);

  const connectLiveKit = useCallback(
    async (data: SessionJoinResponse) => {
      const room = new LiveKitRoom({
        adaptiveStream: true,
        dynacast: true
      });

      await room.connect(data.bootstrap.livekit.url, data.bootstrap.livekit.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state !== "running") {
        await audioContextRef.current.resume();
      }

      livekitRef.current = room;

      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (publication.kind === Track.Kind.Audio) {
            ensureAudioChain(participant.identity, toMediaStreamTrack(track));
          }

          if (publication.kind === Track.Kind.Video && publication.source === Track.Source.Camera) {
            upsertCameraTrack(participant.identity, toMediaStreamTrack(track));
          }

          syncProximityAudio();
        }
      );

      room.on(
        RoomEvent.TrackUnsubscribed,
        (_track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (publication.kind === Track.Kind.Audio) {
            disconnectAudioChain(participant.identity);
          }

          if (publication.kind === Track.Kind.Video && publication.source === Track.Source.Camera) {
            upsertCameraTrack(participant.identity, null);
          }
        }
      );

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        disconnectAudioChain(participant.identity);
        upsertCameraTrack(participant.identity, null);
      });

      room.on(RoomEvent.LocalTrackPublished, () => {
        syncLocalCameraTrack(room, data.user.userId);
      });

      room.on(RoomEvent.LocalTrackUnpublished, () => {
        syncLocalCameraTrack(room, data.user.userId);
      });

      room.remoteParticipants.forEach((participant: RemoteParticipant) => {
        participant.audioTrackPublications.forEach((publication) => {
          ensureAudioChain(participant.identity, toMediaStreamTrack(publication.audioTrack));
        });

        participant.videoTrackPublications.forEach((publication) => {
          if (publication.source === Track.Source.Camera) {
            upsertCameraTrack(participant.identity, toMediaStreamTrack(publication.videoTrack));
          }
        });
      });

      syncLocalCameraTrack(room, data.user.userId);
      syncProximityAudio();
    },
    [disconnectAudioChain, ensureAudioChain, syncLocalCameraTrack, syncProximityAudio, upsertCameraTrack]
  );

  useEffect(() => {
    syncProximityAudio();
  }, [syncProximityAudio]);

  useEffect(() => {
    return () => {
      colyseusRef.current?.leave();
      livekitRef.current?.disconnect();
      audioChainsRef.current.forEach((_chain, userId) => {
        disconnectAudioChain(userId);
      });
      audioChainsRef.current.clear();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, [disconnectAudioChain]);

  const handleJoin = async () => {
    if (!inviteToken) {
      setJoinError("Invite token is missing from URL.");
      return;
    }

    setJoining(true);
    setJoinError(null);

    try {
      const joined = await joinSession({
        inviteToken,
        userName: joinName,
        avatarColor: joinColor
      });

      setSession(joined);
      await Promise.all([connectRealtime(joined), connectLiveKit(joined)]);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "join_failed");
    } finally {
      setJoining(false);
    }
  };

  const sendMoveInput = useCallback((input: MoveInput) => {
    colyseusRef.current?.send("input.move", input);
  }, []);

  const handleInteract = useCallback((tableId: string) => {
    colyseusRef.current?.send("chat.send", { body: `Interacting with ${tableId}` });
  }, []);

  const handleViewportResize = useCallback((width: number, height: number) => {
    setViewportSize({ width, height });
  }, []);

  const sendEmote = useCallback((emote: string) => {
    colyseusRef.current?.send("presence.emote", { emote });
  }, []);

  const startPomodoro = useCallback((durationMinutes: number) => {
    colyseusRef.current?.send("pomodoro.start", { durationMinutes });
  }, []);

  const stopPomodoro = useCallback(() => {
    colyseusRef.current?.send("pomodoro.stop", {});
  }, []);

  const sendChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!textInput.trim()) {
      return;
    }

    colyseusRef.current?.send("chat.send", { body: textInput.trim() });
    setTextInput("");
  };

  const sendMusicQueue = async () => {
    if (!session) {
      return;
    }

    try {
      await queueMusic(session.bootstrap.sessionJwt, roomId, session.user.userId, {
        source: queueSource,
        itemId: queueItemId,
        title: queueTitle
      });
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "queue_failed");
    }
  };

  const sendMusicControl = async (action: "play" | "pause" | "skip" | "seek") => {
    if (!session) {
      return;
    }

    try {
      await controlMusic(session.bootstrap.sessionJwt, roomId, session.user.userId, {
        action,
        seekPositionMs: action === "seek" ? 0 : undefined
      });
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "control_failed");
    }
  };

  const toggleWebcam = async () => {
    const next = !webcamEnabled;
    setWebcamEnabled(next);

    const room = livekitRef.current;
    if (room) {
      await room.localParticipant.setCameraEnabled(next);
      if (session) {
        syncLocalCameraTrack(room, session.user.userId);
      }
    }

    colyseusRef.current?.send("presence.webcamToggle", { webcamOn: next });
  };

  const sendModeration = async (action: "kick" | "ban" | "mute" | "lock" | "report") => {
    if (!session) {
      return;
    }

    try {
      await moderate(session.bootstrap.sessionJwt, roomId, {
        action,
        targetUserId: selectedTarget || undefined,
        details: action === "report" ? "Reported from room panel" : undefined
      });
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "moderation_failed");
    }
  };

  const sendGameAction = (
    tableId: string,
    game: GameKind,
    action: string,
    payload: Record<string, unknown>
  ) => {
    colyseusRef.current?.send("game.action", {
      tableId,
      game,
      action,
      payload
    });
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (ui.playback.source !== "licensed") {
      return;
    }

    const tick = () => {
      const localPositionMs = audio.currentTime * 1000;
      const sync = evaluatePlaybackDrift(ui.playback, localPositionMs);
      if (sync.shouldResync) {
        audio.currentTime = sync.expectedPositionMs / 1000;
      }

      if (ui.playback.isPlaying && audio.paused) {
        void audio.play().catch(() => {
          /* autoplay can fail until user interaction */
        });
      }

      if (!ui.playback.isPlaying && !audio.paused) {
        audio.pause();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [ui.playback]);

  const bubbleLayouts = useMemo((): BubbleLayout[] => {
    if (!selfAvatar || viewportSize.width <= 0 || viewportSize.height <= 0) {
      return [];
    }

    const cameraX = clamp(selfAvatar.x - viewportSize.width / 2, 0, Math.max(0, WORLD_PIXEL_WIDTH - viewportSize.width));
    const cameraY = clamp(selfAvatar.y - viewportSize.height / 2, 0, Math.max(0, WORLD_PIXEL_HEIGHT - viewportSize.height));

    return ui.avatars
      .filter((avatar) => avatar.webcamOn)
      .map((avatar) => {
        const isSelf = avatar.userId === selfAvatar.userId;
        if (!isSelf) {
          const proximity = calculateProximity(selfAvatar, avatar);
          if (proximity.distanceTiles > WORLD_CONFIG.farVoiceRadiusTiles) {
            return null;
          }
        }

        const x = avatar.x - cameraX;
        const y = avatar.y - cameraY - 56;

        if (x < -120 || y < -120 || x > viewportSize.width + 120 || y > viewportSize.height + 120) {
          return null;
        }

        return {
          userId: avatar.userId,
          name: avatar.name,
          x,
          y,
          size: isSelf ? 76 : 68,
          isSelf
        };
      })
      .filter((bubble): bubble is BubbleLayout => Boolean(bubble));
  }, [selfAvatar, ui.avatars, viewportSize.height, viewportSize.width]);

  const bubbleVideoRef = useCallback(
    (userId: string): RefCallback<HTMLVideoElement> =>
      (element) => {
        if (!element) {
          bubbleVideoRefs.current.delete(userId);
          return;
        }

        bubbleVideoRefs.current.set(userId, element);
      },
    []
  );

  useEffect(() => {
    const selfUserId = session?.user.userId;

    bubbleLayouts.forEach((bubble) => {
      const element = bubbleVideoRefs.current.get(bubble.userId);
      if (!element) {
        return;
      }

      const track = cameraTracks[bubble.userId];
      if (!track) {
        element.srcObject = null;
        return;
      }

      const currentStream = element.srcObject as MediaStream | null;
      const currentTrack = currentStream?.getVideoTracks()[0];

      if (!currentTrack || currentTrack.id !== track.id) {
        element.srcObject = new MediaStream([track]);
      }

      element.muted = bubble.userId === selfUserId;
      void element.play().catch(() => {
        /* no-op: browser may block autoplay until interaction */
      });
    });
  }, [bubbleLayouts, cameraTracks, session?.user.userId]);

  const webcamOverlay = (
    <>
      {bubbleLayouts.map((bubble) => {
        const hasTrack = Boolean(cameraTracks[bubble.userId]);
        return (
          <div
            key={bubble.userId}
            className="absolute overflow-hidden rounded-full border border-white/70 bg-black/70 shadow-lg"
            style={{
              width: bubble.size,
              height: bubble.size,
              left: bubble.x - bubble.size / 2,
              top: bubble.y - bubble.size / 2
            }}
          >
            {hasTrack ? (
              <video
                ref={bubbleVideoRef(bubble.userId)}
                playsInline
                autoPlay
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-900 text-xs font-semibold text-slate-100">
                {bubble.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-1 py-0.5 text-center text-[10px] font-medium text-white">
              {bubble.name}
            </div>
          </div>
        );
      })}
    </>
  );

  const role: Role | null = session?.user.role ?? null;

  if (!session || !selfAvatar) {
    return (
      <section className="panel mx-auto mt-12 flex w-full max-w-xl flex-col gap-4 p-6 fade-rise">
        <h1 className="text-2xl font-semibold">Join Chillspace Room</h1>
        <p className="text-sm text-slate-200">Room: {roomId}</p>

        <label className="flex flex-col gap-2 text-sm">
          Nickname
          <input
            value={joinName}
            onChange={(event) => setJoinName(event.target.value)}
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Avatar color
          <input
            value={joinColor}
            onChange={(event) => setJoinColor(event.target.value)}
            className="h-11 rounded-lg border border-white/20 bg-black/30 px-3 py-2"
          />
        </label>

        <button
          onClick={handleJoin}
          disabled={joining}
          className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joining ? "Joining..." : "Join Room"}
        </button>

        {joinError ? <p className="text-sm text-red-300">{joinError}</p> : null}
      </section>
    );
  }

  const chessState = ui.games["table-chess-1"]?.state as
    | { fen?: string; turn?: string; history?: string[] }
    | undefined;
  const tttState = ui.games["table-ttt-1"]?.state as
    | { board?: Array<string | null>; turn?: string; winner?: string | null }
    | undefined;
  const pictionaryState = ui.games["table-pictionary-1"]?.state as
    | { guesses?: Array<{ userId: string; text: string; correct: boolean }>; currentWordHint?: string }
    | undefined;

  const nowPlaying = ui.queue[0] ?? PLACEHOLDER_TRACKS[0]!;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 p-4 md:p-6">
      <header className="panel fade-rise flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-200">Chillspace Room</p>
          <h1 className="text-2xl font-bold">{session.room.name}</h1>
          <p className="text-sm text-slate-200">You are {session.user.userName} ({role})</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleWebcam}
            className="rounded-lg border border-white/25 bg-black/25 px-3 py-2 text-sm"
          >
            {webcamEnabled ? "Disable Webcam" : "Enable Webcam"}
          </button>
          <button
            onClick={() => sendMusicControl("play")}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black"
          >
            Resume Lofi
          </button>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <article className="panel p-3">
          <WorldViewport
            selfAvatar={selfAvatar}
            avatars={ui.avatars}
            overlay={webcamOverlay}
            onViewportResize={handleViewportResize}
            onMoveInput={sendMoveInput}
            onInteract={handleInteract}
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="font-mono text-xs text-slate-200">
              WASD move | E interact | 1-5 emotes | F fullscreen
            </p>
            <div className="flex gap-1">
              {(["wave", "heart", "thumbsup", "coffee", "book"] as const).map((emote, i) => (
                <button
                  key={emote}
                  onClick={() => sendEmote(emote)}
                  className="rounded border border-white/10 bg-black/20 px-2 py-1 text-sm hover:bg-white/10"
                  title={`${emote} (${i + 1})`}
                >
                  {emote === "wave" ? "👋" : emote === "heart" ? "❤️" : emote === "thumbsup" ? "👍" : emote === "coffee" ? "☕" : "📖"}
                </button>
              ))}
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-4">
          <section className="panel p-4">
            <h2 className="text-lg font-semibold">Room Chat</h2>
            <div className="mt-3 h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
              {ui.messages.map((message) => (
                <p key={message.id} className="mb-1 text-sm text-slate-200">
                  <span className="font-mono text-xs text-sky-300">[{new Date(message.createdAtEpochMs).toLocaleTimeString()}]</span>{" "}
                  <span className="font-semibold">{message.userName}:</span> {message.body}
                </p>
              ))}
            </div>
            <form onSubmit={sendChat} className="mt-3 flex gap-2">
              <input
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                className="flex-1 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                placeholder="Send message"
              />
              <button className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-black">Send</button>
            </form>
          </section>

          <section className="panel p-4">
            <h2 className="text-lg font-semibold">Shared Music Queue</h2>
            <p className="mt-1 text-sm text-slate-200">Now playing: {nowPlaying.title}</p>

            {ui.playback.source === "licensed" ? (
              <audio
                ref={audioRef}
                src={ui.playback.itemId}
                controls
                className="mt-2 w-full"
              />
            ) : null}

            {ui.playback.source === "spotify" ? (
              <iframe
                title="spotify-player"
                src={`https://open.spotify.com/embed/track/${ui.playback.itemId}`}
                className="mt-2 h-20 w-full rounded-lg"
              />
            ) : null}

            {ui.playback.source === "youtube" ? (
              <iframe
                title="youtube-player"
                src={`https://www.youtube.com/embed/${ui.playback.itemId}?autoplay=1`}
                className="mt-2 h-40 w-full rounded-lg"
                allow="autoplay; encrypted-media"
              />
            ) : null}

            <div className="mt-3 grid gap-2">
              <select
                value={queueSource}
                onChange={(event) => setQueueSource(event.target.value as typeof queueSource)}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              >
                <option value="licensed">Licensed stream</option>
                <option value="spotify">Spotify</option>
                <option value="youtube">YouTube</option>
              </select>
              <input
                value={queueTitle}
                onChange={(event) => setQueueTitle(event.target.value)}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                placeholder="Track title"
              />
              <input
                value={queueItemId}
                onChange={(event) => setQueueItemId(event.target.value)}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                placeholder="Item ID / URL"
              />
              <div className="flex gap-2">
                <button
                  onClick={sendMusicQueue}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black"
                >
                  Queue
                </button>
                <button
                  onClick={() => sendMusicControl("pause")}
                  className="rounded-lg border border-white/30 px-3 py-2 text-sm"
                >
                  Pause
                </button>
                <button
                  onClick={() => sendMusicControl("skip")}
                  className="rounded-lg border border-white/30 px-3 py-2 text-sm"
                >
                  Skip
                </button>
              </div>
            </div>
          </section>
          <PomodoroTimer
            isRunning={pomodoroState.isRunning}
            endsAtEpochMs={pomodoroState.endsAtEpochMs}
            durationMinutes={pomodoroState.durationMinutes}
            startedBy={pomodoroState.startedBy}
            onStart={startPomodoro}
            onStop={stopPomodoro}
          />
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="panel p-4">
          <h3 className="text-lg font-semibold">Chess Table</h3>
          <p className="text-sm text-slate-200">Turn: {chessState?.turn ?? "-"}</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-300">FEN: {chessState?.fen ?? "-"}</p>
          <div className="mt-3 flex gap-2">
            <input
              value={chessFrom}
              onChange={(event) => setChessFrom(event.target.value)}
              className="w-16 rounded border border-white/20 bg-black/20 px-2 py-1"
            />
            <input
              value={chessTo}
              onChange={(event) => setChessTo(event.target.value)}
              className="w-16 rounded border border-white/20 bg-black/20 px-2 py-1"
            />
            <button
              onClick={() =>
                sendGameAction("table-chess-1", "chess", "move", {
                  from: chessFrom,
                  to: chessTo
                })
              }
              className="rounded bg-amber-500 px-3 py-1 text-black"
            >
              Move
            </button>
            <button
              onClick={() => sendGameAction("table-chess-1", "chess", "reset", {})}
              className="rounded border border-white/30 px-3 py-1"
            >
              Reset
            </button>
          </div>
        </article>

        <article className="panel p-4">
          <h3 className="text-lg font-semibold">Tic-Tac-Toe Table</h3>
          <p className="text-sm text-slate-200">Turn: {tttState?.turn ?? "-"} | Winner: {tttState?.winner ?? "none"}</p>
          <div className="mt-3 grid grid-cols-3 gap-1">
            {(tttState?.board ?? Array(9).fill(null)).map((cell, index) => (
              <button
                key={index}
                onClick={() =>
                  sendGameAction("table-ttt-1", "ttt", "move", {
                    index
                  })
                }
                className="flex h-10 items-center justify-center rounded border border-white/20 bg-black/20 text-lg"
              >
                {cell ?? ""}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => sendGameAction("table-ttt-1", "ttt", "join", {})}
              className="rounded bg-emerald-500 px-3 py-1 text-black"
            >
              Join
            </button>
            <button
              onClick={() => sendGameAction("table-ttt-1", "ttt", "reset", {})}
              className="rounded border border-white/30 px-3 py-1"
            >
              Reset
            </button>
          </div>
        </article>

        <article className="panel p-4">
          <h3 className="text-lg font-semibold">Pictionary Table</h3>
          <p className="text-sm text-slate-200">Word hint: {pictionaryState?.currentWordHint ?? "-"}</p>
          <p className="text-xs text-slate-300">Guesses: {pictionaryState?.guesses?.length ?? 0}</p>

          <div className="mt-3 flex gap-2">
            <input
              value={pictionaryGuess}
              onChange={(event) => setPictionaryGuess(event.target.value)}
              className="flex-1 rounded border border-white/20 bg-black/20 px-2 py-1"
              placeholder="Your guess"
            />
            <button
              onClick={() =>
                sendGameAction("table-pictionary-1", "pictionary", "guess", {
                  text: pictionaryGuess
                })
              }
              className="rounded bg-amber-500 px-3 py-1 text-black"
            >
              Guess
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => sendGameAction("table-pictionary-1", "pictionary", "startRound", {})}
              className="rounded bg-emerald-500 px-3 py-1 text-black"
            >
              New Round
            </button>
            <button
              onClick={() => sendGameAction("table-pictionary-1", "pictionary", "clear", {})}
              className="rounded border border-white/30 px-3 py-1"
            >
              Clear
            </button>
          </div>
        </article>
      </section>

      <section className="panel p-4">
        <h3 className="text-lg font-semibold">Host / DJ Moderation</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={selectedTarget}
            onChange={(event) => setSelectedTarget(event.target.value)}
            className="min-w-52 rounded border border-white/20 bg-black/20 px-3 py-2"
          >
            <option value="">Select target user</option>
            {ui.avatars
              .filter((avatar) => avatar.userId !== session.user.userId)
              .map((avatar) => (
                <option key={avatar.userId} value={avatar.userId}>
                  {avatar.name}
                </option>
              ))}
          </select>

          <button onClick={() => sendModeration("mute")} className="rounded border border-white/30 px-3 py-2 text-sm">Mute</button>
          <button onClick={() => sendModeration("kick")} className="rounded border border-white/30 px-3 py-2 text-sm">Kick</button>
          <button onClick={() => sendModeration("ban")} className="rounded border border-red-300/60 px-3 py-2 text-sm text-red-200">Ban</button>
          <button onClick={() => sendModeration("lock")} className="rounded border border-white/30 px-3 py-2 text-sm">Toggle Lock</button>
          <button onClick={() => sendModeration("report")} className="rounded border border-amber-300/60 px-3 py-2 text-sm text-amber-100">Report</button>
        </div>
      </section>
    </main>
  );
}
