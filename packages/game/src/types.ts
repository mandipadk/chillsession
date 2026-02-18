import type { AvatarState, MoveInput } from "@chillspace/protocol";

export interface ChillWorldConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  initialSelf: AvatarState;
  onMoveInput?: (input: MoveInput) => void;
  onInteract?: (tableId: string) => void;
}

export interface ChillWorldHandle {
  updateSelf: (next: AvatarState) => void;
  updateRemotes: (avatars: AvatarState[]) => void;
  destroy: () => void;
}
