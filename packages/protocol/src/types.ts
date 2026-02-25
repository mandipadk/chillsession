export type Direction = "up" | "down" | "left" | "right";
export type MusicSource = "licensed" | "spotify" | "youtube";
export type Role = "host" | "dj" | "member";
export type GameKind = "chess" | "ttt" | "pictionary";
export type EmoteKind = "wave" | "heart" | "thumbsup" | "coffee" | "book";
export type AccessoryKind = "none" | "headphones" | "beanie" | "glasses" | "flower" | "crown";

export type ModerationActionType =
  | "kick"
  | "ban"
  | "mute"
  | "lock"
  | "report";

export interface AvatarState {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  dir: Direction;
  webcamOn: boolean;
  role: Role;
  accessory?: AccessoryKind;
  emote?: EmoteKind;
  emoteExpiresAt?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  body: string;
  kind: "user" | "system";
  createdAtEpochMs: number;
}

export interface MusicQueueItem {
  id: string;
  source: MusicSource;
  itemId: string;
  title: string;
  addedBy: string;
  addedAtEpochMs: number;
}

export interface PlaybackState {
  source: MusicSource;
  itemId: string;
  positionMs: number;
  isPlaying: boolean;
  startedAtEpochMs: number;
  controllerRole: Role;
}

export interface LiveKitBootstrap {
  url: string;
  token: string;
  room: string;
}

export interface ColyseusBootstrap {
  wsUrl: string;
  roomId: string;
  seat: string;
}

export interface JoinBootstrap {
  sessionJwt: string;
  colyseus: ColyseusBootstrap;
  livekit: LiveKitBootstrap;
}

export interface RoomBootstrapPayload {
  roomId: string;
  roomName: string;
  avatars: AvatarState[];
  chat: ChatMessage[];
  queue: MusicQueueItem[];
  playback: PlaybackState;
  roomLocked: boolean;
  games: {
    kind: GameKind;
    tableId: string;
    inProgress: boolean;
    participants: string[];
    state: Record<string, unknown>;
  }[];
}

export interface MoveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface MusicControlInput {
  action: "play" | "pause" | "skip" | "seek";
  seekPositionMs?: number;
}

export interface ModerationInput {
  action: ModerationActionType;
  targetUserId?: string;
  details?: string;
}

export interface EnqueueMusicInput {
  source: MusicSource;
  itemId: string;
  title: string;
}

export interface GameActionInput {
  tableId: string;
  game: GameKind;
  action: string;
  payload: Record<string, unknown>;
}

export interface ClientMessageMap {
  "input.move": MoveInput;
  "chat.send": { body: string };
  "music.enqueue": EnqueueMusicInput;
  "music.voteSkip": { vote: boolean };
  "music.control": MusicControlInput;
  "game.action": GameActionInput;
  "presence.webcamToggle": { webcamOn: boolean };
  "presence.emote": { emote: EmoteKind };
  "presence.accessory": { accessory: AccessoryKind };
  "pomodoro.start": { durationMinutes: number };
  "pomodoro.stop": Record<string, never>;
  "moderation.request": ModerationInput;
}

export interface ServerMessageMap {
  "state.patch": { avatars: AvatarState[] };
  "chat.message": ChatMessage;
  "music.state": {
    queue: MusicQueueItem[];
    playback: PlaybackState;
  };
  "music.timelineSync": PlaybackState;
  "game.state": {
    tableId: string;
    game: GameKind;
    state: Record<string, unknown>;
  };
  "moderation.event": {
    action: ModerationActionType;
    actorUserId: string;
    targetUserId?: string;
    createdAtEpochMs: number;
    details?: string;
  };
  "presence.event": {
    userId: string;
    webcamOn: boolean;
  };
  "presence.emoteEvent": {
    userId: string;
    emote: EmoteKind;
  };
  "pomodoro.state": {
    isRunning: boolean;
    endsAtEpochMs: number;
    durationMinutes: number;
    startedBy: string;
  };
}

export interface RoomInfo {
  id: string;
  name: string;
  createdBy: string;
  createdAtEpochMs: number;
  isLocked: boolean;
}

export interface InviteInfo {
  id: string;
  roomId: string;
  token: string;
  expiresAtEpochMs: number;
  createdBy: string;
}
