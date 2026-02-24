import * as Phaser from "phaser";
import type { AvatarState } from "@chillspace/protocol";
import { WorldScene } from "./WorldScene";
import type { ChillWorldConfig, ChillWorldHandle } from "./types";

export const createChillWorld = (config: ChillWorldConfig): ChillWorldHandle => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: config.container,
    width: config.width ?? 960,
    height: config.height ?? 640,
    backgroundColor: "#1a1008",
    scene: [],
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    fps: {
      target: 60,
      forceSetTimeOut: true
    },
    render: {
      pixelArt: true,
      antialias: false
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  });

  const worldScene = (): WorldScene | null => {
    try {
      return game.scene.getScene("world") as WorldScene;
    } catch {
      return null;
    }
  };

  game.events.once("ready", () => {
    game.scene.add("world", WorldScene, true, {
      self: config.initialSelf,
      onMoveInput: config.onMoveInput,
      onInteract: config.onInteract
    });
  });

  const safeUpdateSelf = (next: AvatarState): void => {
    const scene = worldScene();
    if (scene && scene.scene.isActive()) {
      scene.setSelfState(next);
    }
  };

  const safeUpdateRemotes = (avatars: AvatarState[]): void => {
    const scene = worldScene();
    if (scene && scene.scene.isActive()) {
      scene.setRemoteStates(avatars);
    }
  };

  return {
    updateSelf: safeUpdateSelf,
    updateRemotes: safeUpdateRemotes,
    destroy: () => {
      game.destroy(true);
    }
  };
};

export type * from "./types";
export { WorldScene } from "./WorldScene";
export { generateCharacterSpriteSheet, playWalkAnim, playIdleAnim } from "./SpriteFactory";
export { generateWorldTextures, renderWorld, buildRoomLayout } from "./TileRenderer";
