import * as Phaser from "phaser";
import type { AvatarState, MoveInput } from "@chillspace/protocol";
import { GAME_TABLES, WORLD_CONFIG } from "@chillspace/protocol";
import { generateCharacterSpriteSheet, playWalkAnim, playIdleAnim } from "./SpriteFactory";
import { generateWorldTextures, renderWorld } from "./TileRenderer";

interface SceneData {
  self?: AvatarState;
  onMoveInput?: (input: MoveInput) => void;
  onInteract?: (tableId: string) => void;
}

interface RemoteAvatar {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  textureKey: string;
  lastX: number;
  lastY: number;
}

export class WorldScene extends Phaser.Scene {
  private selfState!: AvatarState;
  private selfSprite!: Phaser.GameObjects.Sprite;
  private selfLabel!: Phaser.GameObjects.Text;
  private selfTextureKey!: string;
  private remotes: Map<string, RemoteAvatar> = new Map();
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    interact: Phaser.Input.Keyboard.Key;
  };
  private onMoveInput: ((input: MoveInput) => void) | undefined;
  private onInteract: ((tableId: string) => void) | undefined;
  private lastInput: MoveInput = { up: false, down: false, left: false, right: false };
  private selfMoving = false;

  constructor() {
    super("world");
  }

  create(data: SceneData = {}): void {
    this.selfState = data.self ?? {
      userId: "local-preview",
      name: "You",
      color: "#7dd3fc",
      x: WORLD_CONFIG.tileSize * 8,
      y: WORLD_CONFIG.tileSize * 8,
      dir: "down",
      webcamOn: false,
      role: "member"
    };
    this.onMoveInput = data.onMoveInput;
    this.onInteract = data.onInteract;

    const worldWidth = WORLD_CONFIG.widthTiles * WORLD_CONFIG.tileSize;
    const worldHeight = WORLD_CONFIG.heightTiles * WORLD_CONFIG.tileSize;

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.physics?.world?.setBounds(0, 0, worldWidth, worldHeight);

    generateWorldTextures(this);
    renderWorld(this);

    this.selfTextureKey = generateCharacterSpriteSheet(this, this.selfState.userId, this.selfState.color);

    this.selfSprite = this.add.sprite(this.selfState.x, this.selfState.y, this.selfTextureKey);
    this.selfSprite.setScale(2);
    this.selfSprite.setDepth(50);
    playIdleAnim(this.selfSprite, this.selfTextureKey, this.selfState.dir);

    this.selfLabel = this.add.text(this.selfState.x, this.selfState.y - 22, this.selfState.name, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "7px",
      color: "#ffe8b0",
      stroke: "#1a1008",
      strokeThickness: 2,
    });
    this.selfLabel.setOrigin(0.5, 1);
    this.selfLabel.setDepth(51);

    const roleBadge = this.selfState.role === "host" ? " [HOST]" : this.selfState.role === "dj" ? " [DJ]" : "";
    if (roleBadge) {
      this.selfLabel.setText(this.selfState.name + roleBadge);
    }

    this.cameras.main.startFollow(this.selfSprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      interact: Phaser.Input.Keyboard.KeyCodes.E
    }) as typeof this.keys;

    this.input.keyboard?.on("keydown-F", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      }
    });

    (window as typeof window & { render_game_to_text?: () => string }).render_game_to_text = () =>
      this.renderGameToText();
    (window as typeof window & { advanceTime?: (ms: number) => void }).advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps; i += 1) {
        this.stepFrame(1 / 60);
      }
    };
  }

  update(_time: number, delta: number): void {
    this.stepFrame(delta / 1000);
  }

  private stepFrame(_dt: number): void {
    const input: MoveInput = {
      up: this.keys.up.isDown,
      down: this.keys.down.isDown,
      left: this.keys.left.isDown,
      right: this.keys.right.isDown
    };

    if (
      input.up !== this.lastInput.up ||
      input.down !== this.lastInput.down ||
      input.left !== this.lastInput.left ||
      input.right !== this.lastInput.right
    ) {
      this.lastInput = input;
      this.onMoveInput?.(input);
    }

    const isMoving = input.up || input.down || input.left || input.right;
    if (isMoving !== this.selfMoving) {
      this.selfMoving = isMoving;
      if (isMoving) {
        playWalkAnim(this.selfSprite, this.selfTextureKey, this.selfState.dir);
      } else {
        playIdleAnim(this.selfSprite, this.selfTextureKey, this.selfState.dir);
      }
    }

    if (isMoving) {
      playWalkAnim(this.selfSprite, this.selfTextureKey, this.selfState.dir);
    }

    this.selfLabel.setPosition(this.selfState.x, this.selfState.y - 22);

    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      const nearby = GAME_TABLES.find(
        (table) => Phaser.Math.Distance.Between(this.selfState.x, this.selfState.y, table.x * 32, table.y * 32) < 48
      );

      if (nearby) {
        this.onInteract?.(nearby.tableId);
      }
    }

    for (const [, remote] of this.remotes) {
      const moving = remote.sprite.x !== remote.lastX || remote.sprite.y !== remote.lastY;
      if (moving) {
        const dx = remote.sprite.x - remote.lastX;
        const dy = remote.sprite.y - remote.lastY;
        let dir: AvatarState["dir"] = "down";
        if (Math.abs(dx) > Math.abs(dy)) {
          dir = dx > 0 ? "right" : "left";
        } else {
          dir = dy > 0 ? "down" : "up";
        }
        playWalkAnim(remote.sprite, remote.textureKey, dir);
      } else {
        playIdleAnim(remote.sprite, remote.textureKey, "down");
      }
      remote.lastX = remote.sprite.x;
      remote.lastY = remote.sprite.y;
    }
  }

  setSelfState(next: AvatarState): void {
    this.selfState = next;
    this.selfSprite.setPosition(next.x, next.y);
  }

  setRemoteStates(nextAvatars: AvatarState[]): void {
    const nextIds = new Set(nextAvatars.filter((avatar) => avatar.userId !== this.selfState.userId).map((avatar) => avatar.userId));

    for (const [userId, remote] of this.remotes.entries()) {
      if (!nextIds.has(userId)) {
        remote.sprite.destroy();
        remote.label.destroy();
        this.remotes.delete(userId);
      }
    }

    for (const avatar of nextAvatars) {
      if (avatar.userId === this.selfState.userId) {
        this.setSelfState(avatar);
        continue;
      }

      let remote = this.remotes.get(avatar.userId);
      if (!remote) {
        const textureKey = generateCharacterSpriteSheet(this, avatar.userId, avatar.color);
        const sprite = this.add.sprite(avatar.x, avatar.y, textureKey);
        sprite.setScale(2);
        sprite.setDepth(50);
        playIdleAnim(sprite, textureKey, avatar.dir);

        const label = this.add.text(avatar.x, avatar.y - 22, avatar.name, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "6px",
          color: "#cbd5e1",
          stroke: "#1a1008",
          strokeThickness: 2,
        });
        label.setOrigin(0.5, 1);
        label.setDepth(51);

        remote = { sprite, label, textureKey, lastX: avatar.x, lastY: avatar.y };
        this.remotes.set(avatar.userId, remote);
      }

      remote.sprite.setPosition(avatar.x, avatar.y);
      remote.label.setPosition(avatar.x, avatar.y - 22);

      const webcamSuffix = avatar.webcamOn ? " [cam]" : "";
      remote.label.setText(avatar.name + webcamSuffix);
    }
  }

  private renderGameToText(): string {
    const payload = {
      coordinateSystem: "origin top-left, +x right, +y down",
      mode: "room",
      self: this.selfState,
      remotes: Array.from(this.remotes.entries()).map(([userId, remote]) => ({
        userId,
        x: remote.sprite.x,
        y: remote.sprite.y
      })),
      tables: GAME_TABLES,
      fullscreen: this.scale.isFullscreen
    };

    return JSON.stringify(payload);
  }
}
