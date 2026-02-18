import type {
  AvatarState,
  ChatMessage,
  JoinBootstrap,
  PlaybackState,
  MusicQueueItem,
  RoomInfo,
  Role,
  GameKind
} from "@chillspace/protocol";

export interface SessionJoinResponse {
  room: RoomInfo;
  user: {
    userId: string;
    role: Role;
    userName: string;
    avatarColor: string;
  };
  bootstrap: JoinBootstrap;
}

export interface GameStatePayload {
  tableId: string;
  game: GameKind;
  state: Record<string, unknown>;
}

export interface RoomUIState {
  avatars: AvatarState[];
  messages: ChatMessage[];
  queue: MusicQueueItem[];
  playback: PlaybackState;
  games: Record<string, GameStatePayload>;
}
