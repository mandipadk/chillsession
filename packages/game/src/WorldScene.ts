import * as Phaser from "phaser";
import type { AvatarState, EmoteKind, MoveInput } from "@chillspace/protocol";
import { GAME_TABLES, WORLD_CONFIG } from "@chillspace/protocol";
import { generateCharacterSpriteSheet, playWalkAnim, playIdleAnim } from "./SpriteFactory";
import { renderWorld } from "./TileRenderer";
import { createDustParticles, createFireParticles } from "./Particles";

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

const EMOTE_SYMBOLS: Record<EmoteKind, string> = {
  wave: "👋",
  heart: "❤️",
  thumbsup: "👍",
  coffee: "☕",
  book: "📖",
};

export class WorldScene extends Phaser.Scene {
  private selfState!: AvatarState;
  private selfSprite!: Phaser.GameObjects.Sprite;
  private selfLabel!: Phaser.GameObjects.Text;
  private selfTextureKey!: string;
  private remotes: Map<string, RemoteAvatar> = new Map();
  private emoteTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    interact: Phaser.Input.Keyboard.Key;
  };
  private emoteKeys!: Phaser.Input.Keyboard.Key[];
  private onMoveInput: ((input: MoveInput) => void) | undefined;
  private onInteract: ((tableId: string) => void) | undefined;
  private lastInput: MoveInput = { up: false, down: false, left: false, right: false };
  private selfMoving = false;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private dayNightOverlay!: Phaser.GameObjects.Rectangle;
  private onEmote: ((emote: EmoteKind) => void) | undefined;

  constructor() {
    super("world");
  }

  create(data: SceneData & { onEmote?: (emote: EmoteKind) => void } = {}): void {
    this.selfState = data.self ?? {
      userId: "local-preview",
      name: "You",
      color: "#7dd3fc",
      x: WORLD_CONFIG.tileSize * 12,
      y: WORLD_CONFIG.tileSize * 12,
      dir: "down",
      webcamOn: false,
      role: "member"
    };
    this.onMoveInput = data.onMoveInput;
    this.onInteract = data.onInteract;
    this.onEmote = data.onEmote;

    const worldWidth = WORLD_CONFIG.widthTiles * WORLD_CONFIG.tileSize;
    const worldHeight = WORLD_CONFIG.heightTiles * WORLD_CONFIG.tileSize;

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.physics?.world?.setBounds(0, 0, worldWidth, worldHeight);

    renderWorld(this);

    createDustParticles(this, worldWidth, worldHeight);
    const fireCx = Math.floor(worldWidth * 0.5);
    const wallHeight = 5 * WORLD_CONFIG.tileSize;
    createFireParticles(this, fireCx, wallHeight - 20);

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

    this.emoteKeys = [
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
    ];

    this.input.keyboard?.on("keydown-F", () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });

    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
    });

    this.dayNightOverlay = this.add.rectangle(
      worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 0x000030, 0
    );
    this.dayNightOverlay.setScrollFactor(0);
    this.dayNightOverlay.setDepth(95);
    this.updateDayNight();

    this.minimapGraphics = this.add.graphics();
    this.minimapGraphics.setScrollFactor(0);
    this.minimapGraphics.setDepth(110);

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
      if (nearby) this.onInteract?.(nearby.tableId);
    }

    const emoteKinds: EmoteKind[] = ["wave", "heart", "thumbsup", "coffee", "book"];
    for (let i = 0; i < this.emoteKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.emoteKeys[i]!)) {
        this.onEmote?.(emoteKinds[i]!);
        this.showEmote(this.selfState.userId, emoteKinds[i]!, this.selfState.x, this.selfState.y);
      }
    }

    for (const [, remote] of this.remotes) {
      const moving = remote.sprite.x !== remote.lastX || remote.sprite.y !== remote.lastY;
      if (moving) {
        const dx = remote.sprite.x - remote.lastX;
        const dy = remote.sprite.y - remote.lastY;
        let dir: AvatarState["dir"] = "down";
        if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
        else dir = dy > 0 ? "down" : "up";
        playWalkAnim(remote.sprite, remote.textureKey, dir);
      } else {
        playIdleAnim(remote.sprite, remote.textureKey, "down");
      }
      remote.lastX = remote.sprite.x;
      remote.lastY = remote.sprite.y;
    }

    this.updateDayNight();
    this.drawMinimap();
    this.updateEmotes();
  }

  showEmote(userId: string, emote: EmoteKind, x: number, y: number): void {
    const existing = this.emoteTexts.get(userId);
    if (existing) existing.destroy();

    const symbol = EMOTE_SYMBOLS[emote] ?? emote;
    const text = this.add.text(x, y - 36, symbol, {
      fontSize: "18px",
    });
    text.setOrigin(0.5, 1);
    text.setDepth(60);
    text.setData("expiresAt", Date.now() + 3000);
    text.setData("userId", userId);
    this.emoteTexts.set(userId, text);

    this.tweens.add({
      targets: text,
      y: y - 54,
      alpha: 0,
      duration: 3000,
      ease: "Power1",
      onComplete: () => {
        text.destroy();
        this.emoteTexts.delete(userId);
      }
    });
  }

  private updateEmotes(): void {
    const now = Date.now();
    for (const [userId, text] of this.emoteTexts) {
      const expires = text.getData("expiresAt") as number;
      if (now > expires) {
        text.destroy();
        this.emoteTexts.delete(userId);
      }
    }
  }

  private updateDayNight(): void {
    const hour = new Date().getHours();
    let alpha = 0;
    if (hour >= 22 || hour < 5) alpha = 0.15;
    else if (hour >= 20) alpha = 0.08;
    else if (hour >= 18) alpha = 0.04;
    else if (hour < 7) alpha = 0.1;
    else if (hour < 9) alpha = 0.03;
    this.dayNightOverlay.setAlpha(alpha);
  }

  private drawMinimap(): void {
    const g = this.minimapGraphics;
    g.clear();

    const mmW = 120;
    const mmH = 80;
    const mmX = this.cameras.main.width - mmW - 10;
    const mmY = 10;
    const worldWidth = WORLD_CONFIG.widthTiles * WORLD_CONFIG.tileSize;
    const worldHeight = WORLD_CONFIG.heightTiles * WORLD_CONFIG.tileSize;
    const scaleX = mmW / worldWidth;
    const scaleY = mmH / worldHeight;

    g.fillStyle(0x1a1008, 0.7);
    g.fillRect(mmX, mmY, mmW, mmH);
    g.lineStyle(1, 0xffe8b0, 0.4);
    g.strokeRect(mmX, mmY, mmW, mmH);

    g.fillStyle(0xffe8b0, 1);
    const sx = mmX + this.selfState.x * scaleX;
    const sy = mmY + this.selfState.y * scaleY;
    g.fillRect(sx - 2, sy - 2, 4, 4);

    for (const [, remote] of this.remotes) {
      g.fillStyle(0x7dd3fc, 0.8);
      const rx = mmX + remote.sprite.x * scaleX;
      const ry = mmY + remote.sprite.y * scaleY;
      g.fillRect(rx - 1, ry - 1, 3, 3);
    }

    for (const table of GAME_TABLES) {
      g.fillStyle(0x8db48b, 0.6);
      const tx = mmX + table.x * WORLD_CONFIG.tileSize * scaleX;
      const ty = mmY + table.y * WORLD_CONFIG.tileSize * scaleY;
      g.fillRect(tx - 2, ty - 1, 4, 3);
    }
  }

  setSelfState(next: AvatarState): void {
    this.selfState = next;
    this.selfSprite.setPosition(next.x, next.y);
  }

  setRemoteStates(nextAvatars: AvatarState[]): void {
    const nextIds = new Set(nextAvatars.filter((a) => a.userId !== this.selfState.userId).map((a) => a.userId));

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

      if (avatar.emote && avatar.emoteExpiresAt && avatar.emoteExpiresAt > Date.now()) {
        if (!this.emoteTexts.has(avatar.userId)) {
          this.showEmote(avatar.userId, avatar.emote, avatar.x, avatar.y);
        }
      }
    }
  }

  private renderGameToText(): string {
    return JSON.stringify({
      coordinateSystem: "origin top-left, +x right, +y down",
      mode: "room",
      self: this.selfState,
      remotes: Array.from(this.remotes.entries()).map(([userId, remote]) => ({
        userId, x: remote.sprite.x, y: remote.sprite.y
      })),
      tables: GAME_TABLES,
      fullscreen: this.scale.isFullscreen
    });
  }
}
